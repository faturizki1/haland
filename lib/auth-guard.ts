import { auth, type AppRole, type AppSession } from "./auth";

export type { AppRole };

export async function requireAuth(): Promise<AppSession> {
  const session = await auth();
  const appSession = session as AppSession | null;

  if (!appSession) {
    throw new Error("UNAUTHORIZED");
  }

  return appSession;
}

export async function requireRole(allowedRoles: AppRole[]): Promise<AppSession> {
  const session = await requireAuth();

  if (!allowedRoles.includes(session.user.role)) {
    throw new Error("UNAUTHORIZED");
  }

  return session;
}

export async function requireOwner(): Promise<AppSession> {
  return requireRole(["OWNER"]);
}

export async function requireAdmin(): Promise<AppSession> {
  return requireRole(["OWNER", "ADMIN"]);
}

export async function requireDoctor(): Promise<AppSession> {
  return requireRole(["DOKTER"]);
}

export async function requireStaff(): Promise<AppSession> {
  return requireRole(["OWNER", "ADMIN", "DOKTER"]);
}
