import type { AnexoJRow } from './fifoParser';

export function convertToCSV(data: AnexoJRow[], separator: ',' | ';', formatDecimals: boolean): string {
  const headers = ["Ativo", "País", "Data Realização", "Valor Realização", "Data Aquisição", "Valor Aquisição", "Despesas"];
  
  const escapeField = (val: string | number) => {
    const s = val === null || val === undefined ? '' : String(val);
    if (s.includes(separator) || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const formatNum = (num: number) => {
    let formatted = num.toFixed(2);
    if (formatDecimals) {
      formatted = formatted.replace('.', ',');
    }
    return formatted;
  };

  const rows = data.map(r => [
    escapeField(r.ativo),
    escapeField(r.pais),
    escapeField(r.dataRealizacao),
    escapeField(formatNum(r.valorRealizacao)),
    escapeField(r.dataAquisicao),
    escapeField(formatNum(r.valorAquisicao)),
    escapeField(formatNum(r.despesas))
  ]);

  return [headers.join(separator), ...rows.map(row => row.join(separator))].join('\r\n');
}

export function downloadCSV(data: AnexoJRow[], format: 'standard' | 'excel', filename: string) {
  const separator = format === 'excel' ? ';' : ',';
  const formatDecimals = format === 'excel';
  const csvContent = convertToCSV(data, separator, formatDecimals);
  
  // Include UTF-8 BOM so Excel opens it with correct encoding (UTF-8)
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
