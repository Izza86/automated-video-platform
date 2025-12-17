import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";
import { KeyRound, Shield } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen bg-black">
      {/* Left Side - Animated Purple Gradient */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0033] via-[#3b0764] to-[#5b21b6]">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-2000" />
            <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-4000" />
          </div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-white">
          <div className="mb-8">
            <div className="w-48 h-48 rounded-full bg-white/10 backdrop-blur-lg flex items-center justify-center p-6 shadow-2xl animate-float border-4 border-white/20">
              <div className="text-center">
                <div className="text-white font-bold text-lg leading-tight">
                  AUTOMATED
                </div>
                <div className="text-white font-bold text-lg leading-tight">
                  VIDEO
                </div>
                <div className="text-purple-300 font-bold text-lg leading-tight">
                  EDITOR
                </div>
              </div>
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4 text-center">
            Account Recovery
          </h1>
          <p className="text-xl text-purple-100 text-center mb-8 max-w-md">
            Don't worry! We'll help you reset your password securely
          </p>
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full">
            <Shield className="w-5 h-5" />
            <span className="text-sm">Secure & Encrypted</span>
          </div>
        </div>
      </div>

      {/* Right Side - Forgot Password Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-black">
        <div className="w-full max-w-md">
          <Link
            className="flex items-center gap-2 justify-center mb-8"
            href="/"
          >
            <img
              src="https://placehold.co/40x40/3b0764/ffffff?text=AI"
              alt="Logo"
              width={40}
              height={40}
              className="rounded-full lg:hidden"
            />
            <span className="font-bold text-2xl text-white lg:hidden">
              AUTOMATED<span className="text-purple-400">VIDEO EDITOR</span>
            </span>
          </Link>
          
          <div className="bg-gradient-to-br from-purple-900/30 via-purple-800/20 to-purple-900/30 border border-purple-500/40 rounded-3xl p-8 shadow-2xl shadow-purple-900/50 backdrop-blur-md animate-[fadeIn_0.5s_ease-in-out]">
            <div className="text-center mb-6">
              <h1 className="text-4xl font-bold text-white mb-3 animate-[slideDown_0.6s_ease-out]">
                Reset Password
              </h1>
              <div className="flex items-center justify-center gap-2 text-purple-300 animate-[slideUp_0.6s_ease-out]">
                <KeyRound className="w-5 h-5 animate-pulse" />
                <p className="text-lg">We'll send you a secure reset link</p>
              </div>
            </div>
            <ForgotPasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
}
