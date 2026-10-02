package com.flamecrust.api.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@Entity
@jakarta.persistence.Table(name = "coupon_usages")
public class CouponUsage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "coupon_id")
    private Long couponId;

    @Column(name = "customer_id")
    private Long customerId;

    @Column(name = "order_id")
    private Long orderId;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

}
