import bcrypt from "bcrypt";
import NextAuth from "next-auth";
import type { DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

export type AppRole = "OWNER" | "ADMIN" | "DOKTER" | "CUSTOMER";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: AppRole;
      name: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    username: string;
    role: AppRole;
    name: string;
  }
}

declare module "next-auth" {
  interface JWT {
    id?: string;
    username?: string;
    role?: AppRole;
    name?: string;
  }
}

export type AppSession = {
  user: {
    id: string;
    username: string;
    role: AppRole;
    name: string;
  };
};

const maxAttempts = Number.parseInt(process.env.LOGIN_MAX_ATTEMPTS ?? "5", 10);
const lockoutMinutes = Number.parseInt(
  process.env.LOGIN_LOCKOUT_MINUTES ?? "15",
  10,
);

async function authorizeWithCredentials(credentials: Record<"username" | "pin", unknown>) {
  const username = typeof credentials.username === "string" ? credentials.username : "";
  const pin = typeof credentials.pin === "string" ? credentials.pin : "";

  if (!username || !pin) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      pinHash: true,
      role: true,
      name: true,
      isActive: true,
      failedLoginCount: true,
      lockedUntil: true,
    },
  });

  if (!user) {
    return null;
  }

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    return null;
  }

  if (user.lockedUntil && user.lockedUntil <= now) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
  }

  if (!user.isActive) {
    return null;
  }

  const isPinValid = await bcrypt.compare(pin, user.pinHash);
  if (!isPinValid) {
    const nextFailedLoginCount = user.failedLoginCount + 1;
    const lockedUntil =
      nextFailedLoginCount >= maxAttempts
        ? new Date(Date.now() + lockoutMinutes * 60_000)
        : null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: nextFailedLoginCount,
        ...(lockedUntil ? { lockedUntil } : {}),
      },
    });

    return null;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null },
  });

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
  };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        pin: { label: "PIN", type: "password" },
      },
      async authorize(credentials) {
        const user = await authorizeWithCredentials(credentials as Record<"username" | "pin", unknown>);
        if (!user) {
          return null;
        }
        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.username = String(token.username ?? "");
        session.user.role = (token.role as AppRole) ?? "CUSTOMER";
        session.user.name = String(token.name ?? "");
      }
      return session;
    },
  },
});

export { authorizeWithCredentials };
