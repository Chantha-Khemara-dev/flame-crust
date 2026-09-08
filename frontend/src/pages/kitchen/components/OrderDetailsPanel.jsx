import { useEffect, useMemo, useState } from "react";
import {
  Phone,
  MessageCircle,
  Clock3,
  ShoppingBag,
  MapPin,
  ChefHat,
  CheckCircle2,
  Flame,
  Printer,
  AlertTriangle,
  Bike,
  Wallet,
  Tag,
  Ban,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getImageUrl } from "@/lib/food-api";
import { cn } from "@/lib/utils";
import { OrderChatModal } from "@/components/food/order-chat-modal";
import {
  STAGES,
  STATUS_LABEL,
  AvatarButton,
  CoverBanner,
  PhotoViewer,
  TicketTimer,
  clockOf,
  elapsedFrom,
  formatMinutes,
  formatMoney,
  parseOptions,
  shortOrderNo,
  timeAgo,
  useNow,
} from "./kitchen-ui";

const TIMELINE = [
  { status: "PENDING", label: "Received", icon: ShoppingBag },
  { status: "CONFIRMED", label: "Confirmed", icon: CheckCircle2 },
  { status: "PREPARING", label: "Preparing", icon: Flame },
  { status: "READY", label: "Ready", icon: ChefHat },
  { status: "OUT_FOR_DELIVERY", label: "Dispatched", icon: Bike },
  { status: "DELIVERED", label: "Delivered", icon: MapPin },
];

