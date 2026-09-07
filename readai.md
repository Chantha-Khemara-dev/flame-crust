# 🔥 Flame & Crust — AI Agent Complete Reference (`readai.md`)

> 🤖 **AI AGENT INSTRUCTIONS:**
> 1. Read this file FIRST before scanning any code.
> 2. Use `replace_file_content` for targeted edits — NEVER rewrite entire files.
> 3. Use Shadcn UI (`@/components/ui/`), `lucide-react` icons, Tailwind CSS v4, `sonner` toasts — NEVER raw HTML/CSS.
> 4. Use `@/lib/api` for ALL API calls — NEVER `fetch()` directly.
> 5. All pages MUST have Loading, Error, Empty states using `@/components/shared/` components.

---

## 1. Project Overview

| Key | Value |
|:---|:---|
| **Name** | Flame & Crust — Food & Pizza Ordering Platform |
| **Repo** | `Kane-kiraa/flame-crust` |
| **Frontend** | React 19, Vite 7, Tailwind CSS v4, Shadcn UI, Zustand, TanStack Query |
| **Backend** | Spring Boot 3.5.4, Java 21, Spring Security, JWT, Bucket4j |
| **Database** | MySQL 8.4, Spring Data JPA, Flyway (18 migrations) |
| **Payment** | Bakong KHQR (NBC Cambodia API) |
| **Hosting** | Render (Backend), Vercel (Frontend), Aiven (MySQL) |

---

## 2. File Map — Frontend (`frontend/src/`)

### 2.1 Core Entry Files

| File | Purpose |
|:---|:---|
| `App.jsx` | All route definitions (Customer, Admin, Driver, Kitchen portals) |
| `main.jsx` | React root render + providers (QueryClient, ThemeProvider, Toaster) |
| `app/globals.css` | OKLCH color tokens, dark mode, fonts (Inter + Playfair), custom animations |

### 2.2 Pages by Portal

#### Customer Portal (Public)

| Route | Page File | Description |
|:---|:---|:---|
| `/` | `pages/home.jsx` | Landing: Hero, Featured, Menu preview, How-It-Works, Testimonials |
| `/menu` | `pages/menu.jsx` | Full catalog: category nav, search, dietary filters, food card grid |
| `/product/:id` | `pages/product-detail.jsx` | Product detail: variants, options, reviews, fly-to-cart animation |
| `/cart` | `pages/cart.jsx` | Cart review: quantities, coupon preview, checkout CTA |
| `/checkout` | `pages/checkout.jsx` | Address MapPicker, coupon, payment method, order placement (RequireAuth) |
| `/payment` `/payment/:orderId` | `pages/payment.jsx` | KHQR QR code, 5-min expiry countdown, Bakong polling verification |
| `/order-confirmation` | `pages/order-confirmation.jsx` | Post-purchase: confetti, receipt summary, tracking CTA |
| `/track/:orderId` | `pages/order-tracking.jsx` | Live Leaflet map, driver GPS, chat modal, WebRTC voice call |
| `/review/:productId` | `pages/leave-review.jsx` | 1-5 star rating + comment (RequireAuth) |
| `/login` | `pages/login.jsx` | Multi-role: OTP, Google OAuth, staff password, role-based redirect |
| `/profile` | `pages/profile.jsx` | Tabs: Order History, Addresses, Coupons, Favorites, Settings (RequireAuth) |

#### Admin Portal (`/admin/*`)

| Route | Page File | Description |
|:---|:---|:---|
| `/admin/dashboard` | `pages/admin/dashboard.jsx` | KPI cards, Recharts charts, recent orders, top products |
| `/admin/kitchen` | `pages/admin/kitchen-dashboard.jsx` | Embedded KDS Kanban inside admin |
| `/admin/:resource` | `pages/admin/resource-page.jsx` | Generic CRUD: table/card view, search, pagination, create/edit modals |
| — | `pages/admin/resource-config.jsx` | Column defs, form inputs, search keys for all 18 resources |
| — | `pages/admin/sidebar.jsx` | Collapsible nav: Overview, Operations, Catalog, Logistics, People, Inventory |
| — | `pages/admin/layout.jsx` | Admin shell: sidebar, header, breadcrumb, theme toggle |
| — | `pages/admin/add-product.jsx` | Product creation form with Cloudinary image upload |
| — | `pages/admin/change-password-dialog.jsx` | Password change modal |

