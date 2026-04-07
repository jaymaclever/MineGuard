import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Users, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface LoginProps {
  onLogin: (user: any) => void;
  publicSettings: any;
}

const Login: React.FC<LoginProps> = ({ onLogin, publicSettings }) => {
  const [numero, setNumero] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero_mecanografico: numero, password }),
        credentials: 'include',
      });

      const data = await res.json();
      if (data.status === 'success') {
        onLogin(data.user);
        toast.success(`Bem-vindo, ${data.user.nome}`);
      } else {
        toast.error(data.message || 'Credenciais incorretas');
      }
    } catch (err) {
      console.error('Erro na requisição de login:', err);
      toast.error('Erro de conexão: o servidor pode estar offline ou inacessível');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card w-full max-w-md space-y-8 p-8"
      >
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-2xl shadow-primary/20">
            <Shield size={32} className="text-primary-foreground" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-[var(--text-main)] uppercase">{publicSettings.app_name}</h1>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.3em] text-[var(--text-muted)]">{publicSettings.app_slogan}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Nº Mecanográfico</label>
            <div className="relative group">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] transition-colors group-focus-within:text-primary" size={18} />
              <input
                type="text"
                required
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Ex: superadmin"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] py-3 pl-10 pr-4 text-sm text-[var(--text-main)] outline-none transition-all focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Senha de Acesso</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] transition-colors group-focus-within:text-primary" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] py-3 pl-10 pr-4 text-sm text-[var(--text-main)] outline-none transition-all focus:border-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary py-4 text-xs font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Autenticando...' : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="pt-4 text-center">
          <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--text-muted)]">Acesso restrito a pessoal autorizado</p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
