import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { getDatabase, saveDatabase } from '../config/database';
import { 
  Attachment, 
  MAX_ATTACHMENTS_PER_TICKET, 
  MAX_ATTACHMENT_SIZE,
  ALLOWED_ATTACHMENT_TYPES,
  ALLOWED_ATTACHMENT_EXTENSIONS
} from '../types';

const UPLOAD_DIR = path.join(__dirname, '../../../data/uploads');

function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function rowToAttachment(row: any[]): Attachment {
  return {
    id: row[0],
    ticketId: row[1],
    fileName: row[2],
    originalName: row[3],
    fileSize: row[4],
    mimeType: row[5],
    uploadedBy: row[6],
    createdAt: new Date(row[7])
  };
}

export function validateAttachment(
  fileName: string,
  fileSize: number,
  mimeType: string
): { valid: boolean; error?: string } {
  if (fileSize > MAX_ATTACHMENT_SIZE) {
    return {
      valid: false,
      error: `文件大小超出限制，最大允许 ${MAX_ATTACHMENT_SIZE / 1024 / 1024}MB`
    };
  }

  const ext = path.extname(fileName).toLowerCase();
  if (!ALLOWED_ATTACHMENT_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `文件类型不允许，只允许：${ALLOWED_ATTACHMENT_EXTENSIONS.join(', ')}`
    };
  }

  if (mimeType && !ALLOWED_ATTACHMENT_TYPES.includes(mimeType.toLowerCase())) {
    return {
      valid: false,
      error: `文件类型不允许`
    };
  }

  return { valid: true };
}

export async function getAttachmentCountByTicketId(ticketId: string): Promise<number> {
  const db = getDatabase();
  const result = db.exec(
    'SELECT COUNT(*) FROM attachments WHERE ticketId = ?',
    [ticketId]
  );
  
  if (result.length > 0 && result[0].values.length > 0) {
    return result[0].values[0][0];
  }
  return 0;
}

export async function uploadAttachment(
  ticketId: string,
  originalName: string,
  mimeType: string,
  fileBuffer: Buffer,
  uploadedBy: string
): Promise<Attachment> {
  const db = getDatabase();
  const now = new Date();
  
  ensureUploadDir();

  const currentCount = await getAttachmentCountByTicketId(ticketId);
  if (currentCount >= MAX_ATTACHMENTS_PER_TICKET) {
    throw new Error(`单条工单最多只能上传 ${MAX_ATTACHMENTS_PER_TICKET} 个附件`);
  }

  const ext = path.extname(originalName).toLowerCase();
  const id = uuidv4();
  const fileName = `${id}${ext}`;
  const filePath = path.join(UPLOAD_DIR, fileName);

  fs.writeFileSync(filePath, fileBuffer);

  const fileSize = fileBuffer.length;

  db.run(
    `INSERT INTO attachments (id, ticketId, fileName, originalName, fileSize, mimeType, uploadedBy, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, ticketId, fileName, originalName, fileSize, mimeType, uploadedBy, now.toISOString()]
  );

  saveDatabase();

  const result = db.exec('SELECT * FROM attachments WHERE id = ?', [id]);
  if (result.length === 0 || result[0].values.length === 0) {
    throw new Error('Failed to save attachment');
  }

  return rowToAttachment(result[0].values[0]);
}

export async function getAttachmentById(id: string): Promise<Attachment | null> {
  const db = getDatabase();
  const result = db.exec('SELECT * FROM attachments WHERE id = ?', [id]);

  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }

  return rowToAttachment(result[0].values[0]);
}

export async function getAttachmentsByTicketId(ticketId: string): Promise<Attachment[]> {
  const db = getDatabase();
  const result = db.exec(
    'SELECT * FROM attachments WHERE ticketId = ? ORDER BY createdAt ASC',
    [ticketId]
  );

  const attachments: Attachment[] = [];
  if (result.length > 0) {
    for (const row of result[0].values) {
      attachments.push(rowToAttachment(row));
    }
  }

  return attachments;
}

export function getAttachmentFilePath(fileName: string): string {
  return path.join(UPLOAD_DIR, fileName);
}

export function deleteAttachment(id: string): void {
  const db = getDatabase();
  const attachment = getAttachmentById(id);
  
  if (attachment) {
    const filePath = getAttachmentFilePath((attachment as any).fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    db.run('DELETE FROM attachments WHERE id = ?', [id]);
    saveDatabase();
  }
}
