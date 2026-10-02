import { useState, useEffect, useRef } from "react";
import { getActiveCall, list, get } from "@/lib/api";
import { OnlineCallModal } from "./online-call-modal";

export function GlobalActiveCallManager() {
  const [activeCallState, setActiveCallState] = useState(null); // { orderId, recipient, callerType, currentUser, isIncoming }
  const [callOpen, setCallOpen] = useState(false);
  const isPollingRef = useRef(false);

  // 1. Listen for manual trigger from anywhere (e.g. Chat Modal Call button)
  useEffect(() => {
    const handleStartCall = (e) => {
      const detail = e.detail;
      if (!detail || !detail.orderId) return;
      setActiveCallState({
        orderId: detail.orderId,
        recipient: detail.recipient || { name: "Partner", role: "Delivery Partner" },
        callerType: detail.callerType || "CUSTOMER",
        currentUser: detail.currentUser || { name: "User" },
        isIncoming: false
      });
      setCallOpen(true);
    };

    window.addEventListener("startOnlineCall", handleStartCall);
    return () => window.removeEventListener("startOnlineCall", handleStartCall);
  }, []);

  useEffect(() => {
    const checkGlobalActiveCalls = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (callOpen) return;
      if (isPollingRef.current) return;
      isPollingRef.current = true;

      try {
        // A. Check for Customer
        const customerAuth = localStorage.getItem("customerAuth");
        const driverAuth = localStorage.getItem("driverAuth");
        if (!customerAuth && !driverAuth) return;

        if (customerAuth) {
          const cust = JSON.parse(customerAuth);
          let cachedOrders = [];
          try {
            const stored = localStorage.getItem("flame_active_orders_cache");
            if (stored) cachedOrders = JSON.parse(stored);
          } catch (e) {}

          if (cachedOrders.length > 0) {
            for (const ord of cachedOrders) {
            const res = await getActiveCall(ord.id);
            if (res.active && res.call) {
              const status = res.call.status;
              const isReceiver = String(res.call.receiver_type).toUpperCase() === "CUSTOMER";
              const isCaller = String(res.call.caller_type).toUpperCase() === "CUSTOMER";

              if (status === "RINGING" && isReceiver) {
                // Find driver info if available
                let driver = null;
                const driverId = ord.driverId || ord.driver_id;
                if (driverId) {
                  driver = await get("drivers", driverId).catch(() => null);
                }

                setActiveCallState({
                  orderId: ord.id,
                  recipient: {
                    name: res.call.caller_name || driver?.name || "Delivery Partner",
                    role: "Delivery Partner",
                    photo: driver?.profilePhoto || driver?.profile_photo || ""
                  },
                  callerType: "CUSTOMER",
                  currentUser: { name: cust.name || "Customer" },
                  isIncoming: true
                });
                setCallOpen(true);
                break;
              } else if (status === "ACCEPTED" && (isReceiver || isCaller)) {
                if (!callOpen) {
                  let driver = null;
                  const driverId = ord.driverId || ord.driver_id;
                  if (driverId) {
                    driver = await get("drivers", driverId).catch(() => null);
                  }

                  setActiveCallState({
                    orderId: ord.id,
                    recipient: {
                      name: isCaller ? (res.call.receiver_name || driver?.name || "Delivery Partner") : (res.call.caller_name || driver?.name || "Delivery Partner"),
                      role: "Delivery Partner",
                      photo: driver?.profilePhoto || driver?.profile_photo || ""
                    },
                    callerType: "CUSTOMER",
                    currentUser: { name: cust.name || "Customer" },
                    isIncoming: false
                  });
                  setCallOpen(true);
                }
                break;
              }
            }
          }
        }
      }

      // B. Check for Driver
      if (driverAuth) {
        const dAuth = JSON.parse(driverAuth);
        const allOrders = (await list("orders").catch(() => [])) || [];
        const myDeliveries = allOrders.filter(
          o => (String(o.driver_id) === String(dAuth.id) || String(o.driverId) === String(dAuth.id)) &&
               o.status !== "DELIVERED" && o.status !== "CANCELLED"
        );

        for (const ord of myDeliveries) {
          const res = await getActiveCall(ord.id);
          if (res.active && res.call) {
            const status = res.call.status;
            const isReceiver = String(res.call.receiver_type).toUpperCase() === "DRIVER";
            const isCaller = String(res.call.caller_type).toUpperCase() === "DRIVER";

            if (status === "RINGING" && isReceiver) {
              setActiveCallState({
                orderId: ord.id,
                recipient: {
                  name: res.call.caller_name || ord.customer?.name || "Customer",
                  role: "Customer",
                  photo: ord.customer?.avatar || ""
                },
                callerType: "DRIVER",
                currentUser: { name: dAuth.name || "Driver" },
                isIncoming: true
              });
              setCallOpen(true);
              break;
            } else if (status === "ACCEPTED" && (isReceiver || isCaller)) {
              if (!callOpen) {
                setActiveCallState({
                  orderId: ord.id,
                  recipient: {
                    name: isCaller ? (res.call.receiver_name || ord.customer?.name || "Customer") : (res.call.caller_name || ord.customer?.name || "Customer"),
                    role: "Customer",
                    photo: ord.customer?.avatar || ""
                  },
                  callerType: "DRIVER",
                  currentUser: { name: dAuth.name || "Driver" },
                  isIncoming: false
                });
                setCallOpen(true);
              }
              break;
            }
          }
        }
      }
    } catch (e) {} finally {
      isPollingRef.current = false;
    }
  };

  checkGlobalActiveCalls();
  const interval = setInterval(checkGlobalActiveCalls, 6000);
  return () => clearInterval(interval);
}, [callOpen]);

  if (!callOpen || !activeCallState) return null;

  return (
    <OnlineCallModal
      open={callOpen}
      onOpenChange={(val) => {
        setCallOpen(val);
        if (!val) setActiveCallState(null);
      }}
      orderId={activeCallState.orderId}
      recipient={activeCallState.recipient}
      callerType={activeCallState.callerType}
      currentUser={activeCallState.currentUser}
      isIncoming={activeCallState.isIncoming}
    />
  );
}
