package com.driverapp.userservice.config;

import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FlywayConfig {

    /**
     * Tự động chạy flyway.repair() để cập nhật lại checksum trong DB khớp với file migration mới,
     * sau đó chạy flyway.migrate() để áp dụng các migration tiếp theo.
     */
    @Bean
    public FlywayMigrationStrategy flywayMigrationStrategy() {
        return flyway -> {
            flyway.repair();
            flyway.migrate();
        };
    }
}
