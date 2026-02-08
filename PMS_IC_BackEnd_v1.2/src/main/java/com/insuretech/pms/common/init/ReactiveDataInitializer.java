package com.insuretech.pms.common.init;

import io.r2dbc.spi.ConnectionFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.r2dbc.connection.init.ConnectionFactoryInitializer;
import org.springframework.r2dbc.connection.init.ResourceDatabasePopulator;
import org.springframework.r2dbc.core.DatabaseClient;
import reactor.core.publisher.Mono;

/**
 * Reactive Database Initializer for R2DBC
 *
 * Handles schema creation and sample data loading for development/test environments.
 * In production, use database migrations (Flyway/Liquibase) instead.
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class ReactiveDataInitializer {

    @Value("${spring.r2dbc.url:}")
    private String r2dbcUrl;

    /**
     * Schema initializer - Creates database schema on startup
     * Active only in dev and test profiles
     */
    @Bean
    @Profile({"dev", "test"})
    public ConnectionFactoryInitializer schemaInitializer(ConnectionFactory connectionFactory) {
        log.info("Initializing database schema for dev/test profile");

        ConnectionFactoryInitializer initializer = new ConnectionFactoryInitializer();
        initializer.setConnectionFactory(connectionFactory);

        ResourceDatabasePopulator populator = new ResourceDatabasePopulator();
        populator.addScript(new ClassPathResource("schema.sql"));
        populator.setContinueOnError(true);

        initializer.setDatabasePopulator(populator);

        return initializer;
    }

    /**
     * Data initializer - Loads sample data after schema creation
     * Active only in dev profile (not test to avoid polluting test data)
     * Always runs since data.sql uses ON CONFLICT DO UPDATE (idempotent)
     */
    @Bean
    @Profile("dev")
    public CommandLineRunner dataInitializer(DatabaseClient databaseClient) {
        return args -> {
            log.info("Starting sample data initialization (idempotent - ON CONFLICT DO UPDATE)...");
            loadSampleData(databaseClient)
                .doOnSuccess(v -> log.info("Data initialization completed"))
                .doOnError(e -> log.error("Data initialization failed: {}", e.getMessage()))
                .subscribe();
        };
    }

    private Mono<Void> loadSampleData(DatabaseClient databaseClient) {
        try {
            ClassPathResource resource = new ClassPathResource("data.sql");
            if (!resource.exists()) {
                log.warn("data.sql not found, skipping sample data load");
                return Mono.empty();
            }

            String sql = new String(resource.getInputStream().readAllBytes());

            // Split SQL statements and execute them
            String[] statements = sql.split(";\\s*\\n");

            Mono<Void> chain = Mono.empty();
            for (String statement : statements) {
                String trimmed = statement.trim();
                if (!trimmed.isEmpty() && !trimmed.startsWith("--")) {
                    chain = chain.then(
                        databaseClient.sql(trimmed)
                            .then()
                            .onErrorResume(e -> {
                                // Log but continue on conflict errors (expected with ON CONFLICT)
                                if (e.getMessage() != null &&
                                    (e.getMessage().contains("duplicate key") ||
                                     e.getMessage().contains("already exists"))) {
                                    log.debug("Skipping duplicate: {}", e.getMessage());
                                    return Mono.empty();
                                }
                                log.warn("SQL execution warning: {}", e.getMessage());
                                return Mono.empty();
                            })
                    );
                }
            }

            return chain;
        } catch (Exception e) {
            log.error("Failed to load sample data: {}", e.getMessage());
            return Mono.error(e);
        }
    }

    /**
     * Health check for database connectivity
     */
    @Bean
    @Profile({"dev", "test"})
    public CommandLineRunner databaseHealthCheck(DatabaseClient databaseClient) {
        return args -> {
            databaseClient.sql("SELECT 1")
                .fetch()
                .one()
                .doOnSuccess(r -> log.info("Database connection verified successfully"))
                .doOnError(e -> log.error("Database connection failed: {}", e.getMessage()))
                .subscribe();
        };
    }
}
