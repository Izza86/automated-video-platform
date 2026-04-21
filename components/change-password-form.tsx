"use client";

import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changePasswordDirect,
  changePasswordWithToken,
} from "@/server/password";

export function ChangePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");

  const [isLoading, setIsLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    // Validate password strength
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(newPassword)) {
      toast.error("Password must contain uppercase, lowercase, and number");
      return;
    }

    setIsLoading(true);

    try {
      let result;

      if (token) {
        // Token-based password reset
        result = await changePasswordWithToken(token, newPassword);
      } else {
        // Direct password change with current password
        result = await changePasswordDirect(currentPassword, newPassword);
      }

      if (result.success) {
        toast.success(result.message);
        await router.prefetch("/dashboard");
        router.push("/dashboard");
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to change password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {/* Current Password (only if no token) */}
      {!token && (
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Current Password</Label>
          <div className="relative">
            <Input
              className="border-purple-600/30 bg-white/5 pr-10 text-white"
              id="currentPassword"
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
            />
            <button
              className="-translate-y-1/2 absolute top-1/2 right-3 text-white/60 hover:text-white"
              onClick={() => setShowCurrent(!showCurrent)}
              type="button"
            >
              {showCurrent ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* New Password */}
      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <div className="relative">
          <Input
            className="border-purple-600/30 bg-white/5 pr-10 text-white"
            id="newPassword"
            onChange={(e) => setNewPassword(e.target.value)}
            required
            type={showNew ? "text" : "password"}
            value={newPassword}
          />
          <button
            className="-translate-y-1/2 absolute top-1/2 right-3 text-white/60 hover:text-white"
            onClick={() => setShowNew(!showNew)}
            type="button"
          >
            {showNew ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="text-white/60 text-xs">
          At least 8 characters with uppercase, lowercase, and number
        </p>
      </div>

      {/* Confirm New Password */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <div className="relative">
          <Input
            className="border-purple-600/30 bg-white/5 pr-10 text-white"
            id="confirmPassword"
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
          />
          <button
            className="-translate-y-1/2 absolute top-1/2 right-3 text-white/60 hover:text-white"
            onClick={() => setShowConfirm(!showConfirm)}
            type="button"
          >
            {showConfirm ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Password Strength Indicator */}
      <div className="rounded-lg border border-purple-600/30 bg-purple-900/20 p-4">
        <p className="mb-2 flex items-center gap-2 font-medium text-sm">
          <Lock className="h-4 w-4" />
          Password Requirements
        </p>
        <ul className="space-y-1 text-white/70 text-xs">
          <li className={newPassword.length >= 8 ? "text-green-400" : ""}>
            • At least 8 characters
          </li>
          <li className={/[A-Z]/.test(newPassword) ? "text-green-400" : ""}>
            • One uppercase letter
          </li>
          <li className={/[a-z]/.test(newPassword) ? "text-green-400" : ""}>
            • One lowercase letter
          </li>
          <li className={/\d/.test(newPassword) ? "text-green-400" : ""}>
            • One number
          </li>
          <li
            className={
              newPassword === confirmPassword && newPassword.length > 0
                ? "text-green-400"
                : ""
            }
          >
            • Passwords match
          </li>
        </ul>
      </div>

      {/* Submit Button */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button
          className="w-full bg-purple-600 text-white hover:bg-purple-700 sm:w-auto"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Changing Password...
            </>
          ) : (
            "Change Password"
          )}
        </Button>

        <Button
          className="w-full bg-purple-600 text-white hover:bg-purple-700 sm:w-auto"
          data-prefetch="/dashboard"
          onClick={async () => {
            await router.prefetch("/dashboard");
            router.push("/dashboard");
          }}
          type="button"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
