
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userType, setUserType] = useState<'admin' | 'superadmin' | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setLoading(false);
        setIsAuthenticated(false);
        return;
      }

      try {
        // First check from localStorage (for immediate response)
        const storedUserType = localStorage.getItem('userType') as 'admin' | 'superadmin' | null;
        
        // Also try to get from database
        const { data: userData, error } = await supabase
          .from('users')
          .select('tipo_usuario, email')
          .eq('auth_id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching user type:', error);
          // Fall back to stored value if database query fails
          if (storedUserType) {
            setUserType(storedUserType);
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
          setLoading(false);
          return;
        }

        // Special case for superadmin
        if (userData?.email === 'glivan.santos090420@gmail.com' || 
            userData?.tipo_usuario === 'superadmin' || 
            storedUserType === 'superadmin') {
          setUserType('superadmin');
          localStorage.setItem('userType', 'superadmin');
          
          // Redirect to superadmin dashboard if not already there
          if (!window.location.pathname.startsWith('/superadmin')) {
            navigate('/superadmin/dashboard');
          }
        } else {
          const tipo = userData?.tipo_usuario as 'admin' | 'superadmin' || 'admin';
          setUserType(tipo);
          localStorage.setItem('userType', tipo);
          
          // Redirect based on user type
          if (tipo === 'admin' && !window.location.pathname.startsWith('/admin')) {
            navigate('/admin/dashboard');
          }
        }
        
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error in authentication check:', error);
        setIsAuthenticated(false);
      }

      setLoading(false);
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        checkAuth();
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setUserType(null);
        localStorage.removeItem('userType');
        navigate('/login');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  return { isAuthenticated, userType, loading };
};
