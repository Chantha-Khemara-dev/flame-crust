"use client";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, Instagram, Twitter, Facebook, ArrowRight, Heart, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { fetchCategories } from "@/lib/food-api";

function TelegramIcon({ className = "size-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8-1.7 8.01c-.12.56-.46.7-.93.43l-2.58-1.9-1.25 1.2c-.14.14-.26.26-.52.26l.19-2.65 4.83-4.36c.21-.19-.05-.29-.32-.11l-5.97 3.76-2.57-.8c-.56-.17-.57-.56.12-.83l10.05-3.87c.47-.17.87.11.72.76z" />
    </svg>
  );
}

export function Footer({ hideNewsletter = false }) {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchCategories()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
        }
      })
      .catch(() => {});
  }, []);

  const footerLinks = {
    Menu: categories.length > 0
      ? categories.map((c) => ({ label: c.name, to: `/menu?category=${c.slug}` }))
      : [
          { label: "Pizza", to: "/menu?category=pizza" },
          { label: "Pizza Bagels", to: "/menu?category=pizza-bagels" },
          { label: "Burgers", to: "/menu?category=burgers" },
          { label: "Sides", to: "/menu?category=sides" },
          { label: "Drink", to: "/menu?category=Drink" },
        ],
    Company: [
      { label: "Our story", to: "/#features" },
      { label: "Careers", to: "/profile", note: "Join our team" },
      { label: "Franchising", to: "/menu", note: "Artisan Partner" },
      { label: "Gift cards", to: "/menu", note: "Give Great Taste" },
    ],
    Support: [
      { label: "📞 088 863 1805", to: "tel:0888631805", isExternal: true },
      { label: "✉️ Email Us", to: "mailto:chanthakhemara12@gmail.com", isExternal: true },
      { label: "✈️ Telegram Chat", to: "https://t.me/+855888631805", isExternal: true },
      { label: "Track order", to: "/profile" },
      { label: "Help center", to: "/profile" },
    ],
    Legal: [
      { label: "Privacy Policy", to: "/menu" },
      { label: "Terms of Service", to: "/menu" },
      { label: "Cookie Policy", to: "/menu" },
    ],
  };

  return (
    <footer className="relative bg-background text-foreground overflow-hidden mt-auto pt-6 sm:pt-10 lg:pt-14 pb-36 sm:pb-24 lg:pb-12 border-t border-border/60">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Newsletter Banner */}
        {!hideNewsletter && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-red-600 via-orange-600 to-amber-500 p-5 sm:p-8 lg:p-10 shadow-warm-lg overflow-hidden"
          >
            {/* Subtle background glow */}
            <div className="absolute -right-10 -bottom-10 size-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />

            <div className="grid lg:grid-cols-[1.3fr_1fr] gap-4 sm:gap-6 lg:gap-10 items-center relative z-10">
              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/20 text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-2 backdrop-blur-xs">
                  <Flame className="size-3 text-amber-300" /> Exclusive Offers
                </span>
                <h3 className="font-serif text-xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
                  Hungry yet? Let's fix that.
                </h3>
                <p className="mt-1 sm:mt-2 text-white/90 text-xs sm:text-base max-w-md leading-relaxed">
                  Get secret menu drops, VIP discount codes, and free garlic knots on your first order over $20.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  toast.success("You're in! Check your inbox for the deal.");
                  e.target.reset();
                }}
                className="flex flex-col sm:flex-row gap-2 mt-1 sm:mt-0"
              >
                <Input
                  type="email"
                  required
                  placeholder="your@email.com"
                  className="h-10 sm:h-12 rounded-xl sm:rounded-full bg-card/95 border-0 text-foreground placeholder:text-muted-foreground text-xs sm:text-sm px-4 shadow-inner"
                />
                <Button
                  type="submit"
                  size="lg"
                  className="h-10 sm:h-12 px-5 sm:px-6 rounded-xl sm:rounded-full bg-slate-950 text-white hover:bg-slate-900 text-xs sm:text-sm font-bold shadow-md whitespace-nowrap active:scale-95 transition-all"
                >
                  <span>Subscribe</span>
                  <ArrowRight className="size-3.5 ml-1" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}

        {/* Footer Navigation Columns */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 sm:gap-8 pt-8 sm:pt-10 pb-6">
          <div className="col-span-2 lg:col-span-2">
            <Link to="/" className="flex items-center">
              <img
                src="/images/library/logo.jpg"
                alt="Flame & Crust logo"
                className="h-14 sm:h-16 w-auto object-contain"
              />
            </Link>
            <p className="mt-3 text-xs sm:text-sm text-muted-foreground max-w-xs leading-relaxed">
              Wood-fired sourdough pizzas, hand-rolled pizza bagels, and smashed Angus burgers. Crafted with care, delivered hot in 25 minutes.
            </p>

            {/* Direct Contact Info */}
            <div className="mt-4 space-y-2 text-xs">
              <a
                href="tel:0888631805"
                className="flex items-center gap-2.5 text-foreground/90 hover:text-primary transition-colors group"
              >
                <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Phone className="size-3" />
                </div>
                <span className="font-semibold tracking-wide">088 863 1805</span>
              </a>

              <a
                href="mailto:chanthakhemara12@gmail.com"
                className="flex items-center gap-2.5 text-foreground/80 hover:text-primary transition-colors group"
              >
                <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Mail className="size-3" />
                </div>
                <span className="font-medium text-xs break-all">chanthakhemara12@gmail.com</span>
              </a>

              <a
                href="https://t.me/kanekira12"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 text-sky-600 dark:text-sky-400 hover:opacity-80 transition-opacity group"
              >
                <div className="size-6 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-500 group-hover:scale-110 transition-transform">
                  <TelegramIcon className="size-3.5" />
                </div>
                <span className="font-semibold">Telegram: 088 863 1805</span>
              </a>
            </div>
            
            {/* Social Links */}
            <div className="mt-4 flex items-center gap-2">
              {[
                { icon: TelegramIcon, href: "https://t.me/kanekira12", label: "Telegram", hover: "hover:bg-sky-500 hover:text-white" },
                { icon: Facebook, href: "https://facebook.com", label: "Facebook", hover: "hover:bg-blue-600 hover:text-white" },
              ].map((item, i) => (
                <a
                  key={i}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center justify-center size-8 sm:size-9 rounded-full bg-secondary/80 text-muted-foreground transition-all cursor-pointer shadow-2xs ${item.hover}`}
                  aria-label={item.label}
                >
                  <item.icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-serif text-xs sm:text-sm font-bold text-foreground uppercase tracking-wider mb-2.5 sm:mb-3.5">
                {title}
              </h4>
              <ul className="space-y-1.5 sm:space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.isExternal ? (
                      <a
                        href={link.to}
                        className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors inline-block"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.to}
                        className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors inline-block"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Copyright */}
        <div className="pt-4 pb-2 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] sm:text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Flame & Crust Pizza Co. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Crafted with <Heart className="size-3 text-red-500 fill-red-500" /> for artisan pizza lovers
          </p>
        </div>

      </div>
    </footer>
  );
}

export default Footer;
