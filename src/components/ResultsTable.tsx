import { useState, useMemo } from 'react';
import type { AnexoJRow } from '../utils/fifoParser';
import { downloadCSV } from '../utils/exporter';


interface ResultsTableProps {
  dataByYear: Map<number, AnexoJRow[]>;
}

interface TaxStats {
  totalRealizacao: number;
  totalAquisicao: number;
  totalDespesas: number;
  totalLucro: number;
  saldoAte2Anos: number;
  saldo2a5Anos: number;
  saldo5a8Anos: number;
  saldoMais8Anos: number;
  tributadoAte2Anos: number;
  tributado2a5Anos: number;
  tributado5a8Anos: number;
  tributadoMais8Anos: number;
  totalTributado: number;
  impostoEstimado: number;
}

function calculateTaxStats(data: AnexoJRow[]): TaxStats {
  let totalRealizacao = 0;
  let totalAquisicao = 0;
  let totalDespesas = 0;
  let totalLucro = 0;
  
  let saldoAte2Anos = 0;
  let saldo2a5Anos = 0;
  let saldo5a8Anos = 0;
  let saldoMais8Anos = 0;
  
  for (const row of data) {
    totalRealizacao += row.valorRealizacao;
    totalAquisicao += row.valorAquisicao;
    totalDespesas += row.despesas;
    totalLucro += row.lucro;
    
    const y = row.tempoDetencaoAnos;
    if (y <= 2) {
      saldoAte2Anos += row.lucro;
    } else if (y <= 5) {
      saldo2a5Anos += row.lucro;
    } else if (y <= 8) {
      saldo5a8Anos += row.lucro;
    } else {
      saldoMais8Anos += row.lucro;
    }
  }
  
  const tributadoAte2Anos = saldoAte2Anos * 1.0;
  const tributado2a5Anos = saldo2a5Anos * 0.9;
  const tributado5a8Anos = saldo5a8Anos * 0.8;
  const tributadoMais8Anos = saldoMais8Anos * 0.7;
  
  const totalTributado = tributadoAte2Anos + tributado2a5Anos + tributado5a8Anos + tributadoMais8Anos;
  const impostoEstimado = totalTributado > 0 ? totalTributado * 0.28 : 0;
  
  return {
    totalRealizacao: Number(totalRealizacao.toFixed(2)),
    totalAquisicao: Number(totalAquisicao.toFixed(2)),
    totalDespesas: Number(totalDespesas.toFixed(2)),
    totalLucro: Number(totalLucro.toFixed(2)),
    saldoAte2Anos: Number(saldoAte2Anos.toFixed(2)),
    saldo2a5Anos: Number(saldo2a5Anos.toFixed(2)),
    saldo5a8Anos: Number(saldo5a8Anos.toFixed(2)),
    saldoMais8Anos: Number(saldoMais8Anos.toFixed(2)),
    tributadoAte2Anos: Number(tributadoAte2Anos.toFixed(2)),
    tributado2a5Anos: Number(tributado2a5Anos.toFixed(2)),
    tributado5a8Anos: Number(tributado5a8Anos.toFixed(2)),
    tributadoMais8Anos: Number(tributadoMais8Anos.toFixed(2)),
    totalTributado: Number(totalTributado.toFixed(2)),
    impostoEstimado: Number(impostoEstimado.toFixed(2))
  };
}

export function formatHoldingPeriod(years: number): string {
  if (years < 1) {
    const days = Math.round(years * 365.25);
    if (days === 0) return '0 dias';
    if (days < 30) {
      return `${days} ${days === 1 ? 'dia' : 'dias'}`;
    }
    const months = Math.round(years * 12);
    return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  }
  
  const wholeYears = Math.floor(years);
  const fractionalPart = years - wholeYears;
  const months = Math.round(fractionalPart * 12);
  
  if (months === 0) {
    return `${wholeYears} ${wholeYears === 1 ? 'ano' : 'anos'}`;
  }
  if (months === 12) {
    return `${wholeYears + 1} ${wholeYears + 1 === 1 ? 'ano' : 'anos'}`;
  }
  return `${wholeYears} ${wholeYears === 1 ? 'ano' : 'anos'} e ${months} ${months === 1 ? 'mês' : 'meses'}`;
}

export function ResultsTable({ dataByYear }: ResultsTableProps) {
  const sortedYears = useMemo(() => {
    return Array.from(dataByYear.keys()).sort((a, b) => b - a);
  }, [dataByYear]);

  const [selectedYear, setSelectedYear] = useState<number>(() => sortedYears[0]);
  const [copiedAnexoJ, setCopiedAnexoJ] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  const data = dataByYear.get(selectedYear) ?? [];

  if (sortedYears.length === 0) {
    return (
      <div className="glass-panel empty-state animate-fade-in">
        <h3>No sales data found</h3>
        <p>Your CSV doesn't contain any valid stock or ETF sales for Anexo J.</p>
      </div>
    );
  }

  const stats = calculateTaxStats(data);

  const handleCopyAnexoJ = () => {
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
      setCopiedAnexoJ(true);
      setTimeout(() => setCopiedAnexoJ(false), 1500);
    }).catch(err => {
      console.error('Falha ao copiar a tabela para o Anexo J.', err);
    });
  };

  const handleCopyFull = () => {
    const headers = ["Ativo", "País", "Data Realização", "Valor Realização", "Data Aquisição", "Valor Aquisição", "Despesas", "Tempo Detenção", "Lucro/Prejuízo"];
    const rows = data.map(r => [
      r.ativo,
      r.pais,
      r.dataRealizacao,
      r.valorRealizacao.toString().replace('.', ','),
      r.dataAquisicao,
      r.valorAquisicao.toString().replace('.', ','),
      r.despesas.toString().replace('.', ','),
      formatHoldingPeriod(r.tempoDetencaoAnos),
      r.lucro.toString().replace('.', ',')
    ]);

    const tsv = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
      setCopiedFull(true);
      setTimeout(() => setCopiedFull(false), 1500);
    }).catch(err => {
      console.error('Falha ao copiar a tabela completa.', err);
    });
  };

  return (
    <div className="animate-fade-in">

      {/* Year Selector */}
      {sortedYears.length > 1 && (
        <div className="year-selector" style={{ marginBottom: '1.5rem' }}>
          <span className="year-selector-label">Ano Fiscal:</span>
          <div className="year-pills">
            {sortedYears.map(year => (
              <button
                key={year}
                className={`year-pill ${year === selectedYear ? 'year-pill-active' : ''}`}
                onClick={() => setSelectedYear(year)}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      )}

      {data.length === 0 ? (
        <div className="glass-panel empty-state animate-fade-in">
          <h3>No sales data for {selectedYear}</h3>
          <p>No stock or ETF sales were found for this fiscal year.</p>
        </div>
      ) : (
        <>
          {/* Resumo Fiscal / Summary Panel */}
          <div className="tax-summary-panel glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              Resumo Fiscal Estimado — {selectedYear} (Regime Geral - Mais-Valias)
            </h3>
            <div className="summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              
              {/* Col 1: Totais Gerais */}
              <div className="summary-col">
                <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.8rem', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Totais Gerais
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Realizações:</span>
                    <span style={{ fontWeight: 'bold' }}>{stats.totalRealizacao.toFixed(2)} €</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Aquisições:</span>
                    <span style={{ fontWeight: 'bold' }}>{stats.totalAquisicao.toFixed(2)} €</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Despesas:</span>
                    <span style={{ fontWeight: 'bold' }}>{stats.totalDespesas.toFixed(2)} €</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                    <span>Saldo Global (Lucro):</span>
                    <span style={{ 
                      fontWeight: 'bold', 
                      color: stats.totalLucro > 0 ? 'var(--success)' : (stats.totalLucro < 0 ? 'var(--danger)' : 'var(--text-primary)') 
                    }}>
                      {stats.totalLucro > 0 ? `+${stats.totalLucro.toFixed(2)}` : stats.totalLucro.toFixed(2)} €
                    </span>
                  </div>
                </div>
              </div>

              {/* Col 2: Detalhamento por Detenção */}
              <div className="summary-col">
                <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.8rem', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Rendimento Tributável por Escalão
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Até 2 anos (28,0%):</span>
                    <span>{stats.saldoAte2Anos.toFixed(2)} € → <strong style={{ color: stats.tributadoAte2Anos >= 0 ? 'var(--text-primary)' : 'var(--danger)' }}>{stats.tributadoAte2Anos.toFixed(2)} €</strong></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>2 a 5 anos (25,2%):</span>
                    <span>{stats.saldo2a5Anos.toFixed(2)} € → <strong style={{ color: stats.tributado2a5Anos >= 0 ? 'var(--text-primary)' : 'var(--danger)' }}>{stats.tributado2a5Anos.toFixed(2)} €</strong></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>5 a 8 anos (22,4%):</span>
                    <span>{stats.saldo5a8Anos.toFixed(2)} € → <strong style={{ color: stats.tributado5a8Anos >= 0 ? 'var(--text-primary)' : 'var(--danger)' }}>{stats.tributado5a8Anos.toFixed(2)} €</strong></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Mais de 8 anos (19,6%):</span>
                    <span>{stats.saldoMais8Anos.toFixed(2)} € → <strong style={{ color: stats.tributadoMais8Anos >= 0 ? 'var(--text-primary)' : 'var(--danger)' }}>{stats.tributadoMais8Anos.toFixed(2)} €</strong></span>
                  </div>
                </div>
              </div>

              {/* Col 3: Imposto Estimado */}
              <div className="summary-col" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.4rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                  Imposto Estimado (Taxa Especial 28%)
                </h4>
                <div style={{ textAlign: 'center', margin: '0.5rem 0' }}>
                  <div style={{ fontSize: '2rem', fontWeight: '800', background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {stats.impostoEstimado.toFixed(2)} €
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Matéria Coletável: {stats.totalTributado > 0 ? stats.totalTributado.toFixed(2) : '0.00'} €
                  </div>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: '1.2' }}>
                  Nota: Este valor é uma estimativa baseada nas regras de detenção do Artigo 43.º do CIRS. Perdas líquidas globais resultam em 0,00 € de imposto.
                </p>
              </div>

            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
            <h2>Resultados para o Anexo J (Quadro 9.2) — {selectedYear}</h2>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div className="split-button">
                <button
                  className="btn btn-primary btn-main"
                  onClick={handleCopyAnexoJ}
                  style={(copiedAnexoJ || copiedFull) ? { backgroundColor: 'var(--success)' } : {}}
                >
                  {copiedAnexoJ || copiedFull ? '✅ Copied!' : '📋 Copy for Anexo J'}
                </button>
                <button
                  className="btn btn-primary btn-trigger"
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  style={(copiedAnexoJ || copiedFull) ? { backgroundColor: 'var(--success)' } : {}}
                  title="More export & copy options"
                >
                  <span className="arrow-icon">▾</span>
                </button>
                {showExportDropdown && (
                  <>
                    <div 
                      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }} 
                      onClick={() => setShowExportDropdown(false)} 
                    />
                    <div className="dropdown-menu animate-fade-in" style={{ zIndex: 50 }}>
                      <button 
                        className="dropdown-item" 
                        onClick={() => {
                          handleCopyFull();
                          setShowExportDropdown(false);
                        }}
                      >
                        📊 Copy Full Table
                      </button>
                      <button 
                        className="dropdown-item" 
                        onClick={() => {
                          downloadCSV(data, 'standard', `anexo_j_${selectedYear}_standard.csv`);
                          setShowExportDropdown(false);
                        }}
                      >
                        📄 Export Standard CSV (Comma)
                      </button>
                      <button 
                        className="dropdown-item" 
                        onClick={() => {
                          downloadCSV(data, 'excel', `anexo_j_${selectedYear}_excel_pt.csv`);
                          setShowExportDropdown(false);
                        }}
                      >
                        📊 Export Excel CSV (Semicolon, PT)
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
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
                  <th>Tempo Detenção</th>
                  <th>Lucro/Prejuízo (€)</th>
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
                    <td style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      {formatHoldingPeriod(row.tempoDetencaoAnos)}
                    </td>
                    <td style={{ 
                      fontWeight: '500', 
                      color: row.lucro > 0 ? 'var(--success)' : (row.lucro < 0 ? 'var(--danger)' : 'var(--text-primary)') 
                    }}>
                      {row.lucro > 0 ? `+${row.lucro.toFixed(2)}` : row.lucro.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

