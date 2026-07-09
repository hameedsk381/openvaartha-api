import { Landmark, Cpu, Briefcase, Film, MapPin, Trophy, Newspaper } from 'lucide-react';

interface CategoryIconProps {
  name: string;
  className?: string;
}

export function CategoryIcon({ name, className }: CategoryIconProps) {
  const map: Record<string, React.ComponentType<{ className?: string }>> = {
    Politics: Landmark,
    Tech: Cpu,
    Business: Briefcase,
    Cinema: Film,
    "Local News": MapPin,
    Sports: Trophy,
  };

  const IconComponent = map[name] || Newspaper;
  return <IconComponent className={className} />;
}
