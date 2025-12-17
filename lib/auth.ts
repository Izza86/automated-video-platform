import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { lastLoginMethod } from "better-auth/plugins";
import { db } from "@/db/drizzle";
import { schema } from "@/db/schema";
import { Resend } from "resend";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL as string,
  trustedOrigins: ["http://localhost:3000"],
  secret: process.env.BETTER_AUTH_SECRET as string,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      redirectURI: `${process.env.BETTER_AUTH_URL}/api/auth/callback/google`,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Temporarily disabled for testing
    sendResetPassword: async ({ user, url }) => {
      try {
        console.log("🔐 Sending password reset email to:", user.email);
        console.log("🔑 Resend API Key exists:", !!process.env.RESEND_API_KEY);
        
        const resend = new Resend(process.env.RESEND_API_KEY);
        
        const { data, error } = await resend.emails.send({
          from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_SENDER_ADDRESS}>`,
          to: user.email,
          subject: 'Reset Your Password',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #3b0764 0%, #5b21b6 100%); padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">Password Reset Request</h1>
              </div>
              <div style="padding: 40px; background: #f9f9f9;">
                <p style="font-size: 16px; color: #333;">Hi ${user.name},</p>
                <p style="font-size: 16px; color: #333;">We received a request to reset your password. Click the button below to create a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${url}" style="background: #3b0764; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                    Reset Password
                  </a>
                </div>
                <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
                <p style="font-size: 14px; color: #3b0764; word-break: break-all;">${url}</p>
                <p style="font-size: 14px; color: #666; margin-top: 30px;">This link will expire in 24 hours.</p>
                <p style="font-size: 14px; color: #666;">If you didn't request this, please ignore this email.</p>
              </div>
              <div style="padding: 20px; text-align: center; background: #333; color: white; font-size: 12px; border-radius: 0 0 10px 10px;">
                <p>© 2025 Automated Video Editor. All rights reserved.</p>
              </div>
            </div>
          `,
        });

        if (error) {
          console.error("❌ Failed to send password reset email:", error);
          throw error;
        }
        
        console.log("✅ Password reset email sent successfully:", data);
      } catch (error) {
        console.error("❌ Error in sendResetPassword:", error);
        throw error;
      }
    },
  },
  emailVerification: {
    sendOnSignUp: false, // Disabled - no verification email sent
    autoSignInAfterVerification: true,
    expiresIn: 86400, // Token valid for 24 hours (1 day) = 86400 seconds
    sendVerificationEmail: async ({ user, url }) => {
      // Email verification disabled - just log for development
      console.log("📧 Email verification skipped for:", user.email);
      return;
    },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  plugins: [
    lastLoginMethod(),
    nextCookies(),
  ],
});
