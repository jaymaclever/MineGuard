import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { chromium } from "playwright-core";
import * as XLSX from "xlsx";
import JSZip from "jszip";

const db = new Database("mina_seguranca.db");
const REPORTS_DIR = path.join(process.cwd(), "daily_reports");

type Severity = "G1" | "G2" | "G3" | "G4";
export type DailyReportLifecycleStatus = "draft" | "issued" | "archived";

interface DailyReportApproval {
  approvedAt: string | null;
  approvedById: number | null;
  approvedByName: string | null;
  approvedByRole: string | null;
}

interface DailyReportPhoto {
  id: number;
  photo_path: string;
  caption: string | null;
}

interface DailyReportComparisonMetric {
  current: number;
  previous: number;
  delta: number;
  direction: "up" | "down" | "flat";
}

interface DailyReportComparison {
  previousDate: string;
  summary: {
    totalReports: DailyReportComparisonMetric;
    criticalReports: DailyReportComparisonMetric;
    openReports: DailyReportComparisonMetric;
    sectorsCovered: DailyReportComparisonMetric;
    activeAgents: DailyReportComparisonMetric;
  };
}

interface DailyReportRow {
  id: number;
  agente_id: number;
  agente_nome: string;
  agente_mecanografico: string;
  agente_nivel: string;
  titulo: string | null;
  categoria: string;
  gravidade: Severity;
  descricao: string;
  fotos_path: string | null;
  setor: string | null;
  equipamento: string | null;
  acao_imediata: string | null;
  testemunhas: string | null;
  potencial_risco: string | null;
  status: string;
  timestamp: string;
  photos?: DailyReportPhoto[];
}

interface DailyReportSnapshot {
  code: string;
  title: string;
  reportDate: string;
  generatedAt: string;
  generatedBy: number | null;
  periodLabel: string;
  summary: {
    totalReports: number;
    criticalReports: number;
    openReports: number;
    closedReports: number;
    sectorsCovered: number;
    activeAgents: number;
  };
  comparison: DailyReportComparison;
  highlights: string[];
  severityBreakdown: Array<{ label: string; value: number }>;
  categoryBreakdown: Array<{ label: string; value: number }>;
  statusBreakdown: Array<{ label: string; value: number }>;
  sectorBreakdown: Array<{ label: string; value: number }>;
  reports: DailyReportRow[];
}

export interface DailyReportArchiveItem {
  id: number;
  reportDate: string;
  title: string;
  code: string;
  generatedAt: string;
  totalReports: number;
  criticalReports: number;
  openReports: number;
  sectorsCovered: number;
  lifecycleStatus: DailyReportLifecycleStatus;
  issuedAt: string | null;
  archivedAt: string | null;
  approval: DailyReportApproval;
  comparison: DailyReportComparison;
}

interface GenerateDailyReportOptions {
  date?: string;
  generatedBy?: number | null;
}

interface ListDailyReportsOptions {
  search?: string;
  from?: string;
  to?: string;
}

interface DailyReportArchiveRecord {
  id: number;
  report_date: string;
  title: string;
  code: string;
  generated_at: string;
  generated_by: number | null;
  total_reports: number;
  critical_reports: number;
  open_reports: number;
  sectors_covered: number;
  lifecycle_status: DailyReportLifecycleStatus;
  issued_at: string | null;
  archived_at: string | null;
  approved_at: string | null;
  approved_by: number | null;
  approved_by_name: string | null;
  approved_by_role: string | null;
  snapshot_json: string;
  search_text: string;
  html_path: string | null;
}

