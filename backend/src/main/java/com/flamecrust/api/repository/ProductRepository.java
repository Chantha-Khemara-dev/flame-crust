package com.flamecrust.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import com.flamecrust.api.model.Product;

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByActiveTrueOrderByIdAsc();
    List<Product> findByCategoryIgnoreCase(String category);

    @org.springframework.data.jpa.repository.Query(value = "SELECT p.* FROM products p WHERE p.active = 1 AND LOWER(p.category) NOT IN ('drink', 'drinks') ORDER BY CASE WHEN p.popular = 1 THEN 0 ELSE 1 END, p.sales_count DESC, p.rating DESC, p.view_count DESC LIMIT 4", nativeQuery = true)
    List<Product> findTopTrendingDishes();
}
