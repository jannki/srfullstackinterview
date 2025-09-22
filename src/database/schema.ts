import { sql } from 'drizzle-orm';
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['trainer', 'trainee'] }).notNull(),
  fullName: text('full_name').notNull(),
  phoneNumber: text('phone_number').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
});

export const trainers = sqliteTable('trainers', {
  userId: integer('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  bio: text('bio'),
  experienceYears: integer('experience_years'),
  timezone: text('timezone'),
  specialties: text('specialties'),
  defaultPlanId: integer('default_plan_id'),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
});

export const trainees = sqliteTable('trainees', {
  userId: integer('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  goals: text('goals'),
  injuries: text('injuries'),
  preferredSchedule: text('preferred_schedule'),
  invitedByTrainerId: integer('invited_by_trainer_id'),
  phoneVerifiedAt: integer('phone_verified_at'),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
});

export const plans = sqliteTable('plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  trainerId: integer('trainer_id')
    .notNull()
    .references(() => trainers.userId, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull(),
  priceCents: integer('price_cents').notNull(),
  currency: text('currency').notNull().default('USD'),
  features: text('features'),
  isActive: integer('is_active').notNull().default(1),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
});

export const invitations = sqliteTable('invitations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  trainerId: integer('trainer_id')
    .notNull()
    .references(() => trainers.userId, { onDelete: 'cascade' }),
  phoneNumber: text('phone_number').notNull(),
  token: text('token').notNull().unique(),
  status: text('status', { enum: ['pending', 'accepted', 'expired', 'cancelled'] })
    .notNull()
    .default('pending'),
  expiresAt: integer('expires_at').notNull(),
  acceptedByTraineeId: integer('accepted_by_trainee_id'),
  selectedPlanId: integer('selected_plan_id'),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
});

export const traineePlans = sqliteTable('trainee_plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  traineeId: integer('trainee_id')
    .notNull()
    .references(() => trainees.userId, { onDelete: 'cascade' }),
  trainerId: integer('trainer_id')
    .notNull()
    .references(() => trainers.userId, { onDelete: 'cascade' }),
  planId: integer('plan_id')
    .notNull()
    .references(() => plans.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['active', 'inactive'] })
    .notNull()
    .default('active'),
  activatedAt: integer('activated_at')
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  deactivatedAt: integer('deactivated_at'),
});

export const chats = sqliteTable('chats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  trainerId: integer('trainer_id')
    .notNull()
    .references(() => trainers.userId, { onDelete: 'cascade' }),
  traineeId: integer('trainee_id')
    .notNull()
    .references(() => trainees.userId, { onDelete: 'cascade' }),
  status: text('status', { enum: ['active', 'closed'] })
    .notNull()
    .default('active'),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  lastMessageAt: integer('last_message_at'),
});

export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chatId: integer('chat_id')
    .notNull()
    .references(() => chats.id, { onDelete: 'cascade' }),
  senderUserId: integer('sender_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['text', 'image', 'survey', 'system'] }).notNull(),
  textContent: text('text_content'),
  mediaUrl: text('media_url'),
  metadata: text('metadata'),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
});

export const messageLikes = sqliteTable(
  'message_likes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    messageId: integer('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
  },
  (table) => ({
    messageUserUnique: uniqueIndex('message_likes_message_user_unique').on(
      table.messageId,
      table.userId,
    ),
  }),
);

export const surveyResponses = sqliteTable('survey_responses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  messageId: integer('message_id')
    .notNull()
    .references(() => messages.id, { onDelete: 'cascade' }),
  responderUserId: integer('responder_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  answers: text('answers').notNull(),
  submittedAt: integer('submitted_at')
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
});

export const refreshTokens = sqliteTable('refresh_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
});