function ensureArchiveInfrastructure() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_reports_archive (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_date TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      code TEXT NOT NULL,
      generated_at TEXT NOT NULL,
      generated_by INTEGER,
      total_reports INTEGER NOT NULL DEFAULT 0,
      critical_reports INTEGER NOT NULL DEFAULT 0,
      open_reports INTEGER NOT NULL DEFAULT 0,
      sectors_covered INTEGER NOT NULL DEFAULT 0,
      lifecycle_status TEXT NOT NULL DEFAULT 'draft',
      issued_at TEXT,
      archived_at TEXT,
      approved_at TEXT,
      approved_by INTEGER,
      approved_by_name TEXT,
      approved_by_role TEXT,
      snapshot_json TEXT NOT NULL,
      search_text TEXT NOT NULL DEFAULT '',
      html_path TEXT
    );
  `);

  const archiveColumns = db.prepare("PRAGMA table_info(daily_reports_archive)").all() as Array<{ name: string }>;
  const columns = archiveColumns.map((column) => column.name);
  if (!columns.includes("lifecycle_status")) {
    db.exec("ALTER TABLE daily_reports_archive ADD COLUMN lifecycle_status TEXT NOT NULL DEFAULT 'draft';");
  }
  if (!columns.includes("issued_at")) {
    db.exec("ALTER TABLE daily_reports_archive ADD COLUMN issued_at TEXT;");
  }
  if (!columns.includes("archived_at")) {
    db.exec("ALTER TABLE daily_reports_archive ADD COLUMN archived_at TEXT;");
  }
  if (!columns.includes("approved_at")) {
    db.exec("ALTER TABLE daily_reports_archive ADD COLUMN approved_at TEXT;");
  }
  if (!columns.includes("approved_by")) {
    db.exec("ALTER TABLE daily_reports_archive ADD COLUMN approved_by INTEGER;");
  }
  if (!columns.includes("approved_by_name")) {
    db.exec("ALTER TABLE daily_reports_archive ADD COLUMN approved_by_name TEXT;");
  }
  if (!columns.includes("approved_by_role")) {
    db.exec("ALTER TABLE daily_reports_archive ADD COLUMN approved_by_role TEXT;");
  }

  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

ensureArchiveInfrastructure();

function normalizeDateInput(value?: string) {
  if (!value) {
    const today = db.prepare("SELECT DATE('now', 'localtime') AS date").get() as { date: string };
    return today.date;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Data invalida para gerar relatorio diario.");
  }

  return parsed.toISOString().slice(0, 10);
}

function formatDateLong(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildCountPairs(items: DailyReportRow[], pick: (row: DailyReportRow) => string) {
  const counts = new Map<string, number>();

  for (const item of items) {
    const key = pick(item) || "Nao informado";
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

function buildHighlights(snapshot: DailyReportSnapshot) {
  const highlights: string[] = [];

  highlights.push(
    `${snapshot.summary.totalReports} ocorrencias consolidadas com ${snapshot.summary.criticalReports} classificadas como criticas.`
  );

  if (snapshot.sectorBreakdown[0]) {
    highlights.push(
      `Setor com maior volume: ${snapshot.sectorBreakdown[0].label} (${snapshot.sectorBreakdown[0].value}).`
    );
  }

  if (snapshot.categoryBreakdown[0]) {
    highlights.push(
      `Categoria predominante: ${snapshot.categoryBreakdown[0].label} (${snapshot.categoryBreakdown[0].value}).`
    );
  }

  if (snapshot.summary.openReports > 0) {
    highlights.push(`${snapshot.summary.openReports} ocorrencias permanecem abertas e exigem acompanhamento.`);
  } else {
    highlights.push("Nao ha ocorrencias pendentes em aberto neste consolidado.");
  }

  const totalDelta = snapshot.comparison.summary.totalReports.delta;
  if (totalDelta > 0) {
    highlights.push(`Volume diario acima do dia anterior em ${totalDelta} ocorrencias.`);
  } else if (totalDelta < 0) {
    highlights.push(`Volume diario abaixo do dia anterior em ${Math.abs(totalDelta)} ocorrencias.`);
  } else {
    highlights.push("Volume diario em linha com o consolidado do dia anterior.");
  }

  return highlights;
}

function getPreviousDate(date: string) {
  const current = new Date(`${date}T00:00:00Z`);
  current.setUTCDate(current.getUTCDate() - 1);
  return current.toISOString().slice(0, 10);
}

function buildComparisonMetric(current: number, previous: number): DailyReportComparisonMetric {
  const delta = current - previous;
  return {
    current,
    previous,
    delta,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
  };
}

function buildSnapshot(reportDate: string, generatedBy: number | null = null): DailyReportSnapshot {
  const reports = db
    .prepare(
      `
      SELECT
        r.id,
        r.agente_id,
        u.nome AS agente_nome,
        u.numero_mecanografico AS agente_mecanografico,
        u.nivel_hierarquico AS agente_nivel,
        r.titulo,
        r.categoria,
        r.gravidade,
        r.descricao,
        r.fotos_path,
        r.setor,
        r.equipamento,
        r.acao_imediata,
        r.testemunhas,
        r.potencial_risco,
        r.status,
        r.timestamp
      FROM reports r
      JOIN users u ON u.id = r.agente_id
      WHERE DATE(r.timestamp, 'localtime') = ?
      ORDER BY datetime(r.timestamp) DESC, r.gravidade DESC
    `
    )
    .all(reportDate) as DailyReportRow[];

  const uniqueSectors = new Set(reports.map((report) => report.setor || "Nao informado"));
  const uniqueAgents = new Set(reports.map((report) => report.agente_id));
  const criticalReports = reports.filter((report) => report.gravidade === "G4").length;
  const openReports = reports.filter((report) => report.status !== "Concluido" && report.status !== "ConcluÃ­do").length;
  const closedReports = reports.length - openReports;
  const previousDate = getPreviousDate(reportDate);
  const previousReports = db
    .prepare(
      `
      SELECT agente_id, gravidade, status, setor
      FROM reports
      WHERE DATE(timestamp, 'localtime') = ?
    `
    )
    .all(previousDate) as Array<{
      agente_id: number;
      gravidade: Severity;
      status: string;
      setor: string | null;
    }>;
  const previousUniqueSectors = new Set(previousReports.map((report) => report.setor || "Nao informado"));
  const previousUniqueAgents = new Set(previousReports.map((report) => report.agente_id));
  const previousCriticalReports = previousReports.filter((report) => report.gravidade === "G4").length;
  const previousOpenReports = previousReports.filter(
    (report) => report.status !== "Concluido" && report.status !== "ConcluÃ­do"
  ).length;
  const reportPhotoQuery = db.prepare(
    `
      SELECT id, photo_path, caption
      FROM report_photos
      WHERE report_id = ?
      ORDER BY id ASC
    `
  );
  reports.forEach((report) => {
    report.photos = reportPhotoQuery.all(report.id) as DailyReportPhoto[];
  });

  const snapshot: DailyReportSnapshot = {
    code: `DR-${reportDate.replace(/-/g, "")}`,
    title: `Relatorio Diario de Operacoes - ${reportDate}`,
    reportDate,
    generatedAt: new Date().toISOString(),
    generatedBy,
    periodLabel: formatDateLong(reportDate),
    summary: {
      totalReports: reports.length,
      criticalReports,
      openReports,
      closedReports,
      sectorsCovered: reports.length > 0 ? uniqueSectors.size : 0,
      activeAgents: uniqueAgents.size,
    },
    comparison: {
      previousDate,
      summary: {
        totalReports: buildComparisonMetric(reports.length, previousReports.length),
        criticalReports: buildComparisonMetric(criticalReports, previousCriticalReports),
        openReports: buildComparisonMetric(openReports, previousOpenReports),
        sectorsCovered: buildComparisonMetric(
          reports.length > 0 ? uniqueSectors.size : 0,
          previousReports.length > 0 ? previousUniqueSectors.size : 0
        ),
        activeAgents: buildComparisonMetric(uniqueAgents.size, previousUniqueAgents.size),
      },
    },
    highlights: [],
    severityBreakdown: buildCountPairs(reports, (report) => report.gravidade),
    categoryBreakdown: buildCountPairs(reports, (report) => report.categoria),
    statusBreakdown: buildCountPairs(reports, (report) => report.status || "Nao informado"),
    sectorBreakdown: buildCountPairs(reports, (report) => report.setor || "Nao informado"),
    reports,
  };

  snapshot.highlights = buildHighlights(snapshot);
  return snapshot;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolveUploadFilePath(photoPath: string) {
  const normalized = photoPath.replace(/^\/+/, "").replace(/\//g, path.sep);
  return path.join(process.cwd(), normalized);
}

function mimeTypeFromPhotoPath(photoPath: string) {
  const ext = path.extname(photoPath).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}

function photoToDataUri(photoPath: string) {
  const filePath = resolveUploadFilePath(photoPath);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const buffer = fs.readFileSync(filePath);
  return `data:${mimeTypeFromPhotoPath(photoPath)};base64,${buffer.toString("base64")}`;
}

function severityColor(severity: Severity) {
  switch (severity) {
    case "G4":
      return "#dc2626";
    case "G3":
      return "#ea580c";
    case "G2":
      return "#ca8a04";
    default:
      return "#2563eb";
  }
}

function buildDailyReportHtml(snapshot: DailyReportSnapshot) {
  const archive = db
    .prepare(
      `
        SELECT lifecycle_status, approved_at, approved_by_name, approved_by_role
        FROM daily_reports_archive
        WHERE report_date = ?
      `
    )
    .get(snapshot.reportDate) as
    | {
        lifecycle_status: DailyReportLifecycleStatus;
        approved_at: string | null;
        approved_by_name: string | null;
        approved_by_role: string | null;
      }
    | undefined;
  const summaryCards = [
    ["Ocorrencias", snapshot.summary.totalReports],
    ["Criticas", snapshot.summary.criticalReports],
    ["Em aberto", snapshot.summary.openReports],
    ["Setores", snapshot.summary.sectorsCovered],
  ];

  const tableRows = snapshot.reports
    .map((report) => {
      const title = report.titulo?.trim() || report.descricao.slice(0, 90);
      return `
        <tr>
          <td>${formatTime(report.timestamp)}</td>
          <td><span class="severity" style="background:${severityColor(report.gravidade)}">${escapeHtml(report.gravidade)}</span></td>
          <td>${escapeHtml(report.categoria)}</td>
          <td>${escapeHtml(report.setor || "Nao informado")}</td>
          <td>
            <strong>${escapeHtml(title)}</strong>
            <div class="desc">${escapeHtml(report.descricao)}</div>
          </td>
          <td>${escapeHtml(report.agente_nome)}</td>
          <td>${escapeHtml(report.status)}</td>
        </tr>
      `;
    })
    .join("");

  const highlights = snapshot.highlights
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  const breakdown = (items: Array<{ label: string; value: number }>) =>
    items
      .slice(0, 6)
      .map(
        (item) => `
          <div class="breakdown-item">
            <span>${escapeHtml(item.label)}</span>
            <strong>${item.value}</strong>
          </div>
        `
      )
      .join("");

  const approvalBlock = archive?.approved_at
    ? `
        <section class="panel approval-panel">
          <h2 class="panel-title">Aprovacao Executiva</h2>
          <div class="approval-grid">
            <div><span class="approval-label">Aprovado por</span><strong>${escapeHtml(archive.approved_by_name || "Nao informado")}</strong></div>
            <div><span class="approval-label">Funcao</span><strong>${escapeHtml(archive.approved_by_role || "Nao informada")}</strong></div>
            <div><span class="approval-label">Assinado em</span><strong>${escapeHtml(formatDateTime(archive.approved_at))}</strong></div>
            <div><span class="approval-label">Estado</span><strong>${escapeHtml(archive.lifecycle_status)}</strong></div>
          </div>
        </section>
      `
    : `
        <section class="panel approval-panel">
          <h2 class="panel-title">Aprovacao Executiva</h2>
          <p class="approval-empty">Aguardando assinatura/aprovacao do responsavel.</p>
        </section>
      `;

  const comparisonRows = [
    ["Ocorrencias", snapshot.comparison.summary.totalReports],
    ["Criticas", snapshot.comparison.summary.criticalReports],
    ["Em aberto", snapshot.comparison.summary.openReports],
    ["Setores", snapshot.comparison.summary.sectorsCovered],
    ["Agentes ativos", snapshot.comparison.summary.activeAgents],
  ]
    .map(
      ([label, metric]) => `
        <div class="comparison-item">
          <span>${escapeHtml(String(label))}</span>
          <strong>${metric.current}</strong>
          <em>${metric.delta > 0 ? "+" : ""}${metric.delta} vs ${metric.previous}</em>
        </div>
      `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(snapshot.title)}</title>
    <style>
      :root {
        --bg: #f4f4f5;
        --text: #18181b;
        --muted: #52525b;
        --card: #ffffff;
        --line: #e4e4e7;
        --accent: #2563eb;
        --accent-soft: rgba(37, 99, 235, 0.08);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
        color: var(--text);
        font-family: "Segoe UI", Arial, sans-serif;
        padding: 32px;
      }
      .page {
        max-width: 1180px;
        margin: 0 auto;
      }
      .hero {
        background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
        color: white;
        border-radius: 28px;
        padding: 32px;
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 24px;
        box-shadow: 0 28px 80px rgba(15, 23, 42, 0.18);
      }
      .eyebrow {
        text-transform: uppercase;
        letter-spacing: .22em;
        font-size: 11px;
        opacity: .7;
        font-weight: 700;
      }
      h1 {
        margin: 10px 0 8px;
        font-size: 34px;
        line-height: 1.05;
      }
      .hero p {
        margin: 0;
        color: rgba(255,255,255,.78);
      }
      .hero-meta {
        background: rgba(255,255,255,.08);
        border: 1px solid rgba(255,255,255,.14);
        border-radius: 20px;
        padding: 20px;
      }
      .meta-row {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 8px 0;
        border-bottom: 1px solid rgba(255,255,255,.08);
        font-size: 14px;
      }
      .meta-row:last-child { border-bottom: 0; }
      .summary-grid {
        margin-top: 24px;
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 16px;
      }
      .summary-card, .panel {
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 22px;
        padding: 22px;
        box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
      }
      .summary-card .label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: .18em;
        color: var(--muted);
        font-weight: 700;
      }
      .summary-card .value {
        margin-top: 10px;
        font-size: 34px;
        font-weight: 800;
        color: #0f172a;
      }
      .layout {
        margin-top: 24px;
        display: grid;
        grid-template-columns: 1.2fr .8fr;
        gap: 24px;
      }
      .panel-title {
        margin: 0 0 14px;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: .16em;
      }
      ul {
        margin: 0;
        padding-left: 18px;
        color: #27272a;
        line-height: 1.7;
      }
      .breakdown-item {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 12px 0;
        border-bottom: 1px solid var(--line);
        font-size: 14px;
      }
      .breakdown-item:last-child { border-bottom: 0; }
      .approval-panel { margin-top: 24px; }
      .approval-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 16px;
      }
      .approval-label {
        display: block;
        margin-bottom: 8px;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: .16em;
        color: var(--muted);
      }
      .approval-empty {
        margin: 0;
        color: var(--muted);
        font-size: 14px;
      }
      .comparison-panel { margin-top: 24px; }
      .comparison-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 14px;
      }
      .comparison-item {
        border: 1px solid var(--line);
        border-radius: 18px;
        padding: 16px;
        background: #fafafa;
      }
      .comparison-item span,
      .comparison-item em {
        display: block;
      }
      .comparison-item span {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: .14em;
        color: var(--muted);
        margin-bottom: 8px;
      }
      .comparison-item strong {
        font-size: 24px;
      }
      .comparison-item em {
        margin-top: 8px;
        color: var(--muted);
        font-style: normal;
        font-size: 12px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 22px;
        background: var(--card);
        border-radius: 22px;
        overflow: hidden;
        box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
      }
      thead th {
        padding: 16px;
        background: #111827;
        color: white;
        text-transform: uppercase;
        letter-spacing: .14em;
        font-size: 11px;
        text-align: left;
      }
      tbody td {
        padding: 16px;
        border-bottom: 1px solid var(--line);
        vertical-align: top;
        font-size: 13px;
      }
      tbody tr:nth-child(even) { background: #fafafa; }
      .desc {
        margin-top: 8px;
        color: var(--muted);
        line-height: 1.6;
      }
      .severity {
        display: inline-flex;
        padding: 6px 10px;
        border-radius: 999px;
        color: white;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: .12em;
      }
      .footer {
        margin-top: 18px;
        display: flex;
        justify-content: space-between;
        color: var(--muted);
        font-size: 12px;
      }
      .hero,
      .summary-grid,
      .layout,
      .comparison-panel,
      .approval-panel {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      thead {
        display: table-header-group;
      }
      tr,
      td,
      th {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      @media print {
        @page {
          size: A4 portrait;
          margin: 12mm 12mm 14mm 12mm;
        }
        html,
        body {
          width: 210mm;
          min-height: 297mm;
        }
        body {
          padding: 0;
          background: white;
          color: #111827;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .page {
          max-width: none;
          width: 100%;
        }
        .hero {
          padding: 24px;
          border-radius: 20px;
          box-shadow: none;
        }
        .summary-grid,
        .layout,
        .comparison-grid,
        .approval-grid {
          gap: 10px;
        }
        .summary-card,
        .panel,
        table,
        .comparison-item {
          box-shadow: none;
        }
        .summary-card,
        .panel {
          border-radius: 16px;
          padding: 16px;
        }
        .summary-card .value {
          font-size: 26px;
        }
        h1 {
          font-size: 28px;
        }
        table {
          font-size: 11px;
          border-radius: 0;
          margin-top: 18px;
        }
        thead th,
        tbody td {
          padding: 10px 12px;
        }
        .footer {
          margin-top: 14px;
          font-size: 10px;
        }
      }
      @media (max-width: 900px) {
        .hero, .layout, .summary-grid, .approval-grid, .comparison-grid { grid-template-columns: 1fr; }
        body { padding: 16px; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <section class="hero">
        <div>
          <div class="eyebrow">MineGuard Â· Relatorio Diario</div>
          <h1>${escapeHtml(snapshot.title)}</h1>
          <p>Consolidado profissional para acompanhamento operacional, auditoria e exportacao executiva.</p>
        </div>
        <div class="hero-meta">
          <div class="meta-row"><span>Codigo</span><strong>${escapeHtml(snapshot.code)}</strong></div>
          <div class="meta-row"><span>Data de referencia</span><strong>${escapeHtml(snapshot.periodLabel)}</strong></div>
          <div class="meta-row"><span>Gerado em</span><strong>${escapeHtml(formatDateTime(snapshot.generatedAt))}</strong></div>
          <div class="meta-row"><span>Agentes ativos</span><strong>${snapshot.summary.activeAgents}</strong></div>
        </div>
      </section>

      <section class="summary-grid">
        ${summaryCards
          .map(
            ([label, value]) => `
              <div class="summary-card">
                <div class="label">${escapeHtml(String(label))}</div>
                <div class="value">${value}</div>
              </div>
            `
          )
          .join("")}
      </section>

      <section class="layout">
        <article class="panel">
          <h2 class="panel-title">Destaques do Dia</h2>
          <ul>${highlights}</ul>
        </article>
        <article class="panel">
          <h2 class="panel-title">Severidade</h2>
          ${breakdown(snapshot.severityBreakdown)}
          <h2 class="panel-title" style="margin-top:24px;">Categorias</h2>
          ${breakdown(snapshot.categoryBreakdown)}
        </article>
      </section>

      <section class="panel comparison-panel">
        <h2 class="panel-title">Comparacao com ${escapeHtml(formatDateLong(snapshot.comparison.previousDate))}</h2>
        <div class="comparison-grid">
          ${comparisonRows}
        </div>
      </section>

      ${approvalBlock}

      <table>
        <thead>
          <tr>
            <th>Hora</th>
            <th>Gravidade</th>
            <th>Categoria</th>
            <th>Setor</th>
            <th>Ocorrencia</th>
            <th>Agente</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${
            tableRows ||
            `<tr><td colspan="7">Nenhuma ocorrencia registrada para este periodo.</td></tr>`
          }
        </tbody>
      </table>

      <div class="footer">
        <span>Documento gerado automaticamente pelo MineGuard.</span>
        <span>Uso interno e auditoria operacional.</span>
      </div>
    </div>
  </body>
</html>`;
}

