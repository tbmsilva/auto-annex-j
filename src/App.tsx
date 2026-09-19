import { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Dropzone } from './components/Dropzone';
import { ResultsTable } from './components/ResultsTable';
import { Footer } from './components/Footer';
import { parseMultipleCSVsByYear, type AnexoJRow } from './utils/fifoParser';
import { getFiles, addFile, removeFile, clearFiles, type CsvFile } from './utils/db';


function App() {
  const [resultsByYear, setResultsByYear] = useState<Map<number, AnexoJRow[]> | null>(null);
  const [files, setFiles] = useState<CsvFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadData = async () => {
    setIsProcessing(true);
    try {
      const storedFiles = await getFiles();
      setFiles(storedFiles);
      if (storedFiles.length > 0) {
        const contents = storedFiles.map(f => f.content);
        const parsedData = await parseMultipleCSVsByYear(contents);
        setResultsByYear(parsedData);
      } else {
        setResultsByYear(null);
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while loading your data.');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileLoaded = async (fileData: { name: string, content: string }) => {
    setError(null);
    try {
      await addFile(fileData.name, fileData.content);
      await loadData();
    } catch (err) {
      console.error(err);
      setError('An error occurred while saving the CSV file.');
    }
  };

  const handleDeleteFile = async (id: string) => {
    try {
      await removeFile(id);
      await loadData();
    } catch (err) {
      console.error(err);
      setError('Could not delete file.');
    }
  };

  const handleClearAll = async () => {
    try {
      await clearFiles();
      await loadData();
    } catch (err) {
      console.error(err);
      setError('Could not clear files.');
    }
  };

  return (
    <div className="app-container animate-fade-in">
      <header className="header">
        <h1>Auto Annex J</h1>
        <p>Easily convert your Trading212 CSV reports into an IRS-ready Anexo J (FIFO) table.</p>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>All data is saved securely in your browser's local storage.</p>
      </header>

      <main>
        {error && (
          <div className="glass-panel" style={{ padding: '1rem', color: 'var(--danger)', marginBottom: '2rem', border: '1px solid var(--danger)' }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center', width: '100%' }}>
          
          <div style={{ width: '100%', maxWidth: '800px' }}>
            <Dropzone onFileLoaded={handleFileLoaded} onError={setError} />
            
            {files.length > 0 && (
              <div className="glass-panel" style={{ marginTop: '2rem', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Uploaded Files ({files.length})</h3>
                  <button 
                    onClick={handleClearAll} 
                    style={{ background: 'transparent', color: 'var(--danger)', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500, padding: '0.2rem 0.5rem', borderRadius: '6px' }}
                    aria-label="Clear all uploaded files"
                  >
                    Clear All
                  </button>
                </div>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', listStyle: 'none' }}>
                  {files.map(f => (
                    <li key={f.id} className="file-chip">
                      <span style={{ fontSize: '0.9rem', wordBreak: 'break-all', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span aria-hidden="true">📄</span> {f.name}
                      </span>
                      <button 
                        onClick={() => handleDeleteFile(f.id)} 
                        className="file-chip-remove"
                        title={`Remove ${f.name}`}
                        aria-label={`Remove file ${f.name}`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div style={{ width: '100%' }}>
            {isProcessing && (
              <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
                <h2>Processing your files...</h2>
              </div>
            )}

            {!isProcessing && resultsByYear && resultsByYear.size > 0 && (
              <ResultsTable dataByYear={resultsByYear} />
            )}

            {!isProcessing && (!resultsByYear || resultsByYear.size === 0) && files.length === 0 && (
              <div className="glass-panel empty-state" style={{ padding: '4rem', textAlign: 'center' }}>
                <h3>Awaiting Data</h3>
                <p>Upload a CSV file to see your Anexo J table.</p>
              </div>
            )}
          </div>

        </div>
      </main>
      <Footer />
      <Analytics />
      <SpeedInsights />
    </div>
  );
}

export default App;
