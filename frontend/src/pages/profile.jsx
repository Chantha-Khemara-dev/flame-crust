import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  MapPin, 
  ShoppingBag, 
  LogOut,
  ChevronRight,
  Clock,
  Plus,
  Trash2,
  RefreshCcw,
  Heart,
  LocateFixed,
  Settings,
  Ticket,
  Lock,
  Phone,
  Mail,
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
  X,
  ShieldCheck,
  Camera,
  Sun,
  Moon,
  Sparkles,
  Flame,
  Star,
  Crown,
  Loader2,
  Pencil,
  Building2,
  Copy,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/food/navbar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageTransition } from "@/components/shared/page-transition";
import { MapPicker } from "@/components/food/map-picker";
import { list, create, update, remove, API_URL } from "@/lib/api";
import { unsubscribeFromPushNotifications } from "@/lib/push-notifications";
import { getImageUrl } from "@/lib/food-api";
import { useCart } from "@/lib/cart-store";
import { useTheme } from "@/components/theme-provider.jsx";
import { PushNotificationButton } from "@/components/common/PushNotificationButton";
import { 
  syncLocalVouchersToDatabase, 
  getWonCoupons, 
  formatWonVouchersAsCoupons,
  deleteWonCoupon,
  clearAllWonCoupons
} from "@/components/food/lucky-draw-modal";
import { toast } from "sonner";
import { cn, formatDate } from "@/lib/utils";

const DEFAULT_COVER_PHOTO = "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=2000&auto=format&fit=crop";

let profileMemoryCache = {
  orders: [],
  addresses: [],
  coupons: [],
  favorites: [],
  allOrderItems: [],
  allProducts: [],
  hasPassword: false,
};

try {
  const saved = localStorage.getItem("flame_profile_cache");
  if (saved) {
    profileMemoryCache = { ...profileMemoryCache, ...JSON.parse(saved) };
  }
} catch (e) {}

