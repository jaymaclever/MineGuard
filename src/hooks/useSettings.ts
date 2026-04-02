import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { User } from '../types';

export const useSettings = (currentUser: User | null) => {
  const [systemSettings, setSystemSettings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!currentUser?.permissions?.manage_settings) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/settings', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSystemSettings(data);
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  const updateSettings = async (settings: Array<{ key: string, value: any, description?: string }>) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
        credentials: 'include'
      });
      if (res.ok) {
        toast.success("Configurações atualizadas!");
        fetchSettings();
        return true;
      }
    } catch (err) {
      toast.error("Erro ao salvar configurações");
    }
    return false;
  };

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    systemSettings,
    isLoading,
    updateSettings,
    fetchSettings
  };
};
