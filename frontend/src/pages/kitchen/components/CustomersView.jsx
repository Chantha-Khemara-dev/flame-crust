import { useMemo, useState } from "react";
import {
  Users,
  ShoppingBag,
  Phone,
  Mail,
  Crown,
  Clock3,
  UtensilsCrossed,
  Wallet,
  History,
  Star,
  ArrowUpRight,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { cn } from "@/lib/utils";
import {
  AvatarButton,
  CoverBanner,
  PhotoViewer,
  SectionHeading,
  StatTile,
  formatMoney,
  parseOptions,
  timeAgo,
  useNow,
} from "./kitchen-ui";

const SORTS = [
  { id: "recent", label: "Recent" },
  { id: "spend", label: "Top spend" },
  { id: "orders", label: "Most orders" },
  { id: "name", label: "A → Z" },
];

const TIER = {
  VIP: {
    label: "VIP",
    icon: Crown,
    chip: "border-amber-500/30 bg-amber-500/12 text-amber-700 dark:text-amber-400",
  },
  Regular: {
    label: "Regular",
    icon: Star,
    chip: "border-border/70 bg-secondary text-muted-foreground",
  },
  New: {
    label: "New",
    icon: ArrowUpRight,
    chip: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
};

export function CustomersView({ customers = [], orders = [], orderItems = [] }) {
  const now = useNow();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [photoTarget, setPhotoTarget] = useState(null);

  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeItems = Array.isArray(orderItems) ? orderItems : [];

  const itemsByOrder = useMemo(() => {
    const map = new Map();
    safeItems.forEach((item) => {
      const key = String(item.order_id);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return map;
  }, [safeItems]);

  const allRows = useMemo(() => {
    return safeCustomers.map((customer) => {
      const customerOrders = safeOrders.filter((o) => String(o.customer_id) === String(customer.id));
      const totalOrders = customerOrders.length;
      const spent = customerOrders.reduce(
        (sum, order) => sum + (parseFloat(order.total || order.total_amount) || 0),
        0
      );

      const tally = new Map();
      customerOrders.forEach((order) => {
        (itemsByOrder.get(String(order.id)) || []).forEach((item) => {
          if (!item.product_name) return;
          tally.set(item.product_name, (tally.get(item.product_name) || 0) + (parseInt(item.quantity) || 1));
        });
      });
      const favorite = tally.size > 0 ? [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0] : null;

      const lastOrderAt = customerOrders.length
        ? Math.max(...customerOrders.map((o) => new Date(o.created_at).getTime()))
        : null;

      return {
        ...customer,
        name: customer.name || "Unknown Guest",
        handle: `@${(customer.name || "guest").toLowerCase().replace(/\s+/g, "")}`,
        tier: totalOrders >= 8 ? "VIP" : totalOrders === 0 ? "New" : "Regular",
        ordersCount: totalOrders,
        spent,
        favorite,
        lastOrderAt,
        avgTicket: totalOrders > 0 ? spent / totalOrders : 0,
      };
    });
  }, [safeCustomers, safeOrders, itemsByOrder]);

  const enriched = useMemo(() => {
    const term = query.trim().toLowerCase();

    const filtered = term
      ? allRows.filter((row) =>
          [row.name, row.email, row.phone, row.favorite]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(term)
        )
      : allRows;

    return filtered.sort((a, b) => {
      if (sort === "spend") return b.spent - a.spent;
      if (sort === "orders") return b.ordersCount - a.ordersCount;
      if (sort === "name") return a.name.localeCompare(b.name);
      return (b.lastOrderAt || 0) - (a.lastOrderAt || 0);
    });
  }, [allRows, query, sort]);

  const summary = useMemo(() => {
    const guests = allRows.length;
    const vips = allRows.filter((row) => row.tier === "VIP").length;
    const totalSpend = allRows.reduce((sum, row) => sum + row.spent, 0);
    const repeat = allRows.filter((row) => row.ordersCount > 1).length;

    return {
      guests,
      vips,
      avgSpend: guests ? totalSpend / guests : 0,
      repeatRate: guests ? Math.round((repeat / guests) * 100) : 0,
    };
  }, [allRows]);

  const activeOrders = activeCustomer
    ? safeOrders
        .filter((o) => String(o.customer_id) === String(activeCustomer.id))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    : [];

  const activeTier = activeCustomer ? TIER[activeCustomer.tier] || TIER.Regular : null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <SectionHeading
        icon={Users}
        title="Guest Directory"
        description="Order history, spend and favourite dishes for every guest"
        className="shrink-0"
      >
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search name, phone, dish…"
            className="flex-1 sm:w-72 sm:flex-initial"
          />
        </div>
      </SectionHeading>

      <div className="relative mb-3.5 shrink-0 sm:mb-5">
        <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-4">
          <StatTile
            label="Guests"
            value={summary.guests}
            icon={Users}
            tone="amber"
            hint="Registered profiles"
            className="min-w-[132px] shrink-0 sm:min-w-0 sm:shrink"
          />
          <StatTile
            label="VIP Guests"
            value={summary.vips}
            icon={Crown}
            tone="flame"
            hint="8+ completed orders"
            className="min-w-[132px] shrink-0 sm:min-w-0 sm:shrink"
          />
          <StatTile
            label="Avg Lifetime Spend"
            value={formatMoney(summary.avgSpend)}
            icon={Wallet}
            tone="emerald"
            hint="Per guest"
            className="min-w-[132px] shrink-0 sm:min-w-0 sm:shrink"
          />
          <StatTile
            label="Repeat Rate"
            value={`${summary.repeatRate}%`}
            icon={History}
            tone="sky"
            hint="Ordered more than once"
            className="min-w-[132px] shrink-0 sm:min-w-0 sm:shrink"
          />
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background via-background/70 to-transparent sm:hidden" />
      </div>

      <div className="mb-3.5 flex shrink-0 items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
          Sort
        </span>
        {SORTS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setSort(option.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all active:scale-95",
              sort === option.id
                ? "border-primary/30 bg-primary/12 text-primary shadow-xs"
                : "border-border/70 bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
        <span className="ml-auto shrink-0 text-[11px] font-semibold text-muted-foreground tabular-nums">
          {enriched.length} shown
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
        {enriched.length === 0 ? (
          <div className="flex h-full min-h-[280px] items-center justify-center rounded-3xl border border-dashed border-border/70 bg-card/50">
            <EmptyState
              icon={Users}
              title={query ? "No guests match your search" : "No guests yet"}
              description={
                query
                  ? "Try a different name, phone number or dish."
                  : "Guests appear here once they register or place an order."
              }
              actionLabel={query ? "Clear search" : undefined}
              onAction={query ? () => setQuery("") : undefined}
            />
          </div>
        ) : (
          <>
          <ul className="flex flex-col gap-2.5 sm:hidden">
            {enriched.map((customer) => {
              const tier = TIER[customer.tier] || TIER.Regular;
              return (
                <li key={customer.id}>
                  <button
                    type="button"
                    onClick={() => setActiveCustomer(customer)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 text-left shadow-xs transition-all hover:border-primary/35 active:scale-[0.99]"
                  >
                    <AvatarButton
                      name={customer.name}
                      src={customer.avatar}
                      onOpen={() => setPhotoTarget(customer)}
                      className="size-12 rounded-2xl"
                      fallbackClass="text-sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-serif text-sm font-bold text-foreground">
                          {customer.name}
                        </span>
                        <tier.icon
                          className={cn(
                            "size-3 shrink-0",
                            customer.tier === "VIP"
                              ? "fill-amber-500/20 text-amber-500"
                              : "text-muted-foreground/50"
                          )}
                        />
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] font-medium text-muted-foreground">
                        {customer.phone || customer.favorite || customer.handle}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="font-serif text-sm font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
                        {formatMoney(customer.spent)}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
                        {customer.ordersCount} order{customer.ordersCount === 1 ? "" : "s"}
                        {customer.lastOrderAt ? ` • ${timeAgo(customer.lastOrderAt, now)}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="hidden grid-cols-1 gap-3.5 sm:grid sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            {enriched.map((customer) => {
              const tier = TIER[customer.tier] || TIER.Regular;
              return (
                <article
                  key={customer.id}
                  onClick={() => setActiveCustomer(customer)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActiveCustomer(customer);
                    }
                  }}
                  className="group flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-warm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-warm-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  <CoverBanner src={customer.cover_photo} className="h-24 shrink-0 sm:h-28">
                    <Badge
                      variant="outline"
                      className={cn(
                        "absolute right-3 top-3 gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide shadow-xs backdrop-blur-md",
                        tier.chip
                      )}
                    >
                      <tier.icon className="size-2.5" /> {tier.label}
                    </Badge>
                  </CoverBanner>

                  <div className="relative z-10 -mt-9 flex items-end gap-3 px-4 sm:-mt-10 sm:px-5">
                    <AvatarButton
                      name={customer.name}
                      src={customer.avatar}
                      status={
                        customer.lastOrderAt && now - customer.lastOrderAt < 3600000
                          ? "online"
                          : undefined
                      }
                      onOpen={() => setPhotoTarget(customer)}
                      className="size-[4.25rem] rounded-3xl border-[3px] border-card shadow-warm sm:size-[4.75rem]"
                      fallbackClass="text-xl"
                      radiusClass="rounded-3xl"
                    />
                    <div className="min-w-0 flex-1 pb-1.5">
                      <h3 className="truncate font-serif text-base font-bold text-foreground sm:text-lg">
                        {customer.name}
                      </h3>
                      <p className="truncate text-xs font-medium text-muted-foreground">
                        {customer.phone || customer.handle}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col px-4 pb-4 pt-3.5 sm:px-5 sm:pb-5">
                  <div className="mb-3.5 grid grid-cols-2 gap-2.5">
                    <div className="rounded-2xl border border-border/60 bg-secondary/35 p-3">
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Orders
                      </span>
                      <span className="flex items-center gap-1.5 font-serif text-lg font-bold text-foreground tabular-nums">
                        <ShoppingBag className="size-3.5 text-primary" />
                        {customer.ordersCount}
                      </span>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-secondary/35 p-3">
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Lifetime spend
                      </span>
                      <span className="flex items-center gap-1.5 font-serif text-lg font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
                        <Wallet className="size-3.5" />
                        {formatMoney(customer.spent)}
                      </span>
                    </div>
                  </div>

                  <dl className="mb-4 space-y-1.5 text-xs font-semibold">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                        <UtensilsCrossed className="size-3.5" /> Favourite
                      </dt>
                      <dd className="truncate text-foreground">{customer.favorite || "No orders yet"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                        <Clock3 className="size-3.5" /> Last order
                      </dt>
                      <dd className="truncate text-foreground">
                        {customer.lastOrderAt ? timeAgo(customer.lastOrderAt, now) : "—"}
                      </dd>
                    </div>
                  </dl>

                  <Separator className="mb-3.5 bg-border/60" />

                  <div className="mt-auto flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                    {customer.email && (
                      <Button
                        asChild
                        variant="outline"
                        className="h-9 flex-1 rounded-xl border-border/70 bg-secondary/40 font-serif text-[11px] font-bold text-foreground shadow-xs transition-all hover:border-primary/35 hover:bg-secondary active:scale-95"
                      >
                        <a href={`mailto:${customer.email}`}>
                          <Mail className="mr-1.5 size-3.5" /> Email
                        </a>
                      </Button>
                    )}
                    {customer.phone && (
                      <Button
                        asChild
                        variant="outline"
                        className="h-9 flex-1 rounded-xl border-border/70 bg-secondary/40 font-serif text-[11px] font-bold text-foreground shadow-xs transition-all hover:border-emerald-500/35 hover:bg-secondary active:scale-95"
                      >
                        <a href={`tel:${customer.phone}`}>
                          <Phone className="mr-1.5 size-3.5" /> Call
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setActiveCustomer(customer)}
                      className="size-9 shrink-0 rounded-xl border-border/70 bg-secondary/40 text-muted-foreground shadow-xs transition-all hover:border-primary/35 hover:text-primary active:scale-95"
                      title="Order history"
                    >
                      <History className="size-3.5" />
                    </Button>
                  </div>
                  </div>
                </article>
              );
            })}
          </div>
          </>
        )}
      </div>

      <Dialog open={Boolean(activeCustomer)} onOpenChange={(open) => !open && setActiveCustomer(null)}>
        <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden rounded-3xl border-border/70 p-0 shadow-warm-lg max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:pt-[env(safe-area-inset-top,0px)] max-sm:pb-[env(safe-area-inset-bottom,0px)] [&>button]:top-[max(1rem,env(safe-area-inset-top,0px))] [&>button]:rounded-full [&>button]:bg-card/85 [&>button]:p-1.5 [&>button]:opacity-100 [&>button]:shadow-xs [&>button]:backdrop-blur-md [&>button]:hover:bg-card">
          <DialogHeader className="relative shrink-0 border-b border-border/60 p-0">
            <CoverBanner src={activeCustomer?.cover_photo} className="h-20 sm:h-24" />
            <div className="relative z-10 -mt-8 flex items-end gap-3 px-5 pb-4">
              <AvatarButton
                name={activeCustomer?.name}
                src={activeCustomer?.avatar}
                onOpen={() => setPhotoTarget(activeCustomer)}
                className="size-16 rounded-3xl border-[3px] border-card shadow-warm"
                fallbackClass="text-lg"
                radiusClass="rounded-3xl"
              />
              <DialogTitle className="min-w-0 flex-1 pb-0.5 text-left font-serif text-lg font-bold tracking-tight text-foreground sm:text-xl">
                <span className="block truncate">{activeCustomer?.name}</span>
                <span className="mt-0.5 block truncate text-xs font-semibold text-muted-foreground">
                  {activeCustomer?.email || "No email"} • {activeCustomer?.phone || "No phone"}
                </span>
              </DialogTitle>
              {activeTier && (
                <Badge
                  variant="outline"
                  className={cn(
                    "mb-1 hidden shrink-0 gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide sm:inline-flex",
                    activeTier.chip
                  )}
                >
                  <activeTier.icon className="size-2.5" /> {activeTier.label}
                </Badge>
              )}
            </div>
          </DialogHeader>

          <div className="grid shrink-0 grid-cols-3 gap-2.5 border-b border-border/60 bg-secondary/25 p-4">
            <div className="rounded-2xl border border-border/60 bg-card p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Orders</p>
              <p className="font-serif text-lg font-bold text-foreground tabular-nums">
                {activeCustomer?.ordersCount || 0}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lifetime</p>
              <p className="font-serif text-lg font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
                {formatMoney(activeCustomer?.spent)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Avg ticket</p>
              <p className="font-serif text-lg font-bold text-foreground tabular-nums">
                {formatMoney(activeCustomer?.avgTicket)}
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4 custom-scrollbar sm:p-5">
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Order history
            </h4>
            {activeOrders.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 py-8 text-center text-xs font-semibold text-muted-foreground">
                No orders recorded for this guest yet.
              </p>
            ) : (
              activeOrders.map((order) => {
                const items = itemsByOrder.get(String(order.id)) || [];
                return (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-border/70 bg-card p-3.5 shadow-xs transition-colors hover:border-primary/30"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-serif text-sm font-bold text-foreground">
                          Order #{order.order_number || order.id}
                        </p>
                        <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          • {timeAgo(order.created_at, now)} •{" "}
                          {(order.order_type || "DELIVERY").replace(/_/g, " ")}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide",
                            order.status === "DELIVERED"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : order.status === "CANCELLED"
                                ? "border-destructive/30 bg-destructive/10 text-destructive"
                                : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          )}
                        >
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                        <span className="font-serif text-sm font-bold text-foreground tabular-nums">
                          {formatMoney(order.total || order.total_amount)}
                        </span>
                      </div>
                    </div>

                    {items.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-border/50 pt-2.5">
                        {items.slice(0, 4).map((item, index) => (
                          <span
                            key={item.id ?? index}
                            className="rounded-md border border-border/60 bg-secondary/40 px-2 py-0.5 text-[10.5px] font-semibold text-muted-foreground"
                          >
                            {item.quantity}× {item.product_name}
                            {parseOptions(item.options).length ? " •" : ""}
                          </span>
                        ))}
                        {items.length > 4 && (
                          <span className="rounded-md px-1.5 py-0.5 text-[10.5px] font-bold text-primary">
                            +{items.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <PhotoViewer
        open={Boolean(photoTarget)}
        onClose={() => setPhotoTarget(null)}
        src={photoTarget?.avatar}
        name={photoTarget?.name}
        subtitle={
          photoTarget
            ? [photoTarget.phone, `${photoTarget.ordersCount} orders`]
                .filter(Boolean)
                .join(" • ")
            : undefined
        }
      />
    </div>
  );
}
