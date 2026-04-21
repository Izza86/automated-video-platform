import type { Metadata } from "next";
import { SignupForm } from "@/components/forms/signup-form";
import LampWrapper from "@/components/login/lamp-wrapper";

export const metadata: Metadata = {
  title: "Sign Up - Automated Video Editor",
  description:
    "Create your account and start making professional videos with AI",
};

export default function SignupPage() {
  return (
    <LampWrapper label="SIGN UP">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-violet-500/30 bg-white/5 p-4 shadow-2xl shadow-purple-900/30 backdrop-blur-xl sm:p-6 lg:p-8">
        <div className="mb-4 text-center sm:mb-6">
          <h1 className="mb-2 font-bold text-2xl text-white sm:mb-3 sm:text-3xl lg:text-4xl">
            Join Us Today
          </h1>
          <p className="text-base text-violet-200/80 sm:text-lg">
            Start your creative journey
          </p>
        </div>
        <SignupForm />
      </div>
    </LampWrapper>
  );
}