#### Driver Portal (`/driver/*`)

| Route | Page File | Description |
|:---|:---|:---|
| `/driver/dashboard` | `pages/driver/dashboard.jsx` | Active orders, GPS broadcasting (5s interval), Leaflet map, chat |
| `/driver/profile` | `pages/driver/profile.jsx` | Performance, vehicle info, metrics, settings |
| — | `pages/driver/login.jsx` | Driver login + multi-step registration |

#### Kitchen Portal (`/kitchen/*`)

| Route | Page File | Description |
|:---|:---|:---|
| `/kitchen/dashboard` | `pages/kitchen/dashboard.jsx` | KDS root: auto-refresh 10s, status progression |
| — | `pages/kitchen/components/DashboardView.jsx` | Kanban: Pending → Preparing → Ready columns |
| — | `pages/kitchen/components/OrderDetailsPanel.jsx` | Order detail slide-over panel |
| — | `pages/kitchen/components/Sidebar.jsx` | Kitchen nav sidebar |
| — | `pages/kitchen/components/CustomersView.jsx` | Customer directory |
| — | `pages/kitchen/components/PerformanceView.jsx` | Prep time analytics |
| — | `pages/kitchen/components/MiscViews.jsx` | ChefProfile, Notifications, Settings |

### 2.3 Components

#### `components/food/` — Customer Domain (DO NOT BREAK)

| Component | Purpose |
|:---|:---|
| `navbar.jsx` | Header: logo, nav links, search trigger, theme, cart, auth menu |
| `hero.jsx` | Homepage hero banner with CTA buttons |
| `menu.jsx` | Homepage menu section wrapper |
| `food-card.jsx` | Product card: image, spice badge, price, rating, add-to-cart |
| `cart-drawer.jsx` | Slide-out cart drawer: items, quantities, coupon, checkout |
| `map-picker.jsx` | Leaflet map dialog for delivery address pin drop |
| `arc-category-nav.jsx` | Curved horizontal category nav with icons |
| `available-coupons.jsx` | Coupon list/selector with one-click apply |
| `featured.jsx` | Homepage featured items section |
| `features.jsx` | Brand value pillars section |
| `how-it-works.jsx` | 3-step order process guide |
| `testimonials.jsx` | Customer reviews carousel |
| `footer.jsx` | Full footer: hours, locations, social, newsletter |
| `mobile-bottom-nav.jsx` | Mobile-only bottom app bar |
| `search-modal.jsx` | `Cmd+K` search dialog with instant add-to-cart |
| `payment-form.jsx` | Payment method selection + KHQR display |
| `order-chat-modal.jsx` | Live chat: text, photo (Cloudinary), voice messages, typing indicators |
| `online-call-modal.jsx` | WebRTC voice call modal with mute/timer/ringtone |
| `floating-chat-head.jsx` | Draggable chat bubble with unread count |
| `global-chat-head-manager.jsx` | Global listener spawning chat bubbles |
| `global-call-manager.jsx` | Global WebRTC incoming call listener |
| `active-order-widget.jsx` | Floating sticky pill showing active order status |
| `database-dashboard.jsx` | Compact admin metrics widget |

#### `components/shared/` — Reusable Utilities

| Component | Import Path | Purpose |
|:---|:---|:---|
| `LoadingSkeleton` | `@/components/shared/loading-skeleton` | Skeleton loaders: Card, Grid, Menu, Profile, Cart, Detail, Table |
| `ErrorState` | `@/components/shared/error-state` | Error box with retry button |
| `EmptyState` | `@/components/shared/empty-state` | Empty placeholder with icon + action |
| `DataTable` | `@/components/shared/data-table` | Paginated sortable searchable table |
| `ConfirmDialog` | `@/components/shared/confirm-dialog` | Destructive action confirmation |
| `FormField` | `@/components/shared/form-field` | React Hook Form input wrapper |
| `FlyToCart` | `@/components/shared/fly-to-cart` | Parabolic animation to cart icon |
| `SearchInput` | `@/components/shared/search-input` | Rounded search input with clear |
| `SplashScreen` | `@/components/shared/splash-screen` | Animated SVG pizza intro screen |
| `PageTransition` | `@/components/shared/page-transition` | Route transition wrapper |
| `ScrollToTop` | `@/components/shared/scroll-to-top` | Auto-scroll on navigation |

