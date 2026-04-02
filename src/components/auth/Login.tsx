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
    console.log("Iniciando tentativa de login para:", numero);
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero_mecanografico: numero, password }),
        credentials: 'include'
      });
      
      console.log("Status da resposta do servidor:", res.status);
      
      const data = await res.json();
      console.log("Dados recebidos do servidor:", data);
      
      if (data.status === 'success') {
        onLogin(data.user);
        toast.success(`Bem-vindo, ${data.user.nome}`);
      } else {
        toast.error(data.message || "Credenciais incorretas");
      }
    } catch (err) {
      console.error("Erro crítico na requisição de login:", err);
      toast.error("Erro de conexão: O servidor pode estar offline ou inacessível");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 bg-[var(--bg-card)] p-8 rounded-2xl border border-[var(--border)] backdrop-blur-xl"
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-primary/20">
            <Shield size={32} className="text-primary-foreground" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-[var(--text-main)] uppercase">{publicSettings.app_name}</h1>
          <p className="text-[var(--text-muted)] text-xs font-bold tracking-[0.3em] mt-2 uppercase">{publicSettings.app_slogan}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nº Mecanográfico</label>
            <div className="relative group">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-primary transition-colors" size={18} />
              <input 
                type="text" 
                required
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Ex: superadmin"
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 focus:bg-zinc-900 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Senha de Acesso</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-primary transition-colors" size={18} />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 focus:bg-zinc-900 transition-all"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary hover:opacity-90 text-primary-foreground font-black py-4 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-primary/20 uppercase tracking-widest text-xs disabled:opacity-50"
          >
            {loading ? "Autenticando..." : "Entrar no Sistema"}
          </button>
        </form>

        <div className="text-center pt-4">
          <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest">Acesso restrito a pessoal autorizado</p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
