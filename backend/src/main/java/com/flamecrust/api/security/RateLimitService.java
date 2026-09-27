package com.flamecrust.api.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimitService {

    // IP-based buckets
    private final Map<String, Bucket> otpIpBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> verifyOtpIpBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> registerIpBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> loginIpBuckets = new ConcurrentHashMap<>();

    // Target/Email-based buckets
    private final Map<String, Bucket> otpEmailBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> verifyOtpEmailBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> loginTargetBuckets = new ConcurrentHashMap<>();

    // Timestamp tracking for minimum cooldown between OTP requests (email -> epoch millis)
    private final Map<String, Long> lastOtpRequestTime = new ConcurrentHashMap<>();

    private static final long OTP_COOLDOWN_MILLIS = 60_000; // 60 seconds

    /**
     * Checks if sending OTP is allowed for the given IP and email.
     */
    public RateLimitResult checkSendOtpLimit(String ip, String email) {
        String cleanIp = (ip != null && !ip.isBlank()) ? ip.trim() : "unknown";
        String cleanEmail = (email != null && !email.isBlank()) ? email.trim().toLowerCase() : "unknown";

        // 1. Cooldown check per email
        Long lastTime = lastOtpRequestTime.get(cleanEmail);
        long now = System.currentTimeMillis();
        if (lastTime != null && (now - lastTime) < OTP_COOLDOWN_MILLIS) {
            long remainingSec = (OTP_COOLDOWN_MILLIS - (now - lastTime)) / 1000 + 1;
            return new RateLimitResult(false, "Please wait " + remainingSec + " seconds before requesting a new OTP code.");
        }

        // 2. IP Rate Limit: 5 OTPs / min and 15 OTPs / hour
        Bucket ipBucket = otpIpBuckets.computeIfAbsent(cleanIp, k -> Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(5).refillIntervally(5, Duration.ofMinutes(1)).build())
                .addLimit(Bandwidth.builder().capacity(15).refillIntervally(15, Duration.ofHours(1)).build())
                .build());

        if (!ipBucket.tryConsume(1)) {
            return new RateLimitResult(false, "Too many verification code requests from your network. Please wait a few minutes.");
        }

        // 3. Email Rate Limit: 3 OTPs / 10 min
        Bucket emailBucket = otpEmailBuckets.computeIfAbsent(cleanEmail, k -> Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(3).refillIntervally(3, Duration.ofMinutes(10)).build())
                .build());

        if (!emailBucket.tryConsume(1)) {
            return new RateLimitResult(false, "Too many verification code requests for this email. Please try again in 10 minutes.");
        }

        // Record timestamp
        lastOtpRequestTime.put(cleanEmail, now);
        return new RateLimitResult(true, null);
    }

    /**
     * Checks if verifying OTP is allowed for the given IP and email.
     */
    public RateLimitResult checkVerifyOtpLimit(String ip, String email) {
        String cleanIp = (ip != null && !ip.isBlank()) ? ip.trim() : "unknown";
        String cleanEmail = (email != null && !email.isBlank()) ? email.trim().toLowerCase() : "unknown";

        Bucket ipBucket = verifyOtpIpBuckets.computeIfAbsent(cleanIp, k -> Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(15).refillIntervally(15, Duration.ofMinutes(1)).build())
                .build());

        if (!ipBucket.tryConsume(1)) {
            return new RateLimitResult(false, "Too many verification attempts from your network. Please wait.");
        }

        Bucket emailBucket = verifyOtpEmailBuckets.computeIfAbsent(cleanEmail, k -> Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(5).refillIntervally(5, Duration.ofMinutes(10)).build())
                .build());

        if (!emailBucket.tryConsume(1)) {
            return new RateLimitResult(false, "Too many verification attempts for this account. Please wait 10 minutes.");
        }

        return new RateLimitResult(true, null);
    }

    /**
     * Checks if registration is allowed for the given IP.
     */
    public RateLimitResult checkRegisterLimit(String ip) {
        String cleanIp = (ip != null && !ip.isBlank()) ? ip.trim() : "unknown";

        Bucket ipBucket = registerIpBuckets.computeIfAbsent(cleanIp, k -> Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(5).refillIntervally(5, Duration.ofMinutes(1)).build())
                .addLimit(Bandwidth.builder().capacity(20).refillIntervally(20, Duration.ofHours(1)).build())
                .build());

        if (!ipBucket.tryConsume(1)) {
            return new RateLimitResult(false, "Too many registration attempts from this network. Please try again later.");
        }

        return new RateLimitResult(true, null);
    }

    /**
     * Checks if login attempt is allowed for the given IP and target identifier.
     */
    public RateLimitResult checkLoginLimit(String ip, String target) {
        String cleanIp = (ip != null && !ip.isBlank()) ? ip.trim() : "unknown";
        String cleanTarget = (target != null && !target.isBlank()) ? target.trim().toLowerCase() : "unknown";

        Bucket ipBucket = loginIpBuckets.computeIfAbsent(cleanIp, k -> Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(30).refillIntervally(30, Duration.ofMinutes(1)).build())
                .build());

        if (!ipBucket.tryConsume(1)) {
            return new RateLimitResult(false, "Too many login attempts from this network. Please wait.");
        }

        Bucket targetBucket = loginTargetBuckets.computeIfAbsent(cleanTarget, k -> Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(10).refillIntervally(10, Duration.ofMinutes(15)).build())
                .build());

        if (!targetBucket.tryConsume(1)) {
            return new RateLimitResult(false, "Too many login attempts for this account. Please wait.");
        }

        return new RateLimitResult(true, null);
    }

    public record RateLimitResult(boolean allowed, String errorMessage) {}
}
