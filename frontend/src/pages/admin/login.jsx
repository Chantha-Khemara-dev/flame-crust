import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminLoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/login?redirect=/admin/dashboard", { replace: true });
  }, [navigate]);

  return null;
}
