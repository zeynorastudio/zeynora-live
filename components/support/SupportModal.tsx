"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { X } from "lucide-react";

interface SupportModalProps {
  orderId: string;
  orderNumber: string;
}

export default function SupportModal({ orderId, orderNumber }: SupportModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/support/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          order_number: orderNumber,
          subject: formData.subject,
          message: formData.message,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create support ticket");
      }

      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setFormData({ subject: "", message: "" });
        // Reload page to show updated support ticket
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to submit support request");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="w-full text-sm"
      >
        Raise a Query
      </Button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-night/50 z-40"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 md:p-8 bg-white relative" shadowVariant="warm-sm">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 text-silver-dark hover:text-night transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="serif-display text-2xl text-night mb-2">
            Raise a Support Query
          </h2>
          <p className="text-sm text-silver-dark mb-6">
            Order #{orderNumber}
          </p>

          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gold"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-night font-medium">Support ticket created successfully!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="subject"
                  className="block text-sm font-medium text-night mb-2"
                >
                  Subject
                </label>
                <input
                  id="subject"
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-silver-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                  placeholder="e.g., Shipping delay, Product issue"
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-night mb-2"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-silver-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all resize-none"
                  placeholder="Please describe your issue..."
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </>
  );
}























