import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, KeyRound, Eye, EyeOff, Loader2, ShieldCheck, CheckCircle2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { API_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

function getPasswordStrength(pwd) {
  if (!pwd) return { score: 0, label: "", color: "", textColor: "" };
  let score = 0;
  if (pwd.length >= 8) score += 1;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1;
  if (/[0-9]/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

  if (score <= 1) return { score: 1, label: "Weak (ខ្សោយ)", color: "bg-red-500", textColor: "text-red-500" };
  if (score === 2) return { score: 2, label: "Medium (មធ្យម)", color: "bg-amber-500", textColor: "text-amber-500" };
  if (score === 3) return { score: 3, label: "Good (ល្អ)", color: "bg-blue-500", textColor: "text-blue-500" };
  return { score: 4, label: "Strong (ខ្លាំង & សុវត្ថិភាព)", color: "bg-emerald-500", textColor: "text-emerald-500" };
}

export default function AdminChangePasswordDialog({ open, onOpenChange }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const adminAuth = (() => {
    try {
      return JSON.parse(localStorage.getItem("adminAuth") || "null");
    } catch {
      return null;
    }
  })();

  const adminEmail = adminAuth?.email || "admin@flamecrust.com";
  const strength = getPasswordStrength(newPassword);

  const resetForm = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  };

  const handleClose = (isOpen) => {
    if (!loading) {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");

    if (!oldPassword.trim()) {
      setError("សូមបញ្ចូលលេខសម្ងាត់ចាស់ (Current Password is required)");
      return;
    }

    if (!newPassword.trim()) {
      setError("សូមបញ្ចូលលេខសម្ងាត់ថ្មី (New Password is required)");
      return;
    }

    if (newPassword.length < 6) {
      setError("លេខសម្ងាត់ថ្មីត្រូវមានយ៉ាងហោចណាស់ ៦ តួអក្សរ (Minimum 6 characters)");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("លេខសម្ងាត់ផ្ទៀងផ្ទាត់មិនត្រូវគ្នាទេ (Passwords do not match)");
      return;
    }

    if (oldPassword === newPassword) {
      setError("លេខសម្ងាត់ថ្មីមិនត្រូវដូចលេខសម្ងាត់ចាស់ទេ (New password cannot be same as old)");
      return;
    }

    setLoading(true);
    try {
      const token = adminAuth?.token;
      const res = await fetch(`${API_URL}/auth/admin-change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email: adminEmail,
          oldPassword: oldPassword.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "មិនអាចប្តូរលេខសម្ងាត់បានទេ");
      }

      toast.success("លេខសម្ងាត់ Admin ត្រូវបានផ្លាស់ប្តូរដោយជោគជ័យ! 🎉", {
        description: "Admin password has been updated successfully.",
      });

      handleClose(false);
    } catch (err) {
      setError(err.message || "មានបញ្ហាក្នុងការប្តូរលេខសម្ងាត់");
      toast.error(err.message || "មានបញ្ហាក្នុងការប្តូរលេខសម្ងាត់");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[460px] p-0 rounded-[28px] border-border/30 bg-card/70 shadow-2xl backdrop-blur-3xl overflow-hidden outline-none">
        <div className="p-8 pb-6">
          <DialogHeader className="space-y-3 mb-6">
            <div className="mx-auto size-16 rounded-full bg-primary/10 flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-25" />
              <KeyRound className="size-8 text-primary relative z-10" />
            </div>
            <div className="space-y-1.5 text-center">
              <DialogTitle className="text-2xl font-black text-foreground tracking-tight font-serif">
                ប្តូរលេខសម្ងាត់សុវត្ថិភាព
              </DialogTitle>
              <DialogDescription className="text-[13px] text-muted-foreground">
                គណនី Admin: <span className="font-bold text-primary">{adminEmail}</span>
              </DialogDescription>
            </div>
          </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2 animate-shake">
              <ShieldAlert className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Password */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground/80 uppercase tracking-wider ml-1">
              Current Password <span className="text-destructive">*</span>
            </Label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                type={showOld ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => {
                  setOldPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="••••••••"
                className="pl-11 pr-11 rounded-2xl h-12 bg-secondary/30 border-border/40 hover:bg-secondary/50 focus:bg-background focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all duration-300 text-sm font-medium placeholder:text-muted-foreground/50"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground hover:bg-secondary/80 rounded-lg p-1.5 transition-colors"
                tabIndex={-1}
              >
                {showOld ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground/80 uppercase tracking-wider ml-1">
              New Password <span className="text-destructive">*</span>
            </Label>
            <div className="relative group">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Enter a strong password"
                className="pl-11 pr-11 rounded-2xl h-12 bg-secondary/30 border-border/40 hover:bg-secondary/50 focus:bg-background focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all duration-300 text-sm font-medium placeholder:text-muted-foreground/50"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground hover:bg-secondary/80 rounded-lg p-1.5 transition-colors"
                tabIndex={-1}
              >
                {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>

            {/* Strength Meter */}
            {newPassword && (
              <div className="space-y-1.5 pt-1 px-1">
                <div className="flex gap-1 h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden p-[1px]">
                  <div
                    className={cn(
                      "h-full transition-all duration-500 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]",
                      strength.color,
                      strength.score === 1 && "w-1/4",
                      strength.score === 2 && "w-2/4",
                      strength.score === 3 && "w-3/4",
                      strength.score === 4 && "w-full"
                    )}
                  />
                </div>
                <p className={cn("text-[10px] font-bold uppercase tracking-wider text-right transition-colors duration-300", strength.textColor)}>
                  {strength.label}
                </p>
              </div>
            )}
          </div>

          {/* Confirm New Password */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground/80 uppercase tracking-wider ml-1">
              Confirm Password <span className="text-destructive">*</span>
            </Label>
            <div className="relative group">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" />
              <Input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Confirm your new password"
                className="pl-11 pr-11 rounded-2xl h-12 bg-secondary/30 border-border/40 hover:bg-secondary/50 focus:bg-background focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300 text-sm font-medium placeholder:text-muted-foreground/50"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground hover:bg-secondary/80 rounded-lg p-1.5 transition-colors"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {confirmPassword && newPassword === confirmPassword && (
              <p className="text-[11px] text-emerald-500 font-bold flex items-center gap-1.5 ml-1 animate-in slide-in-from-top-1 fade-in duration-300">
                <CheckCircle2 className="size-3.5" /> Matched securely
              </p>
            )}
          </div>

          <DialogFooter className="pt-4 grid grid-cols-2 gap-3 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={loading}
              className="rounded-2xl border-border/50 bg-secondary/30 hover:bg-secondary/60 text-xs font-bold h-12 transition-all w-full"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !oldPassword || !newPassword || !confirmPassword}
              className="rounded-2xl bg-gradient-to-br from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white text-xs font-bold h-12 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </DialogFooter>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
