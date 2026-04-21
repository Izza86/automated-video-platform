"use client";

import { Loader2, Shield, User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAllUsers } from "@/server/admin";
import { UserActions } from "./user-actions";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  createdAt: Date;
  image: string | null;
}

export function UsersTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadUsers = async () => {
    setLoading(true);
    const result = await getAllUsers();
    if (result.success) {
      setUsers(result.users as User[]);
    } else {
      toast.error(result.message || "Failed to load users");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-purple-600/20 bg-black/40">
      <Table>
        <TableHeader>
          <TableRow className="border-purple-600/20 hover:bg-purple-900/10">
            <TableHead className="text-purple-300">User</TableHead>
            <TableHead className="text-purple-300">Email</TableHead>
            <TableHead className="text-purple-300">Role</TableHead>
            <TableHead className="text-purple-300">Status</TableHead>
            <TableHead className="text-purple-300">Joined</TableHead>
            <TableHead className="text-right text-purple-300">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow
              className="border-purple-600/20 hover:bg-purple-900/10"
              key={user.id}
            >
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  {user.image ? (
                    <img
                      alt={user.name}
                      className="h-8 w-8 rounded-full object-cover"
                      src={user.image}
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600">
                      <UserIcon className="h-4 w-4" />
                    </div>
                  )}
                  <span className="text-white">{user.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-white/70">{user.email}</TableCell>
              <TableCell>
                {user.role === "admin" ? (
                  <Badge className="bg-yellow-600 text-black">
                    <Shield className="mr-1 h-3 w-3" />
                    Admin
                  </Badge>
                ) : (
                  <Badge className="bg-purple-600 text-white">User</Badge>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  className={
                    user.emailVerified ? "bg-green-600" : "bg-gray-600"
                  }
                >
                  {user.emailVerified ? "Verified" : "Unverified"}
                </Badge>
              </TableCell>
              <TableCell className="text-white/70">
                {new Date(user.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <UserActions
                  currentRole={user.role}
                  onActionComplete={handleRefresh}
                  userEmail={user.email}
                  userId={user.id}
                  userName={user.name}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {users.length === 0 && (
        <div className="py-12 text-center text-white/60">No users found</div>
      )}
    </div>
  );
}
