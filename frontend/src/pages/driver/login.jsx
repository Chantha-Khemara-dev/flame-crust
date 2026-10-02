import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Lock, Eye, EyeOff, Loader2, Bike, Phone, User, ArrowRight, ArrowLeft,
  Camera, Calendar, CreditCard, MapPin, Heart, Car, CheckCircle2, Navigation, Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { driverLogin, driverRegister, updateDriverProfile, getDriverMe } from "@/lib/api";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";

const STEPS = { AUTH: "AUTH", PROFILE: "PROFILE", LOCATION: "LOCATION" };

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

export default function DriverLoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEPS.AUTH);
  const [authTab, setAuthTab] = useState("LOGIN"); // LOGIN or REGISTER
  const [direction, setDirection] = useState(1);

  // Auth fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  // Profile fields
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);
  const [dob, setDob] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Check if already logged in
  useEffect(() => {
    const auth = localStorage.getItem("driverAuth");
    if (auth) {
      try {
        const parsed = JSON.parse(auth);
        if (parsed.token) {
          navigate("/driver/dashboard");
        }
      } catch { /* invalid auth */ }
    }
  }, [navigate]);

  const goToStep = (newStep, dir = 1) => {
    setDirection(dir);
    setStep(newStep);
  };

  // ── Auth Handlers ──

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("សូមបញ្ចូល Email និង Password ។");
      return;
    }
    setLoading(true);
    try {
      const data = await driverLogin(email.trim(), password);
      localStorage.removeItem("customerAuth");
      localStorage.removeItem("adminAuth");
      localStorage.removeItem("kitchenAuth");
      localStorage.setItem("driverAuth", JSON.stringify({ ...data.driver, token: data.token }));
      window.dispatchEvent(new Event("authChanged"));
      toast.success(`សូមស្វាគមន៍ ${data.driver.name}!`);
      navigate("/driver/dashboard");
    } catch (err) {
      toast.error(err.message || "Login បរាជ័យ");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim() || !password) {
      toast.error("សូមបំពេញព័ត៌មានឲ្យអស់ ។");
      return;
    }
    if (password.length < 6) {
      toast.error("Password ត្រូវមានយ៉ាងតិច ៦ តួអក្សរ ។");
      return;
    }
    setLoading(true);
    try {
      const data = await driverRegister(name.trim(), email.trim(), phone.trim(), password);
      localStorage.setItem("driverAuth", JSON.stringify({ ...data.driver, token: data.token }));
      toast.success("ចុះឈ្មោះជោគជ័យ! សូមបំពេញព័ត៌មានផ្ទាល់ខ្លួន ។");
      goToStep(STEPS.PROFILE);
    } catch (err) {
      toast.error(err.message || "Register បរាជ័យ");
    } finally {
      setLoading(false);
    }
  };

  // ── Profile Handlers ──

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setProfilePhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!dob || !nationalId.trim() || !address.trim() || !emergencyContact.trim()) {
      toast.error("សូមបំពេញព័ត៌មានសំខាន់ៗឲ្យអស់ ។");
      return;
    }
    setProfileLoading(true);
    try {
      let photoUrl = null;
      if (profilePhoto) {
        photoUrl = await uploadImageToCloudinary(profilePhoto);
      }

      const profileData = {
        date_of_birth: dob,
        national_id: nationalId.trim(),
        address: address.trim(),
        emergency_contact: emergencyContact.trim(),
        profile_completed: true,
      };
      if (photoUrl) profileData.profile_photo = photoUrl;
      if (vehicleInfo.trim()) profileData.vehicle_info = vehicleInfo.trim();
      if (licensePlate.trim()) profileData.license_plate = licensePlate.trim();

      const updated = await updateDriverProfile(profileData);
      // Update localStorage
      const auth = JSON.parse(localStorage.getItem("driverAuth"));
      localStorage.setItem("driverAuth", JSON.stringify({ ...auth, ...updated }));
      toast.success("ព័ត៌មានផ្ទាល់ខ្លួនបានរក្សាទុកជោគជ័យ!");
      goToStep(STEPS.LOCATION);
    } catch (err) {
      toast.error(err.message || "រក្សាទុកព័ត៌មានបរាជ័យ");
    } finally {
      setProfileLoading(false);
    }
  };

  // ── Location Handler ──

  const handleEnableLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Browser មិនដោយ Geolocation ។");
      navigate("/driver/dashboard");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        toast.success("ទីតាំងត្រូវបានបើកជោគជ័យ!");
        navigate("/driver/dashboard");
      },
      (err) => {
        toast.warning("មិនអាចទទួលទីតាំងបាន ប៉ុន្តែអ្នកអាចបន្តប្រើប្រាស់បាន ។");
        navigate("/driver/dashboard");
      },
      { enableHighAccuracy: true }
    );
  };

  // ── Step Indicator ──
  const stepIndex = step === STEPS.AUTH ? 0 : step === STEPS.PROFILE ? 1 : 2;
  const stepLabels = ["ចូលគណនី", "ព័ត៌មានផ្ទាល់ខ្លួន", "ទីតាំង"];

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 py-8">
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="size-16 rounded-2xl bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Bike className="size-8 text-white" />
          </div>
        </div>
        <h1 className="font-serif text-2xl font-bold text-center text-white mb-1">
          Flame & Crust Delivery
        </h1>
        <p className="text-center text-zinc-500 text-sm mb-6">Driver Portal</p>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={cn(
                "size-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                i <= stepIndex
                  ? "bg-gradient-to-br from-red-600 to-amber-600 text-white shadow-lg shadow-orange-500/30"
                  : "bg-zinc-800 text-zinc-500"
              )}>
                {i < stepIndex ? <CheckCircle2 className="size-4" /> : i + 1}
              </div>
              {i < 2 && (
                <div className={cn(
                  "w-8 h-0.5 rounded-full transition-all duration-300",
                  i < stepIndex ? "bg-orange-500" : "bg-zinc-800"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Steps Content */}
        <div className="bg-zinc-900 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            {/* ── STEP 1: Auth ── */}
            {step === STEPS.AUTH && (
              <motion.div
                key="auth"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="p-8"
              >
                {/* Auth Tabs */}
                <div className="flex rounded-2xl bg-zinc-950 p-1 mb-6">
                  {["LOGIN", "REGISTER"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setAuthTab(tab)}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                        authTab === tab
                          ? "bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg"
                          : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      {tab === "LOGIN" ? "ចូលគណនី" : "ចុះឈ្មោះថ្មី"}
                    </button>
                  ))}
                </div>

                {authTab === "LOGIN" ? (
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-zinc-500" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        className="pl-12 h-16 rounded-2xl text-lg bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600"
                      />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-zinc-500" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="pl-12 pr-12 h-16 rounded-2xl text-lg bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                      </button>
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-16 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-orange-600 hover:to-red-700 text-white text-xl font-bold shadow-lg shadow-orange-500/20 transition-all mt-2"
                    >
                      {loading ? <Loader2 className="size-6 animate-spin" /> : (
                        <span className="flex items-center gap-2">ចូលគណនី <ArrowRight className="size-5" /></span>
                      )}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-zinc-500" />
                      <Input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="ឈ្មោះពេញ"
                        className="pl-12 h-14 rounded-2xl text-lg bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600"
                      />
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-zinc-500" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        className="pl-12 h-14 rounded-2xl text-lg bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600"
                      />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-zinc-500" />
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="លេខទូរស័ព្ទ (e.g. 012 345 678)"
                        className="pl-12 h-14 rounded-2xl text-lg bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600"
                      />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-zinc-500" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password (៦ តួអក្សរ+)"
                        className="pl-12 pr-12 h-14 rounded-2xl text-lg bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                      </button>
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-16 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-orange-600 hover:to-red-700 text-white text-xl font-bold shadow-lg shadow-orange-500/20 transition-all mt-2"
                    >
                      {loading ? <Loader2 className="size-6 animate-spin" /> : (
                        <span className="flex items-center gap-2">ចុះឈ្មោះ <ArrowRight className="size-5" /></span>
                      )}
                    </Button>
                  </form>
                )}
              </motion.div>
            )}

            {/* ── STEP 2: Profile ── */}
            {step === STEPS.PROFILE && (
              <motion.div
                key="profile"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="p-8"
              >
                <h2 className="text-lg font-bold text-white mb-1">ព័ត៌មានផ្ទាល់ខ្លួន</h2>
                <p className="text-sm text-zinc-500 mb-6">សូមបំពេញព័ត៌មានសម្រាប់ការដឹកជញ្ជូន</p>

                <form onSubmit={handleProfileSubmit} className="space-y-5">
                  {/* Profile Photo */}
                  <div className="flex justify-center mb-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="relative group"
                    >
                      <div className={cn(
                        "size-24 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden transition-all",
                        profilePhotoPreview ? "border-orange-500" : "border-zinc-700 hover:border-zinc-500"
                      )}>
                        {profilePhotoPreview ? (
                          <img src={profilePhotoPreview} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="size-8 text-zinc-600" />
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 size-8 rounded-full bg-orange-500 flex items-center justify-center shadow-lg">
                        <Upload className="size-4 text-white" />
                      </div>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </div>
                  <p className="text-center text-xs text-zinc-500 mb-2">រូបថតផ្ទាល់ខ្លួន (ជម្រើស)</p>

                  {/* Date of Birth */}
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-zinc-500" />
                    <Input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="pl-12 h-14 rounded-2xl text-lg bg-zinc-950 border-zinc-800 text-white [color-scheme:dark]"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-600 pointer-events-none">ថ្ងៃកំណើត *</span>
                  </div>

                  {/* National ID */}
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-zinc-500" />
                    <Input
                      type="text"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      placeholder="លេខអត្តសញ្ញាណប័ណ្ណ *"
                      className="pl-12 h-14 rounded-2xl text-lg bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600"
                    />
                  </div>

                  {/* Address */}
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-zinc-500" />
                    <Input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="អាសយដ្ឋានផ្ទាល់ខ្លួន *"
                      className="pl-12 h-14 rounded-2xl text-lg bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600"
                    />
                  </div>

                  {/* Emergency Contact */}
                  <div className="relative">
                    <Heart className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-zinc-500" />
                    <Input
                      type="tel"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      placeholder="លេខទូរស័ព្ទបន្ទាន់ *"
                      className="pl-12 h-14 rounded-2xl text-lg bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600"
                    />
                  </div>

                  {/* Vehicle Info */}
                  <div className="relative">
                    <Car className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-zinc-500" />
                    <Input
                      type="text"
                      value={vehicleInfo}
                      onChange={(e) => setVehicleInfo(e.target.value)}
                      placeholder="ព័ត៌មានយានយន្ត (Honda Dream 125...)"
                      className="pl-12 h-14 rounded-2xl text-lg bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600"
                    />
                  </div>

                  {/* License Plate */}
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-zinc-500" />
                    <Input
                      type="text"
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value)}
                      placeholder="ស្លាកលេខយានយន្ត"
                      className="pl-12 h-14 rounded-2xl text-lg bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={profileLoading}
                    className="w-full h-16 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-orange-600 hover:to-red-700 text-white text-xl font-bold shadow-lg shadow-orange-500/20 transition-all mt-4"
                  >
                    {profileLoading ? <Loader2 className="size-6 animate-spin" /> : (
                      <span className="flex items-center gap-2">រក្សាទុក & បន្ត <ArrowRight className="size-5" /></span>
                    )}
                  </Button>
                </form>
              </motion.div>
            )}

            {/* ── STEP 3: Location Permission ── */}
            {step === STEPS.LOCATION && (
              <motion.div
                key="location"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="p-8 text-center"
              >
                <div className="flex justify-center mb-6">
                  <div className="size-20 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center animate-pulse">
                    <Navigation className="size-10 text-blue-400" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">បើកទីតាំង Real-Time</h2>
                <p className="text-sm text-zinc-400 mb-2 leading-relaxed">
                  ប្រព័ន្ធត្រូវការទីតាំងរបស់អ្នកដើម្បីតាមដានការដឹកជញ្ជូន
                  និងបង្ហាញទៅអតិថិជន។
                </p>
                <p className="text-xs text-zinc-600 mb-8">
                  ទីតាំងនឹងត្រូវបាន update រៀងរាល់ ៣០ វិនាទីពេល dashboard បើក។
                </p>

                <Button
                  onClick={handleEnableLocation}
                  className="w-full h-16 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white text-xl font-bold shadow-lg shadow-blue-500/20 transition-all mb-4"
                >
                  <Navigation className="size-6 mr-2" /> បើកទីតាំង & ចូល Dashboard
                </Button>

                <button
                  onClick={() => navigate("/driver/dashboard")}
                  className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  រំលង → ចូល Dashboard ដោយមិនបើកទីតាំង
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-700 mt-6">
          © 2026 Flame & Crust Artisan Kitchen
        </p>
      </motion.div>
    </div>
  );
}
