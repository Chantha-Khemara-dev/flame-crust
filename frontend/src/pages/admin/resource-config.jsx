import { formatDate } from "@/lib/utils";

// Field definitions for each admin resource
export const resourceConfig = {
  products: {
    label: "Products",
    icon: "📦",
    searchKeys: ["name", "category", "sku", "description", "tags"],
    columns: [
      { key: "_index", label: "No.", sortable: true, className: "w-8 sm:w-14 text-xs sm:text-sm px-1 sm:px-3 text-muted-foreground" },
      { key: "name", label: "Name", sortable: true, className: "text-xs sm:text-sm font-semibold whitespace-normal min-w-[120px] leading-snug" },
      { key: "price", label: "Price", sortable: true, className: "text-xs sm:text-sm font-bold whitespace-nowrap px-1 sm:px-3 text-foreground", render: (v) => v != null ? `$${Number(v).toFixed(2)}` : "—" },
      { key: "category", label: "Category", sortable: true, className: "hidden sm:table-cell", render: (v) => v ? <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">{v}</span> : "—" },
      { key: "rating", label: "Rating", sortable: true, className: "hidden lg:table-cell", render: (v) => v != null ? `⭐ ${v}` : "—" },
      { key: "popular", label: "Popular", className: "hidden lg:table-cell", render: (v) => v ? "✅" : "—" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "sku", label: "SKU", type: "text", required: true, autoSku: true },
      { name: "category", label: "Category", type: "select", required: true, optionsResource: "categories", optionsMap: { value: "slug", label: "name" }, options: [
        { value: "pizza", label: "Pizza" },
        { value: "pizza-bagels", label: "Pizza Bagels" },
        { value: "burgers", label: "Burgers" },
        { value: "sides", label: "Sides" },
      ]},
      { name: "price", label: "Price", type: "number", required: true, step: "0.01" },
      { name: "base_price", label: "Base Price", type: "number", required: true, step: "0.01" },
      { name: "image", label: "Image URL", type: "image", required: false },
      { name: "description", label: "Description", type: "textarea", required: false },
      { name: "tags", label: "Tags (comma-separated)", type: "text", required: false },
      { name: "rating", label: "Rating", type: "number", required: false, step: "0.1", readOnly: true },
      { name: "view_count", label: "View Count", type: "number", required: false, readOnly: true },
      { name: "sales_count", label: "Sales Count", type: "number", required: false, readOnly: true },
      { name: "active", label: "Active", type: "checkbox", required: false },
      { name: "spicy", label: "Spicy", type: "checkbox", required: false },
      { name: "vegetarian", label: "Vegetarian", type: "checkbox", required: false },
      { name: "popular", label: "Popular", type: "checkbox", required: false },
    ],
  },
  categories: {
    label: "Categories",
    icon: "📂",
    searchKeys: ["name", "slug"],
    columns: [
      { key: "_index", label: "No.", sortable: true, className: "w-12 sm:w-16 text-xs sm:text-sm" },
      {
        key: "icon",
        label: "Icon",
        className: "w-16 text-center text-sm sm:text-base",
        render: (v) => (
          <span className="inline-flex items-center justify-center size-8 rounded-lg bg-secondary/50 text-base border border-border/40 shadow-xs">
            {v || "🍽️"}
          </span>
        ),
      },
      { key: "name", label: "Name", sortable: true, className: "text-xs sm:text-sm font-semibold" },
      { key: "slug", label: "Slug", sortable: true, className: "hidden sm:table-cell text-muted-foreground" },
      { key: "sort_order", label: "Order", sortable: true, className: "hidden lg:table-cell" },
      { key: "active", label: "Active", className: "text-xs sm:text-sm", render: (v) => v ? "✅" : "❌" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "slug", label: "Slug", type: "text", required: true },
      {
        name: "icon",
        label: "Icon (Emoji)",
        type: "icon",
        required: false,
        placeholder: "e.g. 🍕, 🍔, 🥤, 🥗",
      },
      { name: "sort_order", label: "Sort Order", type: "number", required: false },
      { name: "active", label: "Active", type: "checkbox", required: false },
    ],
  },
  customers: {
    label: "Customers",
    icon: "👥",
    searchKeys: ["name", "email", "phone"],
    columns: [
      { key: "_index", label: "No.", sortable: true, className: "w-12 sm:w-16 text-xs sm:text-sm" },
      { key: "name", label: "Name", sortable: true, className: "text-xs sm:text-sm" },
      { key: "email", label: "Email", sortable: true, className: "hidden sm:table-cell" },
      { key: "phone", label: "Phone", className: "text-xs sm:text-sm" },
      { key: "created_at", label: "Created", sortable: true, className: "hidden lg:table-cell", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: false },
      { name: "phone", label: "Phone", type: "tel", required: false },
      { name: "password", label: "Password (leave blank to keep current)", type: "text", required: false },
    ],
  },
  orders: {
    label: "Orders",
    icon: "📋",
    disableCreate: true,
    searchKeys: ["order_number", "status"],
    columns: [
      { key: "id", label: "ID", sortable: true, className: "hidden sm:table-cell w-16" },
      { key: "order_number", label: "Order No.", sortable: true, className: "text-xs sm:text-sm" },
      { key: "status", label: "Status", sortable: true, className: "text-xs sm:text-sm", render: (v, row, onUpdate) => {
        const colors = {
          PENDING: "bg-yellow-100 text-yellow-800",
          CONFIRMED: "bg-blue-100 text-blue-800",
          PREPARING: "bg-orange-100 text-orange-800",
          READY: "bg-purple-100 text-purple-800",
          OUT_FOR_DELIVERY: "bg-teal-100 text-teal-800",
          DELIVERED: "bg-green-100 text-green-800",
          CANCELLED: "bg-red-100 text-red-800",
        };
        const statuses = ["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];
        return (
          <div className="relative inline-block">
            <select 
              value={v || ""} 
              onChange={(e) => onUpdate && onUpdate({ status: e.target.value })}
              onClick={(e) => e.stopPropagation()} // Prevent row click
              className={`cursor-pointer rounded-full px-2 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[11px] font-bold uppercase tracking-wider outline-none border-2 border-transparent hover:border-primary/20 appearance-none shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 ${colors[v] || "bg-secondary"}`}
            >
              {statuses.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
        );
      }},
      { key: "total", label: "Total", sortable: true, className: "text-xs sm:text-sm font-semibold", render: (v) => v != null ? `$${Number(v).toFixed(2)}` : "—" },
      { key: "created_at", label: "Order Time", sortable: true, className: "hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap", render: (v) => formatDate(v) || "—" },
    ],
    fields: [
      { name: "order_number", label: "Order Number", type: "text", required: true },
      { name: "customer_id", label: "Customer ID", type: "number", required: true },
      { name: "status", label: "Status", type: "select", required: true, options: [
        { value: "PENDING", label: "Pending" },
        { value: "CONFIRMED", label: "Confirmed" },
        { value: "PREPARING", label: "Preparing" },
        { value: "DELIVERED", label: "Delivered" },
        { value: "CANCELLED", label: "Cancelled" },
      ]},
      { name: "subtotal", label: "Subtotal", type: "number", required: true, step: "0.01" },
      { name: "delivery_fee", label: "Delivery Fee", type: "number", required: false, step: "0.01" },
      { name: "total", label: "Total", type: "number", required: true, step: "0.01" },
      { name: "notes", label: "Notes", type: "textarea", required: false },
    ],
  },
  payments: {
    label: "Payments",
    icon: "💳",
    searchKeys: ["method", "status"],
    columns: [
      { key: "id", label: "ID", sortable: true, className: "w-12 sm:w-16 text-xs sm:text-sm" },
      { key: "order_id", label: "Order ID", sortable: true, className: "text-xs sm:text-sm" },
      { key: "method", label: "Method", sortable: true, className: "hidden sm:table-cell" },
      { key: "amount", label: "Amount", sortable: true, className: "text-xs sm:text-sm", render: (v) => v != null ? `$${Number(v).toFixed(2)}` : "—" },
      { key: "status", label: "Status", sortable: true, className: "text-xs sm:text-sm", render: (v) => {
        const colors = {
          completed: "bg-green-100 text-green-800",
          pending: "bg-yellow-100 text-yellow-800",
          failed: "bg-red-100 text-red-800",
        };
        return <span className={`rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium uppercase ${colors[v] || "bg-secondary"}`}>{v || "—"}</span>;
      }},
      { key: "created_at", label: "Created", sortable: true, className: "hidden lg:table-cell", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
    ],
    fields: [
      { name: "order_id", label: "Order ID", type: "text", required: true },
      { name: "method", label: "Method", type: "select", required: true, options: [
        { value: "CARD", label: "Card" },
        { value: "ABA_PAY", label: "ABA Pay" },
        { value: "CASH", label: "Cash" },
      ]},
      { name: "amount", label: "Amount", type: "number", required: true, step: "0.01" },
      { name: "status", label: "Status", type: "select", required: true, options: [
        { value: "PENDING", label: "Pending" },
        { value: "PAID", label: "Paid" },
        { value: "FAILED", label: "Failed" },
      ]},
    ],
  },
  drivers: {
    label: "Drivers",
    icon: "🚗",
    searchKeys: ["name", "status"],
    columns: [
      { key: "id", label: "ID", sortable: true, className: "hidden sm:table-cell w-16" },
      { key: "name", label: "Name", sortable: true, className: "text-xs sm:text-sm" },
      { key: "email", label: "Email", sortable: true, className: "hidden sm:table-cell" },
      { key: "phone", label: "Phone", className: "text-xs sm:text-sm" },
      { key: "status", label: "Status", sortable: true, className: "text-xs sm:text-sm", render: (v) => {
        const colors = {
          ONLINE: "bg-green-100 text-green-800",
          BUSY: "bg-yellow-100 text-yellow-800",
          OFFLINE: "bg-gray-100 text-gray-800",
        };
        return <span className={`rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium ${colors[v] || "bg-secondary"}`}>{v || "—"}</span>;
      }},
      { key: "profile_completed", label: "Profile", className: "hidden lg:table-cell", render: (v) => v ? "✅" : "❌" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "phone", label: "Phone", type: "tel", required: true },
      { name: "password", label: "Password (leave blank to keep current)", type: "text", required: false },
      { name: "profile_photo", label: "Profile Photo URL", type: "image", required: false },
      { name: "date_of_birth", label: "Date of Birth", type: "date", required: false },
      { name: "national_id", label: "National ID", type: "text", required: false },
      { name: "address", label: "Address", type: "textarea", required: false },
      { name: "emergency_contact", label: "Emergency Contact", type: "tel", required: false },
      { name: "vehicle_info", label: "Vehicle Info", type: "text", required: false },
      { name: "license_plate", label: "License Plate", type: "text", required: false },
      { name: "status", label: "Status", type: "select", required: true, options: [
        { value: "ONLINE", label: "Online" },
        { value: "BUSY", label: "Busy" },
        { value: "OFFLINE", label: "Offline" },
      ]},
      { name: "profile_completed", label: "Profile Completed", type: "checkbox", required: false },
    ],
  },
  coupons: {
    label: "Coupons",
    icon: "🎟️",
    searchKeys: ["code"],
    columns: [
      { key: "id", label: "ID", sortable: true, className: "w-12 sm:w-16 text-xs sm:text-sm" },
      { key: "code", label: "Code", sortable: true, className: "text-xs sm:text-sm font-bold" },
      { key: "discount_value", label: "Discount", sortable: true, className: "text-xs sm:text-sm", render: (v) => v != null ? v : "—" },
      { key: "min_order_amount", label: "Min Order", sortable: true, className: "hidden sm:table-cell", render: (v) => v != null ? `$${Number(v).toFixed(2)}` : "—" },
      { key: "expires_at", label: "Expires", sortable: true, className: "hidden lg:table-cell", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
      { key: "active", label: "Active", className: "text-xs sm:text-sm", render: (v) => v ? "✅" : "❌" },
    ],
    fields: [
      { name: "code", label: "Code", type: "text", required: true },
      { name: "discount_type", label: "Discount Type", type: "select", required: true, options: [
        { value: "PERCENTAGE", label: "Percentage" },
        { value: "FIXED", label: "Fixed" },
      ]},
      { name: "discount_value", label: "Discount Value", type: "number", required: true, step: "0.01" },
      { name: "min_order_amount", label: "Min Order", type: "number", required: false, step: "0.01" },
      { name: "expires_at", label: "Expires At", type: "date", required: false },
      { name: "active", label: "Active", type: "checkbox", required: false },
    ],
  },
  users: {
    label: "Users",
    icon: "👤",
    searchKeys: ["name", "email"],
    columns: [
      { key: "id", label: "ID", sortable: true, className: "w-12 sm:w-16 text-xs sm:text-sm" },
      { key: "name", label: "Name", sortable: true, className: "text-xs sm:text-sm" },
      { key: "email", label: "Email", sortable: true, className: "hidden sm:table-cell" },
      { key: "role_id", label: "Role ID", sortable: true, className: "hidden lg:table-cell" },
      { key: "status", label: "Status", className: "text-xs sm:text-sm", render: (v) => v === "ACTIVE" ? "✅" : "❌" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "password", label: "Password (leave blank to keep current)", type: "text", required: false },
      { name: "role_id", label: "Role ID", type: "number", required: true },
      { name: "status", label: "Status", type: "select", required: false, options: [
        { value: "ACTIVE", label: "Active" },
        { value: "INACTIVE", label: "Inactive" },
      ]},
    ],
  },
  roles: {
    label: "Roles",
    icon: "🛡️",
    searchKeys: ["name"],
    columns: [
      { key: "id", label: "ID", sortable: true, className: "w-12 sm:w-16 text-xs sm:text-sm" },
      { key: "name", label: "Name", sortable: true, className: "text-xs sm:text-sm" },
      { key: "permissions", label: "Permissions", className: "hidden sm:table-cell max-w-xs truncate" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "permissions", label: "Permissions (JSON)", type: "textarea", required: true },
    ],
  },
  audit_logs: {
    label: "Audit Logs",
    icon: "📝",
    searchKeys: ["action", "table_name", "user_id"],
    columns: [
      { key: "id", label: "ID", sortable: true, className: "w-12 sm:w-16 text-xs sm:text-sm" },
      { key: "user_id", label: "User ID", sortable: true, className: "text-xs sm:text-sm" },
      { key: "action", label: "Action", sortable: true, className: "text-xs sm:text-sm" },
      { key: "table_name", label: "Table", sortable: true, className: "hidden sm:table-cell" },
      { key: "created_at", label: "Date", sortable: true, className: "hidden lg:table-cell", render: (v) => v ? new Date(v).toLocaleString() : "—" },
    ],
    fields: [
      // Audit logs are usually read-only
    ],
  },
  product_options: {
    label: "Product Options",
    icon: "⚙️",
    searchKeys: ["name", "product_id"],
    columns: [
      { key: "id", label: "ID", sortable: true, className: "hidden sm:table-cell w-16" },
      { key: "product_id", label: "Product ID", sortable: true, className: "text-xs sm:text-sm" },
      { key: "name", label: "Name", sortable: true, className: "text-xs sm:text-sm" },
      { key: "is_required", label: "Required", className: "text-xs sm:text-sm", render: (v) => v ? "✅" : "—" },
    ],
    fields: [
      { name: "product_id", label: "Product ID", type: "number", required: true },
      { name: "name", label: "Option Name (e.g. Size)", type: "text", required: true },
      { name: "is_required", label: "Required", type: "checkbox", required: false },
    ],
  },
  product_variants: {
    label: "Product Variants",
    icon: "🧩",
    searchKeys: ["name", "option_id"],
    columns: [
      { key: "id", label: "ID", sortable: true, className: "hidden sm:table-cell w-16" },
      { key: "option_id", label: "Option ID", sortable: true, className: "hidden sm:table-cell" },
      { key: "name", label: "Variant Name", sortable: true, className: "text-xs sm:text-sm" },
      { key: "price_adjustment", label: "Price Adj.", sortable: true, className: "text-xs sm:text-sm", render: (v) => v != null ? `$${Number(v).toFixed(2)}` : "—" },
      { key: "active", label: "Active", className: "text-xs sm:text-sm", render: (v) => v ? "✅" : "❌" },
    ],
    fields: [
      { name: "option_id", label: "Option ID", type: "number", required: true },
      { name: "name", label: "Variant Name (e.g. Large)", type: "text", required: true },
      { name: "price_adjustment", label: "Price Adjustment", type: "number", required: true, step: "0.01" },
      { name: "active", label: "Active", type: "checkbox", required: false },
    ],
  },
  reviews: {
    label: "Reviews",
    icon: "⭐",
    searchKeys: ["product_id", "customer_id", "comment"],
    columns: [
      { key: "id", label: "ID", sortable: true, className: "hidden sm:table-cell w-16" },
      { key: "product_id", label: "Prod ID", sortable: true, className: "text-xs sm:text-sm" },
      { key: "rating", label: "Rating", sortable: true, className: "text-xs sm:text-sm", render: (v) => `⭐ ${v}` },
      { key: "comment", label: "Comment", className: "text-xs sm:text-sm max-w-[120px] truncate" },
      { key: "created_at", label: "Date", sortable: true, className: "hidden lg:table-cell", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
    ],
    fields: [
      { name: "product_id", label: "Product ID", type: "number", required: true },
      { name: "customer_id", label: "Customer ID", type: "number", required: true },
      { name: "rating", label: "Rating (1-5)", type: "number", required: true, step: "1" },
      { name: "comment", label: "Comment", type: "textarea", required: false },
    ],
  },
  kitchen_staff: {
    label: "Kitchen Staff",
    icon: "🧑‍🍳",
    searchKeys: ["name", "email", "phone"],
    columns: [
      { key: "id", label: "ID", sortable: true, className: "hidden sm:table-cell w-16" },
      { key: "name", label: "Name", sortable: true, className: "text-xs sm:text-sm" },
      { key: "email", label: "Email", sortable: true, className: "hidden sm:table-cell" },
      { key: "phone", label: "Phone", className: "text-xs sm:text-sm" },
      { key: "role_title", label: "Role", className: "text-xs sm:text-sm" },
      { key: "status", label: "Status", sortable: true, className: "text-xs sm:text-sm", render: (v) => {
        const colors = {
          ONLINE: "bg-green-100 text-green-800",
          BUSY: "bg-yellow-100 text-yellow-800",
          OFFLINE: "bg-gray-100 text-gray-800",
        };
        return <span className={`rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium ${colors[v] || "bg-secondary"}`}>{v || "—"}</span>;
      }},
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "phone", label: "Phone", type: "tel", required: true },
      { name: "password", label: "Password (leave blank to keep current)", type: "text", required: false },
      { name: "role_title", label: "Role Title (e.g. Head Chef)", type: "text", required: false },
      { name: "status", label: "Status", type: "select", required: true, options: [
        { value: "ONLINE", label: "Online" },
        { value: "BUSY", label: "Busy" },
        { value: "OFFLINE", label: "Offline" },
      ]},
    ],
  },
  ingredients: {
    label: "Ingredients",
    icon: "🥕",
    searchKeys: ["name"],
    columns: [
      { key: "id", label: "ID", sortable: true, className: "w-12 sm:w-16 text-xs sm:text-sm" },
      { key: "name", label: "Name", sortable: true, className: "text-xs sm:text-sm" },
      { key: "unit", label: "Unit", sortable: true, className: "text-xs sm:text-sm" },
    ],
    fields: [
      { name: "name", label: "Name (e.g. Flour)", type: "text", required: true },
      { name: "unit", label: "Unit (e.g. kg, grams)", type: "text", required: true },
    ],
  },
  ingredient_stock: {
    label: "Ingredient Stock",
    icon: "⚖️",
    searchKeys: ["ingredient_id"],
    columns: [
      { key: "id", label: "ID", sortable: true, className: "w-12 sm:w-16 text-xs sm:text-sm" },
      { key: "ingredient_id", label: "Ingredient ID", sortable: true, className: "text-xs sm:text-sm" },
      { key: "stock_quantity", label: "Stock Qty", sortable: true, className: "text-xs sm:text-sm" },
      { key: "low_stock_threshold", label: "Threshold", sortable: true, className: "hidden sm:table-cell" },
      { key: "updated_at", label: "Updated", sortable: true, className: "hidden lg:table-cell", render: (v) => v ? new Date(v).toLocaleString() : "—" },
    ],
    fields: [
      { name: "branch_id", label: "Branch ID", type: "number", required: true },
      { name: "ingredient_id", label: "Ingredient ID", type: "number", required: true },
      { name: "stock_quantity", label: "Stock Quantity", type: "number", required: true, step: "0.01" },
      { name: "low_stock_threshold", label: "Low Stock Threshold", type: "number", required: true, step: "0.01" },
    ],
  },
  inventory: {
    label: "Product Inventory",
    icon: "📦",
    searchKeys: ["product_id"],
    columns: [
      { key: "id", label: "ID", sortable: true, className: "w-12 sm:w-16 text-xs sm:text-sm" },
      { key: "product_id", label: "Product ID", sortable: true, className: "text-xs sm:text-sm" },
      { key: "stock_quantity", label: "Stock Qty", sortable: true, className: "text-xs sm:text-sm" },
      { key: "low_stock_threshold", label: "Threshold", sortable: true, className: "hidden sm:table-cell" },
      { key: "updated_at", label: "Updated", sortable: true, className: "hidden lg:table-cell", render: (v) => v ? new Date(v).toLocaleString() : "—" },
    ],
    fields: [
      { name: "branch_id", label: "Branch ID", type: "number", required: true },
      { name: "product_id", label: "Product ID", type: "number", required: true },
      { name: "stock_quantity", label: "Stock Quantity", type: "number", required: true },
      { name: "low_stock_threshold", label: "Low Stock Threshold", type: "number", required: true },
    ],
  },
  product_recipes: {
    label: "Product Recipes",
    icon: "🧑‍🍳",
    searchKeys: ["variant_id", "ingredient_id"],
    columns: [
      { key: "id", label: "ID", sortable: true, className: "w-12 sm:w-16 text-xs sm:text-sm" },
      { key: "variant_id", label: "Variant ID", sortable: true, className: "text-xs sm:text-sm" },
      { key: "ingredient_id", label: "Ingredient ID", sortable: true, className: "text-xs sm:text-sm" },
      { key: "quantity_needed", label: "Qty Needed", sortable: true, className: "text-xs sm:text-sm" },
    ],
    fields: [
      { name: "variant_id", label: "Product Variant ID", type: "number", required: true },
      { name: "ingredient_id", label: "Ingredient ID", type: "number", required: true },
      { name: "quantity_needed", label: "Quantity Needed", type: "number", required: true, step: "0.01" },
    ],
  },
};
