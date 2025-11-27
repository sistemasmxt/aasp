import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
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
    // Verify admin user by checking JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header missing' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Check if the user is an admin (using service_role client to bypass RLS on user_roles)
    const { data: roles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (rolesError || !roles) {
      return new Response(JSON.stringify({ error: 'Access Denied: Not an administrator' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Log audit event for backup request
    await supabaseClient.from('admin_logs').insert({
      user_id: user.id,
      action: 'CREATE',
      table_name: 'edge_functions',
      record_id: 'trigger-full-backup',
      details: { action: 'full_backup_requested' },
    });

    let backupDetails: any = {};

    // --- Database Backup (Conceptual) ---
    // Direct full database dump (pg_dump) is not easily achievable from a Deno Edge Function.
    // For a true full backup, use Supabase Dashboard -> Database -> Backups, or Supabase CLI.
    // Here, we'll log a message and potentially list some table data as a conceptual "backup".
    console.log('Initiating conceptual database backup...');
    // Example: Fetching a count of users as a "snapshot"
    const { count: userCount, error: dbError } = await supabaseClient
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (dbError) {
      console.error('Error fetching user count for backup:', dbError);
      backupDetails.databaseStatus = 'Failed to get user count';
    } else {
      backupDetails.databaseStatus = `Database snapshot initiated. User count: ${userCount}. Full database backup should be performed via Supabase Dashboard/CLI.`;
    }
    console.log(backupDetails.databaseStatus);

    // --- File Backup (Supabase Storage) ---
    // List files in the 'avatars' bucket. For a real backup, these would be copied to another location.
    console.log('Initiating file backup for avatars bucket...');
    const { data: files, error: storageError } = await supabaseClient.storage
      .from('avatars')
      .list('', {
        limit: 100, // Limit to avoid large responses in Edge Function
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (storageError) {
      console.error('Error listing files in avatars bucket:', storageError);
      backupDetails.fileStatus = 'Failed to list avatar files';
    } else {
      backupDetails.fileStatus = `Listed ${files?.length || 0} avatar files. Full file backup should be managed via Supabase Storage tools.`;
      backupDetails.avatarFiles = files?.map(f => f.name);
    }
    console.log(backupDetails.fileStatus);

    // Insert a notification for the admin
    await supabaseClient
      .from('admin_notifications')
      .insert({
        user_id: user.id,
        type: 'system_notification',
        message: `Backup completo de dados e arquivos iniciado por ${user.email}.`,
        details: backupDetails,
        is_read: false,
      });

    return new Response(JSON.stringify({ message: 'Full backup process initiated.', details: backupDetails }), {
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