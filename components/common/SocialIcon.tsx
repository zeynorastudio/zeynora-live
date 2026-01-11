// SocialIcon: Social media icon placeholder component
// DB Source:
//   - supabase://assets/social/{iconName}.svg
// Structure-only: No logic, no links, placeholder circle
// Bronze border, gold hover highlight (UI only)

export interface SocialIconProps {
  iconName: string;
}

export default function SocialIcon({ iconName }: SocialIconProps) {
  return (
    <div
      className="w-9 h-9 rounded-full border-2 border-bronze flex items-center justify-center hover:border-gold transition-colors cursor-pointer"
      aria-label={`${iconName} social media`}
      role="img"
    >
      {/* supabase://assets/social/{iconName}.svg */}
      <div className="w-5 h-5 bg-silver-dark rounded-full" aria-hidden="true">
        {/* Icon will be rendered here from Supabase Storage */}
      </div>
    </div>
  );
}




