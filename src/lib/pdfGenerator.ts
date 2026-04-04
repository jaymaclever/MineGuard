//@ts-ignore
import html2pdf from 'html2pdf.js';

export const loadReportConfig = () => {
  const saved = localStorage.getItem('mineguard_pdf_config');
  if (saved) return JSON.parse(saved);
  return {
    showLogo: true,
    logoUrl: 'https://cdn-icons-png.flaticon.com/512/8796/8796919.png',
    titleFormat: 'Relatório Oficial MineGuard',
    showSignature: true,
    signatureName: 'Sierra 1 de Serviço'
  };
};

export const generateSingleReportPDF = (report: any) => {
  const config = loadReportConfig();
  
  const element = document.createElement('div');
  element.innerHTML = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1f2937; padding: 40px; background: white; max-width: 800px; margin: 0 auto; position: relative;">
      
      <!-- Cabeçalho -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #f97316; padding-bottom: 20px; margin-bottom: 30px;">
        <div style="display: flex; gap: 20px; align-items: center;">
          ${config.showLogo && config.logoUrl ? `<img src="${config.logoUrl}" style="height: 60px; object-fit: contain;" />` : ''}
          <div>
            <h1 style="color: #f97316; margin: 0; font-size: 26px; text-transform: uppercase;">${config.titleFormat}</h1>
            <p style="margin: 5px 0 0; font-size: 14px; color: #6b7280; font-weight: bold;">ID Ocorrência: #${report.id.toString().padStart(6, '0')}</p>
          </div>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; font-size: 12px; color: #6b7280; font-weight: bold;">DATA DE EMISSÃO</p>
          <p style="margin: 5px 0 0; font-size: 14px; font-family: monospace;">${new Date().toLocaleString()}</p>
        </div>
      </div>

      <!-- Sumário -->
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-left: 4px solid #f97316; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
        <h2 style="margin: 0 0 10px 0; font-size: 20px; text-transform: uppercase; color: #111827;">${report.titulo || 'Registro Sem Título'}</h2>
        <div style="display: flex; gap: 30px; margin-top: 15px;">
          <div>
            <p style="font-size: 10px; color: #6b7280; font-weight: bold; text-transform: uppercase; margin: 0 0 4px 0;">Categoria</p>
            <p style="margin: 0; font-weight: bold; color: #374151;">${report.categoria}</p>
          </div>
          <div>
            <p style="font-size: 10px; color: #6b7280; font-weight: bold; text-transform: uppercase; margin: 0 0 4px 0;">Nível Gravidade</p>
            <p style="margin: 0; font-weight: bold; color: ${report.gravidade === 'G4' ? '#ef4444' : report.gravidade === 'G3' ? '#f97316' : '#3b82f6'};">${report.gravidade}</p>
          </div>
          <div>
            <p style="font-size: 10px; color: #6b7280; font-weight: bold; text-transform: uppercase; margin: 0 0 4px 0;">Agente Relator</p>
            <p style="margin: 0; font-weight: bold; color: #374151;">${report.agente_nome}</p>
          </div>
          <div>
            <p style="font-size: 10px; color: #6b7280; font-weight: bold; text-transform: uppercase; margin: 0 0 4px 0;">Data Ocorrido</p>
            <p style="margin: 0; font-weight: bold; color: #374151;">${new Date(report.timestamp).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <!-- Detalhamento -->
      <div style="margin-bottom: 30px;">
        <h3 style="font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 15px; font-weight: bold;">Descrição Detalhada</h3>
        <p style="font-size: 14px; line-height: 1.6; color: #374151; white-space: pre-wrap; margin: 0;">${report.descricao}</p>
      </div>

      <!-- Campos Adicionais Dinâmicos -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
        ${report.setor ? `
        <div>
          <h3 style="font-size: 10px; text-transform: uppercase; color: #6b7280; margin: 0 0 5px 0;">Setor/Local</h3>
          <p style="font-size: 13px; font-weight: 600; margin: 0;">${report.setor}</p>
        </div>` : ''}
        ${report.equipamento ? `
        <div>
          <h3 style="font-size: 10px; text-transform: uppercase; color: #6b7280; margin: 0 0 5px 0;">Equipamento</h3>
          <p style="font-size: 13px; font-weight: 600; margin: 0;">${report.equipamento}</p>
        </div>` : ''}
      </div>

      ${report.acao_imediata ? `
      <div style="margin-bottom: 30px;">
        <h3 style="font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 15px; font-weight: bold;">Ação Imediata Tomada</h3>
        <p style="font-size: 14px; line-height: 1.6; color: #374151; margin: 0; background: #fffbeb; padding: 10px; border-radius: 4px; border-left: 4px solid #fbbf24;">${report.acao_imediata}</p>
      </div>` : ''}

      ${report.fotos && Array.isArray(report.fotos) && report.fotos.length > 0 ? `
      <div style="margin-top: 40px; page-break-before: auto;">
        <h3 style="font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 20px; font-weight: bold;">Evidências Fotográficas (${report.fotos.length})</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          ${report.fotos.map((f: any, i: number) => `
            <div style="border: 1px solid #e5e7eb; padding: 10px; border-radius: 6px; text-align: center;">
              <img src="${f.file ? URL.createObjectURL(f.file) : f}" style="width: 100%; height: 200px; object-fit: contain; border-radius: 4px;" />
              <p style="font-size: 10px; color: #6b7280; margin: 10px 0 0 0;">Anexo ${i + 1} ${f.caption ? `- ${f.caption}` : ''}</p>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Assinatura -->
      ${config.showSignature ? `
      <div style="margin-top: 80px; page-break-inside: avoid; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px;">
        <div style="width: 300px; margin: 0 auto;">
          <p style="font-size: 14px; font-weight: bold; color: #111827; margin: 0 0 5px 0;">${config.signatureName}</p>
          <p style="font-size: 10px; color: #6b7280; text-transform: uppercase; font-weight: bold; margin: 0;">Assinatura do Responsável</p>
        </div>
      </div>` : ''}

      <!-- Rodapé -->
      <div style="margin-top: 40px; text-align: center; font-size: 9px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 10px;">
        Este documento foi gerado pelo sistema integrado MineGuard.
      </div>
    </div>
  `;

  document.body.appendChild(element);

  const opt: any = {
    margin:       10,
    filename:     `Ocorrencia_${report.id}_${report.categoria}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, logging: false },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).save().then(() => {
    document.body.removeChild(element);
  });
};

