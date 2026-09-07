package com.flamecrust.api.controller;

import com.flamecrust.api.security.JwtUtil;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import com.flamecrust.api.service.EmailService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CompletableFuture;
import com.flamecrust.api.service.WebPushService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);
    private final JdbcTemplate jdbc;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final WebPushService webPushService;
    private final SecureRandom secureRandom = new SecureRandom();

    // Rate limiting buckets per IP/Email
    private final Map<String, Bucket> otpBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> loginBuckets = new ConcurrentHashMap<>();

    public AuthController(JdbcTemplate jdbc, EmailService emailService, PasswordEncoder passwordEncoder, JwtUtil jwtUtil, WebPushService webPushService) {
        this.jdbc = jdbc;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.webPushService = webPushService;
    }

    private Bucket getOtpBucket(String key) {
        return otpBuckets.computeIfAbsent(key, k -> Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(100).refillIntervally(100, Duration.ofMinutes(10)).build())
                .build());
    }

    private Bucket getLoginBucket(String key) {
        return loginBuckets.computeIfAbsent(key, k -> Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(100).refillIntervally(100, Duration.ofMinutes(15)).build())
                .build());
    }

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@RequestBody Map<String, String> body) {
        String rawEmail = body.get("email");
        if (rawEmail == null || rawEmail.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }

        String email = rawEmail.toLowerCase().trim();
        Bucket bucket = getOtpBucket(email);
        if (!bucket.tryConsume(1)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("error", "Too many OTP requests. Please wait."));
        }

        String otp = String.format("%06d", secureRandom.nextInt(999999));
        Timestamp expiresAt = Timestamp.from(Instant.now().plusSeconds(5 * 60)); // 5 minutes expiration

        jdbc.update("INSERT INTO otps (target, otp_code, is_used, expires_at) VALUES (?, ?, ?, ?)",
                email, otp, false, expiresAt);

        log.info("Generated OTP for {}: {}", email, otp);
        boolean emailSent = emailService.sendOtpEmail(email, otp);

        Map<String, Object> resp = new HashMap<>();
        if (!emailSent) {
            log.warn("Failed to send verification email to {}. Bypassing error for testing.", email);
            resp.put("devOtp", otp);
        }

        resp.put("message", "OTP generated successfully");
        resp.put("emailSent", emailSent);

        return ResponseEntity.ok(resp);
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> body) {
        String rawEmail = body.get("email");
        String rawOtp = body.get("otp");

        if (rawEmail == null || rawOtp == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and OTP are required"));
        }

        String email = rawEmail.toLowerCase().trim();
        String otp = rawOtp.trim();

        Bucket bucket = getLoginBucket(email);
        if (!bucket.tryConsume(1)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("error", "Too many attempts. Please wait."));
        }

        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id FROM otps WHERE LOWER(target) = ? AND otp_code = ? AND is_used = false AND expires_at > ? ORDER BY id DESC LIMIT 1",
                email, otp, Timestamp.from(Instant.now()));

        if (rows.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid or expired OTP code"));
        }

        long otpId = ((Number) rows.get(0).get("id")).longValue();
        jdbc.update("UPDATE otps SET is_used = true WHERE id = ?", otpId);

        // Fetch or Create Customer
        List<Map<String, Object>> customers = jdbc.queryForList("SELECT * FROM customers WHERE LOWER(email) = ? LIMIT 1", email);
        Map<String, Object> customer;
        if (customers.isEmpty()) {
            String name = email.contains("@") ? email.substring(0, email.indexOf("@")) : "User";
            jdbc.update("INSERT INTO customers (name, email) VALUES (?, ?)", name, email);
            customer = jdbc.queryForList("SELECT * FROM customers WHERE LOWER(email) = ? LIMIT 1", email).getFirst();
        } else {
            customer = customers.getFirst();
        }

        String token = jwtUtil.generateToken(email, "CUSTOMER");
        return ResponseEntity.ok(Map.of("customer", customer, "token", token));
    }
    
    private static final int MAX_FAILED_ATTEMPTS = 3;
    private static final int LOCKOUT_MINUTES = 15;

    /**
     * Check if the account is currently locked out.
     * Returns a 429 Too Many Requests response if locked, or null if account is accessible.
     */
    private ResponseEntity<?> checkAccountLockout(Map<String, Object> account) {
        if (account == null) return null;
        Object lockedUntilObj = account.get("locked_until");
        if (lockedUntilObj instanceof Timestamp lockedUntil) {
            Instant lockExpiry = lockedUntil.toInstant();
            Instant now = Instant.now();
            if (lockExpiry.isAfter(now)) {
                long minutesLeft = Duration.between(now, lockExpiry).toMinutes() + 1;
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
                        "error", "គណនីត្រូវបានចាក់សោរបណ្ដោះអាសន្ន ដោយសារបញ្ចូលលេខសម្ងាត់ខុស " + MAX_FAILED_ATTEMPTS + " ដង។ សូមព្យាយាមម្តងទៀតក្នុងរយៈពេល " + minutesLeft + " នាទី។ (Account locked. Please try again in " + minutesLeft + " minutes.)",
                        "locked", true,
                        "minutesRemaining", minutesLeft
                ));
            }
        }
        return null;
    }

    /**
     * Handles a failed login attempt for a known account in a table.
     * Increments failed_attempts, and if threshold reached, sets locked_until to 15 minutes from now.
     */
    private ResponseEntity<?> handleFailedLogin(String table, Map<String, Object> account) {
        if (account == null || !account.containsKey("id")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid credentials"));
        }
        Object id = account.get("id");
        int currentAttempts = 0;
        if (account.get("failed_attempts") != null) {
            currentAttempts = ((Number) account.get("failed_attempts")).intValue();
        }
        int newAttempts = currentAttempts + 1;

        if (newAttempts >= MAX_FAILED_ATTEMPTS) {
            Timestamp lockTime = Timestamp.from(Instant.now().plus(Duration.ofMinutes(LOCKOUT_MINUTES)));
            try {
                jdbc.update("UPDATE " + table + " SET failed_attempts = ?, locked_until = ? WHERE id = ?",
                        newAttempts, lockTime, id);
            } catch (Exception e) {
                log.warn("Could not update lockout status for {} id {}: {}", table, id, e.getMessage());
            }
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
                    "error", "អ្នកបានបញ្ចូលលេខសម្ងាត់ខុស " + MAX_FAILED_ATTEMPTS + " ដង! គណនីរបស់អ្នកត្រូវបានចាក់សោរបណ្ដោះអាសន្នរយៈពេល " + LOCKOUT_MINUTES + " នាទី។ (Account locked for " + LOCKOUT_MINUTES + " minutes due to multiple failed attempts.)",
                    "locked", true,
                    "minutesRemaining", LOCKOUT_MINUTES
            ));
        } else {
            try {
                jdbc.update("UPDATE " + table + " SET failed_attempts = ? WHERE id = ?", newAttempts, id);
            } catch (Exception e) {
                log.warn("Could not update failed_attempts for {} id {}: {}", table, id, e.getMessage());
            }
            int remaining = MAX_FAILED_ATTEMPTS - newAttempts;
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "លេខសម្ងាត់មិនត្រឹមត្រូវ! អ្នកនៅសល់ឱកាស " + remaining + " ដងទៀត មុនពេលគណនីត្រូវបានចាក់សោរ។ (Invalid password. You have " + remaining + " attempt(s) remaining.)",
                    "attemptsRemaining", remaining
            ));
        }
    }

    /**
     * Resets failed_attempts and locked_until upon successful login.
     */
    private void resetAccountLockout(String table, Object id) {
        if (id == null) return;
        try {
            jdbc.update("UPDATE " + table + " SET failed_attempts = 0, locked_until = NULL WHERE id = ?", id);
        } catch (Exception e) {
            log.warn("Could not reset lockout status for {} id {}: {}", table, id, e.getMessage());
        }
    }
    
    @PostMapping("/customer-login")
    public ResponseEntity<?> customerLogin(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");

        if (email == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and password are required"));
        }

        Bucket bucket = getLoginBucket(email);
        if (!bucket.tryConsume(1)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("error", "Too many attempts. Please wait."));
        }

        List<Map<String, Object>> customers = jdbc.queryForList(
                "SELECT * FROM customers WHERE email = ? AND status = 'ACTIVE' LIMIT 1", email);

        if (customers.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid credentials"));
        }

        Map<String, Object> customer = customers.getFirst();

        ResponseEntity<?> lockoutResp = checkAccountLockout(customer);
        if (lockoutResp != null) {
            return lockoutResp;
        }

        String passwordHash = (String) customer.get("password_hash");

        if (passwordHash == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Password not set. Please use OTP to login first."));
        }

        boolean isMatch = verifyPassword(password, passwordHash, "customers", customer.get("id"));
        if (!isMatch) {
            return handleFailedLogin("customers", customer);
        }

        resetAccountLockout("customers", customer.get("id"));

        String token = jwtUtil.generateToken(email, "CUSTOMER");
        customer.remove("password_hash");
        return ResponseEntity.ok(Map.of("customer", customer, "token", token));
    }

    @PostMapping("/check-email")
    public ResponseEntity<?> checkEmail(@RequestBody Map<String, String> body) {
        String rawEmail = body.get("email");
        if (rawEmail == null || rawEmail.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }
        String email = rawEmail.toLowerCase().trim();

        boolean exists = !jdbc.queryForList("SELECT id FROM customers WHERE LOWER(email) = ? LIMIT 1", email).isEmpty()
                || !jdbc.queryForList("SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1", email).isEmpty()
                || !jdbc.queryForList("SELECT id FROM drivers WHERE LOWER(email) = ? LIMIT 1", email).isEmpty();

        return ResponseEntity.ok(Map.of("email", email, "exists", exists));
    }

    @PostMapping("/customer-register")
    public ResponseEntity<?> customerRegister(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        String email = body.get("email");
        String phone = body.get("phone");
        String password = body.get("password");
        String otp = body.get("otp");

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }
        if (password == null || password.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 6 characters"));
        }
        if (otp == null || otp.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "OTP code is required"));
        }
        if (name == null || name.isBlank()) {
            name = email.contains("@") ? email.substring(0, email.indexOf("@")) : "Customer";
        }

        email = email.toLowerCase().trim();
        otp = otp.trim();

        // Check if account already exists (customers, users, or drivers)
        List<Map<String, Object>> existing = jdbc.queryForList("SELECT id FROM customers WHERE LOWER(email) = ? LIMIT 1", email);
        if (!existing.isEmpty()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "An account with this email already exists. Please sign in."));
        }
        existing = jdbc.queryForList("SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1", email);
        if (!existing.isEmpty()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "An account with this email already exists. Please sign in."));
        }
        existing = jdbc.queryForList("SELECT id FROM drivers WHERE LOWER(email) = ? LIMIT 1", email);
        if (!existing.isEmpty()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "An account with this email already exists. Please sign in."));
        }

        // Verify OTP
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id FROM otps WHERE LOWER(target) = ? AND otp_code = ? AND is_used = false AND expires_at > ? ORDER BY id DESC LIMIT 1",
                email, otp, Timestamp.from(Instant.now()));

        if (rows.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid or expired OTP code"));
        }

        long otpId = ((Number) rows.get(0).get("id")).longValue();
        jdbc.update("UPDATE otps SET is_used = true WHERE id = ?", otpId);

        String encodedPassword = passwordEncoder.encode(password);
        jdbc.update("INSERT INTO customers (name, email, phone, password_hash) VALUES (?, ?, ?, ?)",
                name, email, phone, encodedPassword);

        Map<String, Object> customer = jdbc.queryForList("SELECT * FROM customers WHERE LOWER(email) = ? LIMIT 1", email).getFirst();
        customer.remove("password_hash");

        String token = jwtUtil.generateToken(email, "CUSTOMER");
        return ResponseEntity.ok(Map.of(
                "type", "CUSTOMER",
                "role", "CUSTOMER",
                "customer", customer,
                "token", token
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> unifiedLogin(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");

        System.out.println("unifiedLogin attempt for: " + email);

        if (email == null || password == null || email.isBlank() || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and password are required"));
        }

        Bucket bucket = getLoginBucket(email);
        if (!bucket.tryConsume(1)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("error", "Too many attempts. Please wait."));
        }

        // 1. Check users (Staff / Admin / Manager)
        List<Map<String, Object>> users = jdbc.queryForList(
                "SELECT u.id, u.name, u.email, u.status, u.password_hash, u.failed_attempts, u.locked_until, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE (u.email = ? OR u.email = ?) AND u.status = 'ACTIVE' LIMIT 1",
                email, email);

        if (!users.isEmpty()) {
            Map<String, Object> user = users.getFirst();
            ResponseEntity<?> lockoutResp = checkAccountLockout(user);
            if (lockoutResp != null) {
                return lockoutResp;
            }

            String passwordHash = (String) user.get("password_hash");
            if (verifyPassword(password, passwordHash, "users", user.get("id"))) {
                resetAccountLockout("users", user.get("id"));
                String role = (String) user.get("role");
                String token = jwtUtil.generateToken(email, role != null ? role.toUpperCase() : "ADMIN");
                user.remove("password_hash");
                return ResponseEntity.ok(Map.of(
                        "type", "ADMIN",
                        "role", role != null ? role.toUpperCase() : "ADMIN",
                        "user", user,
                        "token", token
                ));
            }
        }

        // 2. Check drivers (Driver) - Prioritize over general customer
        List<Map<String, Object>> drivers = jdbc.queryForList(
                "SELECT * FROM drivers WHERE (email = ? OR phone = ?) AND status != 'SUSPENDED' LIMIT 1", email, email);

        if (!drivers.isEmpty()) {
            Map<String, Object> driver = drivers.getFirst();
            ResponseEntity<?> lockoutResp = checkAccountLockout(driver);
            if (lockoutResp != null) {
                return lockoutResp;
            }

            if (verifyPassword(password, (String) driver.get("password_hash"), "drivers", driver.get("id"))) {
                resetAccountLockout("drivers", driver.get("id"));
                String driverEmail = (String) driver.get("email");
                String token = jwtUtil.generateToken(driverEmail != null ? driverEmail : email, "DRIVER");
                driver.remove("password_hash");
                return ResponseEntity.ok(Map.of(
                        "type", "DRIVER",
                        "role", "DRIVER",
                        "driver", driver,
                        "token", token
                ));
            }
        }

        // 3. Check kitchen staff
        List<Map<String, Object>> kitchenStaffList = jdbc.queryForList(
                "SELECT * FROM kitchen_staff WHERE (email = ? OR phone = ?) LIMIT 1", email, email);

        if (!kitchenStaffList.isEmpty()) {
            Map<String, Object> staff = kitchenStaffList.getFirst();
            ResponseEntity<?> lockoutResp = checkAccountLockout(staff);
            if (lockoutResp != null) {
                return lockoutResp;
            }

            if (verifyPassword(password, (String) staff.get("password_hash"), "kitchen_staff", staff.get("id"))) {
                resetAccountLockout("kitchen_staff", staff.get("id"));
                String staffEmail = (String) staff.get("email");
                String token = jwtUtil.generateToken(staffEmail != null ? staffEmail : email, "KITCHEN_STAFF");
                staff.remove("password_hash");
                return ResponseEntity.ok(Map.of(
                        "type", "KITCHEN_STAFF",
                        "role", "KITCHEN_STAFF",
                        "user", staff,
                        "token", token
                ));
            }
        }

        // 4. Check customers
        List<Map<String, Object>> customers = jdbc.queryForList(
                "SELECT * FROM customers WHERE (email = ? OR phone = ?) AND status = 'ACTIVE' LIMIT 1", email, email);

        if (!customers.isEmpty()) {
            Map<String, Object> customer = customers.getFirst();
            ResponseEntity<?> lockoutResp = checkAccountLockout(customer);
            if (lockoutResp != null) {
                return lockoutResp;
            }

            String passwordHash = (String) customer.get("password_hash");
            if (verifyPassword(password, passwordHash, "customers", customer.get("id"))) {
                resetAccountLockout("customers", customer.get("id"));
                String customerEmail = (String) customer.get("email");
                String token = jwtUtil.generateToken(customerEmail != null ? customerEmail : email, "CUSTOMER");
                customer.remove("password_hash");
                return ResponseEntity.ok(Map.of(
                        "type", "CUSTOMER",
                        "role", "CUSTOMER",
                        "customer", customer,
                        "token", token
                ));
            }
            return handleFailedLogin("customers", customer);
        }

        if (!drivers.isEmpty()) {
            return handleFailedLogin("drivers", drivers.getFirst());
        }

        if (!users.isEmpty()) {
            return handleFailedLogin("users", users.getFirst());
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid email/phone or password"));
    }

    @PostMapping("/google-login")
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String name = body.get("name");
        String avatar = body.get("avatar");

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }

        Bucket bucket = getLoginBucket(email);
        if (!bucket.tryConsume(1)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("error", "Too many attempts. Please wait."));
        }

        List<Map<String, Object>> customers = jdbc.queryForList("SELECT * FROM customers WHERE email = ? LIMIT 1", email);
        Map<String, Object> customer;
        if (customers.isEmpty()) {
            if (name == null || name.isBlank()) {
                name = email.contains("@") ? email.substring(0, email.indexOf("@")) : "User";
            }
            jdbc.update("INSERT INTO customers (name, email, avatar) VALUES (?, ?, ?)", name, email, avatar);
            customer = jdbc.queryForList("SELECT * FROM customers WHERE email = ? LIMIT 1", email).getFirst();
        } else {
            customer = customers.getFirst();
            if (avatar != null && !avatar.isBlank()) {
                jdbc.update("UPDATE customers SET avatar = ? WHERE id = ? AND (avatar IS NULL OR avatar = '')", avatar, customer.get("id"));
                customer = jdbc.queryForList("SELECT * FROM customers WHERE email = ? LIMIT 1", email).getFirst();
            }
        }

        resetAccountLockout("customers", customer.get("id"));
        customer.remove("password_hash");
        String token = jwtUtil.generateToken(email, "CUSTOMER");
        return ResponseEntity.ok(Map.of(
                "type", "CUSTOMER",
                "role", "CUSTOMER",
                "customer", customer,
                "token", token,
                "avatar", customer.get("avatar") != null ? customer.get("avatar") : (avatar != null ? avatar : "")
        ));
    }

    @PostMapping("/admin-login")
    public ResponseEntity<?> adminLogin(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");

        if (email == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and password are required"));
        }

        Bucket bucket = getLoginBucket(email);
        if (!bucket.tryConsume(1)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("error", "Too many attempts. Please wait."));
        }

        List<Map<String, Object>> users = jdbc.queryForList(
                "SELECT u.id, u.name, u.email, u.status, u.password_hash, u.failed_attempts, u.locked_until, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.email = ? AND u.status = 'ACTIVE' LIMIT 1",
                email);

        if (users.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid credentials or inactive account"));
        }

        Map<String, Object> user = users.getFirst();
        ResponseEntity<?> lockoutResp = checkAccountLockout(user);
        if (lockoutResp != null) {
            return lockoutResp;
        }

        String passwordHash = (String) user.get("password_hash");
        
        if (!verifyPassword(password, passwordHash, "users", user.get("id"))) {
            return handleFailedLogin("users", user);
        }

        resetAccountLockout("users", user.get("id"));

        String role = (String) user.get("role");
        String token = jwtUtil.generateToken(email, role.toUpperCase());
        user.remove("password_hash");
        return ResponseEntity.ok(Map.of("user", user, "token", token));
    }
    
    @PostMapping("/driver-login")
    public ResponseEntity<?> driverLogin(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");

        if (email == null || password == null || email.isBlank() || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and password are required"));
        }

        Bucket bucket = getLoginBucket("driver:" + email);
        if (!bucket.tryConsume(1)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("error", "Too many attempts. Please wait."));
        }

        List<Map<String, Object>> drivers = jdbc.queryForList(
                "SELECT * FROM drivers WHERE email = ? LIMIT 1", email);

        if (drivers.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid email or password"));
        }

        Map<String, Object> driver = drivers.getFirst();
        ResponseEntity<?> lockoutResp = checkAccountLockout(driver);
        if (lockoutResp != null) {
            return lockoutResp;
        }

        String passwordHash = (String) driver.get("password_hash");

        if (passwordHash == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Password not set"));
        }

        if (!verifyPassword(password, passwordHash, "drivers", driver.get("id"))) {
            return handleFailedLogin("drivers", driver);
        }

        resetAccountLockout("drivers", driver.get("id"));

        String token = jwtUtil.generateToken(email, "DRIVER");
        // Remove password_hash from response
        driver.remove("password_hash");
        return ResponseEntity.ok(Map.of("driver", driver, "token", token));
    }

    @PostMapping("/kitchen-login")
    public ResponseEntity<?> kitchenLogin(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");

        if (email == null || password == null || email.isBlank() || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and password are required"));
        }

        Bucket bucket = getLoginBucket("kitchen:" + email);
        if (!bucket.tryConsume(1)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("error", "Too many attempts. Please wait."));
        }

        List<Map<String, Object>> staffList = jdbc.queryForList(
                "SELECT * FROM kitchen_staff WHERE email = ? LIMIT 1", email);

        if (staffList.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid email or password"));
        }

        Map<String, Object> staff = staffList.getFirst();
        ResponseEntity<?> lockoutResp = checkAccountLockout(staff);
        if (lockoutResp != null) {
            return lockoutResp;
        }

        String passwordHash = (String) staff.get("password_hash");

        if (passwordHash == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Password not set"));
        }

        if (!verifyPassword(password, passwordHash, "kitchen_staff", staff.get("id"))) {
            return handleFailedLogin("kitchen_staff", staff);
        }

        resetAccountLockout("kitchen_staff", staff.get("id"));

        String token = jwtUtil.generateToken(email, "KITCHEN_STAFF");
        staff.remove("password_hash");
        return ResponseEntity.ok(Map.of("user", staff, "token", token, "type", "KITCHEN_STAFF"));
    }

    @PostMapping("/driver-register")
    public ResponseEntity<?> driverRegister(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        String email = body.get("email");
        String phone = body.get("phone");
        String password = body.get("password");

        if (name == null || email == null || phone == null || password == null
                || name.isBlank() || email.isBlank() || phone.isBlank() || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Name, email, phone, and password are all required"));
        }

        if (password.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 6 characters"));
        }

        // Check if email or phone already exists
        List<Map<String, Object>> existing = jdbc.queryForList(
                "SELECT id FROM drivers WHERE email = ? OR phone = ? LIMIT 1", email, phone);
        if (!existing.isEmpty()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "A driver with this email or phone already exists"));
        }

        String hashedPassword = passwordEncoder.encode(password);
        jdbc.update("INSERT INTO drivers (name, phone, email, password_hash) VALUES (?, ?, ?, ?)",
                name, phone, email, hashedPassword);

        Map<String, Object> driver = jdbc.queryForList("SELECT * FROM drivers WHERE email = ? LIMIT 1", email).getFirst();
        String token = jwtUtil.generateToken(email, "DRIVER");
        driver.remove("password_hash");
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("driver", driver, "token", token));
    }

    @GetMapping("/driver-me")
    public ResponseEntity<?> driverMe(jakarta.servlet.http.HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Missing or invalid token"));
        }
        String token = authHeader.substring(7);
        String email;
        try {
            email = jwtUtil.extractEmail(token);
            if (!jwtUtil.validateToken(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid token"));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid token"));
        }

        List<Map<String, Object>> drivers = jdbc.queryForList("SELECT * FROM drivers WHERE email = ? LIMIT 1", email);
        if (drivers.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Driver not found"));
        }
        Map<String, Object> driver = drivers.getFirst();
        driver.remove("password_hash");
        return ResponseEntity.ok(driver);
    }

    @PutMapping("/driver-profile")
    public ResponseEntity<?> driverProfile(jakarta.servlet.http.HttpServletRequest request, @RequestBody Map<String, Object> body) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Missing or invalid token"));
        }
        String token = authHeader.substring(7);
        String email;
        try {
            email = jwtUtil.extractEmail(token);
            if (!jwtUtil.validateToken(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid token"));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid token"));
        }

        List<Map<String, Object>> drivers = jdbc.queryForList("SELECT id FROM drivers WHERE email = ? LIMIT 1", email);
        if (drivers.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Driver not found"));
        }
        long driverId = ((Number) drivers.getFirst().get("id")).longValue();

        // Build dynamic UPDATE
        java.util.LinkedHashMap<String, Object> updates = new java.util.LinkedHashMap<>();
        java.util.Set<String> allowed = java.util.Set.of(
                "name", "phone", "profile_photo", "date_of_birth", "national_id",
                "address", "emergency_contact", "vehicle_info", "license_plate", "profile_completed");
        body.forEach((key, value) -> {
            if (allowed.contains(key)) {
                updates.put(key, value);
            }
        });

        if (body.containsKey("password") && body.get("password") != null) {
            String newPass = body.get("password").toString().trim();
            if (!newPass.isEmpty()) {
                if (newPass.length() < 6) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 6 characters"));
                }
                updates.put("password_hash", passwordEncoder.encode(newPass));
            }
        }

        if (updates.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No valid fields to update"));
        }

        String assignments = updates.keySet().stream().map(col -> "`" + col + "` = ?")
                .collect(java.util.stream.Collectors.joining(", "));
        Object[] args = new Object[updates.size() + 1];
        int i = 0;
        for (Object val : updates.values()) {
            args[i++] = val;
        }
        args[i] = driverId;

        jdbc.update("UPDATE drivers SET " + assignments + " WHERE id = ?", args);

        Map<String, Object> updated = jdbc.queryForList("SELECT * FROM drivers WHERE id = ? LIMIT 1", driverId).getFirst();
        updated.remove("password_hash");
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/driver-location")
    public ResponseEntity<?> driverLocation(jakarta.servlet.http.HttpServletRequest request, @RequestBody Map<String, Object> body) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Missing or invalid token"));
        }
        String token = authHeader.substring(7);
        String email;
        try {
            email = jwtUtil.extractEmail(token);
            if (!jwtUtil.validateToken(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid token"));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid token"));
        }

        Object lat = body.get("latitude");
        Object lng = body.get("longitude");
        if (lat == null || lng == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "latitude and longitude are required"));
        }

        jdbc.update("UPDATE drivers SET latitude = ?, longitude = ?, location_updated_at = CURRENT_TIMESTAMP WHERE email = ?",
                lat, lng, email);

        return ResponseEntity.ok(Map.of("message", "Location updated"));
    }

    @PostMapping("/customer-change-password")
    public ResponseEntity<?> customerChangePassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String oldPassword = body.get("oldPassword");
        String newPassword = body.get("newPassword");
        String otp = body.get("otp");

        if (email == null || email.isBlank() || newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and new password are required"));
        }

        List<Map<String, Object>> customers = jdbc.queryForList("SELECT * FROM customers WHERE email = ? LIMIT 1", email);
        if (customers.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Customer not found"));
        }

        Map<String, Object> customer = customers.getFirst();
        long customerId = ((Number) customer.get("id")).longValue();
        String currentHash = (String) customer.get("password_hash");

        // If customer already has a password and no OTP is provided, verify old password
        if (currentHash != null && !currentHash.isBlank() && (otp == null || otp.isBlank())) {
            if (oldPassword == null || oldPassword.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Current password is required to change password"));
            }
            boolean isOldMatch = verifyPassword(oldPassword, currentHash, "customers", customerId);
            if (!isOldMatch) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Current password is incorrect"));
            }
        }

        // Hash and save new password with BCrypt
        String encoded = passwordEncoder.encode(newPassword);
        jdbc.update("UPDATE customers SET password_hash = ? WHERE id = ?", encoded, customerId);

        return ResponseEntity.ok(Map.of("message", "Password updated successfully", "hasPassword", true));
    }

    @PostMapping("/customer-update-profile")
    public ResponseEntity<?> customerUpdateProfile(@RequestBody Map<String, Object> body) {
        Object idObj = body.get("id");
        String email = (String) body.get("email");
        String phone = (String) body.get("phone");
        String name = (String) body.get("name");
        String avatar = (String) body.get("avatar");
        String coverPhoto = (String) body.get("cover_photo");
        String password = (String) body.get("password");

        List<Map<String, Object>> customers = List.of();
        if (idObj != null) {
            try {
                long cId = ((Number) idObj).longValue();
                if (cId > 0) {
                    customers = jdbc.queryForList("SELECT id FROM customers WHERE id = ? LIMIT 1", cId);
                }
            } catch (Exception ignored) {}
        }
        if (customers.isEmpty() && email != null && !email.isBlank()) {
            customers = jdbc.queryForList("SELECT id FROM customers WHERE email = ? LIMIT 1", email.trim());
        }
        if (customers.isEmpty() && phone != null && !phone.isBlank()) {
            customers = jdbc.queryForList("SELECT id FROM customers WHERE phone = ? LIMIT 1", phone.trim());
        }

        if (customers.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Customer not found"));
        }
        long customerId = ((Number) customers.getFirst().get("id")).longValue();

        if (name != null && !name.isBlank()) {
            jdbc.update("UPDATE customers SET name = ? WHERE id = ?", name.trim(), customerId);
        }
        if (phone != null && !phone.isBlank()) {
            jdbc.update("UPDATE customers SET phone = ? WHERE id = ?", phone.trim(), customerId);
        }
        if (avatar != null && !avatar.isBlank()) {
            jdbc.update("UPDATE customers SET avatar = ? WHERE id = ?", avatar.trim(), customerId);
        }
        if (coverPhoto != null && !coverPhoto.isBlank()) {
            jdbc.update("UPDATE customers SET cover_photo = ? WHERE id = ?", coverPhoto.trim(), customerId);
        }
        if (password != null && !password.isBlank() && password.length() >= 6) {
            jdbc.update("UPDATE customers SET password_hash = ? WHERE id = ?", passwordEncoder.encode(password), customerId);
        }

        Map<String, Object> updated = jdbc.queryForList("SELECT * FROM customers WHERE id = ? LIMIT 1", customerId).getFirst();
        updated.remove("password_hash");
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/admin-change-password")
    public ResponseEntity<?> adminChangePassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String oldPassword = body.get("oldPassword");
        String newPassword = body.get("newPassword");

        if (email == null || email.isBlank() || newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and new password are required"));
        }

        if (newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("error", "New password must be at least 6 characters long"));
        }

        List<Map<String, Object>> users = jdbc.queryForList(
                "SELECT u.id, u.name, u.email, u.status, u.password_hash, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.email = ? AND u.status = 'ACTIVE' LIMIT 1",
                email);
        if (users.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Admin user not found or inactive"));
        }

        Map<String, Object> user = users.getFirst();
        long userId = ((Number) user.get("id")).longValue();
        String currentHash = (String) user.get("password_hash");

        if (oldPassword != null && !oldPassword.isBlank()) {
            boolean isOldMatch = verifyPassword(oldPassword, currentHash, "users", userId);
            if (!isOldMatch) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Current password is incorrect (លេខសម្ងាត់ចាស់មិនត្រឹមត្រូវ)"));
            }
        }

        String encoded = passwordEncoder.encode(newPassword);
        jdbc.update("UPDATE users SET password_hash = ? WHERE id = ?", encoded, userId);

        return ResponseEntity.ok(Map.of("message", "Admin password changed successfully (ប្តូរលេខសម្ងាត់បានជោគជ័យ)"));
    }

    @GetMapping("/customer-profile-data")
    public ResponseEntity<?> getCustomerProfileData(
            @RequestParam(required = false) String customerId,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String phone) {
        
        Map<String, Object> result = new LinkedHashMap<>();
        try {
            Long cIdParsed = null;
            if (customerId != null && !customerId.isBlank()) {
                try {
                    cIdParsed = Long.parseLong(customerId.trim());
                } catch (Exception ignored) {}
            }
            
            List<Map<String, Object>> customers = List.of();
            if (cIdParsed != null && cIdParsed > 0) {
                try {
                    customers = jdbc.queryForList("SELECT id, name, email, phone, avatar, cover_photo, created_at, password_hash IS NOT NULL as has_password FROM customers WHERE id = ? LIMIT 1", cIdParsed);
                } catch (Exception ignored) {}
            }
            if (customers.isEmpty() && phone != null && !phone.isBlank()) {
                try {
                    customers = jdbc.queryForList("SELECT id, name, email, phone, avatar, cover_photo, created_at, password_hash IS NOT NULL as has_password FROM customers WHERE phone = ? LIMIT 1", phone.trim());
                } catch (Exception ignored) {}
            }
            if (customers.isEmpty() && email != null && !email.isBlank()) {
                try {
                    customers = jdbc.queryForList("SELECT id, name, email, phone, avatar, cover_photo, created_at, password_hash IS NOT NULL as has_password FROM customers WHERE email = ? LIMIT 1", email.trim());
                } catch (Exception ignored) {}
            }

            Map<String, Object> customer = !customers.isEmpty() ? customers.get(0) : new LinkedHashMap<>();
            long cid = customer.containsKey("id") && customer.get("id") != null ? ((Number) customer.get("id")).longValue() : (cIdParsed != null ? cIdParsed : -1L);
            String cPhone = customer.containsKey("phone") && customer.get("phone") != null ? String.valueOf(customer.get("phone")) : (phone != null ? phone.trim() : "");
            String cEmail = customer.containsKey("email") && customer.get("email") != null ? String.valueOf(customer.get("email")) : (email != null ? email.trim() : "");

            // 1. Fetch only this customer's orders (last 50) and embed order items
            List<Map<String, Object>> orders = List.of();
            try {
                orders = jdbc.queryForList(
                        "SELECT * FROM orders WHERE customer_id = ? OR (customer_phone IS NOT NULL AND customer_phone != '' AND customer_phone = ?) OR (customer_email IS NOT NULL AND customer_email != '' AND customer_email = ?) ORDER BY id DESC LIMIT 50",
                        cid, cPhone, cEmail);
                if (!orders.isEmpty()) {
                    for (Map<String, Object> orderMap : orders) {
                        Object orderIdObj = orderMap.get("id");
                        if (orderIdObj != null) {
                            try {
                                List<Map<String, Object>> items = jdbc.queryForList("SELECT * FROM order_items WHERE order_id = ?", orderIdObj);
                                orderMap.put("items", items);
                            } catch (Exception ignored) {}
                        }
                    }
                }
            } catch (Exception ignored) {}

            // 2. Fetch only this customer's addresses
            List<Map<String, Object>> addresses = List.of();
            if (cid > 0) {
                try {
                    addresses = jdbc.queryForList("SELECT * FROM addresses WHERE customer_id = ? ORDER BY id DESC LIMIT 20", cid);
                } catch (Exception ignored) {}
            }

            // 3. Fetch active coupons
            List<Map<String, Object>> coupons = List.of();
            try {
                coupons = jdbc.queryForList("SELECT * FROM coupons WHERE active = 1 ORDER BY id DESC LIMIT 30");
            } catch (Exception ignored) {}

            boolean hasPassword = false;
            Object hp = customer.get("has_password");
            if (hp instanceof Boolean b) {
                hasPassword = b;
            } else if (hp instanceof Number n) {
                hasPassword = n.intValue() == 1;
            } else if (hp != null) {
                hasPassword = "true".equalsIgnoreCase(hp.toString()) || "1".equals(hp.toString());
            }

            result.put("customer", customer);
            result.put("orders", orders);
            result.put("addresses", addresses);
            result.put("coupons", coupons);
            result.put("hasPassword", hasPassword);
        } catch (Exception e) {
            result.put("customer", Map.of());
            result.put("orders", List.of());
            result.put("addresses", List.of());
            result.put("coupons", List.of());
            result.put("hasPassword", false);
        }

        return ResponseEntity.ok(result);
    }

    private boolean verifyPassword(String rawPassword, String passwordHash, String table, Object id) {
        if (passwordHash == null) return false;
        boolean isMatch = false;
        
        // 1. Try BCrypt match
        try {
            isMatch = passwordEncoder.matches(rawPassword, passwordHash);
        } catch (Exception ignored) {}
        
        // 2. Try Plain text match (and auto-upgrade to BCrypt)
        if (!isMatch && passwordHash.equals(rawPassword)) {
            isMatch = true;
            try {
                jdbc.update("UPDATE " + table + " SET password_hash = ? WHERE id = ?", passwordEncoder.encode(rawPassword), id);
            } catch (Exception ignored) {}
        }
        
        // 3. Try SHA-256 match (and auto-upgrade to BCrypt)
        if (!isMatch && passwordHash.length() == 64) {
            String sha256Hex = hashPasswordSha256(rawPassword);
            if (passwordHash.equals(sha256Hex)) {
                isMatch = true;
                try {
                    jdbc.update("UPDATE " + table + " SET password_hash = ? WHERE id = ?", passwordEncoder.encode(rawPassword), id);
                } catch (Exception ignored) {}
            }
        }
        return isMatch;
    }

    @GetMapping("/order-messages")
    public ResponseEntity<?> getOrderMessages(@RequestParam("orderId") Long orderId) {
        try {
            List<Map<String, Object>> messages = jdbc.queryForList(
                "SELECT id, order_id, sender_type, sender_id, sender_name, message, is_read, created_at FROM order_messages WHERE order_id = ? ORDER BY created_at ASC",
                orderId
            );
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            log.error("Error fetching order messages for orderId {}", orderId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/order-messages")
    public ResponseEntity<?> sendOrderMessage(@RequestBody Map<String, Object> payload) {
        try {
            Object orderIdObj = payload.get("order_id") != null ? payload.get("order_id") : payload.get("orderId");
            if (orderIdObj == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "order_id is required"));
            }
            Long orderId = Long.valueOf(orderIdObj.toString());
            String senderType = (String) payload.getOrDefault("sender_type", payload.getOrDefault("senderType", "CUSTOMER"));
            String senderName = (String) payload.getOrDefault("sender_name", payload.getOrDefault("senderName", "Customer"));
            Object senderIdObj = payload.get("sender_id") != null ? payload.get("sender_id") : payload.get("senderId");
            Long senderId = senderIdObj != null ? Long.valueOf(senderIdObj.toString()) : null;
            String message = (String) payload.get("message");

            if (message == null || message.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Message cannot be empty"));
            }

            jdbc.update(
                "INSERT INTO order_messages (order_id, sender_type, sender_id, sender_name, message, is_read) VALUES (?, ?, ?, ?, ?, FALSE)",
                orderId, senderType, senderId, senderName, message.trim()
            );

            // Asynchronously dispatch real Web Push Notification with sender photo & direct open URL
            final String finalMsgText = message.trim();
            final String finalSenderName = senderName;
            final String finalSenderType = senderType;
            final Long finalSenderId = senderId;
            final Long finalOrderId = orderId;

            CompletableFuture.runAsync(() -> {
                try {
                    List<Map<String, Object>> orders = jdbc.queryForList("SELECT customer_id, driver_id FROM orders WHERE id = ?", finalOrderId);
                    if (!orders.isEmpty()) {
                        Map<String, Object> ord = orders.get(0);
                        Long customerId = ord.get("customer_id") != null ? ((Number) ord.get("customer_id")).longValue() : null;
                        Long driverId = ord.get("driver_id") != null ? ((Number) ord.get("driver_id")).longValue() : null;

                        String senderPhoto = null;
                        if ("DRIVER".equalsIgnoreCase(finalSenderType) && finalSenderId != null) {
                            List<String> photos = jdbc.queryForList("SELECT profile_photo FROM drivers WHERE id = ?", String.class, finalSenderId);
                            if (!photos.isEmpty() && photos.get(0) != null && !photos.get(0).isBlank()) {
                                senderPhoto = photos.get(0);
                            }
                        } else if ("CUSTOMER".equalsIgnoreCase(finalSenderType) && finalSenderId != null) {
                            List<String> avatars = jdbc.queryForList("SELECT avatar FROM customers WHERE id = ?", String.class, finalSenderId);
                            if (!avatars.isEmpty() && avatars.get(0) != null && !avatars.get(0).isBlank()) {
                                senderPhoto = avatars.get(0);
                            }
                        }

                        // Parse voice/image or text
                        String notiBody = finalMsgText;
                        String attachedImage = null;
                        if (notiBody.startsWith("[VOICE]:")) {
                            notiBody = "🎤 បានផ្ញើសារជាសំឡេង (Voice message)";
                        } else if (notiBody.startsWith("[IMG]:")) {
                            attachedImage = notiBody.substring(6).trim();
                            notiBody = "📷 បានផ្ញើរូបភាព (Photo attachment)";
                        }

                        Map<String, Object> extra = new HashMap<>();
                        if (senderPhoto != null) {
                            extra.put("icon", senderPhoto);
                        }
                        if (attachedImage != null) {
                            extra.put("image", attachedImage);
                        }
                        extra.put("orderId", finalOrderId);

                        if ("DRIVER".equalsIgnoreCase(finalSenderType) && customerId != null) {
                            String title = "💬 " + finalSenderName + " (អ្នកដឹកជញ្ជូន 🛵)";
                            String url = "/order-tracking/" + finalOrderId;
                            webPushService.sendToUserWithExtra(customerId, "CUSTOMER", title, notiBody, url, extra);
                        } else if ("CUSTOMER".equalsIgnoreCase(finalSenderType) && driverId != null) {
                            String title = "💬 " + finalSenderName + " (អតិថិជន 🍕)";
                            String url = "/driver/dashboard";
                            webPushService.sendToUserWithExtra(driverId, "DRIVER", title, notiBody, url, extra);
                        }
                    }
                } catch (Exception ex) {
                    log.error("Failed to send chat push notification: {}", ex.getMessage());
                }
            });

            return ResponseEntity.ok(Map.of("success", true, "message", "Sent successfully"));
        } catch (Exception e) {
            log.error("Error sending order message", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/order-messages/read")
    public ResponseEntity<?> markMessagesAsRead(@RequestBody Map<String, Object> payload) {
        try {
            Object orderIdObj = payload.get("order_id") != null ? payload.get("order_id") : payload.get("orderId");
            if (orderIdObj == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "order_id is required"));
            }
            Long orderId = Long.valueOf(orderIdObj.toString());
            String readerType = (String) payload.getOrDefault("reader_type", payload.getOrDefault("readerType", "CUSTOMER"));
            jdbc.update(
                "UPDATE order_messages SET is_read = TRUE WHERE order_id = ? AND sender_type != ?",
                orderId, readerType
            );
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            log.error("Error marking messages as read", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/order-messages/delete")
    public ResponseEntity<?> deleteOrderMessage(@RequestBody Map<String, Object> payload) {
        try {
            Object msgIdObj = payload.get("message_id") != null ? payload.get("message_id") : payload.get("id");
            if (msgIdObj == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "message_id is required"));
            }
            Long messageId = Long.valueOf(msgIdObj.toString());
            String senderType = (String) payload.getOrDefault("sender_type", payload.getOrDefault("senderType", "CUSTOMER"));

            // Mark message content as deleted
            int updated = jdbc.update(
                "UPDATE order_messages SET message = '[DELETED]' WHERE id = ? AND sender_type = ?",
                messageId, senderType
            );

            return ResponseEntity.ok(Map.of("success", true, "updated", updated > 0));
        } catch (Exception e) {
            log.error("Error deleting order message", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    private final java.util.concurrent.ConcurrentHashMap<String, Long> typingStatusMap = new java.util.concurrent.ConcurrentHashMap<>();

    @PostMapping("/order-chat/typing")
    public ResponseEntity<?> reportTyping(@RequestBody Map<String, Object> payload) {
        try {
            Object orderIdObj = payload.get("order_id") != null ? payload.get("order_id") : payload.get("orderId");
            if (orderIdObj == null) return ResponseEntity.badRequest().body(Map.of("error", "order_id is required"));
            String senderType = (String) payload.getOrDefault("sender_type", payload.getOrDefault("senderType", "CUSTOMER"));
            String key = orderIdObj.toString() + "_" + senderType.toUpperCase();
            typingStatusMap.put(key, System.currentTimeMillis());
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false));
        }
    }

    @GetMapping("/order-chat/typing")
    public ResponseEntity<?> checkTyping(@RequestParam("orderId") Long orderId, @RequestParam("userType") String userType) {
        try {
            String otherType = "CUSTOMER".equalsIgnoreCase(userType) ? "DRIVER" : "CUSTOMER";
            String key = orderId + "_" + otherType;
            Long lastTyping = typingStatusMap.get(key);
            boolean isTyping = lastTyping != null && (System.currentTimeMillis() - lastTyping) < 3500;
            return ResponseEntity.ok(Map.of("isTyping", isTyping));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("isTyping", false));
        }
    }

    @GetMapping("/active-calls")
    public ResponseEntity<?> getActiveCall(@RequestParam("orderId") Long orderId) {
        try {
            List<Map<String, Object>> calls = jdbc.queryForList(
                "SELECT * FROM active_calls WHERE order_id = ? AND status IN ('RINGING', 'ACCEPTED') ORDER BY created_at DESC LIMIT 1",
                orderId
            );
            if (calls.isEmpty()) {
                return ResponseEntity.ok(Map.of("active", false));
            }
            Map<String, Object> call = calls.getFirst();
            return ResponseEntity.ok(Map.of("active", true, "call", call));
        } catch (Exception e) {
            log.error("Error fetching active call", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/active-calls/start")
    public ResponseEntity<?> startActiveCall(@RequestBody Map<String, Object> payload) {
        try {
            Object orderIdObj = payload.get("order_id") != null ? payload.get("order_id") : payload.get("orderId");
            if (orderIdObj == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "order_id is required"));
            }
            Long orderId = Long.valueOf(orderIdObj.toString());
            String callerType = (String) payload.getOrDefault("caller_type", payload.getOrDefault("callerType", "CUSTOMER"));
            String callerName = (String) payload.getOrDefault("caller_name", payload.getOrDefault("callerName", "Customer"));
            String receiverType = (String) payload.getOrDefault("receiver_type", payload.getOrDefault("receiverType", "DRIVER"));
            String receiverName = (String) payload.getOrDefault("receiver_name", payload.getOrDefault("receiverName", "Driver"));

            // End any prior active calls for this order
            jdbc.update("UPDATE active_calls SET status = 'ENDED', ended_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status IN ('RINGING', 'ACCEPTED')", orderId);

            // Insert new call
            jdbc.update(
                "INSERT INTO active_calls (order_id, caller_type, caller_name, receiver_type, receiver_name, status) VALUES (?, ?, ?, ?, ?, 'RINGING')",
                orderId, callerType, callerName, receiverType, receiverName
            );

            List<Map<String, Object>> created = jdbc.queryForList(
                "SELECT * FROM active_calls WHERE order_id = ? AND status = 'RINGING' ORDER BY created_at DESC LIMIT 1",
                orderId
            );

            return ResponseEntity.ok(Map.of("success", true, "call", created.isEmpty() ? Map.of() : created.getFirst()));
        } catch (Exception e) {
            log.error("Error starting active call", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/active-calls/answer")
    public ResponseEntity<?> answerActiveCall(@RequestBody Map<String, Object> payload) {
        try {
            Object orderIdObj = payload.get("order_id") != null ? payload.get("order_id") : payload.get("orderId");
            if (orderIdObj == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "order_id is required"));
            }
            Long orderId = Long.valueOf(orderIdObj.toString());
            jdbc.update(
                "UPDATE active_calls SET status = 'ACCEPTED', answered_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status = 'RINGING'",
                orderId
            );
            return ResponseEntity.ok(Map.of("success", true, "message", "Call answered"));
        } catch (Exception e) {
            log.error("Error answering active call", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/active-calls/end")
    public ResponseEntity<?> endActiveCall(@RequestBody Map<String, Object> payload) {
        try {
            Object orderIdObj = payload.get("order_id") != null ? payload.get("order_id") : payload.get("orderId");
            if (orderIdObj == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "order_id is required"));
            }
            Long orderId = Long.valueOf(orderIdObj.toString());
            jdbc.update(
                "UPDATE active_calls SET status = 'ENDED', ended_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status IN ('RINGING', 'ACCEPTED')",
                orderId
            );
            return ResponseEntity.ok(Map.of("success", true, "message", "Call ended"));
        } catch (Exception e) {
            log.error("Error ending active call", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    private String hashPasswordSha256(String password) {
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(password.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not found", e);
        }
    }
}
