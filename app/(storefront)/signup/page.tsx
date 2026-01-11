"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signupAction } from "./actions";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    mobile: "",
    otp: "",
  });
  const [otpSent, setOtpSent] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const normalizeMobile = (phone: string): string => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) {
      return digits.slice(2);
    }
    return digits.slice(-10);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === "mobile") {
      const normalized = normalizeMobile(formData.mobile);
      if (!normalized || normalized.length !== 10) {
        newErrors.mobile = "Please enter a valid 10-digit mobile number";
      }
    } else {
      if (!formData.first_name.trim()) {
        newErrors.first_name = "First name is required";
      }

      if (!formData.last_name.trim()) {
        newErrors.last_name = "Last name is required";
      }

      if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = "Please enter a valid email address";
      }

      if (!formData.otp || !/^\d{6}$/.test(formData.otp)) {
        newErrors.otp = "Please enter a valid 6-digit OTP";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendOtp = async () => {
    setServerError(null);
    if (!validateForm()) {
      return;
    }

    const normalized = normalizeMobile(formData.mobile);

    try {
      const response = await fetch("/api/auth/customer/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: normalized }),
      });

      const data = await response.json();

      if (!data.success) {
        setServerError(data.error || "Failed to send OTP");
        return;
      }

      setOtpSent(true);
      setStep("otp");
      setErrors({});
    } catch (err: unknown) {
      setServerError("Unable to send OTP. Please try again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (step === "mobile") {
      await handleSendOtp();
      return;
    }

    if (!validateForm()) {
      return;
    }

    startTransition(async () => {
      const normalized = normalizeMobile(formData.mobile);
      const formDataToSend = new FormData();
      formDataToSend.append("mobile", normalized);
      formDataToSend.append("first_name", formData.first_name.trim());
      formDataToSend.append("last_name", formData.last_name.trim());
      if (formData.email.trim()) {
        formDataToSend.append("email", formData.email.trim());
      }
      formDataToSend.append("otp", formData.otp);

      const result = await signupAction(formDataToSend);

      if (result.success) {
        // Get redirect URL from search params or default to /account
        const redirectTo = searchParams.get("redirect") || "/account";
        router.push(redirectTo);
        router.refresh();
      } else {
        setServerError(result.error || "Failed to create account");
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cream via-white to-cream/50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-8 border border-gold/20">
          <div className="text-center mb-8">
            <h1 className="serif-display text-3xl md:text-4xl text-vine mb-2">
              Create Account
            </h1>
            <p className="text-silver-dark text-sm">
              Join ZEYNORA and start your luxury journey
            </p>
          </div>

          {serverError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {step === "mobile" ? (
              <>
                <div>
                  <label
                    htmlFor="mobile"
                    className="block text-sm font-medium text-night mb-1.5"
                  >
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="mobile"
                    name="mobile"
                    type="tel"
                    value={formData.mobile}
                    onChange={handleChange}
                    required
                    disabled={isPending}
                    className={`w-full px-4 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold disabled:bg-silver-light text-night ${
                      errors.mobile ? "border-red-300" : "border-bronze/30"
                    }`}
                    placeholder="+919876543210"
                    aria-invalid={!!errors.mobile}
                    aria-describedby={errors.mobile ? "mobile-error" : "mobile-help"}
                  />
                  {errors.mobile ? (
                    <p id="mobile-error" className="mt-1 text-xs text-red-600">
                      {errors.mobile}
                    </p>
                  ) : (
                    <p id="mobile-help" className="mt-1 text-xs text-silver-dark">
                      Format: +91 followed by 10 digits
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-3 px-4 bg-vine text-white rounded-md hover:bg-vine/90 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isPending ? "Sending OTP..." : "Send OTP"}
                </button>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="first_name"
                      className="block text-sm font-medium text-night mb-1.5"
                    >
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="first_name"
                      name="first_name"
                      type="text"
                      value={formData.first_name}
                      onChange={handleChange}
                      required
                      disabled={isPending}
                      className={`w-full px-4 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold disabled:bg-silver-light text-night ${
                        errors.first_name
                          ? "border-red-300"
                          : "border-bronze/30"
                      }`}
                      placeholder="John"
                      aria-invalid={!!errors.first_name}
                      aria-describedby={errors.first_name ? "first_name-error" : undefined}
                    />
                    {errors.first_name && (
                      <p id="first_name-error" className="mt-1 text-xs text-red-600">
                        {errors.first_name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="last_name"
                      className="block text-sm font-medium text-night mb-1.5"
                    >
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="last_name"
                      name="last_name"
                      type="text"
                      value={formData.last_name}
                      onChange={handleChange}
                      required
                      disabled={isPending}
                      className={`w-full px-4 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold disabled:bg-silver-light text-night ${
                        errors.last_name ? "border-red-300" : "border-bronze/30"
                      }`}
                      placeholder="Doe"
                      aria-invalid={!!errors.last_name}
                      aria-describedby={errors.last_name ? "last_name-error" : undefined}
                    />
                    {errors.last_name && (
                      <p id="last_name-error" className="mt-1 text-xs text-red-600">
                        {errors.last_name}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-night mb-1.5"
                  >
                    Email <span className="text-silver-dark text-xs">(Optional)</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isPending}
                    className={`w-full px-4 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold disabled:bg-silver-light text-night ${
                      errors.email ? "border-red-300" : "border-bronze/30"
                    }`}
                    placeholder="your@email.com"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : "email-help"}
                  />
                  {errors.email ? (
                    <p id="email-error" className="mt-1 text-xs text-red-600">
                      {errors.email}
                    </p>
                  ) : (
                    <p id="email-help" className="mt-1 text-xs text-silver-dark">
                      Optional - for order updates and receipts
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="otp"
                    className="block text-sm font-medium text-night mb-1.5"
                  >
                    OTP <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    value={formData.otp}
                    onChange={handleChange}
                    required
                    disabled={isPending}
                    className={`w-full px-4 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold disabled:bg-silver-light text-night text-center text-2xl tracking-widest ${
                      errors.otp ? "border-red-300" : "border-bronze/30"
                    }`}
                    placeholder="000000"
                    maxLength={6}
                    aria-invalid={!!errors.otp}
                    aria-describedby={errors.otp ? "otp-error" : "otp-help"}
                  />
                  {errors.otp ? (
                    <p id="otp-error" className="mt-1 text-xs text-red-600">
                      {errors.otp}
                    </p>
                  ) : (
                    <p id="otp-help" className="mt-1 text-xs text-silver-dark">
                      Enter the 6-digit OTP sent to +91 {normalizeMobile(formData.mobile).substring(0, 3)}****{normalizeMobile(formData.mobile).substring(7)}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-3 px-4 bg-vine text-white rounded-md hover:bg-vine/90 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isPending ? "Creating account..." : "Create Account"}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("mobile");
                      setFormData((prev) => ({ ...prev, otp: "" }));
                      setOtpSent(false);
                      setErrors({});
                      setServerError(null);
                    }}
                    className="text-sm text-gold hover:text-bronze hover:underline font-medium"
                    disabled={isPending}
                  >
                    Change Mobile Number
                  </button>
                </div>
              </>
            )}
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-silver-dark">Already have an account? </span>
            <a
              href="/login"
              className="text-gold hover:text-bronze hover:underline font-medium"
            >
              Sign In
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}


