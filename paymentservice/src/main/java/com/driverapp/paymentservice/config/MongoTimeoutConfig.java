package com.driverapp.paymentservice.config;

import java.util.concurrent.TimeUnit;
import org.springframework.boot.mongodb.autoconfigure.MongoClientSettingsBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;

@Configuration
public class MongoTimeoutConfig {
    @Bean
    MongoClientSettingsBuilderCustomizer mongoTimeouts(
            @Value("${resilience.mongo.selection-ms:1000}") int selection,
            @Value("${resilience.mongo.socket-ms:2000}") int socket,
            @Value("${resilience.mongo.pool-wait-ms:500}") int wait) {
        if (selection <= 0 || socket <= 0 || wait <= 0) throw new IllegalArgumentException("Mongo timeouts must be positive");
        return builder -> builder
                .applyToClusterSettings(s -> s.serverSelectionTimeout(selection, TimeUnit.MILLISECONDS))
                .applyToSocketSettings(s -> s.connectTimeout(300, TimeUnit.MILLISECONDS).readTimeout(socket, TimeUnit.MILLISECONDS))
                .applyToConnectionPoolSettings(s -> s.maxWaitTime(wait, TimeUnit.MILLISECONDS).maxSize(30));
    }
}
