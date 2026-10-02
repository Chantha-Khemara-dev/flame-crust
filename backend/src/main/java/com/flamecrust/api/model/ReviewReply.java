package com.flamecrust.api.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@Entity
@jakarta.persistence.Table(name = "review_replies")
public class ReviewReply {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "review_id")
    private Long reviewId;

    @Column(name = "author_name")
    private String authorName;

    @Column(name = "author_avatar")
    private String authorAvatar;

    @Column(name = "is_staff")
    private Boolean isStaff;

    @Column(name = "comment")
    private String comment;

    @Column(name = "created_at")
    @org.hibernate.annotations.CreationTimestamp
    private LocalDateTime createdAt;
}
