import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AlertCircle,
  Camera,
  MessageCircle,
  Users,
  MapPin,
  Bell,
  LogOut,
  Menu,
  Settings,
  Home,
  DollarSign,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  ArrowLeft,
  UserRound,
  ClipboardList,
  ShieldAlert,
  Ambulance,
  Wrench,
  Mail,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/img/logo.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { mapErrorToUserMessage } from "@/lib/errorHandler";
import { ChatInterface } from "@/components/chat/ChatInterface";
import Map from "@/components/Map";
import CameraList from "@/components/cameras/CameraList";
import { ProfileEditModal } from "@/components/ProfileEditModal";
import DashboardHome from "@/components/DashboardHome";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import UtilitiesList from "@/components/UtilitiesList";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount"; // Import the new hook
import UserReports from "@/components/Reports/UserReports"; // Import the new UserReports component

type DashboardView = 'home' | 'chat' | 'cameras' | 'map' | 'utilities' | 'reports'; // Added 'reports'

interface NotificationItem {
  type: 'message' | 'alert';
  id: string;
  title: string;
  description: string;
  timestamp: string;
  sender_id?: string;
  is_read?: boolean;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState<{
    id: string;
    full_name: string;
    phone: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
  } | null>(null);
  const [emergencyAlerts, setEmergencyAlerts] = useState<{
    id: string;
    user_id: string;
    alert_type: string;
    latitude: number;
    longitude: number;
    message: string | null;
    is_active: boolean;
    created_at: string;
    resolved_at: string | null;
    user_name?: string;
  }[]>([]);
  const [unreadMessages, setUnreadMessages] = useState<NotificationItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const alertsPerPage = 5;
  const [activeView, setActiveView] = useState<DashboardView>('home');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<any>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const { unreadCount, fetchUnreadCount, markAllMessagesAsRead } = useUnreadMessageCount(user?.id);

