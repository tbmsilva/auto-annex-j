import { describe, it, expect } from 'vitest';
import { parseMultipleCSVs, getHoldingPeriodYears } from './fifoParser';

describe('fifoParser', () => {
  it('should correctly parse and match FIFO transactions', async () => {
    const csvContent = `Action,Time,ISIN,Ticker,Name,No. of shares,Price / share,Currency (Price / share),Exchange rate,Result (EUR),Total (EUR),Charge amount (EUR),Stamp duty reserve tax (EUR)
Market buy,2022-01-15 14:30:00,IE00B4L5Y983,IWDA,iShares Core MSCI World,10,75.50,EUR,1,-755.00,-755.00,0,0
Market buy,2022-06-10 10:15:00,IE00B4L5Y983,IWDA,iShares Core MSCI World,5,70.00,EUR,1,-350.00,-350.00,0,0
Market sell,2023-03-20 16:45:00,IE00B4L5Y983,IWDA,iShares Core MSCI World,12,80.00,EUR,1,960.00,958.00,2.00,0`;

    const result = await parseMultipleCSVs([csvContent]);
    
    // Total 12 shares sold: 10 from first buy, 2 from second buy
    expect(result).toHaveLength(2);

    // Oldest sale first -> wait, parser sorts by realization date DESCENDING!
    // Both are from the same realization date, but loop inserts sequentially.
    // The first item pushed is the 10 shares match, the second is the 2 shares match.
    // The descending sort puts them in whatever stable order. Let's check values.
    
    const row10 = result.find(r => r.valorAquisicao === 755); // 10 shares * 75.50 = 755
    expect(row10).toBeDefined();
    expect(row10?.valorRealizacao).toBe(800); // 10 * 80
    expect(row10?.despesas).toBeCloseTo(1.67, 2); // 10/12 of 2.00 fee = 1.67
    expect(row10?.dataAquisicao).toBe('15/01/2022');
    expect(row10?.dataRealizacao).toBe('20/03/2023');

    const row2 = result.find(r => r.valorAquisicao === 140); // 2 shares * 70.00 = 140
    expect(row2).toBeDefined();
    expect(row2?.valorRealizacao).toBe(160); // 2 * 80
    expect(row2?.despesas).toBeCloseTo(0.33, 2); // 2/12 of 2.00 fee = 0.33
    expect(row2?.dataAquisicao).toBe('10/06/2022');
  });

  it('should handle multi-file CSVs correctly', async () => {
    const csv1 = `Action,Time,ISIN,Ticker,Name,No. of shares,Result (EUR),Total (EUR)
Market sell,2023-01-01 10:00:00,US123,TEST,Test,10,100,100`; // Sell in 2023

    const csv2 = `Action,Time,ISIN,Ticker,Name,No. of shares,Result (EUR),Total (EUR)
Market buy,2022-01-01 10:00:00,US123,TEST,Test,10,-50,-50`; // Buy in 2022

    // Even if passed out of order, the parser should sort chronologically
    const result = await parseMultipleCSVs([csv1, csv2]);
    
    expect(result).toHaveLength(1);
    expect(result[0].dataAquisicao).toBe('01/01/2022');
    expect(result[0].dataRealizacao).toBe('01/01/2023');
    expect(result[0].valorAquisicao).toBe(50);
    expect(result[0].valorRealizacao).toBe(100);
    expect(result[0].tempoDetencaoAnos).toBeCloseTo(1.0, 2);
    expect(result[0].lucro).toBe(50);
  });

  describe('getHoldingPeriodYears', () => {
    it('calculates exact year intervals correctly', () => {
      const acq = new Date('2020-01-15T00:00:00');
      const realExactly2Years = new Date('2022-01-15T00:00:00');
      const realLess2Years = new Date('2022-01-14T00:00:00');
      const realMore2Years = new Date('2022-01-16T00:00:00');

      expect(getHoldingPeriodYears(acq, realExactly2Years)).toBe(2);
      expect(getHoldingPeriodYears(acq, realLess2Years)).toBeLessThan(2);
      expect(getHoldingPeriodYears(acq, realMore2Years)).toBeGreaterThan(2);
    });

    it('handles leap years correctly', () => {
      const acq = new Date('2020-02-28T00:00:00'); // 2020 is a leap year
      const real1Year = new Date('2021-02-28T00:00:00');
      
      expect(getHoldingPeriodYears(acq, real1Year)).toBe(1);
    });
  });
});
