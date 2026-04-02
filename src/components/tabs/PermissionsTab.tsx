import React from 'react';
import { motion } from 'motion/react';
import { Shield, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card } from '../ui/LayoutComponents';
import { toast } from 'sonner';

interface PermissionsTabProps {
  roles: any[];
  rolePermissions: any[];
  fetchPermissions: (role: string) => void;
  selectedRoleForPerms: string;
  setSelectedRoleForPerms: (role: string) => void;
}

export const PermissionsTab: React.FC<PermissionsTabProps> = ({ 
  roles, 
  rolePermissions, 
  fetchPermissions, 
  selectedRoleForPerms, 
  setSelectedRoleForPerms 
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tighter uppercase">Perfis & Acessos</h2>
          <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Configuração de privilégios e hierarquia de comando</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
        <Card title="Níveis Hierárquicos">
          <div className="space-y-1">
            {roles.map((role) => (
              <button
                key={role.nivel_hierarquico}
                onClick={() => setSelectedRoleForPerms(role.nivel_hierarquico)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-lg text-xs font-bold transition-all uppercase tracking-widest text-left",
                  "hover:bg-zinc-800/50",
                  selectedRoleForPerms === role.nivel_hierarquico 
                    ? "border-l-2 border-primary bg-primary/5 text-primary" 
                    : "text-zinc-400"
                )}
              >
                <span>{role.nivel_hierarquico}</span>
                <span className="text-[10px] opacity-50 truncate">PESO {role.weight || role.peso}</span>
              </button>
            ))}
          </div>
          <div className="mt-6 p-4 bg-primary/5 border border-primary/10 rounded-lg">
            <div className="flex gap-3">
              <Shield size={16} className="text-primary shrink-0" />
              <p className="text-[10px] text-zinc-400 leading-relaxed uppercase font-bold tracking-tight">
                A hierarquia é baseada em <b>Peso Operacional</b>. Agentes só podem visualizar dados de subordinados com peso inferior.
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card title={`Matriz de Permissões (${selectedRoleForPerms})`}>
            <div className="space-y-3">
              {[
                { name: 'view_dashboard', label: 'Acesso ao Dashboard', desc: 'Visualização de estatísticas e gráficos.' },
                { name: 'view_reports', label: 'Visualizar Ocorrências', desc: 'Acesso ao log de registros operacionais.' },
                { name: 'create_reports', label: 'Registrar Ocorrências', desc: 'Permissão para enviar novos relatos.' },
                { name: 'conclude_reports', label: 'Finalizar Ocorrências', desc: 'Permissão para fechar/concluir ocorrências.' },
                { name: 'view_daily_reports', label: 'Visualizar Relatórios Diários', desc: 'Acesso aos relatórios consolidados do dia.' },
                { name: 'view_team_daily', label: 'Visualizar Dia da Equipe', desc: 'Ver relatórios consolidados de toda a equipe.' },
                { name: 'create_alerts', label: 'Criar Alertas', desc: 'Permissão para criar alertas para a equipe.' },
                { name: 'edit_own_alerts', label: 'Editar Alertas Próprios', desc: 'Editar e deletar alertas que você criou.' },
                { name: 'view_audit_logs', label: 'Auditoria de Logs', desc: 'Visualização de logs e histórico do sistema.' },
                { name: 'manage_users', label: 'Gestão de Usuários', desc: 'Permite criar, editar e remover agentes.' },
                { name: 'manage_permissions', label: 'Gestão de Permissões', desc: 'Configuração de privilégios e roles.' },
                { name: 'manage_settings', label: 'Configurações de Sistema', desc: 'Acesso às chaves de integração e sistema.' },
                { name: 'export_reports', label: 'Exportar Relatórios', desc: 'Permissão para exportar relatórios em diversos formatos.' },
                { name: 'view_personal_reports', label: 'Meus Relatórios', desc: 'Acesso aos seus relatórios pessoais.' },
                { name: 'view_personal_daily', label: 'Meu Dia', desc: 'Ver consolidado pessoal do dia.' },
              ].map((p) => {
                const isEnabled = rolePermissions.find(rp => rp.permissao_nome === p.name)?.is_enabled ?? false;
                return (
                  <div key={p.name} className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700/50 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-zinc-200 uppercase tracking-tight">{p.label}</p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">{p.desc}</p>
                    </div>
                    <button 
                      onClick={async () => {
                        const newEnabled = !isEnabled;
                        try {
                          await fetch(`/api/permissions/${selectedRoleForPerms}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ permissions: [{ name: p.name, enabled: newEnabled }] }),
                            credentials: 'include'
                          });
                          fetchPermissions(selectedRoleForPerms);
                          toast.success("Permissão atualizada");
                        } catch (err) {
                          toast.error("Erro ao atualizar permissão");
                        }
                      }}
                      className={cn(
                        "w-10 h-5 rounded-full relative transition-all duration-200",
                        isEnabled ? "bg-primary" : "bg-zinc-700"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-3 h-3 bg-black rounded-full transition-all duration-200",
                        isEnabled ? "right-1" : "left-1"
                      )} />
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};
