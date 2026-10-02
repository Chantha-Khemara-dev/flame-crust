package com.flamecrust.api.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@Entity
@jakarta.persistence.Table(name = "kitchen_staff")
public class KitchenStaff {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "name")
    private String name;

    @Column(name = "phone")
    private String phone;

    @Column(name = "email")
    private String email;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "role_title")
    private String roleTitle;

    @Column(name = "status")
    private String status;

    @Column(name = "created_at")
    @org.hibernate.annotations.CreationTimestamp
    private LocalDateTime createdAt;

    @Column(name = "device_token")
    private String deviceToken;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "profile_photo")
    private String profilePhoto;

    @Column(name = "avatar")
    private String avatar;
}
