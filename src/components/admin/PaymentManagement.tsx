import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, DollarSign, CalendarPlus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logAudit } from '@/lib/auditLogger';
import { Tables } from '@/integrations/supabase/types';
import { paymentSchema } from '@/lib/validationSchemas'; // Import paymentSchema
import { z } from 'zod';
import { mapErrorToUserMessage } from '@/lib/errorHandler';

type Payment = Tables<'payments'> & { user_full_name?: string };
type Profile = Tables<'profiles'>;

const PaymentManagement = () => {
  const [payments, setPayments] = useState<Payment[]>(([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [formData, setFormData] = useState({
    user_id: '',
    amount: '',
    due_date: '',
    status: 'pending' as Tables<'payments'>['status'],
    payment_type: 'recurring' as Tables<'payments'>['payment_type'],
    description: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
    fetchProfiles();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      if (paymentsData && paymentsData.length > 0) {
        const userIds = [...new Set(paymentsData.map(p => p.user_id))];

        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        const profilesMap = new Map(profilesData?.map(p => [p.id, p.full_name]));

        const paymentsWithNames = paymentsData.map(payment => ({
          ...payment,
          user_full_name: profilesMap.get(payment.user_id) || 'Usuário Desconhecido',
        }));
        setPayments(paymentsWithNames);
      } else {
        setPayments([]);
      }
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      toast({
        title: 'Erro ao carregar pagamentos',
        description: mapErrorToUserMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setFormData({
      user_id: payment.user_id,
      amount: payment.amount.toString(),
      due_date: payment.due_date,
      status: payment.status,
      payment_type: payment.payment_type,
      description: payment.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input using Zod schema
      const validatedData = paymentSchema.parse({
        user_id: formData.user_id,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date,
        status: formData.status,
        payment_type: formData.payment_type,
        description: formData.description,
      });

      const paymentData: Tables<'payments', 'Insert'> = {
        user_id: validatedData.user_id,
        amount: validatedData.amount,
        due_date: validatedData.due_date,
        status: validatedData.status,
        payment_type: validatedData.payment_type,
        description: validatedData.description || null,
        paid_at: validatedData.status === 'paid' ? new Date().toISOString() : null,
      };

      if (editingPayment) {
        const { error } = await supabase
          .from('payments')
          .update(paymentData)
          .eq('id', editingPayment.id);

        if (error) throw error;

        await logAudit({
          action: 'UPDATE',
          table_name: 'payments',
          record_id: editingPayment.id,
          details: paymentData,
        });

        // If an initial payment is marked as paid, approve the user
        if (editingPayment.payment_type === 'initial' && paymentData.status === 'paid') {
          await supabase.from('profiles').update({ is_approved: true, initial_payment_status: 'paid' }).eq('id', editingPayment.user_id);
          await logAudit({
            action: 'UPDATE',
            table_name: 'profiles',
            record_id: editingPayment.user_id,
            details: { is_approved: true, initial_payment_status: 'paid' },
          });
        }

        toast({
          title: 'Sucesso',
          description: 'Pagamento atualizado com sucesso',
          variant: 'default',
        });
      } else {
        const { data, error } = await supabase
          .from('payments')
          .insert(paymentData)
          .select()
          .single();

        if (error) throw error;

        await logAudit({
          action: 'CREATE',
          table_name: 'payments',
          record_id: data.id,
          details: paymentData,
        });

        toast({
          title: 'Sucesso',
          description: 'Pagamento criado com sucesso',
          variant: 'default',
        });
      }

      setIsDialogOpen(false);
      setEditingPayment(null);
      setFormData({ user_id: '', amount: '', due_date: '', status: 'pending', payment_type: 'recurring', description: '' });
      fetchPayments();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        console.error('Error saving payment:', error);
        toast({
          title: 'Erro ao salvar pagamento',
          description: mapErrorToUserMessage(error),
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este pagamento?')) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('payments').delete().eq('id', id);
      if (error) throw error;

      await logAudit({
        action: 'DELETE',
        table_name: 'payments',
        record_id: id,
      });

      toast({
        title: 'Sucesso',
        description: 'Pagamento excluído com sucesso',
        variant: 'default',
      });
      fetchPayments();
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      toast({
        title: 'Erro ao excluir pagamento',
        description: mapErrorToUserMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRecurringPayments = async () => {
    if (!confirm('Deseja gerar pagamentos recorrentes (mensalidades) para todos os usuários ativos?')) return;

    setLoading(true);
    try {
      const { data: activeUsers, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('is_approved', true);

      if (usersError) throw usersError;

      if (!activeUsers || activeUsers.length === 0) {
        toast({ title: 'Nenhum usuário ativo', description: 'Não há usuários aprovados para gerar mensalidades.', variant: 'default' });
        setLoading(false);
        return;
      }

      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(10); // Set due date to 10th of next month

      const paymentsToInsert: Tables<'payments', 'Insert'>[] = activeUsers.map(user => ({
        user_id: user.id,
        amount: 120.00,
        due_date: nextMonth.toISOString().split('T')[0], // YYYY-MM-DD
        status: 'pending',
        payment_type: 'recurring',
        description: `Mensalidade - ${nextMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`,
      }));

      const { error: insertError } = await supabase
        .from('payments')
        .insert(paymentsToInsert);

      if (insertError) throw insertError;

      await logAudit({
        action: 'CREATE',
        table_name: 'payments',
        details: { action: 'generate_recurring_payments', count: paymentsToInsert.length },
      });

      toast({
        title: 'Mensalidades geradas!',
        description: `${paymentsToInsert.length} pagamentos recorrentes foram criados para o próximo mês.`,
        variant: 'default',
      });
      fetchPayments();
    } catch (error: any) {
      console.error('Error generating recurring payments:', error.message);
      toast({
        title: 'Erro ao gerar mensalidades',
        description: mapErrorToUserMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: Tables<'payments'>['status']) => {
    const statusMap = {
      paid: { label: 'Pago', variant: 'default' as const },
      pending: { label: 'Pendente', variant: 'secondary' as const },
      overdue: { label: 'Atrasado', variant: 'destructive' as const },
    };
    
    const statusInfo = statusMap[status] || { label: status, variant: 'secondary' as const };
    
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getPaymentTypeBadge = (type: Tables<'payments'>['payment_type']) => {
    const typeMap = {
      initial: { label: 'Adesão', variant: 'outline' as const },
      recurring: { label: 'Mensalidade', variant: 'default' as const },
    };
    const typeInfo = typeMap[type] || { label: type, variant: 'secondary' as const };
    return <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Gerenciar Pagamentos
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={handleGenerateRecurringPayments} disabled={loading} variant="outline">
              <CalendarPlus className="h-4 w-4 mr-2" />
              Gerar Mensalidades
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingPayment(null);
                  setFormData({ user_id: '', amount: '', due_date: '', status: 'pending', payment_type: 'recurring', description: '' });
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Pagamento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingPayment ? 'Editar Pagamento' : 'Criar Novo Pagamento'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="user">Usuário</Label>
                    <Select
                      value={formData.user_id}
                      onValueChange={(value) => setFormData({ ...formData, user_id: value })}
                      disabled={!!editingPayment || loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um usuário" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor (R$)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="due_date">Data de Vencimento</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value as Tables<'payments'>['status'] })}
                      disabled={loading}
                    >
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

                  <div className="space-y-2">
                    <Label htmlFor="payment_type">Tipo de Pagamento</Label>
                    <Select
                      value={formData.payment_type}
                      onValueChange={(value) => setFormData({ ...formData, payment_type: value as Tables<'payments'>['payment_type'] })}
                      disabled={!!editingPayment || loading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="initial">Adesão</SelectItem>
                        <SelectItem value="recurring">Recorrente (Mensalidade)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Ex: Mensalidade Out/2025"
                      disabled={loading}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={loading}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      {editingPayment ? 'Atualizar' : 'Criar Pagamento'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.user_full_name || 'N/A'}</TableCell>
                  <TableCell>{getPaymentTypeBadge(payment.payment_type)}</TableCell>
                  <TableCell>{payment.description || '-'}</TableCell>
                  <TableCell>R$ {parseFloat(payment.amount.toString()).toFixed(2)}</TableCell>
                  <TableCell>{new Date(payment.due_date).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(payment)}
                        disabled={loading}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(payment.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
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

export default PaymentManagement;