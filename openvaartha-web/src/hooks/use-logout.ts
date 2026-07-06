import { useNavigate } from "react-router-dom";
import { clearTokens } from "@/lib/api";
import { toast } from "sonner";

export function useLogout() {
  const navigate = useNavigate();

  const logout = () => {
    clearTokens();
    toast.success("Signed out successfully.");
    navigate("/");
    // The reload is deliberate — several components read localStorage's auth
    // state directly at render time rather than through shared reactive
    // state, so a full reload is the simplest way to guarantee every one of
    // them reflects the signed-out state. But reloading immediately tears
    // down the toast before it can paint, so give it a moment first.
    setTimeout(() => window.location.reload(), 600);
  };

  return logout;
}
