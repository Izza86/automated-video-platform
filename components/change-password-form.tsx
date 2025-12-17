"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordDirect, changePasswordWithToken } from "@/server/password";

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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Current Password (only if no token) */}
      {!token && (
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Current Password</Label>
          <div className="relative">
            <Input
              id="currentPassword"
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="bg-white/5 border-purple-600/30 text-white pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* New Password */}
      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <div className="relative">
          <Input
            id="newPassword"
            type={showNew ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="bg-white/5 border-purple-600/30 text-white pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
          >
            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-white/60">
          At least 8 characters with uppercase, lowercase, and number
        </p>
      </div>

      {/* Confirm New Password */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="bg-white/5 border-purple-600/30 text-white pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Password Strength Indicator */}
      <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-4">
        <p className="text-sm font-medium mb-2 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Password Requirements
        </p>
        <ul className="text-xs text-white/70 space-y-1">
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
          <li className={newPassword === confirmPassword && newPassword.length > 0 ? "text-green-400" : ""}>
            • Passwords match
          </li>
        </ul>
      </div>

      {/* Submit Button */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Changing Password...
            </>
          ) : (
            "Change Password"
          )}
        </Button>
        
        <Button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}