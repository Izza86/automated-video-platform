"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { signUp } from "@/server/users";

const formSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username too long"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  profilePhoto: z.any().optional(),
});

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isLoading, setIsLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  });

  const signInWithGoogle = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    let photoBase64 = null;
    if (photoFile) {
      try {
        // Compress and resize image before converting to base64
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = URL.createObjectURL(photoFile);
        });

        // Resize image to max 200x200 pixels
        const maxSize = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to base64 with compression (0.7 quality)
        photoBase64 = canvas.toDataURL("image/jpeg", 0.7);
        URL.revokeObjectURL(img.src);
      } catch (error) {
        console.error("Error processing image:", error);
        toast.error("Failed to process image. Please try a smaller file.");
        setIsLoading(false);
        return;
      }
    }

    const { success, message } = await signUp(
      values.email,
      values.password,
      values.username,
      photoBase64
    );

    if (success) {
      toast.success(
        "Signup successful! Your account has been created. You can now login."
      );
      await router.prefetch("/login");
      router.push("/login");
    } else {
      toast.error(message as string);
    }

    setIsLoading(false);
  }

  return (
    <div className={cn("flex flex-col gap-4", className)} {...props}>
      <Form {...form}>
        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-6">
            {/* Google Signup Button */}
            <Button
              className="h-12 w-full transform bg-white font-semibold text-gray-900 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-gray-100 hover:shadow-xl"
              onClick={signInWithGoogle}
              type="button"
            >
              <svg
                className="mr-2 h-5 w-5"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                  fill="currentColor"
                />
              </svg>
              Signup with Google
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-purple-500/30 border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-transparent px-2 text-purple-300">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Username Field */}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Username</FormLabel>
                  <FormControl>
                    <Input
                      className="h-12 border-purple-500/50 bg-black/30 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400/30"
                      placeholder="Enter your username"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email and Password Side by Side */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Email</FormLabel>
                    <FormControl>
                      <Input
                        className="h-12 border-purple-500/50 bg-black/30 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400/30"
                        placeholder="you@example.com"
                        type="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          className="h-12 border-purple-500/50 bg-black/30 pr-12 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400/30"
                          placeholder="••••••••"
                          type={showPassword ? "text" : "password"}
                          {...field}
                        />
                        <button
                          className="-translate-y-1/2 absolute top-1/2 right-3 text-gray-400 transition-colors hover:text-white"
                          onClick={() => setShowPassword(!showPassword)}
                          type="button"
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Profile Photo */}
            <FormItem>
              <FormLabel className="text-white">
                Profile Photo (Optional)
              </FormLabel>
              <FormControl>
                <div className="flex items-center gap-4">
                  {photoPreview && (
                    <img
                      alt="Preview"
                      className="h-16 w-16 rounded-full border-2 border-purple-500 object-cover shadow-lg"
                      src={photoPreview}
                    />
                  )}
                  <Input
                    accept="image/*"
                    className="h-12 border-purple-500/50 bg-black/30 text-white file:mr-4 file:cursor-pointer file:rounded-full file:border-0 file:bg-purple-600 file:px-4 file:py-2 file:font-semibold file:text-sm file:text-white hover:file:bg-purple-500"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error("Photo must be less than 5MB");
                          return;
                        }
                        setPhotoFile(file);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setPhotoPreview(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    type="file"
                  />
                </div>
              </FormControl>
            </FormItem>
            {/* Submit Button */}
            <Button
              className="h-12 w-full transform bg-gradient-to-r from-purple-600 to-pink-600 font-bold text-white shadow-xl transition-all duration-300 hover:scale-[1.02] hover:from-purple-500 hover:to-pink-500 hover:shadow-2xl"
              data-prefetch="/login"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>

            {/* Login Link */}
            <div className="text-center text-purple-200 text-sm">
              Already have an account?{" "}
              <Link
                className="font-semibold text-white underline underline-offset-4 transition-colors hover:text-purple-300"
                href="/login"
              >
                Login here
              </Link>
            </div>
          </div>
        </form>
      </Form>

      {/* Terms */}
      <div className="text-center text-purple-300/70 text-xs">
        By signing up, you agree to our{" "}
        <Link
          className="underline transition-colors hover:text-purple-200"
          href="#"
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          className="underline transition-colors hover:text-purple-200"
          href="#"
        >
          Privacy Policy
        </Link>
      </div>
    </div>
  );
}