#### `components/ui/` — Shadcn Primitives (48 components)

`accordion`, `alert-dialog`, `alert`, `aspect-ratio`, `avatar`, `badge`, `breadcrumb`, `button`, `calendar`, `card`, `carousel`, `chart`, `checkbox`, `collapsible`, `command`, `context-menu`, `dialog`, `drawer`, `dropdown-menu`, `form`, `hover-card`, `input-otp`, `input`, `label`, `menubar`, `navigation-menu`, `pagination`, `popover`, `progress`, `radio-group`, `resizable`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `slider`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `toast`, `toaster`, `toggle-group`, `toggle`, `tooltip`

#### Other Components

| Component | Purpose |
|:---|:---|
| `ImageUpload.jsx` | Cloudinary uploader with preview + drag-and-drop |
| `theme-provider.jsx` | Light/Dark/System theme context |
| `common/PushNotificationButton.jsx` | Web Push subscribe/unsubscribe bell button |
| `common/PushNotificationPromptModal.jsx` | Push permission prompt modal |

### 2.4 lib/ Modules

#### `lib/api.js` — Primary API Client (USE THIS)

```js
// Public
getHealth()                              // GET /api/health
getProducts(category?)                   // GET /api/products[/:category]
getDashboard()                           // GET /api/dashboard
recordProductView(id)                    // POST /api/products/:id/view

// Admin Universal CRUD
list(resource, {page, limit, search})    // GET /api/admin/:resource
get(resource, id)                        // GET /api/admin/:resource/:id
create(resource, data)                   // POST /api/admin/:resource
update(resource, id, data)               // PUT /api/admin/:resource/:id
remove(resource, id)                     // DELETE /api/admin/:resource/:id

// Driver
driverLogin(email, password)             // POST /api/auth/driver-login
driverRegister(name, email, phone, pwd)  // POST /api/auth/driver-register
getDriverMe()                            // GET /api/auth/driver-me
updateDriverProfile(data)                // PUT /api/auth/driver-profile
updateDriverLocation(lat, lng)           // PUT /api/auth/driver-location

// Order Chat & Calls
getOrderMessages(orderId)                // GET /api/auth/order-messages
sendOrderMessage(data)                   // POST /api/auth/order-messages
markOrderMessagesRead(orderId, type)     // POST /api/auth/order-messages/read
deleteOrderMessage(msgId, senderType)    // POST /api/auth/order-messages/delete
reportOrderChatTyping(orderId, type)     // POST /api/auth/order-chat/typing
checkOrderChatTyping(orderId, userType)  // GET /api/auth/order-chat/typing
getActiveCall(orderId)                   // GET /api/auth/active-calls
startActiveCall(data)                    // POST /api/auth/active-calls/start
answerActiveCall(orderId)                // POST /api/auth/active-calls/answer
endActiveCall(orderId)                   // POST /api/auth/active-calls/end
```

#### `lib/food-api.jsx` — Cached Food Data

```js
fetchFoodItems()          // GET /api/products (deduplicated, cached in localStorage)
fetchCategories()         // GET /api/products/categories (deduplicated, cached)
getCachedFoodItems()      // Returns cached products or fallback
getCachedCategories()     // Returns cached categories
getImageUrl(img)          // Formats image URL (Cloudinary prefix or local)
fetchDashboard(signal)    // Calls getDashboard()
```

#### `lib/cart-store.jsx` — Zustand Cart (persisted as `flame-crust-cart`)

```js
// State
lines[]      // Cart items: [{id, name, price, qty, image, ...}]
isOpen       // Cart drawer visibility
coupon       // Applied coupon object or null

// Actions
addItem(item, qty=1)    removeItem(id)    increment(id)    decrement(id)
clear()                 openCart()         closeCart()       toggleCart()
subtotal()              count()            applyCoupon(data) clearCoupon()
```

#### `lib/store.js` — Zustand General State

```js
// State: cart.items[], cart.total, cart.coupon
// Actions: addToCart, removeFromCart, updateQuantity, applyCoupon, clearCart
```

#### `lib/utils.jsx` — Utilities

```js
cn(...inputs)           // Tailwind class merge (clsx + twMerge)
formatDate(dateInput)   // → "Sep 7, 2026, 11:00 PM"
formatTime(dateInput)   // → "11:00 PM"
formatPrice(amount)     // → "$12.50"
```

#### `lib/cloudinary.js` — Image/Audio Upload

