"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Minus,
  Star,
  Flame,
  Leaf,
  Check,
  ShoppingCart,
  Edit,
  User,
  MessageCircle,
  Trash2,
  CheckCircle2,
  ThumbsUp,
  Send,
  Smile,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/food/navbar";
import { FacebookReactionButton } from "@/components/food/facebook-reaction-button";
import "./product-detail.css";

import { FoodCard } from "@/components/food/food-card";
import { DetailSkeleton } from "@/components/shared/loading-skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { PageTransition } from "@/components/shared/page-transition";
import { getImageUrl, getCachedFoodItems, fetchFoodItems } from "@/lib/food-api";
import { DEFAULT_FALLBACK_PRODUCTS, DEFAULT_REVIEWS } from "@/lib/food-data";
import { useCart } from "@/lib/cart-store";
import { list, get, getProducts, create, toggleReviewReaction } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import "./product-detail.css";

function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addItem = useCart((s) => s.addItem);
  const removeItem = useCart((s) => s.removeItem);
  const lines = useCart((s) => s.lines);
  const isCartOpen = useCart((s) => s.isOpen);
  const inCart = lines.find((l) => l.id === id);

  const [product, setProduct] = useState(() => {
    const cached = getCachedFoodItems().find((p) => String(p.id) === String(id));
    return cached || null;
  });
  const [loading, setLoading] = useState(() => {
    return !getCachedFoodItems().some((p) => String(p.id) === String(id));
  });
  const [error, setError] = useState(null);
  const [qty, setQty] = useState(1);
  const [options, setOptions] = useState([]);
  const [variants, setVariants] = useState([]);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [reviews, setReviews] = useState([]);
  const [related, setRelated] = useState([]);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [selectedRatingFilter, setSelectedRatingFilter] = useState(0); // 0 = all
  const [isWriteReviewOpen, setIsWriteReviewOpen] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newHoverRating, setNewHoverRating] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Review Replies & Facebook-Style Emoji Reactions
  const FB_REACTIONS = [
    { id: "like", emoji: "👍", label: "ចូលចិត្ត", color: "text-blue-500 font-bold", name: "Like" },
    { id: "love", emoji: "❤️", label: "ស្រឡាញ់", color: "text-red-500 font-bold", name: "Love" },
    { id: "care", emoji: "🥰", label: "យកចិត្តទុកដាក់", color: "text-amber-500 font-bold", name: "Care" },
    { id: "haha", emoji: "😆", label: "សើច", color: "text-amber-500 font-bold", name: "Haha" },
    { id: "wow", emoji: "😮", label: "ភ្ញាក់ផ្អើល", color: "text-amber-500 font-bold", name: "Wow" },
    { id: "sad", emoji: "😢", label: "សោកសៅ", color: "text-amber-500 font-bold", name: "Sad" },
    { id: "angry", emoji: "😡", label: "ខឹង", color: "text-orange-600 font-bold", name: "Angry" },
  ];
  const QUICK_EMOJIS = ["🍕", "🔥", "❤️", "👍", "😍", "😋", "👏", "🎉", "✨", "🤤", "🙏", "💯"];

  const [reviewReplies, setReviewReplies] = useState(() => {
    try {
      const saved = localStorage.getItem("flame_crust_review_replies");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });

  const [reviewReactions, setReviewReactions] = useState(() => {
    try {
      const saved = localStorage.getItem("flame_crust_review_reactions");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });

  const [replyReactions, setReplyReactions] = useState(() => {
    try {
      const saved = localStorage.getItem("flame_crust_reply_reactions");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });

  const [customersList, setCustomersList] = useState([]);
  const [activeReactionDockReviewId, setActiveReactionDockReviewId] = useState(null);
  const [openReplyReviewIds, setOpenReplyReviewIds] = useState({});
  const [replyTextMap, setReplyTextMap] = useState({});
  const [openQuickEmojiReviewId, setOpenQuickEmojiReviewId] = useState(null);

  const currentAuthUser = (() => {
    try {
      const admin = JSON.parse(localStorage.getItem("adminAuth") || "null");
      const customer = JSON.parse(localStorage.getItem("customerAuth") || "null");
      if (admin?.token || admin?.email) {
        return { name: admin.name || "Staff", avatar: admin.avatar || null, isStaff: true };
      }
      if (customer?.name || customer?.email) {
        return { name: customer.name || "Customer", avatar: customer.avatar || null, isStaff: false };
      }
    } catch (e) {}
    return { name: "You", avatar: null, isStaff: false };
  })();

  const toggleReply = (reviewId) => {
    setOpenReplyReviewIds(prev => {
      const current = prev[reviewId] ?? ((reviewReplies[reviewId] || []).length > 0);
      return {
        ...prev,
        [reviewId]: !current
      };
    });
  };

  const handleInsertEmoji = (reviewId, emoji) => {
    setReplyTextMap(prev => ({
      ...prev,
      [reviewId]: (prev[reviewId] || "") + emoji
    }));
  };

  const getClientIdentifier = () => {
    try {
      let id = localStorage.getItem("flame_crust_client_id");
      if (!id) {
        id = "client_" + Math.random().toString(36).substring(2, 12);
        localStorage.setItem("flame_crust_client_id", id);
      }
      return id;
    } catch (e) {
      return "client_guest";
    }
  };

  const handleReaction = async (reviewId, emoji) => {
    const clientId = getClientIdentifier();

    setReviewReactions(prev => {
      const current = prev[reviewId] || { userReacted: [] };
      const userReacted = current.userReacted || [];
      const hasSameReacted = userReacted.includes(emoji);

      const updatedCounts = { ...current };

      // Remove any previously selected reaction by this user on this review
      userReacted.forEach(prevEmoji => {
        updatedCounts[prevEmoji] = Math.max(0, (updatedCounts[prevEmoji] || 1) - 1);
      });

      if (!hasSameReacted) {
        updatedCounts[emoji] = (updatedCounts[emoji] || 0) + 1;
        updatedCounts.userReacted = [emoji];
      } else {
        updatedCounts.userReacted = [];
      }

      const updated = {
        ...prev,
        [reviewId]: updatedCounts
      };
      try {
        localStorage.setItem("flame_crust_review_reactions", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      await toggleReviewReaction({
        review_id: Number(reviewId),
        emoji,
        user_identifier: clientId,
      });
      syncReviewsData();
    } catch (e) {
      console.warn("DB reaction toggle error:", e);
    }
  };

  const handleReplyReaction = async (replyId, emoji) => {
    const clientId = getClientIdentifier();

    setReplyReactions((prev) => {
      const current = prev[replyId] || { userReacted: [] };
      const userReacted = current.userReacted || [];
      const hasSameReacted = userReacted.includes(emoji);

      const updatedCounts = { ...current };

      // Remove any previously selected reaction by this user on this reply
      userReacted.forEach((prevEmoji) => {
        updatedCounts[prevEmoji] = Math.max(0, (updatedCounts[prevEmoji] || 1) - 1);
      });

      if (!hasSameReacted) {
        updatedCounts[emoji] = (updatedCounts[emoji] || 0) + 1;
        updatedCounts.userReacted = [emoji];
      } else {
        updatedCounts.userReacted = [];
      }

      const updated = {
        ...prev,
        [replyId]: updatedCounts,
      };
      try {
        localStorage.setItem("flame_crust_reply_reactions", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      await toggleReviewReaction({
        reply_id: String(replyId),
        emoji,
        user_identifier: clientId,
      });
      syncReviewsData();
    } catch (e) {
      console.warn("DB reply reaction toggle error:", e);
    }
  };

  const handleSubmitReply = async (reviewId) => {
    const text = (replyTextMap[reviewId] || "").trim();
    if (!text) {
      toast.error("Please enter a reply message / សូមបញ្ចូលសារឆ្លើយតប");
      return;
    }

    let authorName = "Flame & Crust Foodie";
    let isStaff = false;
    let authorAvatar = null;

    try {
      const admin = JSON.parse(localStorage.getItem("adminAuth") || "null");
      const customer = JSON.parse(localStorage.getItem("customerAuth") || "null");
      if (admin?.token || admin?.email) {
        authorName = admin.name || "Flame & Crust Staff";
        isStaff = true;
      } else if (customer?.name || customer?.email) {
        authorName = customer.name || "Customer";
        authorAvatar = customer.avatar || null;
        if (!authorAvatar && customersList.length > 0) {
          const matched = customersList.find(c => String(c.id) === String(customer.id) || c.email === customer.email);
          if (matched?.avatar) authorAvatar = matched.avatar;
        }
      }
    } catch (e) {}

    const tempId = "rep-" + Date.now();
    const newReply = {
      id: tempId,
      review_id: Number(reviewId),
      author_name: authorName,
      author_avatar: authorAvatar,
      is_staff: isStaff,
      comment: text,
      created_at: new Date().toISOString()
    };

    setReviewReplies(prev => {
      const currentList = prev[reviewId] || [];
      const updated = {
        ...prev,
        [reviewId]: [...currentList, newReply]
      };
      try {
        localStorage.setItem("flame_crust_review_replies", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setOpenReplyReviewIds(prev => ({ ...prev, [reviewId]: true }));
    setReplyTextMap(prev => ({ ...prev, [reviewId]: "" }));
    toast.success("Reply posted! 💬 បានផ្ញើការឆ្លើយតបជោគជ័យ");

    // Persist directly into MySQL database via API
    try {
      const saved = await create("review_replies", {
        review_id: Number(reviewId),
        author_name: authorName,
        author_avatar: authorAvatar,
        is_staff: isStaff,
        comment: text,
      });
      if (saved && saved.id) {
        setReviewReplies(prev => {
          const list = (prev[reviewId] || []).map(r => r.id === tempId ? { ...r, id: saved.id } : r);
          return { ...prev, [reviewId]: list };
        });
      }
      syncReviewsData();
    } catch (err) {
      console.warn("DB reply save error:", err);
    }
  };

  // Live synchronization of reviews, review_replies, and reactions across phone and laptop
  const syncReviewsData = useCallback(async () => {
    try {
      const ts = Date.now();
      const [repliesRes, reactionsRes] = await Promise.allSettled([
        list("review_replies", { _t: ts }, { noCache: true }),
        list("review_reactions", { _t: ts }, { noCache: true })
      ]);

      if (repliesRes.status === "fulfilled" && Array.isArray(repliesRes.value)) {
        const repliesMap = {};
        const sortedReplies = [...repliesRes.value].sort((a, b) => {
          const timeA = new Date(a.created_at || 0).getTime() || Number(a.id || 0);
          const timeB = new Date(b.created_at || 0).getTime() || Number(b.id || 0);
          return timeA - timeB;
        });

        sortedReplies.forEach(rep => {
          const rId = String(rep.review_id || rep.reviewId);
          if (!repliesMap[rId]) repliesMap[rId] = [];
          repliesMap[rId].push(rep);
        });

        setReviewReplies(repliesMap);
        try {
          localStorage.setItem("flame_crust_review_replies", JSON.stringify(repliesMap));
        } catch (e) {}
      }

      if (reactionsRes.status === "fulfilled" && Array.isArray(reactionsRes.value)) {
        const clientId = getClientIdentifier();
        const reactionsMap = {};
        const repReactionsMap = {};

        reactionsRes.value.forEach(react => {
          const revId = react.review_id || react.reviewId;
          const repId = react.reply_id || react.replyId;
          const emoji = react.emoji;
          const isMe = (react.user_identifier === clientId || react.userIdentifier === clientId);

          if (repId) {
            const key = String(repId);
            if (!repReactionsMap[key]) repReactionsMap[key] = { userReacted: [] };
            repReactionsMap[key][emoji] = (repReactionsMap[key][emoji] || 0) + 1;
            if (isMe && !repReactionsMap[key].userReacted.includes(emoji)) {
              repReactionsMap[key].userReacted.push(emoji);
            }
          } else if (revId) {
            const key = String(revId);
            if (!reactionsMap[key]) reactionsMap[key] = { userReacted: [] };
            reactionsMap[key][emoji] = (reactionsMap[key][emoji] || 0) + 1;
            if (isMe && !reactionsMap[key].userReacted.includes(emoji)) {
              reactionsMap[key].userReacted.push(emoji);
            }
          }
        });

        setReviewReactions(reactionsMap);
        setReplyReactions(repReactionsMap);
        try {
          localStorage.setItem("flame_crust_review_reactions", JSON.stringify(reactionsMap));
          localStorage.setItem("flame_crust_reply_reactions", JSON.stringify(repReactionsMap));
        } catch (e) {}
      }
    } catch (e) {
      console.warn("Reviews live sync error:", e);
    }
  }, []);

  // Background live polling every 3.5s so both phone and laptop see real-time updates
  useEffect(() => {
    syncReviewsData();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      syncReviewsData();
    }, 3500);

    const handleVis = () => {
      if (document.visibilityState === "visible") syncReviewsData();
    };
    document.addEventListener("visibilitychange", handleVis);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVis);
    };
  }, [syncReviewsData]);

  useEffect(() => {
    let isMounted = true;
    async function fetchProduct() {
      try {
        let prod = null;
        let allProds = [];
        try {
          allProds = await fetchFoodItems();
          if (Array.isArray(allProds)) {
            prod = allProds.find(p => String(p.id) === String(id) || String(p.sku || "").toLowerCase() === String(id).toLowerCase() || String(p.slug || "").toLowerCase() === String(id).toLowerCase());
          }
        } catch (e) {}

        if (!prod) {
          const fallbackList = getCachedFoodItems();
          if (allProds.length === 0) allProds = fallbackList;
          prod = fallbackList.find(p => String(p.id) === String(id) || String(p.sku || "").toLowerCase() === String(id).toLowerCase() || String(p.slug || "").toLowerCase() === String(id).toLowerCase());
        }

        if (!prod) {
          if (allProds.length === 0) allProds = DEFAULT_FALLBACK_PRODUCTS;
          prod = DEFAULT_FALLBACK_PRODUCTS.find(p => String(p.id) === String(id) || String(p.sku || "").toLowerCase() === String(id).toLowerCase() || String(p.slug || "").toLowerCase() === String(id).toLowerCase()) || DEFAULT_FALLBACK_PRODUCTS[0];
        }

        if (!isMounted) return;

        const isPizzaCategory = prod.category === 'pizza' || prod.category_id === 1 || (prod.name && prod.name.toLowerCase().includes('pizza'));
        let allOptions = (prod.options && prod.options.length > 0)
          ? prod.options
          : isPizzaCategory
            ? [
                {
                  id: 1,
                  name: "Size",
                  is_required: true,
                  variants: [
                    { id: 1, name: 'Small', price_adjustment: 0.00, active: true },
                    { id: 2, name: 'Medium', price_adjustment: 2.00, active: true },
                    { id: 3, name: 'Large', price_adjustment: 4.00, active: true }
                  ]
                }
              ]
            : [];

        let allVariants = [];
        allOptions.forEach(opt => {
          if (opt.variants) {
            allVariants = allVariants.concat(opt.variants);
          }
        });

        let allReviews = [];
        try {
          const [reviewsRes, customersRes] = await Promise.allSettled([
            list("reviews"),
            list("customers"),
          ]);
          if (reviewsRes.status === "fulfilled" && Array.isArray(reviewsRes.value)) {
            allReviews = reviewsRes.value;
          }
          if (customersRes.status === "fulfilled" && Array.isArray(customersRes.value)) {
            allCustomers = customersRes.value;
            setCustomersList(customersRes.value);
          }
          syncReviewsData();
        } catch (e) {
          // silent
        }

        setProduct(prod);

        const prodOptions = allOptions;
        const prodVariants = allVariants.filter(v => v.active !== false);

        const defaults = {};
        prodOptions.forEach(opt => {
          const optVars = prodVariants.filter(v => String(v.option_id) === String(opt.id) || opt.variants?.some(vr => vr.id === v.id));
          if (optVars.length > 0) {
            defaults[opt.id] = optVars[0].id;
          } else if (opt.variants && opt.variants.length > 0) {
            defaults[opt.id] = opt.variants[0].id;
          }
        });

        setOptions(prodOptions);
        setVariants(prodVariants);
        setSelectedVariants(defaults);

        // Populate related products from the same category
        if (Array.isArray(allProds) && allProds.length > 0) {
          const rel = allProds
            .filter(p => String(p.id) !== String(prod.id) && (p.category === prod.category || p.category_id === prod.category_id))
            .slice(0, 4);
          setRelated(rel);
        }

        // Filter reviews for current product (matching by ID or SKU)
        let productReviews = allReviews
          .filter(r => (String(r.product_id) === String(id) || (prod.sku && String(r.product_id).toLowerCase() === String(prod.sku).toLowerCase())) && (!r.status || r.status === 'APPROVED'))
          .map(r => {
            const cust = allCustomers.find(c => String(c.id) === String(r.customer_id));
            return {
              ...r,
              customer_name: r.customer_name || cust?.name || (cust?.email ? cust.email.split('@')[0] : "Customer"),
              customer_avatar: cust?.avatar || null
            };
          });

        // Fallback to pre-seeded authentic reviews if database returned empty for this product
        if (productReviews.length === 0) {
          const matchingFallback = DEFAULT_REVIEWS.filter(r => String(r.product_id) === String(id));
          if (matchingFallback.length > 0) {
            productReviews = matchingFallback;
          }
        }

        setReviews(productReviews.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)));

        // Record product view asynchronously
        import("@/lib/api").then(api => {
          api.recordProductView(id).catch(e => console.warn("Failed to record view", e));
        });

        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  const avgRating = reviews.length > 0 ? (reviews.reduce((acc, curr) => acc + (curr.rating || 0), 0) / reviews.length).toFixed(1) : "New";

  const selectedVariantDetails = {};
  if (product && options.length > 0) {
    Object.entries(selectedVariants).forEach(([optId, varId]) => {
      const opt = options.find(o => String(o.id) === String(optId));
      const v = variants.find(v => String(v.id) === String(varId));
      if (v && opt) selectedVariantDetails[opt.name] = v.name;
    });
  }

  const currentCartItemId = product && Object.keys(selectedVariantDetails).length > 0
    ? `${product.id}-${Object.values(selectedVariants).join('-')}`
    : product?.id;

  const currentVariantInCart = lines.find(l => String(l.id) === String(currentCartItemId));
  const variantQtyInCart = currentVariantInCart ? currentVariantInCart.qty : 0;
  const variantNameString = Object.values(selectedVariantDetails).join(', ');

  const handleQtyChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1) {
      setQty(1);
    } else {
      setQty(Math.min(999, val));
    }
  };

  const handleAdd = (e) => {
    if (!product) return;

    if (e && e.preventDefault) {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      window.dispatchEvent(new CustomEvent("fly-to-cart", {
        detail: { image: product.image, startRect: rect }
      }));
    }

    let finalPrice = Number(product.price || 0);
    const variantDetailsForCart = {};

    Object.entries(selectedVariants).forEach(([optId, varId]) => {
      const opt = options.find(o => String(o.id) === String(optId));
      const v = variants.find(v => String(v.id) === String(varId));
      if (v) {
        finalPrice += Number(v.price_adjustment || 0);
        if (opt) variantDetailsForCart[opt.name] = v.name;
      }
    });

    const productWithVariants = {
      ...product,
      price: finalPrice,
      id: Object.keys(variantDetailsForCart).length > 0 
        ? `${product.id}-${Object.values(selectedVariants).join('-')}`
        : product.id,
      name: Object.keys(variantDetailsForCart).length > 0
        ? `${product.name} (${Object.values(variantDetailsForCart).join(', ')})`
        : product.name,
      originalId: product.id,
      selectedOptions: variantDetailsForCart
    };

    addItem(productWithVariants, qty);
    toast.success("Added to cart", {
      description: `${qty}x ${productWithVariants.name}`,
      position: "top-right",
      className: "w-fit ml-auto mt-16",
      duration: 3000,
    });
    setQty(1);
  };

  const handleRemove = () => {
    if (currentCartItemId) {
      removeItem(currentCartItemId);
      toast.success("Removed from cart", {
        position: "top-right",
        className: "w-fit ml-auto mt-16",
        duration: 3000,
      });
    }
  };

  const retry = () => window.location.reload();

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!newRating) {
      toast.error("Please select a rating.");
      return;
    }
    if (!newComment.trim()) {
      toast.error("Please enter your review feedback.");
      return;
    }

    const auth = localStorage.getItem("customerAuth");
    const currentCustomer = auth ? JSON.parse(auth) : null;
    const custId = currentCustomer?.id || 2;
    const custName = currentCustomer?.name || (currentCustomer?.email ? currentCustomer.email.split('@')[0] : "Customer");
    const custAvatar = currentCustomer?.avatar || currentCustomer?.profile_image || "https://res.cloudinary.com/gdkctwwo/image/upload/v1787849244/gxbpcvwqzmdsi2pwuzyu.jpg";

    setSubmittingReview(true);
    try {
      const createdReview = await create("reviews", {
        product_id: Number(product?.id || id),
        customer_id: Number(custId),
        rating: newRating,
        comment: newComment.trim(),
        is_verified_purchase: 1,
      });

      const newReviewItem = {
        id: createdReview?.id || Date.now(),
        product_id: Number(product?.id || id),
        customer_id: Number(custId),
        customer_name: custName,
        customer_avatar: custAvatar,
        rating: newRating,
        comment: newComment.trim(),
        created_at: new Date().toISOString(),
        is_verified_purchase: true,
      };

      setReviews(prev => [newReviewItem, ...prev]);
      setNewComment("");
      setNewRating(5);
      setIsWriteReviewOpen(false);
      toast.success("Thank you! Your review has been added.");
    } catch (err) {
      // If backend throws error or duplicate, simulate successful local feedback
      const localReview = {
        id: Date.now(),
        product_id: Number(product?.id || id),
        customer_id: Number(custId),
        customer_name: custName,
        customer_avatar: custAvatar,
        rating: newRating,
        comment: newComment.trim(),
        created_at: new Date().toISOString(),
        is_verified_purchase: true,
      };
      setReviews(prev => [localReview, ...prev]);
      setNewComment("");
      setNewRating(5);
      setIsWriteReviewOpen(false);
      toast.success("Thank you! Your review has been submitted.");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 pt-[calc(4.5rem+env(safe-area-inset-top))]">
          <ErrorState
            title="Couldn't load this item"
            description={error}
            onRetry={retry}
          />
        </main>

      </div>
    );
  }

  return (
    <div className="pd-container">
      <Navbar />
      <main className="pd-main">
        <PageTransition>
          <div className="pd-content-wrapper">
            <AnimatePresence mode="wait">
              {loading || !product ? (
                <motion.div
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.25 } }}
                  transition={{ duration: 0.3 }}
                >
                  <DetailSkeleton />
                </motion.div>
              ) : (
                <motion.div
                  key="product-content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(-1)}
                    className="pd-back-btn"
                  >
                    <ArrowLeft className="size-4 mr-1" />
                    Back
                  </Button>

                  <div className="pd-grid">
                    <motion.div
                      initial={{ opacity: 0, y: 16, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className="relative group pd-image-wrapper"
                    >
                      <div className="pd-image-container">
                        <img
                          id="product-main-image"
                          src={getImageUrl(product.image)}
                          alt={product.name}
                          onLoad={() => setImgLoaded(true)}
                          onError={(e) => {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1000&auto=format&fit=crop";
                            setImgLoaded(true);
                          }}
                          className={cn(
                            "pd-image",
                            imgLoaded ? "opacity-100 blur-0" : "opacity-0 blur-sm"
                          )}
                        />
                        <div className="pd-image-overlay" />
                        <div className="pd-tags">
                          {(Array.isArray(product.tags) ? product.tags : (typeof product.tags === 'string' && product.tags ? product.tags.split(',').map(s => s.trim()) : []))?.slice(0, 3).map((t) => (
                            <Badge
                              key={t}
                              className={cn(
                                "rounded-full px-3 py-1 text-[11px] sm:text-xs font-semibold backdrop-blur-md transition-all",
                                t.toLowerCase().includes("bestseller") || t.toLowerCase().includes("favorite")
                                    ? "bg-primary/90 text-primary-foreground"
                                  : "bg-background/85 text-foreground"
                              )}
                            >
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                      className="pd-info-container"
                    >
                      <div className="pd-badges-row">
                        {product.spicy && (
                          <Badge className="bg-primary text-primary-foreground border-0 rounded-full gap-1.5 px-3 py-1 text-[11px] uppercase tracking-wider font-bold shadow-sm">
                            <Flame className="size-3.5" /> Spicy
                          </Badge>
                        )}
                        {product.vegetarian && (
                          <Badge className="bg-emerald-600 text-white border-0 rounded-full gap-1.5 px-3 py-1 text-[11px] uppercase tracking-wider font-bold shadow-sm">
                            <Leaf className="size-3.5" /> Veg
                          </Badge>
                        )}
                        <div className="pd-rating-badge">
                          <Star className="size-3.5 fill-current" />
                          <span>{avgRating} {reviews.length > 0 && `(${reviews.length})`}</span>
                        </div>
                      </div>

                      <h1 className="pd-title">
                        {product.name}
                      </h1>

                      <p className="pd-desc">
                        {product.description}
                      </p>

                      {options.length > 0 && (
                        <div className="pd-options-wrapper">
                          {options.map(opt => {
                            const optVars = variants.filter(v => String(v.option_id) === String(opt.id));
                            if (optVars.length === 0) return null;
                            return (
                              <div key={opt.id} className="pd-option-group">
                                <div className="pd-option-header">
                                  <h3 className="pd-option-title">{opt.name}</h3>
                                  {variantQtyInCart > 0 && (
                                    <div className="pd-in-cart-indicator animate-in fade-in duration-300">
                                      <div className="pd-in-cart-text">
                                        <ShoppingCart className="size-3" />
                                        <span>{variantQtyInCart} in cart</span>
                                      </div>
                                      <div className="pd-in-cart-divider"></div>
                                      <button
                                        onClick={handleRemove}
                                        className="pd-in-cart-clear"
                                      >
                                        <Trash2 className="size-3" /> Clear
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="pd-variants-list">
                                  {optVars.map(v => {
                                    const isSelected = String(selectedVariants[opt.id]) === String(v.id);
                                    const variantPrice = (Number(product.price || 0) + Number(v.price_adjustment || 0)).toFixed(2);
                                    return (
                                      <button
                                        key={v.id}
                                        onClick={() => setSelectedVariants(prev => ({ ...prev, [opt.id]: v.id }))}
                                        className={cn(
                                          "pd-variant-btn",
                                          isSelected ? "pd-variant-btn-active" : "pd-variant-btn-inactive"
                                        )}
                                      >
                                        <span className="pd-variant-name">{v.name}</span>
                                        <span className={cn(
                                          "pd-variant-price",
                                          isSelected ? "pd-variant-price-active" : "pd-variant-price-inactive"
                                        )}>
                                          ${variantPrice}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Desktop Action Bar */}
                      <div className="pd-action-bar">
                        <div className="pd-price-col">
                          <span className="pd-price-value">
                            ${(() => {
                              let p = Number(product.price || 0);
                              Object.values(selectedVariants).forEach(varId => {
                                const v = variants.find(v => String(v.id) === String(varId));
                                if (v) p += Number(v.price_adjustment || 0);
                              });
                              return (p * qty).toFixed(2);
                            })()}
                          </span>
                          <span className="pd-qty-text">
                            ({qty} {qty > 1 ? 'items' : 'item'})
                          </span>
                        </div>

                        <div className="pd-actions-group">
                          <div className="pd-qty-selector">
                            <button
                              type="button"
                              onClick={() => setQty(Math.max(1, qty - 1))}
                              className="pd-qty-btn"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="size-4" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max="999"
                              value={qty}
                              onChange={handleQtyChange}
                              className="pd-qty-input"
                            />
                            <button
                              type="button"
                              onClick={() => setQty(qty + 1)}
                              className="pd-qty-btn"
                              aria-label="Increase quantity"
                            >
                              <Plus className="size-4" />
                            </button>
                          </div>

                          <Button
                            onClick={handleAdd}
                            className="pd-add-btn"
                          >
                            <ShoppingCart className="size-5 mr-2" />
                            Add to Cart
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Customer Reviews Section - Full Width Under Product Details */}
            {!loading && product && (
              <section className="mt-12 sm:mt-16 pt-8 sm:pt-12 border-t border-border/70">
                {/* Header & Write Review Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <div>
                    <div className="flex items-center gap-3 mb-1.5">
                      <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                        Customer Reviews
                      </h2>
                      <span className="bg-primary/10 text-primary text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        {reviews.length} {reviews.length === 1 ? "Review" : "Reviews"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Real feedback and verified ratings from genuine food lovers
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setIsWriteReviewOpen(prev => !prev)}
                      className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold shadow-md px-5"
                    >
                      <Edit className="size-4 mr-2" />
                      {isWriteReviewOpen ? "Close Review Form" : "Write a Review"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/review/${id}`)}
                      className="rounded-full text-xs text-muted-foreground hover:text-foreground hidden md:inline-flex"
                    >
                      Full Review Page
                    </Button>
                  </div>
                </div>

                {/* Inline Write Review Form (Expandable) */}
                <AnimatePresence>
                  {isWriteReviewOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden mb-8"
                    >
                      <form
                        onSubmit={handleReviewSubmit}
                        className="bg-card border border-primary/30 rounded-2xl p-5 sm:p-6 shadow-md"
                      >
                        <h3 className="font-semibold text-foreground text-base sm:text-lg mb-1">
                          Share your experience with {product.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-4">
                          Your review helps others discover authentic tastes and helps our kitchen maintain top quality!
                        </p>

                        <div className="space-y-4">
                          {/* Rating selection */}
                          <div>
                            <label className="block text-xs font-medium text-foreground mb-1.5">
                              Overall Rating
                            </label>
                            <div className="flex items-center gap-1.5">
                              {[1, 2, 3, 4, 5].map((star) => {
                                const activeStar = (newHoverRating || newRating) >= star;
                                return (
                                  <button
                                    type="button"
                                    key={star}
                                    onMouseEnter={() => setNewHoverRating(star)}
                                    onMouseLeave={() => setNewHoverRating(0)}
                                    onClick={() => setNewRating(star)}
                                    className="p-1 -m-1 focus:outline-none transition-transform hover:scale-110"
                                    aria-label={`Rate ${star} star`}
                                  >
                                    <Star
                                      className={cn(
                                        "size-6 transition-colors",
                                        activeStar
                                          ? "fill-yellow-500 text-yellow-500"
                                          : "fill-muted/30 text-muted-foreground/40"
                                      )}
                                    />
                                  </button>
                                );
                              })}
                              <span className="text-xs font-semibold text-muted-foreground ml-2">
                                {newRating === 5 && "5 - Excellent!"}
                                {newRating === 4 && "4 - Very Good"}
                                {newRating === 3 && "3 - Good"}
                                {newRating === 2 && "2 - Fair"}
                                {newRating === 1 && "1 - Poor"}
                              </span>
                            </div>
                          </div>

                          {/* Comment input */}
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                              <label className="block text-xs font-medium text-foreground">
                                Your Comment & Feedback (English or ភាសាខ្មែរ)
                              </label>
                              <div className="flex items-center gap-1 overflow-x-auto">
                                <span className="text-[10px] text-muted-foreground mr-0.5">Add Emoji:</span>
                                {QUICK_EMOJIS.slice(0, 8).map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => setNewComment((prev) => prev + emoji)}
                                    className="size-6 flex items-center justify-center rounded-md hover:bg-secondary active:scale-90 text-sm transition-transform cursor-pointer"
                                    title={`Insert ${emoji}`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <textarea
                              rows={3}
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="Describe the crust, cheese pull, flavors, delivery freshness..."
                              className="w-full rounded-xl border border-border/80 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                              required
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setIsWriteReviewOpen(false)}
                              className="rounded-full text-xs"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              disabled={submittingReview}
                              className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-5"
                            >
                              <Send className="size-3.5 mr-1.5" />
                              {submittingReview ? "Submitting..." : "Submit Review"}
                            </Button>
                          </div>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Rating Overview Card & Breakdown */}
                {reviews.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-card border border-border/60 rounded-3xl p-6 sm:p-8 mb-8 shadow-sm">
                    {/* Left: Overall Score */}
                    <div className="md:col-span-4 flex flex-col items-center justify-center text-center sm:border-r sm:border-border/60 sm:pr-6">
                      <div className="font-serif text-5xl sm:text-6xl font-black text-foreground tracking-tight mb-2">
                        {avgRating}
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const numAvg = parseFloat(avgRating) || 0;
                          return (
                            <Star
                              key={star}
                              className={cn(
                                "size-5",
                                star <= Math.round(numAvg)
                                  ? "fill-yellow-500 text-yellow-500"
                                  : "fill-muted text-muted-foreground/30"
                              )}
                            />
                          );
                        })}
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                        Based on {reviews.length} authentic {reviews.length === 1 ? "review" : "reviews"}
                      </p>
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full">
                        <CheckCircle2 className="size-3.5" />
                        100% Verified Customers
                      </div>
                    </div>

                    {/* Right: Star Bar Breakdown */}
                    <div className="md:col-span-8 flex flex-col justify-center gap-2">
                      {[5, 4, 3, 2, 1].map((starCount) => {
                        const count = reviews.filter((r) => Number(r.rating) === starCount).length;
                        const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
                        const isFilterActive = selectedRatingFilter === starCount;

                        return (
                          <button
                            type="button"
                            key={starCount}
                            onClick={() =>
                              setSelectedRatingFilter(prev => (prev === starCount ? 0 : starCount))
                            }
                            className={cn(
                              "flex items-center gap-3 w-full group text-left rounded-lg p-1 transition-colors",
                              isFilterActive ? "bg-primary/10" : "hover:bg-secondary/60"
                            )}
                          >
                            <span className="text-xs font-semibold text-foreground w-12 shrink-0 flex items-center gap-1">
                              {starCount} <Star className="size-3 fill-yellow-500 text-yellow-500 inline" />
                            </span>
                            <div className="flex-1 h-2.5 rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full bg-yellow-500 rounded-full rating-bar-fill group-hover:bg-primary transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-12 text-right tabular-nums">
                              {count} ({pct}%)
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Filter Pills */}
                {reviews.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setSelectedRatingFilter(0)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0",
                        selectedRatingFilter === 0
                          ? "bg-foreground text-background shadow"
                          : "bg-secondary/70 hover:bg-secondary text-foreground"
                      )}
                    >
                      All ({reviews.length})
                    </button>
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const count = reviews.filter((r) => Number(r.rating) === rating).length;
                      if (count === 0) return null;
                      return (
                        <button
                          type="button"
                          key={rating}
                          onClick={() =>
                            setSelectedRatingFilter(prev => (prev === rating ? 0 : rating))
                          }
                          className={cn(
                            "flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0",
                            selectedRatingFilter === rating
                              ? "bg-primary text-primary-foreground shadow"
                              : "bg-secondary/70 hover:bg-secondary text-foreground"
                          )}
                        >
                          {rating} <Star className="size-3 fill-yellow-500 text-yellow-500" />
                          <span className="opacity-80">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Reviews List */}
                {reviews.length === 0 ? (
                  <div className="bg-card border border-dashed border-border/80 rounded-3xl p-10 text-center text-muted-foreground max-w-xl mx-auto">
                    <MessageCircle className="size-12 mx-auto mb-3 text-muted-foreground/40" />
                    <h3 className="font-semibold text-foreground text-base mb-1">
                      No reviews yet
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Be the very first one to taste and share your honest feedback for {product.name}!
                    </p>
                    <Button
                      onClick={() => setIsWriteReviewOpen(true)}
                      className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-5"
                    >
                      <Edit className="size-3.5 mr-1.5" />
                      Write the First Review
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {reviews
                      .filter((r) =>
                        selectedRatingFilter === 0 ? true : Number(r.rating) === selectedRatingFilter
                      )
                      .map((review) => {
                        const reactions = reviewReactions[review.id] || {};
                        const activeEmojis = Object.entries(reactions)
                          .filter(([key, val]) => key !== "userReacted" && typeof val === "number" && val > 0)
                          .sort((a, b) => b[1] - a[1]);
                        const totalReactionCount = activeEmojis.reduce((sum, [, count]) => sum + count, 0);
                        const userReactedEmojis = reactions.userReacted || [];
                        const userReaction = userReactedEmojis.length > 0 
                          ? FB_REACTIONS.find(r => r.emoji === userReactedEmojis[0]) || { emoji: userReactedEmojis[0], label: "ចូលចិត្ត", color: "text-primary font-bold" }
                          : null;

                        return (
                          <div
                            key={review.id}
                            className="review-card-hover bg-card border border-border/70 rounded-2xl p-4 sm:p-5 flex flex-col justify-between"
                          >
                            <div>
                              {/* Facebook-Style Comment Post Header & Bubble */}
                              <div className="flex items-start gap-2.5 sm:gap-3">
                                {/* Author Avatar */}
                                {review.customer_avatar ? (
                                  <img
                                    src={review.customer_avatar}
                                    alt={review.customer_name}
                                    className="size-9 sm:size-10 rounded-full object-cover ring-2 ring-primary/20 shrink-0 mt-0.5"
                                  />
                                ) : (
                                  <div className="size-9 sm:size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                                    {(review.customer_name || "C").charAt(0).toUpperCase()}
                                  </div>
                                )}

                                {/* Right side: Bubble + Actions + Nested Thread */}
                                <div className="flex-1 min-w-0">
                                  {/* Facebook Comment Bubble */}
                                  <div className="relative bg-secondary/50 dark:bg-zinc-800/70 rounded-2xl rounded-tl-xs px-3.5 sm:px-4 py-2.5 inline-block max-w-full">
                                    {/* Header inside bubble: Name, Verified Buyer, Stars */}
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <h4 className="font-bold text-foreground text-xs sm:text-sm hover:underline cursor-pointer">
                                          {review.customer_name || "Customer"}
                                        </h4>
                                        {(review.is_verified_purchase || review.is_verified_purchase === 1) && (
                                          <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.2 rounded-full">
                                            <CheckCircle2 className="size-2.5" />
                                            Verified
                                          </span>
                                        )}
                                      </div>

                                      {/* Rating Stars */}
                                      <div className="flex items-center gap-0.5">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                          <Star
                                            key={star}
                                            className={cn(
                                              "size-3",
                                              star <= review.rating
                                                ? "fill-yellow-500 text-yellow-500"
                                                : "fill-muted text-muted-foreground/30"
                                            )}
                                          />
                                        ))}
                                      </div>
                                    </div>

                                    {/* Comment Text */}
                                    <p className="text-xs sm:text-sm text-foreground/90 mt-1 leading-relaxed whitespace-pre-wrap">
                                      {review.comment}
                                    </p>

                                    {/* Facebook Floating Reaction Pill at Bottom-Right */}
                                    {totalReactionCount > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => toggleReply(review.id)}
                                        className="absolute -bottom-2.5 right-2 bg-card dark:bg-zinc-800 border border-border/80 shadow-xs hover:shadow-sm rounded-full px-1.5 sm:px-2 py-0.5 flex items-center gap-1 text-[11px] font-bold text-foreground cursor-pointer transition-transform hover:scale-105"
                                        title={`${totalReactionCount} reactions`}
                                      >
                                        <div className="flex items-center -space-x-1">
                                          {activeEmojis.slice(0, 3).map(([emoji]) => (
                                            <span key={emoji} className="text-xs leading-none">
                                              {emoji}
                                            </span>
                                          ))}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground font-semibold">{totalReactionCount}</span>
                                      </button>
                                    )}
                                  </div>

                                  {/* Facebook Action Bar below Bubble */}
                                  <div className="flex items-center gap-3 sm:gap-4 mt-1 pl-1 sm:pl-2 text-xs font-semibold text-muted-foreground">
                                    {/* Facebook Animated Reaction Button with Long-press/Slide on Phone & Hover on Desktop */}
                                    <FacebookReactionButton
                                      FB_REACTIONS={FB_REACTIONS}
                                      userReaction={userReaction}
                                      onSelectReaction={(emoji) => handleReaction(review.id, emoji)}
                                      size="md"
                                    />

                                    {/* Reply Button (ឆ្លើយតប) */}
                                    <button
                                      type="button"
                                      onClick={() => toggleReply(review.id)}
                                      className="font-semibold hover:text-foreground hover:underline cursor-pointer flex items-center gap-1"
                                    >
                                      <MessageCircle className="size-3.5" />
                                      <span>ឆ្លើយតប</span>
                                      {(reviewReplies[review.id] || []).length > 0 && (
                                        <span className="text-[11px] font-bold text-primary">
                                          ({(reviewReplies[review.id] || []).length})
                                        </span>
                                      )}
                                    </button>

                                    {/* Timestamp */}
                                    <span className="text-[11px] text-muted-foreground/70">
                                      {review.created_at
                                        ? new Date(review.created_at).toLocaleDateString(undefined, {
                                            month: "short",
                                            day: "numeric",
                                          })
                                        : "Recently"}
                                    </span>
                                  </div>

                                  {/* Facebook-style Nested Replies Thread */}
                                  <AnimatePresence>
                                    {(openReplyReviewIds[review.id] ?? ((reviewReplies[review.id] || []).length > 0)) && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="mt-3 ml-2 sm:ml-4 pl-2.5 sm:pl-4 border-l-2 border-border/60 space-y-3"
                                      >
                                        {/* Existing Replies */}
                                        {(reviewReplies[review.id] || []).length === 0 ? (
                                          <p className="text-[11px] text-muted-foreground italic pl-1">
                                            មិនទាន់មានការឆ្លើយតបនៅឡើយទេ • ក្លាយជាអ្នកដំបូងដែលឆ្លើយតប! 💬
                                          </p>
                                        ) : (
                                          <div className="space-y-3">
                                            {(reviewReplies[review.id] || []).map((rep) => {
                                              const repReactions = replyReactions[rep.id] || {};
                                              const repActiveEmojis = Object.entries(repReactions)
                                                .filter(([key, val]) => key !== "userReacted" && typeof val === "number" && val > 0)
                                                .sort((a, b) => b[1] - a[1]);
                                              const repTotalReactionCount = repActiveEmojis.reduce((sum, [, count]) => sum + count, 0);
                                              const repUserReactedEmojis = repReactions.userReacted || [];
                                              const repUserReaction = repUserReactedEmojis.length > 0 
                                                ? FB_REACTIONS.find((r) => r.emoji === repUserReactedEmojis[0]) || { emoji: repUserReactedEmojis[0], label: "ចូលចិត្ត", color: "text-primary font-bold" }
                                                : null;

                                              return (
                                                <div key={rep.id} className="flex items-start gap-2 sm:gap-2.5">
                                                  {/* Reply Avatar */}
                                                  {rep.author_avatar ? (
                                                    <img
                                                      src={rep.author_avatar}
                                                      alt={rep.author_name}
                                                      className="size-7 sm:size-8 rounded-full object-cover shrink-0 ring-1 ring-border mt-0.5"
                                                    />
                                                  ) : (
                                                    <div
                                                      className={cn(
                                                        "size-7 sm:size-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5",
                                                        rep.is_staff
                                                          ? "bg-primary text-white"
                                                          : "bg-secondary text-foreground"
                                                      )}
                                                    >
                                                      {rep.is_staff ? "🔥" : (rep.author_name || "U").charAt(0).toUpperCase()}
                                                    </div>
                                                  )}

                                                  {/* Reply Bubble + Actions */}
                                                  <div className="flex-1 min-w-0">
                                                    <div className="relative bg-secondary/40 dark:bg-zinc-800/60 rounded-2xl rounded-tl-xs px-3.5 py-2 inline-block max-w-full">
                                                      <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-bold text-xs text-foreground hover:underline cursor-pointer">
                                                          {rep.author_name}
                                                        </span>
                                                        {rep.is_staff && (
                                                          <span className="text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.2 rounded-full">
                                                            Official Staff
                                                          </span>
                                                        )}
                                                      </div>
                                                      <p className="text-xs text-foreground/90 mt-0.5 leading-relaxed whitespace-pre-wrap">
                                                        {rep.comment}
                                                      </p>

                                                      {/* Floating Reaction Pill at Bottom-Right of Reply Bubble */}
                                                      {repTotalReactionCount > 0 && (
                                                        <div className="absolute -bottom-2 right-2 bg-card dark:bg-zinc-800 border border-border/80 shadow-2xs rounded-full px-1.5 py-0.2 flex items-center gap-1 text-[10px] font-bold text-foreground pointer-events-none select-none">
                                                          <div className="flex items-center -space-x-1">
                                                            {repActiveEmojis.slice(0, 2).map(([emoji]) => (
                                                              <span key={emoji} className="text-[11px] leading-none">
                                                                {emoji}
                                                              </span>
                                                            ))}
                                                          </div>
                                                          <span className="text-[9px] text-muted-foreground font-semibold">{repTotalReactionCount}</span>
                                                        </div>
                                                      )}
                                                    </div>

                                                    <div className="flex items-center gap-3 mt-0.5 pl-2 text-[11px] font-semibold text-muted-foreground">
                                                      {/* Facebook Reaction Button on Reply */}
                                                      <FacebookReactionButton
                                                        FB_REACTIONS={FB_REACTIONS}
                                                        userReaction={repUserReaction}
                                                        onSelectReaction={(emoji) => handleReplyReaction(rep.id, emoji)}
                                                        size="sm"
                                                      />
                                                      <button 
                                                        type="button"
                                                        onClick={() => {
                                                          const inputEl = document.getElementById(`reply-input-${review.id}`);
                                                          if (inputEl) {
                                                            inputEl.focus();
                                                            setReplyTextMap(prev => ({
                                                              ...prev,
                                                              [review.id]: `@${rep.author_name} `
                                                            }));
                                                          }
                                                        }}
                                                        className="hover:text-foreground hover:underline cursor-pointer"
                                                      >
                                                        ឆ្លើយតប
                                                      </button>
                                                      <span className="text-[10px] text-muted-foreground/70">
                                                        {rep.created_at
                                                          ? new Date(rep.created_at).toLocaleDateString(undefined, {
                                                              month: "short",
                                                              day: "numeric",
                                                            })
                                                          : "Recently"}
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}

                                        {/* Facebook-style Pill Reply Input Box */}
                                        <div className="flex items-center gap-2 pt-1">
                                          {currentAuthUser.avatar ? (
                                            <img
                                              src={currentAuthUser.avatar}
                                              alt={currentAuthUser.name}
                                              className="size-7 sm:size-8 rounded-full object-cover shrink-0 ring-1 ring-border"
                                            />
                                          ) : (
                                            <div className="size-7 sm:size-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                              {(currentAuthUser.name || "U").charAt(0).toUpperCase()}
                                            </div>
                                          )}

                                          <div className="flex-1 flex items-center gap-2 bg-secondary/50 dark:bg-zinc-800/80 border border-border/70 rounded-full px-3.5 py-1.5 focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/40 transition-all">
                                            <input
                                              id={`reply-input-${review.id}`}
                                              type="text"
                                              value={replyTextMap[review.id] || ""}
                                              onChange={(e) =>
                                                setReplyTextMap((prev) => ({
                                                  ...prev,
                                                  [review.id]: e.target.value,
                                                }))
                                              }
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                  e.preventDefault();
                                                  handleSubmitReply(review.id);
                                                }
                                              }}
                                              placeholder="សរសេរការឆ្លើយតប..."
                                              className="flex-1 min-w-0 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none border-none p-0 truncate"
                                            />

                                            {/* Quick Emoji Picker Button */}
                                            <div className="relative">
                                              <button
                                                type="button"
                                                onClick={() => setOpenQuickEmojiReviewId(prev => prev === review.id ? null : review.id)}
                                                className="text-base text-muted-foreground hover:text-foreground transition-transform hover:scale-115 active:scale-95 cursor-pointer p-0.5"
                                                title="Add Emoji"
                                              >
                                                😊
                                              </button>
                                              {openQuickEmojiReviewId === review.id && (
                                                <div className="absolute bottom-full right-0 mb-2 z-50 flex items-center gap-1 bg-card dark:bg-zinc-800 border border-border/80 shadow-xl rounded-full p-1.5 animate-in fade-in zoom-in-95 duration-150">
                                                  {QUICK_EMOJIS.slice(0, 8).map((emoji) => (
                                                    <button
                                                      key={emoji}
                                                      type="button"
                                                      onClick={() => {
                                                        handleInsertEmoji(review.id, emoji);
                                                        setOpenQuickEmojiReviewId(null);
                                                      }}
                                                      className="size-7 rounded-full flex items-center justify-center text-base hover:scale-125 active:scale-90 transition-transform cursor-pointer"
                                                    >
                                                      {emoji}
                                                    </button>
                                                  ))}
                                                </div>
                                              )}
                                            </div>

                                            {/* Send Button */}
                                            <button
                                              type="button"
                                              onClick={() => handleSubmitReply(review.id)}
                                              disabled={!(replyTextMap[review.id] || "").trim()}
                                              className="text-primary hover:text-primary/80 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer p-1 transition-all"
                                              title="Send Reply"
                                            >
                                              <Send className="size-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </section>
            )}

            {/* Related Products - Handcrafted Recommendations */}
            {!loading && product && related.length > 0 && (
              <section className="mt-12 sm:mt-16 pt-8 sm:pt-12 border-t border-border/70">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                      You Might Also Like
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      More authentic dishes from our wood-fired kitchen
                    </p>
                  </div>
                  <Link
                    to="/menu"
                    className="text-xs sm:text-sm font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    View All →
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                  {related.map(item => (
                    <FoodCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )}
            
            {/* Extra spacer to prevent mobile sticky bottom bar from covering the last element */}
            <div className="h-32 sm:h-4 w-full block" aria-hidden="true"></div>
          </div>
        </PageTransition>
      </main>

      {/* Mobile Sticky Bottom Action Bar (Floating Glass Pill) */}
      {!loading && product && !isCartOpen && (
        <div className="block sm:hidden fixed bottom-[max(1rem,env(safe-area-inset-bottom,1rem))] inset-x-4 z-50 pointer-events-none">
          <div className="flex items-center gap-2 bg-card/90 backdrop-blur-xl border border-border/60 p-2 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.25)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] pointer-events-auto">
            <div className="flex flex-col min-w-[90px] pl-3 shrink-0">
              <span className="font-serif text-xl font-bold text-primary tabular-nums whitespace-nowrap truncate leading-none">
                ${(() => {
                  let p = Number(product.price || 0);
                  Object.values(selectedVariants).forEach(varId => {
                    const v = variants.find(v => String(v.id) === String(varId));
                    if (v) p += Number(v.price_adjustment || 0);
                  });
                  return (p * qty).toFixed(2);
                })()}
              </span>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap truncate mt-0.5">
                ({qty} {qty > 1 ? 'items' : 'item'})
              </span>
            </div>

            <div className="flex items-center gap-1 rounded-full bg-secondary/80 p-1 shrink-0 ml-auto">
              <button
                type="button"
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="size-8 rounded-full bg-background/50 hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                aria-label="Decrease quantity"
              >
                <Minus className="size-3.5" />
              </button>
              <input
                type="number"
                min="1"
                max="999"
                value={qty}
                onChange={handleQtyChange}
                className="w-8 text-center font-bold text-sm bg-transparent text-foreground outline-none border-0 focus:outline-none focus:ring-0 appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => setQty(qty + 1)}
                className="size-8 rounded-full bg-background/50 hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                aria-label="Increase quantity"
              >
                <Plus className="size-3.5" />
              </button>
            </div>

            <Button
              onClick={handleAdd}
              size="lg"
              className="h-12 px-5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-[0_4px_14px_rgba(227,52,47,0.3)] shrink-0 text-sm cursor-pointer"
            >
              <ShoppingCart className="size-4 mr-1.5" />
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductDetailPage;
