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

    public ProductController(ProductRepository products, CategoryRepository categories) {
        this.products = products;
        this.categories = categories;
    }

    @GetMapping
    public ResponseEntity<List<Product>> all() {
        return ResponseEntity.ok()
                .cacheControl(org.springframework.http.CacheControl.maxAge(java.time.Duration.ofSeconds(60)).cachePublic())
                .body(products.findByActiveTrueOrderByIdAsc());
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
}
