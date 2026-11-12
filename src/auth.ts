import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import type { Provider } from "next-auth/providers";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/db";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: "USER" | "ADMIN" } & DefaultSession["user"];
  }
}

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}

const credentialsSchema = z.object({ email: z.email(), password: z.string().min(8).max(200) });

const providers: Provider[] = [
  Credentials({
    id: "credentials",
    name: "Email",
    credentials: { email: {}, password: {} },
    async authorize(raw) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;
      const email = parsed.data.email.toLowerCase();
      const [user] = await db.select().from(s.users).where(eq(s.users.email, email));
      if (!user?.passwordHash) return null;
      const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
      return ok ? { id: user.id, email: user.email, name: user.name } : null;
    },
  }),
];

// OAuth providers are enabled only when their keys are present (no fake buttons).
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) providers.push(Google({ allowDangerousEmailAccountLinking: false }));
if (process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET) providers.push(Apple);

export const enabledOAuth = {
  google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
  apple: Boolean(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET),
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: s.users,
    accountsTable: s.accounts,
    sessionsTable: s.sessions,
    verificationTokensTable: s.verificationTokens,
  }),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      if (token.uid) {
        // Role is read from the DB so admin rights can be granted or revoked without re-login.
        const [row] = await db.select({ role: s.users.role }).from(s.users).where(eq(s.users.id, String(token.uid)));
        token.role = row?.role ?? "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid) session.user.id = String(token.uid);
      session.user.role = (token.role as "USER" | "ADMIN") ?? "USER";
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // OAuth sign-up path: promote listed admin emails.
      if (user.id && isAdminEmail(user.email)) {
        await db.update(s.users).set({ role: "ADMIN" }).where(eq(s.users.id, user.id));
      }
    },
  },
});
