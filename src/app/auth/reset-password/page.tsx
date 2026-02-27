"use client";

import { useState, useEffect, Suspense } from "react";
import { Loader2, ArrowLeft, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AuthField } from "@/components/auth/auth-field";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

function ResetPasswordForm() {
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("Invalid or expired reset link. Please request a new one.");
      }
      setSessionChecked(true);
    }

    checkSession();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      setError("Password is required.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message || "Failed to reset password.");
        return;
      }

      setSuccess(true);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      setError(axiosError.response?.data?.error || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8">
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-xl font-black text-gray-900 mb-2">
                Password Reset
              </h1>
              <p className="text-gray-500 text-sm mb-6">
                Your password has been successfully reset.
              </p>
              <Button
                asChild
                className="w-full h-12 rounded-xl font-semibold bg-blue-500 hover:bg-blue-600"
              >
                <Link href="/auth/login">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-xl font-black text-gray-900">
              Reset Password
            </h1>
            <p className="text-gray-500 text-sm mt-2">
              Enter a new password for your account.
            </p>
          </div>

          {error && (
            <Alert
              variant="destructive"
              className="mb-4 border-red-200 bg-red-50 text-red-800 rounded-[10px] py-3"
            >
              <AlertTitle className="text-sm font-semibold">Error</AlertTitle>
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <AuthField
              id="password"
              label="New Password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              error={password.length > 0 && password.length < 8 ? "Password must be at least 8 characters" : undefined}
              disabled={loading}
              hint="Minimum 8 characters"
            />

            <AuthField
              id="confirmPassword"
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError(null);
              }}
              error={confirmPassword.length > 0 && confirmPassword !== password ? "Passwords do not match" : undefined}
              disabled={loading}
            />

            <Button
              type="submit"
              disabled={loading || !!error}
              className="w-full h-12 rounded-xl font-semibold bg-blue-500 hover:bg-blue-600 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/auth/login"
              className="text-sm text-blue-500 hover:text-blue-600 font-medium inline-flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
