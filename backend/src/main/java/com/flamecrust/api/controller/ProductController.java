package com.flamecrust.api.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import com.flamecrust.api.model.Product;
import com.flamecrust.api.model.Category;
import com.flamecrust.api.repository.ProductRepository;
import com.flamecrust.api.repository.CategoryRepository;

@RestController
@RequestMapping("/api/products")
public class ProductController {
    private final ProductRepository products;
    private final CategoryRepository categories;
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;

    public ProductController(ProductRepository products, CategoryRepository categories, org.springframework.jdbc.core.JdbcTemplate jdbc) {
        this.products = products;
        this.categories = categories;
        this.jdbc = jdbc;
    }

    @GetMapping
    public ResponseEntity<List<Product>> all() {
        return ResponseEntity.ok()
                .cacheControl(org.springframework.http.CacheControl.noCache().mustRevalidate())
                .body(products.findByActiveTrueOrderByIdAsc());
    }

    @GetMapping("/trending")
    public ResponseEntity<List<Product>> trending() {
        return ResponseEntity.ok()
                .cacheControl(org.springframework.http.CacheControl.noCache().mustRevalidate())
                .body(products.findTopTrendingDishes());
    }

    @GetMapping("/categories")
    public ResponseEntity<List<Category>> getCategories() {
        return ResponseEntity.ok()
                .cacheControl(org.springframework.http.CacheControl.maxAge(java.time.Duration.ofSeconds(120)).cachePublic())
                .body(categories.findByActiveTrueOrderBySortOrderAsc());
    }

    @GetMapping("/{idOrCategory}")
    public ResponseEntity<?> byIdOrCategory(@PathVariable String idOrCategory) {
        try {
            long id = Long.parseLong(idOrCategory);
            return products.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
        } catch (NumberFormatException e) {
            return ResponseEntity.ok(products.findByCategoryIgnoreCase(idOrCategory).stream()
                    .filter(Product::isActive)
                    .toList());
        }
    }

    @org.springframework.web.bind.annotation.PostMapping("/{id}/view")
    public ResponseEntity<?> recordView(@PathVariable Long id) {
        return products.findById(id).map(product -> {
            product.setViewCount(product.getViewCount() + 1);
            products.save(product);
            return ResponseEntity.ok(java.util.Map.of("success", true, "viewCount", product.getViewCount()));
        }).orElse(ResponseEntity.notFound().build());
    }

    private record ReviewsCacheEntry(java.util.Map<String, Object> data, long expiresAt) {}
    private final java.util.concurrent.ConcurrentHashMap<Long, ReviewsCacheEntry> reviewsCache = new java.util.concurrent.ConcurrentHashMap<>();

    @GetMapping("/{id}/reviews-sync")
    public ResponseEntity<?> syncReviews(@PathVariable Long id) {
        long now = System.currentTimeMillis();
        ReviewsCacheEntry cached = reviewsCache.get(id);
        if (cached != null && now < cached.expiresAt()) {
            return ResponseEntity.ok()
                .cacheControl(org.springframework.http.CacheControl.noCache().mustRevalidate())
                .body(cached.data());
        }

        java.util.List<java.util.Map<String, Object>> reviews = jdbc.queryForList("SELECT * FROM reviews WHERE product_id = ? ORDER BY id ASC", id);
        java.util.List<java.util.Map<String, Object>> replies = new java.util.ArrayList<>();
        java.util.List<java.util.Map<String, Object>> reactions = new java.util.ArrayList<>();

        if (!reviews.isEmpty()) {
            java.util.List<Long> reviewIds = reviews.stream()
                .map(r -> ((Number) r.get("id")).longValue())
                .toList();
            
            String inSql = String.join(",", java.util.Collections.nCopies(reviewIds.size(), "?"));
            replies = jdbc.queryForList("SELECT * FROM review_replies WHERE review_id IN (" + inSql + ") ORDER BY id ASC", reviewIds.toArray());
            
            reactions = jdbc.queryForList("SELECT * FROM review_reactions WHERE review_id IN (" + inSql + ")", reviewIds.toArray());
            
            if (!replies.isEmpty()) {
                java.util.List<String> replyIds = replies.stream()
                    .map(r -> r.get("id").toString())
                    .toList();
                String repInSql = String.join(",", java.util.Collections.nCopies(replyIds.size(), "?"));
                java.util.List<java.util.Map<String, Object>> replyReactions = jdbc.queryForList("SELECT * FROM review_reactions WHERE reply_id IN (" + repInSql + ")", replyIds.toArray());
                reactions.addAll(replyReactions);
            }
        }

        // Convert snake_case to camelCase mapping for frontend compatibility
        java.util.Map<String, Object> response = java.util.Map.of(
            "reviews", convertToCamelCase(reviews),
            "replies", convertToCamelCase(replies),
            "reactions", convertToCamelCase(reactions)
        );

        reviewsCache.put(id, new ReviewsCacheEntry(response, now + 3000));

        return ResponseEntity.ok()
            .cacheControl(org.springframework.http.CacheControl.noCache().mustRevalidate())
            .body(response);
    }

    private java.util.List<java.util.Map<String, Object>> convertToCamelCase(java.util.List<java.util.Map<String, Object>> list) {
        return list.stream().map(row -> {
            java.util.Map<String, Object> camelRow = new java.util.HashMap<>();
            row.forEach((k, v) -> {
                String[] parts = k.split("_");
                StringBuilder camelKey = new StringBuilder(parts[0]);
                for (int i = 1; i < parts.length; i++) {
                    camelKey.append(parts[i].substring(0, 1).toUpperCase()).append(parts[i].substring(1));
                }
                camelRow.put(camelKey.toString(), v);
            });
            return camelRow;
        }).toList();
    }
}
