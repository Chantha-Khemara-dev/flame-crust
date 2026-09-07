import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mail, 
  ArrowRight, 
  Loader2, 
  KeyRound, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  Phone,
  Flame,
  Camera,
  Check,
  X,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { Navbar } from "@/components/food/navbar";
import { PageTransition } from "@/components/shared/page-transition";
import { toast } from "sonner";
import { API_URL } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useGoogleLogin } from "@react-oauth/google";

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

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const redirectPath = queryParams.get("redirect");

  // authMode: "LOGIN" | "SIGNUP" | "OTP"
  const [authMode, setAuthMode] = useState("LOGIN"); 
  const [step, setStep] = useState("INPUT"); // "INPUT" | "OTP_VERIFY" | "PROFILE_REQUIRED"

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // For profile completion prompt
  const [pendingCustomer, setPendingCustomer] = useState(null);
  const [pendingToken, setPendingToken] = useState(null);

  const [otpLockTime, setOtpLockTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const passwordStrength = getPasswordStrength(password);

  useEffect(() => {
    try {
      const adminAuth = localStorage.getItem("adminAuth");
      if (adminAuth) {
        const a = JSON.parse(adminAuth);
        if ((a.role || "").toUpperCase() === "ADMIN") {
          navigate(redirectPath || "/admin/dashboard", { replace: true });
          return;
        }
      }
      const customerAuth = localStorage.getItem("customerAuth");
      if (customerAuth) {
        if (redirectPath && redirectPath.startsWith("/admin")) {
          return;
        }
        navigate(redirectPath || "/profile", { replace: true });
        return;
      }
    } catch (e) {}
  }, [navigate, redirectPath]);

  useEffect(() => {
    const lockedUntil = localStorage.getItem("otpLockTime");
    if (lockedUntil && new Date().getTime() < parseInt(lockedUntil)) {
      setOtpLockTime(parseInt(lockedUntil));
    }
  }, []);

  useEffect(() => {
    if (!otpLockTime) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      if (now >= otpLockTime) {
        setOtpLockTime(null);
        localStorage.removeItem("otpLockTime");
        setTimeLeft(0);
      } else {
        setTimeLeft(Math.ceil((otpLockTime - now) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [otpLockTime]);

  const finishLoginAndRedirect = (customerData, token) => {
    const seedName = customerData.name || customerData.email?.split("@")[0] || "User";
    const avatarUrl = customerData.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${seedName}&backgroundColor=e2e8f0&textColor=475569`;

    localStorage.removeItem("adminAuth");
    localStorage.removeItem("driverAuth");
    localStorage.removeItem("kitchenAuth");
    localStorage.removeItem("flame_customer_cover"); // remove stale shared key

    const authObject = {
      ...customerData,
      avatar: avatarUrl,
      cover_photo: customerData.cover_photo || undefined,
      token: token || customerData.token,
      authenticated: true,
    };

    localStorage.setItem("customerAuth", JSON.stringify(authObject));
    window.dispatchEvent(new Event("authChanged"));
    toast.success(`Welcome, ${customerData.name || seedName}!`);

    const destination = redirectPath && !redirectPath.startsWith("/admin") 
      ? redirectPath 
      : "/";
    navigate(destination, { replace: true });
  };

  const checkProfileAndRedirect = (customer, token) => {
    finishLoginAndRedirect(customer, token);
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Please enter email and password.");
      return;
    }
    setLoading(true);

    try {
      let response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!response.ok && response.status === 404) {
        response = await fetch(`${API_URL}/auth/customer-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        });
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Invalid email or password");
      }

      const data = await response.json();
      const roleType = (data.type || data.role || "").toUpperCase();

      if (roleType === "ADMIN") {
        const user = data.user || data;
        const seedName = user.name || email.split("@")[0] || "Admin";
        const avatarUrl = user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${seedName}&backgroundColor=cbd5e1&textColor=334155`;

        localStorage.removeItem("customerAuth");
        localStorage.removeItem("driverAuth");
        localStorage.removeItem("kitchenAuth");
        localStorage.setItem(
          "adminAuth",
          JSON.stringify({
            ...user,
            avatar: avatarUrl,
            token: data.token,
            authenticated: true,
          })
        );
        window.dispatchEvent(new Event("authChanged"));
        toast.success(`Welcome Admin, ${user.name || seedName}!`);
        navigate("/admin/dashboard", { replace: true });
      } else if (roleType === "DRIVER") {
        const driver = data.driver || data.user || data;
        const seedName = driver.name || email.split("@")[0] || "Driver";
        const avatarUrl = driver.profile_photo || driver.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${seedName}&backgroundColor=fef08a&textColor=854d0e`;

        localStorage.removeItem("customerAuth");
        localStorage.removeItem("adminAuth");
        localStorage.removeItem("kitchenAuth");
        localStorage.setItem(
          "driverAuth",
          JSON.stringify({
            ...driver,
            avatar: avatarUrl,
            profile_photo: driver.profile_photo || avatarUrl,
            token: data.token,
            authenticated: true,
          })
        );
        window.dispatchEvent(new Event("authChanged"));
        toast.success(`Welcome Driver, ${driver.name || seedName}!`);
        navigate("/driver/dashboard", { replace: true });
      } else if (roleType === "KITCHEN_STAFF" || roleType === "KITCHEN") {
        const staff = data.staff || data.user || data;
        localStorage.removeItem("customerAuth");
        localStorage.removeItem("adminAuth");
        localStorage.removeItem("driverAuth");
        localStorage.setItem(
          "kitchenAuth",
          JSON.stringify({
            ...staff,
            token: data.token,
            authenticated: true,
          })
        );
        window.dispatchEvent(new Event("authChanged"));
        toast.success(`Welcome Kitchen Staff, ${staff.name || "Staff"}!`);
        navigate("/kitchen/dashboard", { replace: true });
      } else {
        const customer = data.customer || data.user || data;
        checkProfileAndRedirect(customer, data.token);
      }
    } catch (err) {
      toast.error(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your full name.");
      return;
    }
    if (!email.trim()) {
      toast.error("Please enter your email.");
      return;
    }
    if (!phone.trim()) {
      toast.error("Please enter your phone number.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long for strong security.");
      return;
    }
    if (!/[0-9]/.test(password) && !/[^A-Za-z0-9]/.test(password)) {
      toast.error("Password must contain at least one number or special character.");
      return;
    }

    setLoading(true);
    try {
      const checkRes = await fetch(`${API_URL}/auth/check-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (checkRes.ok) {
        const checkData = await checkRes.json().catch(() => ({}));
        if (checkData.exists) {
          toast.error("គណនីនេះធ្លាប់បង្កើតរួចហើយ! This account already exists. Please sign in.");
          setAuthMode("LOGIN");
          setPassword("");
          return;
        }
      }

      const response = await fetch(`${API_URL}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          const lockUntil = new Date().getTime() + 60000;
          localStorage.setItem("otpLockTime", lockUntil.toString());
          setOtpLockTime(lockUntil);
          throw new Error("Too many attempts. Please wait 60 seconds.");
        }
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to send verification code.");
      }

      const data = await response.json().catch(() => ({}));
      toast.success("Verification code sent to " + email);
      if (data.devOtp) {
        toast.info("Test Mode OTP: " + data.devOtp, { duration: 8000 });
        setOtp(data.devOtp);
      }
      // Use OTP_VERIFY_SIGNUP to distinguish from normal passwordless OTP
      setStep("OTP_VERIFY_SIGNUP");
    } catch (err) {
      toast.error(err.message || "Failed to send code.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (otpLockTime) {
      toast.error(`Please wait ${timeLeft} seconds before requesting a new code.`);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          const lockUntil = new Date().getTime() + 60000;
          localStorage.setItem("otpLockTime", lockUntil.toString());
          setOtpLockTime(lockUntil);
          throw new Error("Too many attempts. Please wait 60 seconds.");
        }
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to send code.");
      }

      const data = await response.json().catch(() => ({}));
      toast.success("Verification code sent to " + email);
      if (data.devOtp) {
        toast.info("Test Mode OTP: " + data.devOtp, { duration: 8000 });
        setOtp(data.devOtp);
      }
      setStep("OTP_VERIFY");
    } catch (err) {
      toast.error(err.message || "Failed to send code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e, isSignup = false) => {
    e.preventDefault();
    if (otp.length < 6) {
      toast.error("Please enter the 6-digit code.");
      return;
    }
    setLoading(true);

    try {
      if (isSignup) {
        // Submit full registration with OTP
        const response = await fetch(`${API_URL}/auth/customer-register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            password: password,
            otp: otp.trim()
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Invalid code or registration failed.");
        }

        toast.success("Account created successfully!");
        finishLoginAndRedirect(data.customer, data.token);
      } else {
        // Normal passwordless login
        const response = await fetch(`${API_URL}/auth/verify-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Invalid or expired code.");
        }

        checkProfileAndRedirect(data.customer, data.token);
      }
    } catch (err) {
      toast.error(err.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const { uploadImageToCloudinary } = await import("@/lib/cloudinary");
      const uploadedUrl = await uploadImageToCloudinary(file);
      setAvatar(uploadedUrl);
      toast.success("Profile photo uploaded!");
    } catch (err) {
      toast.error("Failed to upload photo.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfileAndComplete = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your full name.");
      return;
    }
    if (!phone.trim()) {
      toast.error("Please enter your phone number.");
      return;
    }

    if (password) {
      if (password.length < 8) {
        toast.error("Password must be at least 8 characters long.");
        return;
      }
      if (!/[0-9]/.test(password) && !/[^A-Za-z0-9]/.test(password)) {
        toast.error("Password must contain at least one number or special character.");
        return;
      }
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/customer-update-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: pendingCustomer?.email || email.trim(),
          name: name.trim(),
          phone: phone.trim(),
          avatar: avatar || pendingCustomer?.avatar,
          password: password ? password : undefined
        }),
      });

      const updatedCustomer = await response.json();
      finishLoginAndRedirect(updatedCustomer, pendingToken);
    } catch (err) {
      toast.error(err.message || "Failed to save personal profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await userInfoRes.json();

        const response = await fetch(`${API_URL}/auth/google-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email: userInfo.email, 
            name: userInfo.name, 
            avatar: userInfo.picture 
          }),
        });
        
        if (!response.ok) {
           throw new Error("Failed to authenticate with Google.");
        }
        
        const data = await response.json();
        const customer = data.customer;
        checkProfileAndRedirect(customer, data.token);
      } catch (error) {
        toast.error("Google sign in failed. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      toast.error("Google Sign-In was cancelled or failed.");
    }
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 pt-[calc(4.5rem+env(safe-area-inset-top))] sm:pt-24 pb-14">
        <PageTransition>
          <div className="w-full max-w-[420px] mx-auto">
            
            {/* Elegant Modern Glass Card */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-card border border-border/70 rounded-3xl p-6 sm:p-8 shadow-warm-lg"
            >
              {/* Flame Logo Icon */}
              <div className="flex justify-center mb-4">
                <div className="size-12 rounded-2xl bg-gradient-to-tr from-red-600 via-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/25 ring-4 ring-orange-500/10">
                  <Flame className="size-6 text-white fill-white" />
                </div>
              </div>

              {/* STEP 1: MAIN FORM (SIGN IN / SIGN UP / OTP) */}
              {step === "INPUT" && (
                <>
                  <div className="text-center mb-5">
                    <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                      {authMode === "SIGNUP" ? "Create Account" : (authMode === "OTP" ? "Instant OTP Sign-In" : "Welcome Back")}
                    </h1>
                    <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                      {authMode === "SIGNUP" 
                        ? "Join Flame & Crust for fast delivery & rewards" 
                        : (authMode === "OTP" ? "Sign in using a temporary 6-digit email code" : "Sign in to order your favorite artisan pizzas")}
                    </p>
                  </div>

                  {/* Clean 2-Segmented Switcher (Sign In vs Sign Up) */}
                  <div className="flex p-1 bg-secondary/60 rounded-2xl mb-5 border border-border/50">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("LOGIN");
                        setPassword("");
                      }}
                      className={cn(
                        "flex-1 py-2 text-xs font-bold rounded-xl transition-all text-center",
                        authMode === "LOGIN" || authMode === "OTP"
                          ? "bg-card text-primary shadow-xs font-black"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("SIGNUP");
                        setPassword("");
                      }}
                      className={cn(
                        "flex-1 py-2 text-xs font-bold rounded-xl transition-all text-center",
                        authMode === "SIGNUP"
                          ? "bg-card text-primary shadow-xs font-black"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Create Account
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {/* A. REGULAR PASSWORD SIGN IN */}
                    {authMode === "LOGIN" && (
                      <motion.form
                        key="login-form"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        onSubmit={handlePasswordLogin}
                        className="space-y-3.5"
                      >
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-foreground/80 pl-1">
                            Email Address
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                              type="email"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="name@example.com"
                              className="pl-10 h-11 rounded-xl bg-secondary/30 border-border/60 text-sm focus-visible:ring-primary/40"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between items-center pl-1 pr-0.5">
                            <label className="text-xs font-medium text-foreground/80">
                              Password
                            </label>
                            <button
                              type="button"
                              onClick={() => setAuthMode("OTP")}
                              className="text-[11px] font-semibold text-primary hover:underline"
                            >
                              Sign in via OTP code
                            </button>
                          </div>
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                              type={showPassword ? "text" : "password"}
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="••••••••"
                              className="pl-10 pr-10 h-11 rounded-xl bg-secondary/30 border-border/60 text-sm focus-visible:ring-primary/40"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                              aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                          </div>
                        </div>

                        <Button
                          type="submit"
                          disabled={loading}
                          className="w-full h-11 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white text-sm font-bold shadow-md shadow-red-600/20 active:scale-[0.99] transition-all mt-1"
                        >
                          {loading ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="size-4 animate-spin" />
                              Signing In...
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              Sign In <ArrowRight className="size-4" />
                            </span>
                          )}
                        </Button>
                      </motion.form>
                    )}

                    {/* B. EMAIL OTP INSTANT LOGIN */}
                    {authMode === "OTP" && (
                      <motion.form
                        key="otp-form"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        onSubmit={handleSendOTP}
                        className="space-y-3.5"
                      >
                        <div className="space-y-1">
                          <div className="flex justify-between items-center pl-1 pr-0.5">
                            <label className="text-xs font-medium text-foreground/80">
                              Email Address
                            </label>
                            <button
                              type="button"
                              onClick={() => setAuthMode("LOGIN")}
                              className="text-[11px] font-semibold text-primary hover:underline"
                            >
                              Use Password instead
                            </button>
                          </div>
                          <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                              type="email"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="name@example.com"
                              className="pl-10 h-11 rounded-xl bg-secondary/30 border-border/60 text-sm focus-visible:ring-primary/40"
                            />
                          </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground pl-1">
                          We will send a 6-digit code to log you in without remembering passwords.
                        </p>

                        <Button
                          type="submit"
                          disabled={loading}
                          className="w-full h-11 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white text-sm font-bold shadow-md shadow-red-600/20 active:scale-[0.99] transition-all mt-1"
                        >
                          {loading ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="size-4 animate-spin" />
                              Sending Code...
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              Send Code <ArrowRight className="size-4" />
                            </span>
                          )}
                        </Button>
                      </motion.form>
                    )}

                    {/* C. SIGN UP FORM WITH LIVE PASSWORD STRENGTH METER */}
                    {authMode === "SIGNUP" && (
                      <motion.form
                        key="signup-form"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        onSubmit={handleSignUp}
                        className="space-y-3"
                      >
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-foreground/80 pl-1">
                            Full Name
                          </label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                              type="text"
                              required
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="Chantha Khemara"
                              className="pl-10 h-11 rounded-xl bg-secondary/30 border-border/60 text-sm focus-visible:ring-primary/40"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-medium text-foreground/80 pl-1">
                            Email Address
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                              type="email"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="name@example.com"
                              className="pl-10 h-11 rounded-xl bg-secondary/30 border-border/60 text-sm focus-visible:ring-primary/40"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-medium text-foreground/80 pl-1">
                            Phone Number
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                              type="tel"
                              required
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="012 345 678"
                              className="pl-10 h-11 rounded-xl bg-secondary/30 border-border/60 text-sm focus-visible:ring-primary/40"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between items-center pl-1 pr-0.5">
                            <label className="text-xs font-medium text-foreground/80">
                              Password (ពាក្យសម្ងាត់សុវត្ថិភាព)
                            </label>
                            {password && (
                              <span className={cn("text-[10px] font-bold", passwordStrength.textColor)}>
                                {passwordStrength.label}
                              </span>
                            )}
                          </div>
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                              type={showPassword ? "text" : "password"}
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Min 8 characters"
                              className="pl-10 pr-10 h-11 rounded-xl bg-secondary/30 border-border/60 text-sm focus-visible:ring-primary/40"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                              aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                          </div>

                          {/* Animated Password Strength Bar */}
                          {password && (
                            <div className="space-y-1.5 pt-1">
                              <div className="grid grid-cols-4 gap-1 h-1.5 w-full bg-secondary/70 rounded-full overflow-hidden p-0.5">
                                {[1, 2, 3, 4].map((level) => (
                                  <div
                                    key={level}
                                    className={cn(
                                      "h-full rounded-full transition-all duration-300",
                                      passwordStrength.score >= level ? passwordStrength.color : "bg-muted/40"
                                    )}
                                  />
                                ))}
                              </div>

                              {/* Requirements Checklist */}
                              <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground pt-0.5">
                                <div className="flex items-center gap-1">
                                  {password.length >= 8 ? <Check className="size-3 text-emerald-500" /> : <X className="size-3 text-muted-foreground/60" />}
                                  <span className={password.length >= 8 ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}>8+ characters</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {/[a-z]/.test(password) && /[A-Z]/.test(password) ? <Check className="size-3 text-emerald-500" /> : <X className="size-3 text-muted-foreground/60" />}
                                  <span className={/[a-z]/.test(password) && /[A-Z]/.test(password) ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}>A-Z & a-z</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {/[0-9]/.test(password) ? <Check className="size-3 text-emerald-500" /> : <X className="size-3 text-muted-foreground/60" />}
                                  <span className={/[0-9]/.test(password) ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}>0-9 Number</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {/[^A-Za-z0-9]/.test(password) ? <Check className="size-3 text-emerald-500" /> : <X className="size-3 text-muted-foreground/60" />}
                                  <span className={/[^A-Za-z0-9]/.test(password) ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}>Symbol (!@#)</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <Button
                          type="submit"
                          disabled={loading}
                          className="w-full h-11 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white text-sm font-bold shadow-md shadow-red-600/20 active:scale-[0.99] transition-all mt-1"
                        >
                          {loading ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="size-4 animate-spin" />
                              Creating Account...
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              Create Account <ArrowRight className="size-4" />
                            </span>
                          )}
                        </Button>
                      </motion.form>
                    )}
                  </AnimatePresence>

                  {/* Social Login Divider */}
                  <div className="mt-5 mb-4">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border/50" />
                      </div>
                      <div className="relative flex justify-center text-[11px] uppercase">
                        <span className="bg-card px-2.5 text-muted-foreground font-semibold">
                          Or continue with
                        </span>
                      </div>
                    </div>

                    <div className="mt-3.5">
                      <Button
                        variant="outline"
                        type="button"
                        disabled={loading}
                        onClick={handleGoogleLogin}
                        className="w-full h-11 rounded-xl bg-card hover:bg-secondary/60 border-border/70 font-semibold text-foreground transition-all flex items-center justify-center gap-2 text-xs sm:text-sm"
                      >
                        <svg className="size-4.5" viewBox="0 0 24 24">
                          <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                          />
                          <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                          />
                          <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                          />
                        </svg>
                        Google
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* STEP 2: OTP VERIFICATION */}
              {(step === "OTP_VERIFY" || step === "OTP_VERIFY_SIGNUP") && (
                <div className="py-1">
                  <div className="text-center mb-5">
                    <h1 className="font-serif text-2xl font-bold text-foreground">
                      Verify OTP Code
                    </h1>
                    <p className="text-muted-foreground text-xs mt-1">
                      Enter the 6-digit code sent to <span className="font-bold text-foreground">{email}</span>
                    </p>
                  </div>

                  <motion.form
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onSubmit={(e) => handleVerifyOTP(e, step === "OTP_VERIFY_SIGNUP")}
                    className="space-y-4"
                  >
                    <div className="space-y-2 flex justify-center pb-2">
                      <InputOTP maxLength={6} autoFocus value={otp} onChange={(val) => setOtp(val)}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} className="w-10 h-12 sm:w-12 sm:h-14 text-xl font-bold bg-secondary/30" />
                          <InputOTPSlot index={1} className="w-10 h-12 sm:w-12 sm:h-14 text-xl font-bold bg-secondary/30" />
                          <InputOTPSlot index={2} className="w-10 h-12 sm:w-12 sm:h-14 text-xl font-bold bg-secondary/30" />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup>
                          <InputOTPSlot index={3} className="w-10 h-12 sm:w-12 sm:h-14 text-xl font-bold bg-secondary/30" />
                          <InputOTPSlot index={4} className="w-10 h-12 sm:w-12 sm:h-14 text-xl font-bold bg-secondary/30" />
                          <InputOTPSlot index={5} className="w-10 h-12 sm:w-12 sm:h-14 text-xl font-bold bg-secondary/30" />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading || otp.length < 6}
                      className="w-full h-11 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white text-sm font-bold shadow-md shadow-red-600/20 active:scale-[0.99] transition-all"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="size-4 animate-spin" />
                          Verifying...
                        </span>
                      ) : (
                        "Verify & Sign In"
                      )}
                    </Button>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setStep("INPUT");
                          setOtp("");
                        }}
                        className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        onClick={handleSendOTP}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        Resend Code
                      </button>
                    </div>
                  </motion.form>
                </div>
              )}

              {/* STEP 3: COMPLETE PERSONAL PROFILE WITH STRONG PASSWORD */}
              {step === "PROFILE_REQUIRED" && (
                <div className="py-1">
                  {/* Avatar Upload with camera badge */}
                  <div className="relative mx-auto size-20 mb-3 group text-center">
                    <div className="size-full rounded-full ring-2 ring-primary/30 p-0.5 bg-background shadow-md overflow-hidden">
                      <div className="size-full rounded-full overflow-hidden bg-secondary/60 flex items-center justify-center relative">
                        {avatar ? (
                          <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User className="size-9 text-primary/70" />
                        )}
                        {uploadingAvatar && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                            <Loader2 className="size-4 animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>
                    <label 
                      className="absolute bottom-0 right-0 size-7 rounded-full bg-primary text-white flex items-center justify-center shadow-md border-2 border-card hover:scale-110 active:scale-95 transition-all cursor-pointer"
                      title="Upload Photo"
                    >
                      <Camera className="size-3.5" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleAvatarUpload} 
                        disabled={uploadingAvatar}
                      />
                    </label>
                  </div>

                  <div className="text-center mb-4">
                    <h1 className="font-serif text-2xl font-bold text-foreground">
                      បំពេញព័ត៌មានផ្ទាល់ខ្លួន
                    </h1>
                    <p className="text-muted-foreground text-xs mt-0.5 max-w-xs mx-auto">
                      សូមបំពេញឈ្មោះ លេខទូរស័ព្ទ និងពាក្យសម្ងាត់សុវត្ថិភាព
                    </p>
                  </div>

                  <motion.form
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onSubmit={handleSaveProfileAndComplete}
                    className="space-y-3"
                  >
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground/80 pl-1">
                        Full Name (ឈ្មោះពេញ) *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          type="text"
                          required
                          autoFocus={!name}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Chantha Khemara"
                          className="pl-10 h-11 rounded-xl bg-secondary/30 border-border/60 text-sm focus-visible:ring-primary/40"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground/80 pl-1">
                        Phone Number (លេខទូរស័ព្ទ) *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          type="tel"
                          required
                          autoFocus={!!name}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="012 345 678 / 096 575 5963"
                          className="pl-10 h-11 rounded-xl bg-secondary/30 border-border/60 text-sm focus-visible:ring-primary/40"
                        />
                      </div>
                    </div>

                    {/* Password with Strength Meter */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center pl-1 pr-0.5">
                        <label className="text-xs font-medium text-foreground/80">
                          Create Password (ពាក្យសម្ងាត់សុវត្ថិភាព)
                        </label>
                        {password && (
                          <span className={cn("text-[10px] font-bold", passwordStrength.textColor)}>
                            {passwordStrength.label}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min 8 characters (Strong Password)"
                          className="pl-10 pr-10 h-11 rounded-xl bg-secondary/30 border-border/60 text-sm focus-visible:ring-primary/40"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>

                      {/* Animated Password Strength Bar */}
                      {password && (
                        <div className="space-y-1.5 pt-1">
                          <div className="grid grid-cols-4 gap-1 h-1.5 w-full bg-secondary/70 rounded-full overflow-hidden p-0.5">
                            {[1, 2, 3, 4].map((level) => (
                              <div
                                key={level}
                                className={cn(
                                  "h-full rounded-full transition-all duration-300",
                                  passwordStrength.score >= level ? passwordStrength.color : "bg-muted/40"
                                )}
                              />
                            ))}
                          </div>

                          <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground pt-0.5">
                            <div className="flex items-center gap-1">
                              {password.length >= 8 ? <Check className="size-3 text-emerald-500" /> : <X className="size-3 text-muted-foreground/60" />}
                              <span className={password.length >= 8 ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}>8+ chars</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password) ? <Check className="size-3 text-emerald-500" /> : <X className="size-3 text-muted-foreground/60" />}
                              <span className={/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password) ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}>Number/Symbol</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={loading || !name.trim() || !phone.trim()}
                      className="w-full h-11 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white text-sm font-bold shadow-md shadow-red-600/20 active:scale-[0.99] transition-all mt-1"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="size-4 animate-spin" />
                          Saving...
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          រក្សាទុក & ចាប់ផ្តើមកុម្ម៉ង់ <ArrowRight className="size-4" />
                        </span>
                      )}
                    </Button>

                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => finishLoginAndRedirect(pendingCustomer, pendingToken)}
                        className="text-xs text-muted-foreground hover:text-foreground underline font-medium"
                      >
                        រំលងសិន (Skip for now)
                      </button>
                    </div>
                  </motion.form>
                </div>
              )}

            </motion.div>
          </div>
        </PageTransition>
      </main>
    </div>
  );
}
