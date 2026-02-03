import {
  boolean,
  date,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Admin users table - standalone authentication
 * Stores admin credentials for independent deployment
 */
export const adminUsers = mysqlTable("admin_users", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  fullName: varchar("full_name", { length: 100 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastLoginAt: timestamp("lastLoginAt"),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;

/**
 * Panels table - tracks betting exchange panels
 */
export const panels = mysqlTable("panels", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  pointsBalance: int("pointsBalance").notNull().default(0), // Real-time point inventory
  openingBalance: int("openingBalance").notNull().default(0),
  closingBalance: int("closingBalance").notNull().default(0),
  topUp: int("topUp").notNull().default(0),
  extraDeposit: int("extraDeposit").notNull().default(0),
  bonusPoints: int("bonusPoints").notNull().default(0),
  profitLoss: int("profitLoss").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Panel = typeof panels.$inferSelect;
export type InsertPanel = typeof panels.$inferInsert;

/**
 * Bank accounts table - tracks bank account information
 */
export const bankAccounts = mysqlTable("bankaccounts", {
  id: int("id").autoincrement().primaryKey(),
  accountHolderName: varchar("accountHolderName", { length: 200 }).notNull(),
  accountNumber: varchar("accountNumber", { length: 50 }).notNull().unique(),
  bankName: varchar("bankName", { length: 200 }).notNull(),
  accountType: mysqlEnum("accountType", ["Deposit", "Withdrawal", "Both"])
    .notNull()
    .default("Both"),
  openingBalance: int("openingBalance").notNull().default(0),
  closingBalance: int("closingBalance").notNull().default(0),
  totalCharges: int("totalCharges").notNull().default(0),
  // Transaction fees per payment method (in rupees)
  feeIMPS: int("feeIMPS").notNull().default(0),
  feeRTGS: int("feeRTGS").notNull().default(0),
  feeNEFT: int("feeNEFT").notNull().default(0),
  feeUPI: int("feeUPI").notNull().default(0),
  feePhonePe: int("feePhonePe").notNull().default(0),
  feeGooglePay: int("feeGooglePay").notNull().default(0),
  feePaytm: int("feePaytm").notNull().default(0),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankAccount = typeof bankAccounts.$inferInsert;

/**
 * Players table - tracks player information
 */
export const players = mysqlTable("players", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("userId", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 200 }),
  panelName: varchar("panelName", { length: 100 }).notNull(),
  balance: decimal("balance", { precision: 15, scale: 2 })
    .default("0.00")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Player = typeof players.$inferSelect;
export type InsertPlayer = typeof players.$inferInsert;

/**
 * Deposits table - tracks all deposit transactions
 */
export const deposits = mysqlTable("deposits", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("userId", { length: 100 }).notNull(),
  amount: int("amount").notNull(),
  utr: varchar("utr", { length: 100 }),
  accountNumber: varchar("accountNumber", { length: 50 }),
  bankName: varchar("bankName", { length: 200 }),
  panelName: varchar("panelName", { length: 100 }).notNull(),
  bonusPoints: int("bonusPoints").notNull().default(0),
  isExtraDeposit: int("isExtraDeposit").notNull().default(0),
  isWrongDeposit: int("isWrongDeposit").notNull().default(0),
  depositDate: timestamp("depositDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Deposit = typeof deposits.$inferSelect;
export type InsertDeposit = typeof deposits.$inferInsert;

/**
 * Withdrawals table - tracks all withdrawal transactions
 */
export const withdrawals = mysqlTable("withdrawals", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("userId", { length: 100 }).notNull(),
  amount: int("amount").notNull(),
  utr: varchar("utr", { length: 100 }),
  accountNumber: varchar("accountNumber", { length: 50 }),
  bankName: varchar("bankName", { length: 200 }),
  panelName: varchar("panelName", { length: 100 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", [
    "IMPS",
    "RTGS",
    "NEFT",
    "UPI",
    "PhonePe",
    "GooglePay",
    "Paytm",
  ]),
  transactionCharge: int("transactionCharge").notNull().default(0),
  isExtraWithdrawal: int("isExtraWithdrawal").notNull().default(0),
  isWrongWithdrawal: int("isWrongWithdrawal").notNull().default(0),
  status: mysqlEnum("status", ["pending", "approved", "rejected"])
    .default("pending")
    .notNull(),
  withdrawalDate: timestamp("withdrawalDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Withdrawal = typeof withdrawals.$inferSelect;
export type InsertWithdrawal = typeof withdrawals.$inferInsert;

/**
 * Gameplay Transactions table - tracks player wins and losses from external gameplay
 */
export const gameplayTransactions = mysqlTable("gameplayTransactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("userId", { length: 100 }).notNull(),
  panelName: varchar("panelName", { length: 100 }).notNull(),
  transactionType: mysqlEnum("transactionType", ["Win", "Loss"]).notNull(),
  amount: int("amount").notNull(),
  notes: text("notes"),
  transactionDate: timestamp("transactionDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GameplayTransaction = typeof gameplayTransactions.$inferSelect;
export type InsertGameplayTransaction =
  typeof gameplayTransactions.$inferInsert;

/**
 * Transactions table - comprehensive ledger for all financial movements
 */
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", [
    "deposit",
    "withdrawal",
    "incoming",
    "outgoing",
  ]).notNull(),
  amount: int("amount").notNull(),
  utr: varchar("utr", { length: 100 }),
  bankAccountId: int("bankAccountId"),
  panelName: varchar("panelName", { length: 100 }),
  userId: varchar("userId", { length: 100 }),
  description: text("description"),
  transactionDate: timestamp("transactionDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

/**
 * Sessions table - tracks user sessions for authentication
 */
export const sessions = mysqlTable("sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("userId", { length: 100 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

/**
 * Logs table - application audit logs
 */
export const logs = mysqlTable("logs", {
  id: int("id").autoincrement().primaryKey(),
  level: mysqlEnum("level", ["debug", "info", "warn", "error"]).notNull(),
  message: text("message").notNull(),
  userId: varchar("userId", { length: 100 }),
  action: varchar("action", { length: 100 }),
  resource: varchar("resource", { length: 100 }),
  resourceId: int("resourceId"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  metadata: text("metadata"), // JSON string
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Log = typeof logs.$inferSelect;
export type InsertLog = typeof logs.$inferInsert;

/**
 * Audit trail table - tracks all CRUD operations
 */
export const auditTrail = mysqlTable("audit_trail", {
  id: int("id").autoincrement().primaryKey(),
  tableName: varchar("tableName", { length: 100 }).notNull(),
  recordId: int("recordId").notNull(),
  action: mysqlEnum("action", ["CREATE", "UPDATE", "DELETE"]).notNull(),
  oldValues: text("oldValues"), // JSON string
  newValues: text("newValues"), // JSON string
  userId: varchar("userId", { length: 100 }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type AuditTrail = typeof auditTrail.$inferSelect;
export type InsertAuditTrail = typeof auditTrail.$inferInsert;

/**
 * Notifications table - user notifications
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("userId", { length: 100 }),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  type: mysqlEnum("type", ["info", "success", "warning", "error"]).default("info").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  actionUrl: varchar("actionUrl", { length: 500 }),
  metadata: text("metadata"), // JSON string
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  readAt: timestamp("readAt"),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Settings table - application settings
 */
export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["string", "number", "boolean", "json"]).default("string").notNull(),
  category: varchar("category", { length: 50 }).default("general").notNull(),
  isPublic: boolean("isPublic").default(false).notNull(), // Whether setting is exposed to frontend
  updatedBy: varchar("updatedBy", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;

/**
 * Roles table - user roles and permissions
 */
export const roles = mysqlTable("roles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  displayName: varchar("displayName", { length: 100 }).notNull(),
  description: text("description"),
  permissions: text("permissions").notNull(), // JSON array of permissions
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;

/**
 * User roles table - assigns roles to either OAuth users (users.openId) OR standalone admins (admin_users.username)
 */
export const userRoles = mysqlTable("user_roles", {
  id: int("id").autoincrement().primaryKey(),
  oauthOpenId: varchar("oauthOpenId", { length: 64 }),
  adminUsername: varchar("adminUsername", { length: 50 }),
  roleId: int("roleId").notNull(),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  assignedBy: varchar("assignedBy", { length: 100 }),
});

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = typeof userRoles.$inferInsert;

/**
 * Daily reports table - stores aggregated daily report data
 */
export const dailyReports = mysqlTable("dailyreports", {
  id: int("id").autoincrement().primaryKey(),
  reportDate: timestamp("reportDate").notNull(),
  totalDeposits: int("totalDeposits").notNull().default(0),
  totalWithdrawals: int("totalWithdrawals").notNull().default(0),
  totalProfitLoss: int("totalProfitLoss").notNull().default(0),
  numberOfDeposits: int("numberOfDeposits").notNull().default(0),
  numberOfWithdrawals: int("numberOfWithdrawals").notNull().default(0),
  uniquePlayersDeposited: int("uniquePlayersDeposited").notNull().default(0),
  uniquePlayersWithdrew: int("uniquePlayersWithdrew").notNull().default(0),
  newIdsCreated: int("newIdsCreated").notNull().default(0),
  reportData: text("reportData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DailyReport = typeof dailyReports.$inferSelect;
export type InsertDailyReport = typeof dailyReports.$inferInsert;

/**
 * Panel daily balances table - tracks daily balance snapshots for each panel
 */
export const panelDailyBalances = mysqlTable("paneldailybalances", {
  id: int("id").autoincrement().primaryKey(),
  panelId: int("panelId").notNull(),
  date: date("date").notNull(),
  openingBalance: decimal("openingBalance", { precision: 15, scale: 2 }).notNull().default("0.00"),
  closingBalance: decimal("closingBalance", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalDeposits: decimal("totalDeposits", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalWithdrawals: decimal("totalWithdrawals", { precision: 15, scale: 2 }).notNull().default("0.00"),
  bonusPoints: decimal("bonusPoints", { precision: 15, scale: 2 }).notNull().default("0.00"),
  topUp: decimal("topUp", { precision: 15, scale: 2 }).notNull().default("0.00"),
  extraDeposit: decimal("extraDeposit", { precision: 15, scale: 2 }).notNull().default("0.00"),
  profitLoss: decimal("profitLoss", { precision: 15, scale: 2 }).notNull().default("0.00"),
  timezone: varchar("timezone", { length: 20 }).notNull().default("GMT+5:30"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PanelDailyBalance = typeof panelDailyBalances.$inferSelect;
export type InsertPanelDailyBalance = typeof panelDailyBalances.$inferInsert;

/**
 * Top-up history table - tracks all top-up transactions
 */
export const topUpHistory = mysqlTable("topuphistory", {
  id: int("id").autoincrement().primaryKey(),
  panelId: int("panelId").notNull(),
  panelName: varchar("panelName", { length: 100 }).notNull(),
  previousTopUp: int("previousTopUp").notNull().default(0),
  amountAdded: int("amountAdded").notNull().default(0),
  newTopUp: int("newTopUp").notNull().default(0),
  previousClosingBalance: int("previousClosingBalance").notNull().default(0),
  newClosingBalance: int("newClosingBalance").notNull().default(0),
  previousPointsBalance: int("previousPointsBalance").notNull().default(0),
  newPointsBalance: int("newPointsBalance").notNull().default(0),
  createdBy: varchar("createdBy", { length: 100 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TopUpHistory = typeof topUpHistory.$inferSelect;
export type InsertTopUpHistory = typeof topUpHistory.$inferInsert;
