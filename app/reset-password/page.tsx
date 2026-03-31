import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/forms/reset-password-form";
import LampWrapper from "@/components/login/lamp-wrapper";

export default function ResetPasswordPage() {
  return (
    <LampWrapper label="RESET">
      <div className="bg-white/5 border border-violet-500/30 rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl shadow-purple-900/30 backdrop-blur-xl w-full max-w-md mx-auto">
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-3">
            Reset Password
          </h1>
          <p className="text-base sm:text-lg text-violet-200/80">Create a new secure password</p>
        </div>
        <Suspense fallback={<div className="text-center text-violet-100/80">Loading reset form...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </LampWrapper>
  );
}
