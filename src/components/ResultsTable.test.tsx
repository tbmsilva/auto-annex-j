import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ResultsTable } from './ResultsTable';
import type { AnexoJRow } from '../utils/fifoParser';

describe('ResultsTable Component', () => {
  it('renders empty state when no data is provided', () => {
    render(<ResultsTable dataByYear={new Map()} />);
    expect(screen.getByText(/No sales data found/i)).toBeInTheDocument();
  });

  it('renders table rows and new columns correctly', () => {
    const mockData: AnexoJRow[] = [
      {
        ativo: 'Apple (AAPL)',
        pais: 'US',
        dataRealizacao: '15/11/2023',
        valorRealizacao: 100,
        dataAquisicao: '10/01/2022',
        valorAquisicao: 50,
        despesas: 2,
        tempoDetencaoAnos: 1.84, // 1 year, 10 months
        lucro: 48
      }
    ];

    render(<ResultsTable dataByYear={new Map([[2023, mockData]])} />);
    
    expect(screen.getByText('Apple (AAPL)')).toBeInTheDocument();
    expect(screen.getByText('US')).toBeInTheDocument();
    expect(screen.getByText('15/11/2023')).toBeInTheDocument();
    expect(screen.getByText('100.00')).toBeInTheDocument();
    
    // Check new columns
    expect(screen.getByText('1 ano e 10 meses')).toBeInTheDocument();
    expect(screen.getByText('+48.00')).toBeInTheDocument();
  });

  it('calculates and renders correct totals and tax estimation in summary panel', () => {
    const mockData: AnexoJRow[] = [
      {
        ativo: 'Stock A',
        pais: 'US',
        dataRealizacao: '15/11/2023',
        valorRealizacao: 1000,
        dataAquisicao: '10/01/2022',
        valorAquisicao: 500,
        despesas: 10,
        tempoDetencaoAnos: 1.5, // Bracket 1 (100%): 490 profit
        lucro: 490
      },
      {
        ativo: 'Stock B',
        pais: 'IE',
        dataRealizacao: '15/11/2023',
        valorRealizacao: 1500,
        dataAquisicao: '10/01/2020',
        valorAquisicao: 1000,
        despesas: 20,
        tempoDetencaoAnos: 3.8, // Bracket 2 (90%): 480 profit
        lucro: 480
      },
      {
        ativo: 'Stock C',
        pais: 'US',
        dataRealizacao: '15/11/2023',
        valorRealizacao: 200,
        dataAquisicao: '10/11/2023',
        valorAquisicao: 300,
        despesas: 5,
        tempoDetencaoAnos: 0.01, // Bracket 1 (100%): -105 loss
        lucro: -105
      }
    ];

    // Math:
    // Bracket 1 (Até 2 anos): 490 - 105 = 385. Tributado (100%) = 385.
    // Bracket 2 (2 a 5 anos): 480. Tributado (90%) = 432.
    // Total Tributado = 385 + 432 = 817.
    // Imposto Estimado (28%) = 817 * 0.28 = 228.76.
    // Total Lucro = 490 + 480 - 105 = 865.

    render(<ResultsTable dataByYear={new Map([[2023, mockData]])} />);

    // Check General Totals
    expect(screen.getByText('Total Realizações:')).toBeInTheDocument();
    expect(screen.getByText('2700.00 €')).toBeInTheDocument(); // 1000 + 1500 + 200
    expect(screen.getByText('+865.00 €')).toBeInTheDocument(); // Total Lucro

    // Check Tax Summary Estimations
    expect(screen.getByText('228.76 €')).toBeInTheDocument(); // Estimated Tax
    expect(screen.getByText(/Matéria Coletável: 817.00 €/)).toBeInTheDocument();
  });

  it('changes button text when copy buttons are clicked', async () => {
    const mockData: AnexoJRow[] = [
      {
        ativo: 'Test', pais: 'IE', dataRealizacao: '01/01/2023',
        valorRealizacao: 100, dataAquisicao: '01/01/2022',
        valorAquisicao: 50, despesas: 0,
        tempoDetencaoAnos: 1.0, lucro: 50
      }
    ];

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });

    render(<ResultsTable dataByYear={new Map([[2023, mockData]])} />);
    
    const btnAnexoJ = screen.getByRole('button', { name: /Copy for Anexo J/i });
    
    // Click Anexo J copy button
    fireEvent.click(btnAnexoJ);
    expect(await screen.findByText(/Copied!/i)).toBeInTheDocument();
    expect(navigator.clipboard.writeText).toHaveBeenCalled();

    // Open dropdown to find Copy Full Table button
    const triggerBtn = screen.getByTitle(/More export & copy options/i);
    fireEvent.click(triggerBtn);
    
    const btnFull = screen.getByRole('button', { name: /Copy Full Table/i });
    // Click Full Table copy button
    fireEvent.click(btnFull);
    expect(await screen.findByText(/Copied!/i)).toBeInTheDocument();
  });
});
