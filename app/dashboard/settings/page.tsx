import { getCurrentUser } from "@/server/users";
import { redirect } from "next/navigation";
import SettingsClient from "./settings-client";

export default async function SettingsPage() {
  const { currentUser } = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  return <SettingsClient currentUser={currentUser} />;
}
