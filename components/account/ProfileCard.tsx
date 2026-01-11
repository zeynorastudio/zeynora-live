import Card from "@/components/ui/Card";

interface ProfileCardProps {
  name: string;
  email: string;
  phone: string;
}

export default function ProfileCard({ name, email, phone }: ProfileCardProps) {
  // Generate initials for avatar
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="p-6 md:p-8" shadowVariant="warm-sm">
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gold/20 flex items-center justify-center border-2 border-gold/30">
            <span className="text-xl md:text-2xl font-semibold text-gold-dark serif-display">
              {initials}
            </span>
          </div>
        </div>

        {/* Profile Info */}
        <div className="flex-1">
          <h2 className="serif-display text-xl md:text-2xl text-night mb-4">
            Profile Information
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs md:text-sm font-medium text-silver-dark uppercase tracking-wide mb-1 block">
                Name
              </label>
              <p className="text-base md:text-lg text-night">{name}</p>
            </div>
            <div>
              <label className="text-xs md:text-sm font-medium text-silver-dark uppercase tracking-wide mb-1 block">
                Email
              </label>
              <p className="text-base md:text-lg text-night">{email}</p>
            </div>
            {phone && (
              <div>
                <label className="text-xs md:text-sm font-medium text-silver-dark uppercase tracking-wide mb-1 block">
                  Phone
                </label>
                <p className="text-base md:text-lg text-night">{phone}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}























