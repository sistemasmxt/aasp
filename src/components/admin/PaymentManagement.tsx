import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { DollarSign } from 'lucide-react';

interface Payment {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  due_date: string;
  paid_at: string | null;
  profiles: {
    full_name: string;
  } | null;
}

const PaymentManagement = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('due_date', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const paymentsWithProfiles = await Promise.all(
        (data || []).map(async (payment) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', payment.user_id)
            .single();

          return {
            ...payment,
            profiles: profile,
          };
        })
      );

      setPayments(paymentsWithProfiles as Payment[]);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar pagamentos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      paid: 'default',
      pending: 'secondary',
      overdue: 'destructive',
    };

    const labels: Record<string, string> = {
      paid: 'Pago',
      pending: 'Pendente',
      overdue: 'Atrasado',
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Carregando pagamentos...</div>;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <DollarSign className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Gerenciar Pagamentos</h2>
        <Badge variant="outline">{payments.length} registros</Badge>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Data Pagamento</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="font-medium">
                  {payment.profiles?.full_name || 'Usuário não encontrado'}
                </TableCell>
                <TableCell>R$ {Number(payment.amount).toFixed(2)}</TableCell>
                <TableCell>{new Date(payment.due_date).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell>
                  {payment.paid_at ? new Date(payment.paid_at).toLocaleDateString('pt-BR') : '-'}
                </TableCell>
                <TableCell>{getStatusBadge(payment.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

export default PaymentManagement;
