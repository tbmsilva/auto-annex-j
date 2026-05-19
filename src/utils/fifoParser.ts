import Papa from 'papaparse';

export interface AnexoJRow {
  ativo: string;
  pais: string;
  dataRealizacao: string;
  valorRealizacao: number;
  dataAquisicao: string;
  valorAquisicao: number;
  despesas: number;
  tempoDetencaoAnos: number;
  lucro: number;
}

interface BuyLot {
  date: Date;
  shares: number;
  pricePerShare: number;
  feesPerShare: number;
}

function parseT212Date(dateStr: string): Date {
  // Typical T212 format: 2023-01-15 14:30:00
  return new Date(dateStr);
}

function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function getHoldingPeriodYears(acquisitionDate: Date, realizationDate: Date): number {
  // Normalize both dates to midnight to calculate calendar-day-based holding period.
  const acq = new Date(acquisitionDate.getFullYear(), acquisitionDate.getMonth(), acquisitionDate.getDate());
  const real = new Date(realizationDate.getFullYear(), realizationDate.getMonth(), realizationDate.getDate());

  let years = real.getFullYear() - acq.getFullYear();
  
  const anniversaryThisYear = new Date(real.getFullYear(), acq.getMonth(), acq.getDate());
  if (real < anniversaryThisYear) {
    years--;
  }
  
  const lastAnniversary = new Date(acq);
  lastAnniversary.setFullYear(acq.getFullYear() + years);
  
  const nextAnniversary = new Date(acq);
  nextAnniversary.setFullYear(acq.getFullYear() + years + 1);
  
  const yearLengthMs = nextAnniversary.getTime() - lastAnniversary.getTime();
  const timeSinceLastAnniversaryMs = real.getTime() - lastAnniversary.getTime();
  
  return years + (timeSinceLastAnniversaryMs / yearLengthMs);
}

function getNum(row: any, prefixes: string[]): number {
  let total = 0;
  for (const key of Object.keys(row)) {
    for (const prefix of prefixes) {
      if (key.toLowerCase().includes(prefix.toLowerCase())) {
        const val = Number(row[key]);
        if (!isNaN(val)) {
          total += Math.abs(val);
        }
      }
    }
  }
  return total;
}

export async function parseMultipleCSVs(csvTexts: string[]): Promise<AnexoJRow[]> {
  const allRows: any[] = [];
  
  for (const csvText of csvTexts) {
    const parsedRows = await new Promise<any[]>((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (error: any) => reject(error)
      });
    });
    allRows.push(...parsedRows);
  }

  return processTransactions(allRows);
}

export function parseCSV(csvText: string): Promise<AnexoJRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data as any[];
          const output = processTransactions(rows);
          resolve(output);
        } catch (error) {
          reject(error);
        }
      },
      error: (error: any) => {
        reject(error);
      }
    });
  });
}

