import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

console.log('Hello from notify-admin-payment Edge Function!');

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
    console.log('User authenticated in Edge Function:', userId);

    // 1. Update user's profile initial_payment_status to 'pending'
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

    // 2. Check for existing initial payment and update/insert
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

    let paymentId: string | undefined;

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
        paymentId = updatedPayment?.id;
        console.log('Existing payment updated to pending:', paymentId);
      } else {
        paymentId = existingPayment.id;
        console.log('Existing payment already pending/paid:', paymentId);
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
      paymentId = insertedPayment?.id;
      console.log('New initial payment inserted:', paymentId);
    }

    // 3. Insert a notification for the admin
    console.log('Fetching profile for admin notification for user:', userId);
    const { data: profileData, error: profileError } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    const userName = profileData?.full_name || 'Um usuário';
    console.log('User name for notification:', userName);

    console.log('Inserting admin notification...');
    const { error: notificationError } = await supabaseClient
      .from('admin_notifications')
      .insert({
        user_id: userId,
        type: 'payment_notification',
        message: `${userName} notificou um pagamento de adesão!`,
        details: { payment_id: paymentId, user_id: userId, amount: INITIAL_PAYMENT_AMOUNT },
        is_read: false,
      });

    if (notificationError) {
      console.error('Error inserting admin notification:', notificationError);
      // Don't throw here, as the payment process itself was successful.
      // Log the error but allow the function to complete.
    }
    console.log('Admin notification inserted successfully.');

    return new Response(JSON.stringify({ message: 'Admin notified successfully' }), {
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