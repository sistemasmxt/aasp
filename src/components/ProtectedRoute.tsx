import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import logo from '@/img/logo.png';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();

  console.log('ProtectedRoute check:', {
    user: !!user,
    authLoading,
    isAdmin,
    adminLoading,
    requireAdmin
  });

  // Show loading state while checking authentication
  if (authLoading || (requireAdmin && adminLoading)) {
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

  // For admin routes, only check admin status (independent of user auth)
  if (requireAdmin) {
    if (!isAdmin) {
      console.log('Admin required but user is not admin, redirecting to /admin-login');
      return <Navigate to="/admin-login" replace />;
    }
  } else {
    // For regular routes, check user authentication
    if (!user) {
      console.log('No user, redirecting to /auth');
      return <Navigate to="/auth" replace />;
    }
  }

  // Render protected content
  console.log('Access granted, rendering protected content');
  return <>{children}</>;
}
