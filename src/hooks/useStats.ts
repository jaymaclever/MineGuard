import { useState, useEffect, useCallback } from 'react';
import { Stats, User } from '../types';

export const useStats = (currentUser: User | null) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!currentUser || currentUser.permissions?.view_dashboard !== true) return;
    
    setIsLoading(true);
    try {
      const res = await fetch('/api/stats', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    fetchStats
  };
};
