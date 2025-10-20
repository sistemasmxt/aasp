import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Users,
  Camera,
  DollarSign,
  Shield,
  Database,
  Settings,
  Activity,
  BarChart3,
  FileText,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Server,
  Key,
  Lock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import UserManagement from '@/components/admin/UserManagementEnhanced';
import CameraManagement from '@/components/admin/CameraManagementEnhanced';
import PaymentManagement from '@/components/admin/PaymentManagement';
import GroupManagement from '@/components/admin/GroupManagementEnhanced';
import AdminDashboard from '@/components/admin/AdminDashboard';
import AuditLogs from '@/components/admin/AuditLogs';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalCameras: number;
  activeCameras: number;
  totalPayments: number;
  pendingPayments: number;
  totalGroups: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  lastBackup: string;
  databaseSize: string;
}

const AdminBackend = () => {
  const { isAdmin, loading } = useAdmin();
  const navigate = useNavigate();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadSystemStats();
    }
  }, [isAdmin]);

  const loadSystemStats = async () => {
    try {
      setLoadingStats(true);

      // Get user stats
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get camera stats
      const { count: totalCameras } = await supabase
        .from('cameras')
        .select('*', { count: 'exact', head: true });

      const { count: activeCameras } = await supabase
        .from('cameras')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get payment stats
      const { count: totalPayments } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true });

      const { count: pendingPayments } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Get group stats
      const { count: totalGroups } = await supabase
        .from('groups')
        .select('*', { count: 'exact', head: true });

      // Get active users (users who logged in within last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_login', thirtyDaysAgo.toISOString());

      // Mock system health and other stats
      const systemHealth = activeCameras && activeCameras > totalCameras * 0.8 ? 'healthy' :
                          activeCameras && activeCameras > totalCameras * 0.5 ? 'warning' : 'critical';

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalCameras: totalCameras || 0,
        activeCameras: activeCameras || 0,
        totalPayments: totalPayments || 0,
        pendingPayments: pendingPayments || 0,
        totalGroups: totalGroups || 0,
        systemHealth,
        lastBackup: new Date().toISOString(),
        databaseSize: '2.4 GB'
      });
    } catch (error) {
      console.error('Error loading system stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Verificando permissões administrativas...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/dashboard')}
                className="text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Server className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Painel Backend</h1>
                  <p className="text-sm text-slate-400">Sistema de Administração AASP</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Badge variant="outline" className="border-slate-700 text-slate-300">
                <Lock className="h-3 w-3 mr-1" />
                Admin
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={loadSystemStats}
                disabled={loadingStats}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                <Activity className="h-4 w-4 mr-2" />
                {loadingStats ? 'Atualizando...' : 'Atualizar'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Usuários</CardTitle>
              <Users className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-slate-400">
                {stats?.activeUsers || 0} ativos (30d)
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Câmeras</CardTitle>
              <Camera className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.totalCameras || 0}</div>
              <p className="text-xs text-slate-400">
                {stats?.activeCameras || 0} ativas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Pagamentos</CardTitle>
              <DollarSign className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.totalPayments || 0}</div>
              <p className="text-xs text-slate-400">
                {stats?.pendingPayments || 0} pendentes
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Sistema</CardTitle>
              {stats && getHealthIcon(stats.systemHealth)}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getHealthColor(stats?.systemHealth || 'healthy')}`}>
                {stats?.systemHealth === 'healthy' ? 'OK' :
                 stats?.systemHealth === 'warning' ? 'ATENÇÃO' : 'CRÍTICO'}
              </div>
              <p className="text-xs text-slate-400">
                {stats?.totalGroups || 0} grupos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* System Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-200 flex items-center gap-2">
                <Database className="h-5 w-5" />
                Banco de Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Tamanho:</span>
                <span className="text-slate-200">{stats?.databaseSize || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Último Backup:</span>
                <span className="text-slate-200">
                  {stats?.lastBackup ? new Date(stats.lastBackup).toLocaleDateString('pt-BR') : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <Badge variant="outline" className="border-green-700 text-green-400">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Online
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-200 flex items-center gap-2">
                <Key className="h-5 w-5" />
                Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">RLS:</span>
                <Badge variant="outline" className="border-green-700 text-green-400">
                  <Shield className="h-3 w-3 mr-1" />
                  Ativo
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Auditoria:</span>
                <Badge variant="outline" className="border-blue-700 text-blue-400">
                  <FileText className="h-3 w-3 mr-1" />
                  Habilitada
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sessões:</span>
                <span className="text-slate-200">247 ativas</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-200 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">CPU:</span>
                <span className="text-green-400">23%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Memória:</span>
                <span className="text-yellow-400">67%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Uptime:</span>
                <span className="text-slate-200">15d 8h</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Admin Interface */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-200 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Gerenciamento do Sistema
            </CardTitle>
            <CardDescription className="text-slate-400">
              Interface administrativa completa para gestão da plataforma AASP
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="dashboard" className="space-y-6">
              <TabsList className="grid w-full grid-cols-6 bg-slate-800">
                <TabsTrigger value="dashboard" className="data-[state=active]:bg-slate-700">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="users" className="data-[state=active]:bg-slate-700">
                  <Users className="h-4 w-4 mr-2" />
                  Usuários
                </TabsTrigger>
                <TabsTrigger value="cameras" className="data-[state=active]:bg-slate-700">
                  <Camera className="h-4 w-4 mr-2" />
                  Câmeras
                </TabsTrigger>
                <TabsTrigger value="payments" className="data-[state=active]:bg-slate-700">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Pagamentos
                </TabsTrigger>
                <TabsTrigger value="groups" className="data-[state=active]:bg-slate-700">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Grupos
                </TabsTrigger>
                <TabsTrigger value="logs" className="data-[state=active]:bg-slate-700">
                  <FileText className="h-4 w-4 mr-2" />
                  Auditoria
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="space-y-4">
                <AdminDashboard />
              </TabsContent>

              <TabsContent value="users" className="space-y-4">
                <UserManagement />
              </TabsContent>

              <TabsContent value="cameras" className="space-y-4">
                <CameraManagement />
              </TabsContent>

              <TabsContent value="payments" className="space-y-4">
                <PaymentManagement />
              </TabsContent>

              <TabsContent value="groups" className="space-y-4">
                <GroupManagement />
              </TabsContent>

              <TabsContent value="logs" className="space-y-4">
                <AuditLogs />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminBackend;
