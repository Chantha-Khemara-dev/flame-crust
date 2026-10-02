import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Star, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Navbar } from "@/components/food/navbar";

import { PageTransition } from "@/components/shared/page-transition";
import { getProducts, create } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const RATING_LABELS = {
  1: "1 - Poor",
  2: "2 - Fair",
  3: "3 - Good",
  4: "4 - Very Good",
  5: "5 - Excellent!"
};

export default function LeaveReviewPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getProducts()
      .then(data => {
        const items = Array.isArray(data) ? data : data.products || [];
        const found = items.find(i => String(i.id) === String(productId));
        if (found) setProduct(found);
      })
      .finally(() => setLoading(false));
  }, [productId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a rating (1 to 5 stars) before submitting.");
      toast.error("Please select a rating.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await create("reviews", {
        product_id: Number(productId),
        customer_id: 1, // Mock customer ID for now until Auth is fully implemented
        rating,
        comment: comment.trim() || null,
      });
      toast.success("Thank you! Your review has been submitted.");
      navigate(`/menu/${productId}`);
    } catch (err) {
      toast.error(err.message || "Failed to submit review.");
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-background flex justify-center items-center"><Loader2 className="animate-spin text-primary size-8" /></div>;
  if (!product) return <div className="min-h-screen bg-background flex justify-center items-center text-muted-foreground">Product not found.</div>;

  const activeRating = hoverRating || rating;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-[calc(4.5rem+env(safe-area-inset-top))] sm:pt-28">
        <PageTransition>
          <div className="mx-auto max-w-2xl px-4 py-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="mb-6 rounded-full text-foreground/70 hover:text-foreground"
            >
              <ArrowLeft className="size-4 mr-1" />
              Back
            </Button>

            <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-10 shadow-warm-lg">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground text-center mb-2">
                Review {product.name}
              </h1>
              <p className="text-center text-muted-foreground mb-8">
                How did you like this item? Let us know!
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className={cn(
                  "flex flex-col items-center gap-3 p-5 rounded-2xl transition-all duration-200",
                  error ? "bg-destructive/10 border border-destructive/30" : "bg-muted/30 border border-border/40"
                )}>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => {
                          setRating(star);
                          setError("");
                        }}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="transition-transform hover:scale-125 focus:outline-none p-1"
                        aria-label={`Rate ${star} stars`}
                      >
                        <Star
                          className={cn(
                            "size-10 sm:size-12 transition-all duration-150",
                            activeRating >= star
                              ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                              : "text-muted-foreground/40 hover:text-amber-300/60"
                          )}
                        />
                      </button>
                    ))}
                  </div>
                  <span className={cn(
                    "text-sm font-semibold transition-colors",
                    activeRating > 0 ? "text-amber-400" : "text-muted-foreground"
                  )}>
                    {activeRating > 0 ? RATING_LABELS[activeRating] : "Select rating"}
                  </span>

                  {error && (
                    <div className="flex items-center gap-1.5 text-destructive text-sm font-medium pt-1">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2">
                  <label htmlFor="comment" className="text-sm font-medium text-foreground">
                    Add a written review (optional)
                  </label>
                  <Textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="What did you think about the taste and quality?"
                    className="min-h-32 rounded-xl border-border/60"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 text-base font-semibold shadow-warm"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Submitting...
                    </span>
                  ) : "Submit Review"}
                </Button>
              </form>
            </div>
          </div>
        </PageTransition>
      </main>

    </div>
  );
}

