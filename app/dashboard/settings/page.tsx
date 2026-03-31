import { getCurrentUser } from "@/server/users";
import { redirect } from "next/navigation";
import SettingsClient from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const auth = await getCurrentUser();

  if (!auth || !auth.currentUser) {
    redirect("/login");
  }

  const { currentUser } = auth;

  return <SettingsClient currentUser={currentUser} />;
}
