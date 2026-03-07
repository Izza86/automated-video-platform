import { SignupForm } from "@/components/forms/signup-form";
import LampWrapper from "@/components/login/lamp-wrapper";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up - Automated Video Editor",
  description: "Create your account and start making professional videos with AI",
};

export default function SignupPage() {
  return (
    <LampWrapper label="SIGN UP">
      <div className="bg-white/10 border border-amber-400/30 rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl shadow-amber-900/30 backdrop-blur-xl w-full max-w-md mx-auto">
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-3">
            Join Us Today
          </h1>
          <p className="text-base sm:text-lg text-amber-200/80">Start your creative journey</p>
        </div>
        <SignupForm />
      </div>
    </LampWrapper>
  );
}
