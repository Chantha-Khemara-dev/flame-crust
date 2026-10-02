package com.flamecrust.api.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@jakarta.persistence.Table(name = "tables")
public class Table {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "table_no")
    private String tableNo;

    @Column(name = "capacity")
    private Integer capacity;

    @Column(name = "status")
    private String status;

}
