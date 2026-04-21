"use client";

import { Edit, Mail, Trash2 } from "lucide-react";
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
} from "@/components/ui/dialog";
import { deleteUser, sendEmailToUser, updateUserByAdmin } from "@/server/users";

interface UserActionsProps {
  userId: string;
  userName: string;
  userEmail: string;
  currentRole: string;
  onActionComplete?: () => void;
}

export function UserActions({
  userId,
  userName,
  userEmail,
  currentRole,
  onActionComplete,
}: UserActionsProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [editName, setEditName] = useState(userName);
  const [editEmail, setEditEmail] = useState(userEmail);
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleUserUpdate = async () => {
    if (!(editName.trim() && editEmail.trim())) {
      toast.error("Name and email are required");
      return;
    }

    setIsLoading(true);
    const result = await updateUserByAdmin(
      userId,
      editName,
      editEmail,
      selectedRole
    );

    if (result.success) {
      toast.success(result.message);
      setIsEditOpen(false);
      if (onActionComplete) onActionComplete();
      router.refresh();
    } else {
      toast.error(result.message);
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    setIsLoading(true);
    const result = await deleteUser(userId);

    if (result.success) {
      toast.success(result.message);
      setIsDeleteOpen(false);
      if (onActionComplete) onActionComplete();
      router.refresh();
    } else {
      toast.error(result.message);
    }
    setIsLoading(false);
  };

  const handleSendEmail = async () => {
    if (!(emailSubject.trim() && emailMessage.trim())) {
      toast.error("Please fill in both subject and message");
      return;
    }

    setIsLoading(true);
    const result = await sendEmailToUser(userId, emailSubject, emailMessage);

    if (result.success) {
      toast.success(result.message);
      setIsEmailOpen(false);
      setEmailSubject("");
      setEmailMessage("");
    } else {
      toast.error(result.message);
    }
    setIsLoading(false);
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          className="bg-purple-600 text-white hover:bg-purple-700"
          onClick={() => setIsEditOpen(true)}
          size="sm"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          className="border-blue-500/50 text-blue-400 hover:bg-blue-900/20"
          onClick={() => setIsEmailOpen(true)}
          size="sm"
          variant="outline"
        >
          <Mail className="h-4 w-4" />
        </Button>
        <Button
          className="border-red-500/50 text-red-400 hover:bg-red-900/20"
          onClick={() => setIsDeleteOpen(true)}
          size="sm"
          variant="outline"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Edit User Dialog */}
      <Dialog onOpenChange={setIsEditOpen} open={isEditOpen}>
        <DialogContent className="border-purple-500/30 bg-[#1a1a2e] text-white">
          <DialogHeader>
            <DialogTitle>Edit User Information</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update user details and role
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-2 block font-medium text-gray-300 text-sm">
                Full Name
              </label>
              <input
                className="w-full rounded-lg border border-purple-500/30 bg-black/40 px-4 py-3 text-white"
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter full name"
                type="text"
                value={editName}
              />
            </div>
            <div>
              <label className="mb-2 block font-medium text-gray-300 text-sm">
                Email
              </label>
              <input
                className="w-full rounded-lg border border-purple-500/30 bg-black/40 px-4 py-3 text-white"
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="Enter email address"
                type="email"
                value={editEmail}
              />
            </div>
            <div>
              <label className="mb-2 block font-medium text-gray-300 text-sm">
                Role
              </label>
              <select
                className="w-full rounded-lg border border-purple-500/30 bg-black/40 px-4 py-3 text-white"
                onChange={(e) => setSelectedRole(e.target.value)}
                value={selectedRole}
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
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
              disabled={isLoading}
              onClick={handleUserUpdate}
            >
              {isLoading ? "Updating..." : "Update User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <Dialog onOpenChange={setIsEmailOpen} open={isEmailOpen}>
        <DialogContent className="border-purple-500/30 bg-[#1a1a2e] text-white">
          <DialogHeader>
            <DialogTitle>Send Email</DialogTitle>
            <DialogDescription className="text-gray-400">
              Send an email to {userName} ({userEmail})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-2 block font-medium text-gray-300 text-sm">
                Subject
              </label>
              <input
                className="w-full rounded-lg border border-purple-500/30 bg-black/40 px-4 py-3 text-white"
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Enter email subject"
                type="text"
                value={emailSubject}
              />
            </div>
            <div>
              <label className="mb-2 block font-medium text-gray-300 text-sm">
                Message
              </label>
              <textarea
                className="w-full rounded-lg border border-purple-500/30 bg-black/40 px-4 py-3 text-white"
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Enter your message"
                rows={4}
                value={emailMessage}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
              disabled={isLoading}
              onClick={() => setIsEmailOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
              disabled={isLoading}
              onClick={handleSendEmail}
            >
              {isLoading ? "Sending..." : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog onOpenChange={setIsDeleteOpen} open={isDeleteOpen}>
        <DialogContent className="border-purple-500/30 bg-[#1a1a2e] text-white">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete {userName}? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
              disabled={isLoading}
              onClick={() => setIsDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
              disabled={isLoading}
              onClick={handleDelete}
            >
              {isLoading ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
