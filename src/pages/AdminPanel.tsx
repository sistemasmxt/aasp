import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Users, Camera, DollarSign, Shield, LogOut } from 'lucide-react';
import logo from '@/img/logo.png';
import { useToast } from '@/hooks/use-toast';
import UserManagement from '@/components/admin/UserManagementEnhanced';
import CameraManagement from '@/components/admin/CameraManagementEnhanced';
import PaymentManagement from '@/components/admin/PaymentManagement';
import AdminDashboard from '@/components/admin/AdminDashboard';
import AuditLogs from '@/components/admin/AuditLogs';
import { supabase } from '@/integrations/supabase/client';

const AdminPanel = () => {
  const { isAdmin, loading } = useAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado do painel administrativo"
    });
    navigate('/admin-login');
  };

  useEffect(() => {
    if (!loading && !isAdmin) {
      console.log('User is not admin, redirecting to dashboard');
      navigate('/dashboard');
    }
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Verificando permissões...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <img src={logo} alt="AASP Logo" className="h-8 w-8" />
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Painel Central</h1>
                  <p className="text-sm text-muted-foreground">Administração AASP</p>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">
              <Shield className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="cameras">
              <Camera className="h-4 w-4 mr-2" />
              Câmeras
            </TabsTrigger>
            <TabsTrigger value="payments">
              <DollarSign className="h-4 w-4 mr-2" />
              Pagamentos
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Shield className="h-4 w-4 mr-2" />
              Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <AdminDashboard />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="cameras">
            <CameraManagement />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentManagement />
          </TabsContent>

          <TabsContent value="logs">
            <AuditLogs />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;