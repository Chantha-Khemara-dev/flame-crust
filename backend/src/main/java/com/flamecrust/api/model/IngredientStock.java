package com.flamecrust.api.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@Entity
@jakarta.persistence.Table(name = "ingredient_stock")
public class IngredientStock {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "ingredient_id")
    private Long ingredientId;

    @Column(name = "stock_quantity")
    private BigDecimal stockQuantity;

    @Column(name = "low_stock_threshold")
    private BigDecimal lowStockThreshold;

    @Column(name = "updated_at")
    @org.hibernate.annotations.UpdateTimestamp
    private LocalDateTime updatedAt;

}
