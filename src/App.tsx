import { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Dropzone } from './components/Dropzone';
import { ResultsTable } from './components/ResultsTable';
import { parseMultipleCSVs, type AnexoJRow } from './utils/fifoParser';
import { getFiles, addFile, removeFile, clearFiles, type CsvFile } from './utils/db';

function App() {
  const [results, setResults] = useState<AnexoJRow[] | null>(null);
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
        const parsedData = await parseMultipleCSVs(contents);
        setResults(parsedData);
      } else {
        setResults(null);
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
                  <h3 style={{ margin: 0 }}>Uploaded Files ({files.length})</h3>
                  <button onClick={handleClearAll} style={{ background: 'transparent', color: 'var(--danger)', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    Clear All
                  </button>
                </div>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {files.map(f => (
                    <li key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.9rem', wordBreak: 'break-all' }}>📄 {f.name}</span>
                      <button onClick={() => handleDeleteFile(f.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1.2rem' }} title="Remove file">
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

            {!isProcessing && results && (
              <ResultsTable data={results} />
            )}

            {!isProcessing && !results && files.length === 0 && (
              <div className="glass-panel empty-state" style={{ padding: '4rem', textAlign: 'center' }}>
                <h3>Awaiting Data</h3>
                <p>Upload a CSV file to see your Anexo J table.</p>
              </div>
            )}
          </div>

        </div>
      </main>
      <Analytics />
      <SpeedInsights />
    </div>
  );
}

export default App;
