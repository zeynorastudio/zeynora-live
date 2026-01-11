// CheckoutFormSection: Wrapper component for form sections
// Used by: Billing, Shipping, Payment sections
// Structure-only: No logic, no state

interface CheckoutFormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export default function CheckoutFormSection({
  title,
  description,
  children,
}: CheckoutFormSectionProps) {
  return (
    <section className="mb-12">
      <div className="mb-6">
        <h2 className="serif-display display-md text-night mb-2">{title}</h2>
        {description && (
          <p className="sans-base body-sm text-silver-dark">{description}</p>
        )}
      </div>
      <div className="bg-cream border border-silver rounded-xl p-6">
        {children}
      </div>
    </section>
  );
}




