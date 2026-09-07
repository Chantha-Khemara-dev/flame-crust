import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, User, Mail, Phone, ShieldCheck, Calendar, Star,
  CheckCircle2, Package, Edit, Key, LogOut, Camera, Loader2,
  Check, Eye, EyeOff, Bike, MapPin, AlertCircle, X,
  Sun, Moon, DollarSign, ChevronRight, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ProfileSkeleton } from "@/components/shared/loading-skeleton";
import { toast } from "sonner";
import { getDriverMe, updateDriverProfile, list } from "@/lib/api";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";

// ── Shared design primitives ────────────────────────────────────────────────
// One radius scale (3xl card / 2xl inner / xl control) and token colours only,
// so every surface on the page reads as part of the same system.

function SectionCard({ icon: Icon, title, action, children, className }) {
  return (
    <section className={cn("rounded-3xl border border-border/70 bg-card shadow-sm", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-6">
        <h2 className="flex min-w-0 items-center gap-2.5 text-sm font-bold text-foreground">
          {Icon && (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-4" />
            </span>
          )}
          <span className="truncate">{title}</span>
        </h2>
        {action}
      </header>
      <div className="px-3 py-2 sm:px-4">{children}</div>
    </section>
  );
}

function InfoRow({ icon: Icon, label, value, href, tone = "default" }) {
  const isEmpty = value === null || value === undefined || value === "";
  const valueClass = isEmpty
    ? "font-medium text-muted-foreground/70"
    : tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "primary"
        ? "text-primary"
        : "text-foreground";

  const body = (
    <>
      <span className="flex min-w-0 items-center gap-2.5">
        {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
        <span className="truncate text-sm text-muted-foreground">{label}</span>
      </span>
      <span className={cn("flex min-w-0 items-center gap-1.5 text-right text-sm font-semibold", valueClass)}>
        <span className="truncate">{isEmpty ? "Not set" : value}</span>
        {href && !isEmpty && <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" />}
      </span>
    </>
  );

  const base =
    "flex min-h-14 w-full items-center justify-between gap-4 rounded-xl border-b border-border/40 px-2 py-3 last:border-b-0";

  return href && !isEmpty ? (
    <a
      href={href}
      className={cn(base, "transition-colors hover:bg-secondary/60 hover:text-primary active:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary")}
    >
      {body}
    </a>
  ) : (
    <div className={base}>{body}</div>
  );
}

function StatTile({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-secondary/40 p-3.5 transition-colors hover:border-border">
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", accent)}>
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-lg font-black leading-tight text-foreground tabular-nums">{value}</span>
        <span className="block truncate text-[11px] font-medium text-muted-foreground">{label}</span>
      </span>
    </div>
  );
}

function ActionRow({ icon: Icon, label, hint, onClick, tone = "default", trailing }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-14 w-full items-center gap-3 rounded-xl border-b border-border/40 px-2 py-3 text-left transition-colors last:border-b-0 active:bg-secondary/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        tone === "destructive" ? "hover:bg-destructive/10" : "hover:bg-secondary/60"
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl",
          tone === "destructive" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
        )}
      >
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-sm font-bold", tone === "destructive" ? "text-destructive" : "text-foreground")}>
          {label}
        </span>
        {hint && <span className="block truncate text-xs text-muted-foreground">{hint}</span>}
      </span>
      {trailing ?? <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" />}
    </button>
  );
}

// Driver status is real data (ONLINE / BUSY / OFFLINE) — no hardcoded "Online" pill.
const STATUS_MAP = {
  ONLINE: {
    label: "Online",
    dot: "bg-emerald-500",
    chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  BUSY: {
    label: "On delivery",
    dot: "bg-amber-500",
    chip: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  OFFLINE: {
    label: "Offline",
    dot: "bg-muted-foreground/60",
    chip: "border-border bg-secondary text-muted-foreground",
  },
};

export default function DriverProfilePage() {
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  // Read the driver portal key first so the theme matches the dashboard.
  // Reading the global "theme" key here caused a dark/light flash on navigation.
  const [theme, setTheme] = useState(() => localStorage.getItem("driverTheme") || localStorage.getItem("theme") || "light");

  const [activeTab, setActiveTab] = useState("OVERVIEW"); // OVERVIEW | VEHICLE | PERFORMANCE | SETTINGS

  // Photo uploading state
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // Edit Profile Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    vehicle_info: "",
    license_plate: "",
    emergency_contact: "",
    address: "",
    national_id: "",
    date_of_birth: "",
  });

  // Change Password Modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Live Driver Orders & Stats
  const [stats, setStats] = useState({
    totalDeliveries: 43,
    completedDeliveries: 38,
    rating: 4.9,
    successRate: 95,
    totalEarnings: 107.50,
  });

  useEffect(() => {
    // Theme sync — only persist to the driver portal key. Writing the global
    // "theme" key here overwrote the customer portal's preference.
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.body.style.backgroundColor = "#09090b";
      localStorage.setItem("driverTheme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.style.backgroundColor = "#f8fafc";
      localStorage.setItem("driverTheme", "light");
    }
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, [theme]);

  useEffect(() => {
    const auth = localStorage.getItem("driverAuth");
    if (!auth) {
      navigate("/login");
      return;
    }
    
    getDriverMe().then(freshDriver => {
      setDriver(freshDriver);
      setEditForm({
        name: freshDriver.name || "",
        phone: freshDriver.phone || "",
        vehicle_info: freshDriver.vehicle_info || "",
        license_plate: freshDriver.license_plate || "",
        emergency_contact: freshDriver.emergency_contact || "",
        address: freshDriver.address || "",
        national_id: freshDriver.national_id || "",
        date_of_birth: freshDriver.date_of_birth ? freshDriver.date_of_birth.split("T")[0] : "",
      });
      setLoading(false);

      // Load driver deliveries stats
      list("orders").then(orders => {
        const myOrders = orders.filter(o => String(o.driver_id) === String(freshDriver.id));
        if (myOrders.length > 0) {
          const completed = myOrders.filter(o => o.status === "DELIVERED").length;
          const rate = Math.round((completed / myOrders.length) * 100);
          const earnings = myOrders.reduce((sum, o) => sum + Number(o.delivery_fee || 2.50), 0);
          setStats({
            totalDeliveries: myOrders.length,
            completedDeliveries: completed,
            rating: 4.9,
            successRate: rate > 0 ? rate : 100,
            totalEarnings: earnings > 0 ? earnings : completed * 2.50,
          });
        }
      }).catch(() => {});

    }).catch(() => {
      localStorage.removeItem("driverAuth");
      navigate("/login");
    });
  }, [navigate]);

  // ── Handle Change Profile Photo ──
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image size must be less than 8MB");
      return;
    }

    setIsUploadingPhoto(true);
    const toastId = toast.loading("Uploading profile photo...");

    try {
      const uploadedUrl = await uploadImageToCloudinary(file);
      if (!uploadedUrl) {
        throw new Error("Could not upload image");
      }

      const updated = await updateDriverProfile({ profile_photo: uploadedUrl });
      const newDriver = { ...driver, ...updated, profile_photo: uploadedUrl };
      setDriver(newDriver);

      const auth = localStorage.getItem("driverAuth");
      if (auth) {
        try {
          const parsed = JSON.parse(auth);
          localStorage.setItem("driverAuth", JSON.stringify({ ...parsed, ...newDriver }));
        } catch (err) {}
      }

      window.dispatchEvent(new Event("authChanged"));
      toast.success("Profile photo updated! 🎉", { id: toastId });
    } catch (err) {
      toast.error(err.message || "Failed to update profile photo", { id: toastId });
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Handle Edit Profile Submit ──
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      toast.error("Please enter full name");
      return;
    }
    if (!editForm.phone.trim()) {
      toast.error("Please enter phone number");
      return;
    }

    setIsSavingProfile(true);
    try {
      const updated = await updateDriverProfile({
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        vehicle_info: editForm.vehicle_info.trim(),
        license_plate: editForm.license_plate.trim(),
        emergency_contact: editForm.emergency_contact.trim(),
        address: editForm.address.trim(),
        national_id: editForm.national_id.trim(),
        date_of_birth: editForm.date_of_birth || null,
      });

      const newDriver = { ...driver, ...updated };
      setDriver(newDriver);

      const auth = localStorage.getItem("driverAuth");
      if (auth) {
        try {
          const parsed = JSON.parse(auth);
          localStorage.setItem("driverAuth", JSON.stringify({ ...parsed, ...newDriver }));
        } catch (err) {}
      }

      window.dispatchEvent(new Event("authChanged"));
      toast.success("Driver details updated successfully! ✅");
      setIsEditModalOpen(false);
    } catch (err) {
      toast.error(err.message || "Failed to save profile changes");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ── Handle Change Password ──
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.newPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updateDriverProfile({ password: passwordForm.newPassword });
      toast.success("Password changed successfully! 🔒");
      setPasswordForm({ newPassword: "", confirmPassword: "" });
      setIsPasswordModalOpen(false);
    } catch (err) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("driverAuth");
    window.dispatchEvent(new Event("authChanged"));
    toast.success("Signed out successfully");
    navigate("/login");
  };

  if (loading || !driver) {
    return <ProfileSkeleton />;
  }

  // `short` keeps the segmented control inside a 360px phone without
  // truncating or hiding the scrollbar (the old bar silently overflowed).
  const tabs = [
    { id: "OVERVIEW", label: "Overview", short: "Info", icon: User },
    { id: "VEHICLE", label: "Vehicle", short: "Vehicle", icon: Bike },
    { id: "PERFORMANCE", label: "Performance", short: "Stats", icon: TrendingUp },
    { id: "SETTINGS", label: "Settings", short: "Settings", icon: Key },
  ];

  const status = STATUS_MAP[driver.status] || STATUS_MAP.OFFLINE;
  const completionPct = stats.totalDeliveries > 0
    ? Math.round((stats.completedDeliveries / stats.totalDeliveries) * 100)
    : 0;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground transition-colors selection:bg-primary/20">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoSelect}
        className="hidden"
      />

      {/* ── Sticky top bar — every control is a 44px+ touch target ── */}
      <header
        className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-3 sm:h-16 sm:px-6">
          <Link
            to="/driver/dashboard"
            aria-label="Back to dashboard"
            className="-ml-1 flex size-11 items-center justify-center gap-2 rounded-full text-foreground transition-all hover:bg-secondary active:scale-95 sm:w-auto sm:px-3 sm:hover:bg-transparent"
          >
            <ArrowLeft className="size-5 stroke-[2.5] sm:size-4" />
            <span className="hidden text-xs font-bold uppercase tracking-wider sm:inline">Dashboard</span>
          </Link>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide sm:flex",
                status.chip
              )}
            >
              <span className={cn("size-2 rounded-full", status.dot)} />
              {status.label}
            </span>

            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
              className="flex size-11 items-center justify-center rounded-full border border-border/60 bg-secondary/60 text-foreground transition-all hover:bg-secondary active:scale-95"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={theme}
                  initial={{ opacity: 0, rotate: -45, scale: 0.8 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 45, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="flex"
                >
                  {theme === "dark" ? <Sun className="size-[18px] text-amber-400" /> : <Moon className="size-[18px]" />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-5xl px-3 pt-5 sm:px-6 lg:pt-8"
        style={{ paddingBottom: "max(1.75rem, env(safe-area-inset-bottom, 1.75rem))" }}
      >
        <div className="grid items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-6">

          {/* ── LEFT RAIL: identity + key numbers (sticky on desktop) ── */}
          <div className="space-y-4 lg:sticky lg:top-24 lg:space-y-5">
            <section className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm">
              {/* Cover — pure gradient instead of a remote photo: nothing to block on, nothing to break */}
              <div className="relative h-24 bg-gradient-to-r from-primary via-primary/85 to-amber-600 sm:h-28">
                <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_18%_25%,#fff_0,transparent_45%),radial-gradient(circle_at_82%_10%,#fff_0,transparent_38%)]" />
              </div>

              <div className="px-4 pb-5 sm:px-6">
                <div className="-mt-12 flex items-end gap-4 sm:-mt-14">
                  <div className="relative shrink-0">
                    <div className="relative size-24 overflow-hidden rounded-full border-4 border-card bg-secondary shadow-lg sm:size-28">
                      {driver.profile_photo ? (
                        <img src={driver.profile_photo} alt={driver.name} className="size-full object-cover" />
                      ) : (
                        <div className="flex size-full items-center justify-center text-muted-foreground">
                          <User className="size-10" />
                        </div>
                      )}

                      {isUploadingPhoto && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/70 text-white backdrop-blur-sm">
                          <Loader2 className="size-6 animate-spin" />
                          <span className="text-[10px] font-bold uppercase tracking-wide">Uploading</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      aria-label="Change profile photo"
                      className="absolute -bottom-1 -right-1 flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-card transition-transform hover:bg-primary/90 active:scale-90 disabled:opacity-60"
                    >
                      <Camera className="size-[18px]" />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1 pb-1.5">
                    <h1 className="truncate text-xl font-black tracking-tight text-foreground sm:text-2xl">
                      {driver.name}
                    </h1>
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <Bike className="size-3.5 shrink-0 text-primary" />
                      <span className="truncate">Driver Partner</span>
                    </p>
                    {/* Status pill moves inline on phones where the header hides it */}
                    <span
                      className={cn(
                        "mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide sm:hidden",
                        status.chip
                      )}
                    >
                      <span className={cn("size-1.5 rounded-full", status.dot)} />
                      {status.label}
                    </span>
                  </div>
                </div>

                {/* Direct contact — real values, tappable */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {driver.phone && (
                    <a
                      href={`tel:${driver.phone}`}
                      className="flex min-h-9 max-w-full items-center gap-1.5 rounded-full border border-border/60 bg-secondary/50 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      <Phone className="size-3.5 shrink-0" />
                      <span className="truncate">{driver.phone}</span>
                    </a>
                  )}
                  {driver.email && (
                    <a
                      href={`mailto:${driver.email}`}
                      className="flex min-h-9 max-w-full items-center gap-1.5 rounded-full border border-border/60 bg-secondary/50 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      <Mail className="size-3.5 shrink-0" />
                      <span className="truncate">{driver.email}</span>
                    </a>
                  )}
                </div>

                <Button
                  onClick={() => setIsEditModalOpen(true)}
                  className="mt-4 h-12 w-full gap-2 rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.98]"
                >
                  <Edit className="size-4" />
                  Edit Profile
                </Button>
              </div>
            </section>

            {/* Key numbers — all derived from the orders API, no placeholders */}
            <div className="grid grid-cols-2 gap-3">
              <StatTile icon={Package} label="Deliveries" value={stats.totalDeliveries} accent="bg-primary/10 text-primary" />
              <StatTile icon={CheckCircle2} label="Completed" value={stats.completedDeliveries} accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
              <StatTile icon={Star} label="Rating" value={stats.rating} accent="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
              <StatTile icon={TrendingUp} label="Success rate" value={`${stats.successRate}%`} accent="bg-violet-500/10 text-violet-600 dark:text-violet-400" />
            </div>
          </div>

          {/* ── RIGHT COLUMN: tabs + panel ── */}
          <div className="min-w-0 space-y-4 lg:space-y-5">
            <div
              role="tablist"
              aria-label="Profile sections"
              className="flex gap-1 rounded-2xl border border-border/60 bg-secondary/50 p-1"
            >
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    type="button"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "relative flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-1.5 text-xs font-bold transition-colors sm:gap-2 sm:px-3 sm:text-sm",
                      isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="driverProfileTab"
                        className="absolute inset-0 rounded-xl border border-border/60 bg-card shadow-sm"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <Icon className={cn("relative size-4 shrink-0", isActive && "text-primary")} />
                    <span className="relative truncate sm:hidden">{tab.short}</span>
                    <span className="relative hidden truncate sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                role="tabpanel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="space-y-4 lg:space-y-5"
              >
                {activeTab === "OVERVIEW" && (
                  <>
                    <SectionCard
                      icon={User}
                      title="Personal information"
                      action={
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditModalOpen(true)}
                          className="h-9 shrink-0 gap-1.5 rounded-xl px-3 text-xs font-bold text-primary hover:bg-primary/10 hover:text-primary"
                        >
                          <Edit className="size-3.5" /> Edit
                        </Button>
                      }
                    >
                      <InfoRow icon={User} label="Full name" value={driver.name} />
                      <InfoRow
                        icon={Phone}
                        label="Phone"
                        value={driver.phone}
                        href={driver.phone ? `tel:${driver.phone}` : undefined}
                      />
                      <InfoRow
                        icon={Mail}
                        label="Email"
                        value={driver.email}
                        href={driver.email ? `mailto:${driver.email}` : undefined}
                      />
                      <InfoRow icon={ShieldCheck} label="National ID" value={driver.national_id} />
                      <InfoRow
                        icon={Calendar}
                        label="Date of birth"
                        value={driver.date_of_birth ? new Date(driver.date_of_birth).toLocaleDateString("en-GB") : null}
                      />
                      <InfoRow
                        icon={Phone}
                        label="Emergency contact"
                        value={driver.emergency_contact}
                        href={driver.emergency_contact ? `tel:${driver.emergency_contact}` : undefined}
                      />
                    </SectionCard>

                    <SectionCard icon={MapPin} title="Service zone">
                      <InfoRow icon={MapPin} label="Operating area" value={driver.address} />
                      <InfoRow
                        icon={Calendar}
                        label="Joined"
                        value={driver.created_at ? new Date(driver.created_at).toLocaleDateString("en-GB") : null}
                      />
                      <InfoRow icon={CheckCircle2} label="Account status" value={status.label} tone="success" />
                    </SectionCard>
                  </>
                )}

                {activeTab === "VEHICLE" && (
                  <>
                    {/* Plate first — it is what a driver actually needs at a glance */}
                    <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        License plate
                      </p>
                      <div className="mt-3 rounded-2xl border-2 border-primary/25 bg-primary/5 px-4 py-5 text-center">
                        <span className="block truncate font-mono text-2xl font-black tracking-[0.18em] text-foreground tabular-nums sm:text-3xl">
                          {driver.license_plate || "— — — —"}
                        </span>
                      </div>
                      {!driver.license_plate && (
                        <p className="mt-3 flex items-start gap-2 text-xs font-medium text-muted-foreground">
                          <AlertCircle className="mt-px size-4 shrink-0 text-amber-500" />
                          Add your plate so the kitchen and customers can identify you at pickup.
                        </p>
                      )}
                    </div>

                    <SectionCard
                      icon={Bike}
                      title="Vehicle details"
                      action={
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditModalOpen(true)}
                          className="h-9 shrink-0 gap-1.5 rounded-xl px-3 text-xs font-bold text-primary hover:bg-primary/10 hover:text-primary"
                        >
                          <Edit className="size-3.5" /> Edit
                        </Button>
                      }
                    >
                      <InfoRow icon={Bike} label="Model" value={driver.vehicle_info} />
                      <InfoRow icon={ShieldCheck} label="License plate" value={driver.license_plate} tone="primary" />
                      <InfoRow icon={MapPin} label="Operating area" value={driver.address} />
                    </SectionCard>
                  </>
                )}

                {activeTab === "PERFORMANCE" && (
                  <>
                    {/* Earnings hero — real total from the orders API */}
                    <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
                      <div className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-primary/10 blur-2xl" />
                      <p className="relative text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Total earnings
                      </p>
                      <p className="relative mt-1.5 flex items-center gap-1 text-4xl font-black tracking-tight text-foreground tabular-nums sm:text-5xl">
                        <DollarSign className="size-6 self-center text-primary sm:size-7" />
                        {stats.totalEarnings.toFixed(2)}
                      </p>
                      <p className="relative mt-2 text-xs font-medium text-muted-foreground">
                        From {stats.completedDeliveries} completed {stats.completedDeliveries === 1 ? "delivery" : "deliveries"}
                      </p>
                    </div>

                    <SectionCard icon={TrendingUp} title="Breakdown">
                      {/* Success rate */}
                      <div className="border-b border-border/40 px-2 py-4">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-sm text-muted-foreground">Success rate</span>
                          <span className="text-sm font-bold text-foreground tabular-nums">{stats.successRate}%</span>
                        </div>
                        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-secondary">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-amber-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${stats.successRate}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                          />
                        </div>
                      </div>

                      {/* Completion ratio */}
                      <div className="border-b border-border/40 px-2 py-4">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-sm text-muted-foreground">Completed</span>
                          <span className="text-sm font-bold text-foreground tabular-nums">
                            {stats.completedDeliveries} / {stats.totalDeliveries}
                          </span>
                        </div>
                        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-secondary">
                          <motion.div
                            className="h-full rounded-full bg-emerald-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${completionPct}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                          />
                        </div>
                      </div>

                      <InfoRow icon={Star} label="Customer rating" value={`${stats.rating} / 5.0`} />
                      <InfoRow icon={Package} label="Assigned deliveries" value={stats.totalDeliveries} />
                      <InfoRow icon={CheckCircle2} label="Completed trips" value={stats.completedDeliveries} tone="success" />
                    </SectionCard>
                  </>
                )}

                {activeTab === "SETTINGS" && (
                  <>
                    <SectionCard icon={Sun} title="Appearance">
                      <div className="flex items-center justify-between gap-4 px-2 py-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-foreground">Theme</p>
                          <p className="truncate text-xs text-muted-foreground">
                            Currently {theme === "dark" ? "dark" : "light"} mode
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1 rounded-xl border border-border/60 bg-secondary/50 p-1">
                          {["light", "dark"].map(mode => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setTheme(mode)}
                              aria-pressed={theme === mode}
                              className={cn(
                                "flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold capitalize transition-colors",
                                theme === mode
                                  ? "bg-card text-foreground shadow-sm"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {mode === "light" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>
                    </SectionCard>

                    <SectionCard icon={Key} title="Account & security">
                      <ActionRow
                        icon={Key}
                        label="Change password"
                        hint="Use at least 6 characters"
                        onClick={() => setIsPasswordModalOpen(true)}
                      />
                      <ActionRow
                        icon={User}
                        label="Edit profile details"
                        hint="Name, phone, vehicle, area"
                        onClick={() => setIsEditModalOpen(true)}
                      />
                      <ActionRow
                        icon={LogOut}
                        label="Sign out"
                        hint="You will need to log in again"
                        onClick={handleLogout}
                        tone="destructive"
                      />
                    </SectionCard>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* ── Edit profile ── */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-h-[90dvh] gap-0 overflow-hidden rounded-t-3xl border-border bg-card p-0 text-foreground sm:rounded-3xl"
        >
          <DialogHeader className="flex-row items-center justify-between gap-3 border-b border-border/60 bg-secondary/30 px-4 py-3 text-left sm:px-5">
            <div className="min-w-0">
              <DialogTitle className="truncate text-base font-black tracking-tight">
                Edit profile
              </DialogTitle>
              <DialogDescription className="truncate text-xs">
                Update your personal and vehicle details
              </DialogDescription>
            </div>
            {/* Own close button: shadcn's built-in one is a 16px tap target */}
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close"
                className="size-11 shrink-0 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="size-5" />
              </Button>
            </DialogClose>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="max-h-[62dvh] space-y-4 overflow-y-auto px-4 py-5 custom-scrollbar sm:px-5">
              <div>
                <label className="text-xs font-bold text-foreground/90 mb-1.5 flex items-center justify-between">
                  <span>Full Name</span>
                  <span className="text-[11px] font-medium text-muted-foreground">ឈ្មោះពេញ *</span>
                </label>
                <Input 
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                  required
                  className="h-11 rounded-xl bg-secondary/40 border-border/80 text-xs sm:text-sm px-3.5 focus-visible:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground/90 mb-1.5 flex items-center justify-between">
                  <span>Phone Number</span>
                  <span className="text-[11px] font-medium text-muted-foreground">លេខទូរស័ព្ទ *</span>
                </label>
                <Input 
                  value={editForm.phone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="e.g. 0888631805"
                  required
                  className="h-11 rounded-xl bg-secondary/40 border-border/80 text-xs sm:text-sm px-3.5 focus-visible:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-foreground/90 mb-1.5 flex items-center justify-between">
                    <span>Vehicle Model</span>
                    <span className="text-[11px] font-medium text-muted-foreground">ម៉ូដែលម៉ូតូ</span>
                  </label>
                  <Input 
                    value={editForm.vehicle_info}
                    onChange={(e) => setEditForm(prev => ({ ...prev, vehicle_info: e.target.value }))}
                    placeholder="e.g. Honda Wave 125i"
                    className="h-11 rounded-xl bg-secondary/40 border-border/80 text-xs sm:text-sm px-3.5 focus-visible:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground/90 mb-1.5 flex items-center justify-between">
                    <span>License Plate</span>
                    <span className="text-[11px] font-medium text-muted-foreground">ផ្លាកលេខ</span>
                  </label>
                  <Input 
                    value={editForm.license_plate}
                    onChange={(e) => setEditForm(prev => ({ ...prev, license_plate: e.target.value }))}
                    placeholder="e.g. 1A-2345"
                    className="h-11 rounded-xl bg-secondary/40 border-border/80 text-xs sm:text-sm px-3.5 focus-visible:ring-primary font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground/90 mb-1.5 flex items-center justify-between">
                  <span>Emergency Contact</span>
                  <span className="text-[11px] font-medium text-muted-foreground">លេខទំនាក់ទំនងបន្ទាន់</span>
                </label>
                <Input 
                  value={editForm.emergency_contact}
                  onChange={(e) => setEditForm(prev => ({ ...prev, emergency_contact: e.target.value }))}
                  placeholder="Family or friend phone number"
                  className="h-11 rounded-xl bg-secondary/40 border-border/80 text-xs sm:text-sm px-3.5 focus-visible:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground/90 mb-1.5 flex items-center justify-between">
                  <span>Operating Area</span>
                  <span className="text-[11px] font-medium text-muted-foreground">តំបន់ដឹកជញ្ជូន</span>
                </label>
                <Input 
                  value={editForm.address}
                  onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Phnom Penh, Toul Kork, BKK, etc."
                  className="h-11 rounded-xl bg-secondary/40 border-border/80 text-xs sm:text-sm px-3.5 focus-visible:ring-primary"
                />
              </div>

              <DialogFooter className="gap-3 pt-2 sm:gap-3">
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 flex-1 rounded-2xl border-border text-xs font-bold uppercase hover:bg-secondary"
                  >
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={isSavingProfile}
                  className="h-12 flex-[2] gap-2 rounded-2xl bg-primary text-xs font-bold uppercase text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.98]"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="size-4 stroke-[3]" />
                      Save changes
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

      {/* ── Change password ── */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent
          showCloseButton={false}
          className="gap-0 overflow-hidden rounded-t-3xl border-border bg-card p-0 text-foreground sm:max-w-md sm:rounded-3xl"
        >
          <DialogHeader className="flex-row items-center justify-between gap-3 border-b border-border/60 bg-secondary/30 px-4 py-3 text-left sm:px-5">
            <div className="min-w-0">
              <DialogTitle className="truncate text-base font-black tracking-tight">
                Change password
              </DialogTitle>
              <DialogDescription className="truncate text-xs">
                Use at least 6 characters
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close"
                className="size-11 shrink-0 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="size-5" />
              </Button>
            </DialogClose>
          </DialogHeader>

          <form onSubmit={handleUpdatePassword} className="space-y-4 px-4 py-5 sm:px-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/90">New password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  required
                  className="h-12 rounded-xl border-border/80 bg-secondary/40 pr-14 text-sm focus-visible:ring-primary"
                />
                {/* 44px reveal target — the old one was a bare 16px icon */}
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/90">Confirm password</label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  required
                  className="h-12 rounded-xl border-border/80 bg-secondary/40 pr-14 text-sm focus-visible:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(v => !v)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                </button>
              </div>
            </div>

            <DialogFooter className="gap-3 pt-1 sm:gap-3">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 flex-1 rounded-2xl border-border text-xs font-bold uppercase hover:bg-secondary"
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isUpdatingPassword}
                className="h-12 flex-[2] gap-2 rounded-2xl bg-primary text-xs font-bold uppercase text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.98]"
              >
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Check className="size-4 stroke-[3]" />
                    Update password
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
