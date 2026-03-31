import React, { useState, useRef } from "react";
import { Input } from "./input";
import { Button } from "./button";
import { Label } from "./label";
import { Avatar, AvatarImage, AvatarFallback } from "./avatar";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const DEFAULT_AVATAR = "/placeholder.svg";

const ProfileForm: React.FC = () => {
  const { user, updateProfile, refreshProfilePicture } = useAuth();
  const [firstName, setFirstName] = useState(user?.name.split(" ")[0] || "");
  const [lastName, setLastName] = useState(user?.name.split(" ").slice(1).join(" ") || "");
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload avatar handler (to DB)
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('avatar', file);
      setLoading(true);
      
      try {
        const token = document.cookie.split('; ').find(row => row.startsWith('emsi_access='))?.split('=')[1];
        
        // Upload to database endpoint
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'}/auth/profile/picture/upload/`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        
        if (!res.ok) throw new Error('Upload failed');
        
        // Refresh the profile picture in the context
        await refreshProfilePicture();
        toast.success('Profile picture updated!');
      } catch (err) {
        toast.error('Upload failed');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  // Change password handler
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return toast.error('Enter a new password');
    setPasswordLoading(true);
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('emsi_access='))?.split('=')[1];
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'}/auth/change-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ new_password: password }),
      });
      if (!res.ok) throw new Error('Password change failed');
      toast.success('Password changed!');
      setPassword("");
    } catch (err) {
      toast.error('Password change failed');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Profile update handler
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({ first_name: firstName, last_name: lastName });
      toast.success("Profile updated!");
    } catch (err) {
      toast.error("Update failed: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className="w-full max-w-lg space-y-6 bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 flex flex-col items-center border border-gray-200 dark:border-gray-800 transition-colors duration-300"
      onSubmit={handleProfileUpdate}
      encType="multipart/form-data"
    >
      <div className="flex flex-col items-center gap-2">
        <Avatar className="h-24 w-24 border-2 border-primary dark:border-accent bg-gray-100 dark:bg-gray-800">
          <AvatarImage src={user?.profilePicture || user?.avatar || DEFAULT_AVATAR} alt={firstName} className="object-cover" />
          <AvatarFallback className="bg-accent text-white text-3xl dark:bg-gray-700">{firstName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex gap-2 mt-2">
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={loading} className="dark:bg-gray-800 dark:text-white">Upload</Button>
        </div>
        <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleAvatarUpload} />
      </div>
      <div className="w-full">
        <Label htmlFor="username">Username</Label>
        <Input id="username" value={user?.email?.split('@')[0] || ""} readOnly disabled className="dark:bg-gray-800 dark:text-gray-300" />
      </div>
      <div className="w-full">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={user?.email || ""} readOnly disabled className="dark:bg-gray-800 dark:text-gray-300" />
      </div>
      <div className="w-full">
        <Label htmlFor="firstName">First Name</Label>
        <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} required className="dark:bg-gray-800 dark:text-white" />
      </div>
      <div className="w-full">
        <Label htmlFor="lastName">Last Name</Label>
        <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} required className="dark:bg-gray-800 dark:text-white" />
      </div>
      <Button type="submit" disabled={loading} className="w-full dark:bg-primary dark:text-white">{loading ? "Saving..." : "Save Changes"}</Button>
      <div className="space-y-4 mt-6 w-full">
        <div>
          <Label htmlFor="newPassword">Set New Password</Label>
          <Input id="newPassword" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" className="dark:bg-gray-800 dark:text-white" />
        </div>
        <Button type="button" onClick={handlePasswordChange} disabled={passwordLoading} className="w-full dark:bg-primary dark:text-white">{passwordLoading ? "Changing..." : "Change Password"}</Button>
      </div>
    </form>
  );
};

export { ProfileForm };