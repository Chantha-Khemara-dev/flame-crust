package com.flamecrust.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import com.flamecrust.api.model.Product;

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByActiveTrueOrderByIdAsc();
    List<Product> findByCategoryIgnoreCase(String category);

    @org.springframework.data.jpa.repository.Query(value = "SELECT p.* FROM products p WHERE p.active = 1 ORDER BY p.sales_count DESC, p.rating DESC, p.view_count DESC LIMIT 5", nativeQuery = true)
    List<Product> findTopTrendingDishes();
}
