import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const db = new Database("mina_seguranca.db");

export function generateDailyReport() {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  
  // Fetch reports from last 24 hours
  const reports = db.prepare(`
    SELECT r.*, u.nome as agente_nome, u.numero_mecanografico as agente_mecanografico
    FROM reports r
    JOIN users u ON r.agente_id = u.id
    WHERE r.timestamp >= ?
    ORDER BY r.categoria, r.timestamp DESC
  `).all(last24h) as any[];

  const categories = ['Valores', 'Perímetro', 'Logística', 'Safety', 'Manutenção', 'Informativo', 'Operativo'];
  const groupedReports: Record<string, any[]> = {};
  categories.forEach(cat => groupedReports[cat] = []);
  
  reports.forEach(r => {
    if (groupedReports[r.categoria]) {
      groupedReports[r.categoria].push(r);
    }
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Resumo Diário de Atividades - Mina</title>
      <style>
        body { font-family: 'Helvetica', sans-serif; color: #333; line-height: 1.5; padding: 40px; }
        .header { border-bottom: 2px solid #f97316; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
        .header h1 { margin: 0; color: #f97316; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
        .header p { margin: 5px 0 0; font-size: 12px; color: #666; }
        .category-section { margin-bottom: 30px; }
        .category-title { background: #f4f4f5; padding: 8px 12px; font-weight: bold; font-size: 14px; border-left: 4px solid #f97316; margin-bottom: 10px; text-transform: uppercase; }
        .report-item { border-bottom: 1px solid #e4e4e7; padding: 10px 0; }
        .report-item:last-child { border-bottom: none; }
        .report-meta { font-size: 11px; color: #71717a; margin-bottom: 4px; }
        .report-desc { font-size: 13px; }
        .gravidade { font-weight: bold; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-right: 8px; }
        .g4 { background-color: #ef4444; color: white; }
        .g3 { background-color: #f97316; color: white; }
        .g2 { background-color: #eab308; color: white; }
        .g1 { background-color: #3b82f6; color: white; }
        .highlight-g4 { border-left: 4px solid #ef4444; padding-left: 10px; background-color: #fef2f2; }
        .signature-section { margin-top: 60px; border-top: 1px solid #333; width: 300px; padding-top: 10px; text-align: center; }
        .signature-title { font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .footer { margin-top: 40px; font-size: 10px; color: #999; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>Resumo Diário de Atividades</h1>
          <p>Período: ${new Date(last24h).toLocaleString()} até ${now.toLocaleString()}</p>
        </div>
        <div style="text-align: right">
          <p><b>MINEGUARD</b> - Sistema de Segurança</p>
          <p>ID Relatório: ${now.getTime()}</p>
        </div>
      </div>

      ${categories.map(cat => `
        <div class="category-section">
          <div class="category-title">${cat} (${groupedReports[cat].length})</div>
          ${groupedReports[cat].length === 0 ? '<p style="font-size: 12px; color: #999; padding-left: 12px;">Nenhuma ocorrência registrada.</p>' : ''}
          ${groupedReports[cat].map(r => `
            <div class="report-item ${r.gravidade === 'G4' ? 'highlight-g4' : ''}">
              <div class="report-meta">
                <span class="gravidade ${r.gravidade.toLowerCase()}">${r.gravidade}</span>
                <b>Agente:</b> ${r.agente_nome} (${r.agente_mecanografico}) | <b>Hora:</b> ${new Date(r.timestamp).toLocaleTimeString()}
              </div>
              <div class="report-desc">${r.descricao}</div>
              ${r.fotos_path ? `<p style="font-size: 10px; color: #666; font-style: italic;">Anexo: ${r.fotos_path}</p>` : ''}
            </div>
          `).join('')}
        </div>
      `).join('')}

      <div style="display: flex; justify-content: space-between; align-items: flex-end;">
        <div class="signature-section">
          <div class="signature-title">Assinatura Digital: Sierra 1 de Serviço</div>
          <div style="font-size: 10px; color: #999; margin-top: 5px;">Data: ____/____/____ Hora: ____:____</div>
        </div>
        <div style="font-size: 11px; color: #666; text-align: right;">
          Documento gerado automaticamente para fins de auditoria interna.<br>
          Confidencial - Uso restrito à Segurança da Mina.
        </div>
      </div>

      <div class="footer">
        © 2026 MineGuard Security Systems - Todos os direitos reservados.
      </div>
    </body>
    </html>
  `;

  const reportsDir = path.join(process.cwd(), "daily_reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir);
  }

  const fileName = `relatorio_${now.toISOString().split('T')[0]}.html`;
  const filePath = path.join(reportsDir, fileName);
  fs.writeFileSync(filePath, htmlContent);
  
  console.log(`Relatório diário gerado: ${filePath}`);
  return filePath;
}
