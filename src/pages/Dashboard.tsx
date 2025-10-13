import { useState } from "react";
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
import logo from "@/assets/logo.png";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const stats = [
    { label: "Associados Ativos", value: "1,247", icon: Users, color: "text-primary" },
    { label: "Câmeras Ativas", value: "84", icon: Camera, color: "text-accent" },
    { label: "Alertas Hoje", value: "3", icon: Bell, color: "text-warning" },
    { label: "Status Pagamento", value: "Em dia", icon: DollarSign, color: "text-success" },
  ];

  const recentAlerts = [
    { id: 1, type: "info", message: "Nova câmera instalada na Rua das Flores", time: "10 min atrás" },
    { id: 2, type: "warning", message: "Movimento suspeito detectado", time: "2h atrás" },
    { id: 3, type: "emergency", message: "Alerta SOS - Rua Principal", time: "5h atrás" },
  ];

  const handleLogout = () => {
    navigate("/");
  };

  const handleSOSAlert = () => {
    // Funcionalidade será implementada com backend
    alert("Alerta SOS enviado! (Funcionalidade completa requer backend)");
  };

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
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3 ml-4">
                <Avatar>
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary text-primary-foreground">U</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">Usuário Demo</p>
                  <p className="text-xs text-muted-foreground">usuario@aasp.app.br</p>
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
                {recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 p-4 rounded-lg bg-muted/50"
                  >
                    <AlertCircle
                      className={`h-5 w-5 mt-0.5 ${
                        alert.type === "emergency"
                          ? "text-emergency"
                          : alert.type === "warning"
                          ? "text-warning"
                          : "text-primary"
                      }`}
                    />
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {alert.time}
                      </p>
                    </div>
                  </div>
                ))}
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
                    <p className="text-xs text-muted-foreground">84 câmeras disponíveis</p>
                  </div>
                </Button>
                <Button variant="outline" className="h-20 justify-start">
                  <MessageCircle className="h-6 w-6 mr-3 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">Mensagens</p>
                    <p className="text-xs text-muted-foreground">5 não lidas</p>
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
                    <p className="text-xs text-muted-foreground">1,247 membros</p>
                  </div>
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="chat">
            <Card className="p-6">
              <div className="text-center py-12">
                <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Chat em Tempo Real
                </h3>
                <p className="text-muted-foreground mb-6">
                  Conecte ao Lovable Cloud para habilitar mensagens em tempo real
                </p>
                <Badge variant="outline">Em breve</Badge>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="cameras">
            <Card className="p-6">
              <div className="text-center py-12">
                <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Monitoramento de Câmeras
                </h3>
                <p className="text-muted-foreground mb-6">
                  Visualize e gerencie câmeras IP da sua região
                </p>
                <Badge variant="outline">Em breve</Badge>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="map">
            <Card className="p-6">
              <div className="text-center py-12">
                <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Mapa Interativo
                </h3>
                <p className="text-muted-foreground mb-6">
                  Visualize câmeras e pontos de interesse no mapa
                </p>
                <Badge variant="outline">Em breve</Badge>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
