import { v4 as uuidv4 } from 'uuid';
import { getDatabase, saveDatabase } from '../config/database';
import { User, UserRole } from '../types';

function rowToUser(row: any[]): User {
  return {
    id: row[0],
    username: row[1],
    displayName: row[2],
    role: row[3] as UserRole,
    createdAt: new Date(row[4])
  };
}

export async function createUser(
  username: string,
  displayName: string,
  role: UserRole
): Promise<User> {
  const db = getDatabase();
  const now = new Date();
  const id = uuidv4();

  db.run(
    `INSERT INTO users (id, username, displayName, role, createdAt)
     VALUES (?, ?, ?, ?, ?)`,
    [id, username, displayName, role, now.toISOString()]
  );

  saveDatabase();

  const result = db.exec(
    'SELECT id, username, displayName, role, createdAt FROM users WHERE id = ?',
    [id]
  );
  if (result.length === 0 || result[0].values.length === 0) {
    throw new Error('Failed to create user');
  }

  return rowToUser(result[0].values[0]);
}

export async function getUserById(id: string): Promise<User | null> {
  const db = getDatabase();
  const result = db.exec(
    'SELECT id, username, displayName, role, createdAt FROM users WHERE id = ?',
    [id]
  );

  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }

  return rowToUser(result[0].values[0]);
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const db = getDatabase();
  const result = db.exec(
    'SELECT id, username, displayName, role, createdAt FROM users WHERE username = ?',
    [username]
  );

  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }

  return rowToUser(result[0].values[0]);
}

export async function getAllUsers(): Promise<User[]> {
  const db = getDatabase();
  const result = db.exec(
    'SELECT id, username, displayName, role, createdAt FROM users ORDER BY createdAt ASC'
  );

  const users: User[] = [];
  if (result.length > 0) {
    for (const row of result[0].values) {
      users.push(rowToUser(row));
    }
  }

  return users;
}

export async function getUsersByRole(role: UserRole): Promise<User[]> {
  const db = getDatabase();
  const result = db.exec(
    'SELECT id, username, displayName, role, createdAt FROM users WHERE role = ? ORDER BY createdAt ASC',
    [role]
  );

  const users: User[] = [];
  if (result.length > 0) {
    for (const row of result[0].values) {
      users.push(rowToUser(row));
    }
  }

  return users;
}

export async function getHandlers(): Promise<User[]> {
  return getUsersByRole(UserRole.HANDLER);
}

export async function getAdmins(): Promise<User[]> {
  return getUsersByRole(UserRole.ADMIN);
}
