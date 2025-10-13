import { useEffect, useState } from 'react';
import { supabase } from '../services/api/supabaseClient';
import { useAuth } from './useAuth';

export const useModuleAccessSync = () => {
  const { user, refreshUser } = useAuth();
  const [hasPermissionUpdate, setHasPermissionUpdate] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`user_module_access:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_module_access',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('🔔 [PERMISSION_UPDATE] Your permissions have been updated:', payload);
          setHasPermissionUpdate(true);

          await refreshUser();

          setTimeout(() => {
            setHasPermissionUpdate(false);
          }, 5000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refreshUser]);

  return { hasPermissionUpdate };
};
