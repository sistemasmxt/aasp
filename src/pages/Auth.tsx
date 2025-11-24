import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Lock, User, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/img/logo.png";
import { z } from "zod";
import { mapErrorToUserMessage } from "@/lib/errorHandler";

// Validation schemas
const loginSchema = z.object({
  email: z.string().trim().email({
    message: "E-mail inválido"
  }).max(255, {
    message: "E-mail muito longo"
  }),
  password: z.string().min(8, {
    message: "Senha deve ter no mínimo 8 caracteres"
  })
});
const signupSchema = z.object({
  email: z.string().trim().email({
    message: "E-mail inválido"
  }).max(255, {
    message: "E-mail muito longo"
  }),
  password: z.string().min(8, {
    message: "Senha deve ter no mínimo 8 caracteres"
  }).regex(/[A-Z]/, {
    message: "Senha deve conter pelo menos uma letra maiúscula"
  }).regex(/[a-z]/, {
    message: "Senha deve conter pelo menos uma letra minúscula"
  }).regex(/[0-9]/, {
    message: "Senha deve conter pelo menos um número"
  }).max(128, {
    message: "Senha muito longa"
  }),
  fullName: z.string().trim().min(3, {
    message: "Nome deve ter no mínimo 3 caracteres"
  }).max(100, {
    message: "Nome muito longo"
  }).regex(/^[a-zA-ZÀ-ÿ\s]+$/, {
    message: "Nome deve conter apenas letras"
  }),
  phone: z.string().trim().regex(/^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/, {
    message: "Formato de telefone inválido. Use: (11) 98888-8888"
  })
});
const Auth = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      if (session) {
        // If user is logged in, check if they are approved
        supabase.from('profiles').select('is_approved').eq('id', session.user.id).single()
          .then(({ data, error }) => {
            if (error) {
              console.error("Error checking approval status:", error);
              navigate("/initial-payment", { replace: true }); // Redirect to payment if status check fails
              return;
            }
            if (data?.is_approved) {
              navigate("/dashboard", { replace: true });
            } else {
              navigate("/initial-payment", { replace: true });
            }
          })
          .catch(err => {
            console.error("Unexpected error during approval check:", err);
            navigate("/initial-payment", { replace: true });
          });
      }
    });
  }, [navigate]);
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const rawData = {
      email: formData.get("email") as string,
      password: formData.get("password") as string
    };
    try {
      // Validate input
      const validatedData = loginSchema.parse(rawData);
      const {
        error
      } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password
      });
      if (error) throw error;
      toast({
        title: "Login realizado com sucesso!",
        description: "Verificando status de adesão..."
      });
      navigate("/initial-payment", { replace: true }); // Redirect to initial payment page after login
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Dados inválidos",
          description: error.errors[0].message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro ao fazer login",
          description: mapErrorToUserMessage(error),
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const rawData = {
      email: formData.get("signup-email") as string,
      password: formData.get("signup-password") as string,
      fullName: formData.get("signup-name") as string,
      phone: formData.get("signup-phone") as string
    };
    try {
      // Validate input
      const validatedData = signupSchema.parse(rawData);
      const {
        error
      } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: validatedData.fullName,
            phone: validatedData.phone
          }
        }
      });
      if (error) throw error;
      toast({
        title: "Conta criada com sucesso!",
        description: "Agora, realize o pagamento de adesão para ativar seu acesso."
      });
      navigate("/initial-payment", { replace: true }); // Redirect to initial payment page after signup
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Dados inválidos",
          description: error.errors[0].message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro ao criar conta",
          description: mapErrorToUserMessage(error),
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-glow">
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="AASP Logo" className="h-16 w-16 mb-4" />
          <h1 className="text-3xl font-bold text-foreground">AASP</h1>
          <p className="text-muted-foreground mt-2">Apoio a Segurança Pública</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Cadastrar</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="email" name="email" type="email" placeholder="seu@email.com" className="pl-10" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="password" name="password" type="password" placeholder="••••••••" className="pl-10" required />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <a href="#" className="text-sm text-primary hover:underline">
                  Esqueceu a senha?
                </a>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">ou</span>
                </div>
              </div>

              <Button type="button" variant="outline" className="w-full">
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continuar com Google
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="signup-name" name="signup-name" type="text" placeholder="Seu nome completo" className="pl-10" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-phone">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="signup-phone" name="signup-phone" type="tel" placeholder="(11) 98888-8888" className="pl-10" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="signup-email" name="signup-email" type="email" placeholder="seu@email.com" className="pl-10" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="signup-password" name="signup-password" type="password" placeholder="Mínimo 8 caracteres" className="pl-10" required />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Criando conta..." : "Criar Conta"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Ao criar uma conta, você concorda com nossos{" "}
                <a href="#" className="text-primary hover:underline">
                  Termos de Uso
                </a>
              </p>
            </form>
          </TabsContent>
        </Tabs>

        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={() => navigate("/")} className="text-sm">
            ← Voltar para home
          </Button>
        </div>
      </Card>
    </div>;
};
export default Auth;