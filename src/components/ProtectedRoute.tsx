import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import logo from '@/assets/logo.png';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="text-center">
          <img src={logo} alt="AASP Logo" className="h-20 w-20 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }
  
  // Redirect to auth if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  // Render protected content
  return <>{children}</>;
}
