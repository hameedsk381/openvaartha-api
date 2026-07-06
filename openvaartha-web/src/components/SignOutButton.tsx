import { useState } from "react";
import { useLogout } from "@/hooks/use-logout";
import ConfirmDialog from "@/components/ConfirmDialog";

interface SignOutButtonProps {
  children: (onClick: () => void) => React.ReactNode;
}

/**
 * Wraps any sign-out trigger (icon button, sidebar row, ...) with a confirm
 * step — sign-out sat right next to low-stakes nav items in a couple of
 * places, one accidental tap away from ending the session with no undo.
 */
export default function SignOutButton({ children }: SignOutButtonProps) {
  const logout = useLogout();
  const [open, setOpen] = useState(false);

  return (
    <>
      {children(() => setOpen(true))}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Sign out?"
        description="You'll need to sign in again to reach your saved articles, history, and settings."
        confirmLabel="Sign out"
        variant="destructive"
        onConfirm={logout}
      />
    </>
  );
}
