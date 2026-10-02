package com.flamecrust.api.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@Entity
@jakarta.persistence.Table(name = "customers")
public class Customer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "name")
    private String name;

    @Column(name = "email")
    private String email;

    @Column(name = "phone")
    private String phone;

    @Column(name = "created_at")
    @org.hibernate.annotations.CreationTimestamp
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    @org.hibernate.annotations.UpdateTimestamp
    private LocalDateTime updatedAt;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "status")
    private String status;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "avatar")
    private String avatar;

    @Column(name = "cover_photo")
    private String coverPhoto;

    @Column(name = "device_token")
    private String deviceToken;

    @Column(name = "reward_points")
    private Integer rewardPoints;

}
