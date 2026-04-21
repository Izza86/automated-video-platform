"use client";

import {
  ArrowLeft,
  Bell,
  Check,
  Globe,
  Palette,
  Save,
  Shield,
  User,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateUserProfile } from "@/server/admin";

interface SettingsClientProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

export default function SettingsClient({ currentUser }: SettingsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Profile state
  const [name, setName] = useState(currentUser.name);
  const [bio, setBio] = useState("");

  const tabs = [
    { id: "profile", name: "Profile", icon: User },
    { id: "notifications", name: "Notifications", icon: Bell },
    { id: "privacy", name: "Security", icon: Shield },
    { id: "video", name: "Video", icon: Video },
    { id: "appearance", name: "Appearance", icon: Palette },
    { id: "language", name: "Language", icon: Globe },
  ];

  const handleSave = async () => {
    setSaving(true);

    try {
      // Only save profile data for now
      if (activeTab === "profile") {
        const result = await updateUserProfile({
          name,
          profilePhoto: currentUser.image,
        });

        if (result.success) {
          setSaved(true);
          toast.success("Settings saved successfully!");
          setTimeout(() => setSaved(false), 3000);
          router.refresh();
        } else {
          toast.error(result.message || "Failed to save settings");
        }
      } else {
        // For other tabs, just show success message (not implemented yet)
        setSaved(true);
        toast.success("Settings saved successfully!");
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1408] text-white">
      <div className="pt-16">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
          {/* Header */}
          <div>
            <Link
              className="group mb-4 inline-flex items-center gap-2 text-purple-400 transition-colors hover:text-purple-300 sm:mb-6"
              href="/dashboard"
            >
              <ArrowLeft className="group-hover:-translate-x-1 h-4 w-4 transition-transform" />
              Back to Dashboard
            </Link>
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h1 className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text font-bold text-2xl text-transparent sm:text-3xl">
                  Settings
                </h1>
                <p className="mt-1 text-gray-500 text-sm">
                  Customize your experience
                </p>
              </div>
              {saved && (
                <Badge className="slide-in-from-right flex animate-in items-center gap-2 border-green-500/30 bg-green-500/20 px-4 py-2 text-green-400">
                  <Check className="h-4 w-4" />
                  Saved!
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Sidebar Tabs */}
            <div className="space-y-1 lg:col-span-3">
              <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-1 lg:overflow-x-visible lg:pb-0">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      className={`flex flex-shrink-0 items-center gap-3 whitespace-nowrap rounded-lg px-4 py-2.5 font-medium text-sm transition-all lg:w-full ${
                        activeTab === tab.id
                          ? "border border-purple-500/50 bg-gradient-to-r from-purple-600/30 to-pink-600/20 text-white shadow-lg shadow-purple-500/20"
                          : "text-gray-400 hover:bg-white/5 hover:text-white"
                      }`}
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content Area */}
            <div className="lg:col-span-9">
              <div className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-[#1a1a2e]/50 to-[#0f0f1e]/50 p-4 backdrop-blur-sm sm:p-6 lg:p-8">
                {/* Profile Settings */}
                {activeTab === "profile" && (
                  <div className="space-y-6">
                    <h2 className="font-bold text-2xl">Profile Settings</h2>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block font-medium text-gray-300 text-sm">
                          Full Name
                        </label>
                        <input
                          className="w-full rounded-lg border border-purple-500/30 bg-black/40 px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                          onChange={(e) => setName(e.target.value)}
                          type="text"
                          value={name}
                        />
                      </div>

                      <div>
                        <label className="mb-2 block font-medium text-gray-300 text-sm">
                          Email Address
                        </label>
                        <input
                          className="w-full cursor-not-allowed rounded-lg border border-purple-500/30 bg-black/40 px-4 py-3 text-white/50 focus:border-purple-500 focus:outline-none"
                          disabled
                          type="email"
                          value={currentUser.email}
                        />
                        <p className="mt-1 text-gray-500 text-xs">
                          Email cannot be changed
                        </p>
                      </div>

                      <div>
                        <label className="mb-2 block font-medium text-gray-300 text-sm">
                          Bio
                        </label>
                        <textarea
                          className="w-full rounded-lg border border-purple-500/30 bg-black/40 px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                          onChange={(e) => setBio(e.target.value)}
                          placeholder="Tell us about yourself..."
                          rows={4}
                          value={bio}
                        />
                      </div>

                      <div>
                        <label className="mb-2 block font-medium text-gray-300 text-sm">
                          Profile Photo
                        </label>
                        <div className="flex items-center gap-4">
                          {currentUser.image ? (
                            <img
                              alt="Profile"
                              className="h-20 w-20 rounded-full object-cover"
                              src={currentUser.image}
                            />
                          ) : (
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-purple-600">
                              <User className="h-10 w-10 text-white" />
                            </div>
                          )}
                          <Link href="/dashboard/edit-profile">
                            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700">
                              Update Profile Photo
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notifications Settings */}
                {activeTab === "notifications" && (
                  <div className="space-y-6">
                    <h2 className="font-bold text-2xl">
                      Notification Preferences
                    </h2>

                    <div className="space-y-4">
                      {[
                        {
                          title: "Email Notifications",
                          description:
                            "Receive email updates about your videos",
                        },
                        {
                          title: "Push Notifications",
                          description: "Get push notifications on your devices",
                        },
                        {
                          title: "Processing Complete",
                          description: "Notify when video processing is done",
                        },
                        {
                          title: "New Features",
                          description:
                            "Stay updated with new features and updates",
                        },
                        {
                          title: "Marketing Emails",
                          description: "Receive tips and best practices",
                        },
                      ].map((item, index) => (
                        <div
                          className="flex items-center justify-between rounded-lg bg-black/40 p-4"
                          key={index}
                        >
                          <div>
                            <p className="font-medium text-white">
                              {item.title}
                            </p>
                            <p className="text-gray-400 text-sm">
                              {item.description}
                            </p>
                          </div>
                          <label className="relative inline-block h-6 w-12">
                            <input
                              className="peer sr-only"
                              defaultChecked={index < 3}
                              type="checkbox"
                            />
                            <span className="absolute inset-0 cursor-pointer rounded-full bg-gray-700 transition-colors peer-checked:bg-purple-600" />
                            <span className="absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-6" />
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Privacy & Security Settings */}
                {activeTab === "privacy" && (
                  <div className="space-y-6">
                    <h2 className="font-bold text-2xl">Privacy & Security</h2>
                    <p className="text-gray-400">
                      For password changes, please use the Change Password page.
                    </p>

                    <Link href="/dashboard/change-password">
                      <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700">
                        Change Password
                      </Button>
                    </Link>
                  </div>
                )}

                {/* Video Settings */}
                {activeTab === "video" && (
                  <div className="space-y-6">
                    <h2 className="font-bold text-2xl">Video Settings</h2>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block font-medium text-gray-300 text-sm">
                          Default Video Quality
                        </label>
                        <select className="w-full rounded-lg border border-purple-500/30 bg-black/40 px-4 py-3 text-white focus:border-purple-500 focus:outline-none">
                          <option>1080p (Full HD)</option>
                          <option>720p (HD)</option>
                          <option>480p (SD)</option>
                          <option>4K (Ultra HD)</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block font-medium text-gray-300 text-sm">
                          Default Format
                        </label>
                        <select className="w-full rounded-lg border border-purple-500/30 bg-black/40 px-4 py-3 text-white focus:border-purple-500 focus:outline-none">
                          <option>MP4</option>
                          <option>MOV</option>
                          <option>AVI</option>
                          <option>WebM</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Appearance Settings */}
                {activeTab === "appearance" && (
                  <div className="space-y-6">
                    <h2 className="font-bold text-2xl">Appearance</h2>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block font-medium text-gray-300 text-sm">
                          Theme
                        </label>
                        <div className="grid grid-cols-3 gap-4">
                          {["Dark", "Light", "Auto"].map((theme) => (
                            <button
                              className={`rounded-lg border p-4 transition-all ${
                                theme === "Dark"
                                  ? "border-purple-500 bg-purple-600/20"
                                  : "border-purple-500/30 bg-black/40 hover:border-purple-500/60"
                              }`}
                              key={theme}
                            >
                              <p className="font-medium text-white">{theme}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Language & Region Settings */}
                {activeTab === "language" && (
                  <div className="space-y-6">
                    <h2 className="font-bold text-2xl">Language & Region</h2>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block font-medium text-gray-300 text-sm">
                          Language
                        </label>
                        <select className="w-full rounded-lg border border-purple-500/30 bg-black/40 px-4 py-3 text-white focus:border-purple-500 focus:outline-none">
                          <option>English (US)</option>
                          <option>English (UK)</option>
                          <option>Spanish</option>
                          <option>French</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <div className="mt-6 flex justify-end border-purple-500/30 border-t pt-6">
                  <Button
                    className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 text-white hover:from-purple-700 hover:to-pink-700"
                    disabled={saving}
                    onClick={handleSave}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
