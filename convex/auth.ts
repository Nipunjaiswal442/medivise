import { Email } from "@convex-dev/auth/providers/Email";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { DataModel } from "./_generated/dataModel";

type Role = "physician" | "nurse" | "pharmacist";
const SELF_SERVICE_ROLES: Role[] = ["physician", "nurse", "pharmacist"];
const RESET_CODE_MINUTES = 15;

const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : undefined;

/**
 * Six-digit password-reset codes sent by email through Resend (https://resend.com).
 * Set AUTH_RESEND_KEY (and optionally AUTH_EMAIL_FROM) on the Convex deployment to enable it;
 * without it the reset flow reports that email is not configured.
 */
const ResendOTPPasswordReset = Email({
  id: "resend-otp-reset",
  maxAge: RESET_CODE_MINUTES * 60,
  async generateVerificationToken() {
    const digits = new Uint32Array(1);
    crypto.getRandomValues(digits);
    return String(digits[0] % 1_000_000).padStart(6, "0");
  },
  async sendVerificationRequest({ identifier: email, token }) {
    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) {
      throw new ConvexError(
        "Password reset by email is not configured. Ask an administrator to set AUTH_RESEND_KEY on the Convex deployment.",
      );
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.AUTH_EMAIL_FROM ?? "Medivise <onboarding@resend.dev>",
        to: [email],
        subject: "Your Medivise password reset code",
        text: `Your Medivise password reset code is ${token}. It expires in ${RESET_CODE_MINUTES} minutes. If you did not ask to reset your password, ignore this email.`,
      }),
    });
    if (!res.ok) {
      console.error(`Resend answered ${res.status}: ${await res.text()}`);
      throw new ConvexError("Could not send the reset email. Please try again later.");
    }
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      // Runs on every flow; sign-up extras (name, role...) are only present on "signUp".
      profile(params) {
        const email = text(params.email, 254)?.toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new ConvexError("Enter a valid email address");
        }
        if (params.flow !== "signUp") return { email };
        const requested = text(params.role, 20) as Role | undefined;
        const now = Date.now();
        return {
          email,
          name: text(params.name, 120) || "Doctor",
          // "admin" cannot be self-assigned; promote users from the Convex dashboard instead.
          role: requested && SELF_SERVICE_ROLES.includes(requested) ? requested : "physician",
          specialty: text(params.specialty, 80),
          licenseNumber: text(params.licenseNumber, 60),
          createdAt: now,
          updatedAt: now,
        };
      },
      validatePasswordRequirements(password) {
        if (
          password.length < 8 ||
          !/[A-Z]/.test(password) ||
          !/[0-9]/.test(password) ||
          !/[^A-Za-z0-9]/.test(password)
        ) {
          throw new ConvexError(
            "Password must be at least 8 characters and include an uppercase letter, a number and a symbol",
          );
        }
      },
      reset: ResendOTPPasswordReset,
    }),
  ],
});
