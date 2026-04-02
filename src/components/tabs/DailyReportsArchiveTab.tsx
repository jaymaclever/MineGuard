import React from 'react';
import { motion } from 'motion/react';
import { FileText, Clock, Plus, ChevronRight } from 'lucide-react';
import { Card } from '../ui/LayoutComponents';
import { toast } from 'sonner';

interface DailyReportArchive {
  name: string;
  date: string;
  url: string;
}

interface DailyReportsArchiveTabProps {
  dailyReports: DailyReportArchive[];
  onGenerateNow: () => Promise<void>;
}

export const DailyReportsArchiveTab: React.FC<DailyReportsArchiveTabProps> = ({ 
  dailyReports, 
  onGenerateNow 
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tighter uppercase">Relatórios Diários</h2>
          <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Resumos consolidados para auditoria externa</p>
        </div>
        <button 
          onClick={onGenerateNow}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-black text-[10px] px-5 py-2.5 rounded-lg transition-all uppercase tracking-widest border border-zinc-700/50"
        >
          <Plus size={16} />
          Gerar Agora
        </button>
      </div>

      {dailyReports.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {dailyReports.map((report) => (
            <Card key={report.name} className="group hover:border-primary/30 transition-all bg-zinc-900/20">
              <div className="p-3 bg-zinc-800/50 rounded-lg w-fit mb-4 text-zinc-400 group-hover:text-primary transition-colors">
                <FileText size={24} />
              </div>
              <h3 className="text-sm font-bold text-zinc-200 truncate uppercase tracking-tight">{report.name}</h3>
              <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1 font-bold">
                <Clock size={10} /> {report.date}
              </p>
              <a 
                href={report.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-4 w-full flex items-center justify-center gap-2 py-2 bg-zinc-800 hover:bg-primary hover:text-black text-zinc-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Visualizar
                <ChevronRight size={14} />
              </a>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-20 bg-zinc-900/10 border-dashed border-zinc-800">
          <FileText size={48} className="mx-auto mb-4 opacity-10 text-zinc-500" />
          <p className="font-black uppercase tracking-[0.2em] text-[10px] text-zinc-600">Nenhum relatório gerado ainda</p>
          <p className="text-[9px] text-zinc-700 mt-2 uppercase font-bold">Clique em "Gerar Agora" para iniciar o processamento</p>
        </Card>
      )}
    </motion.div>
  );
};
