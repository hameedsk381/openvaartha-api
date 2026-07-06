import { useNavigate } from "react-router-dom";
import { clearTokens } from "@/lib/api";
import { toast } from "sonner";

export function useLogout() {
  const navigate = useNavigate();

  const logout = () => {
    clearTokens();
    toast.success("Signed out successfully.");
    navigate("/");
    window.location.reload();
  };

  return logout;
}
