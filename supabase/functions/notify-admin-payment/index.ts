import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

console.log('Hello from notify-admin-payment Edge Function!');

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      headers: { 'Content-Type': 'application/json' },
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
      return new Response(JSON.stringify({ error: 'Authorization header missing' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const userId = user.id;

    // 1. Update user's profile initial_payment_status to 'pending'
    const { error: profileUpdateError } = await supabaseClient
      .from('profiles')
      .update({ initial_payment_status: 'pending' })
      .eq('id', userId);

    if (profileUpdateError) {
      console.error('Error updating profile status:', profileUpdateError);
      throw new Error('Failed to update profile payment status.');
    }

    // 2. Check for existing initial payment and update/insert
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

    const INITIAL_PAYMENT_AMOUNT = 132.00; // Ensure this matches frontend
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(10); // Set due date to 10th of next month
    const dueDate = nextMonth.toISOString().split('T')[0];

    let paymentId: string | undefined;

    if (existingPayment) {
      // If an initial payment exists and is not yet paid, update its status to pending
      if (existingPayment.status === 'unpaid') {
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
      } else {
        paymentId = existingPayment.id; // Use existing payment ID if already pending/paid
      }
    } else {
      // If no initial payment exists, insert a new one
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
    }

    // 3. Insert a notification for the admin
    const { data: profileData, error: profileError } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    const userName = profileData?.full_name || 'Um usuário';

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

    return new Response(JSON.stringify({ message: 'Admin notified successfully' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Edge Function error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});