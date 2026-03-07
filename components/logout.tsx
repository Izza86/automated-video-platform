"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";

export function Logout() {
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.signOut();
    await router.prefetch("/");
    router.push("/");
  };

  return (
    <Button data-prefetch="/" onClick={handleLogout} variant="outline">
      Logout <LogOut className="size-4" />
    </Button>
  );
}
