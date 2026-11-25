// The pre-consultation questionnaire. Shared by the booking form (client) and the server action.
import { z } from "zod";

export const PREF_FAMILIES = ["FLORAL", "WOODY", "CITRUS", "FRESH", "ORIENTAL", "GOURMAND", "SPICY", "MUSKY", "UNSURE"] as const;
export const PURPOSES = ["EVERYDAY", "SPECIAL", "WORK", "EVENING", "SIGNATURE", "DATE", "GIFT"] as const;

export const questionnaireSchema = z.object({
  age: z.number().int().min(14).max(100),
  families: z.array(z.enum(PREF_FAMILIES)).min(1).max(PREF_FAMILIES.length),
  purposes: z.array(z.enum(PURPOSES)).min(1).max(PURPOSES.length),
  likes: z.string().trim().max(500).default(""),
  dislikes: z.string().trim().max(500).default(""),
  extra: z.string().trim().max(1000).default(""),
  perfumeName: z.string().trim().max(60).default(""),
});

export type Questionnaire = z.infer<typeof questionnaireSchema>;

export function parseQuestionnaire(json: string): Questionnaire | null {
  try {
    const r = questionnaireSchema.safeParse(JSON.parse(json));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}