```js
uploadImageToCloudinary(file)       // Compress + upload image (max 1200px, JPEG 0.92)
uploadAudioToCloudinary(audioBlob)  // Upload audio blob to Cloudinary
getOptimizedImageUrl(url, w=1200)   // Inject Cloudinary transforms (f_jpg, q_auto, w_1200)
```

#### `lib/webrtc.js` — WebRTC Audio Calls

```js
// WebRTCManager class: RTCPeerConnection with Google STUN
// Methods: startLocalAudio(), setMuted(), createOffer(), startPolling(), handleSignalingData()
// Signaling via backend order messaging endpoint
```

#### Other lib files

| File | Purpose |
|:---|:---|
| `food-data.jsx` | Fallback catalog items, categories, default reviews |
| `push-notifications.js` | Web Push VAPID subscription, service worker |
| `db.jsx` | Client-side DB stub |

### 2.5 Hooks (`hooks/`)

| Hook | Purpose |
|:---|:---|
| `useIsMobile()` | Detects viewport < 768px via `matchMedia` |
| `useToast()` | Toast state machine: `toast()`, `dismiss()`, `ADD/UPDATE/DISMISS/REMOVE_TOAST` |

---

## 3. File Map — Backend (`backend/src/main/java/com/flamecrust/api/`)

### 3.1 Controllers (8 total)

#### `controller/HealthController.java`
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/health` | Returns `{"status":"ok","service":"flame-crust-api"}` |

#### `controller/ProductController.java`
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/products` | All active products ordered by ID |
| `GET` | `/api/products/categories` | Active categories by sort_order |
| `GET` | `/api/products/{idOrCategory}` | Product by numeric ID OR category slug filter |
| `POST` | `/api/products/{id}/view` | Increment product view_count +1 |

#### `controller/CategoryController.java`
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/categories` | All categories |
| `GET` | `/api/categories/{id}` | Single category |
| `POST` | `/api/categories` | Create category |
| `PUT` | `/api/categories/{id}` | Update category |
| `DELETE` | `/api/categories/{id}` | Delete category (204) |

#### `controller/DashboardController.java`
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/dashboard` | Analytics: revenue, orders, 7-day trend, top products, category distribution, reviews, low stock alerts |

#### `controller/PaymentVerificationController.java`
| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/api/payments/verify-khqr` | Verify Bakong KHQR via NBC API. Updates payment→PAID, order→CONFIRMED, inserts order_status_history |

#### `controller/PushNotificationController.java`
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/notifications/vapid-public-key` | VAPID public key for Web Push |
| `POST` | `/api/notifications/subscribe` | Register push subscription |
| `POST` | `/api/notifications/unsubscribe` | Remove push subscription |
| `POST` | `/api/notifications/test` | Send test notification |

