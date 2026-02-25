"use client";

import { useState, useCallback, SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Phone, Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AuthField } from "@/components/auth/auth-field";
import { RoleTabs, type UserRole } from "@/components/auth/role-tabs";
import { authService } from "@/services/auth";
import { cn } from "@/lib/utils";

interface FormValues {
  fullName: string;
  email: string;
  password: string;
  phone: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  phone?: string;
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.fullName.trim()) {
    errors.fullName = "Full name is required.";
  } else if (values.fullName.trim().length < 2) {
    errors.fullName = "Name must be at least 2 characters.";
  }

  if (!values.email.trim()) {
    errors.email = "Email address is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (!values.password) {
    errors.password = "Password is required.";
  } else if (values.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  if (!values.phone.trim()) {
    errors.phone = "Phone number is required.";
  } else if (!/^(?:(?:\+234)|0)(?:70|80|81|82|83|90|91)\d{8}$/.test(values.phone.trim())) {
    errors.phone = "Please enter a valid Nigerian phone number.";
  }

  return errors;
}

export function RegisterForm() {
  const router = useRouter();

  const [role, setRole] = useState<UserRole>("landlord");
  const [values, setValues] = useState<FormValues>({
    fullName: "",
    email: "",
    password: "",
    phone: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

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

  const handleRoleChange = useCallback((r: UserRole) => {
    setRole(r);
    setServerError(null);
  }, []);

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
      const result = await authService.signUp(
        values.email.trim(),
        values.password,
        values.fullName.trim(),
        values.phone.trim(),
        role,
      );

      if (result.error) {
        setServerError(result.error);
        setLoading(false);
        return;
      }

      if (result.data) {
        setRegisteredEmail(values.email.trim());
        setSuccess(true);

        toast.success("Account created!", {
          description: `Welcome to RentLedger, ${result.data.full_name.split(" ")[0] || ""}!`,
        });
      }
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reSignUp = async () => {
    if (registeredEmail) {
      setLoading(true);
      await authService.signUp(
        registeredEmail,
        values.password,
        values.fullName.trim(),
        values.phone.trim(),
        role,
      );
      setLoading(false);
      toast.success("Confirmation email resent!");
    }
  };

  const handleGoToLogin = () => {
    router.push("/auth/login");
  };

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <RoleTabs value={role} onChange={handleRoleChange} />

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

        <AuthField
          id="fullName"
          label="Full Name"
          type="text"
          placeholder="e.g. John Doe"
          autoComplete="name"
          value={values.fullName}
          onChange={handleChange("fullName")}
          error={errors.fullName}
          disabled={loading || success}
        />

        <AuthField
          id="email"
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={values.email}
          onChange={handleChange("email")}
          error={errors.email}
          disabled={loading || success}
        />

        <AuthField
          id="password"
          label="Password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          value={values.password}
          onChange={handleChange("password")}
          error={errors.password}
          hint="Minimum 8 characters"
          disabled={loading || success}
        />

        <div className="relative">
          <AuthField
            id="phone"
            label="Phone Number"
            type="tel"
            placeholder="e.g. 08012345678"
            autoComplete="tel"
            value={values.phone}
            onChange={handleChange("phone")}
            error={errors.phone}
            disabled={loading || success}
            className="pl-10"
          />
          <Phone className="absolute left-3 bottom-3.25 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        <Button
          type="submit"
          disabled={loading || success}
          className={cn(
            "w-full h-12 rounded-xl font-semibold text-[0.9375rem] gap-2",
            "bg-blue-500 hover:bg-blue-600 text-white",
            "transition-all duration-150",
            "hover:shadow-lg hover:shadow-blue-200 hover:-translate-y-px",
            "disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none",
          )}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating account...
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

      <Dialog open={success} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-105 p-0 rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
          <DialogHeader className="pb-0">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <DialogTitle className="text-xl font-black text-center tracking-tight">
              Check your email
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 text-center leading-relaxed">
              We&apos;ve sent a confirmation link to{" "}
              <span className="font-semibold text-gray-700">
                {registeredEmail}
              </span>
              .
              <br />
              Click the link to verify your account.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6 pt-2">
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-gray-700">
                    Didn&apos;t receive the email?
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    Check your spam folder, or{" "}
                    <button
                      type="button"
                      className="text-blue-500 hover:underline"
                      onClick={reSignUp}
                    >
                      click here to resend
                    </button>
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleGoToLogin}
              className="w-full h-12 rounded-xl font-semibold gap-2 bg-blue-500 hover:bg-blue-600"
            >
              Go to Login
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
