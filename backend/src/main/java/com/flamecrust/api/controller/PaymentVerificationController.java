package com.flamecrust.api.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.util.DigestUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import com.flamecrust.api.dto.BakongVerificationRequest;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentVerificationController {

    private final JdbcTemplate jdbcTemplate;
    private final RestTemplate restTemplate;

    @Value("${bakong.api.url:https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5}")
    private String bakongApiUrl;

    @Value("${bakong.api.token:}")
    private String bakongApiToken;

    public PaymentVerificationController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
        this.restTemplate = new RestTemplate();
    }

    @PostMapping("/verify-khqr")
    public ResponseEntity<Map<String, Object>> verifyKhqr(@RequestBody BakongVerificationRequest request) {
        Map<String, Object> response = new HashMap<>();

        boolean hasQr = request.getQrCodeString() != null && !request.getQrCodeString().trim().isEmpty();
        boolean hasMd5 = request.getMd5() != null && !request.getMd5().trim().isEmpty();

        if (!hasQr && !hasMd5) {
            response.put("status", "ERROR");
            response.put("message", "Missing qr_code_string or md5");
            return ResponseEntity.badRequest().body(response);
        }

        try {
            // 0. Enforce 5-minute QR validity: payments made after 5 minutes are rejected.
            //    A small grace (10s) lets the decisive close check at exactly 300s land
            //    before the QR is invalidated. After close, no further checks are issued,
            //    so payments scanned past the closed QR are never accepted.
            if (request.getQrCreatedAt() != null) {
                long qrAgeMs = System.currentTimeMillis() - request.getQrCreatedAt();
                if (qrAgeMs > 310_000L) {
                    System.out.println("Rejected KHQR verification: QR older than 5 minutes (" + qrAgeMs + " ms)");
                    response.put("status", "EXPIRED");
                    response.put("message", "QR session expired (5 minutes). Payment not accepted. Please generate a new QR.");
                    return ResponseEntity.ok(response);
                }
            }

            // 1. Generate MD5 of the QR Code string or use provided MD5
            String md5Hash = hasMd5 ? request.getMd5().trim() : DigestUtils.md5DigestAsHex(request.getQrCodeString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
            System.out.println("Verifying Bakong Transaction with MD5: " + md5Hash);

            // 2. Call Official Bakong Open API
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (bakongApiToken != null && !bakongApiToken.isEmpty()) {
                headers.setBearerAuth(bakongApiToken);
            }

            Map<String, String> body = new HashMap<>();
            body.put("md5", md5Hash);

            HttpEntity<Map<String, String>> entity = new HttpEntity<>(body, headers);
            
            ResponseEntity<Map> bakongResponse = restTemplate.exchange(
                    bakongApiUrl,
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            Map<String, Object> responseBody = bakongResponse.getBody();
            if (responseBody != null) {
                Object responseCodeObj = responseBody.get("responseCode");
                Object errorCodeObj = responseBody.get("errorCode");
                int responseCode = responseCodeObj instanceof Number ? ((Number) responseCodeObj).intValue() : (responseCodeObj != null ? Integer.parseInt(responseCodeObj.toString()) : -1);
                int errorCode = errorCodeObj instanceof Number ? ((Number) errorCodeObj).intValue() : (errorCodeObj != null ? Integer.parseInt(errorCodeObj.toString()) : 0);

                // Check for Bakong 100 requests/day limit
                if (errorCode == 17 || (responseBody.get("responseMessage") != null && responseBody.get("responseMessage").toString().contains("Daily request limit"))) {
                    response.put("status", "LIMIT_EXCEEDED");
                    response.put("errorCode", 17);
                    response.put("message", "Bakong daily limit of 100 requests exceeded.");
                    return ResponseEntity.ok(response);
                }

                // Official Bakong Success (Response Code 0 = Transaction Settled and Paid)
                if (responseCode == 0) {
                    // Update database transaction status strictly on verified payment
                    if (request.getOrderId() != null && !request.getOrderId().trim().isEmpty()) {
                        try {
                            Long orderId = Long.parseLong(request.getOrderId());
                            jdbcTemplate.update("UPDATE payments SET status = 'PAID', paid_at = CURRENT_TIMESTAMP WHERE order_id = ?", orderId);
                            jdbcTemplate.update("UPDATE orders SET status = 'CONFIRMED' WHERE id = ?", orderId);
                            jdbcTemplate.update("INSERT INTO order_status_history (order_id, status, notes) VALUES (?, 'CONFIRMED', 'Payment verified via Bakong KHQR Open API')", orderId);
                        } catch (Exception ex) {
                            // Non-numeric or not yet inserted
                        }
                    }
                    
                    response.put("status", "SUCCESS");
                    response.put("data", responseBody.get("data"));
                    response.put("message", "Payment verified successfully via Bakong network");
                    return ResponseEntity.ok(response);
                } else {
                    response.put("status", "PENDING");
                    response.put("message", responseBody.get("responseMessage") != null ? responseBody.get("responseMessage").toString() : "Awaiting payment transaction");
                    return ResponseEntity.ok(response);
                }
            } else {
                response.put("status", "PENDING");
                response.put("message", "Awaiting response from Bakong gateway");
                return ResponseEntity.ok(response);
            }

        } catch (Exception e) {
            response.put("status", "ERROR");
            response.put("message", "Gateway error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/switch-to-cash")
    public ResponseEntity<Map<String, Object>> switchToCash(@RequestBody Map<String, Object> body) {
        Map<String, Object> response = new HashMap<>();
        try {
            Object orderIdObj = body.get("orderId");
            if (orderIdObj == null || orderIdObj.toString().trim().isEmpty()) {
                response.put("status", "ERROR");
                response.put("message", "Missing orderId");
                return ResponseEntity.badRequest().body(response);
            }
            Long orderId = Long.parseLong(orderIdObj.toString());

            // 1. Update existing payment record to CASH, or insert if not created yet
            int updated = jdbcTemplate.update("UPDATE payments SET method = 'CASH', status = 'PENDING' WHERE order_id = ?", orderId);
            if (updated == 0) {
                Double total = jdbcTemplate.queryForObject("SELECT total FROM orders WHERE id = ?", Double.class, orderId);
                double amt = total != null ? total : 0.0;
                jdbcTemplate.update("INSERT INTO payments (order_id, method, status, amount) VALUES (?, 'CASH', 'PENDING', ?)", orderId, amt);
            }

            // 2. Keep order status as PENDING
            jdbcTemplate.update("UPDATE orders SET status = 'PENDING' WHERE id = ?", orderId);
            jdbcTemplate.update("INSERT INTO order_status_history (order_id, status, notes) VALUES (?, 'PENDING', 'Switched payment method to Cash on Delivery (COD)')", orderId);

            response.put("status", "SUCCESS");
            response.put("message", "Switched payment method to Cash on Delivery");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("status", "ERROR");
            response.put("message", "Failed to switch to cash: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
