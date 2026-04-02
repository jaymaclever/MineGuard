import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { User } from '../types';

export const useSync = (currentUser: User | null) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineDraft, setOfflineDraft] = useState<any>(null);
  const [serverVersion, setServerVersion] = useState<any>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      if (!currentUser) return;
      
      const pendingKey = `mg_pending_sync_${currentUser.id}`;
      const raw = localStorage.getItem(pendingKey);
      
      if (raw) {
        try {
          const draft = JSON.parse(raw);
          setOfflineDraft(draft);
          
          if (draft.reportId) {
            const res = await fetch(`/api/reports/${draft.reportId}`, { credentials: 'include' });
            if (res.ok) {
              const data = await res.json();
              setServerVersion(data.report);
            }
          }
          setShowSyncModal(true);
        } catch (err) {
          console.error("Error parsing offline draft:", err);
        }
      } else {
        toast.success('Ligação restabelecida — dados sincronizados', { icon: '✅' });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Sem ligação ao servidor — Modo Offline ativo', { icon: '⚠️' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentUser]);

  const savePendingSync = (data: any, type: 'NEW' | 'EDIT') => {
    if (!currentUser) return;
    const pendingKey = `mg_pending_sync_${currentUser.id}`;
    localStorage.setItem(pendingKey, JSON.stringify({ 
      ...data, 
      syncType: type, 
      savedAt: new Date().toISOString() 
    }));
  };

  const clearOfflineDraft = () => {
    if (!currentUser) return;
    localStorage.removeItem(`mg_pending_sync_${currentUser.id}`);
    setOfflineDraft(null);
    setServerVersion(null);
    setShowSyncModal(false);
  };

  return {
    isOnline,
    offlineDraft,
    serverVersion,
    showSyncModal,
    setShowSyncModal,
    savePendingSync,
    clearOfflineDraft
  };
};
