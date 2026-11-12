// Usage: npm run make-admin -- someone@example.com
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, schema as s } from "../src/db";

async function main() {
  const email = process.argv[2]?.toLowerCase();
  if (!email) throw new Error("Pass an email: npm run make-admin -- you@example.com");
  const res = await db.update(s.users).set({ role: "ADMIN" }).where(eq(s.users.email, email)).returning({ id: s.users.id });
  console.log(res.length ? `${email} is now ADMIN` : `No user with email ${email}. Register first, then run again.`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