#### `controller/AuthController.java` (28 endpoints)
| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/api/auth/send-otp` | Generate 6-digit OTP, email via SMTP, rate-limited |
| `POST` | `/api/auth/verify-otp` | Verify OTP, create/fetch customer, return JWT |
| `POST` | `/api/auth/customer-login` | Customer password auth (lockout: 3 fails = 15min lock, auto BCrypt upgrade) |
| `POST` | `/api/auth/customer-register` | Register customer with OTP + BCrypt |
| `POST` | `/api/auth/check-email` | Check email across customers/users/drivers |
| `POST` | `/api/auth/login` | **Unified login**: users → drivers → kitchen_staff → customers |
| `POST` | `/api/auth/google-login` | Google OAuth: find or auto-provision customer |
| `POST` | `/api/auth/admin-login` | Admin/staff login against users+roles |
| `POST` | `/api/auth/driver-login` | Driver login |
| `POST` | `/api/auth/kitchen-login` | Kitchen staff login |
| `POST` | `/api/auth/driver-register` | Register driver |
| `GET` | `/api/auth/driver-me` | Authenticated driver profile |
| `PUT` | `/api/auth/driver-profile` | Update driver profile |
| `PUT` | `/api/auth/driver-location` | Update driver GPS lat/lng |
| `POST` | `/api/auth/customer-change-password` | Change password (old password or OTP) |
| `POST` | `/api/auth/customer-update-profile` | Update customer name/phone/avatar/cover |
| `POST` | `/api/auth/admin-change-password` | Admin password change |
| `GET` | `/api/auth/customer-profile-data` | Profile bundle: customer, orders+items, addresses, coupons |
| `GET` | `/api/auth/order-messages` | Chat history for order |
| `POST` | `/api/auth/order-messages` | Send chat message + push notification |
| `POST` | `/api/auth/order-messages/read` | Mark messages read |
| `POST` | `/api/auth/order-messages/delete` | Soft-delete message → `[DELETED]` |
| `POST` | `/api/auth/order-chat/typing` | Signal typing indicator |
| `GET` | `/api/auth/order-chat/typing` | Check if other party typing (3.5s window) |
| `GET` | `/api/auth/active-calls` | Check active calls for order |
| `POST` | `/api/auth/active-calls/start` | Initiate voice call |
| `POST` | `/api/auth/active-calls/answer` | Answer call |
| `POST` | `/api/auth/active-calls/end` | End call |

#### `controller/AdminCrudController.java` (32 resources)
```
GET    /api/admin/{resource}?search=&page=0&limit=10&sort=&dir=   # List + Search + Paginate
GET    /api/admin/{resource}/{id}                                  # Get by ID
POST   /api/admin/{resource}                                       # Create (auto BCrypt, auto SKU, push notif)
PUT    /api/admin/{resource}/{id}                                  # Update (JSON merge)
DELETE /api/admin/{resource}/{id}                                  # Delete
```
**Resources:** `addresses`, `audit_logs`, `branch_staff`, `branches`, `cart_items`, `carts`, `cash_register_sessions`, `categories`, `coupon_usages`, `coupons`, `customers`, `driver_locations`, `drivers`, `ingredient_stock`, `ingredients`, `inventory`, `kitchen_staff`, `order_items`, `order_messages`, `order_status_history`, `orders`, `otps`, `payment_attempts`, `payments`, `product_options`, `product_recipes`, `product_variants`, `products`, `reviews`, `roles`, `tables`, `users`

### 3.2 Services

| Service | Key Methods |
|:---|:---|
| `CategoryServiceImpl` | `getAllCategories()`, `getCategoryById(id)`, `createCategory()`, `updateCategory()`, `deleteCategory()` |
| `EmailService` | `sendOtpEmail(toEmail, otp)` — SMTP via JavaMailSender, dev fallback |
| `WebPushService` | `sendNotification()`, `sendToUser()`, `sendToUserType()`, `broadcast()` — VAPID Web Push |

### 3.3 Config & Security

| File | Purpose |
|:---|:---|
| `config/SecurityConfig.java` | Stateless JWT, disables CSRF, BCryptPasswordEncoder, permits all (auth in controllers) |
| `config/CorsConfig.java` | Allow all origins (`*`), credentials, standard headers |
| `config/FlywayConfig.java` | Auto `repair()` then `migrate()` |
| `config/WebConfig.java` | Injects `app.frontend-url` |
| `security/JwtAuthenticationFilter.java` | Extracts Bearer token, validates, sets SecurityContext |
| `security/JwtUtil.java` | HMAC-SHA256 sign/parse/validate JWT, extract claims |

### 3.4 JPA Entities (33 models)

| Entity | Table | Key Fields | Relations |
|:---|:---|:---|:---|
| `Product` | `products` | id, sku, name, price, basePrice, categoryId, category, image, tags, rating, popular, spicy, vegetarian, active, viewCount, salesCount | `@OneToMany → ProductOption (EAGER)` |
| `ProductOption` | `product_options` | id, productId, name, isRequired, maxSelections | `@OneToMany → ProductVariant (EAGER)` |
| `ProductVariant` | `product_variants` | id, optionId, name, priceAdjustment, active | Child of ProductOption |
| `ProductRecipe` | `product_recipes` | id, variant_id, ingredient_id, quantity_needed | BOM ingredients per variant |
| `Category` | `categories` | id, slug, name, icon, sort_order, active | — |
| `Customer` | `customers` | id, name, email, phone, password_hash, status, avatar, cover_photo, reward_points, failed_attempts, locked_until | — |
| `Address` | `addresses` | id, customer_id, label, address_line, city, postal_code, latitude, longitude, is_default | FK → customer |
| `Order` | `orders` | id, order_number, customer_id, address_id, status, subtotal, delivery_fee, total, discount_amount, coupon_id, driver_id, branch_id, order_type, notes | FK → customer, address, coupon, driver |
| `OrderItem` | `order_items` | id, order_id, product_id, product_name, quantity, unit_price, line_total, options, status, item_notes | FK → order |
| `OrderStatusHistory` | `order_status_history` | id, order_id, status, notes, changed_by | FK → order |
| `OrderMessage` | `order_messages` | id, order_id, sender_type, sender_id, sender_name, message, is_read | FK → order |
| `Payment` | `payments` | id, order_id, method, status, amount, transaction_id, paid_at | FK → order (1:1) |
| `PaymentAttempt` | `payment_attempts` | id, order_id, method, status, amount, error_message | Payment retry log |
| `Cart` | `carts` | id, customer_id | FK → customer (1:1) |
| `CartItem` | `cart_items` | id, cart_id, product_id, quantity, options (JSON) | FK → cart |
| `Coupon` | `coupons` | id, code, discount_type, discount_value, min_order_amount, expires_at, usage_limit, used_count, active | — |
| `CouponUsage` | `coupon_usages` | id, coupon_id, customer_id, order_id | FK → coupon, customer, order |
| `Driver` | `drivers` | id, name, phone, email, password_hash, profile_photo, national_id, license_plate, vehicle_info, latitude, longitude, status, branch_id | — |
| `DriverLocation` | `driver_locations` | id, driver_id, latitude, longitude, updated_at | GPS trail |
| `Review` | `reviews` | id, productId, customerId, rating, comment, isVerifiedPurchase | FK → product, customer |
| `User` | `users` | id, role_id, name, email, password_hash, status | FK → role |
| `Role` | `roles` | id, name, permissions (JSON) | — |
| `KitchenStaff` | `kitchen_staff` | id, name, phone, email, password_hash, role_title, status, branch_id | — |
| `Branche` | `branches` | id, name, address, phone, active, latitude, longitude | — |
| `BranchStaff` | `branch_staff` | id, branch_id, user_id | Join table |
| `Table` | `tables` | id, branch_id, table_no, capacity, status | Dine-in tables |
| `CashRegisterSession` | `cash_register_sessions` | id, branch_id, opened_by, closed_by, opening_amount, closing_amount | POS shift |
| `Ingredient` | `ingredients` | id, name, unit | Raw materials |
| `IngredientStock` | `ingredient_stock` | id, branch_id, ingredient_id, stock_quantity, low_stock_threshold | Per-branch stock |
| `Inventory` | `inventory` | id, branch_id, product_id, stock_quantity, low_stock_threshold | Finished goods stock |
| `Otp` | `otps` | id, target, otp_code, is_used, expires_at, purpose | 6-digit, 5min expiry |
| `AuditLog` | `audit_logs` | id, user_id, action, table_name, old_data, new_data (JSON) | Admin action trail |
| `PushSubscription` | `push_subscriptions` | id, userId, userType, endpoint, p256dh, auth | Web Push credentials |

---

## 4. Enums & Data Dictionary

| Field | Values | Notes |
|:---|:---|:---|
| `Order.status` | `PENDING` → `CONFIRMED` → `PREPARING` → `READY` → `OUT_FOR_DELIVERY` → `DELIVERED` / `CANCELLED` | Lifecycle (cancel from PENDING/CONFIRMED/PREPARING only) |
| `Payment.status` | `PENDING` → `PAID` / `FAILED`, `PAID` → `REFUNDED` | — |
| `Payment.method` | `CASH`, `CARD`, `ABA_PAY`, `WING`, `OTHER` | — |
| `Driver.status` | `ONLINE`, `BUSY`, `OFFLINE` | — |
| `Auth roles` | `ADMIN`, `CUSTOMER`, `DRIVER`, `KITCHEN` | JWT role claim |
| `Coupon.discount_type` | `PERCENTAGE`, `FIXED`, `FREE_DELIVERY` | — |
| `Order.order_type` | `DELIVERY`, `DINE_IN`, `TAKEAWAY` | — |
| `OrderMessage.sender_type` | `CUSTOMER`, `DRIVER`, `KITCHEN`, `SYSTEM` | Chat message origin |

---

## 5. Auth & Security

| Feature | Detail |
|:---|:---|
| **JWT** | HMAC-SHA256, 24h expiry, claims: `email`, `role` |
| **Password** | BCrypt. Auto-upgrade from SHA-256/plaintext on login |
| **Account Lockout** | 3 failed attempts → 15-minute lock (customers, users, drivers, kitchen_staff) |
| **Rate Limiting** | Bucket4j: 100 login/15min, 100 OTP/10min |
| **OTP** | 6-digit SecureRandom, 5min expiry, single-use, email delivery |
| **Google OAuth** | `@react-oauth/google`, auto-create customer if new |
| **Frontend Storage** | `localStorage`: `adminAuth`, `customerAuth`, `driverAuth`, `kitchenAuth` |
| **Route Guards** | `RequireAuth` (any token), `RoleRedirectGuard` (portal isolation) |

---

## 6. Design System & Theme

| Token | Light Mode | Dark Mode |
|:---|:---|:---|
| `--primary` | `oklch(0.52 0.21 28)` Deep Crimson | `oklch(0.65 0.22 28)` Vivid Crimson |
| `--accent` | `oklch(0.78 0.16 70)` Warm Amber | `oklch(0.7 0.18 70)` Amber Glow |
| `--background` | `oklch(0.985 0.012 75)` Warm Cream | `oklch(0.16 0.015 30)` Deep Obsidian |
| `--card` | `oklch(1 0 0)` White | `oklch(0.21 0.02 30)` Dark Slate |
| `--destructive` | `oklch(0.55 0.24 27)` Warning Red | `oklch(0.65 0.22 28)` |

| Property | Value |
|:---|:---|
| **Sans Font** | Inter (`font-sans`) — body & UI |
| **Serif Font** | Playfair Display / Georgia (`font-serif`) — h1-h6 headings |
| **Border Radius** | `0.875rem` (14px) |
| **Icons** | `lucide-react` exclusively |
| **Toasts** | `sonner` — `import { toast } from "sonner"` |
| **Animations** | `framer-motion` transitions, custom: `animate-gradient`, `animate-flicker`, `animate-marquee` |
| **Gradients** | `.text-gradient-warm` — 3-stop flame gradient for brand text |
| **Shadows** | `.shadow-warm`, `.shadow-warm-lg` — warm-hued depth |
| **Hover** | `.card-lift` — smooth elevation on hover |

---

## 7. Code Patterns (Templates)

### Data Fetching Page (ALWAYS follow this pattern)

```jsx
import { useState, useEffect } from "react";
import { getProducts } from "@/lib/api";
import LoadingSkeleton from "@/components/shared/loading-skeleton";
import ErrorState from "@/components/shared/error-state";
import EmptyState from "@/components/shared/empty-state";
import { toast } from "sonner";

