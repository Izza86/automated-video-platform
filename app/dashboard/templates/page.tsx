import { getCurrentUser } from "@/server/users";
import { redirect } from "next/navigation";
import TemplatesClient from "./templates-client";

export default async function TemplatesPage() {
  const { currentUser } = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  // Don't allow admin to access user pages
  if (currentUser.role === "admin") {
    redirect("/dashboard");
  }

  return <TemplatesClient />;
}
