package com.flamecrust.api.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@Entity
@jakarta.persistence.Table(name = "coupons")
public class Coupon {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "code")
    private String code;

    @Column(name = "discount_type")
    private String discountType;

    @Column(name = "discount_value")
    private BigDecimal discountValue;

    @Column(name = "min_order_amount")
    private BigDecimal minOrderAmount;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "active")
    private Boolean active;

    @Column(name = "usage_limit")
    private Integer usageLimit;

    @Column(name = "used_count")
    private Integer usedCount;

    @PrePersist
    public void prePersist() {
        if (minOrderAmount == null) {
            minOrderAmount = BigDecimal.ZERO;
        }
        if (usedCount == null) {
            usedCount = 0;
        }
        if (active == null) {
            active = true;
        }
    }
}
