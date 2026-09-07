import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  ChefHat, 
  ShoppingBag, 
  Bike, 
  MapPin, 
  PhoneCall, 
  AlertCircle,
  Home,
  Receipt,
  Navigation,
  Flame,
  Star,
  Check,
  Compass,
  Copy,
  Gauge,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/food/navbar";
import { PageTransition } from "@/components/shared/page-transition";
import { OrderChatModal, showChatNotificationToast } from "@/components/food/order-chat-modal";
import { FloatingChatHead } from "@/components/food/floating-chat-head";
import { list, get, update, getOrderMessages } from "@/lib/api";
import { PushNotificationButton } from "@/components/common/PushNotificationButton";
import { cn, formatDate } from "@/lib/utils";
import { getImageUrl } from "@/lib/food-api";
import { useTheme } from "@/components/theme-provider.jsx";
import { toast } from "sonner";
import confetti from "canvas-confetti";

// Leaflet imports
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet's default icon path issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Restaurant Coordinates (Flame & Crust Central Phnom Penh near Independence Monument)
const RESTAURANT_LOCATION = [11.5564, 104.9282];
const DEFAULT_CUSTOMER_LOCATION = [11.5620, 104.9160];

// Custom High-Quality HTML Map Markers
const createRestaurantIcon = () => L.divIcon({
  className: "custom-leaflet-icon bg-transparent border-none",
  html: `
    <div class="relative flex items-center justify-center size-9 rounded-full bg-gradient-to-tr from-amber-600 to-red-600 text-white shadow-lg border-2 border-white ring-2 ring-orange-500/40 -translate-x-1/2 -translate-y-1/2">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
      </svg>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -20],
});

const createCustomerIcon = () => L.divIcon({
  className: "custom-leaflet-icon bg-transparent border-none",
  html: `
    <div class="relative flex items-center justify-center size-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg border-2 border-white ring-2 ring-emerald-500/40 -translate-x-1/2 -translate-y-1/2">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -20],
});

const createDriverMotoIcon = () => L.divIcon({
  className: "custom-leaflet-icon bg-transparent border-none",
  html: `
    <div class="relative flex items-center justify-center size-12 -translate-x-1/2 -translate-y-1/2">
      <div class="absolute inset-0 rounded-full bg-orange-500/40 animate-ping"></div>
      <div class="absolute -inset-1 rounded-full bg-blue-500/20 blur-xs"></div>
      
      <div class="relative flex items-center justify-center size-11 rounded-full bg-gradient-to-tr from-slate-900 via-zinc-900 to-slate-800 text-white shadow-[0_4px_16px_rgba(0,0,0,0.4)] border-2 border-white ring-4 ring-orange-500/50">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-400 drop-shadow-sm">
          <circle cx="18.5" cy="17.5" r="3.5" stroke="currentColor" fill="#18181b"/>
          <circle cx="5.5" cy="17.5" r="3.5" stroke="currentColor" fill="#18181b"/>
          <circle cx="15" cy="5" r="1.5" fill="#f59e0b" stroke="none"/>
          <path d="M12 17.5V14l-3-3 4-3 2 3h2" stroke="currentColor"/>
          <rect x="2" y="10" width="4.5" height="4.5" rx="1" fill="#ea580c" stroke="#fff" stroke-width="1"/>
        </svg>
      </div>

      <span class="absolute -top-0.5 -right-0.5 flex h-3 w-3">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white"></span>
      </span>
    </div>
  `,
  iconSize: [48, 48],
  iconAnchor: [24, 24],
  popupAnchor: [0, -24],
});

function calculateDistance(coord1, coord2) {
  if (!coord1 || !coord2) return 0;
  const R = 6371; // km
  const dLat = (coord2[0] - coord1[0]) * Math.PI / 180;
  const dLon = (coord2[1] - coord1[1]) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(coord1[0] * Math.PI / 180) * Math.cos(coord2[0] * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function MapBoundsController({ bounds, triggerCenter }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, animate: true });
      } catch (e) {}
    }
  }, [bounds, triggerCenter, map]);
  return null;
}

