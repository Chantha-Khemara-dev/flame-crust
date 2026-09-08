import { X, Phone, MessageCircle, Clock, ShoppingBag, MapPin, ChefHat, CheckCircle2, Users, Flame, Printer, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getImageUrl } from "@/lib/food-api";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { OrderChatModal } from "@/components/food/order-chat-modal";

export function OrderDetailsPanel({ order, onClose, user, customers = [], updateOrderStatus }) {
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!order) return null;

  const customer = customers.find(c => String(c.id) === String(order.customer_id)) || null;

  const handlePrintTicket = () => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;
    const itemsHtml = (order.items || []).map(item => `
      <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:14px;">
        <span><strong>${item.quantity}x</strong> ${item.product_name}</span>
      </div>
      ${item.options && item.options !== '{}' ? `<div style="font-size:11px; color:#666; margin-bottom:6px; padding-left:14px;">${item.options}</div>` : ''}
    `).join('');

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
          <h2>🔥 Flame & Crust - KITCHEN TICKET</h2>
          <div class="meta">
            <div><strong>ORDER #${order.order_number ? (order.order_number.length > 8 ? order.order_number.slice(-6) : order.order_number) : order.id}</strong></div>
            <div>Type: ${order.order_type || 'DELIVERY'}</div>
            <div>Time: ${new Date(order.created_at).toLocaleTimeString()}</div>
            <div>Customer: ${customer?.name || order.customer_name || 'Guest'}</div>
          </div>
          ${order.notes ? `<div class="notes">NOTE: ${order.notes}</div>` : ''}
          <div style="margin-top:12px;">${itemsHtml}</div>
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
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="relative w-full sm:max-w-xl md:max-w-2xl bg-card text-foreground h-[100dvh] max-h-[100dvh] shadow-warm-lg flex flex-col z-10 animate-in slide-in-from-right duration-300 border-l border-border/70">
        
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-6 border-b border-border/60 bg-card/85 backdrop-blur-xl pt-[max(0.875rem,calc(env(safe-area-inset-top,0px)+0.5rem))]">
          <div className="min-w-0 pr-2">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-foreground flex items-center gap-2 flex-wrap">
              <span>Order #{order.order_number ? (order.order_number.length > 8 ? order.order_number.slice(-6) : order.order_number) : order.id}</span>
              <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border border-primary/20 shadow-xs">
                {order.status}
              </span>
            </h2>
            <div className="flex items-center gap-2 sm:gap-3 mt-1 text-xs sm:text-sm font-medium text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5"><Clock className="size-3.5 sm:size-4 text-primary" /> {new Date(order.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                {order.order_type === 'DELIVERY' ? <MapPin className="size-3.5 sm:size-4 text-sky-500" /> : <ShoppingBag className="size-3.5 sm:size-4 text-primary" />} 
                {order.order_type || 'Delivery'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrintTicket}
              className="p-2.5 bg-secondary/60 hover:bg-secondary text-foreground rounded-full transition-colors border border-border/70 shadow-xs flex items-center justify-center"
              title="Print KOT Ticket"
              aria-label="Print KOT Ticket"
            >
              <Printer className="size-4 sm:size-5 text-muted-foreground hover:text-foreground" />
            </button>
            <button 
              onClick={onClose}
              className="p-2.5 bg-secondary/60 hover:bg-secondary text-foreground rounded-full transition-colors border border-border/70 shadow-xs"
              aria-label="Close details"
            >
              <X className="size-5 sm:size-6 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-6 sm:space-y-8 bg-background/50">
          
          {/* Customer Profile Section */}
          <section className="bg-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-border/70 shadow-warm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
              <div className="size-12 sm:size-16 rounded-full bg-gradient-to-br from-primary/20 via-orange-500/20 to-amber-500/20 border-2 border-border overflow-hidden shadow-xs flex items-center justify-center text-xl sm:text-2xl font-serif font-bold text-primary shrink-0">
                {customer?.avatar ? (
                  <img src={getImageUrl(customer.avatar)} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                   customer?.name ? customer.name.charAt(0).toUpperCase() : <Users className="size-6 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="text-base sm:text-lg font-serif font-bold text-foreground truncate">{customer?.name || order.customer_name || 'Guest'}</h3>
                  {customer && (
                    <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border border-amber-500/20">
                      Customer
                    </span>
                  )}
                </div>
                {customer ? (
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{customer.phone} {customer.email ? `• ${customer.email}` : ''}</p>
                ) : (
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Walk-in or Guest Customer</p>
                )}
              </div>
            </div>
            {customer && (
              <div className="flex items-center gap-2 justify-end sm:justify-start shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                {customer.email && (
                  <a href={`mailto:${customer.email}`} className="flex-1 sm:flex-initial flex items-center justify-center rounded-full size-9 sm:size-10 border border-border bg-card hover:bg-secondary transition-colors shadow-xs" title="Email">
                    <MessageCircle className="size-4 text-muted-foreground" />
                  </a>
                )}
                <button onClick={() => setChatOpen(true)} className="flex-1 sm:flex-initial flex items-center justify-center rounded-full h-9 sm:h-10 px-4 bg-primary text-primary-foreground text-xs sm:text-sm font-bold hover:bg-primary/90 transition-all shadow-warm" title="Chat with Customer">
                  <MessageCircle className="size-3.5 sm:size-4 mr-1.5" /> Chat
                </button>
                {customer.phone && (
                  <a href={`tel:${customer.phone}`} className="flex-1 sm:flex-initial flex items-center justify-center rounded-full size-9 sm:size-10 border border-border bg-card hover:bg-secondary transition-colors shadow-xs" title="Call">
                    <Phone className="size-4 text-muted-foreground" />
                  </a>
                )}
              </div>
            )}
          </section>

          {/* Customer Notes / Special Instructions */}
          {order.notes && (
            <section className="bg-amber-500/10 border border-amber-500/25 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wider mb-1.5">
                <AlertCircle className="size-4 shrink-0" /> Special Customer Instructions
              </div>
              <p className="text-sm sm:text-base font-medium text-foreground">{order.notes}</p>
            </section>
          )}

          {/* Kitchen Timeline */}
          <section>
            <h4 className="text-xs sm:text-sm font-serif font-bold text-foreground uppercase tracking-wider mb-4">Order Timeline</h4>
            <div className="overflow-x-auto no-scrollbar pb-2">
              <div className="flex items-center justify-between relative px-2 min-w-[320px]">
                <div className="absolute top-1/2 left-6 right-6 h-1 -translate-y-1/2 bg-secondary rounded-full z-0">
                  <div className={cn("h-full bg-primary rounded-full transition-all duration-500", 
                    order.status === 'PENDING' || order.status === 'CONFIRMED' ? 'w-[40%]' :
                    order.status === 'PREPARING' ? 'w-[65%]' : 
                    order.status === 'READY' || order.status === 'COMPLETED' ? 'w-[100%]' : 'w-[20%]'
                  )}></div>
                </div>
                
                <TimelineStep active={order.status === 'PENDING' || order.status === 'CONFIRMED'} completed={['PREPARING', 'READY', 'COMPLETED'].includes(order.status)} title="Received" time={new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} />
                <TimelineStep active={order.status === 'CONFIRMED'} completed={['PREPARING', 'READY', 'COMPLETED'].includes(order.status)} title="Accepted" time="" />
                <TimelineStep active={order.status === 'PREPARING'} completed={['READY', 'COMPLETED'].includes(order.status)} title="Preparing" time="" />
                <TimelineStep active={order.status === 'READY'} completed={['COMPLETED'].includes(order.status)} title="Ready" time="" />
                <TimelineStep active={order.status === 'COMPLETED'} completed={order.status === 'COMPLETED'} title="Delivered" time="" />
              </div>
            </div>
            
            {['PREPARING', 'READY', 'COMPLETED'].includes(order.status) && (
              <div className="mt-4 sm:mt-6 flex items-center justify-center gap-2 bg-primary/10 border border-primary/20 rounded-2xl p-3">
                <ChefHat className="size-5 text-primary" />
                <span className="text-xs sm:text-sm font-medium text-foreground">
                  Assigned to <strong className="text-primary font-bold">{user?.name || 'Chef'}</strong>
                </span>
              </div>
            )}
          </section>

          {/* Food Items */}
          <section>
             <h4 className="text-xs sm:text-sm font-serif font-bold text-foreground uppercase tracking-wider mb-3 sm:mb-4">Order Items</h4>
             <div className="space-y-3 sm:space-y-4">
               {order.items?.map((item, idx) => (
                 <div key={idx} className="flex gap-3 sm:gap-4 p-3 sm:p-4 bg-card border border-border/70 rounded-2xl sm:rounded-3xl shadow-warm items-start">
                    <div className="size-16 sm:size-20 rounded-xl sm:rounded-2xl bg-secondary/60 border border-border/60 overflow-hidden flex items-center justify-center shrink-0">
                      {item.product_image ? (
                        <img src={getImageUrl(item.product_image)} alt={item.product_name} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="size-6 sm:size-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h5 className="font-serif font-bold text-sm sm:text-base text-foreground leading-snug line-clamp-2">{item.product_name}</h5>
                        <div className="bg-primary/10 text-primary font-serif font-bold text-xs sm:text-sm px-2.5 py-0.5 sm:py-1 rounded-xl shrink-0">
                          {item.quantity}x
                        </div>
                      </div>
                      
                      {item.options && item.options !== "{}" && (
                        <div className="mt-2 bg-secondary/40 p-2 sm:p-2.5 rounded-xl border border-border/60">
                          <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Customizations:</p>
                          <div className="flex flex-wrap gap-1">
                            {(() => {
                              try {
                                return Object.values(JSON.parse(item.options)).map((opt, i) => (
                                   <span key={i} className="bg-card text-foreground text-[11px] font-medium px-2 py-0.5 rounded border border-border/60 shadow-2xs">{opt}</span>
                                ));
                              } catch (e) {
                                return <span className="text-xs">{String(item.options)}</span>;
                              }
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                 </div>
               ))}
             </div>
          </section>

        </div>

        {/* Sticky Action Footer */}
        {updateOrderStatus && (
          <div className="p-3.5 sm:p-5 border-t border-border/60 bg-card/90 backdrop-blur-xl shrink-0 flex items-center gap-2 sm:gap-3 pb-[max(0.875rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))]">
            {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
              <Button 
                onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                className="flex-1 h-11 sm:h-12 rounded-full bg-gradient-to-r from-primary via-orange-500 to-amber-500 hover:opacity-95 text-white font-serif font-bold text-xs sm:text-base shadow-warm transition-all truncate"
              >
                <Flame className="size-4 sm:size-5 mr-1.5 sm:mr-2 shrink-0" /> Start Preparing
              </Button>
            )}
            {order.status === 'PREPARING' && (
              <Button 
                onClick={() => updateOrderStatus(order.id, 'READY')}
                className="flex-1 h-11 sm:h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-serif font-bold text-xs sm:text-base shadow-warm transition-all truncate"
              >
                <CheckCircle2 className="size-4 sm:size-5 mr-1.5 sm:mr-2 shrink-0" /> Mark as Ready
              </Button>
            )}
            {order.status === 'READY' && (
              <div className="flex-1 h-11 sm:h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-serif font-bold text-[11px] sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 border border-emerald-500/20 px-3 text-center">
                <CheckCircle2 className="size-4 shrink-0" /> <span className="truncate">Order Prepared • Waiting for Driver</span>
              </div>
            )}
            {['DELIVERED', 'COMPLETED'].includes(order.status) && (
              <div className="flex-1 h-11 sm:h-12 rounded-full bg-secondary/70 text-muted-foreground font-serif font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-border">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" /> Order Completed
              </div>
            )}
            <Button 
              variant="outline" 
              onClick={handlePrintTicket}
              className="h-11 sm:h-12 px-3 sm:px-4 rounded-full border-border font-serif font-bold shrink-0 text-foreground hover:bg-secondary text-xs sm:text-sm shadow-xs"
            >
              <Printer className="size-4 sm:mr-1.5 text-primary" />
              <span className="hidden sm:inline">Print KOT</span>
            </Button>
          </div>
        )}

      </div>
      
      {/* Kitchen to Customer Chat Modal */}
      <OrderChatModal
        open={chatOpen}
        onOpenChange={setChatOpen}
        orderId={order.id}
        orderNumber={order.order_number || order.id}
        currentUser={{ type: "KITCHEN", name: user?.name || "Chef" }}
        recipient={{
          name: customer?.name || order.customer_name || "Customer",
          role: "Customer",
          photo: customer?.avatar || ""
        }}
      />
    </div>
  );
}

function TimelineStep({ active, completed, title, time }) {
  return (
    <div className="flex flex-col items-center z-10 w-14 sm:w-16 shrink-0">
      <div className={cn(
        "size-7 sm:size-8 rounded-full border-4 flex items-center justify-center bg-card transition-colors",
        completed ? "border-primary bg-primary" : active ? "border-primary shadow-warm" : "border-border"
      )}>
        {completed ? <CheckCircle2 className="size-3.5 sm:size-4 text-white" /> : <div className={cn("size-2 sm:size-2.5 rounded-full", active ? "bg-primary" : "bg-muted-foreground/30")} />}
      </div>
      <span className={cn("text-[11px] sm:text-xs font-semibold mt-1.5 text-center", active || completed ? "text-foreground" : "text-muted-foreground")}>{title}</span>
      <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground">{time}</span>
    </div>
  );
}
