"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

// Deep Violet & Soft Lavender Color Palette
const COLORS = {
  deepIndigo: "#2E1A47",
  richViolet: "#4B0082",
  lavenderMist: "#E6E6FA",
  softLavender: "#D8BFD8",
  marigold: "#F4C430",
};

const formSchema = z.object({
  email: z.string().email(),
});

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    try {
      const { error } = await authClient.requestPasswordReset({
        email: values.email,
        redirectTo: "/reset-password",
      });

      if (error) {
        toast.error(error.message || "Failed to send reset email");
      } else {
        toast.success(
          "✅ Password reset email sent successfully! Check your inbox."
        );
        form.reset();
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-4", className)} {...props}>
      <Form {...form}>
        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-6">
            {/* Email Field */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel style={{ color: COLORS.lavenderMist }}>
                    Email Address
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="h-12 text-white placeholder:text-white/40"
                      placeholder="you@example.com"
                      style={{
                        background: `${COLORS.deepIndigo}50`,
                        borderColor: `${COLORS.lavenderMist}40`,
                      }}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button
              className="h-12 w-full transform font-bold text-white shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl border-0"
              disabled={isLoading}
              type="submit"
              style={{
                background: `linear-gradient(135deg, ${COLORS.deepIndigo} 0%, ${COLORS.richViolet} 100%)`,
                boxShadow: `0 10px 25px -5px ${COLORS.deepIndigo}80`,
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Sending Link...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>

            {/* Back to Login */}
            <div className="text-center text-purple-200 text-sm">
              Remember your password?{" "}
              <Link
                className="inline-flex items-center gap-2 text-sm transition-colors"
                style={{ color: COLORS.softLavender }}
                href="/login"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Link>
            </div>
          </div>
        </form>
      </Form>

      {/* Terms & Info */}
      <div
        className="text-center text-xs"
        style={{ color: `${COLORS.lavenderMist}90` }}
      >
        <p>We&apos;ll send you an email with a secure link to reset your password.</p>
        <p className="mt-1">Make sure to check your spam folder if you don&apos;t see it.</p>
      </div>
    </div>
  );
}
