import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/users";
import TemplatesClient from "./templates-client";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const auth = await getCurrentUser();

  if (!(auth && auth.currentUser)) {
    redirect("/login");
  }

  const { currentUser } = auth;

  // Don't allow admin to access user pages
  if (currentUser.role === "admin") {
    redirect("/dashboard");
  }

  return <TemplatesClient />;
}
