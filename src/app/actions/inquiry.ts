"use server";
import { z } from "zod";
import { headers } from "next/headers";
import { db, schema as s } from "@/db";
import { normalizeKzPhone } from "@/lib/phone";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().max(30),
  email: z.union([z.email().max(200), z.literal("")]).optional(),
  message: z.string().trim().min(1).max(1500),
  website: z.string().max(0).optional(), // honeypot
});

const recent = new Map<string, number[]>();

export type InquiryState = { ok?: boolean; error?: "INPUT" | "PHONE" | "RATE" } | undefined;

export async function sendInquiry(_: InquiryState, form: FormData): Promise<InquiryState> {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "INPUT" };
  const phone = normalizeKzPhone(parsed.data.phone);
  if (!phone) return { error: "PHONE" };

  // Simple per-IP throttle (5 / 10 min) for a single-instance deployment.
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  if (hits.length >= 5) return { error: "RATE" };
  recent.set(ip, [...hits, now]);

  await db.insert(s.inquiries).values({ name: parsed.data.name, phone, email: parsed.data.email || null, message: parsed.data.message });
  return { ok: true };
}
