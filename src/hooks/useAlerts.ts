import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { User, Notification } from '../types';

export const useAlerts = (currentUser: User | null) => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isBellShaking, setIsBellShaking] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error("Error fetching alerts:", err);
    }
  }, []);

  const addNotification = useCallback((title: string, message: string, type: 'report' | 'system' | 'alert' = 'system', reportId?: number) => {
    const newNotif: Notification = {
      id: Math.random().toString(36).substring(7),
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      type,
      reportId
    };
    setNotifications(prev => [newNotif, ...prev]);
    setIsBellShaking(true);
    setTimeout(() => setIsBellShaking(false), 1000);
  }, []);

  const createAlert = async (newAlert: any) => {
    if (!currentUser?.permissions?.create_alerts) return false;
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAlert),
        credentials: 'include'
      });
      if (res.ok) {
        toast.success("Alerta criado com sucesso!");
        return true;
      }
    } catch (err) {
      toast.error("Erro ao criar alerta");
    }
    return false;
  };

  const deleteAlert = async (id: number) => {
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        toast.info("Alerta removido");
        setAlerts(prev => prev.filter(a => a.id !== id));
      }
    } catch (err) {
      toast.error("Erro ao remover alerta");
    }
  };

  const updateAlert = async (id: number, updatedAlert: any) => {
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAlert),
        credentials: 'include'
      });
      if (res.ok) {
        toast.success("Alerta atualizado!");
        fetchAlerts();
        return true;
      }
    } catch (err) {
      toast.error("Erro ao atualizar alerta");
    }
    return false;
  };

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return {
    alerts,
    setAlerts,
    notifications,
    setNotifications,
    isBellShaking,
    addNotification,
    createAlert,
    updateAlert,
    deleteAlert
  };
};
