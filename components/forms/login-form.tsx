"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { signIn } from "@/server/users";
import { Badge } from "../ui/badge";

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [lastMethod, setLastMethod] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();

  // Get last method only on client-side after mount to avoid hydration errors
  useEffect(() => {
    setLastMethod(authClient.getLastUsedLoginMethod());
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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

    const { success, message } = await signIn(values.email, values.password);

    if (success) {
      toast.success(message as string);
      await router.prefetch("/dashboard");
      router.push("/dashboard");
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
            {/* Google Login Button */}
            <Button
              className="relative h-12 w-full transform bg-white font-semibold text-gray-900 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-gray-100 hover:shadow-xl"
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
              Login with Google
              {lastMethod === "google" && (
                <Badge className="absolute right-2 bg-purple-600 text-[9px]">
                  last used
                </Badge>
              )}
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

            {/* Email Field */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-white">Email</FormLabel>
                    {lastMethod === "email" && (
                      <Badge className="bg-purple-600 text-[9px]">
                        last used
                      </Badge>
                    )}
                  </div>
                  <FormControl>
                    <Input
                      className="h-12 border-purple-500/50 bg-black/30 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400/30"
                      placeholder="you@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password Field */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-white">Password</FormLabel>
                    <Link
                      className="text-purple-300 text-sm underline-offset-4 transition-colors hover:text-purple-200 hover:underline"
                      href="/forgot-password"
                    >
                      Forgot?
                    </Link>
                  </div>
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

            {/* Submit Button */}
            <Button
              className="h-12 w-full transform bg-gradient-to-r from-purple-600 to-pink-600 font-bold text-white shadow-xl transition-all duration-300 hover:scale-[1.02] hover:from-purple-500 hover:to-pink-500 hover:shadow-2xl"
              data-prefetch="/dashboard"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            {/* Signup Link */}
            <div className="text-center text-purple-200 text-sm">
              Don't have an account?{" "}
              <Link
                className="font-semibold text-white underline underline-offset-4 transition-colors hover:text-purple-300"
                href="/signup"
              >
                Sign up here
              </Link>
            </div>
          </div>
        </form>
      </Form>

      {/* Terms */}
      <div className="text-center text-purple-300/70 text-xs">
        By signing in, you agree to our{" "}
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
