import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LogOut, MapPin, PhoneCall, CheckCircle2, Package, RefreshCw, Navigation, 
  Wifi, WifiOff, User, Bike, Clock, AlertCircle, Check, ChevronRight, 
  Sun, Moon, Map, Menu, ArrowLeft, ArrowRight, X, Phone, MessageSquare, 
  Star, ShieldCheck, DollarSign, Bell, Sparkles, Store, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { list, get, update, getDriverMe, updateDriverLocation, getOrderMessages, getActiveCall } from "@/lib/api";
import { OrderChatModal, showChatNotificationToast } from "@/components/food/order-chat-modal";
import { FloatingChatHead } from "@/components/food/floating-chat-head";
import { PushNotificationButton } from "@/components/common/PushNotificationButton";
import { PushNotificationPromptModal } from "@/components/common/PushNotificationPromptModal";
import { DriverBottomNav } from "@/components/food/driver-bottom-nav";
import { subscribeToPushNotifications } from "@/lib/push-notifications";
import { useTheme } from "@/components/theme-provider.jsx";
import { cn } from "@/lib/utils";

// Leaflet imports
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { getImageUrl } from "@/lib/food-api";

// Fix Leaflet's default icon path issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const STORE_COORDS = [11.5564, 104.9282]; // Flame & Crust central location
const LOCATION_INTERVAL = 5_000;

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && Number.isFinite(center[0]) && Number.isFinite(center[1])) {
      try {
        map.setView(center, map.getZoom(), { animate: true });
      } catch (e) {}
    }
  }, [center, map]);
  return null;
}

