import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X, Loader2, LayoutGrid, List, Phone, Calendar, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { resourceConfig } from "./resource-config.jsx";
import { list, get, create, update, remove } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ImageUpload from "@/components/ImageUpload";

// In-memory cache for fast instant page switching
const resourcePagesCache = new Map();

export function clearResourceCache(resName) {
  if (resName) {
    for (const key of resourcePagesCache.keys()) {
      if (key.startsWith(`${resName}:`)) {
        resourcePagesCache.delete(key);
      }
    }
  } else {
    resourcePagesCache.clear();
  }
  try {
    localStorage.removeItem("flame_foods_cache");
    localStorage.removeItem("flame_categories_cache");
    window.dispatchEvent(new Event("foodsChanged"));
  } catch (e) {}
}

function AdminResourcePage({ resource }) {
  const config = resourceConfig[resource];
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  const [totalCount, setTotalCount] = useState(0);
  const [dynamicOptions, setDynamicOptions] = useState({});
  const [viewMode, setViewMode] = useState("card");

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteId, setDeleteId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async (forceRefresh = false) => {
    const cacheKey = `${resource}:all`;

    // If already cached and not force refreshing, load instantly (0ms)
    if (!forceRefresh && resourcePagesCache.has(cacheKey)) {
      const cached = resourcePagesCache.get(cacheKey);
      setData(cached.items);
      setTotalCount(cached.total);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await list(resource, {
        limit: -1,
        paginate: true,
      });

      let items = [];
      let total = 0;

      if (Array.isArray(result)) {
        items = result;
        total = result.length;
      } else if (result && Array.isArray(result.items)) {
        items = result.items;
        total = result.total ?? items.length;
      } else if (result && Array.isArray(result.content)) {
        items = result.content;
        total = result.totalElements ?? items.length;
      } else if (result && Array.isArray(result.data)) {
        items = result.data;
        total = result.total ?? items.length;
      }

      const formattedItems = items.map((item, index) => ({
        ...item,
        _index: item.id !== undefined ? item.id : (index + 1)
      }));

      // Cache for instant navigation
      resourcePagesCache.set(cacheKey, {
        items: formattedItems,
        total: total,
      });

      setData(formattedItems);
      setTotalCount(total);
    } catch (err) {
      setError(err.message || "Failed to load data");
      setData([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [resource]);

  useEffect(() => {
    fetchData();
  }, [resource]);

  useEffect(() => {
    async function loadDynamicOptions() {
      if (!config || !Array.isArray(config.fields)) return;
      const selectFields = config.fields.filter(f => f.type === "select" && f.optionsResource);
      for (const field of selectFields) {
        try {
          const res = await list(field.optionsResource);
          if (Array.isArray(res)) {
            setDynamicOptions(prev => ({
              ...prev,
              [field.name]: res.map(item => ({
                value: item[field.optionsMap?.value || "id"],
                label: item[field.optionsMap?.label || "name"]
              }))
            }));
          }
        } catch (e) {
          console.error(`Failed to load options for ${field.name}`, e);
        }
      }
    }
    loadDynamicOptions();
  }, [config]);

const generateNextSku = (items) => {
  let maxNum = 0;
  if (Array.isArray(items)) {
    items.forEach((item) => {
      if (item.sku && typeof item.sku === "string" && item.sku.startsWith("FC-")) {
        const num = parseInt(item.sku.replace("FC-", ""), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
      if (item.id && typeof item.id === "number" && item.id > maxNum) {
        maxNum = item.id;
      }
    });
  }
  const nextNum = Math.max(maxNum + 1, 1);
  return `FC-${String(nextNum).padStart(6, "0")}`;
};

  const openCreate = () => {
    setEditingId(null);
    const initial = {};
    if (resource === "products") {
      initial.sku = generateNextSku(data);
      initial.active = true;
      initial.rating = 5.0;
      initial.view_count = 0;
      initial.sales_count = 0;
    }
    setFormData(initial);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = async (id) => {
    try {
      const item = await get(resource, id);
      setEditingId(id);
      const initialData = { ...(item || {}) };
      delete initialData.passwordHash;
      delete initialData.password_hash;
      initialData.password = "";
      if (resource === "products") {
        if (!initialData.sku || String(initialData.sku).trim() === "") {
          initialData.sku = `FC-${String(id).padStart(6, "0")}`;
        }
        if (initialData.base_price == null || initialData.base_price === "") {
          initialData.base_price = initialData.price;
        }
      }
      setFormData(initialData);
      setFormErrors({});
      setFormOpen(true);
    } catch (err) {
      toast.error(err.message || "Failed to load item");
    }
  };

  const openDelete = (id) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleSave = async () => {
    // Validate
    const errs = {};
    config.fields.forEach((f) => {
      if (f.required && f.type !== "checkbox") {
        const val = formData[f.name];
        if (val == null || String(val).trim() === "") {
          errs[f.name] = `${f.label} is required`;
        }
      }
    });
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    setSaving(true);
    try {
      // Clean up form data - convert types
      const cleanData = {};
      config.fields.forEach((f) => {
        if (f.name === "password") {
          cleanData[f.name] = formData[f.name] ? String(formData[f.name]).trim() : "";
        } else if (f.type === "boolean" || f.type === "checkbox") {
          cleanData[f.name] = Boolean(formData[f.name]);
        } else if (f.type === "number") {
          cleanData[f.name] = formData[f.name] !== "" && formData[f.name] != null
            ? Number(formData[f.name])
            : null;
        } else if (f.type === "date" || f.type === "datetime-local") {
          let val = formData[f.name];
          if (!val) {
            cleanData[f.name] = null;
          } else {
            // Append time for 'date' inputs to satisfy backend LocalDateTime
            if (f.type === "date" && val.length === 10) {
              val = val + "T23:59:59";
            }
            cleanData[f.name] = val;
          }
        } else {
          cleanData[f.name] = formData[f.name] ?? "";
        }
      });

      if (editingId) {
        await update(resource, editingId, cleanData);
        toast.success(`${config.label.slice(0, -1)} updated successfully`);
      } else {
        await create(resource, cleanData);
        toast.success(`${config.label.slice(0, -1)} created successfully`);
      }
      clearResourceCache(resource);
      setFormOpen(false);
      fetchData(true);
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await remove(resource, deleteId);
      toast.success(`${config.label.slice(0, -1)} deleted`);
      clearResourceCache(resource);
      setDeleteOpen(false);
      fetchData(true);
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const updateField = (name, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (resource === "products" && name === "price") {
        if (!prev.base_price || prev.base_price === prev.price) {
          updated.base_price = value;
        }
      }
      return updated;
    });
    setFormErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  if (!config) {
    return <ErrorState title="Unknown resource" description={`No configuration found for "${resource}"`} />;
  }

  // Add actions column
  const columnsWithActions = [
    ...config.columns.map((col) => ({
      ...col,
      render: col.render ? (v, row) => col.render(v, row, async (updates) => {
        try {
          // Only send the fields that are being updated
          await update(resource, row.id, updates);
          toast.success("Updated successfully");
          clearResourceCache(resource);
          fetchData(true);
        } catch(err) {
          toast.error("Failed to update: " + err.message);
        }
      }) : undefined
    })),
    {
      key: "actions",
      label: "Action",
      className: "w-16 sm:w-20 text-right pr-2 sm:pr-4 shrink-0",
      render: (_, row) => (
        <div className="flex items-center justify-end gap-0.5 sm:gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openEdit(row.id)}
            className="size-7 sm:size-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
          >
            <Pencil className="size-3.5" />
          </Button>
          {!config.disableDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openDelete(row.id)}
              className="size-7 sm:size-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Data Table Container */}
      <div className="rounded-2xl sm:rounded-[32px] border border-border/40 bg-card/40 backdrop-blur-3xl p-3 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.04)] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/60 to-amber-500/60 opacity-80" />
        {error ? (
          <ErrorState
            title="Failed to load data"
            description={error}
            onRetry={() => fetchData(true)}
          />
        ) : (
          <DataTable
            headerContent={
              <div className="mb-1">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <h1 className="font-serif text-2xl sm:text-4xl font-black text-foreground tracking-tight">
                    {config.label}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 shadow-xs">
                    {data.length} {data.length === 1 ? "item" : "items"}
                  </span>
                </div>
                <p className="mt-1 text-xs sm:text-sm font-medium text-muted-foreground line-clamp-1">
                  Manage, search, and update {config.label.toLowerCase()}.
                </p>
              </div>
            }
            columns={columnsWithActions}
            data={data}
            loading={loading}
            serverSide={false}
            pageSize={config.pageSize || (resource === "products" ? 12 : 10)}
            searchKeys={config.searchKeys}
            searchPlaceholder={`Search ${config.label.toLowerCase()}...`}
            emptyTitle={`No ${config.label.toLowerCase()} found`}
            emptyDescription={`Create your first ${config.label.slice(0, -1).toLowerCase()} to get started.`}
            actions={
              <div className="flex items-center gap-2">
                {resource === "products" && (
                  <div className="flex items-center bg-secondary/30 rounded-2xl p-1 border border-border/40">
                    <Button
                      variant={viewMode === "card" ? "secondary" : "ghost"}
                      size="icon"
                      onClick={() => setViewMode("card")}
                      className={`size-9 rounded-xl transition-all ${viewMode === "card" ? "shadow-sm" : ""}`}
                    >
                      <LayoutGrid className="size-4" />
                    </Button>
                    <Button
                      variant={viewMode === "table" ? "secondary" : "ghost"}
                      size="icon"
                      onClick={() => setViewMode("table")}
                      className={`size-9 rounded-xl transition-all ${viewMode === "table" ? "shadow-sm" : ""}`}
                    >
                      <List className="size-4" />
                    </Button>
                  </div>
                )}
                {!config.disableCreate && (
                  <Button
                    onClick={openCreate}
                    className="rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-11 px-6 shadow-md shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <Plus className="size-4 mr-2" />
                    Add {config.label.slice(0, -1)}
                  </Button>
                )}
              </div>
            }
            renderCustomGrid={
              resource === "products" && viewMode === "card"
                ? ({ data: gridData }) => (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-5 p-4">
                      {gridData.map((item, idx) => (
                        <div key={item.id ?? idx} className="group relative flex flex-col bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                          
                          {/* Image Section */}
                          <div className="aspect-[16/10] w-full overflow-hidden bg-secondary/30 relative border-b border-border/30">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground/50 font-medium text-xs">No Image</div>
                            )}
                            
                            {/* Overlay Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

                            {/* Top Badges */}
                            <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                              {item.sku && (
                                <span className="bg-black/60 backdrop-blur-md text-white/90 text-[9px] font-mono tracking-wider px-1.5 py-0.5 rounded shadow-sm border border-white/10">
                                  {item.sku}
                                </span>
                              )}
                            </div>
                            
                            <div className="absolute top-2 right-2 flex flex-col items-end gap-1.5">
                              {!item.active && (
                                <span className="bg-destructive/90 backdrop-blur-md text-destructive-foreground text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded shadow-sm">
                                  Inactive
                                </span>
                              )}
                              {item.popular && (
                                <span className="bg-amber-500/90 backdrop-blur-md text-white text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded shadow-sm">
                                  Popular
                                </span>
                              )}
                              {item.spicy && (
                                <span className="bg-red-500/90 backdrop-blur-md text-white text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded shadow-sm flex items-center gap-0.5">
                                  🌶️ Spicy
                                </span>
                              )}
                              {item.vegetarian && (
                                <span className="bg-emerald-500/90 backdrop-blur-md text-white text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded shadow-sm flex items-center gap-0.5">
                                  🥗 Veg
                                </span>
                              )}
                            </div>

                            {/* Bottom Image Stats (Views/Sales) */}
                            <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[10px] text-white/90 font-medium drop-shadow-md">
                              <span className="flex items-center gap-1">
                                <span className="opacity-80">👁</span> {item.view_count || item.viewCount || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="opacity-80">📈</span> {item.sales_count || item.salesCount || 0}
                              </span>
                            </div>
                          </div>

                          {/* Content Section */}
                          <div className="p-3 sm:p-4 flex flex-col flex-1 relative z-10 bg-gradient-to-b from-card/40 to-transparent">
                            
                            {/* Header: Category & Rating */}
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                                {item.category}
                              </span>
                              <div className="flex items-center gap-0.5 text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">
                                <span className="text-[10px] font-black">{Number(item.rating || 0).toFixed(1)}</span>
                                <span className="text-[8px]">⭐</span>
                              </div>
                            </div>

                            {/* Name */}
                            <h4 className="font-bold text-foreground text-sm leading-snug line-clamp-1 mb-1" title={item.name}>
                              {item.name}
                            </h4>
                            
                            {/* Description */}
                            <p className="text-[10px] text-muted-foreground/80 line-clamp-2 leading-relaxed mb-3 flex-1" title={item.description}>
                              {item.description || "No description provided."}
                            </p>

                            {/* Tags */}
                            {item.tags && (
                              <div className="flex flex-wrap gap-1 mb-3 max-h-8 overflow-hidden">
                                {String(item.tags).split(',').map(tag => tag.trim()).filter(Boolean).map((tag, i) => (
                                  <span key={i} className="text-[8px] px-1.5 py-0.5 bg-secondary/60 text-secondary-foreground rounded border border-border/40">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Footer: Price & Actions */}
                            <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/40">
                              <div className="flex flex-col">
                                <span className="text-base font-black text-foreground drop-shadow-sm">
                                  ${Number(item.price || 0).toFixed(2)}
                                </span>
                                {(item.base_price || item.basePrice) && Number(item.base_price || item.basePrice) !== Number(item.price) && (
                                  <span className="text-[9px] text-muted-foreground line-through opacity-70">
                                    Base: ${Number(item.base_price || item.basePrice).toFixed(2)}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all sm:translate-y-2 sm:group-hover:translate-y-0 duration-300">
                                <Button size="icon" variant="secondary" className="size-7 rounded-lg border border-border/50 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md transition-all" onClick={() => openEdit(item.id)}>
                                  <Pencil className="size-3" />
                                </Button>
                                <Button size="icon" variant="secondary" className="size-7 rounded-lg border border-border/50 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive hover:shadow-md transition-all" onClick={() => { setDeleteId(item.id); setDeleteOpen(true); }}>
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                : resource === "customers" && viewMode === "card"
                  ? ({ data: gridData }) => (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
                        {gridData.map((item, idx) => {
                          const locked = item.locked_until && new Date(item.locked_until) > new Date();
                          const active = (item.status || "ACTIVE") === "ACTIVE" && !locked;
                          const initials = (item.name || "?").trim().charAt(0).toUpperCase() || "?";
                          return (
                            <div
                              key={item.id ?? idx}
                              className="group relative flex flex-col rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md"
                            >
                              {/* Header: avatar + identity */}
                              <div className="flex items-start gap-3">
                                <div className="relative shrink-0">
                                  {item.avatar ? (
                                    <img
                                      src={item.avatar}
                                      alt={item.name}
                                      className="size-12 rounded-full object-cover ring-2 ring-border"
                                    />
                                  ) : (
                                    <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-base font-black text-primary ring-2 ring-border">
                                      {initials}
                                    </div>
                                  )}
                                  <span
                                    className={cn(
                                      "absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full ring-2 ring-card",
                                      active ? "bg-emerald-500" : "bg-amber-500"
                                    )}
                                  />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <h4 className="truncate text-sm font-bold text-foreground" title={item.name}>
                                    {item.name || "Unnamed"}
                                  </h4>
                                  <p className="truncate text-xs text-muted-foreground" title={item.email}>
                                    {item.email || "No email"}
                                  </p>
                                </div>
                              </div>

                              {/* Contact + joined */}
                              <div className="mt-3 space-y-1.5 text-xs">
                                {item.phone ? (
                                  <a
                                    href={`tel:${item.phone}`}
                                    className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
                                  >
                                    <Phone className="size-3.5 shrink-0" />
                                    <span className="truncate">{item.phone}</span>
                                  </a>
                                ) : (
                                  <span className="flex items-center gap-1.5 text-muted-foreground/70">
                                    <Phone className="size-3.5 shrink-0" /> No phone
                                  </span>
                                )}
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Calendar className="size-3.5 shrink-0" />
                                  <span>
                                    {item.created_at
                                      ? new Date(item.created_at).toLocaleDateString("en-GB")
                                      : "—"}
                                  </span>
                                </div>
                              </div>

                              {/* Footer: status + rewards + actions */}
                              <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/40 pt-3">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={cn(
                                      "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                      active
                                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                        : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                    )}
                                  >
                                    {active ? "Active" : "Locked"}
                                  </span>
                                  {item.reward_points != null && Number(item.reward_points) > 0 && (
                                    <span className="flex items-center gap-1 rounded-full border border-border/60 bg-secondary/60 px-2 py-0.5 text-[10px] font-bold text-foreground">
                                      <Star className="size-3 text-amber-500" /> {item.reward_points}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <Button
                                    size="icon"
                                    variant="secondary"
                                    className="size-8 rounded-lg border border-border/50 transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground"
                                    onClick={() => openEdit(item.id)}
                                    aria-label={`Edit ${item.name || "customer"}`}
                                  >
                                    <Pencil className="size-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="secondary"
                                    className="size-8 rounded-lg border border-border/50 text-destructive transition-all hover:border-destructive hover:bg-destructive hover:text-destructive-foreground"
                                    onClick={() => { setDeleteId(item.id); setDeleteOpen(true); }}
                                    aria-label={`Delete ${item.name || "customer"}`}
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  : undefined
            }
          />
        )}
      </div>

      {/* Create/Edit Form Modal */}
      <AnimatePresence>
        {formOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFormOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="relative z-50 w-full sm:max-w-3xl max-h-[90vh] bg-background/95 backdrop-blur-xl shadow-2xl flex flex-col rounded-[28px] border border-border/60 overflow-hidden"
            >
              <div className="flex flex-shrink-0 items-center justify-between px-5 sm:px-6 py-4 border-b border-border/40 bg-secondary/10">
                <div>
                  <h3 className="font-serif text-xl font-bold text-foreground">
                    {editingId ? "Edit" : "New"} {config.label.slice(0, -1)}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {editingId ? `ID: ${editingId}` : "Fill in the details below"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFormOpen(false)}
                  className="rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <X className="size-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-6 content-start [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {config.fields.map((field) => (
                  <div key={field.name} className={cn(
                    field.type === "textarea" || field.type === "image" || field.name === "icon" || (field.type === "text" && (field.name === "name" || field.name === "tags")) ? "sm:col-span-2" : "sm:col-span-1"
                  )}>
                    {field.type === "textarea" ? (
                      <div className="space-y-1.5">
                        <Label htmlFor={field.name} className="text-[13px] font-bold text-foreground/80 ml-1">
                          {field.label}
                          {field.required && <span className="text-destructive ml-0.5">*</span>}
                        </Label>
                        <Textarea
                          id={field.name}
                          value={formData[field.name] ?? ""}
                          onChange={(e) => updateField(field.name, e.target.value)}
                          placeholder={field.label}
                          className={cn(
                            "rounded-[16px] border-border/40 bg-secondary/20 hover:bg-secondary/40 focus:bg-background p-4 min-h-[100px] text-sm text-foreground shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-primary/30",
                            formErrors[field.name] && "border-destructive focus-visible:ring-destructive/30"
                          )}
                        />
                        {formErrors[field.name] && (
                          <p className="text-xs text-destructive font-medium ml-1">{formErrors[field.name]}</p>
                        )}
                      </div>
                    ) : field.type === "select" ? (
                      <div className="space-y-1.5">
                        <Label htmlFor={field.name} className="text-[13px] font-bold text-foreground/80 ml-1">
                          {field.label}
                          {field.required && <span className="text-destructive ml-0.5">*</span>}
                        </Label>
                        <select
                          id={field.name}
                          value={formData[field.name] ?? ""}
                          onChange={(e) => updateField(field.name, e.target.value)}
                          className={cn(
                            "w-full h-11 rounded-[16px] border border-border/40 bg-secondary/20 hover:bg-secondary/40 focus:bg-background px-4 text-sm text-foreground shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none",
                            formErrors[field.name] && "border-destructive focus:ring-destructive/30"
                          )}
                        >
                          <option value="">Select...</option>
                          {(dynamicOptions[field.name] || field.options || []).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        {formErrors[field.name] && (
                          <p className="text-xs text-destructive font-medium ml-1">{formErrors[field.name]}</p>
                        )}
                      </div>
                    ) : field.type === "checkbox" ? (
                      <div className="pt-6">
                        <Label 
                          htmlFor={field.name} 
                          className="flex items-center gap-3 p-3.5 h-11 rounded-[16px] border border-border/40 bg-secondary/10 hover:bg-secondary/30 cursor-pointer shadow-sm transition-all select-none group"
                        >
                          <Checkbox
                            id={field.name}
                            checked={!!formData[field.name]}
                            onCheckedChange={(checked) => updateField(field.name, checked)}
                            className="rounded-md border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                          />
                          <span className="text-[13px] font-bold text-foreground/90 group-hover:text-foreground">
                            {field.label}
                          </span>
                        </Label>
                      </div>
                    ) : field.type === "image" ? (
                      <div className="space-y-1.5">
                        <Label className="text-[13px] font-bold text-foreground/80 ml-1">
                          {field.label}
                          {field.required && <span className="text-destructive ml-0.5">*</span>}
                        </Label>
                        <div className="h-36 border-2 border-dashed border-border/40 hover:border-primary/50 bg-secondary/10 hover:bg-secondary/20 rounded-[16px] overflow-hidden transition-all flex items-center justify-center relative group shadow-sm">
                          <ImageUpload 
                            onUploadSuccess={(url) => updateField(field.name, url)} 
                          />
                        </div>
                        {formData[field.name] && (
                           <p className="text-[11px] text-primary/80 font-medium mt-1 truncate ml-1" title={formData[field.name]}>URL: {formData[field.name]}</p>
                        )}
                        {formErrors[field.name] && (
                          <p className="text-xs text-destructive font-medium ml-1">{formErrors[field.name]}</p>
                        )}
                      </div>
                    ) : (

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between ml-1">
                          <Label htmlFor={field.name} className="text-[13px] font-bold text-foreground/80">
                            {field.label}
                            {field.required && !field.readOnly && <span className="text-destructive ml-0.5">*</span>}
                          </Label>
                          {field.name === "sku" && (
                            <button
                              type="button"
                              onClick={() => updateField("sku", generateNextSku(data))}
                              className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Generate next sequential SKU"
                            >
                              ⚡ Auto
                            </button>
                          )}
                          {field.readOnly && (
                            <span className="text-[10px] font-semibold text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-full">
                              Auto-managed
                            </span>
                          )}
                        </div>
                        <div className="relative flex items-center">
                          <Input
                            id={field.name}
                            type={field.type === "icon" ? "text" : field.type}
                            step={field.step}
                            readOnly={field.readOnly}
                            disabled={field.readOnly}
                            value={formData[field.name] ?? ""}
                            onChange={(e) => updateField(field.name, e.target.value)}
                            placeholder={field.placeholder || field.label}
                            className={cn(
                              "h-11 rounded-[16px] border-border/40 bg-secondary/20 hover:bg-secondary/40 focus:bg-background px-4 text-sm text-foreground shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-primary/30",
                              field.name === "icon" && "pr-12",
                              field.readOnly && "opacity-70 bg-muted/40 cursor-not-allowed",
                              field.name === "sku" && "font-mono font-semibold tracking-wider",
                              formErrors[field.name] && "border-destructive focus-visible:ring-destructive/30"
                            )}
                          />
                          {field.name === "icon" && (
                            <div className="absolute right-2.5 flex items-center justify-center size-7 rounded-lg bg-background/90 border border-border/50 text-base shadow-xs pointer-events-none">
                              {formData[field.name] || "🍽️"}
                            </div>
                          )}
                        </div>

                        {field.name === "icon" && (
                          <div className="mt-2 space-y-1.5">
                            <span className="text-[11px] font-semibold text-muted-foreground ml-1">
                              Choose quick preset icon or type custom emoji above:
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap p-2 rounded-xl bg-secondary/20 border border-border/30">
                              {["🍕", "🥯", "🍔", "🍟", "🥤", "🍗", "🥩", "🥗", "🥪", "🍝", "🍜", "🍣", "🌮", "🍰", "🍨", "☕", "🍽️"].map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => updateField(field.name, emoji)}
                                  className={cn(
                                    "size-8 rounded-lg text-base flex items-center justify-center transition-all cursor-pointer select-none",
                                    formData[field.name] === emoji
                                      ? "bg-primary text-primary-foreground scale-110 shadow-sm font-bold ring-2 ring-primary/40"
                                      : "bg-background/80 hover:bg-secondary border border-border/40 hover:scale-105"
                                  )}
                                  title={`Select ${emoji}`}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {field.name === "base_price" && (
                          <p className="text-[11px] text-muted-foreground ml-1">Auto-syncs with Price unless changed</p>
                        )}
                        {field.name === "sku" && (
                          <p className="text-[11px] text-muted-foreground ml-1">Unique Product Identifier (FC-XXXXXX)</p>
                        )}
                        {field.readOnly && (
                          <p className="text-[11px] text-muted-foreground ml-1">Automatically computed by customer activity</p>
                        )}
                        {formErrors[field.name] && (
                          <p className="text-xs text-destructive font-medium ml-1">{formErrors[field.name]}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t border-border/60 px-5 sm:px-6 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setFormOpen(false)}
                  className="rounded-full flex-1"
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 flex-1"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Saving...
                    </span>
                  ) : editingId ? (
                    "Update"
                  ) : (
                    "Create"
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${config.label.slice(0, -1)}?`}
        description={`This will permanently delete this ${config.label.slice(0, -1).toLowerCase()}. This action cannot be undone.`}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default AdminResourcePage;
