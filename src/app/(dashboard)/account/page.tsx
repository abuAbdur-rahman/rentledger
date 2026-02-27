"use client";

import { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  Pencil,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TopBar } from "@/components/dashboard/top-bar";
import { useSessionUser } from "@/components/auth/auth-context";
import { useProfile, useUpdateProfile, useChangePassword } from "@/hooks";
import { toast } from "sonner";

const NOTIFICATION_REFRESH_KEY = "rl_notification_refresh_interval";
const DEFAULT_REFRESH_INTERVAL = 5 * 60 * 1000;

function ProfileTab() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<{
    full_name: string;
    phone_number: string;
  }>(() => {
    if (profile) {
      return {
        full_name: profile.full_name || "",
        phone_number: profile.phone_number || "",
      };
    }
    return { full_name: "", phone_number: "" };
  });

  /*
  // Update formData when profile changes (only when not editing)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (profile && !isEditing) {
      setFormData({
        full_name: profile.full_name || "",
        phone_number: profile.phone_number || "",
      });
    }
  }, [profile, isEditing]);
  */

  // Update formData when profile changes (only when not editing)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (profile && !isEditing) {
        setFormData({
          full_name: profile.full_name || "",
          phone_number: profile.phone_number || "",
        });
      }
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [profile, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync(formData);
      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch {
      toast.error("Failed to update profile");
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: profile?.full_name || "",
      phone_number: profile?.phone_number || "",
    });
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <Card className="rounded-3xl border border-gray-200 shadow-sm">
      <CardHeader className="pb-4 border-b border-gray-100 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl font-bold text-gray-900">
            My Profile
          </CardTitle>
          <CardDescription className="text-sm text-gray-500 mt-1">
            Manage your personal information
          </CardDescription>
        </div>
        {!isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="rounded-xl gap-1"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-lg shadow-blue-200">
            <User className="w-10 h-10 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {profile?.full_name || "Your Name"}
            </h3>
            <p className="text-sm text-gray-500 capitalize">{profile?.role}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Full Name
            </label>
            {isEditing ? (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  placeholder="Enter your full name"
                  className="pl-10 h-11 rounded-[10px] border-gray-200 focus-visible:border-blue-500"
                />
              </div>
            ) : (
              <p className="text-sm text-gray-900 bg-gray-50 rounded-lg px-4 py-3">
                {profile?.full_name || "Not set"}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={profile?.email || ""}
                disabled
                className="pl-10 h-11 rounded-[10px] border-gray-200 bg-gray-50 text-gray-500"
              />
            </div>
            <p className="text-xs text-gray-400">Email cannot be changed</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Phone Number
            </label>
            {isEditing ? (
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={formData.phone_number}
                  onChange={(e) =>
                    setFormData({ ...formData, phone_number: e.target.value })
                  }
                  placeholder="Enter your phone number"
                  className="pl-10 h-11 rounded-[10px] border-gray-200 focus-visible:border-blue-500"
                />
              </div>
            ) : (
              <p className="text-sm text-gray-900 bg-gray-50 rounded-lg px-4 py-3">
                {profile?.phone_number || "Not set"}
              </p>
            )}
          </div>

          {profile?.created_at && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Member Since
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={new Date(profile.created_at).toLocaleDateString(
                    "en-US",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    },
                  )}
                  disabled
                  className="pl-10 h-11 rounded-[10px] border-gray-200 bg-gray-50 text-gray-500"
                />
              </div>
            </div>
          )}

          {isEditing && (
            <div className="pt-4 flex gap-3">
              <Button
                type="submit"
                disabled={updateProfile.isPending}
                onClick={handleSubmit}
                className="flex-1 h-11 rounded-[10px] bg-blue-500 hover:bg-blue-600 text-white font-semibold gap-2"
              >
                {updateProfile.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {updateProfile.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="flex-1 h-11 rounded-[10px] font-semibold gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PasswordTab() {
  const changePassword = useChangePassword();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccess(false);

    if (formData.new_password !== formData.confirm_password) {
      toast.error("New passwords do not match");
      return;
    }

    if (formData.new_password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      await changePassword.mutateAsync({
        currentPassword: formData.current_password,
        newPassword: formData.new_password,
      });
      toast.success("Password changed successfully");
      setSuccess(true);
      setFormData({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch {
      toast.error("Failed to change password");
    }
  };

  return (
    <Card className="rounded-3xl border border-gray-200 shadow-sm">
      <CardHeader className="pb-4 border-b border-gray-100">
        <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Lock className="w-5 h-5 text-blue-500" />
          Change Password
        </CardTitle>
        <CardDescription className="text-sm text-gray-500 mt-1">
          Update your password to keep your account secure
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {success && (
          <div className="mb-6 p-4 rounded-2xl bg-green-50 border border-green-200 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            <p className="text-sm text-green-800 font-medium">
              Your password has been changed successfully!
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Current Password
            </label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                value={formData.current_password}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    current_password: e.target.value,
                  })
                }
                placeholder="Enter current password"
                className="pr-10 h-11 rounded-[10px] border-gray-200 focus-visible:border-blue-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrent ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              New Password
            </label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={formData.new_password}
                onChange={(e) =>
                  setFormData({ ...formData, new_password: e.target.value })
                }
                placeholder="Enter new password"
                className="pr-10 h-11 rounded-[10px] border-gray-200 focus-visible:border-blue-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNew ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Must be at least 6 characters
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Confirm New Password
            </label>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                value={formData.confirm_password}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    confirm_password: e.target.value,
                  })
                }
                placeholder="Confirm new password"
                className="pr-10 h-11 rounded-[10px] border-gray-200 focus-visible:border-blue-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              disabled={changePassword.isPending}
              className="w-full h-11 rounded-[10px] bg-blue-500 hover:bg-blue-600 text-white font-semibold gap-2"
            >
              {changePassword.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              {changePassword.isPending
                ? "Changing Password..."
                : "Change Password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SettingsTab() {
  const getInitialInterval = () => {
    if (typeof window === "undefined") return DEFAULT_REFRESH_INTERVAL;
    const stored = localStorage.getItem(NOTIFICATION_REFRESH_KEY);
    if (stored) {
      const interval = parseInt(stored, 10);
      if (!isNaN(interval) && interval >= 0) {
        return interval;
      }
    }
    return DEFAULT_REFRESH_INTERVAL;
  };
  const [refreshInterval, setRefreshInterval] = useState(getInitialInterval);

  const handleRefreshIntervalChange = (minutes: string) => {
    const mins = parseInt(minutes, 10);
    const interval = mins * 60 * 1000;
    setRefreshInterval(interval);
    localStorage.setItem(NOTIFICATION_REFRESH_KEY, String(interval));
    toast.success(
      mins === 0
        ? "Auto-refresh disabled"
        : `Notifications will refresh every ${mins} minute${mins > 1 ? "s" : ""}`,
    );
  };

  return (
    <Card className="rounded-3xl border border-gray-200 shadow-sm">
      <CardHeader className="pb-4 border-b border-gray-100">
        <CardTitle className="text-xl font-bold text-gray-900">
          Account Settings
        </CardTitle>
        <CardDescription className="text-sm text-gray-500 mt-1">
          Manage your notification preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Notification Refresh
            </p>
            <p className="text-xs text-gray-500">
              How often should notifications auto-refresh
            </p>
          </div>
          <Select
            value={String(refreshInterval / 60000)}
            onValueChange={handleRefreshIntervalChange}
          >
            <SelectTrigger className="w-full h-11 rounded-xl">
              <SelectValue placeholder="Select refresh interval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Manual only (disabled)</SelectItem>
              <SelectItem value="1">Every 1 minute</SelectItem>
              <SelectItem value="5">Every 5 minutes</SelectItem>
              <SelectItem value="10">Every 10 minutes</SelectItem>
              <SelectItem value="15">Every 15 minutes</SelectItem>
              <SelectItem value="30">Every 30 minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border-t border-gray-100 pt-6 space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-3">
              Upcoming Features
            </p>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Email Notifications
              </p>
              <p className="text-xs text-gray-500">
                Receive email updates about your account
              </p>
            </div>
            <Button
              variant="outline"
              className="rounded-xl text-sm h-9"
              disabled
            >
              Coming Soon
            </Button>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                SMS Notifications
              </p>
              <p className="text-xs text-gray-500">
                Receive text messages for important updates
              </p>
            </div>
            <Button
              variant="outline"
              className="rounded-xl text-sm h-9"
              disabled
            >
              Coming Soon
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AccountPage() {
  const user = useSessionUser();
  const headerUser = { name: user.name, email: user.email, role: user.role };

  return (
    <>
      <TopBar title="Account" user={headerUser} />
      <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto w-full">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-gray-100 p-1 rounded-[10px] h-auto gap-1">
            <TabsTrigger
              value="profile"
              className="rounded-xl text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm px-4 py-2"
            >
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="password"
              className="rounded-xl text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm px-4 py-2"
            >
              <Lock className="w-4 h-4 mr-2" />
              Password
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="rounded-xl text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm px-4 py-2"
            >
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileTab />
          </TabsContent>
          <TabsContent value="password">
            <PasswordTab />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
