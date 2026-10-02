package com.flamecrust.api.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@Entity
@jakarta.persistence.Table(name = "otps")
public class Otp {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "target")
    private String target;

    @Column(name = "otp_code")
    private String otpCode;

    @Column(name = "is_used")
    private Boolean isUsed;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "purpose")
    private String purpose;

}
