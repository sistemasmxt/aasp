import { supabase } from '@/integrations/supabase/client';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';
export type AuditTable = 'users' | 'cameras' | 'payments' | 'user_roles';

interface LogAuditParams {
  action: AuditAction;
  table_name: AuditTable;
  record_id?: string;
  details?: Record<string, unknown> | null;
}

export const logAudit = async ({ action, table_name, record_id, details }: LogAuditParams) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('User not authenticated for audit log');
      return;
    }

    const { error } = await supabase.from('admin_logs').insert([{
      user_id: user.id,
      action,
      table_name,
      record_id,
      details: details as any,
    }]);

    if (error) {
      console.error('Error logging audit:', error);
    }
  } catch (error) {
    console.error('Error in audit logger:', error);
  }
};