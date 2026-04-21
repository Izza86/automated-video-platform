"use client";

import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addNewUser } from "@/server/users";

export function AddUserDialog() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [isLoading, setIsLoading] = useState(false);

  const handleAddUser = async () => {
    if (!(name.trim() && email.trim() && password.trim())) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    const result = await addNewUser(name, email, password, role);

    if (result.success) {
      toast.success(result.message);
      setIsOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole("user");
      router.refresh();
    } else {
      toast.error(result.message);
    }
    setIsLoading(false);
  };

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700">
          <UserPlus className="mr-2 h-4 w-4" />
          Add New User
        </Button>
      </DialogTrigger>
      <DialogContent className="border-purple-500/30 bg-[#1a1a2e] text-white">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription className="text-gray-400">
            Create a new user account
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="mb-2 block font-medium text-gray-300 text-sm">
              Full Name
            </label>
            <input
              className="w-full rounded-lg border border-purple-500/30 bg-black/40 px-4 py-3 text-white"
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter full name"
              type="text"
              value={name}
            />
          </div>
          <div>
            <label className="mb-2 block font-medium text-gray-300 text-sm">
              Email
            </label>
            <input
              className="w-full rounded-lg border border-purple-500/30 bg-black/40 px-4 py-3 text-white"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              type="email"
              value={email}
            />
          </div>
          <div>
            <label className="mb-2 block font-medium text-gray-300 text-sm">
              Password
            </label>
            <input
              className="w-full rounded-lg border border-purple-500/30 bg-black/40 px-4 py-3 text-white"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password (min 8 characters)"
              type="password"
              value={password}
            />
          </div>
          <div>
            <label className="mb-2 block font-medium text-gray-300 text-sm">
              Role
            </label>
            <select
              className="w-full rounded-lg border border-purple-500/30 bg-black/40 px-4 py-3 text-white"
              onChange={(e) => setRole(e.target.value)}
              value={role}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
            disabled={isLoading}
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
            disabled={isLoading}
            onClick={handleAddUser}
          >
            {isLoading ? "Adding..." : "Add User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
