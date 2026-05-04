import type { Metadata } from "next";
import { LoginForm } from "@/components/forms/login-form";
import LampWrapper from "@/components/login/lamp-wrapper";

export const metadata: Metadata = {
  title: "Login - Automated Video Editor",
  description: "Sign in to your account and continue creating amazing videos",
};

export const dynamic = "force-static";

export default function LoginPage() {
  return (
    <LampWrapper label="LOGIN">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-violet-500/30 bg-white/5 p-4 shadow-2xl shadow-purple-900/30 backdrop-blur-xl sm:p-6 lg:p-8">
        <div className="mb-4 text-center sm:mb-6">
          <h1 className="mb-2 font-bold text-2xl text-white sm:mb-3 sm:text-3xl lg:text-4xl">
            Welcome Back
          </h1>
          <p className="text-base text-violet-200/80 sm:text-lg">
            Continue your creative journey
          </p>
        </div>
        <LoginForm />
      </div>
    </LampWrapper>
  );
}