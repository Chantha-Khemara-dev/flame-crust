package com.flamecrust.api.controller;

import com.flamecrust.api.model.PushSubscription;
import com.flamecrust.api.repository.PushSubscriptionRepository;
import com.flamecrust.api.service.WebPushService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class PushNotificationController {

    private final WebPushService webPushService;
    private final PushSubscriptionRepository subscriptionRepository;

    @Data
    public static class SubscribeRequest {
        private String endpoint;
        private Keys keys;
        private Long userId;
        private String userType;
        private String userAgent;

        @Data
        public static class Keys {
            private String p256dh;
            private String auth;
        }
    }

    @Data
    public static class UnsubscribeRequest {
        private String endpoint;
    }

    @Data
    public static class TestPushRequest {
        private String title;
        private String body;
        private String url;
        private String endpoint;
        private Long userId;
        private String userType;
    }

    @GetMapping("/vapid-public-key")
    public ResponseEntity<?> getVapidPublicKey() {
        return ResponseEntity.ok(Map.of(
                "public_key", webPushService.getVapidPublicKey()
        ));
    }

    @PostMapping("/subscribe")
    @Transactional
    public ResponseEntity<?> subscribe(@RequestBody SubscribeRequest req) {
        if (req.getEndpoint() == null || req.getKeys() == null ||
                req.getKeys().getP256dh() == null || req.getKeys().getAuth() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing required subscription fields"));
        }

        String userType = req.getUserType() != null && !req.getUserType().isBlank() ? req.getUserType() : "CUSTOMER";

        Optional<PushSubscription> existing = subscriptionRepository.findByEndpoint(req.getEndpoint());
        PushSubscription sub;
        if (existing.isPresent()) {
            sub = existing.get();
            sub.setUserId(req.getUserId());
            sub.setUserType(userType);
            sub.setP256dh(req.getKeys().getP256dh());
            sub.setAuth(req.getKeys().getAuth());
            if (req.getUserAgent() != null) sub.setUserAgent(req.getUserAgent());
        } else {
            sub = PushSubscription.builder()
                    .endpoint(req.getEndpoint())
                    .p256dh(req.getKeys().getP256dh())
                    .auth(req.getKeys().getAuth())
                    .userId(req.getUserId())
                    .userType(userType)
                    .userAgent(req.getUserAgent())
                    .build();
        }

        subscriptionRepository.save(sub);
        log.info("Push subscription registered successfully for userType={}, userId={}", userType, req.getUserId());

        return ResponseEntity.ok(Map.of(
                "message", "Subscription registered successfully",
                "id", sub.getId()
        ));
    }

    @PostMapping("/unsubscribe")
    @Transactional
    public ResponseEntity<?> unsubscribe(@RequestBody UnsubscribeRequest req) {
        if (req.getEndpoint() != null) {
            subscriptionRepository.deleteByEndpoint(req.getEndpoint());
            log.info("Push subscription removed for endpoint: {}", req.getEndpoint());
        }
        return ResponseEntity.ok(Map.of("message", "Unsubscribed successfully"));
    }

    @PostMapping("/test")
    public ResponseEntity<?> testNotification(@RequestBody(required = false) TestPushRequest req) {
        String title = (req != null && req.getTitle() != null) ? req.getTitle() : "🔥 Flame & Crust";
        String body = (req != null && req.getBody() != null) ? req.getBody() : "សួស្តី! ការជូនដំណឹង (Push Notification) ដំណើរការបានជោគជ័យហើយ 🎉";
        String url = (req != null && req.getUrl() != null) ? req.getUrl() : "/";

        int sentCount = 0;

        if (req != null && req.getEndpoint() != null) {
            Optional<PushSubscription> subOpt = subscriptionRepository.findByEndpoint(req.getEndpoint());
            if (subOpt.isPresent()) {
                boolean ok = webPushService.sendNotification(subOpt.get(), title, body, url, null);
                if (ok) sentCount++;
            }
        } else if (req != null && req.getUserId() != null) {
            String userType = req.getUserType() != null ? req.getUserType() : "CUSTOMER";
            List<PushSubscription> subs = subscriptionRepository.findByUserIdAndUserType(req.getUserId(), userType);
            for (PushSubscription sub : subs) {
                if (webPushService.sendNotification(sub, title, body, url, null)) {
                    sentCount++;
                }
            }
        } else {
            List<PushSubscription> subs = subscriptionRepository.findAll();
            for (PushSubscription sub : subs) {
                if (webPushService.sendNotification(sub, title, body, url, null)) {
                    sentCount++;
                }
            }
        }

        return ResponseEntity.ok(Map.of(
                "message", "Test push sent",
                "sent_count", sentCount,
                "title", title,
                "body", body
        ));
    }
}