export const generateListPDF = (reports: any[]) => {
    const config = loadReportConfig();
    
    const element = document.createElement('div');
    element.innerHTML = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1f2937; padding: 40px; background: white; max-width: 800px; margin: 0 auto; position: relative;">
        <!-- Cabeçalho -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #f97316; padding-bottom: 20px; margin-bottom: 30px;">
          <div style="display: flex; gap: 20px; align-items: center;">
            ${config.showLogo && config.logoUrl ? `<img src="${config.logoUrl}" style="height: 50px; object-fit: contain;" />` : ''}
            <h1 style="color: #f97316; margin: 0; font-size: 24px; text-transform: uppercase;">Relatório Geral Operacional</h1>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 12px; color: #6b7280; font-weight: bold;">EMISSÃO</p>
            <p style="margin: 5px 0 0; font-size: 14px; font-family: monospace;">${new Date().toLocaleString()}</p>
          </div>
        </div>

        <h2 style="font-size: 16px; margin-bottom: 20px;">Listagem de Ocorrências (${reports.length} registros)</h2>

        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
                <tr style="background: #f3f4f6; text-transform: uppercase;">
                    <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">ID / Data</th>
                    <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Título / Categoria</th>
                    <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Status / Grav.</th>
                    <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">Agente</th>
                </tr>
            </thead>
            <tbody>
                ${reports.map((r: any) => `
                <tr>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; border-left: 4px solid ${r.gravidade === 'G4' ? '#ef4444' : r.gravidade === 'G3' ? '#f97316' : '#3b82f6'};">
                        <strong>#${r.id}</strong><br/>
                        <span style="color: #6b7280;">${new Date(r.timestamp).toLocaleDateString()}</span>
                    </td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">
                        <strong style="font-size: 12px;">${r.titulo || 'Sem título'}</strong><br/>
                        <span style="color: #4b5563;">${r.categoria}</span>
                    </td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">
                        <strong>${r.gravidade}</strong><br/>
                        ${r.status || 'Aberto'}
                    </td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">${r.agente_nome}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <!-- Assinatura -->
        ${config.showSignature ? `
        <div style="margin-top: 60px; page-break-inside: avoid; text-align: center;">
          <div style="width: 300px; margin: 0 auto; border-top: 1px solid #e5e7eb; padding-top: 15px;">
            <p style="font-size: 14px; font-weight: bold; color: #111827; margin: 0 0 5px 0;">${config.signatureName}</p>
            <p style="font-size: 10px; color: #6b7280; text-transform: uppercase; font-weight: bold; margin: 0;">DOCUMENTO OFICIAL</p>
          </div>
        </div>` : ''}
      </div>
    `;

    document.body.appendChild(element);

    const opt: any = {
      margin:       10,
      filename:     `Relatorio_Lista_${Date.now()}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      document.body.removeChild(element);
    });
};
