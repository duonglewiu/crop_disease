import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const DB_DIR = path.resolve(__dirname, '../../../data/sqlite');
const DB_FILE = path.join(DB_DIR, 'disease_treatments.db');
const SCHEMA_FILE = path.join(DB_DIR, 'default_treatments.sql');

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    db = new Database(DB_FILE);

    // Tạo bảng nếu chưa tồn tại
    if (fs.existsSync(SCHEMA_FILE)) {
      const schemaSql = fs.readFileSync(SCHEMA_FILE, 'utf-8');
      db.exec(schemaSql);
    }
  }
  return db;
}

export function getOfflineTreatment(cropName: string, diseaseName: string, severity: number) {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT * FROM DiseaseTreatments 
    WHERE crop_name = ? AND disease_name = ? 
    LIMIT 1
  `);
  const record = stmt.get(cropName, diseaseName);

  if (record) {
    return {
      status: "success",
      source: "Offline SQLite Database (better-sqlite3)",
      data: record
    };
  }

  return {
    status: "not_found",
    source: "Offline SQLite Database",
    message: "Chưa có dữ liệu tĩnh cho loại bệnh này. Vui lòng kết nối mạng để sử dụng Server RAG."
  };
}

