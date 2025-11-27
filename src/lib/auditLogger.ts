import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types'; // Import Tables type

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';
export type AuditTable = 'users' | 'cameras' | 'payments' | 'user_roles' | 'public_utility_contacts' | 'profiles' | 'groups' | 'group_members'; // Added new tables

interface LogAuditParams {
  action: AuditAction;
  table_name: AuditTable;
  record_id?: string;
  details?: Record<string, unknown> | null;
}

export const logAudit = async ({ action, table_name, record_id, details }: LogAuditParams) => {
  try {
    console.log(`[AuditLogger] Attempting to log action: ${action} on table: ${table_name}`);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('[AuditLogger] Error fetching user for audit log:', userError);
      return;
    }

    if (!user) {
      console.warn('[AuditLogger] User not authenticated for audit log. Skipping log entry.');
      return;
    }

    console.log(`[AuditLogger] User authenticated: ${user.id}. Inserting log...`);

    const { error } = await supabase.from('admin_logs').insert([{
      user_id: user.id,
      action,
      table_name,
      record_id,
      details: details as any,
    }]);

    if (error) {
      console.error('[AuditLogger] Error inserting audit log:', error);
    } else {
      console.log(`[AuditLogger] Successfully inserted audit log for user ${user.id}, action ${action}, table ${table_name}.`);
    }
  } catch (error) {
    console.error('[AuditLogger] Unexpected error in audit logger:', error);
  }
};