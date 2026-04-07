import { useState, useEffect, useCallback } from 'react';
import { Report, User, Categoria, Gravidade } from '../types';
import { toast } from 'sonner';
import { compressPhotoToJpeg } from '../lib/photoUpload';

export const useReports = (currentUser: User | null, isOnline: boolean, savePendingSync: (data: any, type: 'NEW' | 'EDIT') => void) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [personalReports, setPersonalReports] = useState<Report[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterAgent, setFilterAgent] = useState('');

  // Personal Reports Filters
  const [personalReportsStartDate, setPersonalReportsStartDate] = useState('');
  const [personalReportsEndDate, setPersonalReportsEndDate] = useState('');

  const fetchReports = useCallback(async () => {
    if (!currentUser || currentUser.permissions?.view_reports !== true) return;

    try {
      const queryParams = new URLSearchParams({
        role: currentUser.nivel_hierarquico,
        search: searchQuery,
        category: filterCategory,
        severity: filterSeverity,
        dateFrom: filterDateFrom,
        dateTo: filterDateTo,
        status: filterStatus,
        agent: filterAgent,
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      });

      const res = await fetch(`/api/reports?${queryParams.toString()}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setReports(data.data || data);
        if (data.pagination) setTotalPages(data.pagination.pages);
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
    }
  }, [currentUser, searchQuery, filterCategory, filterSeverity, filterDateFrom, filterDateTo, filterStatus, filterAgent, currentPage]);

  const fetchPersonalReports = useCallback(async () => {
    if (!currentUser) return;
    try {
      const params = new URLSearchParams();
      if (personalReportsStartDate) params.append('startDate', personalReportsStartDate);
      if (personalReportsEndDate) params.append('endDate', personalReportsEndDate);
      
      const res = await fetch(`/api/reports/personal?${params.toString()}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPersonalReports(data);
      }
    } catch (err) {
      console.error("Error fetching personal reports:", err);
    }
  }, [currentUser, personalReportsStartDate, personalReportsEndDate]);

  const createReport = async (newReport: any) => {
    const toastId = toast.loading("Preparando transmissão...");
    try {
      if (!isOnline) {
        savePendingSync(newReport, 'NEW');
        toast.warning('Sem ligação — Rascunho guardado localmente.', { id: toastId });
        return true;
      }

      const formData = new FormData();
      Object.keys(newReport).forEach(key => {
        if (key === 'fotos') {
          // Photos handled below
        } else if (key === 'metadata') {
          formData.append(key, JSON.stringify(newReport[key]));
        } else {
          formData.append(key, typeof newReport[key] === 'boolean' ? (newReport[key] ? '1' : '0') : newReport[key]);
        }
      });

      for (const foto of newReport.fotos) {
        try {
          const jpegFile = await compressPhotoToJpeg(foto.file);
          formData.append(`fotos`, jpegFile);
        } catch (e) {
          formData.append(`fotos`, foto.file);
        }
        formData.append(`captions`, foto.caption);
      }

      const res = await fetch('/api/reports', { method: 'POST', body: formData, credentials: 'include' });
      if (res.ok) {
        toast.success("Ocorrência registrada com sucesso!", { id: toastId });
        fetchReports();
        return true;
      } else {
        const data = await res.json();
        toast.error(data.message || "Erro ao enviar", { id: toastId });
        return false;
      }
    } catch (err) {
      toast.error("Erro de conexão", { id: toastId });
      return false;
    }
  };

  const updateReport = async (reportId: number, data: any) => {
    const toastId = toast.loading("Atualizando ocorrência...");
    try {
      if (!isOnline) {
        savePendingSync({ reportId, ...data }, 'EDIT');
        toast.warning('Editado Offline — Alteração guardada localmente.', { id: toastId });
        return true;
      }

      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (key === 'fotos') {
          // Photos handled below
        } else {
          formData.append(key, data[key]);
        }
      });

      if (data.fotos) {
        for (const foto of data.fotos) {
          if (foto.file) {
            const jpegFile = await compressPhotoToJpeg(foto.file);
            formData.append(`fotos`, jpegFile);
          }
          formData.append(`captions`, foto.caption);
        }
      }

      const res = await fetch(`/api/reports/${reportId}`, { method: 'PATCH', body: formData, credentials: 'include' });
      if (res.ok) {
        toast.success("Ocorrência atualizada!", { id: toastId });
        fetchReports();
        return true;
      }
    } catch (err) {
      toast.error("Erro ao atualizar", { id: toastId });
    }
    return false;
  };

  const toggleReportStatus = async (reportId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'Aberto' ? 'Concluído' : 'Aberto';
    try {
      const res = await fetch(`/api/reports/${reportId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'include'
      });
      if (res.ok) {
        toast.success(`Status alterado para ${newStatus}`);
        fetchReports();
        return true;
      }
    } catch (err) {
      toast.error("Erro ao alterar status");
    }
    return false;
  };

  const [dailyReportPersonal, setDailyReportPersonal] = useState<any>(null);
  const [dailyReportTeam, setDailyReportTeam] = useState<any>(null);

  const fetchDailyReportPersonal = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/reports/daily-personal', { credentials: 'include' });
      if (res.ok) setDailyReportPersonal(await res.json());
    } catch (err) { console.error(err); }
  }, [currentUser]);

  const fetchDailyReportTeam = useCallback(async () => {
    if (!currentUser || (currentUser.peso || 0) < 50) return;
    try {
      const res = await fetch('/api/reports/daily-team', { credentials: 'include' });
      if (res.ok) setDailyReportTeam(await res.json());
    } catch (err) { console.error(err); }
  }, [currentUser]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  return {
    reports,
    setReports,
    personalReports,
    dailyReportPersonal,
    dailyReportTeam,
    fetchReports,
    fetchPersonalReports,
    fetchDailyReportPersonal,
    fetchDailyReportTeam,
    createReport,
    updateReport,
    toggleReportStatus,
    pagination: { currentPage, setCurrentPage, totalPages },
    filters: {
      searchQuery, setSearchQuery,
      filterCategory, setFilterCategory,
      filterSeverity, setFilterSeverity,
      filterStatus, setFilterStatus,
      filterDateFrom, setFilterDateFrom,
      filterDateTo, setFilterDateTo,
      filterAgent, setFilterAgent,
      personalReportsStartDate, setPersonalReportsStartDate,
      personalReportsEndDate, setPersonalReportsEndDate
    }
  };
};
