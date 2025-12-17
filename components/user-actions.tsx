"use client";

import { useState } from "react";
import { Edit, Trash2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { updateUserByAdmin, deleteUser, sendEmailToUser } from "@/server/users";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface UserActionsProps {
  userId: string;
  userName: string;
  userEmail: string;
  currentRole: string;
  onActionComplete?: () => void;
}

export function UserActions({ userId, userName, userEmail, currentRole, onActionComplete }: UserActionsProps) {
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
    if (!editName.trim() || !editEmail.trim()) {
      toast.error("Name and email are required");
      return;
    }

    setIsLoading(true);
    const result = await updateUserByAdmin(userId, editName, editEmail, selectedRole);
    
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
    if (!emailSubject.trim() || !emailMessage.trim()) {
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
          size="sm" 
          className="bg-purple-600 hover:bg-purple-700 text-white"
          onClick={() => setIsEditOpen(true)}
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="border-blue-500/50 text-blue-400 hover:bg-blue-900/20"
          onClick={() => setIsEmailOpen(true)}
        >
          <Mail className="w-4 h-4" />
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="border-red-500/50 text-red-400 hover:bg-red-900/20"
          onClick={() => setIsDeleteOpen(true)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-[#1a1a2e] border-purple-500/30 text-white">
          <DialogHeader>
            <DialogTitle>Edit User Information</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update user details and role
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-black/40 border border-purple-500/30 rounded-lg px-4 py-3 text-white"
                placeholder="Enter full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full bg-black/40 border border-purple-500/30 rounded-lg px-4 py-3 text-white"
                placeholder="Enter email address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
              <select 
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full bg-black/40 border border-purple-500/30 rounded-lg px-4 py-3 text-white"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => setIsEditOpen(false)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              onClick={handleUserUpdate}
              disabled={isLoading}
            >
              {isLoading ? "Updating..." : "Update User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <Dialog open={isEmailOpen} onOpenChange={setIsEmailOpen}>
        <DialogContent className="bg-[#1a1a2e] border-purple-500/30 text-white">
          <DialogHeader>
            <DialogTitle>Send Email</DialogTitle>
            <DialogDescription className="text-gray-400">
              Send an email to {userName} ({userEmail})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Subject</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full bg-black/40 border border-purple-500/30 rounded-lg px-4 py-3 text-white"
                placeholder="Enter email subject"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
              <textarea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={4}
                className="w-full bg-black/40 border border-purple-500/30 rounded-lg px-4 py-3 text-white"
                placeholder="Enter your message"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => setIsEmailOpen(false)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              onClick={handleSendEmail}
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-[#1a1a2e] border-purple-500/30 text-white">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete {userName}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              onClick={() => setIsDeleteOpen(false)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
