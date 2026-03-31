import { LoginForm } from "@/components/forms/login-form";
import LampWrapper from "@/components/login/lamp-wrapper";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - Automated Video Editor",
  description: "Sign in to your account and continue creating amazing videos",
};

export const dynamic = "force-static";

export default function LoginPage() {
  return (
    <LampWrapper label="LOGIN">
      <div className="bg-white/5 border border-violet-500/30 rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl shadow-purple-900/30 backdrop-blur-xl w-full max-w-md mx-auto">
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-3">
            Welcome Back
          </h1>
          <p className="text-base sm:text-lg text-violet-200/80">Continue your creative journey</p>
        </div>
        <LoginForm />
      </div>
    </LampWrapper>
  );
}
