"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { AdminButton } from "@/components/admin/AdminButton";
import { useToastWithCompat } from "@/components/ui/use-toast";

function ShippingSupportForm() {
  const { register, handleSubmit, reset } = useForm();
  const { addToast } = useToastWithCompat();

  const onSubmit = async (data: any) => {
    try {
      const res = await fetch("/api/support/shipping/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed");
      addToast("Query sent successfully. We will contact you shortly.", "success");
      reset();
    } catch (e) {
      addToast("Failed to send query", "error");
    }
  };

  return (
    <div className="min-h-screen bg-offwhite py-12 px-4">
      <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-warm-xs border border-silver-light">
        <h1 className="serif-display text-2xl mb-2 text-night">Shipping Support</h1>
        <p className="text-silver-dark mb-6 text-sm">Have a question about your order? Let us know.</p>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Order Number (Optional)</label>
            <input {...register("order_number")} className="w-full border p-2 rounded" placeholder="ZYN-..." />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input {...register("name", { required: true })} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input {...register("email", { required: true })} className="w-full border p-2 rounded" type="email" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input {...register("phone")} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea {...register("message", { required: true })} className="w-full border p-2 rounded h-32" />
          </div>
          <AdminButton type="submit" className="w-full">Submit Query</AdminButton>
        </form>
      </div>
    </div>
  );
}

export default function ShippingSupportPage() {
  return <ShippingSupportForm />;
}
