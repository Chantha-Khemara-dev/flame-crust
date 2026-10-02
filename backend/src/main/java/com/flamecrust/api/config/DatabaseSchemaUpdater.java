package com.flamecrust.api.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseSchemaUpdater implements CommandLineRunner {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        System.out.println("--> Checking and updating database schema for Base64 image support...");
        try {
            jdbcTemplate.execute("ALTER TABLE customers MODIFY avatar LONGTEXT;");
            jdbcTemplate.execute("ALTER TABLE customers MODIFY cover_photo LONGTEXT;");
            jdbcTemplate.execute("ALTER TABLE drivers MODIFY profile_photo LONGTEXT;");
            jdbcTemplate.execute("ALTER TABLE drivers MODIFY cover_photo LONGTEXT;");
            try {
                jdbcTemplate.execute("ALTER TABLE kitchen_staff ADD COLUMN profile_photo LONGTEXT NULL;");
            } catch (Exception ignored) {}
            try {
                jdbcTemplate.execute("ALTER TABLE kitchen_staff ADD COLUMN avatar LONGTEXT NULL;");
            } catch (Exception ignored) {}
            System.out.println("--> Schema updated successfully: Image columns changed to LONGTEXT.");
        } catch (Exception e) {
            System.out.println("--> Schema update skipped or already applied: " + e.getMessage());
        }
        
        try {
            jdbcTemplate.execute("ALTER TABLE customers ADD COLUMN favorites JSON NULL;");
            System.out.println("--> Schema updated successfully: Added favorites column to customers.");
        } catch (Exception e) {
            System.out.println("--> Schema update skipped or already applied: " + e.getMessage());
        }
        
        try {
            jdbcTemplate.execute("CREATE INDEX idx_customers_phone ON customers(phone);");
            jdbcTemplate.execute("CREATE INDEX idx_orders_created_at ON orders(created_at);");
            System.out.println("--> Schema updated successfully: Added performance indexes.");
        } catch (Exception e) {
            System.out.println("--> Schema update skipped or already applied: " + e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE order_messages ADD COLUMN recipient_type VARCHAR(50) NULL;");
            System.out.println("--> Schema updated successfully: Added recipient_type column to order_messages.");
        } catch (Exception e) {
            System.out.println("--> Schema update skipped or already applied: " + e.getMessage());
        }
    }
}
