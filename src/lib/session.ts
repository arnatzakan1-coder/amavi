import "server-only";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema as s } from "@/db";

export async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const [u] = await db.select().from(s.users).where(eq(s.users.id, session.user.id));
  return u ?? null;
}

export async function requireUser(next = "/account") {
  const u = await currentUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}

/** Role is always checked against the database, never only the token. */
export async function requireAdmin() {
  const u = await currentUser();
  if (!u) redirect("/login?next=/admin");
  if (u.role !== "ADMIN") redirect("/");
  return u;
}

export async function assertAdmin() {
  const u = await currentUser();
  if (!u || u.role !== "ADMIN") throw new Error("FORBIDDEN");
  return u;
}

export const isStaffRole = (role: string | null | undefined) => role === "ADMIN" || role === "PERFUMER";

/** Perfumers and administrators: bookings, client questionnaires and formulas. */
export async function requireStaff(next = "/admin") {
  const u = await currentUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!isStaffRole(u.role)) redirect("/");
  return u;
}

export async function assertStaff() {
  const u = await currentUser();
  if (!u || !isStaffRole(u.role)) throw new Error("FORBIDDEN");
  return u;
}
