import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Camera, DollarSign, Shield, TrendingUp, AlertCircle } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalAdmins: number;
  approvedUsers: number; // New stat
  totalCameras: number;
  activeCameras: number;
  totalPayments: number;
  paidPayments: number;
  pendingPayments: number;
  overduePayments: number;
  initialPaymentsPending: number; // New stat
  recurringPaymentsPending: number; // New stat
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalAdmins: 0,
    approvedUsers: 0,
    totalCameras: 0,
    activeCameras: 0,
    totalPayments: 0,
    paidPayments: 0,
    pendingPayments: 0,
    overduePayments: 0,
    initialPaymentsPending: 0,
    recurringPaymentsPending: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [
        { count: usersCount },
        { count: adminsCount },
        { count: approvedUsersCount },
        { data: cameras },
        { count: paymentsCount },
        { data: payments },
        { count: initialPaymentsPendingCount },
        { count: recurringPaymentsPendingCount },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_approved', true),
        supabase.from('cameras').select('is_active'),
        supabase.from('payments').select('*', { count: 'exact', head: true }),
        supabase.from('payments').select('status, payment_type'),
        supabase.from('payments').select('*', { count: 'exact', head: true }).eq('payment_type', 'initial').eq('status', 'pending'),
        supabase.from('payments').select('*', { count: 'exact', head: true }).eq('payment_type', 'recurring').eq('status', 'pending'),
      ]);

      const activeCameras = cameras?.filter(c => c.is_active).length || 0;
      const paidPayments = payments?.filter(p => p.status === 'paid').length || 0;
      const pendingPayments = payments?.filter(p => p.status === 'pending').length || 0;
      const overduePayments = payments?.filter(p => p.status === 'overdue').length || 0;

      setStats({
        totalUsers: usersCount || 0,
        totalAdmins: adminsCount || 0,
        approvedUsers: approvedUsersCount || 0,
        totalCameras: cameras?.length || 0,
        activeCameras,
        totalPayments: paymentsCount || 0,
        paidPayments,
        pendingPayments,
        overduePayments,
        initialPaymentsPending: initialPaymentsPendingCount || 0,
        recurringPaymentsPending: recurringPaymentsPendingCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.approvedUsers} aprovados | {stats.totalAdmins} administradores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Câmeras</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCameras}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeCameras} ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagamentos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPayments}</div>
            <p className="text-xs text-muted-foreground">
              {stats.paidPayments} pagos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saúde do Sistema</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">OK</div>
            <p className="text-xs text-muted-foreground">
              Monitoramento ativo
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagamentos Pendentes</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingPayments}</div>
            <p className="text-xs text-muted-foreground">
              {stats.initialPaymentsPending} adesão | {stats.recurringPaymentsPending} mensalidade
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagamentos Atrasados</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.overduePayments}</div>
            <p className="text-xs text-muted-foreground">Requerem atenção</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Câmeras Inativas</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCameras - stats.activeCameras}</div>
            <p className="text-xs text-muted-foreground">Verificar status</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;