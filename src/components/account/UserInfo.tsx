/**
 * User Info Component
 * Displays user email and avatar
 */

import type { User } from "@supabase/supabase-js";

interface UserInfoProps {
  user: User;
}

export function UserInfo({ user }: UserInfoProps) {
  const email = user.email || "Użytkownik";
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <span className="text-lg font-semibold">{initials}</span>
      </div>
      <div>
        <p className="font-medium">{email}</p>
        <p className="text-sm text-muted-foreground">Twoje konto</p>
      </div>
    </div>
  );
}
