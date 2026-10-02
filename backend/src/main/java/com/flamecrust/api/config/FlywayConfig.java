package com.flamecrust.api.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name = "spring.flyway.enabled", havingValue = "true", matchIfMissing = true)
public class FlywayConfig {

    @Bean
    public FlywayMigrationStrategy flywayMigrationStrategy() {
        return flyway -> {
            try {
                System.out.println("--> Running Flyway repair...");
                flyway.repair();
                System.out.println("--> Flyway repair completed.");
            } catch (Exception e) {
                System.out.println("--> Flyway repair skipped: " + e.getMessage());
            }
            try {
                System.out.println("--> Running Flyway migrate...");
                flyway.migrate();
                System.out.println("--> Flyway migration completed successfully!");
            } catch (Exception e) {
                System.err.println("--> Flyway migration error: " + e.getMessage());
                throw e;
            }
        };
    }
}
