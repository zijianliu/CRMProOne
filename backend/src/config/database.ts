import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';

let db: Database | null = null;
const DB_PATH = path.join(__dirname, '../../../data/database.db');

export async function initDatabase(): Promise<Database> {
  if (db) {
    return db;
  }

  const SQL = await initSqlJs();
  
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  createTables(db);
  
  return db;
}

function createTables(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      displayName TEXT NOT NULL,
      role TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      submitter TEXT NOT NULL,
      assignee TEXT,
      priority TEXT NOT NULL,
      status TEXT NOT NULL,
      responseDeadline TEXT NOT NULL,
      resolutionDeadline TEXT NOT NULL,
      responseTime TEXT,
      resolutionTime TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  try {
    db.run(`ALTER TABLE tickets ADD COLUMN assignee TEXT`);
  } catch (e) {
  }

  try {
    db.run(`ALTER TABLE tickets ADD COLUMN responseDeadline TEXT`);
  } catch (e) {
  }

  try {
    db.run(`ALTER TABLE tickets ADD COLUMN resolutionDeadline TEXT`);
  } catch (e) {
  }

  try {
    db.run(`ALTER TABLE tickets ADD COLUMN responseTime TEXT`);
  } catch (e) {
  }

  try {
    db.run(`ALTER TABLE tickets ADD COLUMN resolutionTime TEXT`);
  } catch (e) {
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      ticketId TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      isRead INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (ticketId) REFERENCES tickets(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      ticketId TEXT NOT NULL,
      content TEXT NOT NULL,
      author TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (ticketId) REFERENCES tickets(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      ticketId TEXT NOT NULL,
      fileName TEXT NOT NULL,
      originalName TEXT NOT NULL,
      fileSize INTEGER NOT NULL,
      mimeType TEXT NOT NULL,
      uploadedBy TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (ticketId) REFERENCES tickets(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS action_logs (
      id TEXT PRIMARY KEY,
      ticketId TEXT NOT NULL,
      actionType TEXT NOT NULL,
      operator TEXT NOT NULL,
      oldValue TEXT,
      newValue TEXT,
      description TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (ticketId) REFERENCES tickets(id)
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_tickets_createdAt ON tickets(createdAt)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON tickets(assignee)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_comments_ticketId ON comments(ticketId)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_attachments_ticketId ON attachments(ticketId)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_action_logs_ticketId ON action_logs(ticketId)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_action_logs_createdAt ON action_logs(createdAt)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications(userId)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_notifications_ticketId ON notifications(ticketId)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_notifications_isRead ON notifications(isRead)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_tickets_submitter ON tickets(submitter)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_tickets_responseDeadline ON tickets(responseDeadline)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_tickets_resolutionDeadline ON tickets(resolutionDeadline)
  `);
}

export function saveDatabase(): void {
  if (!db) return;
  
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}
