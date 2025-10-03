import { sql } from 'drizzle-orm';
import { createDatabase } from './database';

const createTableStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    avatar_url TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );`,
  `CREATE TABLE IF NOT EXISTS trainers (
    user_id INTEGER PRIMARY KEY,
    bio TEXT,
    experience_years INTEGER,
    timezone TEXT,
    specialties TEXT,
    default_plan_id INTEGER,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS trainees (
    user_id INTEGER PRIMARY KEY,
    goals TEXT,
    injuries TEXT,
    preferred_schedule TEXT,
    invited_by_trainer_id INTEGER,
    phone_verified_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trainer_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    features TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY(trainer_id) REFERENCES trainers(user_id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trainer_id INTEGER NOT NULL,
    phone_number TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    expires_at INTEGER NOT NULL,
    accepted_by_trainee_id INTEGER,
    selected_plan_id INTEGER,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY(trainer_id) REFERENCES trainers(user_id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS trainee_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trainee_id INTEGER NOT NULL,
    trainer_id INTEGER NOT NULL,
    plan_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    activated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    deactivated_at INTEGER,
    FOREIGN KEY(trainee_id) REFERENCES trainees(user_id) ON DELETE CASCADE,
    FOREIGN KEY(trainer_id) REFERENCES trainers(user_id) ON DELETE CASCADE,
    FOREIGN KEY(plan_id) REFERENCES plans(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trainer_id INTEGER NOT NULL,
    trainee_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    last_message_at INTEGER,
    FOREIGN KEY(trainer_id) REFERENCES trainers(user_id) ON DELETE CASCADE,
    FOREIGN KEY(trainee_id) REFERENCES trainees(user_id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    sender_user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    text_content TEXT,
    media_url TEXT,
    metadata TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    FOREIGN KEY(sender_user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS message_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(message_id, user_id)
  );`,
  `CREATE TABLE IF NOT EXISTS survey_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    responder_user_id INTEGER NOT NULL,
    answers TEXT NOT NULL,
    submitted_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY(responder_user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);`,
  `CREATE INDEX IF NOT EXISTS idx_messages_sender_user_id ON messages(sender_user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_message_likes_message_id ON message_likes(message_id);`,
  `CREATE INDEX IF NOT EXISTS idx_message_likes_user_id ON message_likes(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_invitations_trainer_id ON invitations(trainer_id);`,
  `CREATE INDEX IF NOT EXISTS idx_trainee_plans_trainee_id ON trainee_plans(trainee_id);`,
  `CREATE INDEX IF NOT EXISTS idx_chats_trainer_id ON chats(trainer_id);`,
  `CREATE INDEX IF NOT EXISTS idx_chats_trainee_id ON chats(trainee_id);`,
  `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);`
];

export async function initializeDatabase(path?: string) {
  const db = createDatabase(path);
  for (const statement of createTableStatements) {
    await db.run(sql.raw(statement));
  }
  return db;
}
