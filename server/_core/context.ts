import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

async function authenticateStandaloneAdmin(
  req: CreateExpressContextOptions["req"]
): Promise<User | null> {
  const cookies = (
    req as unknown as { cookies?: Record<string, string | undefined> }
  ).cookies;
  const adminIdRaw = cookies?.admin_session;
  if (!adminIdRaw) return null;

  const adminId = Number(adminIdRaw);
  if (!Number.isFinite(adminId)) return null;

  const { getAdminUserById } = await import("../standalone-auth");
  const admin = await getAdminUserById(adminId);
  if (!admin || !admin.isActive) return null;

  const now = new Date();

  return {
    id: admin.id,
    openId: `admin:${admin.id}`,
    name: admin.username, // Use username as the name field
    email: admin.email,
    loginMethod: "standalone", // Standalone admin authentication
    role: "admin" as const,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
    lastSignedIn: admin.lastLoginAt || now,
  };
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Only use standalone authentication - OAuth is disabled
    user = await authenticateStandaloneAdmin(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
