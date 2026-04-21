"use client";

import { Loader2, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
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
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    currentUser.image
  );
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
        await router.prefetch("/dashboard");
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
    <form className="space-y-6" onSubmit={handleSubmit}>
      {/* Profile Photo */}
      <div className="space-y-4">
        <Label>Profile Photo</Label>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
          {photoPreview ? (
            <img
              alt="Profile"
              className="h-20 w-20 rounded-full border-2 border-purple-500 object-cover sm:h-24 sm:w-24"
              src={photoPreview}
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-purple-600 sm:h-24 sm:w-24">
              <UserIcon className="h-10 w-10 sm:h-12 sm:w-12" />
            </div>
          )}

          <div className="flex-1">
            <Input
              accept="image/*"
              className="border-purple-600/30 bg-white/5 text-white"
              onChange={handlePhotoChange}
              type="file"
            />
            <p className="mt-2 text-white/60 text-xs">
              Max size: 5MB. Recommended: Square image, at least 400x400px
            </p>
          </div>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          className="border-purple-600/30 bg-white/5 text-white"
          id="name"
          minLength={3}
          onChange={(e) => setName(e.target.value)}
          required
          type="text"
          value={name}
        />
      </div>

      {/* Email (readonly) */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          className="border-purple-600/30 bg-white/5 text-white/50"
          disabled
          id="email"
          type="email"
          value={currentUser.email}
        />
        <p className="text-white/60 text-xs">Email cannot be changed</p>
      </div>

      {/* Submit Button */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button
          className="w-full bg-purple-600 text-white hover:bg-purple-700 sm:w-auto"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>

        <Button
          className="w-full bg-purple-600 text-white hover:bg-purple-700 sm:w-auto"
          data-prefetch="/dashboard"
          onClick={async () => {
            await router.prefetch("/dashboard");
            router.push("/dashboard");
          }}
          type="button"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
