import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { FloatingChatHead } from "@/components/food/floating-chat-head";
import { OrderChatModal, showChatNotificationToast } from "@/components/food/order-chat-modal";
import { list, get, getOrderMessages, API_URL } from "@/lib/api";

const EXCLUDED_PREFIXES = [
  "/admin",
  "/kitchen",
  "/driver",
  "/login",
  "/track" // Order tracking page already has its own dedicated tracking chat head
];

export function GlobalCustomerChatManager() {
  const location = useLocation();
  const [activeOrder, setActiveOrder] = useState(null);
  const [driver, setDriver] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastMsgText, setLastMsgText] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const lastKnownMsgIdRef = useRef(null);

  const isExcludedPage = EXCLUDED_PREFIXES.some(prefix => location.pathname.startsWith(prefix));

  // 1. Check for customer's ongoing delivery order
  useEffect(() => {
    if (isExcludedPage) return;

    const checkActiveDelivery = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      try {
        const stored = localStorage.getItem("customerAuth");
        if (!stored) {
          setActiveOrder(null);
          setDriver(null);
          return;
        }
        const customer = JSON.parse(stored);
        if (!customer || !customer.id) return;

        let orders = [];
        const res = await fetch(`${API_URL}/auth/customer-profile-data?customerId=${customer.id || ""}&phone=${encodeURIComponent(customer.phone || "")}&email=${encodeURIComponent(customer.email || "")}`).catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          orders = data.orders || [];
        }

        if (orders.length === 0) {
          const rawOrders = (await list("orders", { limit: 100, dir: "desc" }).catch(() => [])) || [];
          orders = Array.isArray(rawOrders) ? rawOrders : (rawOrders.items || rawOrders.content || []);
        }

        const deliveryOrder = orders.find(o => 
          (String(o.customer_id) === String(customer.id) || (customer.phone && o.customer_phone === customer.phone)) &&
          o.status !== "DELIVERED" &&
          o.status !== "CANCELLED"
        );

        if (deliveryOrder) {
          setActiveOrder(deliveryOrder);
          const driverId = deliveryOrder.driverId || deliveryOrder.driver_id;
          if (driverId) {
            const driverData = await get("drivers", driverId).catch(() => null);
            setDriver(driverData);
          } else {
            // Fallback to active driver
            const allDrivers = (await list("drivers").catch(() => [])) || [];
            const activeD = allDrivers.find(d => d.status === "ACTIVE" || d.status === "DELIVERING") || allDrivers[0];
            if (activeD) setDriver(activeD);
          }
        } else {
          setActiveOrder(null);
          setDriver(null);
        }
      } catch (e) {}
    };

    checkActiveDelivery();
    const interval = setInterval(checkActiveDelivery, 20000);
    const handleVis = () => { if (document.visibilityState === "visible") checkActiveDelivery(); };
    document.addEventListener("visibilitychange", handleVis);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVis);
    };
  }, [location.pathname, isExcludedPage]);

  // 2. Monitor background messages for active delivery
  useEffect(() => {
    if (!activeOrder || isExcludedPage) return;

    const checkMessages = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      try {
        const msgs = await getOrderMessages(activeOrder.id);
        if (Array.isArray(msgs) && msgs.length > 0) {
          const lastMsg = msgs[msgs.length - 1];
          if (lastKnownMsgIdRef.current !== null && lastMsg.id > lastKnownMsgIdRef.current) {
            if (lastMsg.sender_type !== "CUSTOMER") {
              // Incoming message from Driver!
              if (!chatOpen) {
                setLastMsgText(lastMsg.message);
                setDismissed(false);
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

    checkMessages();
    const chatInterval = setInterval(checkMessages, 6000);
    return () => clearInterval(chatInterval);
  }, [activeOrder, driver, chatOpen, isExcludedPage]);

  if (isExcludedPage || !activeOrder || dismissed) return null;

  return (
    <>
      {/* Draggable Android Floating Chat Head */}
      {!chatOpen && (
        <FloatingChatHead
          visible={true}
          photo={driver?.profilePhoto || driver?.profile_photo}
          name={driver?.name || "Delivery Partner"}
          role={driver?.vehicleInfo || "Delivery Partner"}
          lastMessage={lastMsgText}
          unreadCount={unreadCount}
          onClick={() => {
            setChatOpen(true);
            setUnreadCount(0);
          }}
          onDismiss={() => setDismissed(true)}
        />
      )}

      {/* Global Order Chat Modal */}
      {activeOrder && (
        <OrderChatModal
          open={chatOpen}
          onOpenChange={setChatOpen}
          orderId={activeOrder.id}
          orderNumber={activeOrder.order_number || activeOrder.id}
          currentUser={{
            type: "CUSTOMER",
            name: activeOrder.customer_name || "Customer"
          }}
          recipient={{
            name: driver?.name || "Delivery Partner",
            photo: driver?.profilePhoto || driver?.profile_photo,
            role: driver?.vehicleInfo || driver?.vehicle_info || "Delivery Partner",
            phone: driver?.phone || "0965755963"
          }}
        />
      )}
    </>
  );
}
