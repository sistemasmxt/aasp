import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Loader2 } from 'lucide-react'; // Import Loader2
import { useToast } from '@/hooks/use-toast'; // Import useToast

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  details: any;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

interface AuditLogsProps {
  refetchTrigger: number; // A prop to trigger refetch when its value changes
}

const AuditLogs = ({ refetchTrigger }: AuditLogsProps) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast(); // Initialize useToast

  useEffect(() => {
    fetchLogs();
  }, [refetchTrigger]); // Re-fetch logs when refetchTrigger changes

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch user profiles for each log
      const logsWithProfiles = await Promise.all(
        (data || []).map(async (log) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', log.user_id)
            .single();

          return {
            ...log,
            profiles: profile,
          };
        })
      );

      setLogs(logsWithProfiles);
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: 'Erro ao carregar logs de auditoria',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    const actionMap = {
      CREATE: { label: 'Criar', variant: 'default' as const },
      UPDATE: { label: 'Atualizar', variant: 'secondary' as const },
      DELETE: { label: 'Excluir', variant: 'destructive' as const },
    };
    
    const actionInfo = actionMap[action as keyof typeof actionMap] || { 
      label: action, 
      variant: 'secondary' as const 
    };
    
    return <Badge variant={actionInfo.variant}>{actionInfo.label}</Badge>;
  };

  const getTableLabel = (tableName: string) => {
    const tableMap: Record<string, string> = {
      users: 'Usuários',
      cameras: 'Câmeras',
      payments: 'Pagamentos',
      user_roles: 'Permissões',
      profiles: 'Perfis',
      groups: 'Grupos',
      group_members: 'Membros do Grupo',
      public_utility_contacts: 'Contatos Públicos',
      messages: 'Mensagens',
    };
    
    return tableMap[tableName] || tableName;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-6 w-6 animate-spin inline-block mr-2" /> Carregando logs...
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <CardTitle>Logs de Auditoria</CardTitle>
          <Badge variant="outline">{logs.length} registros</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Tabela</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    {log.profiles?.full_name || 'Usuário não encontrado'}
                  </TableCell>
                  <TableCell>{getActionBadge(log.action)}</TableCell>
                  <TableCell>{getTableLabel(log.table_name)}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {log.details ? JSON.stringify(log.details) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuditLogs;