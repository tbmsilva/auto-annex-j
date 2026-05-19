import { describe, it, expect } from 'vitest';
import { convertToCSV } from './exporter';
import type { AnexoJRow } from './fifoParser';

describe('exporter utility', () => {
  const mockData: AnexoJRow[] = [
    {
      ativo: 'Apple (AAPL)',
      pais: 'US',
      dataRealizacao: '15/11/2023',
      valorRealizacao: 1500.50,
      dataAquisicao: '10/01/2022',
      valorAquisicao: 1000.25,
      despesas: 2.50,
      tempoDetencaoAnos: 1.84,
      lucro: 497.75
    }
  ];

  it('generates standard comma-separated CSV with dot decimals', () => {
    const csvContent = convertToCSV(mockData, ',', false);
    
    // Check headers
    expect(csvContent).toContain('Ativo,País,Data Realização,Valor Realização,Data Aquisição,Valor Aquisição,Despesas');
    
    // Check line data
    // Apple (AAPL),US,15/11/2023,1500.50,10/01/2022,1000.25,2.50
    expect(csvContent).toContain('Apple (AAPL),US,15/11/2023,1500.50,10/01/2022,1000.25,2.50');
  });

  it('generates Excel-friendly semicolon-separated CSV with comma decimals', () => {
    const csvContent = convertToCSV(mockData, ';', true);
    
    // Check headers
    expect(csvContent).toContain('Ativo;País;Data Realização;Valor Realização;Data Aquisição;Valor Aquisição;Despesas');
    
    // Check line data
    // Apple (AAPL);US;15/11/2023;1500,50;10/01/2022;1000,25;2,50
    expect(csvContent).toContain('Apple (AAPL);US;15/11/2023;1500,50;10/01/2022;1000,25;2,50');
  });

  it('escapes fields containing the separator correctly', () => {
    const doubleMock: AnexoJRow[] = [
      {
        ativo: 'Index, Global Fund',
        pais: 'IE',
        dataRealizacao: '15/11/2023',
        valorRealizacao: 100.00,
        dataAquisicao: '10/01/2022',
        valorAquisicao: 80.00,
        despesas: 0.00,
        tempoDetencaoAnos: 1.84,
        lucro: 20.00
      }
    ];

    const standardCsv = convertToCSV(doubleMock, ',', false);
    expect(standardCsv).toContain('"Index, Global Fund",IE,15/11/2023,100.00,10/01/2022,80.00,0.00');
  });
});
