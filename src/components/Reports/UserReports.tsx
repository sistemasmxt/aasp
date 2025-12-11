import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button'; // Import Button
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, DollarSign, CheckCircle, XCircle, Clock, CalendarDays, CreditCard } from 'lucide-react'; // Import CreditCard icon
import { mapErrorToUserMessage } from '@/lib/errorHandler';
import { Tables } from '@/integrations/supabase/types';
import { PaymentModal } from '@/components/PaymentModal'; // Import PaymentModal

type Payment = Tables<'payments'>;
type Profile = Tables<'profiles'>;

const UserReports = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentForModal, setSelectedPaymentForModal] = useState<Payment | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        // Fetch payments
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .eq('user_id', user.id)
          .order('due_date', { ascending: true });

        if (paymentsError) throw paymentsError;
        setPayments(paymentsData || []);

      } catch (error) {
        console.error('Error fetching user reports:', error);
        toast({
          title: 'Erro ao carregar relatórios',
          description: mapErrorToUserMessage(error),
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchUserData();
    } else if (!authLoading && !user) {
      // User not logged in, handle redirection in ProtectedRoute
    }
  }, [user, authLoading, toast]);

  const getPaymentStatusBadge = (status: Payment['status']) => {
    switch (status) {
      case 'paid': return <Badge variant="default" className="bg-green-500 hover:bg-green-500">Pago</Badge>;
      case 'pending': return <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-500">Pendente</Badge>;
      case 'overdue': return <Badge variant="destructive">Atrasado</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentTypeLabel = (type: Payment['payment_type']) => {
    switch (type) {
      case 'initial': return 'Adesão';
      case 'recurring': return 'Mensalidade';
      default: return type;
    }
  };

  const handlePayClick = (payment: Payment) => {
    setSelectedPaymentForModal(payment);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentProcessed = () => {
    setIsPaymentModalOpen(false);
    // Refetch payments to update the list
    if (user) {
      setLoading(true);
      const fetchUpdatedPayments = async () => {
        try {
          const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('user_id', user.id)
            .order('due_date', { ascending: true });
          
          if (error) throw error;
          setPayments(data || []);
        } catch (error) {
          console.error('Error refetching payments:', error);
          toast({
            title: 'Erro ao atualizar pagamentos',
            description: mapErrorToUserMessage(error),
            variant: 'destructive',
          });
        } finally {
          setLoading(false);
        }
      };
      fetchUpdatedPayments();
    }
  };

  const today = new Date();
  const pastPayments = payments.filter(p => new Date(p.due_date) < today && p.status === 'paid');
  const upcomingPayments = payments.filter(p => new Date(p.due_date) >= today || p.status !== 'paid');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Carregando seus relatórios...</p>
      </div>
    );
  }

  if (!user) {
    return <p className="text-center text-muted-foreground">Você precisa estar logado para ver esta página.</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Status da Sua Conta
          </CardTitle>
          <CardDescription>Informações gerais sobre sua adesão e pagamentos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-lg">Status de Aprovação:</h3>
            {profile?.is_approved ? (
              <Badge className="bg-green-500 hover:bg-green-500">
                <CheckCircle className="h-4 w-4 mr-1" /> Aprovado
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="h-4 w-4 mr-1" /> Pendente
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-lg">Status do Pagamento Inicial:</h3>
            {profile?.initial_payment_status === 'paid' ? (
              <Badge className="bg-green-500 hover:bg-green-500">
                <CheckCircle className="h-4 w-4 mr-1" /> Pago
              </Badge>
            ) : profile?.initial_payment_status === 'pending' ? (
              <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-500">
                <Clock className="h-4 w-4 mr-1" /> Pendente
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="h-4 w-4 mr-1" /> Não Pago
              </Badge>
            )}
          </div>
          {!profile?.is_approved && (
            <p className="text-sm text-muted-foreground">
              Sua conta está aguardando aprovação. Por favor, certifique-se de que seu pagamento inicial foi processado.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Histórico de Pagamentos
          </CardTitle>
          <CardDescription>Todos os pagamentos que você já realizou.</CardDescription>
        </CardHeader>
        <CardContent>
          {pastPayments.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nenhum pagamento realizado ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pastPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{getPaymentTypeLabel(payment.payment_type)}</TableCell>
                    <TableCell>{payment.description || '-'}</TableCell>
                    <TableCell>R$ {payment.amount.toFixed(2)}</TableCell>
                    <TableCell>{new Date(payment.due_date).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{getPaymentStatusBadge(payment.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Próximas Cobranças
          </CardTitle>
          <CardDescription>Pagamentos futuros e pendentes.</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingPayments.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nenhuma cobrança futura ou pendente.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead> {/* New Actions column */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{getPaymentTypeLabel(payment.payment_type)}</TableCell>
                    <TableCell>{payment.description || '-'}</TableCell>
                    <TableCell>R$ {payment.amount.toFixed(2)}</TableCell>
                    <TableCell>{new Date(payment.due_date).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{getPaymentStatusBadge(payment.status)}</TableCell>
                    <TableCell className="text-right">
                      {(payment.status === 'pending' || payment.status === 'overdue') && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handlePayClick(payment)}
                          disabled={loading}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Pagar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedPaymentForModal && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          paymentDetails={selectedPaymentForModal}
          onPaymentProcessed={handlePaymentProcessed}
        />
      )}
    </div>
  );
};

export default UserReports;