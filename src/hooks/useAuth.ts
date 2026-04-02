import { useState, useEffect } from 'react';
import { User } from '../types';
import { toast } from 'sonner';
import i18n from '../i18n';

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [publicSettings, setPublicSettings] = useState<any>({
    app_name: 'MINEGUARD',
    app_slogan: 'Security Operating System',
    app_theme_mode: 'dark',
    app_theme_palette: 'orange',
    app_layout: 'default'
  });

  const fetchPublicSettings = async () => {
    try {
      const res = await fetch('/api/public/settings');
      if (res.ok) {
        const data = await res.json();
        setPublicSettings(data);
        applyTheme(data);
      }
    } catch (err) {
      console.error("Failed to fetch public settings:", err);
    }
  };

  const applyTheme = (settings: any) => {
    const root = document.documentElement;
    if (settings.app_theme_mode === 'light') root.classList.add('light');
    else root.classList.remove('light');
    
    const palettes = ['theme-orange', 'theme-blue', 'theme-green', 'theme-red', 'theme-purple'];
    palettes.forEach(p => root.classList.remove(p));
    root.classList.add(`theme-${settings.app_theme_palette || 'orange'}`);
  };

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/me', { credentials: 'include' });
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
        if (user.preferred_language) {
          i18n.changeLanguage(user.preferred_language);
        }
      }
    } catch (err) {
      console.error("Auth check failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
      setCurrentUser(null);
      toast.success("Sessão encerrada");
      window.location.reload();
    } catch (err) {
      toast.error("Erro ao sair");
    }
  };

  useEffect(() => {
    fetchPublicSettings();
    checkAuth();
  }, []);

  return {
    currentUser,
    setCurrentUser,
    isLoading,
    publicSettings,
    logout,
    checkAuth
  };
};
