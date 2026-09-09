"use client";

import { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import { Save, User, Mail, Phone, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TopBar } from "@/components/dashboard/top-bar";
import { useSessionUser } from "@/components/auth/auth-context";
import { toast } from "sonner";

interface ProfileData {
  id: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  role: "landlord" | "tenant";
  created_at: string | null;
}

export default function ProfilePage() {
  const user = useSessionUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    phone_number: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await axios.get("/api/profile");
      if (data.profile) {
        setProfile(data.profile);
        setFormData({
          full_name: data.profile.full_name || "",
          phone_number: data.profile.phone_number || "",
        });
      }
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await axios.patch("/api/profile", formData);
      setProfile(data.profile);
      toast.success("Profile updated successfully");
    } catch (err) {
      const e = err as AxiosError<{ error: string }>;
      toast.error(e.response?.data?.error ?? "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const headerUser = { name: user.name, email: user.email, role: user.role };

  if (loading) {
    return (
      <>
        <TopBar title="Profile" user={headerUser} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Profile" user={headerUser} />
      <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto w-full">
        <Card className="rounded-3xl border border-gray-200 shadow-sm">
          <CardHeader className="pb-4 border-b border-gray-100">
            <CardTitle className="text-xl font-bold text-gray-900">
              My Profile
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Manage your personal information
            </p>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-20 h-20 rounded-full bg-linear-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-lg shadow-blue-200">
                <User className="w-10 h-10 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {profile?.full_name || "Your Name"}
                </h3>
                <p className="text-sm text-gray-500 capitalize">
                  {profile?.role}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Full Name
                </label>
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

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full h-11 rounded-[10px] bg-blue-500 hover:bg-blue-600 text-white font-semibold gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
