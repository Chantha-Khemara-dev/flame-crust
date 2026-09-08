import { Users, Search, Mail, Phone, ShoppingBag, Clock, X, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";

export function CustomersView({ customers = [], orders = [] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCustomer, setActiveCustomer] = useState(null);

  // Enrich customers with their order history
  const enrichedCustomers = customers.map(customer => {
    const customerOrders = orders.filter(o => String(o.customer_id) === String(customer.id));
    
    // Total Orders
    const totalOrders = customerOrders.length;
    
    // Total Spent
    const totalSpent = customerOrders.reduce((sum, order) => {
      const amount = parseFloat(order.total || order.total_amount) || 0;
      return sum + amount;
    }, 0);

    // Favorite Product (simplified: get most frequent product name from order items)
    let favorite = "N/A";
    const itemCounts = {};
    customerOrders.forEach(o => {
      o.items?.forEach(item => {
        itemCounts[item.product_name] = (itemCounts[item.product_name] || 0) + (parseInt(item.quantity) || 1);
      });
    });
    if (Object.keys(itemCounts).length > 0) {
      favorite = Object.keys(itemCounts).reduce((a, b) => itemCounts[a] > itemCounts[b] ? a : b);
    }

    // Last Order Time
    const lastOrderDate = customerOrders.length > 0 
      ? new Date(Math.max(...customerOrders.map(o => new Date(o.created_at))))
      : null;
    
    const lastOrderString = lastOrderDate 
      ? lastOrderDate.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : "No orders";

    return {
      ...customer,
      name: customer.name || 'Unknown Customer',
      username: `@${(customer.name || 'user').toLowerCase().replace(/\s+/g, '')}`,
      type: totalOrders >= 5 ? 'VIP' : 'Regular',
      ordersCount: totalOrders,
      spent: totalSpent.toFixed(2),
      favorite,
      lastOrder: lastOrderString
    };
  }).filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-6 shrink-0">
        <div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2.5 sm:gap-3">
            <Users className="size-5 sm:size-6 text-primary" /> Customers Directory
          </h2>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-0.5">Manage and view customer profiles and order history</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search customers..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-card border border-border/70 rounded-full pl-10 pr-4 py-2 text-sm font-medium text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-xs"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-6">
        {enrichedCustomers.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <EmptyState 
              icon={Users}
              title="No customers found" 
              description="No customers match your search term." 
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {enrichedCustomers.map(customer => (
              <div 
                key={customer.id} 
                onClick={() => setActiveCustomer(customer)}
                className="bg-card rounded-3xl p-5 border border-border/70 shadow-warm hover:shadow-warm-lg hover:border-primary/40 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border/60 shadow-xs">
                      {customer.avatar ? (
                        <img src={customer.avatar.startsWith('http') ? customer.avatar : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(customer.name)}&backgroundColor=cbd5e1&textColor=334155`} alt={customer.name} className="w-full h-full object-cover" />
                      ) : (
                        <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(customer.name)}&backgroundColor=cbd5e1&textColor=334155`} alt={customer.name} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-foreground truncate max-w-[130px]">{customer.name}</h3>
                      <p className="text-xs font-medium text-muted-foreground">{customer.username}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md border shrink-0 ${
                    customer.type === 'VIP' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                  }`}>
                    {customer.type}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-50 dark:bg-zinc-950 rounded-xl p-3 border border-slate-100 dark:border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Total Orders</span>
                    <div className="flex items-center gap-1.5 font-black text-slate-800 dark:text-zinc-200">
                      <ShoppingBag className="size-3.5 text-blue-500" /> {customer.ordersCount}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-zinc-950 rounded-xl p-3 border border-slate-100 dark:border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Spent</span>
                    <div className="flex items-center gap-1.5 font-black text-slate-800 dark:text-zinc-200">
                       <span className="text-emerald-500">$</span> {customer.spent}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm font-bold text-slate-600 dark:text-zinc-400 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 dark:text-zinc-500 shrink-0">Favorite:</span>
                    <span className="truncate ml-2">{customer.favorite}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 dark:text-zinc-500 shrink-0">Last Order:</span>
                    <span className="truncate ml-2">{customer.lastOrder}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-white/5" onClick={(e) => e.stopPropagation()}>
                  {customer.email && (
                    <a href={`mailto:${customer.email}`} className="flex-1 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors">
                      <Mail className="size-3.5" /> Email
                    </a>
                  )}
                  {customer.phone && (
                    <a href={`tel:${customer.phone}`} className="flex-1 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors">
                      <Phone className="size-3.5" /> Call
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Customer Orders Modal Dialog */}
      <Dialog open={Boolean(activeCustomer)} onOpenChange={(open) => !open && setActiveCustomer(null)}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="size-5 text-blue-500" />
              {activeCustomer?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-slate-200/60 dark:border-zinc-800 my-2">
            <div className="flex-1">
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-bold">{activeCustomer?.email || 'No email'}</p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-bold">{activeCustomer?.phone || 'No phone'}</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-400 uppercase block">Total Orders</span>
              <span className="text-base font-black text-slate-900 dark:text-white">{activeCustomer?.ordersCount}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 mt-2 pr-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Order History</h4>
            {orders.filter(o => String(o.customer_id) === String(activeCustomer?.id)).length === 0 ? (
              <p className="text-xs font-bold text-slate-400 text-center py-6">No previous orders found for this customer.</p>
            ) : (
              orders
                .filter(o => String(o.customer_id) === String(activeCustomer?.id))
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .map(o => (
                  <div key={o.id} className="p-3 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl flex items-center justify-between shadow-sm">
                    <div>
                      <span className="text-xs font-black text-slate-900 dark:text-white block">
                        Order #{o.order_number ? (o.order_number.length > 8 ? o.order_number.slice(-6) : o.order_number) : o.id}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date(o.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        o.status === 'READY' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400' :
                        o.status === 'PREPARING' ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400' :
                        'bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}>
                        {o.status}
                      </span>
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        ${Number(o.total || o.total_amount || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
