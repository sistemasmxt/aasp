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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/img/logo.png";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { mapErrorToUserMessage } from "@/lib/errorHandler";
import { ChatInterface } from "@/components/chat/ChatInterface";
import Map from "@/components/Map";
import CameraList from "@/components/cameras/CameraList";
import { ProfileEditModal } from "@/components/ProfileEditModal";
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

  // Protection is now handled by ProtectedRoute wrapper
  // This component only renders for authenticated users

  useEffect(() => {
    if (user) {
      // Load user profile
      supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()
        .then(({ data }) => setProfile(data));

      // Load recent alerts with user names
      supabase
        .from("emergency_alerts")
        .select(`
          *,
          profiles:user_id (
            full_name
          )
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(10)
        .then(({ data }) => {
          const alertsWithNames = data?.map(alert => ({
            ...alert,
            user_name: alert.profiles?.full_name || "Usuário"
          })) || [];
          setAlerts(alertsWithNames);
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
            // Fetch user name for the new alert
            const { data: userProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", payload.new.user_id)
              .single();

            const alertWithName = {
              ...payload.new,
              user_name: userProfile?.full_name || "Usuário"
            };

            setAlerts((prev) => [alertWithName, ...prev].slice(0, 10));
            toast({
              title: "⚠️ Novo Alerta de Emergência!",
              description: `${userProfile?.full_name || "Usuário"} ativou um alerta de ${payload.new.alert_type}`,
              variant: "destructive",
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, toast]);

  const [stats, setStats] = useState([
    { label: "Associados Ativos", value: "0", icon: Users, color: "text-primary" },
    { label: "Câmeras Ativas", value: "0", icon: Camera, color: "text-accent" },
    { label: "Alertas Hoje", value: alerts.length.toString(), icon: Bell, color: "text-warning" },
    { label: "Status Pagamento", value: "Em dia", icon: DollarSign, color: "text-success" },
  ]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [
          { count: usersCount },
          { data: cameras },
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('cameras').select('is_active'),
        ]);

        const activeCameras = cameras?.filter(c => c.is_active).length || 0;

        setStats([
          { label: "Associados Ativos", value: (usersCount || 0).toString(), icon: Users, color: "text-primary" },
          { label: "Câmeras Ativas", value: activeCameras.toString(), icon: Camera, color: "text-accent" },
          { label: "Alertas Hoje", value: alerts.length.toString(), icon: Bell, color: "text-warning" },
          { label: "Status Pagamento", value: "Em dia", icon: DollarSign, color: "text-success" },
        ]);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, [alerts.length]);

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

  // Loading state is now handled by ProtectedRoute wrapper

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
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
              <ProfileEditModal profile={profile} onProfileUpdate={setProfile} />
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

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Emergency SOS Button */}
        <div className="mb-8">
          <Button
            onClick={handleSOSAlert}
            size="lg"
            className="w-full md:w-auto bg-gradient-emergency hover:opacity-90 text-white font-bold text-lg py-6 px-8 shadow-glow"
          >
            <AlertCircle className="mr-2 h-6 w-6" />
            ALERTA SOS DE EMERGÊNCIA
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="p-6 hover:shadow-card transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                <stat.icon className={`h-10 w-10 ${stat.color}`} />
              </div>
            </Card>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="overview">
              <Home className="h-4 w-4 mr-2" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="chat">
              <MessageCircle className="h-4 w-4 mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="cameras">
              <Camera className="h-4 w-4 mr-2" />
              Câmeras
            </TabsTrigger>
            <TabsTrigger value="map">
              <MapPin className="h-4 w-4 mr-2" />
              Mapa
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Alertas Recentes
              </h2>
              <div className="space-y-4">
                {alerts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhum alerta ativo no momento
                  </p>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-start gap-3 p-4 rounded-lg bg-muted/50"
                    >
                      <AlertCircle className="h-5 w-5 mt-0.5 text-emergency" />
                      <div className="flex-1">
                        <p className="text-sm text-foreground">
                          <strong>{alert.user_name}</strong> - {alert.alert_type === "robbery"
                            ? "Assalto"
                            : alert.alert_type === "assault"
                            ? "Agressão"
                            : "Emergência"}
                          {alert.message && ` - ${alert.message}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          📍 Lat: {alert.latitude.toFixed(6)}, Lon: {alert.longitude.toFixed(6)} • {new Date(alert.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Acesso Rápido
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-20 justify-start">
                  <Camera className="h-6 w-6 mr-3 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">Visualizar Câmeras</p>
                    <p className="text-xs text-muted-foreground">{stats[1].value} câmeras disponíveis</p>
                  </div>
                </Button>
                <Button variant="outline" className="h-20 justify-start">
                  <MessageCircle className="h-6 w-6 mr-3 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">Mensagens</p>
                    <p className="text-xs text-muted-foreground">Chat em tempo real</p>
                  </div>
                </Button>
                <Button variant="outline" className="h-20 justify-start">
                  <MapPin className="h-6 w-6 mr-3 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">Mapa da Região</p>
                    <p className="text-xs text-muted-foreground">Ver pontos de monitoramento</p>
                  </div>
                </Button>
                <Button variant="outline" className="h-20 justify-start">
                  <Users className="h-6 w-6 mr-3 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">Associados</p>
                    <p className="text-xs text-muted-foreground">{stats[0].value} membros</p>
                  </div>
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="chat" className="space-y-4">
            <div className="bg-accent/10 p-4 rounded-lg mb-4">
              <p className="text-sm font-medium">Chat Interface Loading Test - Se você ver isso, o componente está carregando!</p>
            </div>
            <ChatInterface />
          </TabsContent>

          <TabsContent value="cameras" className="space-y-4">
            <CameraList onCameraSelect={() => {}} />
          </TabsContent>

          <TabsContent value="map" className="space-y-4">
            <Map />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
