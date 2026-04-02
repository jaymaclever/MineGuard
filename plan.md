# Plano de Transição Industrial - MineGuard

## 🎯 Objetivo Central
1. **Modularização Total**: Reduzir o `App.tsx` de 1900+ linhas para menos de 500, eliminando blocos massivos de JSX.
2. **Arquitetura de Maestro**: Transformar o componente principal num orquestrador leve que delega o UI às abas modulares.
3. **Isolamento de Lógica**: Garantir que cada componente de UI use os seus próprios hooks de contexto, sem depender de "drilling" de props excessivo.

## ✅ O que foi feito hoje
1.  **Arquitetura de Hooks**: Criados os hooks `useAuth`, `useSync`, `useReports`, `useStats`, `useAlerts`, `useUsers` e `useSettings` em `src/hooks/`.
2.  **Componentização de Tabs**: Todas as abas principais (Dashboard, Ocorrências, Alertas, Usuários, Permissões, Configurações, Relatórios Diários) foram extraídas para `src/components/tabs/`.
3.  **Refatoração do App.tsx (Em curso)**: 
    *   A lógica de estado foi migrada para os hooks.
    *   Iniciada a injeção dos novos componentes no JSX principal.

## ⚠️ Estado Atual (Bloqueios)
O ficheiro `App.tsx` encontra-se atualmente **instável** devido a erros de limite de tokens durante as edições massivas:
- **Erros de Import**: O componente `Login` está a ser importado incorretamente como membro nomeado (`{ Login }`) em vez de export por defeito.
- **Duplicação de Lógica**: Existem blocos de hooks e estados duplicados entre as linhas 100 e 300.
- **Erro de Sintaxe**: Um parêntese/chaveta em falta por volta da linha 1900 está a quebrar o build (causado por um `useCallback` truncado).

- **Instabilidade de JSX**: O ficheiro `App.tsx` sofre de "desalinhamento estrutural". A injeção massiva de hoje falhou ao fechar blocos de renderização, criando uma sobreposição de código entre o JSX antigo e o novo.

## 📺 Panorama da Limpeza do JSX
- [x] **Dashboard**: Extraído com sucesso.
- [x] **Relatórios (Ocorrências)**: Extraído (Geral e Pessoal).
- [x] **Relatórios Diários**: Extraído (Personal e Team).
- [ ] **Aba de Alertas**: **PENDENTE** (JSX ainda inline no App.tsx).
- [ ] **Aba de Gestão de Pessoal**: **PENDENTE** (JSX ainda inline no App.tsx).
- [ ] **Aba de Configurações**: **PENDENTE** (JSX ainda inline no App.tsx).
- [ ] **Modais**: **PENDENTE** (A lógica está em hooks, mas a chamada e o JSX de visualização ainda estão pesados no App.tsx).

## 🚀 Próximos Passos (Amanhã)
1.  **Estabilização Estrutural**: Limpar o `App.tsx`, eliminando duplicações e fixando os imports e a sintaxe final.
2.  **Injeção Final**: Substituir os blocos restantes de Alertas, Usuários e Configurações pelos componentes modulares.
3.  **Sincronização de Modais**: Garantir que os modais no rodapé do `App.tsx` comunicam corretamente com os novos hooks.

---

## 📝 Prompt para amanhã
> "Retoma o trabalho de modularização do MineGuard. O ficheiro `App.tsx` está com erros de sintaxe (parêntese em falta na linha 1933) e duplicação de lógica (blocos repetidos de hooks). 
> 
> 1. Limpa o `App.tsx` removendo as duplicações entre as linhas 100-400.
> 2. Fixa o import do `Login` (deve ser 'import Login from...').
> 3. Conclui a injeção das abas de Alertas, Usuários e Configurações.
> 4. Garante que todos os modais no final do ficheiro estão a usar as funções dos hooks (como `createAlert`, `createUser`).
> 
> Prioridade total: Deixar o app funcional e sem erros de linting."
