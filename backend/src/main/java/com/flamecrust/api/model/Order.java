package com.flamecrust.api.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@Entity
@jakarta.persistence.Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "order_number")
    private String orderNumber;

    @Column(name = "customer_id")
    private Long customerId;

    @Column(name = "address_id")
    private Long addressId;

    @Column(name = "status")
    private String status;

    @Column(name = "subtotal")
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(name = "delivery_fee")
    private BigDecimal deliveryFee = BigDecimal.ZERO;

    @Column(name = "total")
    private BigDecimal total = BigDecimal.ZERO;

    @Column(name = "notes")
    private String notes;

    @Column(name = "created_at")
    @org.hibernate.annotations.CreationTimestamp
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    @org.hibernate.annotations.UpdateTimestamp
    private LocalDateTime updatedAt;

    @Column(name = "coupon_id")
    private Long couponId;

    @Column(name = "driver_id")
    private Long driverId;

    @Column(name = "discount_amount")
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "order_type")
    private String orderType;

    @Column(name = "staff_id")
    private Long staffId;

    @Column(name = "table_id")
    private Long tableId;

    @Column(name = "driver_commission")
    private BigDecimal driverCommission;

}
