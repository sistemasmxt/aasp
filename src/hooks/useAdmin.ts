import { useEffect, useState } from 'react';

export const useAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = () => {
      // Verificar se admin está logado via sessionStorage
      const adminLoggedIn = sessionStorage.getItem('adminLoggedIn') === 'true';

      console.log('Admin check via sessionStorage:', adminLoggedIn);

      setIsAdmin(adminLoggedIn);
      setLoading(false);
    };

    checkAdminStatus();
  }, []);

  return { isAdmin, loading };
};
