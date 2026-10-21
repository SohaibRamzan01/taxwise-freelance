import { z } from "zod";

const email = z.string().trim().toLowerCase().max(254).email();
const password = z.string().max(72).refine(value => new TextEncoder().encode(value).length <= 72, "Password must be at most 72 UTF-8 bytes.");
export const signupSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  password: password.refine(value => value.length >= 12, "Use at least 12 characters."),
});
export const loginSchema = z.object({ email, password: password.refine(value => value.length > 0, "Enter your password.") });

export function signupRole(email: string): "USER" | "ADMIN" {
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  return admins.includes(email.trim().toLowerCase()) ? "ADMIN" : "USER";
}
