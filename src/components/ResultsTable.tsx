import { useState } from 'react';
import type { AnexoJRow } from '../utils/fifoParser';

interface ResultsTableProps {
  data: AnexoJRow[];
}

export function ResultsTable({ data }: ResultsTableProps) {
  const [copied, setCopied] = useState(false);

  if (!data || data.length === 0) {
    return (
      <div className="glass-panel empty-state animate-fade-in">
        <h3>No sales data found</h3>
        <p>Your CSV doesn't contain any valid stock or ETF sales for Anexo J.</p>
      </div>
    );
  }

  const handleCopy = () => {
    const headers = ["Ativo", "País", "Data Realização", "Valor Realização", "Data Aquisição", "Valor Aquisição", "Despesas"];
    const rows = data.map(r => [
      r.ativo,
      r.pais,
      r.dataRealizacao,
      r.valorRealizacao.toString().replace('.', ','),
      r.dataAquisicao,
      r.valorAquisicao.toString().replace('.', ','),
      r.despesas.toString().replace('.', ',')
    ]);

    const tsv = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(err => {
      console.error('Falha ao copiar a tabela.', err);
    });
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Resultados para o Anexo J (Quadro 9.2)</h2>
        <button
          className="btn btn-primary"
          onClick={handleCopy}
          style={copied ? { backgroundColor: 'var(--success)' } : {}}
        >
          {copied ? '✅ Copied!' : '📋 Copy Table'}
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Ativo</th>
              <th>País (Código)</th>
              <th>Data Realização</th>
              <th>Valor Realização (€)</th>
              <th>Data Aquisição</th>
              <th>Valor Aquisição (€)</th>
              <th>Despesas (€)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index}>
                <td>{row.ativo}</td>
                <td>{row.pais}</td>
                <td>{row.dataRealizacao}</td>
                <td>{row.valorRealizacao.toFixed(2)}</td>
                <td>{row.dataAquisicao}</td>
                <td>{row.valorAquisicao.toFixed(2)}</td>
                <td>{row.despesas.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
