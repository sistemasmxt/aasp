import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  Wrench, // Changed from Tool to Wrench
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
import DashboardHome from "@/components/DashboardHome"; // Import the new component
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"; // Import Sheet components
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea
import UtilitiesList from "@/components/UtilitiesList"; // Import the new UtilitiesList component

type DashboardView = 'home' | 'chat' | 'cameras' | 'map' | 'utilities'; // Add 'utilities' to the type

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false); // State to control Sheet visibility
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
  const [alerts, setAlerts] = useState<{
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
  const [currentPage, setCurrentPage] = useState(1);
  const alertsPerPage = 5;
  const [activeView, setActiveView] = useState<DashboardView>('home');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<any>(null); // State to hold selected camera for viewer

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

            setAlerts(alertsWithNames);
          } else {
            setAlerts([]);
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

              setAlerts((prev) => {
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

      setAlerts((prev) => {
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

  const handleSelectView = (view: DashboardView | 'profile' | 'police' | 'ambulance' | 'reports' | 'utilities') => {
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
    } else if (view === 'reports') {
      toast({
        title: "📝 Relatórios e Ajuda",
        description: "Funcionalidade de relatórios e ajuda em desenvolvimento.",
      });
    } else {
      setActiveView(view as DashboardView); // Cast to DashboardView
    }
    setMenuOpen(false); // Close menu after selection
  };

  const handleCameraSelect = (camera: any) => {
    setSelectedCamera(camera);
    // Optionally, change view to a dedicated camera viewer if you create one
    // For now, we'll just log it or open a modal
    toast({
      title: "Câmera Selecionada",
      description: `Você selecionou a câmera: ${camera.name}`,
    });
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
    <div className="min-h-screen bg-background">
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
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {alerts.length > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {alerts.length}
                  </Badge>
                )}
              </Button>
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
                      <Wrench className="h-5 w-5 mr-2" /> {/* New menu item */}
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
                    <Button variant="ghost" className="justify-start" onClick={() => handleEmergencyContact('police')}>
                      <ShieldAlert className="h-5 w-5 mr-2" />
                      Polícia
                    </Button>
                    <Button variant="ghost" className="justify-start" onClick={() => handleEmergencyContact('ambulance')}>
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
            onHelpAndReports={() => {
              toast({ title: "📝 Relatórios e Ajuda", description: "Abrindo formulário de relatórios...", variant: "default" });
            }}
          />
        )}

        {activeView === 'chat' && user && (
          <ChatInterface
            currentUserId={user.id}
            recipientId={selectedChatUserId || ''} // You might need a way to select a recipient
            recipientProfile={null} // This will be loaded inside ChatInterface
          />
        )}

        {activeView === 'cameras' && (
          <CameraList onCameraSelect={handleCameraSelect} />
        )}

        {activeView === 'map' && (
          <Map />
        )}

        {activeView === 'utilities' && ( // New conditional rendering for UtilitiesList
          <UtilitiesList />
        )}
      </div>
    </div>
  );
};

export default Dashboard;