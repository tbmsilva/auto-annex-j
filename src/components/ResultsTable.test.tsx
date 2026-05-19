import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ResultsTable } from './ResultsTable';
import type { AnexoJRow } from '../utils/fifoParser';

describe('ResultsTable Component', () => {
  it('renders empty state when no data is provided', () => {
    render(<ResultsTable data={[]} />);
    expect(screen.getByText(/No sales data found/i)).toBeInTheDocument();
  });

  it('renders table rows correctly', () => {
    const mockData: AnexoJRow[] = [
      {
        ativo: 'Apple (AAPL)',
        pais: 'US',
        dataRealizacao: '15/11/2023',
        valorRealizacao: 100,
        dataAquisicao: '10/01/2022',
        valorAquisicao: 50,
        despesas: 2,
      }
    ];

    render(<ResultsTable data={mockData} />);
    
    expect(screen.getByText('Apple (AAPL)')).toBeInTheDocument();
    expect(screen.getByText('US')).toBeInTheDocument();
    expect(screen.getByText('15/11/2023')).toBeInTheDocument();
    expect(screen.getByText('100.00')).toBeInTheDocument();
  });

  it('changes button text when copy is clicked', async () => {
    const mockData: AnexoJRow[] = [
      {
        ativo: 'Test', pais: 'IE', dataRealizacao: '01/01/2023',
        valorRealizacao: 100, dataAquisicao: '01/01/2022',
        valorAquisicao: 50, despesas: 0,
      }
    ];

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });

    render(<ResultsTable data={mockData} />);
    const btn = screen.getByText(/Copy Table/i);
    
    fireEvent.click(btn);
    
    // Expect text to change to 'Copied!'
    expect(await screen.findByText(/Copied!/i)).toBeInTheDocument();
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });
});
