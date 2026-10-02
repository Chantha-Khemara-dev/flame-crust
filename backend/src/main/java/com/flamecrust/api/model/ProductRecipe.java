package com.flamecrust.api.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.Data;

@Data
@Entity
@jakarta.persistence.Table(name = "product_recipes")
public class ProductRecipe {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "variant_id")
    private Long variantId;

    @Column(name = "ingredient_id")
    private Long ingredientId;

    @Column(name = "quantity_needed")
    private BigDecimal quantityNeeded;

}
