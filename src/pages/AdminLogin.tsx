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
import { supabase } from "@/integrations/supabase/client";
import { mapErrorToUserMessage } from "@/lib/errorHandler";

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
    checkAdminSession();
  }, []);

  const checkAdminSession = async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();

        if (roles && !rolesError) {
          sessionStorage.setItem('adminLoggedIn', 'true');
          navigate("/admin", { replace: true });
          return;
        }
      }
    }
    sessionStorage.removeItem('adminLoggedIn'); // Ensure it's cleared if not admin
    setIsLoading(false);
  };

  const handleAdminLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const rawData = {
      email: formData.get("email") as string,
      password: formData.get("password") as string
    };

    try {
      const validatedData = adminLoginSchema.parse(rawData);

      // Attempt to sign in with Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password
      });

      if (authError) {
        // If user not found, try to create them (for the hardcoded admin)
        if (authError.message.includes('invalid login credentials') || authError.message.includes('user not found')) {
          // This is a special case for the initial hardcoded admin setup
          if (validatedData.email === 'admin@aasp.app.br' && validatedData.password === 'admin123') {
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: validatedData.email,
              password: validatedData.password,
              options: {
                data: {
                  full_name: 'Administrador',
                  phone: '', // Or a default phone number
                }
              }
            });

            if (signUpError) throw signUpError;

            if (signUpData.user) {
              const newAdminUserId = signUpData.user.id;

              // Explicitly update profile for the admin user
              const { error: profileUpdateError } = await supabase
                .from('profiles')
                .update({
                  is_approved: true,
                  initial_payment_status: 'paid',
                  full_name: 'Administrador', // Ensure full_name is set
                  phone: '', // Ensure phone is set
                })
                .eq('id', newAdminUserId);

              if (profileUpdateError) {
                console.error('Error updating admin profile after signup:', profileUpdateError);
                throw profileUpdateError;
              }

              // Explicitly add admin role
              const { error: roleInsertError } = await supabase
                .from('user_roles')
                .insert({ user_id: newAdminUserId, role: 'admin' });

              if (roleInsertError) {
                console.error('Error inserting admin role after signup:', roleInsertError);
                throw roleInsertError;
              }

              // Sign in the newly created admin
              const { error: signInAfterSignUpError } = await supabase.auth.signInWithPassword({
                email: validatedData.email,
                password: validatedData.password
              });
              if (signInAfterSignUpError) throw signInAfterSignUpError;

              sessionStorage.setItem('adminLoggedIn', 'true');
              toast({
                title: "Login administrativo realizado com sucesso!",
                description: "Bem-vindo ao Painel Central"
              });
              navigate("/admin", { replace: true });
              return;
            }
          }
        }
        throw authError;
      }

      if (data.user) {
        // Check if the logged-in user has the 'admin' role
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .eq('role', 'admin')
          .single();

        if (roles && !rolesError) {
          sessionStorage.setItem('adminLoggedIn', 'true');
          toast({
            title: "Login administrativo realizado com sucesso!",
            description: "Bem-vindo ao Painel Central"
          });
          navigate("/admin", { replace: true });
        } else {
          // If authenticated but not an admin role
          await supabase.auth.signOut(); // Log out non-admin user
          throw new Error('Acesso negado. Você não tem permissões de administrador.');
        }
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
          description: mapErrorToUserMessage(error),
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
                placeholder="admin@aasp.app.br"
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