export default function ExamplePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const res = await getProducts();
      setData(res || []);
    } catch (err) {
      setError(err.message); toast.error("Failed to load data");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <LoadingSkeleton count={6} />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;
  if (!data.length) return <EmptyState title="No items" />;
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-4">...</div>;
}
```

### Admin CRUD API Usage

```js
import { list, get, create, update, remove } from "@/lib/api";
const orders = await list("orders", { page: 0, limit: 10, search: "PENDING" });
await create("coupons", { code: "FLAME20", discount_type: "PERCENTAGE", discount_value: 20 });
await update("orders", 12, { status: "CONFIRMED" });
await remove("coupons", 3);
```

---

## 8. Local Setup

```bash
# Backend (port 8080)
cd backend && sudo systemctl start mysql
set -a; source .env; set +a
./mvnw spring-boot:run

# Frontend (port 3000)
cd frontend && npm install && npm run dev
```

**Vite Dev Proxy:** `/api` → `http://localhost:8080` (configured in `vite.config.js`)

---

## 9. AI Agent Rules

### ✅ DO
1. Use `replace_file_content` for targeted line edits
2. Import from `@/components/ui/` (Shadcn) for all UI
3. Use `@/lib/api` for ALL backend calls
4. Use `lucide-react` icons, `sonner` toasts
5. Include Loading / Error / Empty / Retry states
6. Keep responsive: mobile + tablet + desktop
7. Preserve existing comments and docstrings

### ❌ DON'T
1. Don't rewrite entire files to fix small changes
2. Don't use raw HTML `<button>`, `<input>`, `<select>`
3. Don't write vanilla CSS — use Tailwind CSS v4
4. Don't hardcode URLs — use `import.meta.env.VITE_API_URL` or `@/lib/api`
5. Don't break existing `components/food/` layouts
6. Don't expose `password_hash`, OTP codes, or audit data to customers
7. Don't use mock data when real API exists