export function OrderDetailsPanel({
  order,
  onClose,
  user,
  customers = [],
  history = [],
  updateOrderStatus,
  targetPrepMinutes = 12,
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const now = useNow();

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const customer = useMemo(
    () => customers.find((c) => String(c.id) === String(order?.customer_id)) || null,
    [customers, order?.customer_id]
  );

  const steps = useMemo(() => {
    if (!order) return [];
    const stamps = new Map();
    (Array.isArray(history) ? history : []).forEach((entry) => {
      if (entry?.status && !stamps.has(entry.status)) stamps.set(entry.status, entry.created_at);
    });
    const currentIndex = TIMELINE.findIndex((step) => step.status === order.status);
    return TIMELINE.map((step, index) => ({
      ...step,
      time: stamps.get(step.status) || (index === 0 ? order.created_at : null),
      completed: currentIndex > -1 && index < currentIndex,
      active: index === currentIndex,
    }));
  }, [order, history]);

  if (!order) return null;

  const isCancelled = order.status === "CANCELLED";
  const items = Array.isArray(order.items) ? order.items : [];
  const itemCount = items.reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0);
  const stage =
    order.status === "PREPARING" ? "preparing" : order.status === "READY" ? "ready" : "pending";
  const stageAnchor = stage === "preparing" ? order.updated_at || order.created_at : order.created_at;
  const totalWait = elapsedFrom(order.created_at, now);
  const subtotal = Number(order.subtotal || 0);
  const deliveryFee = Number(order.delivery_fee || 0);
  const discount = Number(order.discount_amount || 0);
  const total = Number(order.total || order.total_amount || 0);
  const address = order.address || null;

  const handlePrintTicket = () => {
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;
    const itemsHtml = items
      .map(
        (item) => `
      <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:14px;">
        <span><strong>${item.quantity}x</strong> ${item.product_name}</span>
      </div>
      ${
        parseOptions(item.options).length
          ? `<div style="font-size:11px; color:#666; margin-bottom:6px; padding-left:14px;">${parseOptions(item.options).join(" • ")}</div>`
          : ""
      }
      ${item.item_notes ? `<div style="font-size:11px; color:#666; margin-bottom:6px; padding-left:14px;">Note: ${item.item_notes}</div>` : ""}`
      )
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>KOT - Order #${order.order_number || order.id}</title>
          <style>
            body { font-family: monospace; padding: 20px; color: #000; }
            h2 { margin: 0 0 4px 0; font-size: 18px; }
            .meta { font-size: 12px; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 12px; }
            .notes { background: #f0f0f0; padding: 8px; margin: 10px 0; border: 1px solid #ccc; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>Flame &amp; Crust - KITCHEN TICKET</h2>
          <div class="meta">
            <div><strong>ORDER #${shortOrderNo(order)}</strong></div>
            <div>Type: ${order.order_type || "DELIVERY"}</div>
            <div>Time: ${new Date(order.created_at).toLocaleTimeString()}</div>
            <div>Customer: ${customer?.name || order.customer_name || "Guest"}</div>
            ${address ? `<div>Address: ${address.address_line || ""} ${address.city || ""}</div>` : ""}
          </div>
          ${order.notes ? `<div class="notes">NOTE: ${order.notes}</div>` : ""}
          <div style="margin-top:12px;">${itemsHtml}</div>
          <div style="margin-top:12px; border-top:1px dashed #000; padding-top:8px; font-size:12px;">
            <div>Items: ${itemCount}</div>
            <div><strong>Total: ${formatMoney(total)}</strong></div>
          </div>
          <div style="margin-top:20px; border-top:1px dashed #000; padding-top:8px; font-size:11px; text-align:center;">
            *** KITCHEN ORDER COPY ***
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <>
      <Sheet open={Boolean(order)} onOpenChange={(open) => !open && onClose?.()}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 border-l border-border/70 bg-card p-0 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] shadow-warm-lg sm:max-w-xl md:max-w-2xl [&>button]:top-[max(1rem,calc(env(safe-area-inset-top,0px)+0.75rem))] [&>button]:right-4 [&>button]:rounded-full [&>button]:bg-secondary/70 [&>button]:p-1.5 [&>button]:opacity-100 [&>button]:backdrop-blur-md"
        >
          <SheetHeader className="shrink-0 border-b border-border/60 bg-card/85 px-4 py-4 pr-14 backdrop-blur-xl sm:px-6 sm:py-5">
            <SheetTitle className="flex flex-wrap items-center gap-2 font-serif text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              <span className="flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-orange-500 to-amber-500 text-white shadow-warm ring-2 ring-primary/20">
                <Flame className="size-4.5 animate-flicker fill-white/20" />
              </span>
              Ticket #{shortOrderNo(order)}
              <Badge
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider",
                  isCancelled
                    ? "border-destructive/30 bg-destructive/12 text-destructive"
                    : stage === "ready"
                      ? STAGES.ready.chip
                      : stage === "preparing"
                        ? STAGES.preparing.chip
                        : STAGES.pending.chip
                )}
              >
                {STATUS_LABEL[order.status] || order.status}
              </Badge>
            </SheetTitle>
            <SheetDescription className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-medium text-muted-foreground sm:text-sm">
              <span className="flex items-center gap-1.5">
                <Clock3 className="size-3.5 text-primary" />
                {new Date(order.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
              </span>
              <span className="flex items-center gap-1.5">
                {order.order_type === "DINE_IN" ? (
                  <ChefHat className="size-3.5 text-primary" />
                ) : order.order_type === "TAKEAWAY" ? (
                  <ShoppingBag className="size-3.5 text-primary" />
                ) : (
                  <MapPin className="size-3.5 text-sky-500" />
                )}
                {(order.order_type || "DELIVERY").replace(/_/g, " ")}
              </span>
              <span className="flex items-center gap-1.5">
                <ShoppingBag className="size-3.5 text-primary" />
                {itemCount} item{itemCount === 1 ? "" : "s"}
              </span>
              {!isCancelled && order.status !== "DELIVERED" && (
                <TicketTimer
                  startTime={stageAnchor}
                  stage={stage}
                  targetPrepMinutes={targetPrepMinutes}
                  showLabel
                />
              )}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 overflow-y-auto bg-background/50 p-4 custom-scrollbar sm:space-y-6 sm:p-6">
            {isCancelled && (
              <section className="flex items-start gap-3 rounded-3xl border border-destructive/30 bg-destructive/8 p-4">
                <Ban className="mt-0.5 size-5 shrink-0 text-destructive" />
                <div>
                  <p className="font-serif text-sm font-bold text-foreground">This ticket was cancelled</p>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                    Do not fire any items for this order.
                  </p>
                </div>
              </section>
            )}

            <section className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-warm">
              <CoverBanner src={customer?.cover_photo} className="h-20 sm:h-24" />
              <div className="relative z-10 -mt-8 flex flex-col gap-4 px-4 pb-4 sm:-mt-9 sm:flex-row sm:items-end sm:justify-between sm:px-5 sm:pb-5">
                <div className="flex min-w-0 items-end gap-3.5">
                  <AvatarButton
                    name={customer?.name || order.customer_name || "Guest"}
                    src={customer?.avatar}
                    onOpen={() => setPhotoOpen(true)}
                    className="size-16 rounded-3xl border-[3px] border-card shadow-warm sm:size-18"
                    fallbackClass="text-lg"
                    radiusClass="rounded-3xl"
                  />
                  <div className="min-w-0 pb-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-serif text-base font-bold text-foreground sm:text-lg">
                        {customer?.name || order.customer_name || "Guest"}
                      </h3>
                      {customer?.reward_points > 0 && (
                        <Badge
                          variant="outline"
                          className="rounded-full border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400"
                        >
                          <Tag className="size-2.5" /> {customer.reward_points} pts
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground sm:text-sm">
                      {customer?.phone || order.customer_phone || "No phone on file"}
                      {customer?.email ? ` • ${customer.email}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:shrink-0 sm:pb-1.5">
                  {customer?.email && (
                    <Button
                      asChild
                      variant="outline"
                      size="icon"
                      className="size-10 rounded-full border-border/70 bg-card shadow-xs transition-all hover:border-primary/40 hover:text-primary active:scale-95"
                      title="Email guest"
                    >
                      <a href={`mailto:${customer.email}`}>
                        <MessageCircle className="size-4" />
                      </a>
                    </Button>
                  )}
                  <Button
                    onClick={() => setChatOpen(true)}
                    className="h-10 flex-1 rounded-full bg-primary px-4 font-serif text-xs font-bold text-primary-foreground shadow-warm transition-all hover:bg-primary/90 active:scale-95 sm:flex-initial sm:text-sm"
                  >
                    <MessageCircle className="mr-1.5 size-4" /> Chat
                  </Button>
                  {customer?.phone && (
                    <Button
                      asChild
                      variant="outline"
                      size="icon"
                      className="size-10 rounded-full border-border/70 bg-card shadow-xs transition-all hover:border-emerald-500/40 hover:text-emerald-600 active:scale-95"
                      title="Call guest"
                    >
                      <a href={`tel:${customer.phone}`}>
                        <Phone className="size-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              {order.order_type === "DELIVERY" && address && (
                <div className="-mt-1 mx-4 mb-4 flex items-start gap-2.5 rounded-2xl border border-sky-500/25 bg-sky-500/8 p-3 sm:mx-5 sm:mb-5">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-400" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                      {address.label || "Delivery address"}
                    </p>
                    <p className="truncate text-xs font-semibold text-foreground sm:text-sm">
                      {[address.address_line, address.city, address.postal_code]
                        .filter(Boolean)
                        .join(", ") || "Address not set"}
                    </p>
                  </div>
                </div>
              )}
            </section>

            {order.notes && (
              <section className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-xs sm:p-5">
                <div className="mb-1.5 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="size-4 shrink-0" /> Special instructions
                </div>
                <p className="text-sm font-semibold text-foreground sm:text-base">{order.notes}</p>
              </section>
            )}

            <section className="rounded-3xl border border-border/70 bg-card p-4 shadow-warm sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-foreground sm:text-sm">
                  Order timeline
                </h4>
                {totalWait !== null && (
                  <span className="rounded-full border border-border/60 bg-secondary/70 px-2.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-muted-foreground">
                    {formatMinutes(totalWait)} elapsed
                  </span>
                )}
              </div>

              <ol className="relative space-y-3.5 pl-1">
                <span className="absolute top-2 bottom-2 left-[15px] w-px bg-border" aria-hidden="true" />
                {steps.map((step) => (
                  <li key={step.status} className="relative flex items-center gap-3">
                    <span
                      className={cn(
                        "z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        step.completed
                          ? "border-primary bg-primary text-white"
                          : step.active
                            ? "border-primary bg-card text-primary shadow-warm"
                            : "border-border bg-card text-muted-foreground/50"
                      )}
                    >
                      <step.icon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate font-serif text-sm font-bold",
                          step.active || step.completed ? "text-foreground" : "text-muted-foreground/70"
                        )}
                      >
                        {step.label}
                      </p>
                      <p className="text-[11px] font-medium text-muted-foreground">
                        {step.time ? `${clockOf(step.time)} • ${timeAgo(step.time, now)}` : "Pending"}
                      </p>
                    </div>
                    {step.active && (
                      <Badge
                        variant="outline"
                        className="shrink-0 rounded-full border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-primary"
                      >
                        Now
                      </Badge>
                    )}
                  </li>
                ))}
              </ol>

              {!isCancelled && ["PREPARING", "READY", "OUT_FOR_DELIVERY"].includes(order.status) && (
                <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/8 p-3">
                  <ChefHat className="size-4.5 text-primary" />
                  <span className="text-xs font-medium text-foreground sm:text-sm">
                    Fired by <strong className="font-bold text-primary">{user?.name || "Chef"}</strong>
                  </span>
                </div>
              )}
            </section>

            <section>
              <h4 className="mb-3 font-serif text-xs font-bold uppercase tracking-wider text-foreground sm:mb-4 sm:text-sm">
                Items to prepare ({items.length})
              </h4>
              <ul className="space-y-3">
                {items.length === 0 && (
                  <li className="rounded-3xl border border-dashed border-border/70 bg-secondary/20 p-6 text-center text-xs font-semibold text-muted-foreground">
                    No items recorded on this ticket.
                  </li>
                )}
                {items.map((item, index) => {
                  const opts = parseOptions(item.options);
                  return (
                    <li
                      key={item.id ?? index}
                      className="flex gap-3.5 rounded-3xl border border-border/70 bg-card p-3.5 shadow-warm transition-colors hover:border-primary/30 sm:p-4"
                    >
                      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-secondary/50 sm:size-20">
                        {item.product_image ? (
                          <img
                            src={getImageUrl(item.product_image)}
                            alt={item.product_name || ""}
                            loading="lazy"
                            className="size-full object-cover"
                          />
                        ) : (
                          <ShoppingBag className="size-6 text-muted-foreground sm:size-7" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h5 className="font-serif text-sm font-bold leading-snug text-foreground line-clamp-2 sm:text-base">
                            {item.product_name || "Item"}
                          </h5>
                          <span className="shrink-0 rounded-xl border border-primary/20 bg-primary/10 px-2.5 py-0.5 font-serif text-xs font-bold text-primary sm:text-sm">
                            {item.quantity}×
                          </span>
                        </div>

                        {(opts.length > 0 || item.item_notes) && (
                          <div className="mt-2 rounded-2xl border border-border/60 bg-secondary/35 p-2.5">
                            {opts.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {opts.map((opt, i) => (
                                  <span
                                    key={i}
                                    className="rounded-md border border-border/60 bg-card px-2 py-0.5 text-[11px] font-semibold text-foreground shadow-2xs"
                                  >
                                    {opt}
                                  </span>
                                ))}
                              </div>
                            )}
                            {item.item_notes && (
                              <p className="mt-1.5 text-[11px] font-semibold text-amber-700 italic dark:text-amber-400">
                                “{item.item_notes}”
                              </p>
                            )}
                          </div>
                        )}

                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                            {formatMoney(item.unit_price)} each
                          </span>
                          <span className="font-serif text-sm font-bold text-foreground">
                            {formatMoney(item.line_total)}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="rounded-3xl border border-border/70 bg-card p-4 shadow-warm sm:p-5">
              <h4 className="mb-3 flex items-center gap-2 font-serif text-xs font-bold uppercase tracking-wider text-foreground sm:text-sm">
                <Wallet className="size-4 text-primary" /> Bill summary
              </h4>
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="font-medium text-muted-foreground">Subtotal</dt>
                  <dd className="font-semibold text-foreground tabular-nums">{formatMoney(subtotal)}</dd>
                </div>
                {discount > 0 && (
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                      <Tag className="size-3.5" /> Discount
                    </dt>
                    <dd className="font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                      −{formatMoney(discount)}
                    </dd>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-1.5 font-medium text-muted-foreground">
                    <Bike className="size-3.5" /> Delivery fee
                  </dt>
                  <dd className="font-semibold text-foreground tabular-nums">{formatMoney(deliveryFee)}</dd>
                </div>
                <Separator className="my-2 bg-border/70" />
                <div className="flex items-center justify-between">
                  <dt className="font-serif text-base font-bold text-foreground">Total</dt>
                  <dd className="font-serif text-lg font-bold text-primary tabular-nums">{formatMoney(total)}</dd>
                </div>
              </dl>
            </section>
          </div>

          {updateOrderStatus && (
            <footer className="flex shrink-0 items-center gap-2.5 border-t border-border/60 bg-card/90 p-3.5 backdrop-blur-xl sm:gap-3 sm:p-5">
              {!isCancelled && (order.status === "PENDING" || order.status === "CONFIRMED") && (
                <Button
                  onClick={() => updateOrderStatus(order.id, "PREPARING")}
                  className="h-11 flex-1 truncate rounded-full bg-gradient-to-r from-primary via-orange-500 to-amber-500 font-serif text-xs font-bold text-white shadow-warm transition-all hover:brightness-105 active:scale-[0.98] sm:h-12 sm:text-base"
                >
                  <Flame className="mr-2 size-4 shrink-0 sm:size-5" /> Start Preparing
                </Button>
              )}
              {!isCancelled && order.status === "PREPARING" && (
                <Button
                  onClick={() => updateOrderStatus(order.id, "READY")}
                  className="h-11 flex-1 truncate rounded-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 font-serif text-xs font-bold text-white shadow-warm transition-all hover:brightness-105 active:scale-[0.98] sm:h-12 sm:text-base"
                >
                  <CheckCircle2 className="mr-2 size-4 shrink-0 sm:size-5" /> Mark as Ready
                </Button>
              )}
              {!isCancelled && order.status === "READY" && (
                <div className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 text-center font-serif text-[11px] font-bold text-emerald-700 sm:h-12 sm:text-sm dark:bg-emerald-500/18 dark:text-emerald-300">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span className="truncate">Prepared • waiting for driver</span>
                </div>
              )}
              {!isCancelled && ["OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status) && (
                <div className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-border/70 bg-secondary/60 px-3 font-serif text-xs font-bold text-muted-foreground sm:h-12 sm:text-sm">
                  <Bike className="size-4 shrink-0 text-primary" />
                  {STATUS_LABEL[order.status] || order.status}
                </div>
              )}
              {isCancelled && (
                <div className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-3 font-serif text-xs font-bold text-destructive sm:h-12 sm:text-sm">
                  <Ban className="size-4 shrink-0" /> Ticket cancelled
                </div>
              )}

              <Button
                variant="outline"
                onClick={handlePrintTicket}
                className="h-11 shrink-0 rounded-full border-border/70 bg-card px-3.5 font-serif text-xs font-bold text-foreground shadow-xs transition-all hover:bg-secondary active:scale-95 sm:h-12 sm:px-4 sm:text-sm"
                title="Print kitchen ticket"
              >
                <Printer className="size-4 text-primary sm:mr-1.5" />
                <span className="hidden sm:inline">Print KOT</span>
              </Button>
            </footer>
          )}
        </SheetContent>
      </Sheet>

      <OrderChatModal
        open={chatOpen}
        onOpenChange={setChatOpen}
        orderId={order.id}
        orderNumber={order.order_number || order.id}
        currentUser={{ type: "KITCHEN", name: user?.name || "Chef" }}
        recipient={{
          name: customer?.name || order.customer_name || "Customer",
          role: "Customer",
          photo: customer?.avatar || "",
        }}
      />

      <PhotoViewer
        open={photoOpen}
        onClose={() => setPhotoOpen(false)}
        src={customer?.avatar}
        name={customer?.name || order.customer_name || "Guest"}
        subtitle={[customer?.phone, customer?.email].filter(Boolean).join(" • ") || undefined}
      />
    </>
  );
}
