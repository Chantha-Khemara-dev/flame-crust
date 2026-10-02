import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Utensils, Loader2 } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";
import { create, list } from "@/lib/api";

export default function AddProductForm() {
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "",
    description: "",
    imageUrl: "",
  });

  useEffect(() => {
    list("categories")
      .then((data) => {
        const listData = (Array.isArray(data) && data.length > 0) ? data : [
          { id: 1, slug: "pizza", name: "Pizza" },
          { id: 2, slug: "pizza-bagels", name: "Pizza Bagels" },
          { id: 3, slug: "burgers", name: "Burgers" },
          { id: 4, slug: "sides", name: "Sides" }
        ];
        setCategories(listData);
        setFormData((prev) => (prev.category ? prev : { ...prev, category: listData[0].slug }));
      })
      .catch(() => {
        const defaults = [
          { id: 1, slug: "pizza", name: "Pizza" },
          { id: 2, slug: "pizza-bagels", name: "Pizza Bagels" },
          { id: 3, slug: "burgers", name: "Burgers" },
          { id: 4, slug: "sides", name: "Sides" }
        ];
        setCategories(defaults);
        setFormData((prev) => (prev.category ? prev : { ...prev, category: defaults[0].slug }));
      });
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.category) {
      toast.error("សូមជ្រើសរើសប្រភេទទំនិញ (Category)!");
      return;
    }
    
    // ការពារមិនអោយ Submit បើមិនទាន់មានរូបភាព
    if (!formData.imageUrl) {
      toast.error("សូមជ្រើសរើសរូបភាពផលិតផល!");
      return;
    }

    setSubmitting(true);
    try {
      await create("products", {
        name: formData.name,
        price: Number(formData.price),
        base_price: Number(formData.price),
        category: formData.category,
        description: formData.description,
        image: formData.imageUrl,
        tags: "New",
        rating: 5.0,
        popular: false,
        spicy: false,
        vegetarian: false,
        active: true
      });

      try {
        localStorage.removeItem("flame_foods_cache");
        localStorage.removeItem("flame_categories_cache");
        window.dispatchEvent(new Event("foodsChanged"));
      } catch (e) {}

      toast.success("បានបន្ថែម និងរក្សាទុកផលិតផលក្នុង Database ដោយជោគជ័យ!");
      setFormData({ name: "", price: "", category: "", description: "", imageUrl: "" });
    } catch (err) {
      toast.error(err.message || "បរាជ័យក្នុងការរក្សាទុកផលិតផលទៅ Backend");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-border">
      <div className="mb-6 border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Utensils className="text-primary" />
          បន្ថែមផលិតផលថ្មី
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          បំពេញព័ត៌មានខាងក្រោមដើម្បីដាក់លក់ផលិតផលរបស់អ្នក។
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ពត៌មានទូទៅ (ខាងឆ្វេង) */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2 font-medium">
                ឈ្មោះផលិតផល (Product Name)
              </Label>
              <Input
                id="name"
                placeholder="ឧ. សាច់អាំងទឹកកាពិ"
                required
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price" className="flex items-center gap-2 font-medium">
                តម្លៃ (Price $)
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="0.00"
                required
                value={formData.price}
                onChange={(e) => handleChange("price", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="font-medium">ប្រភេទទំនិញ (Category)</Label>
              <Select value={formData.category} onValueChange={(val) => handleChange("category", val)} required>
                <SelectTrigger>
                  <SelectValue placeholder="ជ្រើសរើសប្រភេទ..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id || cat.slug} value={cat.slug}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="description" className="font-medium">ការពិពណ៌នាពីផលិតផល</Label>
              <Textarea
                id="description"
                placeholder="ពណ៌នាពីលក្ខណៈពិសេស, គ្រឿងផ្សំ..."
                className="min-h-[100px] resize-none"
                maxLength={500}
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
              />
              <p className="text-right text-xs text-muted-foreground">{formData.description.length}/500</p>
            </div>
          </div>

          {/* កន្លែង Upload រូបភាព (ខាងស្តាំ) */}
          <div className="h-full">
            {/* ហៅ ImageUpload Component មកប្រើនៅទីនេះ */}
            <ImageUpload
              value={formData.imageUrl}
              onUploadSuccess={(url) => handleChange("imageUrl", url)}
            />
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end">
          <Button type="submit" disabled={submitting} size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white rounded-full">
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                កំពុងរក្សាទុក...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                រក្សាទុកផលិតផល
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
