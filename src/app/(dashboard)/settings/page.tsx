"use client";

import { useState } from "react";
import axios, { AxiosError } from "axios";
import { Lock, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TopBar } from "@/components/dashboard/top-bar";
import { useSessionUser } from "@/components/auth/auth-context";
import { toast } from "sonner";

export default function SettingsPage() {
  const user = useSessionUser();
  const [loading, setLoading] = useState(false);
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

    setLoading(true);
    try {
      await axios.post("/api/profile/change-password", {
        current_password: formData.current_password,
        new_password: formData.new_password,
      });
      toast.success("Password changed successfully");
      setSuccess(true);
      setFormData({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (err) {
      const e = err as AxiosError<{ error: string }>;
      toast.error(e.response?.data?.error ?? "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const headerUser = { name: user.name, email: user.email, role: user.role };

  return (
    <>
      <TopBar title="Settings" user={headerUser} />
      <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto w-full space-y-6">
        <Card className="rounded-3xl border border-gray-200 shadow-sm">
          <CardHeader className="pb-4 border-b border-gray-100">
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-500" />
              Change Password
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Update your password to keep your account secure
            </p>
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
                  disabled={loading}
                  className="w-full h-11 rounded-[10px] bg-blue-500 hover:bg-blue-600 text-white font-semibold gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  {loading ? "Changing Password..." : "Change Password"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-gray-200 shadow-sm">
          <CardHeader className="pb-4 border-b border-gray-100">
            <CardTitle className="text-xl font-bold text-gray-900">
              Account Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
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
          </CardContent>
        </Card>
      </div>
    </>
  );
}
