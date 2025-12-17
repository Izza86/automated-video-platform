"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Upload, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateUserProfile } from "@/server/admin";

interface EditProfileFormProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

export function EditProfileForm({ currentUser }: EditProfileFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(currentUser.name);
  const [photoPreview, setPhotoPreview] = useState<string | null>(currentUser.image);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let photoBase64 = currentUser.image;
      
      if (photoFile) {
        const reader = new FileReader();
        photoBase64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(photoFile);
        });
      }

      const result = await updateUserProfile({
        name,
        profilePhoto: photoBase64,
      });

      if (result.success) {
        toast.success(result.message);
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Profile Photo */}
      <div className="space-y-4">
        <Label>Profile Photo</Label>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
          {photoPreview ? (
            <img
              src={photoPreview}
              alt="Profile"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-purple-500"
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-purple-600 flex items-center justify-center">
              <UserIcon className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
          )}
          
          <div className="flex-1">
            <Input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="bg-white/5 border-purple-600/30 text-white"
            />
            <p className="text-xs text-white/60 mt-2">
              Max size: 5MB. Recommended: Square image, at least 400x400px
            </p>
          </div>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-white/5 border-purple-600/30 text-white"
          required
          minLength={3}
        />
      </div>

      {/* Email (readonly) */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={currentUser.email}
          className="bg-white/5 border-purple-600/30 text-white/50"
          disabled
        />
        <p className="text-xs text-white/60">Email cannot be changed</p>
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
              Saving...
            </>
          ) : (
            "Save Changes"
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