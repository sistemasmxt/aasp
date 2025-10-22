import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Mail, Lock, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import logo from "@/img/logo.png";
import { z } from "zod";

// Schema de validação para login de admin
const adminLoginSchema = z.object({
  email: z.string().trim().email({
    message: "E-mail inválido"
  }).max(255, {
    message: "E-mail muito longo"
  }),
  password: z.string().min(8, {
    message: "Senha deve ter no mínimo 8 caracteres"
  })
});

const AdminLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Verificar se usuário já está logado como admin
    checkAdminSession();
  }, []); // Remove navigate from dependencies to prevent re-runs

  const checkAdminSession = () => {
    const adminLoggedIn = sessionStorage.getItem('adminLoggedIn') === 'true';
    if (adminLoggedIn) {
      setTimeout(() => {
        navigate("/admin", { replace: true });
      }, 100);
    }
    setIsLoading(false);
  };

  const handleAdminLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const rawData = {
      email: formData.get("email") as string,
      password: formData.get("password") as string
    };

    try {
      // Validar entrada
      const validatedData = adminLoginSchema.parse(rawData);

      // Credenciais hardcoded para admin
      const adminCredentials = {
        email: 'admin@aasp.com',
        password: 'admin123'
      };

      // Verificar credenciais
      if (validatedData.email === adminCredentials.email && validatedData.password === adminCredentials.password) {
        // Login bem-sucedido, salvar no sessionStorage
        sessionStorage.setItem('adminLoggedIn', 'true');

        toast({
          title: "Login administrativo realizado com sucesso!",
          description: "Bem-vindo ao Painel Central"
        });

        // Navigate to admin panel
        navigate("/admin", { replace: true });
      } else {
        throw new Error('Credenciais inválidas. Acesso negado.');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error instanceof z.ZodError) {
        toast({
          title: "Dados inválidos",
          description: error.errors[0].message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro ao fazer login administrativo",
          description: error.message || "Credenciais inválidas",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-glow">
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="AASP Logo" className="h-16 w-16 mb-4" />
          <h1 className="text-3xl font-bold text-foreground">Painel Central</h1>
          <p className="text-muted-foreground mt-2">Acesso Administrativo</p>
          <p className="text-sm text-muted-foreground mt-1">Apenas para administradores autorizados</p>
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail Administrativo</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@aasp.com"
                className="pl-10"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                className="pl-10"
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Verificando credenciais..." : "Acessar Painel Central"}
          </Button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="text-sm">
            ← Voltar ao Dashboard
          </Button>
          <p className="text-xs text-muted-foreground">
            Acesso restrito a administradores do sistema
          </p>
        </div>
      </Card>
    </div>
  );
};

export default AdminLogin;
