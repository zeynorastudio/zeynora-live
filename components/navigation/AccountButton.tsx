"use client";

import { useCustomer } from "@/lib/hooks/useCustomer";
import Link from "next/link";
import { User } from "lucide-react";

interface AccountButtonProps {
  className?: string;
}

const DEFAULT_CLASSES =
  "p-2 text-night hover:text-gold transition-colors focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 rounded-sm";

export default function AccountButton(props: AccountButtonProps = {}) {
  const { className } = props;
  const { user, loading } = useCustomer();
  const buttonClassName = className || DEFAULT_CLASSES;

  if (loading) {
    return (
      <div className="w-10 h-10 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return (
      <Link
        href="/account"
        className={buttonClassName}
        aria-label="My Account"
      >
        <User className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      className={buttonClassName}
      aria-label="Sign In"
    >
      <User className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
    </Link>
  );
}

