import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";
import LampWrapper from "@/components/login/lamp-wrapper";

export default function ForgotPasswordPage() {
  return (
    <LampWrapper label="RECOVER">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-violet-500/30 bg-white/5 p-4 shadow-2xl shadow-purple-900/30 backdrop-blur-xl sm:p-6 lg:p-8">
        <div className="mb-4 text-center sm:mb-6">
          <h1 className="mb-2 font-bold text-2xl text-white sm:mb-3 sm:text-3xl lg:text-4xl">
            Reset Password
          </h1>
          <p className="text-base text-violet-200/80 sm:text-lg">
            We&apos;ll send you a secure reset link
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </LampWrapper>
  );
}