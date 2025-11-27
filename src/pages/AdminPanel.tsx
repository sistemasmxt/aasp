import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, DatabaseBackup } from '@/lib/lucide-icons'; // Importar apenas os ícones que não são usados dinamicamente ou que são usados como fallback
import { getLucideIconByName } from '@/lib/lucide-icons'; // Importar a função para obter ícones dinamicamente
import logo from '@/img/logo.png';
import { useToast } from '@/hooks/use-toast';
import UserManagement from '@/components/admin/UserManagementEnhanced';
import CameraManagement from '@/components/admin/CameraManagementEnhanced';
import PaymentManagement from '@/components/admin/PaymentManagement';
import AdminDashboard from '@/components/admin/AdminDashboard';
import AuditLogs from '@/components/admin/AuditLogs';
import PublicUtilityContactsManagement from '@/components/admin/PublicUtilityContactsManagement';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { CardHeader, CardTitle, Card, CardDescription, CardContent } from '@/components/ui/card';

const AdminPanel = () => {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [auditLogsRefetchTrigger, setAuditLogsRefetchTrigger] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isBackupLoading, setIsBackupLoading] = useState(false);

  const [currentAdminId, setCurrentAdminId] = useState<string | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getUser().then(res => {
      setCurrentAdminId(res.data.user?.id);
    });
  }, []);

  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    fetchNotifications
  } = useAdminNotifications(currentAdminId);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado do painel administrativo"
    });
    navigate('/admin-login');
  };

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      console.log('User is not admin, redirecting to dashboard');
      navigate('/dashboard');
    }
  }, [isAdmin, adminLoading, navigate]);

  const triggerAuditLogsRefetch = () => {
    setAuditLogsRefetchTrigger(prev => prev + 1);
  };

  useEffect(() => {
    if (isNotificationsOpen) {
      fetchNotifications();
    }
  }, [isNotificationsOpen, fetchNotifications]);

  const handleFullBackup = async () => {
    if (!confirm('Tem certeza que deseja iniciar um backup completo? Esta operação pode levar alguns minutos e é recomendável para fins de auditoria e não como backup principal.')) {
      return;
    }

    setIsBackupLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('trigger-full-backup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`,
          'Content-Type': 'application/json',
        },
      });

      if (error) throw error;
      if (data && data.error) throw new Error(data.error);

      toast({
        title: "Backup Iniciado!",
        description: "O processo de backup completo foi iniciado. Verifique as notificações para detalhes.",
        variant: "default",
      });
      triggerAuditLogsRefetch(); // Log this action
      fetchNotifications(); // Refresh admin notifications
    } catch (error: any) {
      console.error('Error triggering full backup:', error);
      toast({
        title: "Erro ao iniciar backup",
        description: error.message || "Não foi possível iniciar o backup. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsBackupLoading(false);
    }
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Verificando permissões...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const ArrowLeftIcon = getLucideIconByName('ArrowLeft');
  const BellIcon = getLucideIconByName('Bell');
  const DollarSignIcon = getLucideIconByName('DollarSign');
  const CheckCircleIcon = getLucideIconByName('CheckCircle');
  const LogOutIcon = getLucideIconByName('LogOut');
  const ShieldIcon = getLucideIconByName('Shield');
  const UsersIcon = getLucideIconByName('Users');
  const CameraIcon = getLucideIconByName('Camera');
  const WrenchIcon = getLucideIconByName('Wrench');
  const ToolIcon = getLucideIconByName('Tool');


  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeftIcon className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <img src={logo} alt="AASP Logo" className="h-8 w-8" />
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Painel Central</h1>
                  <p className="text-sm text-muted-foreground">Administração AASP</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <BellIcon className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                      >
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0">
                  <CardHeader className="p-4 border-b">
                    <CardTitle className="text-lg">Notificações Administrativas</CardTitle>
                  </CardHeader>
                  <ScrollArea className="h-[300px]">
                    <div className="p-4 space-y-2">
                      {notificationsLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : notifications.length === 0 ? (
                        <p className="text-center text-muted-foreground text-sm py-4">Nenhuma notificação nova.</p>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`flex items-start gap-2 p-2 rounded-md cursor-pointer ${notification.is_read ? 'bg-muted/50' : 'bg-accent/10 hover:bg-accent/20'}`}
                            onClick={() => {
                              markNotificationAsRead(notification.id);
                              if (notification.type === 'payment_notification' && notification.details?.user_id) {
                                navigate(`/admin?tab=users&userId=${notification.details.user_id}`);
                              }
                              setIsNotificationsOpen(false);
                            }}
                          >
                            {notification.type === 'payment_notification' ? (
                              <DollarSignIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                            ) : (
                              <BellIcon className="h-5 w-5 text-primary flex-shrink-0" />
                            )}
                            <div>
                              <p className="font-medium text-sm">{notification.message}</p>
                              <p className="text-xs text-muted-foreground">
                                {notification.profiles?.full_name ? `De: ${notification.profiles.full_name}` : 'Usuário desconhecido'}
                              </p>
                              <p className="text-xs text-muted-foreground">{new Date(notification.created_at).toLocaleString('pt-BR')}</p>
                            </div>
                            {!notification.is_read && (
                              <CheckCircleIcon className="h-4 w-4 text-green-500 ml-auto" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                  {unreadCount > 0 && (
                    <div className="p-2 border-t">
                      <Button variant="ghost" className="w-full text-sm" onClick={markAllNotificationsAsRead}>
                        Marcar todas como lidas
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOutIcon className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7"> {/* Adjusted grid-cols to 7 */}
            <TabsTrigger value="dashboard">
              <ShieldIcon className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="users">
              <UsersIcon className="h-4 w-4 mr-2" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="cameras">
              <CameraIcon className="h-4 w-4 mr-2" />
              Câmeras
            </TabsTrigger>
            <TabsTrigger value="payments">
              <DollarSignIcon className="h-4 w-4 mr-2" />
              Pagamentos
            </TabsTrigger>
            <TabsTrigger value="utilities">
              <WrenchIcon className="h-4 w-4 mr-2" />
              Utilidades
            </TabsTrigger>
            <TabsTrigger value="logs">
              <ShieldIcon className="h-4 w-4 mr-2" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="tools"> {/* New tab for tools */}
              <ToolIcon className="h-4 w-4 mr-2" />
              Ferramentas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <AdminDashboard />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement onAuditLogSuccess={triggerAuditLogsRefetch} />
          </TabsContent>

          <TabsContent value="cameras">
            <CameraManagement onAuditLogSuccess={triggerAuditLogsRefetch} />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentManagement onAuditLogSuccess={triggerAuditLogsRefetch} />
          </TabsContent>

          <TabsContent value="utilities">
            <PublicUtilityContactsManagement onAuditLogSuccess={triggerAuditLogsRefetch} />
          </TabsContent>

          <TabsContent value="logs">
            <AuditLogs refetchTrigger={auditLogsRefetchTrigger} />
          </TabsContent>

          <TabsContent value="tools"> {/* Content for the new tools tab */}
            <Card className="p-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ToolIcon className="h-6 w-6 text-primary" />
                  Ferramentas Administrativas
                </CardTitle>
                <CardDescription>
                  Gerencie operações avançadas do sistema.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold text-lg">Backup Completo</h3>
                    <p className="text-sm text-muted-foreground">
                      Inicia um processo de backup de dados do banco de dados e arquivos do Supabase Storage.
                      <br />
                      **Importante:** Para backups completos e restauráveis, utilize as ferramentas de backup do painel Supabase.
                    </p>
                  </div>
                  <Button onClick={handleFullBackup} disabled={isBackupLoading}>
                    {isBackupLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Iniciando Backup...
                      </>
                    ) : (
                      <>
                        <DatabaseBackup className="h-4 w-4 mr-2" />
                        Iniciar Backup
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;