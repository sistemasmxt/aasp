import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

interface Profile {
  id: string;
  full_name: string;
}

const PaymentManagement = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    user_id: '',
    amount: '',
    due_date: '',
    status: 'pending',
  });

  useEffect(() => {
    fetchPayments();
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name');
    setProfiles(data || []);
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPayment) {
        const { error } = await supabase.from('payments').update({
          user_id: formData.user_id,
          amount: parseFloat(formData.amount),
          due_date: formData.due_date,
          status: formData.status,
        }).eq('id', editingPayment.id);
        if (error) throw error;
        toast({ title: 'Pagamento atualizado!' });
      } else {
        const { error } = await supabase.from('payments').insert({
          user_id: formData.user_id,
          amount: parseFloat(formData.amount),
          due_date: formData.due_date,
          status: formData.status,
        });
        if (error) throw error;
        toast({ title: 'Pagamento criado!' });
      }
      setDialogOpen(false);
      setEditingPayment(null);
      setFormData({ user_id: '', amount: '', due_date: '', status: 'pending' });
      fetchPayments();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setFormData({ user_id: payment.user_id, amount: payment.amount.toString(), due_date: payment.due_date, status: payment.status });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir pagamento?')) return;
    try {
      const { error } = await supabase.from('payments').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Pagamento excluído' });
      fetchPayments();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from('payments').insert({
        user_id: formData.user_id,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date,
        status: formData.status,
      });

      if (error) throw error;

      toast({
        title: 'Pagamento cadastrado!',
        description: 'O pagamento foi adicionado com sucesso.',
      });

      setDialogOpen(false);
      setFormData({ user_id: '', amount: '', due_date: '', status: 'pending' });
      fetchPayments();
    } catch (error: any) {
      toast({
        title: 'Erro ao cadastrar pagamento',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este pagamento?')) return;

    try {
      const { error } = await supabase.from('payments').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Pagamento excluído',
        description: 'O pagamento foi removido com sucesso.',
      });

      fetchPayments();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir pagamento',
        description: error.message,
        variant: 'destructive',
      });
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <DollarSign className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Gerenciar Pagamentos</h2>
          <Badge variant="outline">{payments.length} registros</Badge>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Pagamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Pagamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user_id">Usuário *</Label>
                <Select value={formData.user_id} onValueChange={(v) => setFormData({ ...formData, user_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Valor *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Data de Vencimento *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="overdue">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Cadastrar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
              <TableHead className="text-right">Ações</TableHead>
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
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(payment.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

export default PaymentManagement;
