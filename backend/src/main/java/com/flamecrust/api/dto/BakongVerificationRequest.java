package com.flamecrust.api.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

public class BakongVerificationRequest {
    @JsonProperty("order_id")
    @JsonAlias({"orderId", "order_id"})
    private String orderId;

    @JsonProperty("qr_code_string")
    @JsonAlias({"qrCodeString", "qr_code_string"})
    private String qrCodeString;

    @JsonProperty("md5")
    @JsonAlias({"md5", "md5Hash", "md5_hash"})
    private String md5;

    @JsonProperty("confirm_fallback")
    @JsonAlias({"confirmFallback", "confirm_fallback", "force_confirm", "forceConfirm"})
    private Boolean confirmFallback;

    @JsonProperty("qr_created_at")
    @JsonAlias({"qrCreatedAt", "qr_created_at", "qr_created_at_ms"})
    private Long qrCreatedAt;

    public String getOrderId() {
        return orderId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public String getQrCodeString() {
        return qrCodeString;
    }

    public void setQrCodeString(String qrCodeString) {
        this.qrCodeString = qrCodeString;
    }

    public String getMd5() {
        return md5;
    }

    public void setMd5(String md5) {
        this.md5 = md5;
    }

    public Boolean getConfirmFallback() {
        return confirmFallback;
    }

    public void setConfirmFallback(Boolean confirmFallback) {
        this.confirmFallback = confirmFallback;
    }

    public Long getQrCreatedAt() {
        return qrCreatedAt;
    }

    public void setQrCreatedAt(Long qrCreatedAt) {
        this.qrCreatedAt = qrCreatedAt;
    }
}