function processTransactions(rows: any[]): AnexoJRow[] {
  // 1. Filter and normalize rows
  const transactions = rows
    .filter(row => row['Action'] && row['ISIN'] && row['Time'] && row['No. of shares'])
    .map(row => {
      const action = String(row['Action']).toLowerCase();
      const isBuy = action.includes('buy');
      const isSell = action.includes('sell');
      
      const shares = Math.abs(Number(row['No. of shares']));
      
      // Calculate total base currency value and fees
      const totalKey = Object.keys(row).find(k => k.toLowerCase().startsWith('total ('));
      const resultKey = Object.keys(row).find(k => k.toLowerCase().startsWith('result ('));
      
      const totalBase = totalKey ? Math.abs(Number(row[totalKey])) : 0;
      const resultBase = resultKey ? Math.abs(Number(row[resultKey])) : 0;
      
      // Extract fees
      const fees = getNum(row, ['charge', 'stamp', 'conversion fee', 'fee']);
      
      // T212 Total usually = Result + Fees for buys, Result - Fees for sells.
      // If we don't have Result, we can derive it.
      let valueBase = resultBase > 0 ? resultBase : (totalBase > 0 ? (isBuy ? totalBase - fees : totalBase + fees) : 0);
      
      // If still 0, try to calculate from Price and Exchange rate
      if (valueBase === 0) {
        const price = Math.abs(Number(row['Price / share'])) || 0;
        const fx = Math.abs(Number(row['Exchange rate'])) || 1;
        valueBase = (shares * price) / fx;
      }

      return {
        isBuy,
        isSell,
        date: parseT212Date(String(row['Time'])),
        isin: String(row['ISIN']),
        ticker: String(row['Ticker']),
        name: String(row['Name']),
        shares,
        valueBase,
        fees
      };
    })
    .filter(t => t.isBuy || t.isSell);

  // 2. Sort chronologically
  transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

  // 3. Group by ISIN and apply FIFO
  const grouped = new Map<string, typeof transactions>();
  for (const t of transactions) {
    if (!grouped.has(t.isin)) {
      grouped.set(t.isin, []);
    }
    grouped.get(t.isin)!.push(t);
  }

  const anexoJResults: AnexoJRow[] = [];

  for (const [isin, txs] of grouped.entries()) {
    const buyQueue: BuyLot[] = [];
    
    // Country code from ISIN (first two characters)
    const pais = isin.substring(0, 2).toUpperCase();

    for (const tx of txs) {
      if (tx.isBuy) {
        buyQueue.push({
          date: tx.date,
          shares: tx.shares,
          pricePerShare: tx.shares > 0 ? tx.valueBase / tx.shares : 0,
          feesPerShare: tx.shares > 0 ? tx.fees / tx.shares : 0
        });
      } else if (tx.isSell) {
        let remainingSharesToSell = tx.shares;
        let saleProportionPerShare = tx.shares > 0 ? tx.valueBase / tx.shares : 0;
        let saleFeesPerShare = tx.shares > 0 ? tx.fees / tx.shares : 0;

        while (remainingSharesToSell > 0 && buyQueue.length > 0) {
          const oldestBuy = buyQueue[0];
          
          const sharesToMatch = Math.min(remainingSharesToSell, oldestBuy.shares);
          
          // Calculate values for this match
          const valorRealizacao = sharesToMatch * saleProportionPerShare;
          const valorAquisicao = sharesToMatch * oldestBuy.pricePerShare;
          const despesas = (sharesToMatch * saleFeesPerShare) + (sharesToMatch * oldestBuy.feesPerShare);
          
          const roundedRealizacao = Number(valorRealizacao.toFixed(2));
          const roundedAquisicao = Number(valorAquisicao.toFixed(2));
          const roundedDespesas = Number(despesas.toFixed(2));
          const lucro = Number((roundedRealizacao - roundedAquisicao - roundedDespesas).toFixed(2));
          const tempoDetencaoAnos = getHoldingPeriodYears(oldestBuy.date, tx.date);

          anexoJResults.push({
            ativo: `${tx.name} (${tx.ticker})`,
            pais,
            dataRealizacao: formatDate(tx.date),
            valorRealizacao: roundedRealizacao,
            dataAquisicao: formatDate(oldestBuy.date),
            valorAquisicao: roundedAquisicao,
            despesas: roundedDespesas,
            tempoDetencaoAnos,
            lucro
          });

          // Update queues
          remainingSharesToSell -= sharesToMatch;
          oldestBuy.shares -= sharesToMatch;

          // If the buy lot is fully used, remove it
          // Due to floating point precision, consider < 0.000001 as 0
          if (oldestBuy.shares < 0.000001) {
            buyQueue.shift();
          }
        }
      }
    }
  }

  // 4. Sort results by realization date
  anexoJResults.sort((a, b) => {
    const [dayA, monthA, yearA] = a.dataRealizacao.split('/');
    const [dayB, monthB, yearB] = b.dataRealizacao.split('/');
    const dateA = new Date(Number(yearA), Number(monthA) - 1, Number(dayA));
    const dateB = new Date(Number(yearB), Number(monthB) - 1, Number(dayB));
    return dateB.getTime() - dateA.getTime(); // Descending order
  });

  return anexoJResults;
}
