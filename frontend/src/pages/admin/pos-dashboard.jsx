import { useState, useEffect, useMemo } from "react";
import { Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle2, Loader2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { fetchFoodItems, fetchCategories } from "@/lib/food-api";
import { create } from "@/lib/api";

export default function PosDashboard() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [cart, setCart] = useState([]);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [prodData, catData] = await Promise.all([
          fetchFoodItems(),
          fetchCategories()
        ]);
        setProducts(prodData || []);
        setCategories(catData || []);
      } catch (err) {
        toast.error("Failed to load POS data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (activeCategory !== "all" && p.category !== activeCategory && p.categoryId !== activeCategory) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [products, activeCategory, search]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + ((item.price || item.basePrice || 0) * item.qty), 0);

  const placeOrder = async () => {
    if (cart.length === 0) return;
    setIsPlacingOrder(true);
    
    try {
      const auth = JSON.parse(localStorage.getItem('adminAuth') || "{}");
      const staffId = auth.id || null;
      
      // Create Order
      const orderData = {
        order_number: "POS-" + Date.now().toString().slice(-6),
        order_type: "TAKEAWAY",
        status: "CONFIRMED", // Pre-confirmed since staff took it
        subtotal: cartTotal,
        total: cartTotal,
        staff_id: staffId,
        branch_id: 1 // Default branch
      };
      
      const createdOrder = await create("orders", orderData);
      
      // Create Order Items
      for (const item of cart) {
        const price = item.price || item.basePrice || 0;
        await create("order_items", {
          order_id: createdOrder.id,
          product_id: item.id,
          product_name: item.name,
          quantity: item.qty,
          unit_price: price,
          line_total: price * item.qty,
          status: "PENDING"
        });
      }
      
      toast.success(`Order #${createdOrder.id} placed successfully!`);
      setCart([]);
    } catch (err) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (loading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      {/* Left: Product Grid */}
      <div className="flex-1 flex flex-col min-w-0 bg-card rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b space-y-4">
          <div className="flex items-center gap-2">
            <Store className="size-5 text-primary" />
            <h2 className="text-xl font-bold">Point of Sale</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              placeholder="Search products..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-9 bg-secondary/50 border-0 focus-visible:ring-1"
            />
          </div>
          
          <ScrollArea className="w-full whitespace-nowrap pb-2">
            <div className="flex gap-2">
              <Badge 
                variant={activeCategory === "all" ? "default" : "secondary"}
                className="cursor-pointer px-4 py-1.5 text-sm rounded-full transition-colors"
                onClick={() => setActiveCategory("all")}
              >
                All
              </Badge>
              {categories.map(cat => (
                <Badge 
                  key={cat.id} 
                  variant={activeCategory === cat.slug ? "default" : "secondary"}
                  className="cursor-pointer px-4 py-1.5 text-sm rounded-full transition-colors"
                  onClick={() => setActiveCategory(cat.slug)}
                >
                  {cat.name}
                </Badge>
              ))}
            </div>
          </ScrollArea>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <Card 
                key={product.id} 
                className="cursor-pointer overflow-hidden hover:border-primary/50 hover:shadow-md transition-all group"
                onClick={() => addToCart(product)}
              >
                <div className="aspect-square relative overflow-hidden bg-secondary/30">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="bg-background/90 backdrop-blur text-foreground rounded-full size-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                      <Plus className="size-5" />
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm line-clamp-1" title={product.name}>{product.name}</h3>
                  <p className="text-primary font-bold mt-1">${parseFloat(product.price || product.basePrice || 0).toFixed(2)}</p>
                </div>
              </Card>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                No products found.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right: Current Order Ticket */}
      <div className="w-full lg:w-96 shrink-0 flex flex-col bg-card rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-secondary/20 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <ShoppingCart className="size-5" />
            Current Order
          </div>
          <Badge variant="outline" className="font-mono bg-background">
            {cart.reduce((s, i) => s + i.qty, 0)} Items
          </Badge>
        </div>

        <ScrollArea className="flex-1 p-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3 opacity-50 py-12">
              <ShoppingCart className="size-12" />
              <p>Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map(item => (
                <div key={item.id} className="flex gap-3 group">
                  <div className="size-12 rounded-lg bg-secondary overflow-hidden shrink-0">
                    <img src={item.image} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm leading-tight truncate">{item.name}</h4>
                    <p className="text-muted-foreground text-xs mt-0.5">${parseFloat(item.price || item.basePrice || 0).toFixed(2)}</p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center border rounded-md h-7 overflow-hidden">
                        <button onClick={() => updateQty(item.id, -1)} className="px-2 hover:bg-secondary h-full transition-colors">
                          <Minus className="size-3" />
                        </button>
                        <span className="text-xs font-medium w-6 text-center select-none">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="px-2 hover:bg-secondary h-full transition-colors">
                          <Plus className="size-3" />
                        </button>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                        title="Remove"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="font-semibold text-sm">
                    ${((item.price || item.basePrice || 0) * item.qty).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t bg-secondary/5 space-y-4">
          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total</span>
            <span className="text-primary">${cartTotal.toFixed(2)}</span>
          </div>
          
          <Button 
            className="w-full h-12 text-base font-bold shadow-sm" 
            disabled={cart.length === 0 || isPlacingOrder}
            onClick={placeOrder}
          >
            {isPlacingOrder ? (
              <><Loader2 className="size-5 mr-2 animate-spin" /> Processing...</>
            ) : (
              <><CheckCircle2 className="size-5 mr-2" /> Place Order</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
