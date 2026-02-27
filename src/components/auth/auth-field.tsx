"use client";

import { forwardRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ label, error, hint, className, type, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className="space-y-1.5">
        <Label
          htmlFor={id}
          className="text-sm font-semibold text-gray-700 tracking-[-0.01em]"
        >
          {label}
        </Label>

        <div className="relative">
          <Input
            ref={ref}
            id={id}
            type={inputType}
            className={cn(
              "h-12 rounded-xl border bg-white px-4 text-sm text-gray-900",
              "placeholder:text-gray-400 font-[Roboto,sans-serif]",
              "transition-all duration-150",
              "focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500",
              error
                ? "border-red-400 bg-red-50/40 focus-visible:ring-red-200 focus-visible:border-red-500"
                : "border-gray-200 hover:border-gray-300",
              isPassword && "pr-11",
              className,
            )}
            {...props}
          />

          {/* Password toggle */}
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-0.5"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-xs font-medium text-red-500 flex items-center gap-1">
            <span className="inline-block w-1 h-1 rounded-full bg-red-500 shrink-0" />
            {error}
          </p>
        )}

        {/* Hint (when no error) */}
        {hint && !error && (
          <p className="text-xs text-gray-400 font-[Roboto,sans-serif]">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

AuthField.displayName = "AuthField";
