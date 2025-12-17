import { SignupForm } from "@/components/forms/signup-form";
import { LampAnimation } from "@/components/lamp-animation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up - Automated Video Editor",
  description: "Create your account and start making professional videos with AI",
};

export default function SignupPage() {
  return (
    <LampAnimation>
      <div className="bg-linear-to-br from-purple-900/30 via-purple-800/20 to-purple-900/30 border border-purple-500/40 rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl shadow-purple-900/50 backdrop-blur-md w-full max-w-md mx-auto">
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-3">
            Join Us Today
          </h1>
          <p className="text-base sm:text-lg text-purple-300">Start your creative journey</p>
        </div>
        <SignupForm />
      </div>
    </LampAnimation>
  );
}
