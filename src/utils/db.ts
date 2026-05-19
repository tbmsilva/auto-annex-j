import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface CsvFile {
  id: string; // use filename or timestamp
  name: string;
  content: string;
  uploadedAt: number;
}

interface AutoAnnexJDB extends DBSchema {
  files: {
    key: string;
    value: CsvFile;
    indexes: { 'by-date': number };
  };
}

const DB_NAME = 'auto-annex-j-db';
const STORE_NAME = 'files';

let dbPromise: Promise<IDBPDatabase<AutoAnnexJDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<AutoAnnexJDB>(DB_NAME, 1, {
      upgrade(db) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
        });
        store.createIndex('by-date', 'uploadedAt');
      },
    });
  }
  return dbPromise;
}

export async function addFile(name: string, content: string): Promise<CsvFile> {
  const db = await getDb();
  // Ensure unique ID in case of duplicate names
  const id = `${Date.now()}-${name}`;
  const file: CsvFile = { id, name, content, uploadedAt: Date.now() };
  await db.put(STORE_NAME, file);
  return file;
}

export async function getFiles(): Promise<CsvFile[]> {
  const db = await getDb();
  return db.getAllFromIndex(STORE_NAME, 'by-date');
}

export async function removeFile(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}

export async function clearFiles(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE_NAME);
}
