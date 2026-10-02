package com.flamecrust.api.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@jakarta.persistence.Table(name = "roles")
public class Role {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "name")
    private String name;

    @Column(name = "permissions")
    private String permissions;

}
