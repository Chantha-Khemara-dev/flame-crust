package com.flamecrust.api.controller;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flamecrust.api.model.*;
import com.flamecrust.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationContext;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.lang.reflect.Method;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import com.flamecrust.api.service.WebPushService;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminCrudController {

    private final ApplicationContext context;
    private final ObjectMapper mapper;
    private final JdbcTemplate jdbc;
    private final WebPushService webPushService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private record ResourceConfig(Class<?> entityClass, Class<? extends JpaRepository> repoClass) {}

    private static final Map<String, ResourceConfig> RESOURCES = new HashMap<>();

    static {
        Map<String, ResourceConfig> map = RESOURCES;
        map.put("addresses", new ResourceConfig(Address.class, AddressRepository.class));
        map.put("audit_logs", new ResourceConfig(AuditLog.class, AuditLogRepository.class));
        map.put("branch_staff", new ResourceConfig(BranchStaff.class, BranchStaffRepository.class));
        map.put("branches", new ResourceConfig(Branche.class, BrancheRepository.class));
        map.put("cart_items", new ResourceConfig(CartItem.class, CartItemRepository.class));
        map.put("carts", new ResourceConfig(Cart.class, CartRepository.class));
        map.put("cash_register_sessions", new ResourceConfig(CashRegisterSession.class, CashRegisterSessionRepository.class));
        map.put("categories", new ResourceConfig(Category.class, CategoryRepository.class));
        map.put("coupon_usages", new ResourceConfig(CouponUsage.class, CouponUsageRepository.class));
        map.put("coupons", new ResourceConfig(Coupon.class, CouponRepository.class));
        map.put("customers", new ResourceConfig(Customer.class, CustomerRepository.class));
        map.put("driver_locations", new ResourceConfig(DriverLocation.class, DriverLocationRepository.class));
        map.put("drivers", new ResourceConfig(Driver.class, DriverRepository.class));
        map.put("ingredient_stock", new ResourceConfig(IngredientStock.class, IngredientStockRepository.class));
        map.put("ingredients", new ResourceConfig(Ingredient.class, IngredientRepository.class));
        map.put("inventory", new ResourceConfig(Inventory.class, InventoryRepository.class));
        map.put("kitchen_staff", new ResourceConfig(KitchenStaff.class, KitchenStaffRepository.class));
        map.put("order_items", new ResourceConfig(OrderItem.class, OrderItemRepository.class));
        map.put("order_messages", new ResourceConfig(OrderMessage.class, OrderMessageRepository.class));
        map.put("order_status_history", new ResourceConfig(OrderStatusHistory.class, OrderStatusHistoryRepository.class));
        map.put("orders", new ResourceConfig(Order.class, OrderRepository.class));
        map.put("otps", new ResourceConfig(Otp.class, OtpRepository.class));
        map.put("payment_attempts", new ResourceConfig(PaymentAttempt.class, PaymentAttemptRepository.class));
        map.put("payments", new ResourceConfig(Payment.class, PaymentRepository.class));
        map.put("product_options", new ResourceConfig(ProductOption.class, ProductOptionRepository.class));
        map.put("product_recipes", new ResourceConfig(ProductRecipe.class, ProductRecipeRepository.class));
        map.put("product_variants", new ResourceConfig(ProductVariant.class, ProductVariantRepository.class));
        map.put("products", new ResourceConfig(Product.class, ProductRepository.class));
        map.put("reviews", new ResourceConfig(Review.class, ReviewRepository.class));
        map.put("roles", new ResourceConfig(Role.class, RoleRepository.class));
        map.put("tables", new ResourceConfig(Table.class, TableRepository.class));
        map.put("users", new ResourceConfig(User.class, UserRepository.class));
    }

    @SuppressWarnings("unchecked")
    private <T, ID> JpaRepository<T, ID> getRepository(String resourceName) {
        ResourceConfig config = RESOURCES.get(resourceName.toLowerCase());
        if (config == null) throw new IllegalArgumentException("Unknown resource: " + resourceName);
        return context.getBean(config.repoClass());
    }
    
    private Class<?> getEntityClass(String resourceName) {
        ResourceConfig config = RESOURCES.get(resourceName.toLowerCase());
        if (config == null) throw new IllegalArgumentException("Unknown resource: " + resourceName);
        return config.entityClass();
    }

    private Long extractId(Object entity) {
        if (entity == null) return null;
        try {
            Method m = entity.getClass().getMethod("getId");
            Object id = m.invoke(entity);
            return id instanceof Number ? ((Number) id).longValue() : null;
        } catch (Exception e) {
            return null;
        }
    }

    @GetMapping("/{resource}")
    public Map<String, Object> all(
            @PathVariable String resource,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false, defaultValue = "id") String sort,
            @RequestParam(required = false) String dir) {
        JpaRepository<Object, Long> repo = getRepository(resource);
        
        // All admin resources start from ID 1 ascending (1, 2, 3...)
        Sort.Direction sortDirection = (dir != null && "desc".equalsIgnoreCase(dir))
                ? Sort.Direction.DESC
                : Sort.Direction.ASC;
        
        Sort sortObj = Sort.by(sortDirection, sort);

        if (limit != null && limit == -1) {
            List<Object> allItems = repo.findAll(sortObj);
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("items", allItems);
            resp.put("total", allItems.size());
            resp.put("page", 0);
            resp.put("size", allItems.size());
            resp.put("totalPages", 1);
            return resp;
        }

        int pageSize = size != null ? size : (limit != null ? limit : 500);
        if (pageSize <= 0) pageSize = 500;
        if (pageSize > 1000) pageSize = 1000;

        org.springframework.data.domain.Page<Object> pageResult = repo.findAll(PageRequest.of(page, pageSize, sortObj));

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("items", pageResult.getContent());
        resp.put("total", pageResult.getTotalElements());
        resp.put("page", pageResult.getNumber());
        resp.put("size", pageResult.getSize());
        resp.put("totalPages", pageResult.getTotalPages());
        return resp;
    }

    @GetMapping("/{resource}/{id}")
    public ResponseEntity<?> one(@PathVariable String resource, @PathVariable long id) {
        JpaRepository<Object, Long> repo = getRepository(resource);
        return repo.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{resource}")
    public ResponseEntity<?> create(@PathVariable String resource, @RequestBody Map<String, Object> body) {
        try {
            Map<String, Object> mutableBody = new HashMap<>(body);
            String plainPassword = null;
            if (mutableBody.containsKey("password") && mutableBody.get("password") != null && !mutableBody.get("password").toString().isBlank()) {
                plainPassword = mutableBody.get("password").toString().trim();
                String encoded = passwordEncoder.encode(plainPassword);
                mutableBody.put("password_hash", encoded);
                mutableBody.put("passwordHash", encoded);
            }
            mutableBody.remove("password"); // Remove raw password so Jackson doesn't fail on unknown property

            // Auto-defaults for products
            if ("products".equalsIgnoreCase(resource)) {
                if (!mutableBody.containsKey("sku") || mutableBody.get("sku") == null || mutableBody.get("sku").toString().trim().isEmpty()) {
                    Long maxId = jdbc.queryForObject("SELECT COALESCE(MAX(id), 0) FROM products", Long.class);
                    long nextId = (maxId != null ? maxId : 0) + 1;
                    mutableBody.put("sku", String.format("FC-%06d", nextId));
                }
                if (!mutableBody.containsKey("base_price") || mutableBody.get("base_price") == null) {
                    if (mutableBody.containsKey("price")) {
                        mutableBody.put("base_price", mutableBody.get("price"));
                    }
                }
                if (!mutableBody.containsKey("sales_count") || mutableBody.get("sales_count") == null) {
                    mutableBody.put("sales_count", 0);
                }
                if (!mutableBody.containsKey("view_count") || mutableBody.get("view_count") == null) {
                    mutableBody.put("view_count", 0);
                }
                if (!mutableBody.containsKey("rating") || mutableBody.get("rating") == null) {
                    mutableBody.put("rating", 5.0);
                }
            }

            ObjectMapper copyMapper = mapper.copy().configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
            Object entity = copyMapper.convertValue(mutableBody, getEntityClass(resource));
            JpaRepository<Object, Long> repo = getRepository(resource);
            Object saved = repo.save(entity);

            // Guarantee password_hash in database if password was supplied
            if (plainPassword != null && saved != null) {
                Long id = extractId(saved);
                if (id != null) {
                    try {
                        String encoded = passwordEncoder.encode(plainPassword);
                        jdbc.update("UPDATE " + resource.toLowerCase() + " SET password_hash = ? WHERE id = ?", encoded, id);
                    } catch (Exception ex) {
                        System.err.println("JDBC create password error: " + ex.getMessage());
                    }
                }
            }

            // Increment product sales_count when an order_item is created
            if ("order_items".equalsIgnoreCase(resource) && mutableBody.containsKey("product_id") && mutableBody.containsKey("quantity")) {
                try {
                    Long productId = Long.valueOf(mutableBody.get("product_id").toString());
                    int quantity = Integer.parseInt(mutableBody.get("quantity").toString());
                    jdbc.update("UPDATE products SET sales_count = sales_count + ? WHERE id = ?", quantity, productId);
                } catch (Exception ex) {
                    System.err.println("Failed to increment product sales count: " + ex.getMessage());
                }
            }

            triggerPushNotifications(resource, saved);

            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Database constraint failed: " + e.getMostSpecificCause().getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{resource}/{id}")
    public ResponseEntity<?> update(@PathVariable String resource, @PathVariable long id, @RequestBody Map<String, Object> body) {
        try {
            JpaRepository<Object, Long> repo = getRepository(resource);
            Optional<Object> existingOpt = repo.findById(id);
            if (existingOpt.isEmpty()) return ResponseEntity.notFound().build();
            Object existingEntity = existingOpt.get();
            
            Map<String, Object> mutableBody = new HashMap<>(body);
            String newPassword = null;
            if (mutableBody.containsKey("password") && mutableBody.get("password") != null && !mutableBody.get("password").toString().isBlank()) {
                newPassword = mutableBody.get("password").toString().trim();
            }
            mutableBody.remove("password"); // Remove raw password key
            
            // If new password is provided, encode it; otherwise do not overwrite existing password_hash
            if (newPassword != null) {
                String encoded = passwordEncoder.encode(newPassword);
                mutableBody.put("password_hash", encoded);
                mutableBody.put("passwordHash", encoded);
            } else {
                mutableBody.remove("password_hash");
                mutableBody.remove("passwordHash");
            }
            
            mutableBody.put("id", id);
            
            if ("products".equalsIgnoreCase(resource)) {
                if (!mutableBody.containsKey("base_price") || mutableBody.get("base_price") == null) {
                    if (mutableBody.containsKey("price")) {
                        mutableBody.put("base_price", mutableBody.get("price"));
                    }
                }
                if ((!mutableBody.containsKey("sku") || mutableBody.get("sku") == null || mutableBody.get("sku").toString().trim().isEmpty()) && id > 0) {
                    mutableBody.put("sku", String.format("FC-%06d", id));
                }
            }
            
            ObjectMapper copyMapper = mapper.copy().configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
            String jsonBody = copyMapper.writeValueAsString(mutableBody);
            Object updatedEntity = copyMapper.readerForUpdating(existingEntity).readValue(jsonBody);
            
            Object saved = repo.save(updatedEntity);

            // Direct JDBC password update in MySQL to guarantee 100% database persistence
            if (newPassword != null) {
                try {
                    String encoded = passwordEncoder.encode(newPassword);
                    jdbc.update("UPDATE " + resource.toLowerCase() + " SET password_hash = ? WHERE id = ?", encoded, id);
                } catch (Exception ex) {
                    System.err.println("JDBC update password error: " + ex.getMessage());
                }
            }
            
            triggerPushNotifications(resource, saved);

            return ResponseEntity.ok(saved);
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Database constraint failed: " + e.getMostSpecificCause().getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{resource}/{id}")
    public ResponseEntity<?> delete(@PathVariable String resource, @PathVariable long id) {
        JpaRepository<Object, Long> repo = getRepository(resource);
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        repo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "deleted", "id", id));
    }

    private void triggerPushNotifications(String resource, Object savedEntity) {
        CompletableFuture.runAsync(() -> {
            try {
                if ("order_messages".equalsIgnoreCase(resource) && savedEntity instanceof OrderMessage msg) {
                    Long orderId = msg.getOrderId();
                    String senderType = msg.getSenderType();
                    String senderName = msg.getSenderName() != null ? msg.getSenderName() : "Flame & Crust";
                    String text = msg.getMessage();
                    if (text != null && text.startsWith("[VOICE]:")) {
                        text = "🎤 បានផ្ញើសារសំឡេង (Voice message)";
                    } else if (text != null && text.startsWith("[IMG]:")) {
                        text = "📷 បានផ្ញើរូបភាព (Photo attachment)";
                    }

                    List<Map<String, Object>> orders = jdbc.queryForList("SELECT customer_id, driver_id FROM orders WHERE id = ?", orderId);
                    if (!orders.isEmpty()) {
                        Map<String, Object> ord = orders.get(0);
                        Long customerId = ord.get("customer_id") != null ? ((Number) ord.get("customer_id")).longValue() : null;
                        Long driverId = ord.get("driver_id") != null ? ((Number) ord.get("driver_id")).longValue() : null;

                        if ("DRIVER".equalsIgnoreCase(senderType) && customerId != null) {
                            webPushService.sendToUser(customerId, "CUSTOMER", "💬 " + senderName, text, "/order-tracking/" + orderId);
                        } else if ("CUSTOMER".equalsIgnoreCase(senderType) && driverId != null) {
                            webPushService.sendToUser(driverId, "DRIVER", "💬 " + senderName, text, "/driver/dashboard");
                        }
                    }
                } else if ("orders".equalsIgnoreCase(resource) && savedEntity instanceof Order ord) {
                    Long orderId = ord.getId();
                    Long customerId = ord.getCustomerId();
                    String status = ord.getStatus();
                    if (customerId != null && status != null) {
                        String statusText = switch (status.toUpperCase()) {
                            case "CONFIRMED" -> "ការកុម្ម៉ង់របស់អ្នកត្រូវបានទទួលយកហើយ!";
                            case "PREPARING" -> "ចុងភៅកំពុងរៀបចំធ្វើម្ហូបរបស់អ្នកយ៉ាងយកចិត្តទុកដាក់ 🍕";
                            case "READY" -> "ម្ហូបរបស់អ្នករួចរាល់ហើយ កំពុងរង់ចាំអ្នកដឹកជញ្ជូន 🛵";
                            case "OUT_FOR_DELIVERY" -> "អ្នកដឹកកំពុងធ្វើដំណើរយកម្ហូបជូនអ្នកហើយ 🚀";
                            case "DELIVERED" -> "ការកុម្ម៉ង់ត្រូវបានដឹកជញ្ជូនជោគជ័យ! សូមពិសារដោយឆ្ងាញ់មាត់ 😋";
                            case "CANCELLED" -> "ការកុម្ម៉ង់របស់អ្នកត្រូវបានបោះបង់";
                            default -> "ស្ថានភាពការកុម្ម៉ង់៖ " + status;
                        };
                        webPushService.sendToUser(customerId, "CUSTOMER", "🍕 បច្ចុប្បន្នភាពការកុម្ម៉ង់ #" + orderId, statusText, "/order-tracking/" + orderId);
                    }
                }
            } catch (Exception ex) {
                System.err.println("Error triggering push notification: " + ex.getMessage());
            }
        });
    }
}