// ----------------- HEADER -----------------
function DriverHeader({ driver, locationActive, theme, toggleTheme, onRefresh, refreshing }) {
  return (
    <header className="shrink-0 pt-[max(0.65rem,env(safe-area-inset-top,0px))] bg-card border-b border-border/70 transition-colors z-40 relative shadow-xs">
      <div className="h-16 flex items-center justify-between px-3 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="size-9 sm:size-10 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 flex items-center justify-center shadow-md shadow-red-600/25 shrink-0 text-white">
            <Bike className="size-5 sm:size-5.5 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-nowrap">
              <h1 className="font-black text-sm sm:text-lg text-foreground tracking-tight leading-none truncate whitespace-nowrap">
                Flame & Crust
              </h1>
              <span className="hidden sm:inline-block text-[9px] sm:text-[10px] font-black uppercase px-1.5 py-0.5 bg-red-500/15 text-red-600 dark:text-red-400 rounded-md border border-red-500/30 shrink-0 whitespace-nowrap">
                Rider Hub
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground mt-0.5 flex items-center gap-1.5 truncate">
              <span className={cn("size-2 rounded-full inline-block shrink-0", locationActive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50")} />
              <span className="truncate">{locationActive ? "GPS Active • Ready for orders" : "GPS Connecting..."}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Refresh Button */}
          <button 
            onClick={onRefresh}
            disabled={refreshing}
            className={cn(
              "size-9 rounded-full bg-secondary dark:bg-card hover:bg-secondary dark:hover:bg-secondary text-muted-foreground dark:text-muted-foreground transition-all active:scale-95 border border-border/60 dark:border-white/5 flex items-center justify-center shrink-0 cursor-pointer",
              refreshing && "opacity-60 cursor-not-allowed"
            )}
            title="Refresh Feed"
          >
            <RefreshCw className={cn("size-4", refreshing && "animate-spin text-red-500")} />
          </button>

          {/* Push Notification Toggle */}
          <PushNotificationButton userType="DRIVER" userId={driver?.id} className="scale-90 origin-right sm:scale-100" />

          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme}
            className="size-9 rounded-full bg-secondary dark:bg-card hover:bg-secondary dark:hover:bg-secondary text-muted-foreground dark:text-muted-foreground transition-all active:scale-95 border border-border/60 dark:border-white/5 flex items-center justify-center shrink-0 cursor-pointer"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4" />}
          </button>

          <div className="w-px h-6 bg-secondary dark:bg-secondary hidden sm:block" />

          {/* Driver Profile */}
          <Link to="/driver/profile" className="flex items-center gap-2 group pl-0.5 shrink-0">
            <div className="hidden md:block text-right">
              <p className="text-xs font-black text-foreground dark:text-foreground group-hover:text-primary transition-colors truncate max-w-[100px]">
                {driver?.name || "Driver"}
              </p>
              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                ★ 4.9 • Online
              </p>
            </div>
            <div className="relative shrink-0">
              {driver?.profile_photo ? (
                <img src={driver.profile_photo} alt={driver?.name || "Driver"} className="size-9 rounded-full object-cover ring-2 ring-red-500/80 shadow-sm shrink-0" />
              ) : (
                <div className="size-9 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                  <User className="size-4.5" />
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 size-2.5 bg-emerald-500 rounded-full ring-2 ring-card" />
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}

// ----------------- TABS COMPONENT -----------------
function OrderTabs({ activeTab, setActiveTab, availableCount, activeCount }) {
  return (
    <div className="p-3.5 bg-card border-b border-border/70 shrink-0 z-20">
      <div className="flex p-1 bg-secondary dark:bg-card/80 rounded-2xl border border-border/60 dark:border-white/5">
        <button 
          onClick={() => setActiveTab("available")}
          className={cn(
            "flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all duration-200 flex items-center justify-center gap-2",
            activeTab === "available" 
              ? "bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md shadow-red-600/25" 
              : "text-muted-foreground hover:text-foreground dark:hover:text-foreground"
          )}
        >
          <span>New Requests</span>
          {availableCount > 0 && (
            <span className={cn(
              "text-[10px] font-black px-1.5 py-0.5 rounded-md",
              activeTab === "available" ? "bg-white/20 text-white" : "bg-red-500/15 text-red-600 dark:text-red-400"
            )}>
              {availableCount}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab("my_deliveries")}
          className={cn(
            "flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all duration-200 flex items-center justify-center gap-2",
            activeTab === "my_deliveries" 
              ? "bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md shadow-red-600/25" 
              : "text-muted-foreground hover:text-foreground dark:hover:text-foreground"
          )}
        >
          <span>My Deliveries</span>
          {activeCount > 0 && (
            <span className={cn(
              "text-[10px] font-black px-1.5 py-0.5 rounded-md",
              activeTab === "my_deliveries" ? "bg-white/20 text-white" : "bg-red-500/15 text-red-600 dark:text-red-400"
            )}>
              {activeCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

// ----------------- SCREEN 1: NEW RIDE/DELIVERY REQUEST CARD -----------------
function NewDeliveryRequestCard({ order, onAccept, onSelectDetails, isActionLoading }) {
  const rawItems = Array.isArray(order?.items)
    ? order.items
    : (typeof order?.items === "string" ? (() => { try { return JSON.parse(order.items); } catch { return []; } })() : []);
  const items = Array.isArray(rawItems) ? rawItems : [];
  const totalItems = items.reduce((acc, curr) => acc + (Number(curr?.quantity) || 1), 0);
  const customerName = order?.customer?.name || order?.address?.contact_name || "Customer";
  const customerAvatar = order?.customer?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(customerName)}&backgroundColor=fef08a&textColor=854d0e`;
  const fareEstimate = Number(order?.delivery_fee || 2.50).toFixed(2);
  const paymentMethod = order?.payment_method || "CASH";

  return (
    <div className="bg-card rounded-[28px] p-3.5 shadow-sm hover:shadow-md transition-all duration-300 border border-border/70 relative overflow-hidden group sm:p-5">
      
      {/* Top Banner Tag */}
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-border/50 dark:border-white/5 gap-2 sm:pb-3 sm:mb-3.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="size-2 rounded-full bg-red-500 animate-ping shrink-0" />
          <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-foreground truncate">
            New Delivery Request
          </h3>
          <span className={cn(
            "text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md",
            order.status === "READY" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" :
            order.status === "PREPARING" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30" :
            "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
          )}>
            {order.status === "READY" ? "Ready" : order.status === "PREPARING" ? "Cooking" : order.status}
          </span>
        </div>
        <span className="text-[10px] sm:text-[11px] font-black text-red-600 dark:text-red-400 bg-red-500/15 px-2 py-0.5 rounded-lg border border-red-500/30 shrink-0 truncate max-w-[130px] sm:max-w-none">
          #{order.order_number || String(order.id).slice(-8)}
        </span>
      </div>

      {/* Customer Preview Row */}
      <div className="flex items-center gap-2.5 mb-3 p-2.5 bg-secondary/40 dark:bg-card/70 rounded-2xl border border-border/50 dark:border-white/5 sm:gap-3.5 sm:mb-4 sm:p-3">
        <img 
          src={customerAvatar} 
          alt={customerName} 
          className="size-10 rounded-full object-cover ring-2 ring-red-500/80 shadow-sm shrink-0 sm:size-11" 
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-sm text-foreground dark:text-foreground truncate">
              {customerName}
            </h4>
            <span className="text-[10px] font-black text-amber-500 flex items-center gap-0.5">
              ★ 4.9
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {order.address?.address_line || "Phnom Penh delivery area"}
          </p>
        </div>
      </div>

      {/* Key Metrics Grid (ETA, Distance, Fare, Payment) */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {/* ETA Box */}
        <div className="bg-slate-950 dark:bg-black text-white p-3 rounded-2xl flex items-center gap-2.5 shadow-sm">
          <div className="p-1.5 bg-red-500/20 text-red-400 rounded-lg shrink-0">
            <Clock className="size-4 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 block leading-none">
              Est. Prep/ETA
            </span>
            <span className="text-sm font-black text-white mt-0.5 block leading-tight">
              15 - 20 MIN
            </span>
          </div>
        </div>

        {/* Distance Box */}
        <div className="bg-secondary/80 p-3 rounded-2xl flex items-center gap-2.5 border border-border/60 dark:border-white/5">
          <div className="p-1.5 bg-secondary text-foreground rounded-lg shrink-0">
            <Navigation className="size-4 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block leading-none">
              Distance
            </span>
            <span className="text-sm font-black text-foreground mt-0.5 block leading-tight">
              1.5 - 3.2 km
            </span>
          </div>
        </div>

        {/* Fare Estimate */}
        <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-2xl flex items-center gap-2.5 border border-emerald-200/60 dark:border-emerald-500/20">
          <div className="p-1.5 bg-emerald-500 text-white rounded-lg shrink-0">
            <DollarSign className="size-4 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block leading-none">
              Driver Earnings
            </span>
            <span className="text-base font-black text-emerald-700 dark:text-emerald-300 mt-0.5 block leading-tight">
              ${fareEstimate}
            </span>
          </div>
        </div>

        {/* Payment Type */}
        <div className="bg-secondary/40 dark:bg-card/70 p-3 rounded-2xl flex items-center gap-2.5 border border-border/60 dark:border-white/5">
          <div className="p-1.5 bg-slate-900 dark:bg-secondary text-white rounded-lg shrink-0">
            <Package className="size-4 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block leading-none">
              Payment
            </span>
            <span className="text-xs font-black text-foreground mt-0.5 block leading-tight truncate uppercase">
              {paymentMethod}
            </span>
          </div>
        </div>
      </div>

      {/* Food Items Preview Bar */}
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 mb-4">
        {items.map((item, idx) => (
          <div key={idx} className="relative shrink-0 flex items-center justify-center size-12 rounded-xl bg-secondary border border-border/70 dark:border-white/5 overflow-hidden shadow-xs">
            {item?.product_image ? (
              <img src={getImageUrl(item.product_image)} alt={item?.product_name} className="w-full h-full object-cover" />
            ) : (
              <Package className="size-5 text-muted-foreground/80" />
            )}
            {item?.quantity > 1 && (
              <span className="absolute bottom-0.5 right-0.5 bg-black/85 text-amber-400 text-[9px] font-black px-1.5 py-0.2 rounded-md">
                x{item.quantity}
              </span>
            )}
          </div>
        ))}
        {totalItems > 0 && (
          <span className="text-xs font-bold text-muted-foreground pl-1 shrink-0">
            {totalItems} items (${Number(order?.total_amount || 0).toFixed(2)})
          </span>
        )}
      </div>

      {/* Action Buttons: DECLINE & ACCEPT (matching Uber/Grab UI) */}
      <div className="flex gap-2.5 pt-1">
        <Button 
          variant="outline"
          onClick={() => onSelectDetails(order)}
          disabled={isActionLoading}
          className="flex-1 h-12 rounded-2xl font-black text-xs uppercase tracking-wider border-2 border-border/60 dark:border-white/10 hover:bg-secondary dark:hover:bg-secondary text-foreground active:scale-95 transition-all"
        >
          Details
        </Button>
        <Button 
          onClick={() => onAccept(order.id)}
          disabled={order.status !== "READY" || isActionLoading}
          className={cn(
            "flex-[2] h-12 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-md active:scale-95 transition-all border-none flex items-center justify-center gap-2",
            order.status === "READY" && !isActionLoading
              ? "bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white shadow-red-600/25 cursor-pointer"
              : "bg-secondary dark:bg-card text-muted-foreground border border-border/60 dark:border-white/5 cursor-not-allowed opacity-80"
          )}
        >
          {isActionLoading ? (
            <>
              <Loader2 className="size-4.5 animate-spin stroke-[2.5]" />
              <span>Accepting...</span>
            </>
          ) : order.status === "READY" ? (
            <>
              <Check className="size-4.5 stroke-[3]" />
              <span>Accept Order</span>
            </>
          ) : order.status === "PREPARING" ? (
            <>
              <Clock className="size-4 animate-spin text-amber-500" />
              <span className="text-[11px] sm:text-xs">Cooking (Wait for Ready)</span>
            </>
          ) : (
            <>
              <Clock className="size-4 text-blue-500" />
              <span className="text-[11px] sm:text-xs">Waiting Kitchen...</span>
            </>
          )}
        </Button>
      </div>

    </div>
  );
}

// ----------------- SCREEN 2 & 3: ACTIVE DELIVERY / PASSENGER & ORDER DETAILS -----------------
function ActiveDeliveryCard({ order, onUpdateStatus, onSelectDetails, onOpenChat, unreadCount = 0, isActionLoading, lastLocation }) {
  const rawItems = Array.isArray(order?.items)
    ? order.items
    : (typeof order?.items === "string" ? (() => { try { return JSON.parse(order.items); } catch { return []; } })() : []);
  const items = Array.isArray(rawItems) ? rawItems : [];
  const totalItems = items.reduce((acc, curr) => acc + (Number(curr?.quantity) || 1), 0);
  const customerName = order?.customer?.name || order?.address?.contact_name || "Customer";
  const customerPhone = order?.customer?.phone || order?.customer_phone || order?.address?.contact_phone || "";
  const customerAvatar = order?.customer?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(customerName)}&backgroundColor=fef08a&textColor=854d0e`;
  const fareEstimate = Number(order?.delivery_fee || 2.50).toFixed(2);

  const isEnRoute = order?.status === "OUT_FOR_DELIVERY" || order?.status === "ARRIVED";
  const isArrivedStatus = order?.status === "ARRIVED";
  const isReady = order?.status === "READY";

  const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const distToDestinationKm = (lastLocation?.lat && order?.address?.latitude && order?.address?.longitude)
    ? getDistanceKm(Number(lastLocation.lat), Number(lastLocation.lng), Number(order.address.latitude), Number(order.address.longitude))
    : null;

  const isNearDestination = isArrivedStatus || (distToDestinationKm !== null && distToDestinationKm <= 0.2);

  return (
    <div className="bg-card rounded-[28px] p-5 shadow-sm border-2 border-red-500/30 dark:border-red-500/20 relative overflow-hidden transition-all">
      
      {/* Active Trip Header */}
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-border/50 dark:border-white/5 gap-2 sm:pb-3 sm:mb-3.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="size-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-xs font-black uppercase tracking-wider text-foreground truncate">
            Active Delivery #{order.order_number || String(order.id).slice(-8)}
          </span>
        </div>
        <span className="text-[10px] sm:text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 sm:px-2.5 py-0.5 rounded-full shrink-0">
          Earn ${fareEstimate}
        </span>
      </div>

      {/* Customer Card with Call & Message Action */}
      <div className="bg-secondary/40 dark:bg-zinc-950 rounded-2xl p-3.5 mb-4 border border-border/50 dark:border-white/5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img 
            src={customerAvatar} 
            alt={customerName} 
            className="size-12 rounded-full object-cover ring-2 ring-red-500/80 shadow-sm shrink-0" 
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="font-black text-sm text-foreground dark:text-foreground truncate">
                {customerName}
              </h4>
              <span className="text-[10px] font-black text-amber-500">★ 4.9</span>
            </div>
            <p className="text-xs font-semibold text-muted-foreground truncate">
              {customerPhone ? customerPhone : "Customer phone on file"}
            </p>
          </div>
        </div>

        {/* Action Buttons: Chat, Phone & View */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onOpenChat(order)}
            className="relative size-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center shadow-sm active:scale-95 transition-transform cursor-pointer"
            title="Chat with Customer"
          >
            <MessageSquare className="size-4.5 stroke-[2.5]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 size-5 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center animate-bounce shadow-md ring-2 ring-card">
                {unreadCount}
              </span>
            )}
          </button>
          {customerPhone && (
            <a 
              href={`tel:${customerPhone}`} 
              className="size-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-sm active:scale-95 transition-transform"
              title="Call Customer"
            >
              <Phone className="size-4.5 stroke-[2.5]" />
            </a>
          )}
          <button
            type="button"
            onClick={() => onSelectDetails(order)}
            className="size-10 rounded-full bg-secondary text-foreground flex items-center justify-center hover:bg-secondary/70 transition-colors"
            title="View Details"
          >
            <Eye className="size-4.5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Delivery Pickup & Dropoff Address Route */}
      <div className="bg-secondary/30 dark:bg-card/70 rounded-2xl p-3.5 mb-4 border border-border/60 dark:border-white/5 space-y-3">
        {/* Pickup Pin */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 size-6 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <span className="size-2 rounded-full bg-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Pickup (Flame & Crust Kitchen)
            </span>
            <p className="text-xs font-bold text-foreground dark:text-foreground truncate">
              Central Kitchen, Street 302, BKK1, Phnom Penh
            </p>
          </div>
        </div>

        {/* Route Line */}
        <div className="ml-3 pl-3 border-l-2 border-dashed border-border dark:border-white/10 h-2" />

        {/* Dropoff Pin */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 size-6 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <MapPin className="size-3.5 stroke-[3]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Customer Destination
            </p>
            <p className="text-xs font-bold text-foreground dark:text-foreground truncate">
              {order.address?.address_line || "Customer Delivery Address"}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Flow Steps */}
      <div className="grid grid-cols-4 gap-1 mb-4 py-2 border-y border-border/50 dark:border-white/5 text-center">
        <div className={cn(
          "py-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-colors",
          order.status === "READY" || isEnRoute ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400 animate-pulse"
        )}>
          {order.status === "READY" || isEnRoute ? "1. Ready" : "1. In Kitchen"}
        </div>
        <div className={cn(
          "py-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider",
          isEnRoute ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" : "bg-secondary text-muted-foreground/80"
        )}>
          2. En Route
        </div>
        <div className={cn(
          "py-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all",
          isNearDestination ? "bg-purple-500/20 text-purple-600 dark:text-purple-300 font-extrabold animate-pulse" : "bg-secondary text-muted-foreground/80"
        )}>
          3. Arrived 📍
        </div>
        <div className="py-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-secondary text-muted-foreground/80">
          4. Delivered
        </div>
      </div>

      {/* Big Action Buttons Matching Uber/Grab UI */}
      <div className="space-y-2.5">
        {!isEnRoute ? (
          <>
            {order.status !== "READY" && (
              <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                <Clock className="size-4 shrink-0 animate-spin text-amber-500" />
                <span>Kitchen is cooking this order. Please head to restaurant.</span>
              </div>
            )}

            <a 
              href="https://www.google.com/maps/dir/?api=1&destination=11.5564,104.9282"
              target="_blank"
              rel="noopener noreferrer"
              className="h-12 w-full rounded-2xl bg-secondary hover:bg-secondary dark:hover:bg-secondary text-foreground font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
            >
              <Navigation className="size-4" />
              Navigate to Kitchen
            </a>

            <Button 
              onClick={() => onUpdateStatus(order.id, "OUT_FOR_DELIVERY")}
              disabled={order.status !== "READY" || isActionLoading}
              className={cn(
                "h-13 w-full rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg transition-all border-none flex items-center justify-center gap-2",
                order.status === "READY" && !isActionLoading
                  ? "bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white shadow-red-600/30 active:scale-98 cursor-pointer"
                  : "bg-secondary dark:bg-secondary text-muted-foreground/80 dark:text-muted-foreground cursor-not-allowed opacity-75 pointer-events-none"
              )}
            >
              {isActionLoading ? (
                <>
                  <Loader2 className="size-5 animate-spin stroke-[2.5]" />
                  <span>Starting Trip...</span>
                </>
              ) : (
                <>
                  <span>{order.status === "READY" ? "Pick Up & Start Trip" : order.status === "PREPARING" ? "Cooking in Kitchen (Waiting...)" : "Waiting for Kitchen..."}</span>
                  <ArrowRight className="size-4.5 stroke-[3]" />
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            {/* Arrival & Proximity Detection Banner */}
            {isNearDestination ? (
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold animate-in fade-in">
                <MapPin className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400 animate-bounce" />
                <div className="flex-1 min-w-0">
                  <span className="block font-black text-sm text-emerald-700 dark:text-emerald-300">
                    📍 បានមកដល់គោលដៅហើយ! (Arrived at Destination)
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    សូមទាក់ទងអតិថិជន និងប្រគល់ម្ហូបជូនពួកគាត់
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-700 dark:text-blue-300">
                <div className="flex items-center gap-2 min-w-0">
                  <Navigation className="size-4 shrink-0 text-blue-500 animate-pulse" />
                  <span className="truncate">កំពុងធ្វើដំណើរទៅកាន់គោលដៅ...</span>
                </div>
                {distToDestinationKm !== null && (
                  <span className="font-black text-blue-800 dark:text-blue-200 shrink-0">
                    {distToDestinationKm < 1 ? `${Math.round(distToDestinationKm * 1000)}m` : `${distToDestinationKm.toFixed(1)} km`}
                  </span>
                )}
              </div>
            )}

            <a 
              href={order.address?.latitude ? `https://www.google.com/maps/dir/?api=1&destination=${order.address.latitude},${order.address.longitude}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address?.address_line || "Phnom Penh")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-12 w-full rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition-all active:scale-98"
            >
              <Navigation className="size-4 stroke-[2.5]" />
              Open GPS Navigation
            </a>

            {!isArrivedStatus && !isNearDestination && (
              <Button
                variant="outline"
                onClick={() => onUpdateStatus(order.id, "ARRIVED")}
                disabled={isActionLoading}
                className="h-11 w-full rounded-2xl border-2 border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                <MapPin className="size-4 stroke-[2.5]" />
                <span>ខ្ញុំបានមកដល់គោលដៅហើយ (I've Arrived)</span>
              </Button>
            )}

            <Button 
              onClick={() => {
                if (!isNearDestination && distToDestinationKm !== null && distToDestinationKm > 0.3) {
                  const distText = distToDestinationKm < 1 ? `${Math.round(distToDestinationKm * 1000)} ម៉ែត្រ` : `${distToDestinationKm.toFixed(1)} km`;
                  if (!window.confirm(`អ្នកស្ថិតនៅចម្ងាយប្រហែល ${distText} ពីគោលដៅនៅឡើយ។ តើអ្នកពិតជាបានមកដល់ទីតាំងអតិថិជន និងប្រគល់ម្ហូបរួចរាល់ហើយមែនទេ?`)) {
                    return;
                  }
                }
                onUpdateStatus(order.id, "DELIVERED");
              }}
              disabled={isActionLoading}
              className={cn(
                "h-13 w-full rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg transition-all border-none flex items-center justify-center gap-2",
                isNearDestination
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30 active:scale-98 cursor-pointer"
                  : "bg-emerald-600/80 hover:bg-emerald-600 text-white shadow-md active:scale-98 cursor-pointer",
                isActionLoading && "opacity-75 cursor-not-allowed pointer-events-none"
              )}
            >
              {isActionLoading ? (
                <>
                  <Loader2 className="size-5 animate-spin stroke-[2.5]" />
                  <span>Completing Delivery...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-5 stroke-[2.5]" />
                  <span>{isNearDestination ? "Complete Delivery (ប្រគល់រួចរាល់)" : "Complete Delivery"}</span>
                </>
              )}
            </Button>
          </>
        )}
      </div>

    </div>
  );
}

// ----------------- MODAL: FULL ORDER / PASSENGER DETAILS SHEET (Screen 2 & 3) -----------------
function OrderDetailsModal({ order, driver, isOpen, onClose, onAccept, onUpdateStatus, isAvailable, isActionLoading }) {
  if (!isOpen || !order) return null;

  const [chatOpen, setChatOpen] = useState(false);
  const rawItems = Array.isArray(order?.items)
    ? order.items
    : (typeof order?.items === "string" ? (() => { try { return JSON.parse(order.items); } catch { return []; } })() : []);
  const items = Array.isArray(rawItems) ? rawItems : [];
  const totalItems = items.reduce((acc, curr) => acc + (Number(curr?.quantity) || 1), 0);
  const customerName = order?.customer?.name || order?.address?.contact_name || "Customer";
  const customerPhone = order?.customer?.phone || order?.customer_phone || order?.address?.contact_phone || "";
  const customerAvatar = order?.customer?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(customerName)}&backgroundColor=fef08a&textColor=854d0e`;
  const fareEstimate = Number(order?.delivery_fee || 2.50).toFixed(2);
  const paymentMethod = order?.payment_method || "CASH";

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-card w-full sm:max-w-lg rounded-t-[32px] sm:rounded-[32px] max-h-[92vh] flex flex-col overflow-hidden border border-border/60 dark:border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-300">
        
        {/* Top Header */}
        <div className="p-4 border-b border-border/50 dark:border-white/10 flex items-center justify-between shrink-0 bg-secondary/40 dark:bg-card/60 sm:p-5">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose} 
              disabled={isActionLoading}
              className="size-9 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/70 transition-colors"
            >
              <ArrowLeft className="size-4.5 stroke-[2.5]" />
            </button>
            <div>
              <h2 className="text-base sm:text-lg font-black text-foreground uppercase tracking-tight">
                {isAvailable ? "Accept Request?" : "Passenger & Order Details"}
              </h2>
              <p className="text-xs text-muted-foreground font-bold">
                Order #{order.order_number || order.id}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={isActionLoading}
            className="size-8 rounded-full bg-secondary dark:bg-card flex items-center justify-center text-muted-foreground hover:text-foreground dark:hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar sm:p-5 sm:space-y-5">
          
          {/* Customer Profile Card */}
          <div className="bg-secondary/40 rounded-2xl p-3 border border-border/60 dark:border-white/5 flex items-center justify-between gap-3 sm:p-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <img 
                src={customerAvatar} 
                alt={customerName} 
                className="size-13 rounded-full object-cover ring-3 ring-amber-400 shadow-sm shrink-0" 
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-black text-base text-foreground dark:text-foreground truncate">
                    {customerName}
                  </h3>
                  <span className="text-xs font-black text-amber-500">★ 4.9</span>
                </div>
                <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                  {customerPhone || "Flame & Crust Valued Member"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                className="size-11 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
                title="Chat with Customer"
              >
                <MessageSquare className="size-5 stroke-[2.5]" />
              </button>
              {customerPhone && (
                <a 
                  href={`tel:${customerPhone}`} 
                  className="size-11 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 active:scale-95 transition-all shrink-0"
                  title="Call Customer"
                >
                  <Phone className="size-5 stroke-[2.5]" />
                </a>
              )}
            </div>
          </div>

          {/* Pickup & Drop Route Information */}
          <div className="bg-secondary/40 rounded-2xl p-4 border border-border/60 dark:border-white/5 space-y-4">
            
            {/* Pickup */}
            <div className="flex items-start gap-3">
              <div className="size-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 ring-4 ring-emerald-500/20">
                <Store className="size-4 stroke-[2.5]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Pickup Location
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground/80">0.0 km</span>
                </div>
                <p className="text-sm font-bold text-foreground dark:text-foreground">
                  Flame & Crust Restaurant
                </p>
                <p className="text-xs text-muted-foreground">
                  Street 240, Phnom Penh (Central Kitchen)
                </p>
              </div>
            </div>

            <div className="w-0.5 h-5 bg-secondary dark:bg-secondary ml-3.5" />

            {/* Drop Location */}
            <div className="flex items-start gap-3">
              <div className="size-7 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0 mt-0.5 ring-4 ring-red-500/20">
                <MapPin className="size-4 stroke-[2.5]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-red-500">
                    Drop Location
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground/80">~2.4 km</span>
                </div>
                <p className="text-sm font-bold text-foreground dark:text-foreground">
                  {order.address?.label || "Customer Location"}
                </p>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-0.5">
                  {order.address?.address_line || "No street address specified"}
                </p>
              </div>
            </div>

          </div>

          {/* Pricing & Earnings Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/40 rounded-2xl p-3.5 border border-border/60 dark:border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 block mb-1">
                Estimated Time
              </span>
              <p className="text-base font-black text-foreground">
                15 - 20 Mins
              </p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl p-3.5 border border-emerald-200/60 dark:border-emerald-500/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-1">
                Delivery Fee (Yours)
              </span>
              <p className="text-base font-black text-emerald-600 dark:text-emerald-300">
                ${fareEstimate}
              </p>
            </div>
          </div>

          {/* Product Items Details List */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="font-black text-xs uppercase tracking-wider text-muted-foreground/80 dark:text-muted-foreground">
                Order Items ({totalItems})
              </h4>
              <span className="text-xs font-black text-foreground">
                Total: ${Number(order.total_amount || 0).toFixed(2)}
              </span>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2.5 bg-secondary/40/60 rounded-2xl border border-border/50 dark:border-white/5">
                  <div className="size-12 rounded-xl bg-secondary overflow-hidden shrink-0 border border-border/60 dark:border-white/5">
                    {item?.product_image ? (
                      <img src={getImageUrl(item.product_image)} alt={item?.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="size-5 text-muted-foreground m-auto" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-xs sm:text-sm text-foreground dark:text-foreground truncate">
                      {item?.product_name || `Item #${item?.product_id}`}
                    </h5>
                    <p className="text-[11px] text-muted-foreground">
                      Qty: <span className="font-bold text-foreground dark:text-foreground">{item?.quantity || 1}</span> • ${Number(item?.price || 0).toFixed(2)}
                    </p>
                  </div>
                  <span className="font-black text-xs text-foreground dark:text-foreground shrink-0">
                    ${(Number(item?.price || 0) * (item?.quantity || 1)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Bottom CTA */}
        <div className="p-5 border-t border-border/50 dark:border-white/10 shrink-0 bg-card">
          {isAvailable ? (
            <Button 
              onClick={async () => {
                await onAccept(order.id);
                onClose();
              }}
              disabled={order.status !== "READY" || isActionLoading}
              className={cn(
                "w-full h-14 rounded-2xl font-black text-base uppercase tracking-wider shadow-lg active:scale-98 transition-all border-none flex items-center justify-center gap-2",
                order.status === "READY" && !isActionLoading
                  ? "bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white shadow-red-600/30 cursor-pointer"
                  : "bg-secondary dark:bg-card text-muted-foreground border border-border/60 dark:border-white/5 cursor-not-allowed opacity-80"
              )}
            >
              {isActionLoading ? (
                <>
                  <Loader2 className="size-5 animate-spin stroke-[2.5]" />
                  <span>Accepting Delivery...</span>
                </>
              ) : order.status === "READY" ? (
                <>
                  <span>Accept Ride & Delivery</span>
                  <ArrowRight className="size-5 stroke-[3]" />
                </>
              ) : order.status === "PREPARING" ? (
                <>
                  <Clock className="size-5 animate-spin text-amber-500" />
                  <span>Cooking in Kitchen (Wait for Ready)</span>
                </>
              ) : (
                <>
                  <Clock className="size-5 text-blue-500" />
                  <span>Waiting for Kitchen...</span>
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={onClose}
              disabled={isActionLoading}
              className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 text-white font-black text-sm uppercase tracking-wider active:scale-98 transition-all shadow-lg shadow-red-600/25 border-none sm:h-13"
            >
              Close
            </Button>
          )}
        </div>

        {/* Order Live Chat Modal */}
        <OrderChatModal
          open={chatOpen}
          onOpenChange={setChatOpen}
          orderId={order.id}
          orderNumber={order.order_number || order.id}
          currentUser={{
            type: "DRIVER",
            name: driver?.name || "Driver",
            id: driver?.id
          }}
          recipient={{
            name: customerName,
            photo: customerAvatar,
            role: "Customer",
            phone: customerPhone
          }}
        />

      </div>
    </div>
  );
}

// ----------------- EMPTY STATE -----------------
function EmptyState({ tab, onRefresh }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-card-fade-in">
      <div className="size-20 bg-red-500/15 rounded-full flex items-center justify-center mb-5 border border-red-500/30 text-red-600 dark:text-red-400 shadow-inner">
        {tab === "available" ? <Package className="size-9 stroke-[2.5]" /> : <Bike className="size-9 stroke-[2.5]" />}
      </div>
      <h3 className="text-xl font-black text-foreground mb-1.5 tracking-tight">
        {tab === "available" ? "No new requests right now" : "No active deliveries"}
      </h3>
      <p className="text-muted-foreground text-xs sm:text-sm max-w-[280px] leading-relaxed mb-6 font-semibold">
        {tab === "available" 
          ? "Stay online! New orders from Flame & Crust kitchen will pop up here instantly." 
          : "Pick an available delivery from the New Requests tab to get started."}
      </p>
      {tab === "available" && (
        <Button 
          onClick={onRefresh} 
          className="rounded-2xl h-12 px-6 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white active:scale-95 transition-all font-black text-xs uppercase tracking-wider border-none shadow-md shadow-red-600/20 flex items-center gap-2"
        >
          <RefreshCw className="size-4 stroke-[2.5]" />
          Refresh Now
        </Button>
      )}
    </div>
  );
}

// ----------------- MAIN COMPONENT -----------------
// Memoized wrappers — the dashboard re-renders on GPS/chat/order polling,
// so cards & tabs must only re-render when their own props actually change.
const MemoOrderTabs = memo(OrderTabs);
const MemoNewDeliveryRequestCard = memo(NewDeliveryRequestCard);
const MemoActiveDeliveryCard = memo(ActiveDeliveryCard);

export default function DriverDashboardPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const toggleTheme = useCallback((e) => {
    setTheme(theme === "dark" ? "light" : "dark", e);
  }, [theme, setTheme]);

  const [driver, setDriver] = useState(() => {
    try {
      const auth = localStorage.getItem("driverAuth");
      return auth ? JSON.parse(auth) : null;
    } catch (e) {
      return null;
    }
  });

  // Auto-sync driver push subscription token to backend if notification permission is already granted
  useEffect(() => {
    if (driver?.id && typeof window !== 'undefined' && window.Notification && window.Notification.permission === 'granted') {
      subscribeToPushNotifications({ userType: "DRIVER", userId: driver.id }).catch(() => {});
    }
  }, [driver?.id]);
  const [activeTab, setActiveTab] = useState("available"); // "available" or "my_deliveries"
  const [mobileView, setMobileView] = useState("list"); // "list" or "map"

  const [myOrders, setMyOrders] = useState([]);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [selectedChatOrder, setSelectedChatOrder] = useState(null);
  const [driverChatHead, setDriverChatHead] = useState(null);
  const [unreadMap, setUnreadMap] = useState({});
  const lastKnownDriverMsgsRef = useRef({});
  const chatInFlightRef = useRef(false);
  const ordersInFlightRef = useRef(false);

  // Background monitoring for incoming customer messages
  useEffect(() => {
    if (!driver || myOrders.length === 0) return;
    const checkDriverIncomingMessages = async () => {
      // Skip when the tab is hidden or a previous poll is still running —
      // stacking polls is what made the dashboard feel laggy.
      if (chatInFlightRef.current || document.visibilityState === "hidden") return;
      chatInFlightRef.current = true;
      try {
      for (const ord of myOrders) {
        try {
          const msgs = await getOrderMessages(ord.id);
          if (Array.isArray(msgs) && msgs.length > 0) {
            const lastMsg = msgs[msgs.length - 1];
            const prevLastId = lastKnownDriverMsgsRef.current[ord.id];
            if (prevLastId !== undefined && lastMsg.id > prevLastId) {
              if (lastMsg.sender_type !== "DRIVER") {
                // Incoming message from Customer!
                const isCurrentlyViewing = selectedChatOrder && String(selectedChatOrder.id) === String(ord.id);
                if (!isCurrentlyViewing) {
                  setUnreadMap(prev => ({ ...prev, [ord.id]: (prev[ord.id] || 0) + 1 }));
                  setDriverChatHead({
                    order: ord,
                    message: lastMsg.message,
                    timestamp: Date.now()
                  });
                  const custName = ord.customer?.name || (lastMsg.sender_name && lastMsg.sender_name !== "Customer" ? lastMsg.sender_name : null) || ord.address?.contact_name || "Customer";
                  const custPhoto = ord.customer?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(custName)}&backgroundColor=f87171&textColor=ffffff`;
                  showChatNotificationToast({
                    senderName: custName,
                    message: lastMsg.message,
                    photo: custPhoto,
                    onReply: () => {
                      setSelectedChatOrder(ord);
                      setUnreadMap(prev => ({ ...prev, [ord.id]: 0 }));
                      setDriverChatHead(null);
                    }
                  });
                }
              }
            }
            lastKnownDriverMsgsRef.current[ord.id] = lastMsg.id;
          }
        } catch (e) {}
      }
      } finally {
        chatInFlightRef.current = false;
      }
    };

    checkDriverIncomingMessages();
    const chatInterval = setInterval(checkDriverIncomingMessages, 5000);
    return () => clearInterval(chatInterval);
  }, [driver, myOrders, selectedChatOrder]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [locationActive, setLocationActive] = useState(false);
  const [lastLocation, setLastLocation] = useState(null);
  const watchIdRef = useRef(null);
  const locationTimerRef = useRef(null);
  const lastSentLocRef = useRef(null);

  // ── Auth Check ──
  useEffect(() => {
    const auth = localStorage.getItem("driverAuth");
    if (!auth) {
      navigate("/login");
      return;
    }
    try {
      const parsed = JSON.parse(auth);
      if (!parsed.token) {
        navigate("/login");
        return;
      }
      getDriverMe().then(freshDriver => {
        setDriver(freshDriver);
      }).catch(() => {
        localStorage.removeItem("driverAuth");
        navigate("/login");
      });
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  // ── Real-Time Location Tracking ──
  const sendLocation = useCallback((lat, lng) => {
    // Keep the backend heartbeat, but only trigger a React re-render when the
    // driver actually moved (~3m). Re-rendering the Leaflet map every 5s while
    // stationary is what made taps feel sluggish.
    updateDriverLocation(lat, lng).catch(() => {});
    const prev = lastSentLocRef.current;
    const moved = !prev
      || Math.abs(prev.lat - lat) > 0.00003
      || Math.abs(prev.lng - lng) > 0.00003;
    if (moved) {
      lastSentLocRef.current = { lat, lng };
      setLastLocation({ lat, lng, time: new Date() });
    }
  }, []);

  useEffect(() => {
    if (!driver) return;
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLocationActive(true);
        sendLocation(pos.coords.latitude, pos.coords.longitude);
      },
      () => setLocationActive(false),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 5000 }
    );
    watchIdRef.current = watchId;

    const timer = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => sendLocation(pos.coords.latitude, pos.coords.longitude),
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    }, LOCATION_INTERVAL);
    locationTimerRef.current = timer;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        sendLocation(pos.coords.latitude, pos.coords.longitude);
        setLocationActive(true);
      },
      () => setLocationActive(false),
      { enableHighAccuracy: true }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(timer);
    };
  }, [driver, sendLocation]);

  // ── Fetch Orders & Real Customer / Product Details ──
  const fetchAllData = async () => {
    if (!driver) return;
    if (ordersInFlightRef.current) return;
    ordersInFlightRef.current = true;
    try {
      const allOrders = await list("orders", { limit: 200, sort: "id", dir: "desc" });
      
      const isDeliveryOrder = (o) => !o.order_type || o.order_type.toUpperCase() === "DELIVERY";

      const assigned = allOrders.filter(o => 
        (String(o.driver_id) === String(driver.id) || String(o.driverId) === String(driver.id)) && 
        o.status !== "DELIVERED" && 
        o.status !== "CANCELLED"
      );
      
      const available = allOrders.filter(o => 
        !o.driver_id && 
        isDeliveryOrder(o) &&
        ["PENDING", "CONFIRMED", "PREPARING", "READY"].includes(o.status)
      );
      
      const [allAddresses, allCustomers, allOrderItems, allProducts] = await Promise.all([
        list("addresses", { limit: -1 }).catch(() => []),
        list("customers", { limit: -1 }).catch(() => []),
        list("order_items", { limit: -1 }).catch(() => []),
        list("products", { limit: -1 }).catch(() => [])
      ]);

      const enrich = (ordersList) => ordersList.map((o) => {
        const address = allAddresses.find(a => String(a.id) === String(o.address_id)) || null;
        const customer = allCustomers.find(c => String(c.id) === String(o.customer_id)) || null;
        const items = allOrderItems.filter(item => String(item.order_id) === String(o.id)).map(item => {
          const product = allProducts.find(p => String(p.id) === String(item.product_id));
          return {
            ...item,
            product_name: product?.name || item.product_name,
            product_image: product?.image || null
          };
        });
        return { ...o, address, customer, items };
      });
      
      const enrichedAssigned = enrich(assigned).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const enrichedAvailable = enrich(available).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      setMyOrders(enrichedAssigned);
      setAvailableOrders(enrichedAvailable);

      // Automatically switch to active deliveries if driver has active orders
      if (enrichedAssigned.length > 0 && activeTab === "available" && enrichedAvailable.length === 0) {
        setActiveTab("my_deliveries");
      }
    } catch (err) {
      toast.error("Failed to load delivery orders");
    } finally {
      ordersInFlightRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (driver) fetchAllData();
    const interval = setInterval(() => {
      // Pause background polling while the tab is hidden to save CPU & battery
      if (driver && document.visibilityState === "visible") fetchAllData();
    }, 5000);
    return () => clearInterval(interval);
  }, [driver]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await fetchAllData();
    // Guaranteed reset — fetchAllData can bail early via the in-flight guard
    setRefreshing(false);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    if (actionLoadingId) return;
    setActionLoadingId(orderId);

    // ⚡ Instant Optimistic Update
    setMyOrders(prev => {
      if (newStatus === "DELIVERED" || newStatus === "CANCELLED") {
        return prev.filter(o => String(o.id) !== String(orderId));
      }
      return prev.map(o => String(o.id) === String(orderId) ? { ...o, status: newStatus } : o);
    });

    if (selectedOrderDetails && String(selectedOrderDetails.id) === String(orderId)) {
      if (newStatus === "DELIVERED" || newStatus === "CANCELLED") {
        setSelectedOrderDetails(null);
      } else {
        setSelectedOrderDetails(prev => ({ ...prev, status: newStatus }));
      }
    }

    try {
      await update("orders", orderId, { status: newStatus });
      toast.success(`Status updated: ${newStatus.replace(/_/g, " ")}`);
      fetchAllData();
    } catch (err) {
      toast.error("Failed to update status");
      fetchAllData();
    } finally {
      setActionLoadingId(null);
    }
  };

  const acceptOrder = async (orderId) => {
    if (actionLoadingId) return;

    const targetOrder = availableOrders.find(o => String(o.id) === String(orderId)) || selectedOrderDetails;
    if (targetOrder && targetOrder.status !== "READY") {
      toast.error("ម្ហូបមិនទាន់រួចរាល់ទេ! សូមរង់ចាំផ្ទះបាយធ្វើដល់ READY សិន ទើបអាចទទួលដឹកបាន។");
      return;
    }

    setActionLoadingId(orderId);

    // ⚡ Instant Optimistic Update: Transfer from Available to My Deliveries immediately!
    if (targetOrder) {
      const acceptedOrder = {
        ...targetOrder,
        driver_id: driver.id,
      };
      setAvailableOrders(prev => prev.filter(o => String(o.id) !== String(orderId)));
      setMyOrders(prev => [acceptedOrder, ...prev.filter(o => String(o.id) !== String(orderId))]);
    }

    // Switch view to My Deliveries immediately
    setActiveTab("my_deliveries");
    setSelectedOrderDetails(null);

    try {
      // Only assign driver_id — preserve the actual kitchen preparation status!
      await update("orders", orderId, { driver_id: driver.id });
      toast.success("Delivery accepted! Assigned to you.");
      fetchAllData();
    } catch (err) {
      toast.error("Failed to accept delivery");
      fetchAllData();
    } finally {
      setActionLoadingId(null);
    }
  };

  // Stable handler identities — inline arrow props would defeat the memoized
  // cards and re-render every card on each 5s/10s poll.
  const acceptOrderRef = useRef(acceptOrder);
  acceptOrderRef.current = acceptOrder;
  const updateStatusRef = useRef(updateOrderStatus);
  updateStatusRef.current = updateOrderStatus;

  const stableAcceptOrder = useCallback((id) => acceptOrderRef.current(id), []);
  const stableUpdateStatus = useCallback((id, status) => updateStatusRef.current(id, status), []);
  const handleSelectDetails = useCallback((o) => setSelectedOrderDetails(o), []);
  const handleOpenChat = useCallback((o) => {
    setSelectedChatOrder(o);
    setUnreadMap(prev => ({ ...prev, [o.id]: 0 }));
  }, []);

  if (!driver) return null;

  const currentDisplayOrders = activeTab === "available" ? availableOrders : myOrders;

  return (
    <div className="w-full h-[100dvh] flex flex-col font-sans transition-colors selection:bg-amber-200 dark:selection:bg-amber-900/50 bg-secondary/40 dark:bg-zinc-950 overflow-hidden">
      
      {/* Header */}
      <DriverHeader 
        driver={driver} 
        locationActive={locationActive} 
        theme={theme}
        toggleTheme={toggleTheme}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      {/* Main Full-Width Split Layout */}
      <main className="flex-1 flex flex-col lg:flex-row w-full overflow-hidden relative z-10">
        
        {/* Left Column (Orders List) - 38% on Desktop */}
        <div className={cn(
          "w-full lg:w-[420px] xl:w-[460px] h-full flex flex-col bg-secondary/50 dark:bg-zinc-950 border-r border-border/70 transition-colors z-20 shadow-lg",
          mobileView === "map" && "hidden lg:flex"
        )}>
          
          <MemoOrderTabs 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            availableCount={availableOrders.length}
            activeCount={myOrders.length}
          />

          <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar relative">
            {loading ? (
              <div className="space-y-4">
                {[0, 1].map(i => (
                  <div key={i} className="h-64 rounded-[28px] border border-border/60 bg-gradient-to-r from-secondary via-secondary/70 to-secondary dark:from-zinc-900 dark:via-zinc-800/60 dark:to-zinc-900 bg-[length:200%_100%] animate-[shimmer_1.6s_ease-in-out_infinite]" />
                ))}
              </div>
            ) : currentDisplayOrders.length === 0 ? (
              <EmptyState tab={activeTab} onRefresh={handleRefresh} />
            ) : (
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="space-y-4 pb-28 lg:pb-6"
                >
                  {currentDisplayOrders.map(order => (
                    activeTab === "available" ? (
                      <MemoNewDeliveryRequestCard 
                        key={order.id} 
                        order={order} 
                        onAccept={stableAcceptOrder}
                        onSelectDetails={handleSelectDetails}
                        isActionLoading={actionLoadingId === order.id}
                      />
                    ) : (
                      <MemoActiveDeliveryCard 
                        key={order.id} 
                        order={order} 
                        onUpdateStatus={stableUpdateStatus}
                        onSelectDetails={handleSelectDetails}
                        onOpenChat={handleOpenChat}
                        unreadCount={unreadMap[order.id] || 0}
                        isActionLoading={actionLoadingId === order.id}
                        lastLocation={lastLocation}
                      />
                    )
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Right Column (Live Route Map) - 62% on Desktop */}
        <div className={cn(
          "flex-1 h-full w-full relative bg-secondary dark:bg-card",
          mobileView === "list" && "hidden lg:block"
        )}>
          {/* Refresh Action Overlay */}
          <div className="absolute top-5 right-5 z-[400] hidden lg:block">
            <Button 
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-2xl h-11 px-4 bg-white/95 dark:bg-card/95 backdrop-blur-md border-border/70 text-foreground dark:text-foreground font-black text-xs uppercase tracking-wider shadow-lg hover:bg-white dark:hover:bg-card active:scale-95 transition-all"
            >
              <RefreshCw className={cn("size-3.5 mr-2 stroke-[2.5]", refreshing && "animate-spin text-amber-500")} />
              Refresh Map
            </Button>
          </div>

          {/* Active Orders Count Badge on Map */}
          <div className="absolute top-5 left-5 z-[400] pointer-events-none">
            <div className="px-4 py-2 rounded-2xl bg-white/95 dark:bg-card/95 backdrop-blur-md border border-border/70 shadow-lg flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-black text-foreground uppercase tracking-wider">
                {myOrders.length} Active • {availableOrders.length} Available
              </span>
            </div>
          </div>

          <MapContainer 
            center={
              lastLocation && Number.isFinite(lastLocation.lat) && Number.isFinite(lastLocation.lng)
                ? [lastLocation.lat, lastLocation.lng]
                : STORE_COORDS
            } 
            zoom={14} 
            className="w-full h-full z-0" 
            zoomControl={false}
          >
            {/* Swap tiles instead of remounting the whole map (key={theme} forced
                a full Leaflet teardown + re-init, which froze the UI on toggle) */}
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Store Central Kitchen Marker */}
            <Marker position={STORE_COORDS}>
              <Popup className="font-sans font-bold text-xs">
                🍕 Flame & Crust Central Store
              </Popup>
            </Marker>

            {/* Driver Location Marker */}
            {lastLocation && Number.isFinite(lastLocation.lat) && Number.isFinite(lastLocation.lng) && (
              <Marker position={[lastLocation.lat, lastLocation.lng]}>
                <Popup className="font-sans font-bold text-xs">
                  🛵 Your Location (Driver)
                </Popup>
              </Marker>
            )}
            
            {/* Plot customer drop locations */}
            {myOrders.map(order => {
              if (order?.address?.latitude && order?.address?.longitude) {
                const lat = Number(order.address.latitude);
                const lng = Number(order.address.longitude);
                if (Number.isFinite(lat) && Number.isFinite(lng)) {
                  return (
                    <Marker key={order.id} position={[lat, lng]}>
                      <Popup className="font-sans">
                        <div className="p-1">
                          <p className="font-black text-xs">#{order.order_number || order.id} • {order.customer?.name || "Customer"}</p>
                          <p className="text-[11px] text-muted-foreground">{order.address?.address_line}</p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                }
              }
              return null;
            })}

            {lastLocation && Number.isFinite(lastLocation.lat) && Number.isFinite(lastLocation.lng) && (
              <MapUpdater center={[lastLocation.lat, lastLocation.lng]} />
            )}
          </MapContainer>
        </div>
      </main>

      {/* Floating Bottom Dock for Mobile */}
      <DriverBottomNav
        mobileView={mobileView}
        onSelectMobileView={setMobileView}
      />

      {/* Full Screen / Sheet Details Modal */}
      <OrderDetailsModal 
        order={selectedOrderDetails}
        driver={driver}
        isOpen={Boolean(selectedOrderDetails)}
        onClose={() => setSelectedOrderDetails(null)}
        onAccept={acceptOrder}
        onUpdateStatus={updateOrderStatus}
        isAvailable={activeTab === "available"}
        isActionLoading={Boolean(selectedOrderDetails && actionLoadingId === selectedOrderDetails.id)}
      />

      {/* Live Order Chat Modal for Driver */}
      {selectedChatOrder && (
        <OrderChatModal
          open={Boolean(selectedChatOrder)}
          onOpenChange={(open) => {
            if (!open) setSelectedChatOrder(null);
          }}
          orderId={selectedChatOrder.id}
          orderNumber={selectedChatOrder.order_number || selectedChatOrder.id}
          currentUser={{
            type: "DRIVER",
            name: driver?.name || "Driver",
            id: driver?.id
          }}
          recipient={{
            name: selectedChatOrder.customer?.name || selectedChatOrder.address?.contact_name || "Customer",
            photo: selectedChatOrder.customer?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedChatOrder.customer?.name || "Customer")}&backgroundColor=f87171&textColor=ffffff`,
            role: "Customer",
            phone: selectedChatOrder.customer?.phone || selectedChatOrder.customer_phone
          }}
        />
      )}

      {/* Automatic Push Notification Prompt Modal */}
      <PushNotificationPromptModal userType="DRIVER" userId={driver?.id} autoOpenDelay={800} />

    </div>
  );
}
