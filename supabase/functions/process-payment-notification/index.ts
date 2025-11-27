import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

console.log('Hello from process-payment-notification Edge Function!');

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.error('Method Not Allowed:', req.method);
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role key for admin actions
    {
      auth: {
        persistSession: false,
      },
    }
  );

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Authorization header missing');
      return new Response(JSON.stringify({ error: 'Authorization header missing' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error in Edge Function:', authError?.message || 'User not found');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const userId = user.id;
    const { paymentId, amount, description } = await req.json(); // Expect paymentId, amount, description from request body
    console.log('Request body received:', { paymentId, amount, description });

    // 1. Fetch profile for user name
    console.log('Fetching profile for user:', userId);
    const { data: profileData, error: profileError } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw new Error('Failed to fetch user profile.');
    }
    const userName = profileData?.full_name || 'Um usuário';
    console.log('User name for notification:', userName);

    let targetPaymentId: string | undefined = paymentId;
    let notificationMessage: string;
    let notificationDetails: any;

    if (paymentId) {
      // Case 2: Recurring payment notification (paymentId provided)
      console.log('Processing recurring payment notification for paymentId:', paymentId);
      const { data: updatedPayment, error: updatePaymentError } = await supabaseClient
        .from('payments')
        .update({ status: 'pending' }) // Mark as pending for admin review
        .eq('id', paymentId)
        .eq('user_id', userId) // Ensure user owns the payment
        .select('id, amount, description, payment_type')
        .single();

      if (updatePaymentError) {
        console.error('Error updating recurring payment status:', updatePaymentError);
        throw new Error('Failed to update recurring payment status.');
      }
      
      notificationMessage = `${userName} notificou o pagamento de uma ${updatedPayment?.payment_type === 'initial' ? 'adesão' : 'mensalidade'}!`;
      notificationDetails = {
        payment_id: updatedPayment?.id,
        user_id: userId,
        amount: updatedPayment?.amount,
        description: updatedPayment?.description,
        payment_type: updatedPayment?.payment_type,
      };
      console.log('Recurring payment updated to pending:', updatedPayment?.id);

    } else {
      // Case 1: Initial payment notification (no paymentId provided)
      console.log('Processing initial payment notification for user:', userId);
      
      // Update user's profile initial_payment_status to 'pending'
      console.log('Updating profile initial_payment_status to pending for user:', userId);
      const { error: profileUpdateError } = await supabaseClient
        .from('profiles')
        .update({ initial_payment_status: 'pending' })
        .eq('id', userId);

      if (profileUpdateError) {
        console.error('Error updating profile status:', profileUpdateError);
        throw new Error('Failed to update profile payment status.');
      }
      console.log('Profile status updated successfully.');

      // Check for existing initial payment and update/insert
      console.log('Checking for existing initial payment for user:', userId);
      const { data: existingPayment, error: fetchPaymentError } = await supabaseClient
        .from('payments')
        .select('id, status')
        .eq('user_id', userId)
        .eq('payment_type', 'initial')
        .single();

      if (fetchPaymentError && fetchPaymentError.code !== 'PGRST116') { // PGRST116 means 'no rows found'
        console.error('Error fetching existing payment:', fetchPaymentError);
        throw new Error('Failed to check existing payment.');
      }
      console.log('Existing payment check result:', existingPayment);

      const INITIAL_PAYMENT_AMOUNT = 132.00; // Ensure this matches frontend
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(10); // Set due date to 10th of next month
      const dueDate = nextMonth.toISOString().split('T')[0];

      if (existingPayment) {
        if (existingPayment.status === 'unpaid') {
          console.log('Updating existing unpaid payment to pending:', existingPayment.id);
          const { data: updatedPayment, error: updatePaymentError } = await supabaseClient
            .from('payments')
            .update({ status: 'pending' })
            .eq('id', existingPayment.id)
            .select('id')
            .single();

          if (updatePaymentError) {
            console.error('Error updating existing payment status:', updatePaymentError);
            throw new Error('Failed to update existing payment status.');
          }
          targetPaymentId = updatedPayment?.id;
          console.log('Existing payment updated to pending:', targetPaymentId);
        } else {
          targetPaymentId = existingPayment.id;
          console.log('Existing payment already pending/paid:', targetPaymentId);
        }
      } else {
        console.log('Inserting new initial payment for user:', userId);
        const { data: insertedPayment, error: insertPaymentError } = await supabaseClient
          .from('payments')
          .insert({
            user_id: userId,
            amount: INITIAL_PAYMENT_AMOUNT,
            due_date: dueDate,
            status: 'pending',
            payment_type: 'initial',
            description: 'Pagamento de Adesão Inicial',
          })
          .select('id')
          .single();

        if (insertPaymentError) {
          console.error('Error inserting new payment:', insertPaymentError);
          throw new Error('Failed to insert new payment record.');
        }
        targetPaymentId = insertedPayment?.id;
        console.log('New initial payment inserted:', targetPaymentId);
      }

      notificationMessage = `${userName} notificou um pagamento de adesão!`;
      notificationDetails = { payment_id: targetPaymentId, user_id: userId, amount: INITIAL_PAYMENT_AMOUNT, payment_type: 'initial' };
    }

    // 3. Insert a notification for the admin
    console.log('Inserting admin notification...');
    const { error: notificationError } = await supabaseClient
      .from('admin_notifications')
      .insert({
        user_id: userId,
        type: 'payment_notification',
        message: notificationMessage,
        details: notificationDetails,
        is_read: false,
      });

    if (notificationError) {
      console.error('Error inserting admin notification:', notificationError);
      // Don't throw here, as the payment process itself was successful.
      // Log the error but allow the function to complete.
    }
    console.log('Admin notification inserted successfully.');

    return new Response(JSON.stringify({ message: 'Payment notification processed successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Edge Function error caught:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});