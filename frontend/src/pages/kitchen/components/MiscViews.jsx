import { useState, useRef } from "react";
import {
  ChefHat,
  Mail,
  Phone,
  Star,
  Clock3,
  Flame,
  RefreshCw,
  LogOut,
  CheckCircle2,
  Volume2,
  VolumeX,
  Timer,
  Rows3,
  Rows4,
  Image as ImageIcon,
  Wallet,
  AlertTriangle,
  Camera,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { API_URL } from "@/lib/api";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import {
  LiveClock,
  PersonAvatar,
  SectionHeading,
  StatusDot,
  formatMoney,
  playChime,
  setKitchenPref,
  useKitchenPrefs,
} from "./kitchen-ui";

export function ChefProfileView({ user, stats = {}, revenueText, onRefresh, onSignOut, onUserUpdate }) {
  const prefs = useKitchenPrefs();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [editPhone, setEditPhone] = useState(user?.phone || "");
  const [editRole, setEditRole] = useState(user?.role_title || user?.role || "Head Chef");
  const [savingInfo, setSavingInfo] = useState(false);

  const staffName = user?.name || "Kitchen Staff";
  const staffRole = user?.role_title || user?.role || "Head Chef";
  const staffEmail = user?.email || "No email on file";
  const staffPhone = user?.phone || "No phone on file";

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WEBP)");
      return;
    }

    setUploading(true);
    playChime("tap");
    const toastId = toast.loading("Uploading photo to Cloudinary…");

    try {
      const uploadedUrl = await uploadImageToCloudinary(file);
      if (!uploadedUrl) {
        throw new Error("Failed to get image URL from Cloudinary");
      }

      // Update current user object
      const updatedUser = {
        ...user,
        avatar: uploadedUrl,
        profile_photo: uploadedUrl,
      };

      // Persist to kitchenAuth in localStorage
      const kAuth = localStorage.getItem("kitchenAuth");
      if (kAuth) {
        try {
          const parsed = JSON.parse(kAuth);
          localStorage.setItem("kitchenAuth", JSON.stringify({ ...parsed, ...updatedUser }));
        } catch {}
      }

      // Persist to adminAuth in localStorage if applicable
      const aAuth = localStorage.getItem("adminAuth");
      if (aAuth) {
        try {
          const parsed = JSON.parse(aAuth);
          localStorage.setItem("adminAuth", JSON.stringify({ ...parsed, ...updatedUser }));
        } catch {}
      }

      // Notify parent component to update state
      onUserUpdate?.(updatedUser);

      // Trigger auth event so sidebar and components refresh
      window.dispatchEvent(new Event("authChanged"));

      // Persist to backend database
      try {
        await fetch(`${API_URL}/auth/kitchen-update-profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: user?.id,
            email: user?.email,
            phone: user?.phone,
            name: user?.name,
            role_title: user?.role_title || user?.role,
            avatar: uploadedUrl,
            profile_photo: uploadedUrl,
          }),
        });
      } catch (backendErr) {
        console.warn("Backend profile photo save failed, cached in localStorage:", backendErr);
      }

      playChime("ready");
      toast.success("Profile photo uploaded to Cloudinary successfully!", { id: toastId });
    } catch (err) {
      console.error("Cloudinary upload failed:", err);
      toast.error(err.message || "Failed to upload photo", { id: toastId });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveInfo = async (e) => {
    e?.preventDefault();
    setSavingInfo(true);
    playChime("tap");

    try {
      const updatedUser = {
        ...user,
        name: editName.trim() || staffName,
        phone: editPhone.trim() || staffPhone,
        role_title: editRole.trim() || staffRole,
        role: editRole.trim() || staffRole,
      };

      const kAuth = localStorage.getItem("kitchenAuth");
      if (kAuth) {
        try {
          const parsed = JSON.parse(kAuth);
          localStorage.setItem("kitchenAuth", JSON.stringify({ ...parsed, ...updatedUser }));
        } catch {}
      }

      const aAuth = localStorage.getItem("adminAuth");
      if (aAuth) {
        try {
          const parsed = JSON.parse(aAuth);
          localStorage.setItem("adminAuth", JSON.stringify({ ...parsed, ...updatedUser }));
        } catch {}
      }

      onUserUpdate?.(updatedUser);
      window.dispatchEvent(new Event("authChanged"));

      await fetch(`${API_URL}/auth/kitchen-update-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user?.id,
          email: user?.email,
          phone: updatedUser.phone,
          name: updatedUser.name,
          role_title: updatedUser.role_title,
          avatar: user?.avatar || user?.profile_photo,
          profile_photo: user?.profile_photo || user?.avatar,
        }),
      });

      playChime("ready");
      toast.success("Profile information updated!");
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update profile info:", err);
      toast.error("Failed to update details");
    } finally {
      setSavingInfo(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8 custom-scrollbar">
        <div className="w-full space-y-5 sm:space-y-6">
          {/* Hero Profile Card */}
          <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-card shadow-warm transition-all">
            {/* Top decorative banner gradient */}
            <div className="h-28 w-full bg-gradient-to-r from-primary via-orange-500 to-amber-500 relative overflow-hidden">
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="absolute right-4 top-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/30 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white shadow-xs">
                  <Flame className="size-3.5 text-amber-300 animate-pulse" /> Kitchen Station Live
                </span>
              </div>
            </div>

            {/* Profile Avatar & Info row */}
            <div className="px-4 pb-5 pt-0 sm:px-6 sm:pb-6 relative">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 -mt-10 sm:-mt-14 mb-4">
                {/* Avatar with Camera upload trigger */}
                <div className="relative group inline-block">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    className="hidden"
                    disabled={uploading}
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative size-20 sm:size-28 cursor-pointer rounded-2xl sm:rounded-3xl p-1 bg-card shadow-warm ring-4 ring-card transition-all hover:scale-105 active:scale-95"
                    title="Click to change profile photo"
                  >
                    <PersonAvatar
                      name={staffName}
                      src={user?.avatar || user?.profile_photo}
                      className="size-full rounded-[18px] sm:rounded-[22px] border border-border/50 object-cover shadow-inner"
                      fallbackClass="from-primary via-orange-500 to-amber-500 text-2xl sm:text-4xl text-white"
                    />

                    {/* Overlay on hover */}
                    <div className="absolute inset-1 flex flex-col items-center justify-center rounded-[22px] bg-black/60 text-white opacity-0 backdrop-blur-xs transition-opacity duration-200 group-hover:opacity-100">
                      <Camera className="size-6 text-white drop-shadow" />
                      <span className="mt-1 text-[10px] font-bold uppercase tracking-wider">Change</span>
                    </div>

                    {/* Upload spinner */}
                    {uploading && (
                      <div className="absolute inset-1 z-20 flex flex-col items-center justify-center rounded-[22px] bg-black/75 text-white backdrop-blur-xs">
                        <RefreshCw className="size-6 animate-spin text-amber-400" />
                        <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-amber-300">Saving…</span>
                      </div>
                    )}
                  </div>

                  {/* Floating Action Button for Upload */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute -bottom-1 -right-1 flex size-9 cursor-pointer items-center justify-center rounded-full border-2 border-card bg-gradient-to-br from-primary to-amber-500 text-white shadow-warm hover:scale-110 active:scale-95 transition-all"
                    title="Upload photo to Cloudinary"
                  >
                    {uploading ? (
                      <RefreshCw className="size-4 animate-spin" />
                    ) : (
                      <Camera className="size-4" />
                    )}
                  </button>
                </div>

                {/* Right action buttons: Edit profile / Change photo */}
                <div className="flex flex-wrap items-center gap-2 sm:self-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="h-9 rounded-full border-border/70 bg-card px-3.5 text-xs font-semibold shadow-xs hover:border-primary/50 hover:bg-secondary active:scale-95"
                  >
                    <UploadCloud className="mr-1.5 size-4 text-primary" />
                    <span>Upload Photo</span>
                  </Button>

                  <Button
                    type="button"
                    variant={isEditing ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (!isEditing) {
                        setEditName(staffName);
                        setEditPhone(staffPhone);
                        setEditRole(staffRole);
                      }
                      setIsEditing(!isEditing);
                    }}
                    className={cn(
                      "h-9 rounded-full px-4 text-xs font-bold shadow-xs transition-all active:scale-95",
                      isEditing
                        ? "bg-muted text-foreground hover:bg-muted/80"
                        : "border-border/70 bg-card hover:border-primary/50 hover:bg-secondary"
                    )}
                  >
                    {isEditing ? "Cancel" : "Edit Profile"}
                  </Button>
                </div>
              </div>

              {/* Name & Quick Details or Edit Form */}
              {isEditing ? (
                <form onSubmit={handleSaveInfo} className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
                  <h4 className="font-serif text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    <ChefHat className="size-4 text-primary" /> Update Profile Information
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded-xl border border-border/80 bg-card px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Chef name"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                        Role / Title
                      </label>
                      <input
                        type="text"
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="w-full rounded-xl border border-border/80 bg-card px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="e.g. Head Chef, Station 1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full rounded-xl border border-border/80 bg-card px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Phone number"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(false)}
                      className="rounded-full text-xs font-semibold"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={savingInfo}
                      className="rounded-full bg-gradient-to-r from-primary to-orange-500 text-white px-5 text-xs font-bold shadow-warm"
                    >
                      {savingInfo ? (
                        <>
                          <RefreshCw className="mr-1.5 size-3.5 animate-spin" /> Saving…
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                      {staffName}
                    </h2>
                    <Badge className="rounded-full bg-primary/15 text-primary border-primary/20 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider hover:bg-primary/20">
                      {staffRole}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded-full border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400"
                    >
                      Active Shift
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs font-medium text-muted-foreground sm:text-sm">
                    <span className="flex items-center gap-1.5 bg-secondary/50 px-3 py-1 rounded-full border border-border/50">
                      <Mail className="size-3.5 text-primary" /> {staffEmail}
                    </span>
                    <span className="flex items-center gap-1.5 bg-secondary/50 px-3 py-1 rounded-full border border-border/50">
                      <Phone className="size-3.5 text-primary" /> {staffPhone}
                    </span>
                    <span className="flex items-center gap-1.5 bg-secondary/50 px-3 py-1 rounded-full border border-border/50">
                      <Clock3 className="size-3.5 text-primary" /> Shift: 08:00 — Close
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Shift Productivity Metrics Grid */}
            <div className="border-t border-border/60 bg-secondary/20 p-4 sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Flame className="size-3.5 text-primary" /> Shift Performance Metrics
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground">Live real-time count</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                <MetricCard
                  icon={CheckCircle2}
                  label="Completed Today"
                  value={stats.completedToday ?? stats.totalOrdersToday ?? 0}
                  unit="orders"
                  tone="emerald"
                  gradient="from-emerald-500/15 via-emerald-500/5 to-transparent"
                />
                <MetricCard
                  icon={Flame}
                  label="Active in Kitchen"
                  value={stats.active ?? 0}
                  unit="tickets"
                  tone="primary"
                  gradient="from-primary/15 via-primary/5 to-transparent"
                />
                <MetricCard
                  icon={Wallet}
                  label="Station Revenue"
                  value={revenueText || formatMoney(stats.revenue)}
                  unit="gross"
                  tone="amber"
                  gradient="from-amber-500/15 via-amber-500/5 to-transparent"
                />
                <MetricCard
                  icon={AlertTriangle}
                  label="Delayed Tickets"
                  value={stats.delayed ?? 0}
                  unit="flagged"
                  tone={stats.delayed > 0 ? "destructive" : "muted"}
                  gradient={stats.delayed > 0 ? "from-destructive/15 via-destructive/5 to-transparent" : "from-secondary/50 to-transparent"}
                />
              </div>
            </div>
          </section>

          {/* 2-Column Grid for Settings & Shift Information */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Station Preferences */}
            <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-warm">
              <div className="mb-5 flex items-center gap-3 border-b border-border/50 pb-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-xs">
                  <Timer className="size-5" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-foreground sm:text-lg">
                    Station Preferences
                  </h3>
                  <p className="text-xs font-medium text-muted-foreground">
                    Customized kitchen workflow saved on this terminal
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Sound alert switch */}
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-secondary/30 p-4 transition-colors hover:bg-secondary/40">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-card border border-border/60 text-primary">
                      {prefs.sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground sm:text-sm">
                        Audio Chimes & Alerts
                      </p>
                      <p className="text-[11px] font-medium text-muted-foreground">
                        Play sound notifications for incoming orders and status updates
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {prefs.sound && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => playChime("ticket")}
                        className="h-8 rounded-full border border-border/70 bg-card text-[11px] font-bold shadow-xs hover:bg-secondary active:scale-95"
                      >
                        Test
                      </Button>
                    )}
                    <Switch
                      checked={prefs.sound}
                      onCheckedChange={(value) => {
                        setKitchenPref("sound", value);
                        if (value) playChime("ready");
                      }}
                    />
                  </div>
                </div>

                {/* Target prep time selector */}
                <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4 transition-colors hover:bg-secondary/40">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-card border border-border/60 text-primary">
                        <Clock3 className="size-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground sm:text-sm">
                          Target Prep Time
                        </p>
                        <p className="text-[11px] font-medium text-muted-foreground">
                          Flag orders as delayed if cooking exceeds this duration
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 font-mono text-xs font-bold text-primary tabular-nums">
                      {prefs.targetPrepMinutes} min
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    {[8, 10, 12, 15, 20].map((minutes) => (
                      <button
                        key={minutes}
                        type="button"
                        onClick={() => setKitchenPref("targetPrepMinutes", minutes)}
                        className={cn(
                          "rounded-xl border py-2 text-xs font-bold transition-all active:scale-95 flex flex-col items-center justify-center",
                          prefs.targetPrepMinutes === minutes
                            ? "border-primary bg-primary text-white shadow-warm"
                            : "border-border/70 bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        )}
                      >
                        <span>{minutes}m</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ticket layout density */}
                <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4 transition-colors hover:bg-secondary/40">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-card border border-border/60 text-primary">
                        {prefs.density === "compact" ? <Rows4 className="size-4" /> : <Rows3 className="size-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground sm:text-sm">
                          Ticket Board Density
                        </p>
                        <p className="text-[11px] font-medium text-muted-foreground">
                          Adjust spacing between ticket cards on the board
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/70 bg-card p-1">
                    {[
                      { key: "comfortable", label: "Comfortable (Standard)" },
                      { key: "compact", label: "Compact (More Cards)" },
                    ].map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setKitchenPref("density", option.key)}
                        className={cn(
                          "rounded-xl py-2 text-xs font-bold transition-all active:scale-95",
                          prefs.density === option.key
                            ? "bg-gradient-to-r from-primary to-orange-500 text-white shadow-warm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dish thumbnails switch */}
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-secondary/30 p-4 transition-colors hover:bg-secondary/40">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-card border border-border/60 text-primary">
                      <ImageIcon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground sm:text-sm">
                        Dish Photos on Tickets
                      </p>
                      <p className="text-[11px] font-medium text-muted-foreground">
                        Show visual food image previews on order item rows
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={prefs.showImages}
                    onCheckedChange={(value) => setKitchenPref("showImages", value)}
                  />
                </div>
              </div>
            </section>

            {/* Shift & Security Information */}
            <div className="space-y-6">
              <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-warm">
                <div className="mb-5 flex items-center gap-3 border-b border-border/50 pb-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-xs">
                    <Clock3 className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-bold text-foreground sm:text-lg">
                      Today's Kitchen Shift
                    </h3>
                    <p className="text-xs font-medium text-muted-foreground">
                      Station connectivity and terminal sync schedule
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-serif text-sm font-bold text-foreground sm:text-base">
                        Station Active • 08:00 → Close
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        <StatusDot tone="emerald" /> Auto-sync enabled (Every 10s)
                      </p>
                    </div>
                    <div className="shrink-0 rounded-2xl border border-primary/20 bg-card px-4 py-2 text-center shadow-xs">
                      <LiveClock className="block font-serif text-xl font-bold text-primary" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                        Terminal Clock
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 border-t border-border/50 pt-3.5">
                    <Star className="size-4 shrink-0 fill-amber-500 text-amber-500" />
                    <p className="text-xs font-medium text-muted-foreground">
                      Station performance ratings and order satisfaction are recorded on the{" "}
                      <span className="font-bold text-foreground">Performance</span> tab.
                    </p>
                  </div>
                </div>

                {/* Terminal Actions */}
                <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {onRefresh && (
                    <Button
                      variant="outline"
                      onClick={onRefresh}
                      className="h-11 rounded-full border-border/70 bg-card font-serif text-xs font-bold text-foreground shadow-xs transition-all hover:border-primary/40 hover:bg-secondary active:scale-95"
                    >
                      <RefreshCw className="mr-2 size-4 text-primary" /> Force Sync Data
                    </Button>
                  )}
                  {onSignOut && (
                    <Button
                      variant="outline"
                      onClick={onSignOut}
                      className="h-11 rounded-full border-destructive/30 bg-card font-serif text-xs font-bold text-destructive shadow-xs transition-all hover:bg-destructive/10 active:scale-95"
                    >
                      <LogOut className="mr-2 size-4" /> Sign Out of Shift
                    </Button>
                  )}
                </div>
              </section>

              {/* Station Tip Card */}
              <div className="rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-card to-card p-5 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <Flame className="size-5" />
                  </div>
                  <div>
                    <h4 className="font-serif text-sm font-bold text-foreground">Chef Quality Standards</h4>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Ensure every order is inspected for toppings and temperature before marking as Ready. For order inquiries or customer special requests, check the order notes on each ticket.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, unit, tone = "primary", gradient }) {
  const toneClasses = {
    emerald: "text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    primary: "text-primary border-primary/20",
    amber: "text-amber-600 dark:text-amber-400 border-amber-500/20",
    destructive: "text-destructive border-destructive/20",
    muted: "text-muted-foreground border-border/50",
  };

  const iconBgClasses = {
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    destructive: "bg-destructive/10 text-destructive",
    muted: "bg-secondary text-muted-foreground",
  };

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border bg-card/90 p-4 shadow-xs backdrop-blur-xs transition-all hover:shadow-warm", toneClasses[tone] || toneClasses.primary)}>
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none", gradient)} />
      <div className="relative flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
          {label}
        </span>
        <div className={cn("flex size-7 items-center justify-center rounded-xl", iconBgClasses[tone] || iconBgClasses.primary)}>
          <Icon className="size-3.5" />
        </div>
      </div>
      <div className="relative flex items-baseline gap-1.5">
        <p className={cn("font-serif text-2xl sm:text-3xl font-bold tabular-nums tracking-tight", toneClasses[tone]?.split(" ")[0])}>
          {value}
        </p>
        {unit && (
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