const STATUS_STEPS = [
  { id: "PENDING", label: "Placed", icon: Clock },
  { id: "CONFIRMED", label: "Confirmed", icon: CheckCircle2 },
  { id: "PREPARING", label: "Preparing", icon: ChefHat },
  { id: "READY", label: "Ready", icon: ShoppingBag },
  { id: "OUT_FOR_DELIVERY", label: "On Way", icon: Bike },
  { id: "DELIVERED", label: "Delivered", icon: MapPin },
];

export default function OrderTrackingPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [order, setOrder] = useState(null);
  const [driver, setDriver] = useState(null);
  const [address, setAddress] = useState(null);
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [recenterCounter, setRecenterCounter] = useState(0);
  const [mapInstance, setMapInstance] = useState(null);
  
  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatRecipientType, setChatRecipientType] = useState("DRIVER");
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastMsgText, setLastMsgText] = useState("");
  const [chatHeadDismissed, setChatHeadDismissed] = useState(false);
  const lastKnownMsgIdRef = useRef(null);

  // Background message monitoring for incoming notifications & sound chime
  useEffect(() => {
    if (!orderId) return;
    const checkIncomingMessages = async () => {
      try {
        const msgs = await getOrderMessages(orderId);
        if (Array.isArray(msgs) && msgs.length > 0) {
          const lastMsg = msgs[msgs.length - 1];
          if (lastKnownMsgIdRef.current !== null && lastMsg.id > lastKnownMsgIdRef.current) {
            if (lastMsg.sender_type !== "CUSTOMER") {
              // Incoming message from Driver!
              if (!chatOpen) {
                setLastMsgText(lastMsg.message);
                setChatHeadDismissed(false);
                setUnreadCount(prev => prev + 1);
                showChatNotificationToast({
                  senderName: driver?.name || lastMsg.sender_name || "Delivery Partner",
                  message: lastMsg.message,
                  photo: driver?.profilePhoto || driver?.profile_photo,
                  onReply: () => {
                    setChatOpen(true);
                    setUnreadCount(0);
                  }
                });
              }
            }
          }
          lastKnownMsgIdRef.current = lastMsg.id;
        }
      } catch (e) {}
    };

    checkIncomingMessages();
    const chatPollInterval = setInterval(checkIncomingMessages, 3000);
    return () => clearInterval(chatPollInterval);
  }, [orderId, driver, chatOpen]);

  // Real turn-by-turn road route geometry from OSRM
  const [roadRoute, setRoadRoute] = useState([]);
  const [roadDistanceKm, setRoadDistanceKm] = useState(2.2);

  const confettiRef = useRef(false);
  const [cancelling, setCancelling] = useState(false);

  const handleCancelOrder = async () => {
    if (!window.confirm("តើអ្នកពិតជាចង់លុបចោលការបញ្ជាទិញនេះមែនទេ? (Are you sure you want to cancel this order?)")) return;
    
    setCancelling(true);
    try {
      await update("orders", order.id, { status: "CANCELLED" });
      setOrder({ ...order, status: "CANCELLED" });
      toast.success("បានលុបចោលជោគជ័យ (Order cancelled)");
    } catch (err) {
      toast.error("មិនអាចលុបចោលបានទេ (Failed to cancel)");
    } finally {
      setCancelling(false);
    }
  };

  const fetchOrderData = async () => {
    try {
      const orderData = await get("orders", orderId);
      if (!orderData) throw new Error("Order not found");
      setOrder(orderData);

      const driverId = orderData.driverId || orderData.driver_id;
      if (driverId) {
        try {
          const driverData = await get("drivers", driverId);
          setDriver(driverData);
        } catch(e) {}
      } else if (orderData.status === "ON_DELIVERY" || orderData.status === "OUT_FOR_DELIVERY") {
        try {
          const allDrivers = await list("drivers");
          const activeDriver = allDrivers.find(d => String(d.status).toUpperCase() === "ACTIVE" || d.is_online || d.active) || allDrivers[0];
          if (activeDriver) {
            setDriver(activeDriver);
          } else {
            setDriver({
              name: "Flame Courier Partner",
              phone: "0965755963",
              vehicle_info: "Honda Dream 125 • Phnom Penh Delivery",
              status: "ACTIVE"
            });
          }
        } catch(e) {
          setDriver({
            name: "Flame Courier Partner",
            phone: "0965755963",
            vehicle_info: "Honda Dream 125 • Phnom Penh Delivery",
            status: "ACTIVE"
          });
        }
      } else {
        setDriver(null);
      }
      
      const addressId = orderData.addressId || orderData.address_id;
      if (addressId) {
        try {
          const addressData = await get("addresses", addressId);
          setAddress(addressData);
        } catch(e) {}
      }

      if (items.length === 0) {
        try {
          const allItems = await list("order_items");
          setItems(allItems.filter(item => String(item.orderId || item.order_id) === String(orderData.id)));
          
          const allProducts = await list("products");
          setProducts(allProducts);
        } catch(e) {}
      }

      if (orderData.status === "DELIVERED" && !confettiRef.current) {
        confettiRef.current = true;
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
      }

      setError(null);
    } catch (err) {
      setError(err.message || "Failed to load order status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderData();
    // Real-time polling every 2 seconds for live driver coordinates
    const interval = setInterval(fetchOrderData, 2000);
    return () => clearInterval(interval);
  }, [orderId]);

  // Real Customer Address Location
  const customerPos = (address && address.latitude && address.longitude) 
    ? [Number(address.latitude), Number(address.longitude)] 
    : DEFAULT_CUSTOMER_LOCATION;

  // Real Driver GPS Location from Database
  const hasRealDriverGps = driver && driver.latitude && driver.longitude && 
                           !isNaN(Number(driver.latitude)) && !isNaN(Number(driver.longitude));
  
  const realDriverPos = hasRealDriverGps 
    ? [Number(driver.latitude), Number(driver.longitude)] 
    : null;

  // Fetch real turn-by-turn road route from OSRM
  useEffect(() => {
    const fetchRealRoadRoute = async () => {
      try {
        const start = RESTAURANT_LOCATION;
        const dest = customerPos;
        const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${dest[1]},${dest[0]}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        if (data && data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          setRoadRoute(coords);
          if (data.routes[0].distance) {
            setRoadDistanceKm(Number((data.routes[0].distance / 1000).toFixed(1)));
          }
        }
      } catch (err) {
        // Fallback default city road waypoints
        setRoadRoute([
          RESTAURANT_LOCATION,
          [11.5566, 104.9220],
          [11.5592, 104.9215],
          [11.5596, 104.9168],
          customerPos
        ]);
      }
    };

    fetchRealRoadRoute();
  }, [customerPos[0], customerPos[1]]);

  const handleCopyOrderNumber = () => {
    const num = order?.orderNumber || order?.order_number || order?.id;
    if (num) {
      navigator.clipboard.writeText(String(num));
      setCopied(true);
      toast.success("Order ID copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading && !order) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex justify-center items-center">
          <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex flex-col justify-center items-center text-center px-4 pt-[calc(4.5rem+env(safe-area-inset-top))]">
          <AlertCircle className="size-12 text-destructive mb-4" />
          <h2 className="text-2xl font-bold text-foreground">Couldn't load order</h2>
          <p className="text-muted-foreground mt-2 mb-6">{error}</p>
          <Button onClick={() => navigate("/")} className="rounded-full">Back to Home</Button>
        </main>
      </div>
    );
  }

  const currentStepIndex = STATUS_STEPS.findIndex(s => s.id === order.status);
  const isCancelled = order.status === "CANCELLED";
  const isDelivered = order.status === "DELIVERED";
  const isOutForDelivery = order.status === "OUT_FOR_DELIVERY";

  // Effective route points: use real turn-by-turn road geometry
  const displayRoute = roadRoute.length > 0 ? roadRoute : [
    RESTAURANT_LOCATION,
    [11.5566, 104.9220],
    [11.5592, 104.9215],
    [11.5596, 104.9168],
    customerPos
  ];

  // Map Bounds
  const mapBounds = [
    RESTAURANT_LOCATION,
    customerPos,
    ...(realDriverPos ? [realDriverPos] : [])
  ];

  // Real distance and ETA computation
  const remainingDistanceKm = realDriverPos 
    ? calculateDistance(realDriverPos, customerPos)
    : roadDistanceKm;

  const remainingMinutes = Math.max(2, Math.round((remainingDistanceKm / 25) * 60));

  const getStatusInfo = () => {
    switch(order.status) {
      case "PENDING":
        return {
          title: "Order Placed",
          desc: "We received your order and the restaurant is reviewing it.",
          eta: "30 - 45 mins",
          badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400"
        };
      case "CONFIRMED":
        return {
          title: "Order Confirmed",
          desc: "Kitchen accepted your order and is getting ingredients ready.",
          eta: "25 - 35 mins",
          badge: "bg-blue-500/15 text-blue-600 dark:text-blue-400"
        };
      case "PREPARING":
        return {
          title: "Baking in Wood-Fired Oven 🍕",
          desc: "Fresh dough hand-crafted and baking at 450°C.",
          eta: "20 - 30 mins",
          badge: "bg-orange-500/15 text-orange-600 dark:text-orange-400"
        };
      case "READY":
        return {
          title: "Order Packed & Ready 📦",
          desc: "Boxed hot and waiting for delivery partner pickup.",
          eta: "15 - 20 mins",
          badge: "bg-purple-500/15 text-purple-600 dark:text-purple-400"
        };
      case "OUT_FOR_DELIVERY":
        return {
          title: "Courier is on the Way! 🛵",
          desc: "Your hot pizza is on its way to your doorstep.",
          eta: hasRealDriverGps 
            ? `~${remainingMinutes} mins (${remainingDistanceKm.toFixed(1)} km)`
            : `~${remainingMinutes} mins (${remainingDistanceKm} km)`,
          badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
        };
      case "DELIVERED":
        return {
          title: "Delivered ✨",
          desc: "Successfully delivered. Enjoy your hot meal!",
          eta: "Completed",
          badge: "bg-green-500/15 text-green-600 dark:text-green-400"
        };
      default:
        return {
          title: order.status,
          desc: "",
          eta: "--",
          badge: "bg-secondary text-foreground"
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 pt-[calc(4.5rem+env(safe-area-inset-top))] sm:pt-24 lg:pt-28 pb-16">
        <PageTransition>
          {/* Responsive Outer Container - Smooth on Mobile, Tablet & all Laptop/Desktop Sizes */}
          <div className="mx-auto max-w-6xl px-3.5 sm:px-6 lg:px-8 py-3 sm:py-6">
            
            {/* Unified Card Container */}
            <div className="rounded-3xl border border-border/70 bg-card p-4 sm:p-7 lg:p-9 shadow-warm-lg">
              
              {/* Back Button & Status Badge */}
              <div className="flex items-center justify-between mb-4 sm:mb-5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/")}
                  className="rounded-full text-foreground/75 hover:text-foreground -ml-2 flex items-center gap-1.5 text-xs sm:text-sm font-semibold h-8"
                >
                  <ArrowLeft className="size-4" />
                  Back
                </Button>

                <div className="flex items-center gap-2">
                  <PushNotificationButton userType="CUSTOMER" userId={order?.customerId || order?.customer_id} className="scale-90 sm:scale-95 origin-right" />
                  <span className={cn("text-[11px] sm:text-xs font-bold px-3 py-1 rounded-full", statusInfo.badge)}>
                    {statusInfo.title}
                  </span>
                </div>
              </div>

              {/* Order Header Row */}
              <div className="flex justify-between items-start mb-6 border-b border-border/60 pb-5 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-serif text-xl sm:text-2xl lg:text-3xl font-bold text-primary">
                      Order #{order.orderNumber || order.order_number || order.id}
                    </h1>
                    <button 
                      onClick={handleCopyOrderNumber}
                      title="Copy Order ID"
                      className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                    >
                      {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Placed on <span className="font-medium text-foreground">{formatDate(order.createdAt || order.created_at)}</span>
                  </p>
                </div>
                
                <div className="text-right">
                  <span className="font-serif text-xl sm:text-2xl lg:text-3xl font-black text-primary">
                    ${order.total.toFixed(2)}
                  </span>
                  {!isDelivered && !isCancelled && (
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                      ETA: <span className="font-bold text-foreground">{statusInfo.eta}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Order Cancelled State */}
              {isCancelled ? (
                <div className="bg-destructive/10 text-destructive p-5 rounded-2xl text-center mb-6">
                  <AlertCircle className="size-8 mx-auto mb-2" />
                  <h3 className="text-base font-bold">Order Cancelled</h3>
                  <p className="text-xs text-muted-foreground">This order was cancelled.</p>
                </div>
              ) : (
                /* Stepper (Responsive across all screens with NO horizontal scrollbar) */
                <div className="relative mb-6 lg:mb-8 w-full">
                  <div className="relative w-full px-2 sm:px-4 lg:px-6">
                    
                    {/* Background Progress Bar */}
                    <div className="absolute top-[14px] sm:top-[18px] lg:top-[20px] left-5 right-5 sm:left-8 sm:right-8 lg:left-12 lg:right-12 h-[3px] sm:h-1 bg-secondary rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-amber-500 to-primary shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(0, currentStepIndex) / (STATUS_STEPS.length - 1) * 100}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>

                    {/* Step Icons Array */}
                    <div className="relative flex justify-between w-full">
                      {STATUS_STEPS.map((step, idx) => {
                        const isCompleted = idx <= currentStepIndex;
                        const isCurrent = idx === currentStepIndex;
                        const Icon = step.icon;

                        return (
                          <div key={step.id} className="flex flex-col items-center">
                            <motion.div 
                              initial={{ scale: 0.8 }}
                              animate={{ scale: 1 }}
                              className={cn(
                                "size-7 sm:size-9 lg:size-10 rounded-full border-2 flex items-center justify-center bg-card z-10 transition-all duration-300 shadow-xs",
                                isCompleted ? "border-primary text-primary" : "border-secondary text-muted-foreground",
                                isCurrent && "bg-primary text-primary-foreground border-primary shadow-[0_0_12px_rgba(239,68,68,0.4)] ring-3 ring-primary/20 scale-110"
                              )}
                            >
                              {isCompleted && !isCurrent ? (
                                <Check className="size-3.5 sm:size-4 lg:size-5 stroke-[3]" />
                              ) : (
                                <Icon className="size-3.5 sm:size-4 lg:size-5" />
                              )}
                            </motion.div>

                            <span className={cn(
                              "text-[9px] sm:text-[11px] lg:text-xs font-bold mt-1.5 sm:mt-2 text-center leading-tight transition-colors",
                              isCurrent ? "text-primary font-black" : (isCompleted ? "text-foreground font-semibold" : "text-muted-foreground font-medium")
                            )}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                </div>
              )}

              {/* Delivered Celebration Card */}
              {isDelivered && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-6 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-transparent border border-emerald-500/25 text-center"
                >
                  <div className="size-11 mx-auto bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-full flex items-center justify-center shadow-md mb-2.5">
                    <CheckCircle2 className="size-6" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold font-serif text-foreground">
                    Delivered! Bon Appétit
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                    Your order was safely delivered. Thank you for choosing Flame & Crust!
                  </p>
                  <div className="flex justify-center gap-2.5">
                    <Button onClick={() => navigate("/menu")} size="sm" className="rounded-full h-9 px-5 text-xs sm:text-sm font-bold shadow-xs">
                      <Flame className="size-3.5 mr-1.5" /> Order Again
                    </Button>
                    {items.length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => navigate(`/review/${items[0]?.productId || items[0]?.product_id}`)}
                        className="rounded-full h-9 px-5 text-xs sm:text-sm font-bold bg-card hover:bg-secondary border-border/60"
                      >
                        <Star className="size-3.5 mr-1.5 text-amber-400 fill-amber-400" /> Review
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Responsive 2-Column Grid on Laptop/Desktop & Stacked on Mobile */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT SIDE: Live Map & Driver Card (lg:col-span-7) */}
                {!isCancelled && (
                  <div className="lg:col-span-7 flex flex-col gap-4">
                    <div className="rounded-2xl border border-border/70 overflow-hidden bg-card shadow-xs">
                      
                      {/* Map Header Strip */}
                      <div className="px-3.5 py-2.5 bg-secondary/30 border-b border-border/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            {hasRealDriverGps && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                            <span className={cn("relative inline-flex rounded-full h-2 w-2", hasRealDriverGps ? "bg-emerald-500" : "bg-amber-500")}></span>
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            {hasRealDriverGps 
                              ? <span>Live GPS: <span className="text-primary">Courier Active</span></span>
                              : <span>Delivery Route: <span className="text-muted-foreground">{statusInfo.title}</span></span>
                            }
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] sm:text-xs bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Gauge className="size-3" />
                            ~{remainingDistanceKm.toFixed(1)} km
                          </span>
                          
                          <button 
                            onClick={() => setRecenterCounter(c => c + 1)}
                            className="text-[11px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-secondary/60 transition-colors"
                            title="Recenter Map"
                          >
                            <Compass className="size-3.5" />
                            <span>Recenter</span>
                          </button>
                        </div>
                      </div>

                      {/* Leaflet Map with Clean Tiles (No API key watermark) */}
                      <div className="w-full h-[220px] sm:h-[260px] lg:h-[340px] relative z-0">
                        <MapContainer 
                          center={customerPos} 
                          zoom={14} 
                          className="w-full h-full z-0" 
                          zoomControl={false}
                          attributionControl={false}
                        >
                          <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                          />

                          {/* 1. Restaurant Marker */}
                          <Marker position={RESTAURANT_LOCATION} icon={createRestaurantIcon()}>
                            <Popup className="font-sans text-xs">
                              <div className="text-center font-bold text-primary">Flame & Crust Kitchen</div>
                            </Popup>
                          </Marker>

                          {/* 2. Customer Destination Marker */}
                          <Marker position={customerPos} icon={createCustomerIcon()}>
                            <Popup className="font-sans text-xs">
                              <div className="text-center font-bold">Delivery Address</div>
                            </Popup>
                          </Marker>

                          {/* 3. Real Driver GPS Motorcycle Marker (When real GPS available) */}
                          {hasRealDriverGps && (
                            <Marker position={realDriverPos} icon={createDriverMotoIcon()}>
                              <Popup className="font-sans text-xs">
                                <div className="text-center">
                                  <p className="font-bold text-primary">{driver?.name || "Delivery Partner"}</p>
                                  <p className="text-[10px] text-muted-foreground">Live GPS Location</p>
                                </div>
                              </Popup>
                            </Marker>
                          )}

                          {/* Outer Glow Route along real roads */}
                          <Polyline 
                            positions={displayRoute} 
                            pathOptions={{ 
                              color: "#f97316", 
                              weight: 6, 
                              opacity: 0.35
                            }} 
                          />

                          {/* Inner Dashed Route along real roads */}
                          <Polyline 
                            positions={displayRoute} 
                            pathOptions={{ 
                              color: "#ea580c", 
                              weight: 3.5, 
                              opacity: 0.95, 
                              dashArray: "6, 6" 
                            }} 
                          />

                          <MapBoundsController bounds={mapBounds} triggerCenter={recenterCounter} />
                        </MapContainer>
                      </div>

                      {/* Driver Strip (When Driver is assigned or On Delivery) */}
                      {driver ? (
                        <div className="p-3.5 bg-secondary/30 border-t border-border/50 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {driver.profilePhoto || driver.profile_photo ? (
                              <img 
                                src={driver.profilePhoto || driver.profile_photo} 
                                alt={driver.name} 
                                className="size-11 rounded-full object-cover border-2 border-primary/40 shadow-xs shrink-0" 
                              />
                            ) : (
                              <div className="size-11 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                <Bike className="size-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5 truncate">
                                {driver.name}
                                <span className="text-[10px] bg-emerald-500/15 text-emerald-600 font-bold px-2 py-0.5 rounded-full shrink-0">
                                  {hasRealDriverGps ? "Live GPS" : "Assigned"}
                                </span>
                              </h4>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {driver.vehicleInfo || driver.vehicle_info || "Delivery Partner"}
                                {hasRealDriverGps && <span className="text-primary font-bold"> • ~{remainingMinutes}m away</span>}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setChatRecipientType("DRIVER");
                                setChatOpen(true);
                                setUnreadCount(0);
                              }}
                              className="relative flex items-center gap-1.5 bg-secondary/80 hover:bg-secondary text-foreground font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-full border border-border/70 shadow-xs transition-all active:scale-95 cursor-pointer"
                              title="Chat with Driver"
                            >
                              <MessageSquare className="size-4 text-primary" />
                              <span>Chat</span>
                              {unreadCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 size-5 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center animate-bounce shadow-md">
                                  {unreadCount}
                                </span>
                              )}
                            </button>
                            <a 
                              href={`tel:${driver.phone || "0965755963"}`} 
                              className="flex items-center gap-1.5 bg-primary text-primary-foreground font-bold text-xs sm:text-sm px-4 py-2.5 rounded-full shadow-xs hover:bg-primary/90 transition-all active:scale-95 shrink-0"
                            >
                              <PhoneCall className="size-4" />
                              <span>Call</span>
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="px-4 py-3 bg-secondary/15 border-t border-border/40 flex flex-col items-center justify-center gap-2">
                          <span className="text-xs text-muted-foreground text-center">
                            {order.status === "READY" 
                              ? "Waiting for courier to accept & pick up delivery..." 
                              : (order.status === "ON_DELIVERY" || order.status === "OUT_FOR_DELIVERY")
                                ? "Courier is on the way to your delivery address 🛵"
                                : "Kitchen is preparing your order with fresh ingredients 🍕"}
                          </span>
                          
                          {(order.status === "CONFIRMED" || order.status === "PREPARING" || order.status === "READY") && (
                            <button
                              type="button"
                              onClick={() => {
                                setChatRecipientType("KITCHEN");
                                setChatOpen(true);
                                setUnreadCount(0);
                              }}
                              className="relative flex items-center justify-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs px-4 py-2 rounded-full border border-primary/20 shadow-xs transition-all active:scale-95 cursor-pointer mt-1"
                              title="Chat with Chef"
                            >
                              <MessageSquare className="size-3.5" />
                              <span>Chat with Chef</span>
                              {unreadCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 size-4 bg-red-500 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow-md">
                                  {unreadCount}
                                </span>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* RIGHT SIDE: Delivery Address & Order Summary (lg:col-span-5) */}
                <div className={cn("flex flex-col gap-4", !isCancelled ? "lg:col-span-5" : "lg:col-span-12")}>
                  
                  {/* Delivery Address */}
                  {address && (
                    <div>
                      <h3 className="font-serif text-sm sm:text-base font-bold flex items-center gap-2 text-foreground mb-2">
                        <Home className="size-4 text-primary" /> Delivery Address
                      </h3>
                      <div className="bg-secondary/20 rounded-2xl p-4 border border-border/40">
                        <p className="font-semibold text-xs sm:text-sm text-foreground">
                          {address.addressLine || address.address_line}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{address.city}</p>
                        {address.notes && (
                          <div className="text-xs bg-background/70 p-2.5 rounded-xl border border-border/40 mt-2.5">
                            <span className="font-semibold text-primary">Note:</span> {address.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Order Summary */}
                  <div>
                    <h3 className="font-serif text-sm sm:text-base font-bold flex items-center gap-2 text-foreground mb-2">
                      <Receipt className="size-4 text-primary" /> Order Summary
                    </h3>
                    <div className="bg-secondary/20 rounded-2xl p-4 border border-border/40">
                      <div className="space-y-2 mb-3 max-h-[180px] lg:max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                        {items.map(item => {
                          const dbProduct = products.find(p => String(p.id) === String(item.productId || item.product_id));
                          const displayImage = dbProduct ? getImageUrl(dbProduct.image) : "/images/library/pizza.jpg";
                          return (
                            <div 
                              key={item.id} 
                              className="flex justify-between items-center text-xs sm:text-sm gap-2 py-1.5"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="size-8 sm:size-9 rounded-lg bg-secondary overflow-hidden shrink-0 border border-border/50 flex items-center justify-center">
                                  {displayImage ? (
                                    <img src={displayImage} alt={item.productName || item.product_name} className="w-full h-full object-cover" />
                                  ) : (
                                    <ShoppingBag className="size-4 text-primary/60" />
                                  )}
                                </div>
                                <span className="font-semibold text-foreground truncate">
                                  {item.quantity}x {item.productName || item.product_name}
                                </span>
                              </div>
                              <span className="font-bold text-foreground whitespace-nowrap">
                                ${Number(item.lineTotal || item.line_total || 0).toFixed(2)}
                              </span>
                            </div>
                          );
                        })}
                        {items.length === 0 && (
                          <div className="text-center py-4 text-xs text-muted-foreground">
                            Loading items...
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-border/60 space-y-1.5 text-xs sm:text-sm">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Subtotal</span>
                          <span>${Number(order.subtotal || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Delivery Fee</span>
                          <span>${Number(order.deliveryFee || order.delivery_fee || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-foreground pt-2 text-sm sm:text-base border-t border-border/40">
                          <span>Total</span>
                          <span className="text-primary font-serif">${Number(order.total || 0).toFixed(2)}</span>
                        </div>
                      </div>
                      
                      {order.status === "PENDING" && (
                        <div className="mt-4 pt-3 border-t border-border/40 space-y-2">
                          <Button 
                            className="w-full bg-primary text-primary-foreground font-bold rounded-xl"
                            onClick={() => navigate(`/payment/${order.id}`, {
                              state: { total: order.total }
                            })}
                          >
                            Pay Now
                          </Button>
                          <Button 
                            variant="outline"
                            className="w-full text-destructive hover:text-destructive font-bold rounded-xl border-destructive/20 hover:bg-destructive/10"
                            onClick={handleCancelOrder}
                            disabled={cancelling}
                          >
                            {cancelling ? "Cancelling..." : "Cancel Order"}
                          </Button>
                          <p className="text-[10px] text-muted-foreground text-center pt-1">
                            ការបញ្ជាទិញរបស់អ្នកនឹងត្រូវបានចម្អិនបន្ទាប់ពីទូទាត់ប្រាក់រួចរាល់
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

              </div>

            </div>

          </div>
        </PageTransition>
      </main>

      {/* Live Driver Chat Modal */}
      {order && (
        <OrderChatModal
          open={chatOpen}
          onOpenChange={setChatOpen}
          orderId={order.id}
          orderNumber={order.order_number || order.id}
          currentUser={{
            type: "CUSTOMER",
            name: order.customer_name || address?.name || "Customer"
          }}
          recipient={{
            name: chatRecipientType === "DRIVER" ? (driver?.name || "Courier Partner") : "Flame & Crust Kitchen",
            photo: chatRecipientType === "DRIVER" ? (driver?.profilePhoto || driver?.profile_photo) : null,
            role: chatRecipientType === "DRIVER" ? (driver?.vehicleInfo || driver?.vehicle_info || "Courier Partner") : "Master Chef",
            phone: chatRecipientType === "DRIVER" ? (driver?.phone || "0965755963") : ""
          }}
        />
      )}
    </div>
  );
}
