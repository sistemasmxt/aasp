import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import logo from '@/img/logo.png';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [isUserApproved, setIsUserApproved] = useState<boolean | null>(null);
  const [checkingApproval, setCheckingApproval] = useState(true);

  useEffect(() => {
    const checkApproval = async () => {
      if (user && !requireAdmin) { // Only check approval for regular users
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('is_approved')
            .eq('id', user.id)
            .single();

          if (error) throw error;
          setIsUserApproved(profile?.is_approved || false);
        } catch (error) {
          console.error("Error checking user approval status:", error);
          setIsUserApproved(false); // Assume not approved on error
        } finally {
          setCheckingApproval(false);
        }
      } else if (!user && !authLoading) {
        setCheckingApproval(false); // No user, no approval to check
      } else if (requireAdmin && !adminLoading) {
        setCheckingApproval(false); // Admin route, approval handled by admin check
      }
    };

    checkApproval();
  }, [user, authLoading, requireAdmin, adminLoading]);

  console.log('ProtectedRoute check:', {
    user: !!user,
    authLoading,
    isAdmin,
    adminLoading,
    requireAdmin,
    isUserApproved,
    checkingApproval
  });

  // Show loading state while checking authentication or approval
  if (authLoading || (requireAdmin && adminLoading) || (!requireAdmin && checkingApproval)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="text-center">
          <img src={logo} alt="AASP Logo" className="h-20 w-20 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">
            Verificando autenticação e permissões...
          </p>
        </div>
      </div>
    );
  }

  // For admin routes, only check admin status
  if (requireAdmin) {
    if (!isAdmin) {
      console.log('Admin required but user is not admin, redirecting to /admin-login');
      return <Navigate to="/admin-login" replace />;
    }
  } else {
    // For regular routes, check user authentication and approval
    if (!user) {
      console.log('No user, redirecting to /auth');
      return <Navigate to="/auth" replace />;
    }
    if (isUserApproved === false) {
      console.log('User not approved, redirecting to /initial-payment');
      return <Navigate to="/initial-payment" replace />;
    }
  }

  // Render protected content
  console.log('Access granted, rendering protected content');
  return <>{children}</>;
}