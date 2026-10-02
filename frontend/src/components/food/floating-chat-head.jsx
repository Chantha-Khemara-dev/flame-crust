import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MessageSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function FloatingChatHead({
  visible = false,
  photo,
  name = "Chat",
  role = "Driver",
  lastMessage = "",
  unreadCount = 0,
  onClick,
  onDismiss
}) {
  const [showPreview, setShowPreview] = useState(false);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (lastMessage) {
      setShowPreview(true);
      const timer = setTimeout(() => {
        setShowPreview(false);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [lastMessage, unreadCount]);

  if (!visible) return null;

  return (
    <motion.div 
      drag
      dragMomentum={false}
      dragElastic={0.1}
      whileDrag={{ scale: 1.08, cursor: "grabbing" }}
      onDragStart={() => {
        isDraggingRef.current = true;
      }}
      onDragEnd={() => {
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 150);
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className="fixed right-4 bottom-24 z-[95] flex items-center justify-end group select-none touch-none cursor-grab"
    >
      {/* Speech Bubble Preview (Android Chat Head style) */}
      {showPreview && lastMessage && (
        <div 
          onClick={(e) => {
            if (isDraggingRef.current) return;
            e.stopPropagation();
            if (onClick) onClick();
          }}
          className="mr-3 bg-white dark:bg-zinc-900 border-2 border-red-500/50 shadow-2xl rounded-2xl py-2.5 px-3.5 max-w-[210px] sm:max-w-[250px] cursor-pointer hover:scale-102 transition-transform animate-in slide-in-from-right-4 duration-300 relative"
        >
          {/* Triangular Tail */}
          <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-0 h-0 border-y-6 border-y-transparent border-l-8 border-l-white dark:border-l-zinc-900 drop-shadow-xs" />
          
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="font-black text-[11px] text-red-600 dark:text-red-400 truncate">
              {name}
            </span>
            <span className="text-[9px] text-muted-foreground font-semibold whitespace-nowrap">Just now</span>
          </div>
          <p className="text-xs text-slate-800 dark:text-zinc-200 line-clamp-2 font-medium leading-tight">
            {lastMessage}
          </p>
        </div>
      )}

      {/* Circular Android Chat Head */}
      <div className="relative">
        <div
          onClick={() => {
            if (isDraggingRef.current) return;
            if (onClick) onClick();
          }}
          className={cn(
            "relative size-14 sm:size-15 rounded-full p-0.5 shadow-2xl transition-all duration-300 cursor-pointer active:scale-90",
            "bg-gradient-to-tr from-red-600 to-amber-500 ring-4 ring-white/90 dark:ring-zinc-900/90",
            unreadCount > 0 && "animate-bounce"
          )}
          title={`Chat with ${name} (Drag anywhere)`}
        >
          {photo ? (
            <img 
              src={photo} 
              alt={name} 
              className="size-full rounded-full object-cover shadow-inner pointer-events-none" 
            />
          ) : (
            <div className="size-full rounded-full bg-gradient-to-tr from-amber-500 to-red-600 text-white flex items-center justify-center shadow-inner pointer-events-none">
              <MessageSquare className="size-6 text-white" />
            </div>
          )}

          {/* Active Online Green Dot */}
          <span className="absolute bottom-0 right-0 size-3.5 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full shadow-xs ring-2 ring-emerald-500/20" />
        </div>

        {/* Red Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1.5 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white dark:ring-zinc-900 shadow-lg animate-pulse pointer-events-none">
            {unreadCount}
          </span>
        )}

        {/* Small Dismiss Button on Hover */}
        {onDismiss && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="absolute -top-2 -left-2 size-5.5 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md cursor-pointer z-10"
            title="Dismiss Chat Head"
          >
            <X className="size-3" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