function buildDailyReportPdfHtml(snapshot: DailyReportSnapshot) {
  const archive = db
    .prepare(
      `
        SELECT lifecycle_status, approved_at, approved_by_name, approved_by_role
        FROM daily_reports_archive
        WHERE report_date = ?
      `
    )
    .get(snapshot.reportDate) as
    | {
        lifecycle_status: DailyReportLifecycleStatus;
        approved_at: string | null;
        approved_by_name: string | null;
        approved_by_role: string | null;
      }
    | undefined;

  const summaryRows = [
    ["Ocorrencias consolidadas", snapshot.summary.totalReports],
    ["Ocorrencias criticas", snapshot.summary.criticalReports],
    ["Ocorrencias em aberto", snapshot.summary.openReports],
    ["Setores cobertos", snapshot.summary.sectorsCovered],
    ["Agentes ativos", snapshot.summary.activeAgents],
  ]
    .map(
      ([label, value]) => `
        <tr>
          <td>${escapeHtml(String(label))}</td>
          <td>${value}</td>
        </tr>
      `
    )
    .join("");

  const comparisonRows = [
    ["Ocorrencias", snapshot.comparison.summary.totalReports],
    ["Criticas", snapshot.comparison.summary.criticalReports],
    ["Em aberto", snapshot.comparison.summary.openReports],
    ["Setores", snapshot.comparison.summary.sectorsCovered],
    ["Agentes", snapshot.comparison.summary.activeAgents],
  ]
    .map(
      ([label, metric]) => `
        <tr>
          <td>${escapeHtml(String(label))}</td>
          <td>${metric.current}</td>
          <td>${metric.previous}</td>
          <td class="${metric.delta > 0 ? "delta-up" : metric.delta < 0 ? "delta-down" : "delta-flat"}">${metric.delta > 0 ? "+" : ""}${metric.delta}</td>
        </tr>
      `
    )
    .join("");

  const evidenceSections = snapshot.reports
    .filter((report) => (report.photos || []).length > 0)
    .slice(0, 8)
    .map((report) => {
      const figures = (report.photos || [])
        .slice(0, 4)
        .map((photo) => {
          const dataUri = photoToDataUri(photo.photo_path);
          if (!dataUri) return "";
          return `
            <figure class="evidence-figure">
              <img src="${dataUri}" alt="${escapeHtml(photo.caption || report.titulo || "Evidencia")}" />
              <figcaption>${escapeHtml(photo.caption || report.titulo || "Ocorrencia sem legenda")}</figcaption>
            </figure>
          `;
        })
        .filter(Boolean)
        .join("");

      if (!figures) return "";

      return `
        <section class="evidence-block">
          <div class="evidence-heading">
            <strong>${escapeHtml(report.titulo?.trim() || report.descricao.slice(0, 80))}</strong>
            <span>${escapeHtml(report.categoria)} · ${escapeHtml(report.gravidade)} · ${escapeHtml(report.setor || "Nao informado")}</span>
          </div>
          <div class="evidence-grid">${figures}</div>
        </section>
      `;
    })
    .filter(Boolean)
    .join("");

  const occurrenceRows = snapshot.reports
    .map((report) => {
      const title = report.titulo?.trim() || report.descricao.slice(0, 90);
      return `
        <tr>
          <td>${formatTime(report.timestamp)}</td>
          <td>${escapeHtml(report.gravidade)}</td>
          <td>${escapeHtml(report.categoria)}</td>
          <td>${escapeHtml(report.setor || "Nao informado")}</td>
          <td>
            <strong>${escapeHtml(title)}</strong>
            <div class="muted">${escapeHtml(report.descricao)}</div>
          </td>
          <td>${escapeHtml(report.agente_nome)}</td>
          <td>${escapeHtml(report.status)}</td>
        </tr>
      `;
    })
    .join("");

  const highlights = snapshot.highlights
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  const approvalMarkup = archive?.approved_at
    ? `
      <div class="approval-title">Relatorio aprovado</div>
      <div class="approval-row"><span>Aprovado por</span><strong>${escapeHtml(archive.approved_by_name || "Nao informado")}</strong></div>
      <div class="approval-row"><span>Funcao</span><strong>${escapeHtml(archive.approved_by_role || "Nao informada")}</strong></div>
      <div class="approval-row"><span>Assinado em</span><strong>${escapeHtml(formatDateTime(archive.approved_at))}</strong></div>
      <div class="approval-row"><span>Estado</span><strong>${escapeHtml(archive.lifecycle_status)}</strong></div>
    `
    : `
      <div class="approval-title">Relatorio pendente</div>
      <p>Aguardando assinatura ou aprovacao do responsavel.</p>
    `;

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(snapshot.title)}</title>
    <style>
      @page {
        size: A4 portrait;
        margin: 18mm 14mm 18mm 14mm;
      }
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        color: #0f172a;
        background: #fff;
        font-family: "Segoe UI", Arial, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      body {
        font-size: 11px;
        line-height: 1.45;
      }
      .document { width: 100%; }
      .letterhead {
        border-top: 10px solid #0f172a;
        border-bottom: 2px solid #cbd5e1;
        padding: 0 0 14px;
        margin-bottom: 16px;
      }
      .letterhead-grid {
        display: grid;
        grid-template-columns: 1.4fr .8fr;
        gap: 18px;
        align-items: start;
      }
      .eyebrow {
        margin-top: 10px;
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: .22em;
        color: #475569;
        font-weight: 700;
      }
      h1 {
        margin: 6px 0 8px;
        font-size: 23px;
        line-height: 1.1;
        font-weight: 800;
      }
      .subtitle {
        max-width: 480px;
        color: #475569;
      }
      .meta-table,
      .summary-table,
      .comparison-table,
      .occurrence-table {
        width: 100%;
        border-collapse: collapse;
      }
      .meta-table td {
        padding: 5px 0;
        border-bottom: 1px solid #e2e8f0;
        vertical-align: top;
      }
      .meta-table td:first-child {
        width: 40%;
        color: #64748b;
        text-transform: uppercase;
        font-size: 9px;
        letter-spacing: .14em;
        font-weight: 700;
      }
      .section {
        margin-top: 14px;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .section-title {
        margin: 0 0 8px;
        padding-bottom: 6px;
        border-bottom: 2px solid #0f172a;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: .2em;
        font-weight: 800;
      }
      .two-col {
        display: grid;
        grid-template-columns: .9fr 1.1fr;
        gap: 16px;
      }
      .panel {
        border: 1px solid #cbd5e1;
        padding: 12px 14px;
      }
      .summary-table td,
      .comparison-table th,
      .comparison-table td,
      .occurrence-table th,
      .occurrence-table td {
        border: 1px solid #dbe2ea;
        padding: 8px 10px;
        vertical-align: top;
      }
      .summary-table td:first-child {
        width: 72%;
        color: #334155;
        font-weight: 600;
      }
      .summary-table td:last-child {
        text-align: right;
        font-weight: 800;
        font-size: 16px;
      }
      .comparison-table th,
      .occurrence-table th {
        background: #e2e8f0;
        color: #0f172a;
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: .14em;
        font-weight: 800;
      }
      .occurrence-table thead {
        display: table-header-group;
      }
      .occurrence-table tr,
      .occurrence-table td,
      .occurrence-table th {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .delta-up { color: #166534; font-weight: 800; }
      .delta-down { color: #b91c1c; font-weight: 800; }
      .delta-flat { color: #475569; font-weight: 800; }
      ul {
        margin: 0;
        padding-left: 18px;
      }
      li + li { margin-top: 7px; }
      .approval.approved { background: #f8fafc; }
      .approval.pending { background: #fff7ed; }
      .approval-title {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: .18em;
        font-weight: 800;
        margin-bottom: 10px;
      }
      .approval-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 5px 0;
        border-bottom: 1px solid #e2e8f0;
      }
      .approval-row span {
        color: #64748b;
        text-transform: uppercase;
        font-size: 9px;
        letter-spacing: .14em;
        font-weight: 700;
      }
      .muted {
        margin-top: 4px;
        color: #475569;
        line-height: 1.5;
      }
      .evidence-block {
        margin-top: 12px;
        border: 1px solid #cbd5e1;
        padding: 12px;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .evidence-heading {
        margin-bottom: 10px;
      }
      .evidence-heading strong {
        display: block;
        font-size: 11px;
      }
      .evidence-heading span {
        display: block;
        margin-top: 3px;
        color: #64748b;
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: .14em;
      }
      .evidence-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      .evidence-figure {
        margin: 0;
        border: 1px solid #dbe2ea;
        background: #fff;
      }
      .evidence-figure img {
        display: block;
        width: 100%;
        height: 120px;
        object-fit: cover;
      }
      .evidence-figure figcaption {
        padding: 7px 8px;
        font-size: 9px;
        color: #475569;
      }
      .footer-note {
        margin-top: 12px;
        padding-top: 8px;
        border-top: 1px solid #cbd5e1;
        display: flex;
        justify-content: space-between;
        gap: 12px;
        color: #64748b;
        font-size: 9px;
      }
    </style>
  </head>
  <body>
    <div class="document">
      <header class="letterhead">
        <div class="letterhead-grid">
          <div>
            <div class="eyebrow">MineGuard · Documento Operacional</div>
            <h1>${escapeHtml(snapshot.title)}</h1>
            <div class="subtitle">Relatorio diario em formato institucional A4 para emissao, auditoria, arquivo e distribuicao interna.</div>
          </div>
          <div>
            <table class="meta-table">
              <tr><td>Codigo</td><td><strong>${escapeHtml(snapshot.code)}</strong></td></tr>
              <tr><td>Data de referencia</td><td><strong>${escapeHtml(snapshot.periodLabel)}</strong></td></tr>
              <tr><td>Gerado em</td><td><strong>${escapeHtml(formatDateTime(snapshot.generatedAt))}</strong></td></tr>
              <tr><td>Estado</td><td><strong>${escapeHtml(archive?.lifecycle_status || "draft")}</strong></td></tr>
            </table>
          </div>
        </div>
      </header>

      <section class="section">
        <h2 class="section-title">Resumo Operacional</h2>
        <div class="two-col">
          <div class="panel">
            <table class="summary-table">
              ${summaryRows}
            </table>
          </div>
          <div class="panel approval ${archive?.approved_at ? "approved" : "pending"}">
            ${approvalMarkup}
          </div>
        </div>
      </section>

      <section class="section">
        <h2 class="section-title">Comparacao com ${escapeHtml(formatDateLong(snapshot.comparison.previousDate))}</h2>
        <table class="comparison-table">
          <thead>
            <tr>
              <th>Indicador</th>
              <th>Atual</th>
              <th>Anterior</th>
              <th>Delta</th>
            </tr>
          </thead>
          <tbody>${comparisonRows}</tbody>
        </table>
      </section>

      <section class="section">
        <h2 class="section-title">Leitura Executiva</h2>
        <div class="panel">
          <ul>${highlights}</ul>
        </div>
      </section>

      ${evidenceSections ? `
        <section class="section">
          <h2 class="section-title">Evidencias Fotograficas</h2>
          ${evidenceSections}
        </section>
      ` : ""}

      <section class="section">
        <h2 class="section-title">Ocorrencias Consolidadas</h2>
        <table class="occurrence-table">
          <thead>
            <tr>
              <th>Hora</th>
              <th>Gravidade</th>
              <th>Categoria</th>
              <th>Setor</th>
              <th>Ocorrencia</th>
              <th>Agente</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${occurrenceRows || `<tr><td colspan="7">Nenhuma ocorrencia registrada para este periodo.</td></tr>`}
          </tbody>
        </table>
      </section>

      <div class="footer-note">
        <span>MineGuard · Documento institucional de uso interno</span>
        <span>Formato A4 preparado para impressao, assinatura e arquivo</span>
      </div>
    </div>
  </body>
</html>`;
}
function resolvePdfBrowserExecutable() {
  const candidates = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ];

  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error("Nenhum navegador compativel foi encontrado para gerar PDF a partir do HTML.");
  }

  return found;
}

async function buildPdfBuffer(snapshot: DailyReportSnapshot) {
  const html = buildDailyReportPdfHtml(snapshot);
  const browser = await chromium.launch({
    executablePath: resolvePdfBrowserExecutable(),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "screen" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width:100%; font-size:8px; color:#64748b; padding:0 12mm; font-family:Segoe UI, Arial, sans-serif; display:flex; justify-content:space-between; align-items:center;">
          <span>${escapeHtml(snapshot.code)}</span>
          <span>${escapeHtml(snapshot.title)}</span>
        </div>
      `,
      footerTemplate: `
        <div style="width:100%; font-size:8px; color:#64748b; padding:0 12mm; font-family:Segoe UI, Arial, sans-serif; display:flex; justify-content:space-between; align-items:center;">
          <span>MineGuard Â· Relatorio Diario</span>
          <span>Pagina <span class="pageNumber"></span> de <span class="totalPages"></span></span>
        </div>
      `,
      margin: {
        top: "18mm",
        right: "12mm",
        bottom: "18mm",
        left: "12mm",
      },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function buildXlsxBuffer(snapshot: DailyReportSnapshot) {
  const archive = db
    .prepare(
      `
        SELECT lifecycle_status, approved_at, approved_by_name, approved_by_role
        FROM daily_reports_archive
        WHERE report_date = ?
      `
    )
    .get(snapshot.reportDate) as
    | {
        lifecycle_status: DailyReportLifecycleStatus;
        approved_at: string | null;
        approved_by_name: string | null;
        approved_by_role: string | null;
      }
    | undefined;
  const workbook = XLSX.utils.book_new();

  const summaryRows = [
    ["Codigo", snapshot.code],
    ["Titulo", snapshot.title],
    ["Data de referencia", snapshot.reportDate],
    ["Gerado em", formatDateTime(snapshot.generatedAt)],
    ["Estado", archive?.lifecycle_status || "draft"],
    ["Aprovado por", archive?.approved_by_name || ""],
    ["Funcao do aprovador", archive?.approved_by_role || ""],
    ["Data da aprovacao", archive?.approved_at ? formatDateTime(archive.approved_at) : ""],
    ["Comparacao com", formatDateLong(snapshot.comparison.previousDate)],
    ["Delta total de ocorrencias", snapshot.comparison.summary.totalReports.delta],
    ["Delta de criticas", snapshot.comparison.summary.criticalReports.delta],
    ["Delta de pendencias abertas", snapshot.comparison.summary.openReports.delta],
    ["Total de ocorrencias", snapshot.summary.totalReports],
    ["Criticas", snapshot.summary.criticalReports],
    ["Em aberto", snapshot.summary.openReports],
    ["Concluidas", snapshot.summary.closedReports],
    ["Setores cobertos", snapshot.summary.sectorsCovered],
    ["Agentes ativos", snapshot.summary.activeAgents],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["!cols"] = [{ wch: 24 }, { wch: 48 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo");

  const occurrencesSheet = XLSX.utils.json_to_sheet(
    snapshot.reports.map((report) => ({
      Hora: formatTime(report.timestamp),
      Gravidade: report.gravidade,
      Categoria: report.categoria,
      Setor: report.setor || "Nao informado",
      Titulo: report.titulo || "",
      Descricao: report.descricao,
      Agente: report.agente_nome,
      Nivel: report.agente_nivel,
      Status: report.status,
      Equipamento: report.equipamento || "",
      AcaoImediata: report.acao_imediata || "",
      PotencialRisco: report.potencial_risco || "",
    }))
  );
  occurrencesSheet["!cols"] = [
    { wch: 10 },
    { wch: 12 },
    { wch: 18 },
    { wch: 20 },
    { wch: 28 },
    { wch: 50 },
    { wch: 22 },
    { wch: 16 },
    { wch: 14 },
    { wch: 22 },
    { wch: 34 },
    { wch: 26 },
  ];
  XLSX.utils.book_append_sheet(workbook, occurrencesSheet, "Ocorrencias");

  const indicatorsRows = [
    ...Object.entries(snapshot.comparison.summary).map(([key, metric]) => ({
      Grupo: "Comparacao",
      Nome: key,
      Quantidade: `${metric.current} (${metric.delta > 0 ? "+" : ""}${metric.delta} vs ${metric.previous})`,
    })),
    ...snapshot.severityBreakdown.map((item) => ({ Grupo: "Severidade", Nome: item.label, Quantidade: item.value })),
    ...snapshot.categoryBreakdown.map((item) => ({ Grupo: "Categoria", Nome: item.label, Quantidade: item.value })),
    ...snapshot.statusBreakdown.map((item) => ({ Grupo: "Status", Nome: item.label, Quantidade: item.value })),
    ...snapshot.sectorBreakdown.map((item) => ({ Grupo: "Setor", Nome: item.label, Quantidade: item.value })),
  ];
  const indicatorsSheet = XLSX.utils.json_to_sheet(indicatorsRows);
  indicatorsSheet["!cols"] = [{ wch: 16 }, { wch: 24 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(workbook, indicatorsSheet, "Indicadores");

  return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
}

function getHtmlPath(reportDate: string) {
  return path.join(REPORTS_DIR, `relatorio_${reportDate}.html`);
}

function getPdfPath(reportDate: string) {
  return path.join(REPORTS_DIR, `relatorio_${reportDate}.pdf`);
}

function getXlsxPath(reportDate: string) {
  return path.join(REPORTS_DIR, `relatorio_${reportDate}.xlsx`);
}

function buildSearchText(snapshot: DailyReportSnapshot) {
  const parts = [
    snapshot.reportDate,
    snapshot.title,
    snapshot.code,
    ...snapshot.highlights,
    ...snapshot.reports.flatMap((report) => [
      report.categoria,
      report.gravidade,
      report.setor || "",
      report.titulo || "",
      report.descricao,
      report.agente_nome,
      report.status,
      report.equipamento || "",
      report.acao_imediata || "",
      report.potencial_risco || "",
    ]),
  ];

  return parts
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function saveArchive(snapshot: DailyReportSnapshot, html: string) {
  const htmlPath = getHtmlPath(snapshot.reportDate);
  fs.writeFileSync(htmlPath, html, "utf8");

  const searchText = buildSearchText(snapshot);
  const snapshotJson = JSON.stringify(snapshot);
  const current = db
    .prepare(
      `
        SELECT id
        FROM daily_reports_archive
        WHERE report_date = ?
      `
    )
    .get(snapshot.reportDate) as { id: number } | undefined;

  if (current) {
    db.prepare(
      `
        UPDATE daily_reports_archive
        SET title = ?,
            code = ?,
            generated_at = ?,
            generated_by = ?,
            total_reports = ?,
            critical_reports = ?,
            open_reports = ?,
            sectors_covered = ?,
            snapshot_json = ?,
            search_text = ?,
            html_path = ?
        WHERE report_date = ?
      `
    ).run(
      snapshot.title,
      snapshot.code,
      snapshot.generatedAt,
      snapshot.generatedBy,
      snapshot.summary.totalReports,
      snapshot.summary.criticalReports,
      snapshot.summary.openReports,
      snapshot.summary.sectorsCovered,
      snapshotJson,
      searchText,
      htmlPath,
      snapshot.reportDate
    );
  } else {
    db.prepare(
      `
        INSERT INTO daily_reports_archive (
          report_date,
          title,
          code,
          generated_at,
          generated_by,
          total_reports,
          critical_reports,
          open_reports,
          sectors_covered,
          lifecycle_status,
          snapshot_json,
          search_text,
          html_path
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)
      `
    ).run(
      snapshot.reportDate,
      snapshot.title,
      snapshot.code,
      snapshot.generatedAt,
      snapshot.generatedBy,
      snapshot.summary.totalReports,
      snapshot.summary.criticalReports,
      snapshot.summary.openReports,
      snapshot.summary.sectorsCovered,
      snapshotJson,
      searchText,
      htmlPath
    );
  }

  return htmlPath;
}

function getArchiveById(id: number) {
  const record = db
    .prepare(
      `
        SELECT *
        FROM daily_reports_archive
        WHERE id = ?
      `
    )
    .get(id) as DailyReportArchiveRecord | undefined;

  if (!record) {
    throw new Error("Relatorio diario nao encontrado.");
  }

  return record;
}

function getSnapshotById(id: number) {
  const record = getArchiveById(id);
  return {
    record,
    snapshot: JSON.parse(record.snapshot_json) as DailyReportSnapshot,
  };
}

export function listDailyReports(options: ListDailyReportsOptions = {}): DailyReportArchiveItem[] {
  const search = (options.search || "").trim().toLowerCase();
  const from = options.from || "";
  const to = options.to || "";

  const clauses = ["1 = 1"];
  const params: unknown[] = [];

  if (search) {
    clauses.push("(LOWER(title) LIKE ? OR search_text LIKE ? OR code LIKE ? OR report_date LIKE ?)");
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  if (from) {
    clauses.push("report_date >= ?");
    params.push(from);
  }

  if (to) {
    clauses.push("report_date <= ?");
    params.push(to);
  }

  return (db
    .prepare(
      `
      SELECT id, report_date, title, code, generated_at, total_reports, critical_reports, open_reports, sectors_covered
      , lifecycle_status, issued_at, archived_at, approved_at, approved_by, approved_by_name, approved_by_role, snapshot_json
      FROM daily_reports_archive
      WHERE ${clauses.join(" AND ")}
      ORDER BY report_date DESC, generated_at DESC
    `
    )
    .all(...params) as Array<Record<string, unknown>>).map((item) => {
    const snapshot = JSON.parse(String(item.snapshot_json)) as DailyReportSnapshot;
    return {
      id: Number(item.id),
      reportDate: String(item.report_date),
      title: String(item.title),
      code: String(item.code),
      generatedAt: String(item.generated_at),
      totalReports: Number(item.total_reports),
      criticalReports: Number(item.critical_reports),
      openReports: Number(item.open_reports),
      sectorsCovered: Number(item.sectors_covered),
      lifecycleStatus: String(item.lifecycle_status) as DailyReportLifecycleStatus,
      issuedAt: item.issued_at ? String(item.issued_at) : null,
      archivedAt: item.archived_at ? String(item.archived_at) : null,
      approval: {
        approvedAt: item.approved_at ? String(item.approved_at) : null,
        approvedById: item.approved_by ? Number(item.approved_by) : null,
        approvedByName: item.approved_by_name ? String(item.approved_by_name) : null,
        approvedByRole: item.approved_by_role ? String(item.approved_by_role) : null,
      },
      comparison: snapshot.comparison,
    };
  });
}

export function getDailyReportDetail(id: number) {
  const { record, snapshot } = getSnapshotById(id);
  const html = record.html_path && fs.existsSync(record.html_path) ? fs.readFileSync(record.html_path, "utf8") : buildDailyReportHtml(snapshot);

  return {
    id: record.id,
    reportDate: snapshot.reportDate,
    title: snapshot.title,
    code: snapshot.code,
    generatedAt: snapshot.generatedAt,
    lifecycleStatus: record.lifecycle_status,
    issuedAt: record.issued_at,
    archivedAt: record.archived_at,
    approval: {
      approvedAt: record.approved_at,
      approvedById: record.approved_by,
      approvedByName: record.approved_by_name,
      approvedByRole: record.approved_by_role,
    },
    comparison: snapshot.comparison,
    summary: snapshot.summary,
    highlights: snapshot.highlights,
    severityBreakdown: snapshot.severityBreakdown,
    categoryBreakdown: snapshot.categoryBreakdown,
    statusBreakdown: snapshot.statusBreakdown,
    sectorBreakdown: snapshot.sectorBreakdown,
    reports: snapshot.reports,
    html,
  };
}

export function getDailyReportPreviewHtml(id: number) {
  return getDailyReportDetail(id).html;
}

export function generateDailyReport(options: GenerateDailyReportOptions = {}) {
  const reportDate = normalizeDateInput(options.date);
  const snapshot = buildSnapshot(reportDate, options.generatedBy ?? null);
  const html = buildDailyReportHtml(snapshot);
  const filePath = saveArchive(snapshot, html);

  return {
    id: Number(
      (db.prepare("SELECT id FROM daily_reports_archive WHERE report_date = ?").get(reportDate) as { id: number }).id
    ),
    filePath,
    snapshot,
  };
}

export function updateDailyReportLifecycle(id: number, status: DailyReportLifecycleStatus) {
  const current = getArchiveById(id);

  const now = new Date().toISOString();
  const issuedAt =
    status === "issued"
      ? current.issued_at || now
      : status === "archived"
        ? current.issued_at || now
        : null;
  const archivedAt = status === "archived" ? now : null;
  const clearApproval = status === "draft";

  db.prepare(
    `
      UPDATE daily_reports_archive
      SET lifecycle_status = ?, issued_at = ?, archived_at = ?,
          approved_at = CASE WHEN ? THEN NULL ELSE approved_at END,
          approved_by = CASE WHEN ? THEN NULL ELSE approved_by END,
          approved_by_name = CASE WHEN ? THEN NULL ELSE approved_by_name END,
          approved_by_role = CASE WHEN ? THEN NULL ELSE approved_by_role END
      WHERE id = ?
    `
  ).run(status, issuedAt, archivedAt, clearApproval ? 1 : 0, clearApproval ? 1 : 0, clearApproval ? 1 : 0, clearApproval ? 1 : 0, id);

  return getDailyReportDetail(id);
}

export function approveDailyReport(
  id: number,
  approver: { id: number; name: string; role: string }
) {
  const current = getArchiveById(id);
  const now = new Date().toISOString();
  const nextStatus: DailyReportLifecycleStatus = current.lifecycle_status === "archived" ? "archived" : "issued";
  const issuedAt = current.issued_at || now;

  db.prepare(
    `
      UPDATE daily_reports_archive
      SET lifecycle_status = ?,
          issued_at = ?,
          approved_at = ?,
          approved_by = ?,
          approved_by_name = ?,
          approved_by_role = ?
      WHERE id = ?
    `
  ).run(nextStatus, issuedAt, now, approver.id, approver.name, approver.role, id);

  return getDailyReportDetail(id);
}

export async function exportDailyReport(id: number, format: "html" | "pdf" | "xlsx") {
  const { snapshot } = getSnapshotById(id);

  if (format === "html") {
    const htmlPath = getHtmlPath(snapshot.reportDate);
    const html = buildDailyReportHtml(snapshot);
    fs.writeFileSync(htmlPath, html, "utf8");
    return {
      fileName: path.basename(htmlPath),
      mimeType: "text/html; charset=utf-8",
      buffer: Buffer.from(html, "utf8"),
    };
  }

  if (format === "pdf") {
    const pdfPath = getPdfPath(snapshot.reportDate);
    const buffer = await buildPdfBuffer(snapshot);
    fs.writeFileSync(pdfPath, buffer);
    return {
      fileName: path.basename(pdfPath),
      mimeType: "application/pdf",
      buffer,
    };
  }

  const xlsxPath = getXlsxPath(snapshot.reportDate);
  const buffer = buildXlsxBuffer(snapshot);
  fs.writeFileSync(xlsxPath, buffer);
  return {
    fileName: path.basename(xlsxPath),
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer,
  };
}

export async function exportDailyReportsBatch(ids: number[], format: "html" | "pdf" | "xlsx") {
  const uniqueIds = Array.from(new Set(ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)));
  if (uniqueIds.length === 0) {
    throw new Error("Nenhum relatorio selecionado para exportacao em lote.");
  }

  const zip = new JSZip();
  for (const id of uniqueIds) {
    const file = await exportDailyReport(id, format);
    zip.file(file.fileName, file.buffer);
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return {
    fileName: `relatorios-diarios-${format}-${new Date().toISOString().slice(0, 10)}.zip`,
    mimeType: "application/zip",
    buffer,
  };
}





