import { cn } from "@/lib/utils";
import { Crown, ShieldCheck, Users } from "lucide-react";
import { RoleConfig } from "../types";

const ROLE_CONFIG: Record<string, RoleConfig> = {
  OWNER: {
    label: "Owner",
    icon: Crown,
    badgeClass:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  ADMIN: {
    label: "Admin",
    icon: ShieldCheck,
    badgeClass:
      "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  },
  MEMBER: {
    label: "Member",
    icon: Users,
    badgeClass:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
};

interface RoleBadgeProps {
  role: string;
  showIcon?: boolean;
  className?: string;
}

export function RoleBadge({
  role,
  showIcon = true,
  className,
}: RoleBadgeProps) {
  const config = ROLE_CONFIG[role];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.badgeClass,
        className,
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </span>
  );
}
