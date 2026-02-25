import axios from "axios";
import type { UserRole } from "@/types/database";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
}

export interface AuthResult<T = unknown> {
  data: T | null;
  error: string | null;
}

const API_BASE = "/api/auth";

export const authService = {
  async signUp(
    email: string,
    password: string,
    fullName: string,
    phone?: string,
    role: UserRole = "tenant",
  ): Promise<AuthResult<AuthUser>> {
    try {
      const { data, status } = await axios.post<AuthUser | { error: string }>(
        `${API_BASE}/signup`,
        { email, password, fullName, phone, role },
      );

      if ("error" in data) {
        return { data: null, error: data.error };
      }

      if (status === 200 || status === 201) {
        return { data: data as AuthUser, error: null };
      }

      console.log(data, status);

      return { data: null, error: "Failed to create account" };
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "Failed to create account";
      return { data: null, error: message };
    }
  },

  async signIn(
    email: string,
    password: string,
  ): Promise<AuthResult<{ user: AuthUser }>> {
    try {
      const { data, status } = await axios.post<{ user: AuthUser } | { error: string }>(
        `${API_BASE}/signin`,
        { email, password },
      );

      if ("error" in data) {
        return { data: null, error: data.error };
      }

      if (status === 200) {
        return { data: { user: data.user }, error: null };
      }

      return { data: null, error: "Invalid email or password" };
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "Invalid email or password";
      return { data: null, error: message };
    }
  },

  async signOut(): Promise<AuthResult> {
    try {
      await axios.post(`${API_BASE}/signout`);
      return { data: null, error: null };
    } catch (err) {
      const message = axios.isAxiosError(err) ? err.message : "Sign out failed";
      return { data: null, error: message };
    }
  },

  async getCurrentUser(): Promise<AuthResult<AuthUser>> {
    try {
      const { data, status } = await axios.get<AuthUser | { error: string }>(
        `${API_BASE}/me`,
      );

      if ("error" in data) {
        return { data: null, error: data.error };
      }

      if (status === 200) {
        return { data: data as AuthUser, error: null };
      }

      return { data: null, error: "Not authenticated" };
    } catch (err) {
      console.log(err);
      return { data: null, error: "Not authenticated" };
    }
  },
};