export default function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addItem, toggleCart, applyCoupon, openCart } = useCart();
  const { theme, setTheme } = useTheme();

  const [customer, setCustomer] = useState(() => {
    try {
      const auth = localStorage.getItem("customerAuth");
      return auth ? JSON.parse(auth) : null;
    } catch (e) {
      return null;
    }
  });

  const [coverPhoto, setCoverPhoto] = useState(() => {
    try {
      const auth = localStorage.getItem("customerAuth");
      const c = auth ? JSON.parse(auth) : null;
      return c?.cover_photo || DEFAULT_COVER_PHOTO;
    } catch (e) {
      return DEFAULT_COVER_PHOTO;
    }
  });

  const [orders, setOrders] = useState(() => profileMemoryCache.orders || []);
  const [addresses, setAddresses] = useState(() => profileMemoryCache.addresses || []);
  const [favorites, setFavorites] = useState(() => profileMemoryCache.favorites || []);
  const [allProducts, setAllProducts] = useState(() => profileMemoryCache.allProducts || []);
  const [loading, setLoading] = useState(false);
  
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam ? tabParam.toUpperCase() : "MENU");
  
  // Settings & Coupons state
  const [coupons, setCoupons] = useState(() => profileMemoryCache.coupons || []);
  const [couponFilter, setCouponFilter] = useState("ALL");
  const [settingsForm, setSettingsForm] = useState(() => {
    try {
      const auth = localStorage.getItem("customerAuth");
      const c = auth ? JSON.parse(auth) : null;
      return {
        name: c?.name || "",
        email: c?.email || "",
        phone: c?.phone || "",
        avatar: c?.avatar || c?.profile_image || c?.image_url || "",
        password: "",
        confirmPassword: "",
        oldPassword: ""
      };
    } catch (e) {
      return { name: "", email: "", phone: "", avatar: "", password: "", confirmPassword: "", oldPassword: "" };
    }
  });
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  
  // OTP Reset fields in profile
  const [showOTPDialog, setShowOTPDialog] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);

  // Password visibility states
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Address states
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [selectedAddressDetails, setSelectedAddressDetails] = useState(null);
  const [allOrderItems, setAllOrderItems] = useState([]);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [newAddress, setNewAddress] = useState({ label: "", address_line: "", city: "" });
  const [isLocating, setIsLocating] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const handleAutoLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await res.json();
        
        if (data && data.address) {
          const addr = data.address;
          const cityMatch = ["Phnom Penh", "Kandal", "Siem Reap", "Sihanoukville", "Battambang", "Kampong Cham"].find(
            c => addr.city?.includes(c) || addr.state?.includes(c) || addr.province?.includes(c)
          );
          
          if (editingAddress) {
            setEditingAddress(prev => ({
              ...prev,
              city: cityMatch || prev?.city || "Phnom Penh",
              address_line: data.display_name
            }));
          } else {
            setNewAddress(prev => ({
              ...prev,
              city: cityMatch || prev?.city || "Phnom Penh",
              address_line: data.display_name
            }));
          }
          toast.success("Location found via GPS!");
        }
      } catch (err) {
        toast.error("Failed to get location address");
      } finally {
        setIsLocating(false);
      }
    }, () => {
      toast.error("Please allow location permissions");
      setIsLocating(false);
    });
  };

  const loadFavorites = () => {
    try {
      const favs = JSON.parse(localStorage.getItem("customerFavorites") || "[]");
      setFavorites(favs);
    } catch (e) {}
  };

  const fetchProfileData = async (c) => {
    setLoading(true);
    try {
      let userOrders = [];
      let userAddresses = [];
      let activeCoupons = [];
      let isPwdSet = false;

      const params = new URLSearchParams();
      if (c.id) params.set("customerId", String(c.id));
      if (c.phone) params.set("phone", String(c.phone));
      if (c.email) params.set("email", String(c.email));

      // Auto-sync any unsynced local vouchers to real database
      syncLocalVouchersToDatabase(c.id || c.phone || "guest");

      const res = await fetch(`${API_URL}/auth/customer-profile-data?${params.toString()}`).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        userOrders = data.orders || [];
        userAddresses = data.addresses || [];
        activeCoupons = (data.coupons || []).filter(cp => (cp.active == 1 || cp.active === true) && !String(cp.code || "").includes("-"));
        isPwdSet = Boolean(data.hasPassword);
        if (data.customer) {
          const dbCover = data.customer.cover_photo || DEFAULT_COVER_PHOTO;
          setCoverPhoto(dbCover);
          const authStr = localStorage.getItem("customerAuth");
          const parsed = authStr ? JSON.parse(authStr) : {};
          const merged = {
            ...parsed,
            ...data.customer,
            avatar: data.customer.avatar || parsed.avatar,
            cover_photo: data.customer.cover_photo || undefined,
          };
          delete merged.password;
          delete merged.password_hash;
          try {
            localStorage.setItem("customerAuth", JSON.stringify(merged));
          } catch (e) {}
          setCustomer(merged);
          setSettingsForm(prev => ({
            ...prev,
            name: merged.name || prev.name,
            phone: merged.phone || prev.phone,
            email: merged.email || prev.email,
            avatar: merged.avatar || prev.avatar,
          }));
        }
      }

      // If endpoint returned empty or failed, fallback to list() queries
      if (userOrders.length === 0) {
        const [allOrders, allCoupons, allAddresses] = await Promise.all([
          list("orders").catch(() => []),
          list("coupons").catch(() => []),
          list("addresses").catch(() => []),
        ]);
        const matchedOrders = (Array.isArray(allOrders) ? allOrders : (allOrders?.items || allOrders?.content || []))
          .filter(o => String(o.customer_id) === String(c.id) || (c.phone && o.customer_phone === c.phone) || (c.email && o.customer_email === c.email));
        if (matchedOrders.length > 0) userOrders = matchedOrders;
        if (userAddresses.length === 0) {
          userAddresses = (Array.isArray(allAddresses) ? allAddresses : (allAddresses?.items || []))
            .filter(a => String(a.customer_id) === String(c.id));
        }
        if (activeCoupons.length === 0) {
          activeCoupons = (Array.isArray(allCoupons) ? allCoupons : (allCoupons?.items || []))
            .filter(cp => (cp.active == 1 || cp.active === true) && !String(cp.code || "").includes("-"));
        }
      }

      // Merge ONLY this customer's won local vouchers
      try {
        const userKey = `user_${c.id || c.phone || c.email || "guest"}`;
        let localWon = getWonCoupons(userKey);
        if (!localWon || localWon.length === 0) {
          localWon = getWonCoupons(c.id || c.phone || "guest");
        }
        const formattedWon = formatWonVouchersAsCoupons(localWon);
        const existingCodes = new Set(activeCoupons.map((cp) => (cp.code || "").toUpperCase()));
        for (const fw of formattedWon) {
          if (fw.code && !existingCodes.has(fw.code.toUpperCase())) {
            activeCoupons.unshift({
              ...fw,
              accountKey: userKey,
            });
            existingCodes.add(fw.code.toUpperCase());
          }
        }
      } catch (e) {}

      setOrders(userOrders);
      setAddresses(userAddresses);
      setCoupons(activeCoupons);
      setHasPassword(isPwdSet);

      try {
        const fetchedItems = await list("order_items").catch(() => []);
        const itemsArr = Array.isArray(fetchedItems) ? fetchedItems : (fetchedItems?.items || fetchedItems?.content || []);
        if (itemsArr.length > 0) setAllOrderItems(itemsArr);
      } catch (e) {}

      profileMemoryCache = {
        ...profileMemoryCache,
        orders: userOrders,
        addresses: userAddresses,
        coupons: activeCoupons,
        hasPassword: isPwdSet,
      };
      try {
        localStorage.setItem("flame_profile_cache", JSON.stringify(profileMemoryCache));
      } catch (e) {}
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const auth = localStorage.getItem("customerAuth");
    const adminAuth = localStorage.getItem("adminAuth");
    if (!auth) {
      if (adminAuth) {
        try {
          const a = JSON.parse(adminAuth);
          if ((a.role || "").toUpperCase() === "ADMIN") {
            navigate("/admin/dashboard");
            return;
          }
        } catch (e) {}
      }
      navigate("/login");
      return;
    }
    const c = JSON.parse(auth);
    setCustomer(c);
    if (c.cover_photo) {
      setCoverPhoto(c.cover_photo);
    }
    setSettingsForm({ name: c.name || "", email: c.email || "", phone: c.phone || "", avatar: c.avatar || c.profile_image || c.image_url || "", password: "", confirmPassword: "", oldPassword: "" });
    fetchProfileData(c);
    loadFavorites();

    const handleFavChange = () => loadFavorites();
    const handleCouponsChange = () => {
      const freshAuth = localStorage.getItem("customerAuth");
      if (freshAuth) {
        try {
          fetchProfileData(JSON.parse(freshAuth));
        } catch (e) {}
      }
    };

    window.addEventListener("favoritesChanged", handleFavChange);
    window.addEventListener("flame_coupons_updated", handleCouponsChange);
    window.addEventListener("couponsChanged", handleCouponsChange);
    return () => {
      window.removeEventListener("favoritesChanged", handleFavChange);
      window.removeEventListener("flame_coupons_updated", handleCouponsChange);
      window.removeEventListener("couponsChanged", handleCouponsChange);
    };
  }, [navigate]);

  useEffect(() => {
    if (selectedOrderDetails) {
      const orderIdStr = String(selectedOrderDetails.id);
      const hasEmbedded = selectedOrderDetails.items && Array.isArray(selectedOrderDetails.items) && selectedOrderDetails.items.length > 0;
      const hasFiltered = allOrderItems.some(item => String(item.order_id || item.orderId) === orderIdStr);
      if (!hasEmbedded && !hasFiltered) {
        list("order_items").then(items => {
          const itemsArr = Array.isArray(items) ? items : (items?.items || items?.content || []);
          if (itemsArr.length > 0) setAllOrderItems(itemsArr);
        }).catch(() => {});
      }
    }
  }, [selectedOrderDetails]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
      setActiveTab(tabParam.toUpperCase());
    } else {
      setActiveTab("MENU");
    }
  }, [location.search]);

  const handleNavigateToTab = (newTab) => {
    setActiveTab(newTab);
    if (newTab === "MENU") {
      navigate("/profile");
    } else {
      navigate(`/profile?tab=${newTab.toLowerCase()}`);
    }
  };

  // Cover photo upload handler - Uploads to Cloudinary and saves to Backend DB
  const handleCoverFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    try {
      const { uploadImageToCloudinary } = await import("@/lib/cloudinary");
      const uploadedUrl = await uploadImageToCloudinary(file);
      setCoverPhoto(uploadedUrl);

      // Persist cover photo to backend database immediately
      if (customer) {
        try {
          const res = await fetch(`${API_URL}/auth/customer-update-profile`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: customer.id,
              email: customer.email,
              phone: customer.phone,
              cover_photo: uploadedUrl
            }),
          });
          if (res.ok) {
            const dbData = await res.json();
            const updatedCustomer = { ...customer, ...dbData, cover_photo: uploadedUrl };
            delete updatedCustomer.password;
            localStorage.setItem("customerAuth", JSON.stringify(updatedCustomer));
            setCustomer(updatedCustomer);
            window.dispatchEvent(new Event("authChanged"));
          } else {
            const updatedCustomer = { ...customer, cover_photo: uploadedUrl };
            localStorage.setItem("customerAuth", JSON.stringify(updatedCustomer));
            setCustomer(updatedCustomer);
            window.dispatchEvent(new Event("authChanged"));
          }
        } catch (e) {
          console.warn("Could not sync cover photo to backend:", e);
          const updatedCustomer = { ...customer, cover_photo: uploadedUrl };
          localStorage.setItem("customerAuth", JSON.stringify(updatedCustomer));
          setCustomer(updatedCustomer);
          window.dispatchEvent(new Event("authChanged"));
        }
      }

      toast.success("Cover photo updated and saved!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload cover photo. Please try again.");
    } finally {
      setIsUploadingCover(false);
    }
  };

  // Avatar upload handler
  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const { uploadImageToCloudinary } = await import("@/lib/cloudinary");
      const uploadedUrl = await uploadImageToCloudinary(file);
      setSettingsForm((prev) => ({ ...prev, avatar: uploadedUrl }));
      
      if (customer) {
        try {
          const res = await fetch(`${API_URL}/auth/customer-update-profile`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: customer.id,
              email: customer.email,
              phone: settingsForm.phone || customer.phone,
              name: settingsForm.name || customer.name,
              avatar: uploadedUrl
            }),
          });
          if (res.ok) {
            const dbData = await res.json();
            const updatedCustomer = { ...customer, ...dbData, avatar: uploadedUrl };
            delete updatedCustomer.password;
            localStorage.setItem("customerAuth", JSON.stringify(updatedCustomer));
            setCustomer(updatedCustomer);
            window.dispatchEvent(new Event("authChanged"));
          } else {
            const updatedCustomer = { ...customer, avatar: uploadedUrl };
            delete updatedCustomer.password;
            localStorage.setItem("customerAuth", JSON.stringify(updatedCustomer));
            setCustomer(updatedCustomer);
            window.dispatchEvent(new Event("authChanged"));
          }
        } catch (e) {
          console.warn("Could not sync avatar to backend:", e);
          const updatedCustomer = { ...customer, avatar: uploadedUrl };
          delete updatedCustomer.password;
          localStorage.setItem("customerAuth", JSON.stringify(updatedCustomer));
          setCustomer(updatedCustomer);
          window.dispatchEvent(new Event("authChanged"));
        }
      }
      toast.success("Profile picture updated and saved!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Send OTP for Forgot Password inside Profile Settings
  const handleSendForgotOTP = async () => {
    if (!settingsForm.email) {
      toast.error("Email is required to send OTP.");
      return;
    }
    setIsSendingOTP(true);
    try {
      const response = await fetch(`${API_URL}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: settingsForm.email }),
      });
      if (!response.ok) {
        throw new Error("Failed to send OTP");
      }
      const data = await response.json().catch(() => ({}));
      if (data.emailSent === false && data.devOtp) {
        toast.warning("Email delivery unavailable. Your verification code is: " + data.devOtp, { duration: 10000 });
        setOtpCode(data.devOtp);
      } else {
        toast.success("OTP sent to your email!");
        if (data.devOtp) {
          toast.info("Code: " + data.devOtp, { duration: 8000 });
          setOtpCode(data.devOtp);
        }
      }
      setShowOTPDialog(true);
    } catch (err) {
      toast.error(err.message || "Failed to send OTP.");
    } finally {
      setIsSendingOTP(false);
    }
  };

  // Verify OTP for Forgot Password inside Profile Settings
  const handleVerifyForgotOTP = async () => {
    if (otpCode.length < 6) {
      toast.error("Please enter a 6-digit OTP.");
      return;
    }
    setIsVerifyingOTP(true);
    try {
      const response = await fetch(`${API_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: settingsForm.email, otp: otpCode }),
      });
      if (!response.ok) {
        throw new Error("Invalid or expired OTP");
      }
      toast.success("OTP verified! You can now create your new password without typing the current one.");
      setHasPassword(false);
      setShowOTPDialog(false);
      setOtpCode("");
    } catch (err) {
      toast.error(err.message || "Verification failed.");
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUpdatingSettings(true);
    try {
      const response = await fetch(`${API_URL}/auth/customer-update-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: customer?.id,
          email: customer?.email,
          phone: settingsForm.phone,
          name: settingsForm.name,
          avatar: settingsForm.avatar,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile information");
      }
      
      const updatedCustomer = { 
        ...customer,
        ...data,
        name: settingsForm.name, 
        phone: settingsForm.phone,
        avatar: settingsForm.avatar
      };
      delete updatedCustomer.password;
      localStorage.setItem("customerAuth", JSON.stringify(updatedCustomer));
      setCustomer(updatedCustomer);
      window.dispatchEvent(new Event("authChanged"));
      toast.success("Profile information updated successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to update profile information");
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleUpdateSecurity = async (e) => {
    e.preventDefault();
    if (!settingsForm.password) {
      toast.error("Please enter a new password.");
      return;
    }
    
    if (settingsForm.password !== settingsForm.confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }

    if (hasPassword && !settingsForm.oldPassword) {
      toast.error("Please enter your current password to confirm changes.");
      return;
    }

    setIsUpdatingSettings(true);

    try {
      const response = await fetch(`${API_URL}/auth/customer-change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: customer.email,
          oldPassword: settingsForm.oldPassword,
          newPassword: settingsForm.password,
        }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update password");
      }
      
      const updatedCustomer = { ...customer };
      delete updatedCustomer.password;
      localStorage.setItem("customerAuth", JSON.stringify(updatedCustomer));
      setCustomer(updatedCustomer);
      window.dispatchEvent(new Event("authChanged"));
      setSettingsForm(prev => ({ ...prev, password: "", confirmPassword: "", oldPassword: "" }));
      setHasPassword(true);
      toast.success("Password updated successfully! ពាក្យសម្ងាត់ត្រូវបានរក្សាទុកជោគជ័យ");
    } catch (err) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleCreateAddress = async (e) => {
    e.preventDefault();
    try {
      await create("addresses", {
        customer_id: customer.id,
        ...newAddress,
        is_default: addresses.length === 0
      });
      setShowAddForm(false);
      setNewAddress({ label: "", address_line: "", city: "" });
      fetchProfileData(customer);
      toast.success("New address saved!");
    } catch (err) {
      toast.error("Failed to add address");
    }
  };

  const handleUpdateAddress = async (e) => {
    e.preventDefault();
    if (!editingAddress) return;
    try {
      await update("addresses", editingAddress.id, editingAddress);
      setAddresses(prev => prev.map(a => a.id === editingAddress.id ? editingAddress : a));
      setEditingAddress(null);
      toast.success("Address updated successfully!");
    } catch (err) {
      toast.error("Failed to update address");
    }
  };

  const handleDeleteAddress = async (addressId) => {
    try {
      await remove("addresses", addressId);
      setAddresses(prev => prev.filter(a => a.id !== addressId));
      if (selectedAddressDetails?.id === addressId) setSelectedAddressDetails(null);
      toast.success("Address removed!");
    } catch (err) {
      toast.error("Failed to delete address");
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    try {
      await Promise.all(
        addresses.map(a => 
          update("addresses", a.id, { ...a, is_default: a.id === addressId })
        )
      );
      setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === addressId })));
      toast.success("Default delivery address updated!");
    } catch (err) {
      toast.error("Failed to set default address");
    }
  };

  const handleLogout = async () => {
    try {
      await unsubscribeFromPushNotifications();
    } catch (e) {
      console.error("Failed to unsubscribe push:", e);
    }
    localStorage.removeItem("customerAuth");
    localStorage.removeItem("adminAuth");
    localStorage.removeItem("driverAuth");
    localStorage.removeItem("kitchenAuth");
    localStorage.removeItem("flame_customer_cover");
    try {
      useCart.getState().clearCoupon();
    } catch (e) {}
    window.dispatchEvent(new Event("authChanged"));
    navigate("/");
  };

  const handleReorder = async (orderId) => {
    try {
      const allItems = await list("order_items");
      const orderItems = allItems.filter(item => String(item.order_id) === String(orderId));
      
      if (orderItems.length === 0) {
        toast.error("Could not find items for this order.");
        return;
      }
      
      orderItems.forEach(item => {
        let optionsObj = null;
        try { if (item.options) optionsObj = JSON.parse(item.options); } catch (e) {}
        
        const optionString = optionsObj && Object.keys(optionsObj).length > 0 
          ? Object.values(optionsObj).join('-') 
          : '';

        addItem({
          id: optionString ? `${item.product_id}-${optionString}` : item.product_id,
          originalId: item.product_id,
          name: item.product_name,
          price: item.unit_price,
          qty: item.quantity,
          image: DEFAULT_COVER_PHOTO,
          selectedOptions: item.options ? JSON.parse(item.options) : null
        });
      });
      
      toast.success("Items added to cart!");
      toggleCart();
    } catch (err) {
      toast.error("Failed to reorder items.");
    }
  };

  if (!customer) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1" />
      </div>
    );
  }

  const isAdmin = Boolean(
    localStorage.getItem("adminAuth") ||
    (customer && ["ADMIN", "MANAGER", "STAFF"].includes((customer.role || "").toUpperCase()))
  );

  const getMemberTier = () => {
    if (orders.length >= 30) {
      return { label: "VIP Member", icon: Flame, color: "text-red-200", bg: "bg-red-500/30 border-red-400/40" };
    }
    if (orders.length >= 15) {
      return { label: "Gold Member", icon: Crown, color: "text-amber-200", bg: "bg-amber-500/30 border-amber-400/40" };
    }
    if (orders.length >= 5) {
      return { label: "Silver Member", icon: Star, color: "text-slate-100", bg: "bg-slate-400/30 border-slate-300/40" };
    }
    return { label: "Member", icon: User, color: "text-white", bg: "bg-white/20 border-white/30" };
  };

  const memberTier = getMemberTier();
  const TierIcon = memberTier.icon;

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
      <Navbar />
      <main className="flex-1 pt-[calc(4.75rem+env(safe-area-inset-top,0px))] sm:pt-20 lg:pt-22 pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] sm:pb-20">
        <PageTransition>
          <div className={cn(
            "mx-auto px-3 sm:px-6 lg:px-8 space-y-3.5 sm:space-y-5 transition-all",
            activeTab === "MENU" ? "max-w-5xl" : "max-w-4xl"
          )}>
            
            {activeTab === "MENU" ? (
              /* ========================================================================= */
              /* 1. MAIN PROFILE HUB VIEW (COMPACT MOBILE COVER + AVATAR + 2-COL CARDS)    */
              /* ========================================================================= */
              <div className="space-y-3.5 sm:space-y-5">
                
                {/* Clean Facebook-Style Profile Header Card with Avatar & Name ON Cover */}
                <div className="bg-card border border-border/70 rounded-2xl sm:rounded-[28px] overflow-hidden shadow-warm transition-all duration-300">
                  
                  {/* Pizza Cover Photo Banner */}
                  <div className="relative w-full h-40 sm:h-52 md:h-60 lg:h-64 bg-muted overflow-hidden group">
                    <img 
                      src={coverPhoto} 
                      alt="Profile Cover" 
                      className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-700 ease-out" 
                    />
                    
                    {/* Dark Gradient Overlay for Maximum Text Contrast */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/20 pointer-events-none" />

                    {/* Floating "Edit Cover Photo" Pill Button */}
                    <label 
                      className="absolute top-3 right-3 sm:top-4 sm:right-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md bg-black/60 hover:bg-black/80 text-white border border-white/25 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer z-20"
                      title="Change Cover Photo"
                    >
                      {isUploadingCover ? (
                        <Loader2 className="size-3.5 animate-spin text-primary" />
                      ) : (
                        <Camera className="size-3.5" />
                      )}
                      <span>{isUploadingCover ? "Uploading..." : "Edit Cover"}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleCoverFileChange} 
                        disabled={isUploadingCover}
                      />
                    </label>

                    {/* AVATAR + NAME + BADGES ON THE BOTTOM-LEFT OF COVER */}
                    <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-5 right-3 sm:right-5 flex items-center justify-between gap-3 z-10">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        
                        {/* Circular Avatar */}
                        <div className="relative shrink-0 group">
                          <div className="size-16 sm:size-22 md:size-24 rounded-full p-0.5 sm:p-1 bg-white/40 backdrop-blur-xs shadow-xl ring-2 sm:ring-3 ring-white">
                            <div className="size-full rounded-full overflow-hidden bg-background relative flex items-center justify-center">
                              {customer.avatar ? (
                                <img 
                                  src={customer.avatar} 
                                  alt="Profile Avatar" 
                                  className="w-full h-full object-cover" 
                                  referrerPolicy="no-referrer" 
                                />
                              ) : (
                                <User className="size-8 sm:size-11 text-primary" />
                              )}
                              {isUploadingAvatar && (
                                <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center text-white backdrop-blur-xs">
                                  <Loader2 className="size-4 animate-spin text-primary" />
                                  <span className="text-[8px] mt-0.5 font-semibold">...</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Camera Button on Avatar */}
                          <label 
                            className="absolute bottom-0 right-0 size-5.5 sm:size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md border-2 border-white hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                            title="Change Profile Avatar"
                          >
                            <Camera className="size-2.5 sm:size-3.5" />
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleAvatarFileChange} 
                              disabled={isUploadingAvatar}
                            />
                          </label>
                        </div>

                        {/* Name, Phone, and Badges next to Avatar on Cover */}
                        <div className="min-w-0 text-left space-y-0.5 sm:space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h1 className="font-serif text-base sm:text-xl md:text-2xl font-bold text-white tracking-tight drop-shadow-md truncate">
                              {customer.name || "Flame Foodie"}
                            </h1>
                            <Sparkles className="size-3.5 sm:size-4 fill-amber-400 text-amber-400 shrink-0" />
                          </div>

                          <p className="text-[11px] sm:text-xs font-medium text-white/90 drop-shadow-xs truncate">
                            {customer.phone || customer.email}
                          </p>

                          {/* Badges on Cover (High Contrast & Glassmorphism) */}
                          <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                            {/* Member Tier Badge */}
                            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold border backdrop-blur-md shadow-2xs", memberTier.bg, memberTier.color)}>
                              <TierIcon className="size-2.5 sm:size-3" />
                              <span>{memberTier.label}</span>
                            </span>

                            {/* Verified Badge */}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 backdrop-blur-md shadow-2xs">
                              <Check className="size-2.5 sm:size-3" /> Verified
                            </span>

                            {/* Admin Badge */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => navigate("/admin/dashboard")}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-amber-500/30 text-amber-200 border border-amber-400/40 hover:bg-amber-500/40 transition-colors cursor-pointer shadow-2xs backdrop-blur-md"
                              >
                                <ShieldCheck className="size-2.5 sm:size-3" />
                                Admin →
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4 Quick Stat Tiles Row below Cover */}
                  <div className="p-2.5 sm:p-4">
                    <div className="grid grid-cols-4 gap-2 sm:gap-3">
                      
                      {/* Stat: Orders */}
                      <button
                        type="button"
                        onClick={() => handleNavigateToTab("ORDERS")}
                        className="flex flex-col items-center justify-center py-2 px-1 sm:py-2.5 rounded-xl sm:rounded-2xl bg-secondary/40 hover:bg-secondary border border-border/50 hover:border-primary/40 text-foreground transition-all duration-200 cursor-pointer active:scale-95 shadow-2xs group"
                        title="View Orders"
                      >
                        <span className="font-serif text-sm sm:text-xl font-bold group-hover:text-primary transition-colors leading-tight">
                          {orders.length}
                        </span>
                        <span className="text-[10px] sm:text-xs font-medium text-muted-foreground mt-0.5">Orders</span>
                      </button>

                      {/* Stat: Coupons */}
                      <button
                        type="button"
                        onClick={() => handleNavigateToTab("COUPONS")}
                        className="flex flex-col items-center justify-center py-2 px-1 sm:py-2.5 rounded-xl sm:rounded-2xl bg-secondary/40 hover:bg-secondary border border-border/50 hover:border-emerald-500/40 text-foreground transition-all duration-200 cursor-pointer active:scale-95 shadow-2xs group"
                        title="View Coupons"
                      >
                        <span className="font-serif text-sm sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 leading-tight">
                          {coupons.length}
                        </span>
                        <span className="text-[10px] sm:text-xs font-medium text-muted-foreground mt-0.5">Coupons</span>
                      </button>

                      {/* Stat: Favorites */}
                      <button
                        type="button"
                        onClick={() => handleNavigateToTab("FAVORITES")}
                        className="flex flex-col items-center justify-center py-2 px-1 sm:py-2.5 rounded-xl sm:rounded-2xl bg-secondary/40 hover:bg-secondary border border-border/50 hover:border-rose-500/40 text-foreground transition-all duration-200 cursor-pointer active:scale-95 shadow-2xs group"
                        title="View Favorites"
                      >
                        <span className="font-serif text-sm sm:text-xl font-bold text-rose-500 leading-tight">
                          {favorites.length}
                        </span>
                        <span className="text-[10px] sm:text-xs font-medium text-muted-foreground mt-0.5">Favorites</span>
                      </button>

                      {/* Stat: Saved Addresses */}
                      <button
                        type="button"
                        onClick={() => handleNavigateToTab("ADDRESSES")}
                        className="flex flex-col items-center justify-center py-2 px-1 sm:py-2.5 rounded-xl sm:rounded-2xl bg-secondary/40 hover:bg-secondary border border-border/50 hover:border-sky-500/40 text-foreground transition-all duration-200 cursor-pointer active:scale-95 shadow-2xs group"
                        title="View Saved Addresses"
                      >
                        <span className="font-serif text-sm sm:text-xl font-bold text-sky-500 leading-tight">
                          {addresses.length}
                        </span>
                        <span className="text-[10px] sm:text-xs font-medium text-muted-foreground mt-0.5">Saved</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Balanced 2-Column Menu Card Grid */}
                <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 items-start">
                  
                  {/* COLUMN 1: Activities & Orders */}
                  <div className="rounded-2xl sm:rounded-[24px] bg-card border border-border/70 p-2.5 sm:p-4 shadow-warm space-y-1 sm:space-y-1.5 h-fit">
                    <p className="px-2.5 pt-0.5 pb-0.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <ShoppingBag className="size-3.5 text-primary" /> Activities &amp; Orders
                    </p>

                    {/* Order History Item */}
                    <button 
                      type="button"
                      className="w-full flex items-center justify-between p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl text-sm font-medium transition-all cursor-pointer hover:bg-secondary/60 text-foreground border border-transparent hover:border-border/60 group"
                      onClick={() => handleNavigateToTab("ORDERS")}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                        <div className="size-9 sm:size-11 rounded-xl sm:rounded-2xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                          <ShoppingBag className="size-4 sm:size-5" />
                        </div>
                        <div className="text-left min-w-0">
                          <span className="font-semibold text-foreground text-xs sm:text-sm block truncate">Order History</span>
                          <span className="text-[10px] sm:text-xs text-muted-foreground">Track and re-order meals</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {orders.length > 0 && (
                          <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                            {orders.length}
                          </span>
                        )}
                        <ChevronRight className="size-4 text-muted-foreground/60 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>

                    {/* My Coupons Item */}
                    <button 
                      type="button"
                      className="w-full flex items-center justify-between p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl text-sm font-medium transition-all cursor-pointer hover:bg-secondary/60 text-foreground border border-transparent hover:border-border/60 group"
                      onClick={() => handleNavigateToTab("COUPONS")}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                        <div className="size-9 sm:size-11 rounded-xl sm:rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                          <Ticket className="size-4 sm:size-5" />
                        </div>
                        <div className="text-left min-w-0">
                          <span className="font-semibold text-foreground text-xs sm:text-sm block truncate">My Coupons &amp; Rewards</span>
                          <span className="text-[10px] sm:text-xs text-muted-foreground">Save on your pizza orders</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {coupons.length > 0 && (
                          <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            {coupons.length}
                          </span>
                        )}
                        <ChevronRight className="size-4 text-muted-foreground/60 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>

                    {/* Favorite Pizzas Item */}
                    <button 
                      type="button"
                      className="w-full flex items-center justify-between p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl text-sm font-medium transition-all cursor-pointer hover:bg-secondary/60 text-foreground border border-transparent hover:border-border/60 group"
                      onClick={() => handleNavigateToTab("FAVORITES")}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                        <div className="size-9 sm:size-11 rounded-xl sm:rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                          <Heart className="size-4 sm:size-5" />
                        </div>
                        <div className="text-left min-w-0">
                          <span className="font-semibold text-foreground text-xs sm:text-sm block truncate">Favorite Pizzas</span>
                          <span className="text-[10px] sm:text-xs text-muted-foreground">Your most loved dishes</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {favorites.length > 0 && (
                          <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500">
                            {favorites.length}
                          </span>
                        )}
                        <ChevronRight className="size-4 text-muted-foreground/60 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  </div>

                  {/* COLUMN 2: Account & Details + Preferences */}
                  <div className="space-y-3 sm:space-y-4">
                    
                    {/* Account & Details Card */}
                    <div className="rounded-2xl sm:rounded-[24px] bg-card border border-border/70 p-2.5 sm:p-4 shadow-warm space-y-1 sm:space-y-1.5">
                      <p className="px-2.5 pt-0.5 pb-0.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <User className="size-3.5 text-primary" /> Account &amp; Details
                      </p>

                      {/* Profile Settings */}
                      <button 
                        type="button"
                        className="w-full flex items-center justify-between p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl text-sm font-medium transition-all cursor-pointer hover:bg-secondary/60 text-foreground border border-transparent hover:border-border/60 group"
                        onClick={() => handleNavigateToTab("SETTINGS")}
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                          <div className="size-9 sm:size-11 rounded-xl sm:rounded-2xl bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                            <Settings className="size-4 sm:size-5" />
                          </div>
                          <div className="text-left min-w-0">
                            <span className="font-semibold text-foreground text-xs sm:text-sm block truncate">Profile Settings</span>
                            <span className="text-[10px] sm:text-xs text-muted-foreground">Name, phone, avatar &amp; password</span>
                          </div>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground/60 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </button>

                      {/* Saved Addresses */}
                      <button 
                        type="button"
                        className="w-full flex items-center justify-between p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl text-sm font-medium transition-all cursor-pointer hover:bg-secondary/60 text-foreground border border-transparent hover:border-border/60 group"
                        onClick={() => handleNavigateToTab("ADDRESSES")}
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                          <div className="size-9 sm:size-11 rounded-xl sm:rounded-2xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                            <MapPin className="size-4 sm:size-5" />
                          </div>
                          <div className="text-left min-w-0">
                            <span className="font-semibold text-foreground text-xs sm:text-sm block truncate">Saved Addresses</span>
                            <span className="text-[10px] sm:text-xs text-muted-foreground">Delivery drop-off locations</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          {addresses.length > 0 && (
                            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                              {addresses.length} saved
                            </span>
                          )}
                          <ChevronRight className="size-4 text-muted-foreground/60 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </button>
                    </div>

                    {/* Preferences Card */}
                    <div className="rounded-2xl sm:rounded-[24px] bg-card border border-border/70 p-2.5 sm:p-4 shadow-warm space-y-1 sm:space-y-1.5">
                      <p className="px-2.5 pt-0.5 pb-0.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-primary" /> Preferences
                      </p>

                      {/* Theme Switcher */}
                      <div className="w-full flex items-center justify-between p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl text-sm">
                        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                          <div className="size-9 sm:size-11 rounded-xl sm:rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
                            {theme === "dark" ? <Moon className="size-4 sm:size-5" /> : <Sun className="size-4 sm:size-5" />}
                          </div>
                          <div className="text-left min-w-0">
                            <span className="font-semibold text-foreground text-xs sm:text-sm block">Appearance</span>
                            <span className="text-[10px] sm:text-xs text-muted-foreground">{theme === "dark" ? "Dark Mode" : "Light Mode"}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                          className="h-7 sm:h-8 px-2.5 sm:px-3.5 rounded-full bg-secondary hover:bg-secondary/80 border border-border/60 text-[10px] sm:text-xs font-semibold text-foreground flex items-center gap-1 sm:gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
                        >
                          {theme === "dark" ? <Moon className="size-3 sm:size-3.5" /> : <Sun className="size-3 sm:size-3.5" />}
                          <span>{theme === "dark" ? "Dark" : "Light"}</span>
                        </button>
                      </div>

                      {/* Push Notifications Settings */}
                      <div className="flex items-center justify-between p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl text-sm font-medium transition-all group">
                        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                          <div className="size-9 sm:size-11 rounded-xl sm:rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                            <Flame className="size-4 sm:size-5" />
                          </div>
                          <div className="text-left min-w-0">
                            <span className="font-semibold text-foreground text-xs sm:text-sm block">Push Notifications</span>
                            <span className="text-[10px] sm:text-xs text-muted-foreground">Order updates & driver chat alerts</span>
                          </div>
                        </div>
                        <PushNotificationButton userType="CUSTOMER" userId={customer.id} className="scale-90 origin-right" />
                      </div>

                      {/* Sign Out */}
                      <button 
                        type="button"
                        className="w-full flex items-center justify-between p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl text-sm font-medium transition-all cursor-pointer hover:bg-destructive/10 text-destructive border border-transparent hover:border-destructive/20 group"
                        onClick={handleLogout}
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                          <div className="size-9 sm:size-11 rounded-xl sm:rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                            <LogOut className="size-4 sm:size-5" />
                          </div>
                          <div className="text-left min-w-0">
                            <span className="font-semibold text-destructive text-xs sm:text-sm block">Sign Out</span>
                            <span className="text-[10px] sm:text-xs text-destructive/70">Log out from this device</span>
                          </div>
                        </div>
                        <ChevronRight className="size-4 text-destructive/40 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ========================================================================= */
              /* 2. DEDICATED SUB-PAGE VIEWS WITH CLEAN INLINE BACK BUTTON HEADER          */
              /* ========================================================================= */
              <div className="space-y-4 sm:space-y-6 animate-fade-in">
                
                {/* Unified Sub-Page Header with Inline Back Arrow */}
                <div className="flex items-center gap-3 pb-1">
                  <button 
                    type="button"
                    onClick={() => handleNavigateToTab("MENU")} 
                    className="size-9 sm:size-10 rounded-full bg-secondary hover:bg-secondary/80 border border-border/70 flex items-center justify-center text-foreground transition-all active:scale-95 cursor-pointer shadow-2xs shrink-0"
                    title="Back to Profile"
                  >
                    <ArrowLeft className="size-4 sm:size-4.5" />
                  </button>
                  <div className="min-w-0">
                    <h2 className="font-serif text-lg sm:text-2xl font-bold text-foreground truncate">
                      {activeTab === "SETTINGS" && "Profile Settings"}
                      {activeTab === "ORDERS" && "Recent Orders"}
                      {activeTab === "ADDRESSES" && "Saved Addresses"}
                      {activeTab === "FAVORITES" && "Favorite Pizzas"}
                      {activeTab === "COUPONS" && "My Coupons & Rewards"}
                    </h2>
                    <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                      {activeTab === "SETTINGS" && "Manage credentials, avatar & personal details"}
                      {activeTab === "ORDERS" && "Track deliveries & view receipt history"}
                      {activeTab === "ADDRESSES" && "Manage delivery locations & fast checkout pins"}
                      {activeTab === "FAVORITES" && "Your favorite pizzas and quick re-orders"}
                      {activeTab === "COUPONS" && "Discounts and special reward vouchers"}
                    </p>
                  </div>
                </div>

                {/* ---------------- SETTINGS TAB ---------------- */}
                {activeTab === "SETTINGS" && (
                  <div className="space-y-4 sm:space-y-6">
                    
                    {/* Card 1: Profile Information */}
                    <div className="bg-card border border-border/70 rounded-2xl sm:rounded-[24px] p-4 sm:p-7 shadow-warm">
                      <form onSubmit={handleUpdateProfile} className="space-y-4 sm:space-y-6">
                        {/* Circular Avatar Upload */}
                        <div className="flex flex-col items-center justify-center text-center pb-4 sm:pb-6 border-b border-border/60">
                          <div className="relative size-20 sm:size-28 group mb-2.5">
                            <div className="size-full rounded-full ring-3 sm:ring-4 ring-primary/30 p-0.5 sm:p-1 bg-background shadow-lg overflow-hidden">
                              <div className="size-full rounded-full overflow-hidden bg-primary/10 flex items-center justify-center relative">
                                {settingsForm.avatar ? (
                                  <img src={settingsForm.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                  <User className="size-9 sm:size-14 text-primary" />
                                )}
                                {isUploadingAvatar && (
                                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
                                    <Loader2 className="size-5 sm:size-6 animate-spin text-primary" />
                                    <span className="text-[9px] mt-0.5 font-semibold">...</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <label className="absolute bottom-0 right-0 size-7 sm:size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md border-2 border-background hover:scale-110 active:scale-95 transition-all cursor-pointer">
                              <Camera className="size-3.5 sm:size-4" />
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handleAvatarFileChange} 
                                disabled={isUploadingAvatar}
                              />
                            </label>
                          </div>
                          <label className="text-[11px] sm:text-xs font-semibold text-primary hover:underline cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                            <Camera className="size-3 sm:size-3.5" /> Tap to change profile photo
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleAvatarFileChange} 
                              disabled={isUploadingAvatar}
                            />
                          </label>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                          <div className="space-y-1.5">
                            <label className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                              <User className="size-3.5 sm:size-4 text-primary" /> Full Name
                            </label>
                            <Input 
                              required 
                              value={settingsForm.name} 
                              onChange={e => setSettingsForm(prev => ({...prev, name: e.target.value}))} 
                              className="rounded-xl border-border/70 bg-background/50 h-11 sm:h-12 text-sm font-medium focus-visible:ring-primary/30" 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                              <Phone className="size-3.5 sm:size-4 text-primary" /> Phone Number
                            </label>
                            <Input 
                              required 
                              value={settingsForm.phone} 
                              onChange={e => setSettingsForm(prev => ({...prev, phone: e.target.value}))} 
                              className="rounded-xl border-border/70 bg-background/50 h-11 sm:h-12 text-sm font-medium focus-visible:ring-primary/30" 
                            />
                          </div>
                          <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                              <Mail className="size-3.5 sm:size-4 text-primary" /> Email Address <span className="text-[10px] sm:text-xs text-muted-foreground font-normal">(Locked)</span>
                            </label>
                            <Input 
                              type="email" 
                              value={settingsForm.email} 
                              readOnly
                              disabled
                              autoComplete="off"
                              className="rounded-xl border-border/60 bg-secondary/80 h-11 sm:h-12 cursor-not-allowed opacity-80 text-sm" 
                            />
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
                          <Button 
                            type="submit" 
                            className="w-full sm:w-auto rounded-full px-8 py-2.5 font-semibold text-sm shadow-warm hover:shadow-warm-lg"
                            disabled={isUpdatingSettings}
                          >
                            {isUpdatingSettings ? "Saving..." : "Save Profile Info"}
                          </Button>
                        </div>
                      </form>
                    </div>

                    {/* Card 2: Security & Password Update */}
                    <div className="bg-card border border-border/70 rounded-2xl sm:rounded-[24px] p-4 sm:p-7 shadow-warm">
                      <h3 className="font-serif text-xl sm:text-2xl font-bold text-foreground mb-1">Security</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
                        Update your login password. Leaving these fields blank keeps your current password unchanged.
                      </p>
                      <form onSubmit={handleUpdateSecurity} className="space-y-4 sm:space-y-6" autoComplete="off">
                        <div className="space-y-3 sm:space-y-4 max-w-md animate-fade-in">
                          {hasPassword && (
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center">
                                <label className="text-xs sm:text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                                  <Lock className="size-3.5 sm:size-4" /> Current Password
                                </label>
                                <button
                                  type="button"
                                  onClick={handleSendForgotOTP}
                                  disabled={isSendingOTP}
                                  className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                                >
                                  {isSendingOTP ? "Sending OTP..." : "Forgot Password?"}
                                </button>
                              </div>
                              <div className="relative">
                                <Input 
                                  type={showOldPassword ? "text" : "password"}
                                  placeholder="••••••••"
                                  autoComplete="new-password"
                                  value={settingsForm.oldPassword} 
                                  onChange={e => setSettingsForm(prev => ({...prev, oldPassword: e.target.value}))} 
                                  className="rounded-xl border-border/60 bg-background/50 h-11 sm:h-12 pr-10 text-sm" 
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowOldPassword(!showOldPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                  {showOldPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="space-y-1.5">
                            <label className="text-xs sm:text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                              <Lock className="size-3.5 sm:size-4" /> {hasPassword ? "New Password" : "Create Password"}
                            </label>
                            <div className="relative">
                              <Input 
                                type={showNewPassword ? "text" : "password"}
                                placeholder="••••••••"
                                autoComplete="new-password"
                                value={settingsForm.password} 
                                onChange={e => setSettingsForm(prev => ({...prev, password: e.target.value}))} 
                                className="rounded-xl border-border/60 bg-background/50 h-11 sm:h-12 pr-10 text-sm" 
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                              </button>
                            </div>

                            {settingsForm.password && (
                              <div className="p-3 bg-secondary/40 rounded-xl space-y-1.5 mt-2 text-xs border border-border/40">
                                <p className="font-semibold text-muted-foreground">Password requirements:</p>
                                <div className="grid grid-cols-2 gap-1.5">
                                  <div className="flex items-center gap-1">
                                    {settingsForm.password.length >= 8 ? <Check className="size-3.5 text-green-500" /> : <X className="size-3.5 text-red-400" />}
                                    <span className={settingsForm.password.length >= 8 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>8+ characters</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {/[A-Z]/.test(settingsForm.password) ? <Check className="size-3.5 text-green-500" /> : <X className="size-3.5 text-red-400" />}
                                    <span className={/[A-Z]/.test(settingsForm.password) ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>Uppercase letter</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {/[a-z]/.test(settingsForm.password) ? <Check className="size-3.5 text-green-500" /> : <X className="size-3.5 text-red-400" />}
                                    <span className={/[a-z]/.test(settingsForm.password) ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>Lowercase letter</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {/[0-9]/.test(settingsForm.password) ? <Check className="size-3.5 text-green-500" /> : <X className="size-3.5 text-red-400" />}
                                    <span className={/[0-9]/.test(settingsForm.password) ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>At least one number</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {settingsForm.password && (
                            <div className="space-y-1.5 animate-card-fade-in">
                              <label className="text-xs sm:text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                                <Lock className="size-3.5 sm:size-4" /> Confirm New Password
                              </label>
                              <div className="relative">
                                <Input 
                                  type={showConfirmPassword ? "text" : "password"}
                                  placeholder="••••••••"
                                  autoComplete="new-password"
                                  value={settingsForm.confirmPassword} 
                                  onChange={e => setSettingsForm(prev => ({...prev, confirmPassword: e.target.value}))} 
                                  className="rounded-xl border-border/60 bg-background/50 h-11 sm:h-12 pr-10 text-sm" 
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-end pt-2 sm:pt-4">
                          <Button 
                            type="submit" 
                            className="w-full sm:w-auto rounded-full px-8 py-2.5 font-semibold text-sm"
                            disabled={isUpdatingSettings || (settingsForm.password && (settingsForm.password !== settingsForm.confirmPassword || settingsForm.password.length < 8))}
                          >
                            {isUpdatingSettings ? "Saving..." : "Update Password"}
                          </Button>
                        </div>
                      </form>
                    </div>

                    {/* Card 2: Push Notifications Settings */}
                    <div className="bg-card border border-border/70 rounded-2xl sm:rounded-[24px] p-4 sm:p-7 shadow-warm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                          <div className="size-10 sm:size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-2xs">
                            <Bell className="size-5 sm:size-6" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm sm:text-base text-foreground">Push Notifications</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Receive instant order status alerts, kitchen prep updates, and courier delivery tracking
                            </p>
                          </div>
                        </div>
                        <div className="self-start sm:self-auto shrink-0">
                          <PushNotificationButton userType="CUSTOMER" userId={customer.id} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ---------------- ORDERS TAB ---------------- */}
                {activeTab === "ORDERS" && (
                  <div className="space-y-4">
                    {loading ? (
                      <div className="flex justify-center py-12">
                        <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="bg-card border border-border/70 rounded-2xl sm:rounded-[24px] p-8 sm:p-12 text-center text-muted-foreground shadow-warm">
                        <ShoppingBag className="size-14 mx-auto mb-3 opacity-20" />
                        <p className="font-semibold text-foreground text-base">No orders yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Time to crave something delicious!</p>
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        {orders.map((order) => (
                          <div 
                            key={order.id} 
                            className="bg-card border border-border/70 rounded-2xl sm:rounded-[24px] p-4 sm:p-6 transition-all hover:border-primary/50 cursor-pointer hover:shadow-warm group"
                            onClick={() => navigate(`/track/${order.id}`)}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2.5 mb-1">
                                  <span className="font-mono text-sm text-muted-foreground font-bold">#{order.order_number}</span>
                                  <span className={cn(
                                    "text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider",
                                    order.status === "DELIVERED" ? "bg-green-600/20 text-green-600 dark:text-green-400" :
                                    order.status === "CANCELLED" ? "bg-destructive/20 text-destructive" :
                                    "bg-primary/20 text-primary"
                                  )}>
                                    {order.status}
                                  </span>
                                </div>
                                <h4 className="font-semibold text-foreground flex items-center gap-1.5 text-xs sm:text-sm">
                                  <Clock className="size-3.5 text-muted-foreground" />
                                  {formatDate(order.created_at)}
                                </h4>
                              </div>
                            </div>

                            <div className="flex flex-wrap justify-between items-center mt-3 pt-3 border-t border-border/60 gap-2">
                              <span className="font-bold text-base sm:text-lg text-primary">${order.total}</span>
                              <div className="flex flex-wrap items-center gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="rounded-full text-xs h-7 sm:h-8 px-3"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReorder(order.id);
                                  }}
                                >
                                  <RefreshCcw className="size-3.5 mr-1.5" /> Reorder
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="rounded-full text-xs h-7 sm:h-8 px-3 text-muted-foreground hover:text-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedOrderDetails(order);
                                  }}
                                >
                                  Details <ChevronRight className="size-3.5 ml-1" />
                                </Button>
                                <Button 
                                  variant="default" 
                                  size="sm" 
                                  className="rounded-full text-xs h-7 sm:h-8 px-4 font-semibold shadow-warm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/track/${order.id}`);
                                  }}
                                >
                                  Track
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ---------------- ADDRESSES TAB ---------------- */}
                {activeTab === "ADDRESSES" && (
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <Button 
                        onClick={() => setShowAddForm(!showAddForm)} 
                        className="rounded-full px-5 font-semibold shadow-warm hover:shadow-warm-lg"
                      >
                        <Plus className="size-4 mr-1.5" /> Add New Address
                      </Button>
                    </div>

                    {showAddForm && (
                      <form onSubmit={handleCreateAddress} className="bg-card border border-border/70 rounded-2xl sm:rounded-[24px] p-4 sm:p-6 mb-4 shadow-warm space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between pb-3 border-b border-border/60">
                          <h4 className="font-semibold text-foreground text-sm sm:text-base">New Address Location</h4>
                          <button 
                            type="button" 
                            onClick={() => setShowAddForm(false)} 
                            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            Close
                          </button>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-semibold text-foreground mb-1 block">Address Label</label>
                            <Input 
                              required 
                              value={newAddress.label} 
                              onChange={e => setNewAddress(prev => ({...prev, label: e.target.value}))} 
                              placeholder="e.g. Home, Office, Condo" 
                              className="rounded-xl border-border/70 bg-background/50 h-11" 
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-foreground mb-1 block">City / Province</label>
                            <select 
                              required 
                              value={newAddress.city} 
                              onChange={e => setNewAddress(prev => ({...prev, city: e.target.value}))} 
                              className="w-full h-11 px-3 rounded-xl border border-border/70 bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="" disabled>Select a city</option>
                              <option value="Phnom Penh">Phnom Penh</option>
                              <option value="Kandal">Kandal</option>
                              <option value="Siem Reap">Siem Reap</option>
                              <option value="Sihanoukville">Sihanoukville</option>
                              <option value="Battambang">Battambang</option>
                              <option value="Kampong Cham">Kampong Cham</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-foreground">Specific Street Address</label>
                            <div className="flex gap-2">
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 text-[10px] px-2 text-primary hover:text-primary hover:bg-primary/10 rounded-full cursor-pointer"
                                onClick={() => setShowMap(true)}
                              >
                                <MapPin className="size-3 mr-1" />
                                Map Pin
                              </Button>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 text-[10px] px-2 text-primary hover:text-primary hover:bg-primary/10 rounded-full cursor-pointer"
                                onClick={handleAutoLocation}
                                disabled={isLocating}
                              >
                                <LocateFixed className={cn("size-3 mr-1", isLocating && "animate-spin")} />
                                {isLocating ? "Locating..." : "Use GPS"}
                              </Button>
                            </div>
                          </div>
                          <Input 
                            required 
                            value={newAddress.address_line} 
                            onChange={e => setNewAddress(prev => ({...prev, address_line: e.target.value}))} 
                            placeholder="e.g. St 271, House 123, Toul Kork" 
                            className="rounded-xl border-border/70 bg-background/50 h-11" 
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <Button type="button" variant="outline" className="rounded-full px-5" onClick={() => setShowAddForm(false)}>Cancel</Button>
                          <Button type="submit" className="rounded-full px-6 font-semibold shadow-warm">Save Address</Button>
                        </div>
                      </form>
                    )}

                    {loading ? (
                      <div className="flex justify-center py-12">
                        <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : addresses.length === 0 ? (
                      <div className="bg-card border border-border/70 rounded-2xl sm:rounded-[24px] p-8 sm:p-12 text-center text-muted-foreground shadow-warm">
                        <MapPin className="size-14 mx-auto mb-3 opacity-20" />
                        <p className="font-semibold text-foreground">No saved addresses yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Add your home or office address for 1-tap checkout!</p>
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-3.5">
                        {addresses.map(addr => {
                          const isHome = (addr.label || "").toLowerCase().includes("home") || (addr.label || "").toLowerCase().includes("ផ្ទះ");
                          const isWork = (addr.label || "").toLowerCase().includes("work") || (addr.label || "").toLowerCase().includes("office") || (addr.label || "").toLowerCase().includes("ការងារ");

                          return (
                            <div 
                              key={addr.id} 
                              className={cn(
                                "bg-card border rounded-2xl sm:rounded-[24px] p-4 sm:p-5 relative group flex flex-col justify-between transition-all hover:shadow-warm",
                                addr.is_default ? "border-primary/50 shadow-xs" : "border-border/70"
                              )}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="flex items-center gap-2.5">
                                    <div className={cn(
                                      "size-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs",
                                      addr.is_default ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                                    )}>
                                      {isHome ? <MapPin className="size-4" /> : isWork ? <Building2 className="size-4" /> : <MapPin className="size-4" />}
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-foreground text-sm sm:text-base leading-tight">
                                        {addr.label || "Delivery"}
                                      </h4>
                                      <span className="text-xs text-muted-foreground font-medium">
                                        {addr.city || "Phnom Penh"}
                                      </span>
                                    </div>
                                  </div>

                                  {addr.is_default ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-primary/25">
                                      <Star className="size-2.5 fill-primary" /> Default
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleSetDefaultAddress(addr.id)}
                                      className="text-[11px] text-muted-foreground hover:text-primary font-semibold transition-colors cursor-pointer"
                                      title="Set as Default Address"
                                    >
                                      Set Default
                                    </button>
                                  )}
                                </div>

                                <p className="text-xs text-foreground/85 font-medium line-clamp-2 mt-1 leading-relaxed bg-secondary/30 rounded-xl p-2.5 border border-border/30">
                                  {addr.address_line}
                                </p>
                              </div>

                              <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedAddressDetails(addr)}
                                  className="h-7 px-2.5 rounded-full text-xs font-semibold text-foreground hover:bg-secondary flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="size-3 text-primary" />
                                  <span>Details</span>
                                </Button>

                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingAddress(addr)}
                                    className="size-7 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                                    title="Edit Address"
                                  >
                                    <Pencil className="size-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteAddress(addr.id)}
                                    className="size-7 p-0 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                    title="Delete Address"
                                  >
                                    <Trash2 className="size-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ---------------- FAVORITES TAB ---------------- */}
                {activeTab === "FAVORITES" && (
                  <div className="space-y-4">
                    {favorites.length === 0 ? (
                      <div className="bg-card border border-border/70 rounded-2xl sm:rounded-[24px] p-8 sm:p-12 text-center text-muted-foreground shadow-warm">
                        <Heart className="size-14 mx-auto mb-3 opacity-20" />
                        <p className="font-semibold text-foreground">No favorites yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Browse our menu and tap the heart icon to save dishes!</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {favorites.map(item => (
                          <div 
                            key={item.id} 
                            className="bg-card border border-border/70 rounded-2xl overflow-hidden group cursor-pointer hover:shadow-warm transition-all hover:-translate-y-0.5" 
                            onClick={() => navigate(`/product/${item.id}`)}
                          >
                            <div className="aspect-square relative overflow-hidden bg-secondary">
                              <img src={getImageUrl(item.image)} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  let favs = JSON.parse(localStorage.getItem("customerFavorites") || "[]");
                                  favs = favs.filter(f => String(f.id) !== String(item.id));
                                  localStorage.setItem("customerFavorites", JSON.stringify(favs));
                                  window.dispatchEvent(new Event("favoritesChanged"));
                                }}
                                className="absolute top-2 right-2 p-1.5 rounded-full bg-background/85 backdrop-blur-xs shadow-sm hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                                title="Remove from Favorites"
                              >
                                <Heart className="size-3.5 fill-red-500 text-red-500" />
                              </button>
                            </div>
                            <div className="p-3">
                              <h4 className="font-bold text-xs sm:text-sm text-foreground truncate">{item.name}</h4>
                              <p className="text-primary font-bold text-xs sm:text-sm mt-0.5">${item.price}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ---------------- COUPONS TAB ---------------- */}
                {activeTab === "COUPONS" && (
                  <div className="space-y-3 sm:space-y-4">
                    {/* Sleek Compact Lucky Draw Banner */}
                    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 px-3.5 py-2.5 sm:px-5 sm:py-3.5 text-white shadow-md flex items-center justify-between gap-2.5 sm:gap-4">
                      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                        <div className="size-9 sm:size-11 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-lg sm:text-2xl shadow-inner shrink-0">
                          🎰
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs sm:text-sm md:text-base font-black truncate leading-tight">Flame Fortune Lucky Draw</h4>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-white/25 text-[9px] font-extrabold uppercase tracking-wider shrink-0">
                              ✨ Free Daily
                            </span>
                          </div>
                          <p className="text-[10px] sm:text-xs text-white/90 truncate mt-0.5">
                            Spin daily to win up to 20% OFF & free vouchers!
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent("openLuckyDraw"))}
                        className="h-7 sm:h-8.5 px-3 sm:px-4 rounded-lg sm:rounded-xl bg-white text-orange-600 hover:bg-white/90 font-extrabold text-[11px] sm:text-xs shadow-xs active:scale-95 shrink-0 cursor-pointer whitespace-nowrap"
                      >
                        Draw Prize 🚀
                      </Button>
                    </div>

                    {loading ? (
                      <div className="flex justify-center py-12">
                        <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : coupons.length === 0 ? (
                      <div className="bg-card border border-border/70 rounded-2xl sm:rounded-[24px] p-8 sm:p-12 text-center text-muted-foreground shadow-warm">
                        <Ticket className="size-14 mx-auto mb-3 opacity-20" />
                        <p className="font-semibold text-foreground">No coupons available right now</p>
                        <p className="text-xs text-muted-foreground mt-1">Check back soon for new offers and rewards!</p>
                      </div>
                    ) : (
                      (() => {
                        const activeList = coupons.filter(c => c.active && (!c.expires_at || new Date(c.expires_at) > new Date()));
                        const luckyCount = activeList.filter(c => c.isLuckyDraw || String(c.code).includes("-")).length;
                        const promoCount = activeList.filter(c => !c.isLuckyDraw && !String(c.code).includes("-")).length;

                        const filteredList = activeList.filter(c => {
                          const isLucky = c.isLuckyDraw || String(c.code).includes("-");
                          if (couponFilter === "LUCKY") return isLucky;
                          if (couponFilter === "PROMO") return !isLucky;
                          return true;
                        });

                        const handleClearWonVouchers = () => {
                          const userKey = `user_${customer?.id || customer?.phone || customer?.email || "guest"}`;
                          clearAllWonCoupons(userKey);
                          clearAllWonCoupons(customer?.id || customer?.phone || "guest");
                          setCoupons(prev => prev.filter(c => !c.isLuckyDraw && !String(c.code).includes("-")));
                          toast.success("Cleared all Lucky Draw vouchers!");
                        };

                        return (
                          <div className="space-y-4 sm:space-y-5">
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
                                <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span> Available Now ({filteredList.length})
                                </h4>
                                {luckyCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={handleClearWonVouchers}
                                    className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors cursor-pointer px-2 py-0.5 rounded-md hover:bg-destructive/10"
                                    title="Remove all Lucky Draw vouchers"
                                  >
                                    <Trash2 className="size-3" /> Clear Won Vouchers
                                  </button>
                                )}
                              </div>

                              {/* Filter tabs: All, Lucky Draw, Store Promos */}
                              {(luckyCount > 0 && promoCount > 0) && (
                                <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1">
                                  <button
                                    type="button"
                                    onClick={() => setCouponFilter("ALL")}
                                    className={cn(
                                      "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                      couponFilter === "ALL" 
                                        ? "bg-primary text-primary-foreground shadow-2xs" 
                                        : "bg-secondary text-muted-foreground hover:text-foreground"
                                    )}
                                  >
                                    All ({activeList.length})
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCouponFilter("LUCKY")}
                                    className={cn(
                                      "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                                      couponFilter === "LUCKY" 
                                        ? "bg-amber-500 text-white shadow-2xs" 
                                        : "bg-secondary text-muted-foreground hover:text-foreground"
                                    )}
                                  >
                                    🎰 Lucky Draw ({luckyCount})
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCouponFilter("PROMO")}
                                    className={cn(
                                      "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                                      couponFilter === "PROMO" 
                                        ? "bg-emerald-600 text-white shadow-2xs" 
                                        : "bg-secondary text-muted-foreground hover:text-foreground"
                                    )}
                                  >
                                    🏷️ Store Promos ({promoCount})
                                  </button>
                                </div>
                              )}

                              <div className="grid sm:grid-cols-2 gap-3">
                                {filteredList.map(coupon => {
                                  const isLucky = coupon.isLuckyDraw || String(coupon.code).includes("-");
                                  return (
                                    <div key={coupon.id || coupon.code} className="bg-card border border-emerald-500/30 rounded-2xl p-3.5 sm:p-4 relative overflow-hidden shadow-warm flex flex-col justify-between group hover:border-emerald-500/50 transition-all">
                                      <div className="absolute -right-6 -top-6 size-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
                                      <div>
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <div className="inline-block px-2.5 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wide font-mono">
                                              {coupon.code}
                                            </div>
                                            {isLucky && (
                                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[9px] font-bold rounded-full border border-amber-500/30">
                                                🎰 Lucky Draw
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1 shrink-0">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                if (navigator.clipboard && navigator.clipboard.writeText) {
                                                  navigator.clipboard.writeText(coupon.code);
                                                }
                                                toast.success(`Copied promo code "${coupon.code}"!`);
                                              }}
                                              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
                                              title="Copy Code"
                                            >
                                              <Copy className="size-3" /> Copy
                                            </Button>
                                            {isLucky && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                  const userKey = `user_${customer?.id || customer?.phone || customer?.email || "guest"}`;
                                                  deleteWonCoupon(userKey, coupon.code);
                                                  deleteWonCoupon(customer?.id || customer?.phone || "guest", coupon.code);
                                                  setCoupons(prev => prev.filter(c => c.code !== coupon.code));
                                                  toast.success(`Removed voucher "${coupon.code}"`);
                                                }}
                                                className="size-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                                title="Delete Voucher"
                                              >
                                                <Trash2 className="size-3" />
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                        <h5 className="font-bold text-base text-foreground">
                                          {coupon.discount_type === 'PERCENTAGE' ? `${coupon.discount_value}% OFF` : 
                                           coupon.discount_type === 'FREE_DELIVERY' ? 'FREE DELIVERY' : 
                                           `$${coupon.discount_value} OFF`}
                                        </h5>
                                        <p className="text-xs text-muted-foreground mt-0.5">Min. spend: ${coupon.min_order_amount || 0}</p>
                                        {coupon.description && (
                                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{coupon.description}</p>
                                        )}
                                      </div>

                                      <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between gap-2">
                                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                          <Clock className="size-3" />
                                          {coupon.expires_at ? `Valid until ${new Date(coupon.expires_at).toLocaleDateString()}` : "No expiry"}
                                        </div>
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            const userKey = `user_${customer?.id || customer?.phone || "guest"}`;
                                            applyCoupon(coupon, coupon.accountKey || userKey);
                                            toast.success(`Coupon "${coupon.code}" applied to cart!`);
                                            openCart();
                                          }}
                                          className="h-7 px-3 text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-lg cursor-pointer shadow-xs"
                                        >
                                          Apply to Cart
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                                {filteredList.length === 0 && (
                                  <p className="text-xs text-muted-foreground col-span-2 py-4 text-center">No coupons matching this category.</p>
                                )}
                              </div>
                            </div>

                            {/* Expired / Used */}
                            {coupons.filter(c => !c.active || (c.expires_at && new Date(c.expires_at) <= new Date())).length > 0 && (
                              <div>
                                <h4 className="text-sm font-bold mb-3 text-muted-foreground flex items-center gap-1.5">
                                  <span className="size-2 rounded-full bg-muted-foreground/30"></span> Used / Expired
                                </h4>
                                <div className="grid sm:grid-cols-2 gap-3 opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
                                  {coupons.filter(c => !c.active || (c.expires_at && new Date(c.expires_at) <= new Date())).map(coupon => (
                                    <div key={coupon.id || coupon.code} className="bg-card border border-border/60 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
                                      <div className="flex items-start justify-between">
                                        <div>
                                          <div className="inline-block px-2.5 py-0.5 bg-secondary text-muted-foreground text-[10px] font-bold rounded-full mb-1.5 uppercase tracking-wide">
                                            {coupon.code}
                                          </div>
                                          <h5 className="font-bold text-sm text-muted-foreground">
                                            {coupon.discount_type === 'PERCENTAGE' ? `${coupon.discount_value}% OFF` : 
                                             coupon.discount_type === 'FREE_DELIVERY' ? 'FREE DELIVERY' : 
                                             `$${coupon.discount_value} OFF`}
                                          </h5>
                                        </div>
                                        {(coupon.isLuckyDraw || String(coupon.code).includes("-")) && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              const userKey = `user_${customer?.id || customer?.phone || customer?.email || "guest"}`;
                                              deleteWonCoupon(userKey, coupon.code);
                                              deleteWonCoupon(customer?.id || customer?.phone || "guest", coupon.code);
                                              setCoupons(prev => prev.filter(c => c.code !== coupon.code));
                                              toast.success(`Removed expired voucher "${coupon.code}"`);
                                            }}
                                            className="size-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                            title="Delete Expired Voucher"
                                          >
                                            <Trash2 className="size-3" />
                                          </Button>
                                        )}
                                      </div>
                                      <div className="mt-3 pt-2 border-t border-border/60 text-[11px] text-muted-foreground flex items-center gap-1">
                                        {coupon.active ? "Expired" : "Used or Inactive"}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* 3. MODALS & DIALOGS (PASSWORD OTP, ORDER DETAILS, ADDRESSES, MAP PICKER) */}
            {/* ========================================================================= */}

            {/* Reset Password via OTP Dialog Overlay */}
            <Dialog open={showOTPDialog} onOpenChange={setShowOTPDialog}>
              <DialogContent className="sm:max-w-md rounded-3xl border border-border/60 bg-card p-6 shadow-warm-lg">
                <DialogHeader>
                  <DialogTitle className="font-serif text-2xl font-bold">Bypass Password via OTP</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                    We have sent a 6-digit OTP code to your email <strong className="text-foreground">{settingsForm.email}</strong>. Enter it below to authorize setting a new password.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Input 
                      type="text"
                      placeholder="000000"
                      maxLength={6}
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="rounded-xl border-border/60 bg-background/50 h-14 text-center font-mono tracking-[0.5em] text-2xl"
                    />
                  </div>
                  <div className="flex gap-3 justify-end pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowOTPDialog(false)}
                      className="rounded-full px-5"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleVerifyForgotOTP}
                      disabled={isVerifyingOTP}
                      className="rounded-full px-6"
                    >
                      {isVerifyingOTP ? "Verifying..." : "Verify OTP"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Order Details Modal */}
            <Dialog open={!!selectedOrderDetails} onOpenChange={(open) => !open && setSelectedOrderDetails(null)}>
              <DialogContent className="sm:max-w-md bg-background border-border/60 rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="font-serif text-xl">Order #{selectedOrderDetails?.order_number}</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Items and price breakdown for this order.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 mt-4">
                  {(() => {
                    const itemsList = (selectedOrderDetails?.items && Array.isArray(selectedOrderDetails.items) && selectedOrderDetails.items.length > 0)
                      ? selectedOrderDetails.items
                      : (selectedOrderDetails?.order_items && Array.isArray(selectedOrderDetails.order_items) && selectedOrderDetails.order_items.length > 0)
                        ? selectedOrderDetails.order_items
                        : allOrderItems.filter(item => String(item.order_id || item.orderId) === String(selectedOrderDetails?.id));

                    if (!itemsList || itemsList.length === 0) {
                      return <div className="text-center py-6 text-muted-foreground">No items found for this order.</div>;
                    }

                    return itemsList.map((item, idx) => {
                      const itemProdId = item.product_id || item.productId;
                      const itemProdName = item.product_name || item.productName || "";
                      const foodItem = allProducts.find(f => 
                        (itemProdId && String(f.id) === String(itemProdId)) || 
                        (f.name && itemProdName && f.name.toLowerCase().trim() === itemProdName.toLowerCase().trim())
                      ) || {};
                      const rawImg = item.image || item.product_image || foodItem.image;
                      const displayImg = rawImg ? getImageUrl(rawImg) : "/images/library/pizza.jpg";
                      const pName = itemProdName || foodItem.name || "Item";
                      const pQty = item.quantity || 1;
                      const pTotal = Number(item.line_total || item.lineTotal || (item.unit_price || item.unitPrice || 0) * pQty).toFixed(2);

                      return (
                        <div key={item.id || `${item.product_id}-${idx}`} className="flex justify-between items-center text-sm gap-3 p-3 bg-secondary/30 rounded-xl border border-border/40">
                          <div className="flex items-center gap-3">
                            <div className="size-12 bg-secondary rounded-lg overflow-hidden shrink-0 border border-border/50 flex items-center justify-center">
                              <img 
                                src={displayImg} 
                                alt={pName} 
                                className="w-full h-full object-cover" 
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = "/images/library/pizza.jpg";
                                }}
                              />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground">
                                {pQty}x {pName}
                              </span>
                              {item.options && (
                                <span className="text-xs text-muted-foreground">
                                  {(() => {
                                    try {
                                      return Object.values(typeof item.options === "string" ? JSON.parse(item.options) : item.options).join(", ");
                                    } catch(e) {
                                      return String(item.options);
                                    }
                                  })()}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="font-bold">${pTotal}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
                <div className="pt-4 border-t border-border/60 space-y-2 text-sm mt-4">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>${Number(selectedOrderDetails?.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery Fee</span>
                    <span>${Number(selectedOrderDetails?.delivery_fee || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-foreground text-base pt-2">
                    <span>Total</span>
                    <span className="text-primary">${Number(selectedOrderDetails?.total || 0).toFixed(2)}</span>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* View Address Detail Modal */}
            <Dialog open={Boolean(selectedAddressDetails)} onOpenChange={(open) => !open && setSelectedAddressDetails(null)}>
              <DialogContent className="sm:max-w-md rounded-3xl border border-border/70 bg-card p-6 shadow-warm-lg">
                <DialogHeader>
                  <DialogTitle className="font-serif text-2xl font-bold flex items-center gap-2">
                    <MapPin className="size-5 text-primary" />
                    {selectedAddressDetails?.label || "Address Details"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    View full information for this saved address.
                  </DialogDescription>
                </DialogHeader>
                {selectedAddressDetails && (
                  <div className="space-y-4 py-3">
                    <div className="p-4 rounded-2xl bg-secondary/50 border border-border/60 space-y-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">City / Province</span>
                        <span className="text-sm font-semibold text-foreground">{selectedAddressDetails.city || "Phnom Penh"}</span>
                      </div>
                      <div className="pt-2 border-t border-border/40">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Full Address Details</span>
                        <p className="text-sm font-medium text-foreground leading-relaxed mt-0.5">{selectedAddressDetails.address_line}</p>
                      </div>
                      <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Status</span>
                        {selectedAddressDetails.is_default ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-primary/15 text-primary px-2.5 py-0.5 rounded-full font-bold uppercase">
                            <Star className="size-3 fill-primary" /> Default
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground font-medium">Standard</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      {!selectedAddressDetails.is_default && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            handleSetDefaultAddress(selectedAddressDetails.id);
                            setSelectedAddressDetails(null);
                          }}
                          className="rounded-full px-4 text-xs font-semibold"
                        >
                          <Star className="size-3.5 mr-1" /> Set Default
                        </Button>
                      )}
                      <Button
                        type="button"
                        onClick={() => {
                          setEditingAddress(selectedAddressDetails);
                          setSelectedAddressDetails(null);
                        }}
                        className="rounded-full px-5 font-semibold shadow-warm"
                      >
                        <Pencil className="size-3.5 mr-1" /> Edit
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Edit Address Modal */}
            <Dialog open={Boolean(editingAddress)} onOpenChange={(open) => !open && setEditingAddress(null)}>
              <DialogContent className="sm:max-w-md rounded-3xl border border-border/70 bg-card p-6 shadow-warm-lg">
                <DialogHeader>
                  <DialogTitle className="font-serif text-2xl font-bold flex items-center gap-2">
                    <Pencil className="size-5 text-primary" />
                    Edit Address
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Update your delivery address details.
                  </DialogDescription>
                </DialogHeader>
                {editingAddress && (
                  <form onSubmit={handleUpdateAddress} className="space-y-4 py-3">
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block">Address Label</label>
                        <Input 
                          required 
                          value={editingAddress.label || ""} 
                          onChange={e => setEditingAddress(prev => ({ ...prev, label: e.target.value }))} 
                          className="rounded-xl border-border/70 bg-background/50 h-11"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground mb-1 block">City / Province</label>
                        <select 
                          required 
                          value={editingAddress.city || ""} 
                          onChange={e => setEditingAddress(prev => ({ ...prev, city: e.target.value }))} 
                          className="w-full h-11 px-3 rounded-xl border border-border/70 bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="Phnom Penh">Phnom Penh</option>
                          <option value="Kandal">Kandal</option>
                          <option value="Siem Reap">Siem Reap</option>
                          <option value="Sihanoukville">Sihanoukville</option>
                          <option value="Battambang">Battambang</option>
                          <option value="Kampong Cham">Kampong Cham</option>
                        </select>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-foreground">Specific Street Address</label>
                          <div className="flex gap-2">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-[10px] px-2 text-primary hover:text-primary hover:bg-primary/10 rounded-full cursor-pointer"
                              onClick={() => setShowMap(true)}
                            >
                              <MapPin className="size-3 mr-1" />
                              Map Pin
                            </Button>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-[10px] px-2 text-primary hover:text-primary hover:bg-primary/10 rounded-full cursor-pointer"
                              onClick={handleAutoLocation}
                              disabled={isLocating}
                            >
                              <LocateFixed className={cn("size-3 mr-1", isLocating && "animate-spin")} />
                              {isLocating ? "Locating..." : "Use GPS"}
                            </Button>
                          </div>
                        </div>
                        <Input 
                          required 
                          value={editingAddress.address_line || ""} 
                          onChange={e => setEditingAddress(prev => ({ ...prev, address_line: e.target.value }))} 
                          className="rounded-xl border-border/70 bg-background/50 h-11"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-3">
                      <Button type="button" variant="outline" className="rounded-full px-4" onClick={() => setEditingAddress(null)}>
                        Cancel
                      </Button>
                      <Button type="submit" className="rounded-full px-6 font-semibold shadow-warm">
                        Save Changes
                      </Button>
                    </div>
                  </form>
                )}
              </DialogContent>
            </Dialog>

            {/* Map Picker Modal */}
            <AnimatePresence>
              {showMap && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-card w-full max-w-lg rounded-3xl p-6 shadow-2xl relative"
                  >
                    <h3 className="font-serif text-xl font-bold text-foreground mb-4">Pick Location</h3>
                    <MapPicker
                      onConfirm={(loc) => {
                        if (editingAddress) {
                          setEditingAddress(prev => ({ ...prev, address_line: loc.address, city: loc.city || prev?.city }));
                        } else {
                          setNewAddress(prev => ({ ...prev, address_line: loc.address, city: loc.city || prev?.city }));
                        }
                        setShowMap(false);
                        toast.success("Location picked successfully!");
                      }}
                      onClose={() => setShowMap(false)}
                    />
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

          </div>
        </PageTransition>
      </main>
    </div>
  );
}
