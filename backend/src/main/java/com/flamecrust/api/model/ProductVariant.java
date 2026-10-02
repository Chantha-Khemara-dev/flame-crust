package com.flamecrust.api.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.Data;

@Data
@Entity
@jakarta.persistence.Table(name = "product_variants")
public class ProductVariant {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "option_id")
    private Long optionId;

    @Column(name = "name")
    private String name;

    @Column(name = "price_adjustment")
    private BigDecimal priceAdjustment;

    @Column(name = "active")
    private Boolean active;

}
