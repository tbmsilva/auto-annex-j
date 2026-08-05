import React, { useCallback, useState } from 'react';

interface DropzoneProps {
  onFileLoaded: (file: { name: string, content: string }) => void;
  onError: (error: string) => void;
}

export function Dropzone({ onFileLoaded, onError }: DropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      onError('Please upload a valid CSV file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        onFileLoaded({ name: file.name, content: text });
      }
    };
    reader.onerror = () => {
      onError('Error reading the file.');
    };
    reader.readAsText(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [onFileLoaded, onError]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      document.getElementById('file-upload')?.click();
    }
  };

  return (
    <div 
      className={`dropzone ${isDragActive ? 'active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-upload')?.click()}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Upload Trading212 CSV file"
    >
      <input 
        id="file-upload" 
        type="file" 
        accept=".csv" 
        className="visually-hidden" 
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      <div className="dropzone-icon" aria-hidden="true">📄</div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
        Drag & Drop your Trading212 CSV here
      </h3>
      <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.95rem' }}>
        or click to browse from your computer
      </p>
    </div>
  );
}
