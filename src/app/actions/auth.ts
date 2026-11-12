"use server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { AuthError } from "next-auth";
import { signIn, signOut, isAdminEmail } from "@/auth";
import { db, schema as s } from "@/db";
import { getLocale } from "@/i18n/server";

const safeNext = (v: FormDataEntryValue | null) => {
  const n = typeof v === "string" ? v : "/account";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/account";
};

export type AuthState = { error?: "invalid" | "exists" | "validation"; fields?: Record<string, string> } | undefined;

export async function loginAction(_: AuthState, form: FormData): Promise<AuthState> {
  try {
    await signIn("credentials", {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      redirectTo: safeNext(form.get("next")),
    });
  } catch (e) {
    if (e instanceof AuthError) return { error: "invalid", fields: { email: String(form.get("email") ?? "") } };
    throw e; // redirect
  }
}

const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.email().max(200),
  password: z.string().min(8).max(200),
});

export async function registerAction(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    name: form.get("name"),
    email: String(form.get("email") ?? "").toLowerCase().trim(),
    password: form.get("password"),
  });
  const fields = { name: String(form.get("name") ?? ""), email: String(form.get("email") ?? "") };
  if (!parsed.success) return { error: "validation", fields };

  const [existing] = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.email, parsed.data.email));
  if (existing) return { error: "exists", fields };

  await db.insert(s.users).values({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash: await bcrypt.hash(parsed.data.password, 12),
    role: isAdminEmail(parsed.data.email) ? "ADMIN" : "USER",
    locale: await getLocale(),
  });

  await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, redirectTo: safeNext(form.get("next")) });
}

export async function oauthAction(form: FormData) {
  const provider = String(form.get("provider"));
  if (provider !== "google" && provider !== "apple") return;
  await signIn(provider, { redirectTo: safeNext(form.get("next")) });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
