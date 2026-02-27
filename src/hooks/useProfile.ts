import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

interface ProfileData {
  id: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  role: "landlord" | "tenant";
  created_at: string | null;
}

interface UpdateProfileParams {
  full_name?: string;
  phone_number?: string;
}

async function fetchProfile(): Promise<ProfileData> {
  const { data } = await axios.get<{ profile: ProfileData }>("/api/profile");
  return data.profile;
}

async function updateProfile(params: UpdateProfileParams): Promise<ProfileData> {
  const { data } = await axios.patch<{ profile: ProfileData }>("/api/profile", params);
  return data.profile;
}

async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await axios.post("/api/profile/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      queryClient.setQueryData<ProfileData>(["profile"], data);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      changePassword(currentPassword, newPassword),
  });
}