  // Function to fetch unread messages for the popover
  const fetchUnreadMessagesForPopover = async () => {
    if (!user) {
      setUnreadMessages([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, sender_id, content, created_at')
        .eq('receiver_id', user.id)
        .is('read_at', null)
        .eq('is_group', false)
        .order('created_at', { ascending: false })
        .limit(5); // Limit to a few recent unread messages

      if (error) throw error;

      const messagesWithSenderNames = await Promise.all((data || []).map(async (msg) => {
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', msg.sender_id)
          .single();
        return {
          type: 'message',
          id: msg.id,
          title: `Nova mensagem de ${senderProfile?.full_name || 'Usuário'}`,
          description: msg.content || 'Mensagem sem conteúdo',
          timestamp: msg.created_at,
          sender_id: msg.sender_id,
          is_read: false,
        } as NotificationItem;
      }));
      setUnreadMessages(messagesWithSenderNames);
    } catch (error) {
      console.error('Error fetching unread messages for popover:', error);
      setUnreadMessages([]);
    }
  };

  useEffect(() => {
    if (user) {
      // Load user profile
      supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()
        .then(({ data }) => setProfile(data));

      // Load today's alerts with user names (considering local timezone)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Convertendo para UTC para garantir que a query funcione corretamente
      const todayUTC = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
      const tomorrowUTC = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000);

      supabase
        .from("emergency_alerts")
        .select("*")
        .gte("created_at", todayUTC.toISOString())
        .lt("created_at", tomorrowUTC.toISOString())
        .order("created_at", { ascending: false })
        .then(async ({ data: alertsData }) => {
          if (alertsData && alertsData.length > 0) {
            const userIds = alertsData.map(alert => alert.user_id);
            const { data: profilesData } = await supabase
              .from("profiles")
              .select("id, full_name")
              .in("id", userIds);

            const profilesMap = profilesData?.reduce((acc, profile) => {
              acc[profile.id] = profile.full_name;
              return acc;
            }, {} as Record<string, string>) || {};

            const alertsWithNames = alertsData.map(alert => ({
              ...alert,
              user_name: profilesMap[alert.user_id] || "Usuário"
            }));

            setEmergencyAlerts(alertsWithNames);
          } else {
            setEmergencyAlerts([]);
          }
        });

      // Subscribe to new alerts
      const channel = supabase
        .channel("emergency_alerts")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "emergency_alerts",
          },
          async (payload) => {
            // Check if the new alert is from today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const alertDate = new Date(payload.new.created_at);

            if (alertDate >= today) {
              // Fetch user name for the new alert
              const { data: userProfile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", payload.new.user_id)
                .single();

              setEmergencyAlerts((prev) => {
                const newAlert: typeof prev[0] = {
                  id: payload.new.id,
                  user_id: payload.new.user_id,
                  alert_type: payload.new.alert_type,
                  latitude: payload.new.latitude,
                  longitude: payload.new.longitude,
                  message: payload.new.message,
                  is_active: payload.new.is_active,
                  created_at: payload.new.created_at,
                  resolved_at: payload.new.resolved_at,
                  user_name: userProfile?.full_name || "Usuário"
                };
                // Resetar a paginação quando um novo alerta chega
                setCurrentPage(1);
                return [newAlert, ...prev];
              });
              toast({
                title: "⚠️ Novo Alerta de Emergência!",
                description: `${userProfile?.full_name || "Usuário"} ativou um alerta de ${payload.new.alert_type}`,
                variant: "destructive",
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, toast]);

  // Fetch unread messages for the notification popover when it opens
  useEffect(() => {
    if (isNotificationsOpen && user) {
      fetchUnreadMessagesForPopover();
    }
  }, [isNotificationsOpen, user]);


  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleSOSAlert = async () => {
    if (!user) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { data, error } = await supabase.from("emergency_alerts").insert({
            user_id: user.id,
            alert_type: "emergency",
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            message: "Alerta SOS ativado!",
          }).select().single();

          if (error) throw error;

          // Play alert sound for the user who sent the alert
          const audio = new Audio('/sounds/alerta.mp3');
          audio.volume = 0.8;
          audio.play().catch(error => {
            console.warn('Could not play alert sound:', error);
          });

          toast({
            title: "🚨 SOS Ativado!",
            description: "Alerta enviado para todos os associados",
            variant: "destructive",
          });
        } catch (error: unknown) {
          toast({
            title: "Erro ao enviar alerta",
            description: mapErrorToUserMessage(error),
            variant: "destructive",
          });
        }
      },
      (error) => {
        toast({
          title: "Erro de localização",
          description: "Não foi possível obter sua localização",
          variant: "destructive",
        });
      }
    );
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("emergency_alerts")
        .update({
          is_active: false,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", alertId);

      if (error) throw error;

      setEmergencyAlerts((prev) => {
        // Mantém a ordem original dos alertas
        const updatedAlerts = prev.map((alert) =>
          alert.id === alertId
            ? { ...alert, is_active: false, resolved_at: new Date().toISOString() }
            : alert
        );
        // Re-ordena os alertas: primeiro os ativos, depois os resolvidos, mantendo a ordem cronológica em cada grupo
        return updatedAlerts.sort((a, b) => {
          if (a.is_active !== b.is_active) {
            return a.is_active ? -1 : 1;
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      });

      toast({
        title: "✅ Alerta Resolvido",
        description: "O alerta foi marcado como atendido",
      });
    } catch (error: unknown) {
      toast({
        title: "Erro ao resolver alerta",
        description: mapErrorToUserMessage(error),
        variant: "destructive",
      });
    }
  };

  const handleSelectView = (view: DashboardView | 'profile' | 'police' | 'ambulance') => {
    if (view === 'profile') {
      setIsProfileModalOpen(true);
    } else if (view === 'police') {
      toast({
        title: "🚨 Contato com a Polícia",
        description: "Funcionalidade de contato com a polícia em desenvolvimento.",
      });
    } else if (view === 'ambulance') {
      toast({
        title: "🚑 Contato com a Ambulância",
        description: "Funcionalidade de contato com a ambulância em desenvolvimento.",
      });
    } else {
      setActiveView(view as DashboardView);
    }
    setMenuOpen(false);
  };

  const handleCameraSelect = (camera: any) => {
    setSelectedCamera(camera);
    toast({
      title: "Câmera Selecionada",
      description: `Você selecionou a câmera: ${camera.name}`,
    });
  };

  const totalNotifications = emergencyAlerts.filter(alert => alert.is_active).length + unreadCount;

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (notification.type === 'message' && notification.sender_id) {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notification.id);
      fetchUnreadCount(); // Update count after marking as read
      fetchUnreadMessagesForPopover(); // Re-fetch messages for popover to update list
      setActiveView('chat');
      setSelectedChatUserId(notification.sender_id);
    } else if (notification.type === 'alert') {
      // Maybe navigate to a map view or alert details
      // For now, just close popover
    }
    setIsNotificationsOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="text-center">
          <img src={logo} alt="AASP Logo" className="h-20 w-20 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">
            Verificando autenticação...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-950">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {activeView !== 'home' && (
                <Button variant="ghost" size="icon" onClick={() => setActiveView('home')} className="mr-2">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <img src={logo} alt="AASP Logo" className="h-10 w-10" />
              <span className="text-2xl font-bold text-foreground">AASP</span>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {totalNotifications > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                      >
                        {totalNotifications}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0">
                  <CardHeader className="p-4 border-b">
                    <CardTitle className="text-lg">Notificações</CardTitle>
                  </CardHeader>
                  <ScrollArea className="h-[300px]">
                    <div className="p-4 space-y-2">
                      {emergencyAlerts.filter(alert => alert.is_active).map((alert) => (
                        <div key={alert.id} className="flex items-start gap-2 p-2 hover:bg-muted rounded-md cursor-pointer" onClick={() => handleNotificationClick({
                          type: 'alert',
                          id: alert.id,
                          title: `🚨 ALERTA: ${alert.alert_type.toUpperCase()}`,
                          description: `${alert.user_name} ativou um alerta!`,
                          timestamp: alert.created_at,
                        })}>
                          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                          <div>
                            <p className="font-medium text-sm">🚨 ALERTA: {alert.alert_type.toUpperCase()}</p>
                            <p className="text-xs text-muted-foreground">{alert.user_name} ativou um alerta!</p>
                            <p className="text-xs text-muted-foreground">{new Date(alert.created_at).toLocaleString('pt-BR')}</p>
                          </div>
                        </div>
                      ))}
                      {unreadMessages.map((msg) => (
                        <div key={msg.id} className="flex items-start gap-2 p-2 hover:bg-muted rounded-md cursor-pointer" onClick={() => handleNotificationClick(msg)}>
                          <Mail className="h-5 w-5 text-primary flex-shrink-0" />
                          <div>
                            <p className="font-medium text-sm">{msg.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{msg.description}</p>
                            <p className="text-xs text-muted-foreground">{new Date(msg.timestamp).toLocaleString('pt-BR')}</p>
                          </div>
                        </div>
                      ))}
                      {totalNotifications === 0 && (
                        <p className="text-center text-muted-foreground text-sm py-4">Nenhuma notificação nova.</p>
                      )}
                    </div>
                  </ScrollArea>
                  {totalNotifications > 0 && (
                    <div className="p-2 border-t">
                      <Button variant="ghost" className="w-full text-sm" onClick={markAllMessagesAsRead}>
                        Marcar todas como lidas
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              <ProfileEditModal profile={profile} onProfileUpdate={setProfile} open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen} />
              <div className="flex items-center gap-3 ml-4">
                <Avatar>
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {profile?.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">
                    {profile?.full_name || "Usuário"}
                  </p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>

            {/* Mobile Menu Trigger */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[250px] sm:w-[300px] flex flex-col">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <img src={logo} alt="AASP Logo" className="h-8 w-8" />
                    Menu
                  </SheetTitle>
                </SheetHeader>
                <ScrollArea className="flex-1">
                  <div className="flex flex-col gap-4 mt-8">
                    <Button variant="ghost" className="justify-start" onClick={() => handleSelectView('home')}>
                      <Home className="h-5 w-5 mr-2" />
                      Home
                    </Button>
                    <Button variant="ghost" className="justify-start" onClick={() => handleSelectView('chat')}>
                      <MessageCircle className="h-5 w-5 mr-2" />
                      Conversas
                    </Button>
                    <Button variant="ghost" className="justify-start" onClick={() => handleSelectView('cameras')}>
                      <Camera className="h-5 w-5 mr-2" />
                      Câmeras
                    </Button>
                    <Button variant="ghost" className="justify-start" onClick={() => handleSelectView('utilities')}>
                      <Wrench className="h-5 w-5 mr-2" />
                      Utilidades
                    </Button>
                    <Button variant="ghost" className="justify-start" onClick={() => handleSelectView('map')}>
                      <MapPin className="h-5 w-5 mr-2" />
                      Mapa
                    </Button>
                    <Button variant="ghost" className="justify-start" onClick={() => handleSelectView('profile')}>
                      <UserRound className="h-5 w-5 mr-2" />
                      Meu Perfil
                    </Button>
                    <Button variant="ghost" className="justify-start" onClick={() => handleSelectView('reports')}>
                      <ClipboardList className="h-5 w-5 mr-2" />
                      Relatórios
                    </Button>
                    <Button variant="ghost" className="justify-start" onClick={() => handleSelectView('police')}>
                      <ShieldAlert className="h-5 w-5 mr-2" />
                      Polícia
                    </Button>
                    <Button variant="ghost" className="justify-start" onClick={() => handleSelectView('ambulance')}>
                      <Ambulance className="h-5 w-5 mr-2" />
                      Ambulância
                    </Button>
                    <Button variant="ghost" className="justify-start text-destructive hover:text-destructive" onClick={handleLogout}>
                      <LogOut className="h-5 w-5 mr-2" />
                      Sair
                    </Button>
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {activeView === 'home' && (
          <DashboardHome
            onSOSAlert={handleSOSAlert}
            onSelectView={handleSelectView}
            onOpenProfileEdit={() => setIsProfileModalOpen(true)}
            onEmergencyContact={(type) => {
              if (type === 'police') {
                toast({ title: "🚨 Contato com a Polícia", description: "Chamando a polícia...", variant: "destructive" });
              } else if (type === 'ambulance') {
                toast({ title: "🚑 Contato com a Ambulância", description: "Chamando a ambulância...", variant: "destructive" });
              }
            }}
            onHelpAndReports={() => handleSelectView('reports')} // Updated to navigate to reports
          />
        )}

        {activeView === 'chat' && (
          <ChatInterface />
        )}

        {activeView === 'cameras' && (
          <CameraList onCameraSelect={handleCameraSelect} />
        )}

        {activeView === 'map' && (
          <Map />
        )}

        {activeView === 'utilities' && (
          <UtilitiesList />
        )}

        {activeView === 'reports' && (
          <UserReports />
        )}
      </div>
    </div>
  );
};

export default Dashboard;