"use client";

import { useState, useCallback, SubmitEvent, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AuthField } from "@/components/auth/auth-field";
import { RoleTabs, type UserRole } from "@/components/auth/role-tabs";
import { authService } from "@/services/auth";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface FormValues {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.email.trim()) {
    errors.email = "Email address is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (!values.password) {
    errors.password = "Password is required.";
  }

  return errors;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const redirectTo = searchParams.get("redirectTo");

  const [role, setRole] = useState<UserRole>("landlord");
  const [values, setValues] = useState<FormValues>({ email: "", password: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showConfirmedModal, setShowConfirmedModal] = useState(false);

  useEffect(() => {
    if (status === "confirmed") {
      setShowConfirmedModal(true);
      router.replace("/auth/login", { scroll: false });
    }
    if (status === "error") {
      setServerError("Email confirmation failed. Please try again.");
    }
  }, [status, router]);

  const handleChange = useCallback(
    (field: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
      if (serverError) setServerError(null);
    },
    [errors, serverError],
  );

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationErrors = validate(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setServerError(null);

    try {
      const result = await authService.signIn(
        values.email.trim(),
        values.password,
      );

      if (result.error) {
        setServerError(result.error);
        return;
      }

      if (result.data) {
        setSuccess(true);

        if (typeof window !== "undefined") {
          sessionStorage.setItem("rl_user", JSON.stringify(result.data.user));
        }

        toast.success("Welcome back!", {
          description: `Logged in as ${result.data.user.full_name ?? result.data.user.email}.`,
        });

        setTimeout(() => router.push(redirectTo ?? "/dashboard"), 1000);
      }
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <RoleTabs value={role} onChange={setRole} />

        <Separator className="bg-gray-100" />

        {serverError && (
          <Alert
            variant="destructive"
            className="border-red-200 bg-red-50 text-red-800 rounded-[10px] py-3"
          >
            <AlertTitle className="text-sm font-semibold leading-none mb-1">
              Authentication Error
            </AlertTitle>
            <AlertDescription className="text-xs leading-relaxed">
              {serverError}
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50 text-green-800 rounded-[10px] py-3">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <AlertTitle className="text-sm font-semibold leading-none mb-1">
              Login successful
            </AlertTitle>
            <AlertDescription className="text-xs">
              Taking you to your dashboard...
            </AlertDescription>
          </Alert>
        )}

        <AuthField
          id="login-email"
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={values.email}
          onChange={handleChange("email")}
          error={errors.email}
          disabled={loading || success}
        />

        <div className="space-y-1">
          <AuthField
            id="login-password"
            label="Password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={values.password}
            onChange={handleChange("password")}
            error={errors.password}
            disabled={loading || success}
          />
          <div className="flex justify-end">
            <Link
              href="/auth/forgot-password"
              className="text-xs text-blue-500 hover:text-blue-600 hover:underline underline-offset-2 transition-colors font-medium"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading || success}
          className={cn(
            "w-full h-12 rounded-xl font-semibold text-[0.9375rem] gap-2 mt-2",
            "bg-blue-500 hover:bg-blue-600 text-white",
            "transition-all duration-150",
            "hover:shadow-lg hover:shadow-blue-200 hover:-translate-y-px",
            "disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none",
          )}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing in...
            </>
          ) : success ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Redirecting...
            </>
          ) : (
            "Continue"
          )}
        </Button>

        <p className="text-center text-[0.75rem] text-gray-400 font-[Roboto,sans-serif] leading-relaxed">
          By clicking Continue, you agree to our{" "}
          <a
            href="/terms"
            className="text-blue-500 hover:text-blue-600 hover:underline underline-offset-2 transition-colors"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="/privacy"
            className="text-blue-500 hover:text-blue-600 hover:underline underline-offset-2 transition-colors"
          >
            Privacy Policy
          </a>
          .
        </p>
      </form>

      <Dialog open={showConfirmedModal} onOpenChange={setShowConfirmedModal}>
        <DialogContent className="sm:max-w-[420px] p-0 rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
          <DialogHeader className="pb-0 pt-6 px-6">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <DialogTitle className="text-xl font-black text-center tracking-tight">
              Email Confirmed!
            </DialogTitle>
            <p className="text-sm text-gray-500 text-center leading-relaxed">
              Your email has been successfully verified. You can now log in to
              your account.
            </p>
          </DialogHeader>

          <div className="px-6 pb-6 pt-2">
            <Button
              onClick={() => setShowConfirmedModal(false)}
              className="w-full h-12 rounded-xl font-semibold gap-2 bg-blue-500 hover:bg-blue-600"
            >
              Proceed to Login
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
