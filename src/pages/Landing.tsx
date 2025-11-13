import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, Camera, Users, Bell, MapPin, MessageCircle, Heart, EyeOff, CloudRain } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-security.jpg";
import logo from "@/img/logo.png";
import logoApple from "/img/logo-apple.png";
import logoPlay from "/img/logo-play.png";
const Landing = () => {
  const navigate = useNavigate();
  const features = [{
    icon: Shield,
    title: "Segurança 24/7",
    description: "Monitoramento contínuo e alertas em tempo real para sua tranquilidade"
  }, {
    icon: Camera,
    title: "Câmeras IP",
    description: "Visualize câmeras próximas e mantenha-se informado sobre sua região"
  }, {
    icon: Users,
    title: "Rede de Associados",
    description: "Conecte-se com vizinhos e fortaleça a segurança coletiva"
  }, {
    icon: Bell,
    title: "Alertas SOS",
    description: "Sistema de emergência com notificações instantâneas para toda rede"
  }, {
    icon: MessageCircle,
    title: "Chat em Tempo Real",
    description: "Comunicação direta com associados próximos"
  }, {
    icon: MapPin,
    title: "Geolocalização",
    description: "Mapa interativo mostrando pontos de monitoramento"
  }, {
    icon: Heart,
    title: "SOS Pet",
    description: "Sistema dedicado para localizar pets desaparecidos ou ajudar animais abandonados na comunidade"
  }, {
    icon: EyeOff,
    title: "Denúncias Anônimas",
    description: "Plataforma segura para denúncias anônimas de crimes e irregularidades, protegendo sua identidade"
  }, {
    icon: CloudRain,
    title: "Situação de Emergência",
    description: "Alertas instantâneos sobre fenômenos naturais e situações de emergência que afetam a comunidade"
  }];
  const plans = [{
    name: "Premium",
    price: "R$ 120,00",
    period: "/mês",
    featured: true,
    features: ["Acesso ao chat da comunidade", "Alertas de emergência", "Câmeras particulares ilimitadas", "Prioridade em alertas", "Suporte 24/7", "Histórico de eventos 90 dias", "SOS Pet", "Denúncias Anônimas", "Situação de Emergência", "Até 4 pessoas no plano"]
  }];
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="AASP Logo" className="h-10 w-10" />
              <span className="text-2xl font-bold text-foreground">AASP</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-foreground/70 hover:text-foreground transition-colors">Recursos</a>
              <a href="#plans" className="text-foreground/70 hover:text-foreground transition-colors">Planos</a>
              <a href="#contact" className="text-foreground/70 hover:text-foreground transition-colors">Contato</a>
            </div>
            <Button onClick={() => navigate("/auth")} variant="default">
              Entrar
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-90"></div>
        <div className="absolute inset-0">
          <img src={heroImage} alt="Security" className="w-full h-full object-cover opacity-20" />
        </div>
        <div className="relative container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Segurança Inteligente para sua Comunidade
            </h1>
            <p className="text-xl text-white/90 mb-8">
              Sistema integrado de monitoramento, alertas e comunicação para associados. 
              Proteja o que importa com tecnologia de ponta.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => navigate("/auth")} size="lg" className="bg-white text-primary hover:bg-white/90">
                Começar Agora
              </Button>
              <Button onClick={() => navigate("/auth")} size="lg" variant="outline" className="border-white bg-gray-50 text-orange-600">
                Saiba Mais
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Recursos Completos
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Tudo que você precisa para manter sua comunidade segura e conectada
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => <Card key={index} className="p-6 hover:shadow-glow transition-all duration-300">
                <feature.icon className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section id="plans" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Planos e Preços
            </h2>
            <p className="text-muted-foreground text-lg">
              Escolha o plano ideal para suas necessidades
            </p>
          </div>
          <div className="grid md:grid-cols-1 gap-8 max-w-md mx-auto">
            {plans.map((plan, index) => <Card key={index} className={`p-8 ${plan.featured ? 'border-primary border-2 shadow-glow' : ''} hover:scale-105 transition-transform duration-300`}>
                {plan.featured && <div className="bg-primary text-primary-foreground text-sm font-semibold px-3 py-1 rounded-full w-fit mb-4">
                    Mais Popular
                  </div>}
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  {plan.name}
                </h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">
                    {plan.period}
                  </span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => <li key={i} className="flex items-start gap-2 text-foreground/80">
                      <Shield className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>)}
                </ul>
                <Button onClick={() => navigate("/auth")} variant={plan.featured ? "default" : "outline"} className="w-full">
                  Assinar Agora
                </Button>
              </Card>)}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Pronto para aumentar a segurança da sua comunidade?
          </h2>
          <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
            Junte-se a milhares de associados que já confiam na AASP
          </p>
          <Button onClick={() => navigate("/auth")} size="lg" className="bg-white text-primary hover:bg-white/90">
            Começar Grátis
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-card border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src={logo} alt="AASP Logo" className="h-8 w-8" />
                <span className="text-xl font-bold text-foreground">AASP</span>
              </div>
              <p className="text-muted-foreground">
                Segurança eletrônica inteligente para comunidades
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Produto</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Recursos</a></li>
                <li><a href="#plans" className="hover:text-foreground transition-colors">Planos</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Documentação</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Empresa</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Sobre</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Carreiras</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Suporte</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Centro de Ajuda</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contato</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Status</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-12 pt-8">
            <div className="flex flex-col items-center gap-4">
              <p className="text-muted-foreground text-center">
                Disponível para dispositivos iOS e Android
              </p>
              <div className="flex gap-4">
                <img src={logoApple} alt="Download na App Store" className="h-10 w-auto" />
                <img src={logoPlay} alt="Download no Google Play" className="h-10 w-auto" />
              </div>
            </div>
            <div className="text-center text-muted-foreground mt-8">
              <p>&copy; 2025 AASP - Todos os direitos reservados | www.aasp.app.br</p>
            </div>
          </div>
        </div>
      </footer>
    </div>;
};
export default Landing;