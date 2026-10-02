package com.flamecrust.api.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@Entity
@jakarta.persistence.Table(name = "cash_register_sessions")
public class CashRegisterSession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "opened_by")
    private Long openedBy;

    @Column(name = "closed_by")
    private Long closedBy;

    @Column(name = "opening_amount")
    private BigDecimal openingAmount;

    @Column(name = "closing_amount")
    private BigDecimal closingAmount;

    @Column(name = "opened_at")
    private LocalDateTime openedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

}
