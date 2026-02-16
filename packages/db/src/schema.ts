import { pgTable, text, timestamp, uuid, varchar, integer, boolean, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Status Pages table (workspaces)
export const statusPages = pgTable('status_pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  subdomain: varchar('subdomain', { length: 63 }).notNull().unique(),
  logoUrl: text('logo_url'),
  primaryColor: varchar('primary_color', { length: 7 }).default('#3b82f6'),
  customDomain: varchar('custom_domain', { length: 255 }),
  customDomainVerified: boolean('custom_domain_verified').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Components (services being monitored)
export const components = pgTable('components', {
  id: uuid('id').primaryKey().defaultRandom(),
  statusPageId: uuid('status_page_id').notNull().references(() => statusPages.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull().default('http'), // http, https, tcp, icmp
  url: text('url').notNull(),
  checkInterval: integer('check_interval').notNull().default(60), // seconds
  status: varchar('status', { length: 20 }).notNull().default('operational'), // operational, degraded, down, maintenance
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Incidents
export const incidents = pgTable('incidents', {
  id: uuid('id').primaryKey().defaultRandom(),
  statusPageId: uuid('status_page_id').notNull().references(() => statusPages.id, { onDelete: 'cascade' }),
  componentId: uuid('component_id').references(() => components.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('investigating'), // investigating, identified, monitoring, resolved
  severity: varchar('severity', { length: 20 }).notNull().default('minor'), // minor, major, critical
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at'),
});

// Subscribers
export const subscribers = pgTable('subscribers', {
  id: uuid('id').primaryKey().defaultRandom(),
  statusPageId: uuid('status_page_id').notNull().references(() => statusPages.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  verified: boolean('verified').notNull().default(false),
  verificationToken: varchar('verification_token', { length: 64 }),
  subscribedAt: timestamp('subscribed_at').notNull().defaultNow(),
  unsubscribedAt: timestamp('unsubscribed_at'),
});

// Uptime Checks (history)
export const uptimeChecks = pgTable('uptime_checks', {
  id: uuid('id').primaryKey().defaultRandom(),
  componentId: uuid('component_id').notNull().references(() => components.id, { onDelete: 'cascade' }),
  statusCode: integer('status_code'),
  responseTimeMs: integer('response_time_ms'),
  success: boolean('success').notNull(),
  errorMessage: text('error_message'),
  checkedAt: timestamp('checked_at').notNull().defaultNow(),
});

// Subscriptions (billing)
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tier: varchar('tier', { length: 20 }).notNull().default('free'), // free, pro, business
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, canceled, past_due
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  statusPages: many(statusPages),
  subscription: one(subscriptions, {
    fields: [users.id],
    references: [subscriptions.userId],
  }),
}));

export const statusPagesRelations = relations(statusPages, ({ one, many }) => ({
  user: one(users, {
    fields: [statusPages.userId],
    references: [users.id],
  }),
  components: many(components),
  incidents: many(incidents),
  subscribers: many(subscribers),
}));

export const componentsRelations = relations(components, ({ one, many }) => ({
  statusPage: one(statusPages, {
    fields: [components.statusPageId],
    references: [statusPages.id],
  }),
  uptimeChecks: many(uptimeChecks),
  incidents: many(incidents),
}));

export const incidentsRelations = relations(incidents, ({ one }) => ({
  statusPage: one(statusPages, {
    fields: [incidents.statusPageId],
    references: [statusPages.id],
  }),
  component: one(components, {
    fields: [incidents.componentId],
    references: [components.id],
  }),
}));

export const subscribersRelations = relations(subscribers, ({ one }) => ({
  statusPage: one(statusPages, {
    fields: [subscribers.statusPageId],
    references: [statusPages.id],
  }),
}));

export const uptimeChecksRelations = relations(uptimeChecks, ({ one }) => ({
  component: one(components, {
    fields: [uptimeChecks.componentId],
    references: [components.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type StatusPage = typeof statusPages.$inferSelect;
export type NewStatusPage = typeof statusPages.$inferInsert;
export type Component = typeof components.$inferSelect;
export type NewComponent = typeof components.$inferInsert;
export type Incident = typeof incidents.$inferSelect;
export type NewIncident = typeof incidents.$inferInsert;
export type Subscriber = typeof subscribers.$inferSelect;
export type NewSubscriber = typeof subscribers.$inferInsert;
export type UptimeCheck = typeof uptimeChecks.$inferSelect;
export type NewUptimeCheck = typeof uptimeChecks.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
