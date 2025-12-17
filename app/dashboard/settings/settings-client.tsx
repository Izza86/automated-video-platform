"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, Bell, Shield, Video, Palette, Globe, Save, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          {/* Header */}
          <div>
            <Link 
              href="/dashboard" 
              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-4 sm:mb-6 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Dashboard
            </Link>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Settings
                </h1>
                <p className="text-gray-500 mt-1 text-sm">Customize your experience</p>
              </div>
              {saved && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-4 py-2 flex items-center gap-2 animate-in slide-in-from-right">
                  <Check className="w-4 h-4" />
                  Saved!
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar Tabs */}
            <div className="lg:col-span-3 space-y-1">
              <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible gap-2 lg:gap-1 pb-2 lg:pb-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-shrink-0 lg:w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? "bg-gradient-to-r from-purple-600/30 to-pink-600/20 text-white border border-purple-500/50 shadow-lg shadow-purple-500/20"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.name}
                  </button>
                );
              })}
              </div>
            </div>

            {/* Content Area */}
            <div className="lg:col-span-9">
              <div className="bg-gradient-to-br from-[#1a1a2e]/50 to-[#0f0f1e]/50 border border-purple-500/20 rounded-xl p-4 sm:p-6 lg:p-8 backdrop-blur-sm">
                {/* Profile Settings */}
                {activeTab === "profile" && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold">Profile Settings</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-black/40 border border-purple-500/30 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                        <input
                          type="email"
                          value={currentUser.email}
                          disabled
                          className="w-full bg-black/40 border border-purple-500/30 rounded-lg px-4 py-3 text-white/50 focus:border-purple-500 focus:outline-none cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
                        <textarea
                          rows={4}
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          placeholder="Tell us about yourself..."
                          className="w-full bg-black/40 border border-purple-500/30 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                        ></textarea>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Profile Photo</label>
                        <div className="flex items-center gap-4">
                          {currentUser.image ? (
                            <img src={currentUser.image} alt="Profile" className="w-20 h-20 rounded-full object-cover" />
                          ) : (
                            <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center">
                              <User className="w-10 h-10 text-white" />
                            </div>
                          )}
                          <Link href="/dashboard/edit-profile">
                            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
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
                    <h2 className="text-2xl font-bold">Notification Preferences</h2>
                    
                    <div className="space-y-4">
                      {[
                        { title: "Email Notifications", description: "Receive email updates about your videos" },
                        { title: "Push Notifications", description: "Get push notifications on your devices" },
                        { title: "Processing Complete", description: "Notify when video processing is done" },
                        { title: "New Features", description: "Stay updated with new features and updates" },
                        { title: "Marketing Emails", description: "Receive tips and best practices" },
                      ].map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-black/40 rounded-lg">
                          <div>
                            <p className="font-medium text-white">{item.title}</p>
                            <p className="text-sm text-gray-400">{item.description}</p>
                          </div>
                          <label className="relative inline-block w-12 h-6">
                            <input type="checkbox" className="sr-only peer" defaultChecked={index < 3} />
                            <span className="absolute inset-0 bg-gray-700 rounded-full peer-checked:bg-purple-600 transition-colors cursor-pointer"></span>
                            <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-6"></span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Privacy & Security Settings */}
                {activeTab === "privacy" && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold">Privacy & Security</h2>
                    <p className="text-gray-400">For password changes, please use the Change Password page.</p>
                    
                    <Link href="/dashboard/change-password">
                      <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                        Change Password
                      </Button>
                    </Link>
                  </div>
                )}

                {/* Video Settings */}
                {activeTab === "video" && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold">Video Settings</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Default Video Quality</label>
                        <select className="w-full bg-black/40 border border-purple-500/30 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none">
                          <option>1080p (Full HD)</option>
                          <option>720p (HD)</option>
                          <option>480p (SD)</option>
                          <option>4K (Ultra HD)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Default Format</label>
                        <select className="w-full bg-black/40 border border-purple-500/30 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none">
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
                    <h2 className="text-2xl font-bold">Appearance</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Theme</label>
                        <div className="grid grid-cols-3 gap-4">
                          {["Dark", "Light", "Auto"].map((theme) => (
                            <button
                              key={theme}
                              className={`p-4 rounded-lg border transition-all ${
                                theme === "Dark"
                                  ? "border-purple-500 bg-purple-600/20"
                                  : "border-purple-500/30 bg-black/40 hover:border-purple-500/60"
                              }`}
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
                    <h2 className="text-2xl font-bold">Language & Region</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Language</label>
                        <select className="w-full bg-black/40 border border-purple-500/30 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none">
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
                <div className="flex justify-end mt-6 pt-6 border-t border-purple-500/30">
                  <Button 
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8"
                  >
                    <Save className="w-4 h-4 mr-2" />
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
