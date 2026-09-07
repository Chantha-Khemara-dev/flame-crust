package com.flamecrust.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flamecrust.api.model.PushSubscription;
import com.flamecrust.api.repository.PushSubscriptionRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import nl.martijndwars.webpush.Subscription;
import org.apache.http.HttpResponse;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.Security;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebPushService {

    private final PushSubscriptionRepository subscriptionRepository;
    private final ObjectMapper objectMapper;

    @Value("${vapid.public-key}")
    private String vapidPublicKey;

    @Value("${vapid.private-key}")
    private String vapidPrivateKey;

    @Value("${vapid.subject}")
    private String vapidSubject;

    private PushService pushService;

    @PostConstruct
    public void init() {
        try {
            if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
                Security.addProvider(new BouncyCastleProvider());
            }
            this.pushService = new PushService(vapidPublicKey, vapidPrivateKey, vapidSubject);
            log.info("WebPushService initialized successfully with subject: {}", vapidSubject);
        } catch (Exception e) {
            log.error("Failed to initialize WebPushService: {}", e.getMessage(), e);
        }
    }

    public String getVapidPublicKey() {
        return vapidPublicKey;
    }

    public boolean sendNotification(PushSubscription sub, String title, String body, String url, Map<String, Object> extraData) {
        if (pushService == null) {
            log.warn("WebPushService not initialized, cannot send notification");
            return false;
        }

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("title", title);
            payload.put("body", body);
            
            String icon = (extraData != null && extraData.get("icon") != null) ? extraData.get("icon").toString() : "/logo-192.png";
            payload.put("icon", icon);
            payload.put("badge", "/logo-192.png");
            if (extraData != null && extraData.get("image") != null) {
                payload.put("image", extraData.get("image").toString());
            }
            
            Map<String, Object> data = new HashMap<>();
            data.put("url", url != null ? url : "/");
            if (extraData != null) {
                data.putAll(extraData);
            }
            payload.put("data", data);

            String jsonPayload = objectMapper.writeValueAsString(payload);

            Subscription subscription = new Subscription(
                    sub.getEndpoint(),
                    new Subscription.Keys(sub.getP256dh(), sub.getAuth())
            );

            Notification notification = new Notification(subscription, jsonPayload);
            HttpResponse response = pushService.send(notification);
            int statusCode = response.getStatusLine().getStatusCode();

            log.info("Push notification sent to endpoint: {}, HTTP Status: {}", sub.getEndpoint(), statusCode);

            // 404 Not Found or 410 Gone means the subscription is no longer valid
            if (statusCode == 404 || statusCode == 410) {
                log.info("Subscription expired or invalid (status {}). Deleting subscription ID {}", statusCode, sub.getId());
                subscriptionRepository.deleteById(sub.getId());
            }

            return statusCode >= 200 && statusCode < 300;
        } catch (Exception e) {
            log.error("Error sending push notification to subscription {}: {}", sub.getId(), e.getMessage());
            return false;
        }
    }

    public void sendToUserWithExtra(Long userId, String userType, String title, String body, String url, Map<String, Object> extraData) {
        List<PushSubscription> subs = subscriptionRepository.findByUserIdAndUserType(userId, userType);
        if (subs.isEmpty()) {
            log.info("No push subscriptions found for user {} with type {}", userId, userType);
            return;
        }

        for (PushSubscription sub : subs) {
            sendNotification(sub, title, body, url, extraData);
        }
    }

    public void sendToUser(Long userId, String userType, String title, String body, String url) {
        sendToUserWithExtra(userId, userType, title, body, url, null);
    }

    public void sendToUserType(String userType, String title, String body, String url) {
        List<PushSubscription> subs = subscriptionRepository.findByUserType(userType);
        for (PushSubscription sub : subs) {
            sendNotification(sub, title, body, url, null);
        }
    }

    public void broadcast(String title, String body, String url) {
        List<PushSubscription> subs = subscriptionRepository.findAll();
        log.info("Broadcasting push notification to {} subscribers", subs.size());
        for (PushSubscription sub : subs) {
            sendNotification(sub, title, body, url, null);
        }
    }
}
