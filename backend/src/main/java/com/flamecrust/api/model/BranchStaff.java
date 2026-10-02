package com.flamecrust.api.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@jakarta.persistence.Table(name = "branch_staff")
public class BranchStaff {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "user_id")
    private Long userId;

}
