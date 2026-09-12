package com.flamecrust.api.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.Properties;

@Service
public class EmailService {
    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private final JavaMailSender mailSender;
    private JavaMailSender dynamicMailSender;

    @Value("${spring.mail.username:chanthakhemara12@gmail.com}")
    private String mailUsername;

    @Value("${spring.mail.password:yklkawmryphjodct}")
    private String mailPassword;

    @Value("${spring.mail.host:smtp.gmail.com}")
    private String mailHost;

    @Value("${spring.mail.port:587}")
    private int mailPort;

    public EmailService(@Autowired(required = false) JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    private synchronized JavaMailSender getActiveMailSender() {
        if (this.mailSender != null) {
            return this.mailSender;
        }
        if (this.dynamicMailSender != null) {
            return this.dynamicMailSender;
        }
        try {
            String username = (mailUsername != null && !mailUsername.isBlank()) ? mailUsername.trim() : "chanthakhemara12@gmail.com";
            String password = (mailPassword != null && !mailPassword.isBlank()) ? mailPassword.trim() : "yklkawmryphjodct";
            String host = (mailHost != null && !mailHost.isBlank()) ? mailHost.trim() : "smtp.gmail.com";
            int port = mailPort > 0 ? mailPort : 587;

            JavaMailSenderImpl sender = new JavaMailSenderImpl();
            sender.setHost(host);
            sender.setPort(port);
            sender.setUsername(username);
            sender.setPassword(password);

            Properties props = sender.getJavaMailProperties();
            props.put("mail.transport.protocol", "smtp");
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.starttls.required", "false");
            props.put("mail.smtp.connectiontimeout", "8000");
            props.put("mail.smtp.timeout", "8000");
            props.put("mail.smtp.writetimeout", "8000");

            this.dynamicMailSender = sender;
            log.info("Initialized dynamic JavaMailSender with host: {}, username: {}", host, username);
            return sender;
        } catch (Exception e) {
            log.error("Failed to initialize dynamic JavaMailSender: {}", e.getMessage());
            return null;
        }
    }

    public boolean sendOtpEmail(String toEmail, String otp) {
        if (toEmail == null || toEmail.trim().isEmpty() || otp == null || otp.trim().isEmpty()) {
            log.warn("Cannot send OTP: toEmail or otp is empty");
            return false;
        }

        String recipient = toEmail.trim().toLowerCase();
        String senderEmail = (mailUsername != null && !mailUsername.isBlank()) ? mailUsername.trim() : "chanthakhemara12@gmail.com";
        JavaMailSender sender = getActiveMailSender();

        if (sender == null) {
            log.warn("No mail sender configured or available. Returning false for {}.", recipient);
            return false;
        }

        // 1. Try sending rich HTML email
        try {
            MimeMessage mimeMessage = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(senderEmail, "Flame & Crust Pizza");
            helper.setTo(recipient);
            helper.setSubject("🍕 Your Flame & Crust Verification Code: " + otp);

            String html = """
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 16px; border: 1px solid #fed7aa; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h1 style="color: #ea580c; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">🔥 Flame &amp; Crust Pizza</h1>
                        <p style="color: #78716c; font-size: 13px; margin: 4px 0 0 0;">Woodfired Artisan Pizza &amp; Fast Delivery</p>
                    </div>
                    <div style="background: linear-gradient(135deg, #fff7ed 0%%, #ffedd5 100%%); border: 1px solid #fdba74; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 20px;">
                        <p style="margin: 0 0 8px 0; color: #9a3412; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code / លេខកូដផ្ទៀងផ្ទាត់</p>
                        <div style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #c2410c; padding: 8px 0; font-family: monospace;">
                            %s
                        </div>
                        <p style="margin: 8px 0 0 0; color: #9a3412; font-size: 12px;">Valid for <strong>5 minutes</strong> (មានសុពលភាព ៥ នាទី)</p>
                    </div>
                    <p style="color: #44403c; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
                        Please enter this 6-digit code to complete your verification or sign-in. If you did not request this code, you can safely ignore this email.
                    </p>
                    <hr style="border: none; border-top: 1px solid #f5f5f4; margin: 20px 0;" />
                    <p style="color: #a8a29e; font-size: 11px; text-align: center; margin: 0;">
                        &copy; 2026 Flame &amp; Crust Pizza. All rights reserved.
                    </p>
                </div>
            """.formatted(otp);

            helper.setText(html, true);
            sender.send(mimeMessage);
            log.info("OTP HTML email sent successfully to {}", recipient);
            return true;
        } catch (Exception e) {
            log.warn("Failed to send MimeMessage OTP to {}: {}. Attempting plain text fallback...", recipient, e.getMessage());
        }

        // 2. Fallback to SimpleMailMessage
        try {
            SimpleMailMessage simple = new SimpleMailMessage();
            simple.setFrom(senderEmail);
            simple.setTo(recipient);
            simple.setSubject("Your Flame & Crust Login Code: " + otp);
            simple.setText("Your OTP code is: " + otp + "\n\nThis code will expire in 5 minutes.\nIf you did not request this code, please ignore this email.");

            sender.send(simple);
            log.info("OTP plain text email sent successfully to {}", recipient);
            return true;
        } catch (Exception e) {
            log.error("Failed to send plain text OTP email to {}: {}", recipient, e.getMessage());
            return false;
        }
    }
}
