import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, User, Mail, Phone, ShieldCheck, Car, Calendar, Star, 
  CheckCircle, Package, Edit, Key, LogOut, Camera, Loader2, X, 
  Check, Eye, EyeOff, Bike, MapPin, Sparkles, AlertCircle,
  Sun, Moon, DollarSign, Award, Bell, RefreshCw, Zap, Flame, Crown, ChevronRight,
  Shield, CheckCircle2, TrendingUp, Navigation
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getDriverMe, updateDriverProfile, list } from "@/lib/api";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";

const DEFAULT_COVER_PHOTO = "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=2000&auto=format&fit=crop";

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
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-4">Loading Driver Profile...</p>
      </div>
    );
  }

  const tabs = [
    { id: "OVERVIEW", label: "Overview", icon: User },
    { id: "VEHICLE", label: "Vehicle & Gear", icon: Bike },
    { id: "PERFORMANCE", label: "Performance", icon: TrendingUp },
    { id: "SETTINGS", label: "Settings", icon: Key },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 pb-24 transition-colors">
      
      {/* Hidden File Input */}
      <input 
        ref={fileInputRef} 
        type="file" 
        accept="image/*" 
        onChange={handlePhotoSelect} 
        className="hidden" 
      />

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/70 pt-[env(safe-area-inset-top)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link 
            to="/driver/dashboard" 
            aria-label="Back to Dashboard"
            className="flex size-9 items-center justify-center rounded-full text-foreground/80 transition-all hover:bg-secondary/70 hover:text-primary active:scale-95 sm:ml-0 sm:size-auto sm:gap-2 sm:text-xs sm:font-bold sm:uppercase sm:tracking-wider sm:hover:bg-transparent"
          >
            <ArrowLeft className="size-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="size-9 rounded-full bg-secondary/80 hover:bg-secondary text-foreground flex items-center justify-center transition-colors cursor-pointer border border-border/50"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-slate-700" />}
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/30">
              <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">Online</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 mt-4 sm:mt-6 space-y-6">
        
        {/* Hero Banner & Profile Header Card */}
        <div className="rounded-[32px] overflow-hidden bg-card border border-border/70 shadow-xl relative transition-all">
          
          {/* Cover Photo Header */}
          <div className="h-44 sm:h-56 w-full relative overflow-hidden bg-gradient-to-r from-amber-600 via-red-600 to-orange-700">
            <img 
              src={DEFAULT_COVER_PHOTO} 
              alt="Cover" 
              className="w-full h-full object-cover opacity-60 mix-blend-overlay"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            
            {/* Top Right Badges */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-lg">
                <Crown className="size-3.5 text-amber-400 fill-amber-400" />
                Gold Partner Rider
              </span>
            </div>
          </div>

          {/* Profile Details Bar */}
          <div className="px-6 sm:px-8 pb-8 pt-0 relative">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-16 sm:-mt-20">
              
              {/* Avatar with Camera Trigger & Glow */}
              <div className="relative group shrink-0">
                <div className="size-32 sm:size-36 rounded-full overflow-hidden border-4 border-card ring-4 ring-primary/40 shadow-2xl relative bg-secondary">
                  {driver.profile_photo ? (
                    <img 
                      src={driver.profile_photo} 
                      alt={driver.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-secondary">
                      <User className="size-16" />
                    </div>
                  )}

                  {/* Uploading Spinner */}
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center text-white">
                      <Loader2 className="size-7 animate-spin text-primary" />
                      <span className="text-[10px] font-black uppercase mt-1">Uploading...</span>
                    </div>
                  )}
                </div>

                {/* Camera Trigger */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="absolute bottom-1 right-1 size-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 ring-4 ring-card active:scale-90 transition-all cursor-pointer"
                  title="Change Profile Photo"
                >
                  <Camera className="size-4.5 stroke-[2.5]" />
                </button>
              </div>

              {/* Driver Identity */}
              <div className="text-center sm:text-left flex-1 min-w-0 pb-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                    {driver.name}
                  </h1>
                  <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase px-2.5 py-0.5 bg-primary/15 text-primary rounded-full border border-primary/30">
                    <Bike className="size-3 stroke-[2.5]" />
                    Driver Partner
                  </span>
                </div>
                
                <p className="text-xs sm:text-sm font-semibold text-muted-foreground">
                  Flame & Crust Express Courier • Priority Fleet
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 mt-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80 bg-secondary/80 px-3 py-1 rounded-xl border border-border/50">
                    <ShieldCheck className="size-4 text-primary" />
                    ID: {driver.phone || "0888631805"}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80 bg-secondary/80 px-3 py-1 rounded-xl border border-border/50">
                    <Calendar className="size-4 text-amber-500" />
                    Joined: {driver.created_at ? new Date(driver.created_at).toLocaleDateString("en-GB") : "22/08/2026"}
                  </div>
                </div>
              </div>

              {/* Edit Profile Button */}
              <div className="shrink-0 pt-2 sm:pt-0">
                <Button
                  onClick={() => setIsEditModalOpen(true)}
                  className="rounded-2xl h-11 px-5 bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-600/90 text-primary-foreground font-bold text-xs uppercase tracking-wider shadow-lg shadow-primary/20 active:scale-95 transition-all gap-2"
                >
                  <Edit className="size-4" />
                  Edit Profile
                </Button>
              </div>

            </div>
          </div>
        </div>

        {/* 4 Sleek Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-card rounded-[24px] p-5 border border-border/70 shadow-xs flex flex-col items-center justify-center text-center group hover:border-primary/50 transition-all">
            <div className="size-11 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
              <Package className="size-5.5 stroke-[2.5]" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-foreground">{stats.totalDeliveries}</h3>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">Total Deliveries</p>
          </div>

          <div className="bg-card rounded-[24px] p-5 border border-border/70 shadow-xs flex flex-col items-center justify-center text-center group hover:border-emerald-500/50 transition-all">
            <div className="size-11 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
              <CheckCircle className="size-5.5 stroke-[2.5]" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-foreground">{stats.completedDeliveries}</h3>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">Completed Trips</p>
          </div>

          <div className="bg-card rounded-[24px] p-5 border border-border/70 shadow-xs flex flex-col items-center justify-center text-center group hover:border-amber-500/50 transition-all">
            <div className="size-11 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
              <Star className="size-5.5 stroke-[2.5] fill-amber-500/20" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-foreground">{stats.rating}</h3>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">Customer Rating</p>
          </div>

          <div className="bg-card rounded-[24px] p-5 border border-border/70 shadow-xs flex flex-col items-center justify-center text-center group hover:border-purple-500/50 transition-all">
            <div className="size-11 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
              <ShieldCheck className="size-5.5 stroke-[2.5]" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-foreground">{stats.successRate}%</h3>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">Success Rate</p>
          </div>
        </div>

        {/* Tabbed Navigation Bar (Matches Customer Profile) */}
        <div className="flex items-center gap-1.5 p-1.5 bg-secondary/60 rounded-2xl border border-border/60 overflow-x-auto no-scrollbar">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-label={tab.label}
                aria-current={isActive}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-2.5 py-2.5 text-xs font-bold transition-all duration-200 cursor-pointer active:scale-[0.97] sm:px-4 sm:text-sm",
                  isActive
                    ? "bg-card text-foreground shadow-md border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                )}
              >
                <Icon className={cn("size-4 shrink-0", isActive ? "text-primary" : "")} />
                {/* Icon-only on phones — the full labels overflowed 360px screens */}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "OVERVIEW" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 animate-in fade-in duration-200">
            {/* Personal Details Card */}
            <div className="bg-card rounded-[28px] p-6 border border-border/70 shadow-xs">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-border/50">
                <h2 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                  <User className="size-4 text-primary" />
                  Personal Information
                </h2>
                <button 
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit className="size-3.5" /> Edit
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border/40">
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-0.5">Full Name</p>
                    <p className="text-sm font-bold text-foreground truncate">{driver.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-0.5">Phone Number</p>
                    <p className="text-sm font-bold text-foreground flex items-center gap-1 truncate">
                      <Phone className="size-3.5 text-muted-foreground shrink-0" />
                      {driver.phone}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-0.5">National ID / Passport</p>
                    <p className="text-sm font-bold text-foreground truncate">
                      {driver.national_id || "ID-98234710"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-0.5">Emergency Contact</p>
                    <p className="text-sm font-bold text-foreground truncate">
                      {driver.emergency_contact || "012 345 678"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Operational Location & Status */}
            <div className="bg-card rounded-[28px] p-6 border border-border/70 shadow-xs">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-border/50">
                <h2 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  Service & Delivery Zone
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  ACTIVE
                </span>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border/40">
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-0.5">Operating Area</p>
                    <p className="text-sm font-bold text-foreground truncate">
                      {driver.address || "Phnom Penh Central"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-0.5">Fleet Base</p>
                    <p className="text-sm font-bold text-foreground truncate">
                      Main Kitchen Store
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-0.5">Driver Status</p>
                    <p className="text-sm font-bold text-emerald-500 flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      Verified & Active
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-0.5">Safety Certificate</p>
                    <p className="text-sm font-bold text-foreground flex items-center gap-1">
                      <ShieldCheck className="size-3.5 text-primary" /> Level 2 Verified
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VEHICLE & GEAR */}
        {activeTab === "VEHICLE" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 animate-in fade-in duration-200">
            {/* Vehicle Details */}
            <div className="bg-card rounded-[28px] p-6 border border-border/70 shadow-xs">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-border/50">
                <h2 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Bike className="size-4 text-primary" />
                  Vehicle Registration
                </h2>
                <button 
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit className="size-3.5" /> Edit
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border/40">
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-0.5">Vehicle Model</p>
                    <p className="text-sm font-bold text-foreground truncate">
                      {driver.vehicle_info || "Honda Wave 125i (Red/Black)"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-0.5">License Plate</p>
                    <p className="text-sm font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded-lg inline-block">
                      {driver.license_plate || "1A-2345"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-0.5">Vehicle Type</p>
                    <p className="text-sm font-bold text-foreground">Motorcycle / Scooter</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-0.5">Inspection Status</p>
                    <p className="text-sm font-bold text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" /> Passed (Aug 2026)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Gear & Safety Checklist */}
            <div className="bg-card rounded-[28px] p-6 border border-border/70 shadow-xs">
              <h2 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2 pb-4 mb-4 border-b border-border/50">
                <ShieldCheck className="size-4 text-primary" />
                Gear & Equipment Verification
              </h2>

              <div className="space-y-3">
                {[
                  { name: "Safety Helmet (Full/Half face)", status: true },
                  { name: "Flame & Crust Insulated Pizza Bag", status: true },
                  { name: "Driver Uniform / Reflective Vest", status: true },
                  { name: "Handlebar Phone Mount & Charger", status: true },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-secondary/40 border border-border/50">
                    <span className="text-xs font-bold text-foreground">{item.name}</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-black flex items-center gap-1">
                      <Check className="size-3 stroke-[3]" /> VERIFIED
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PERFORMANCE */}
        {activeTab === "PERFORMANCE" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-card to-secondary/50 rounded-[28px] p-6 border border-border/70 shadow-xs">
                <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <DollarSign className="size-5 stroke-[2.5]" />
                </div>
                <p className="text-xs font-black text-muted-foreground uppercase tracking-wider">Estimated Earnings</p>
                <h3 className="text-3xl font-black text-foreground mt-1">${stats.totalEarnings.toFixed(2)}</h3>
                <p className="text-[11px] text-emerald-500 font-bold mt-2 flex items-center gap-1">
                  <TrendingUp className="size-3.5" /> +14% from last week
                </p>
              </div>

              <div className="bg-gradient-to-br from-card to-secondary/50 rounded-[28px] p-6 border border-border/70 shadow-xs">
                <div className="size-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
                  <Award className="size-5 stroke-[2.5]" />
                </div>
                <p className="text-xs font-black text-muted-foreground uppercase tracking-wider">On-Time Rate</p>
                <h3 className="text-3xl font-black text-foreground mt-1">98.2%</h3>
                <p className="text-[11px] text-amber-500 font-bold mt-2 flex items-center gap-1">
                  <Flame className="size-3.5" /> Top 5% speed in Phnom Penh
                </p>
              </div>

              <div className="bg-gradient-to-br from-card to-secondary/50 rounded-[28px] p-6 border border-border/70 shadow-xs">
                <div className="size-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                  <Star className="size-5 stroke-[2.5] fill-emerald-500/20" />
                </div>
                <p className="text-xs font-black text-muted-foreground uppercase tracking-wider">Customer Satisfaction</p>
                <h3 className="text-3xl font-black text-foreground mt-1">4.9 / 5.0</h3>
                <p className="text-[11px] text-muted-foreground font-semibold mt-2">
                  Based on 38 recent reviews
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SETTINGS */}
        {activeTab === "SETTINGS" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 animate-in fade-in duration-200">
            {/* Security & Password */}
            <div className="bg-card rounded-[28px] p-6 border border-border/70 shadow-xs">
              <h2 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2 pb-4 mb-4 border-b border-border/50">
                <Key className="size-4 text-primary" />
                Security & Credentials
              </h2>

              <p className="text-xs text-muted-foreground mb-4">
                Keep your driver account secure by changing your password periodically.
              </p>

              <Button
                variant="outline"
                onClick={() => setIsPasswordModalOpen(true)}
                className="w-full h-12 rounded-2xl border-border hover:bg-secondary font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Key className="size-4 text-primary" />
                Change Password
              </Button>
            </div>

            {/* App Preferences & Logout */}
            <div className="bg-card rounded-[28px] p-6 border border-border/70 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2 pb-4 mb-4 border-b border-border/50">
                  <Sun className="size-4 text-primary" />
                  App Preferences
                </h2>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/40 border border-border/50 mb-4">
                  <div>
                    <p className="text-xs font-bold text-foreground">Appearance Theme</p>
                    <p className="text-[11px] text-muted-foreground">{theme === "dark" ? "Dark Mode" : "Light Mode"}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="rounded-xl h-9 px-3 gap-1.5 text-xs font-bold"
                  >
                    {theme === "dark" ? <Sun className="size-3.5 text-amber-400" /> : <Moon className="size-3.5 text-slate-700" />}
                    Switch
                  </Button>
                </div>
              </div>

              <Button
                variant="destructive"
                onClick={handleLogout}
                className="w-full h-12 rounded-2xl font-bold text-xs uppercase tracking-wider gap-2 shadow-lg shadow-destructive/20 active:scale-95"
              >
                <LogOut className="size-4" />
                Sign Out from Driver Hub
              </Button>
            </div>
          </div>
        )}

      </main>

      {/* ── MODAL: EDIT PROFILE ── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-card text-foreground w-full sm:max-w-lg rounded-t-[32px] sm:rounded-[32px] max-h-[90vh] flex flex-col overflow-hidden border border-border shadow-2xl animate-in slide-in-from-bottom duration-300">
            
            <div className="p-5 border-b border-border/60 flex items-center justify-between shrink-0 bg-secondary/30">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                  <Edit className="size-4.5 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-base font-black text-foreground uppercase tracking-tight">
                    Edit Driver Profile
                  </h2>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Update your personal and vehicle details
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="size-8 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar">
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

              <div className="pt-3 flex gap-3">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 h-12 rounded-2xl font-bold text-xs uppercase cursor-pointer hover:bg-secondary border-border"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex-[2] h-12 rounded-2xl bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-600/90 text-primary-foreground font-bold text-xs uppercase shadow-md shadow-primary/20 cursor-pointer active:scale-95 transition-all"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="size-4 stroke-[3] mr-1.5" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ── MODAL: CHANGE PASSWORD ── */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-card text-foreground w-full sm:max-w-md rounded-t-[32px] sm:rounded-[32px] flex flex-col overflow-hidden border border-border shadow-2xl animate-in slide-in-from-bottom duration-300">
            
            <div className="p-5 border-b border-border/60 flex items-center justify-between shrink-0 bg-secondary/30">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                  <Key className="size-4.5 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-base font-black text-foreground uppercase tracking-tight">
                    Change Password
                  </h2>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Set a new secure password
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsPasswordModalOpen(false)}
                className="size-8 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePassword} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground/90 block mb-1.5">
                  New Password *
                </label>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="At least 6 characters"
                    required
                    className="h-11 rounded-xl pr-10 bg-secondary/40 border-border/80 text-xs sm:text-sm px-3.5 focus-visible:ring-primary"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground/90 block mb-1.5">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Input 
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Repeat new password"
                    required
                    className="h-11 rounded-xl pr-10 bg-secondary/40 border-border/80 text-xs sm:text-sm px-3.5 focus-visible:ring-primary"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="flex-1 h-12 rounded-2xl font-bold text-xs uppercase cursor-pointer hover:bg-secondary border-border"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="flex-[2] h-12 rounded-2xl bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-600/90 text-primary-foreground font-bold text-xs uppercase shadow-md shadow-primary/20 cursor-pointer active:scale-95 transition-all"
                >
                  {isUpdatingPassword ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Check className="size-4 stroke-[3] mr-1.5" />
                      Update Password
                    </>
                  )}
                </Button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
