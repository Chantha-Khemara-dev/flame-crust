import { useState, useEffect, useRef, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Flame, Leaf, ArrowRight, Plus, Check } from "lucide-react";
import { getProducts } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart-store";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const addItem = useCart((s) => s.addItem);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getProducts().then(data => {
        setProducts(Array.isArray(data) ? data : (data.products || []));
        setLoading(false);
      });
      // Focus input
      setTimeout(() => inputRef.current?.focus(), 100);

      // Lock scroll
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => document.body.style.overflow = orig;
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!isOpen) onClose(true);
      }
      if (e.key === 'Escape' && isOpen) {
        onClose(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);


  if (!isOpen) return null;

  const filtered = query.length > 1
    ? products.filter(p =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.description?.toLowerCase().includes(query.toLowerCase()) ||
      (Array.isArray(p.tags) ? p.tags : (typeof p.tags === 'string' && p.tags ? p.tags.split(',').map(s => s.trim()) : [])).some(t => t.toLowerCase().includes(query.toLowerCase()))
    )
    : [];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => onClose(false)}
        className="fixed inset-0 z-[100] bg-black/20 p-4 sm:p-6 flex items-start justify-center pt-20 sm:pt-32"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-card rounded-2xl sm:rounded-3xl shadow-2xl border border-border/60 overflow-hidden flex flex-col max-h-[80vh]"
        >
          {/* Search Input */}
          <div className="relative flex items-center border-b border-border/60 px-4 sm:px-6 py-4">
            <Search className="size-6 text-primary shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for pizza, burgers, or ingredients..."
              className="flex-1 bg-transparent border-none outline-none px-4 text-lg sm:text-xl text-foreground placeholder:text-muted-foreground/60"
            />
            <button
              onClick={() => onClose(false)}
              className="p-2 rounded-full hover:bg-secondary text-muted-foreground transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-4">
            {query.length <= 1 ? (
              <div className="py-8 px-4 text-center">
                <Search className="size-10 mx-auto mb-3 text-primary/40" />
                <p className="text-sm font-semibold text-foreground">Quick Search Suggestions</p>
                <p className="text-xs text-muted-foreground mt-1 mb-5">Click a popular item tag or start typing to search</p>
                <div className="flex flex-wrap items-center justify-center gap-2 max-w-md mx-auto">
                  {["Pepperoni", "Margherita", "Burgers", "Bagels", "Truffle Fries", "Spicy"].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setQuery(tag)}
                      className="px-3.5 py-1.5 rounded-full bg-secondary/80 hover:bg-primary/10 hover:text-primary border border-border/50 text-xs font-semibold transition-all duration-200 shadow-2xs hover:border-primary/30"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p>No results found for "{query}"</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 w-full overflow-hidden">
                {filtered.map(product => (
                  <SearchResultRow
                    key={product.id}
                    product={product}
                    onClose={onClose}
                    navigate={navigate}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="bg-secondary/30 border-t border-border/60 px-4 py-3 flex justify-between items-center text-xs text-muted-foreground">
            <span>Press <kbd className="font-mono bg-background border rounded px-1.5 py-0.5">ESC</kbd> to close</span>
            <span>Search powered by Flame & Crust</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const SearchResultRow = ({ product, onClose, navigate }) => {
  const addItem = useCart((s) => s.addItem);
  const inCartQty = useCart((s) => s.lines.find((l) => String(l.id) === String(product.id))?.qty || 0);
  const inCart = inCartQty > 0;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    window.dispatchEvent(
      new CustomEvent("fly-to-cart", {
        detail: {
          image: product.image,
          startRect: rect,
        },
      })
    );

    addItem(product);
  };

  return (
    <div
      onClick={() => {
        onClose(false);
        navigate(`/product/${product.id}`);
      }}
      className="search-result-row w-full flex items-center gap-2.5 sm:gap-4 p-2 sm:p-3 rounded-xl hover:bg-secondary/60 transition-colors text-left group cursor-pointer overflow-hidden"
    >
      <div className="size-14 sm:size-16 rounded-lg overflow-hidden bg-secondary shrink-0 relative">
        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <h4 className="font-semibold text-sm sm:text-base text-foreground truncate">{product.name}</h4>
          {product.spicy && <Flame className="size-3 text-primary shrink-0" />}
          {product.vegetarian && <Leaf className="size-3 text-green-600 shrink-0" />}
        </div>
        <p className="text-[11px] sm:text-sm text-muted-foreground line-clamp-1 mt-0.5">
          {product.description}
        </p>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 pl-1 sm:pl-2">
        <div className="flex flex-col items-end sm:items-start mr-2 sm:mr-0 hidden sm:flex">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Price</span>
          <span className="font-bold text-foreground leading-none">${product.price.toFixed(2)}</span>
        </div>
        <span className="font-bold text-sm sm:text-base text-foreground sm:hidden shrink-0">${product.price.toFixed(2)}</span>

        <Button
          onClick={handleAddToCart}
          size="sm"
          className={cn(
            "h-8 px-2.5 sm:h-9 sm:px-3 rounded-full font-semibold shadow-sm transition-all group/btn flex items-center gap-1 sm:gap-1.5 shrink-0",
            inCart
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-foreground text-background hover:bg-primary hover:text-primary-foreground"
          )}
        >
          {inCart ? (
            <Fragment>
              <Check className="size-3.5" />
              <span className="ml-0.5 text-xs hidden sm:inline">In cart</span>
            </Fragment>
          ) : (
            <Fragment>
              <Plus className="size-3.5 group-hover/btn:rotate-90 transition-transform" />
              <span className="ml-0.5 text-xs hidden sm:inline">Add</span>
            </Fragment>
          )}
        </Button>
      </div>
    </div>
  );
};
