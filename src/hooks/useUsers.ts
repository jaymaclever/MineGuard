import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { User } from '../types';

export const useUsers = (currentUser: User | null) => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<{ nivel_hierarquico: string, peso: number }[]>([]);
  const [rolePermissions, setRolePermissions] = useState<{ permissao_nome: string, is_enabled: boolean }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!currentUser?.permissions?.manage_users) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/users', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  const fetchRoles = useCallback(async () => {
    if (!currentUser?.permissions?.manage_permissions) return;
    try {
      const res = await fetch('/api/roles', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRoles(data);
      }
    } catch (err) {
      console.error("Error fetching roles:", err);
    }
  }, [currentUser]);

  const fetchPermissions = useCallback(async (role: string) => {
    if (!currentUser?.permissions?.manage_permissions) return;
    try {
      const res = await fetch(`/api/permissions/${role}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setRolePermissions(data);
      }
    } catch (err) {
      console.error("Error fetching permissions:", err);
    }
  }, [currentUser]);

  const createUser = async (newUser: any) => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
        credentials: 'include'
      });
      if (res.ok) {
        toast.success("Agente criado com sucesso!");
        fetchUsers();
        return true;
      }
    } catch (err) {
      toast.error("Erro ao criar agente");
    }
    return false;
  };

  const deleteUser = async (id: number) => {
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        toast.info("Agente removido");
        fetchUsers();
      }
    } catch (err) {
      toast.error("Erro ao remover agente");
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  return {
    users,
    roles,
    rolePermissions,
    fetchPermissions,
    createUser,
    deleteUser,
    isLoading
  };
};
