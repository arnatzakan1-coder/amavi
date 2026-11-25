import { createHash } from "node:crypto";

// Owner account(s), stored as SHA-256 of the lower-cased email so the address is not
// published in the code. Signing up or signing in with it gives the ADMIN role.
export const OWNER_EMAIL_SHA256 = [
  "f1d6b21df378b83a55b0afea264cc92fc7150aba1d937a06bf282f38898540cf",
  "422a5a8e2f6c89ef7dc95261650e37b9cf6d0d082cffccf66afbe51f46170b5d",
];

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  const list = (process.env.ADMIN_EMAILS ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (list.includes(e)) return true;
  return OWNER_EMAIL_SHA256.includes(createHash("sha256").update(e).digest("hex"));
}

