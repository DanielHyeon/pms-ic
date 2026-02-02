package com.insuretech.pms.lineage.config;

import lombok.extern.slf4j.Slf4j;
import org.neo4j.driver.AuthTokens;
import org.neo4j.driver.Config;
import org.neo4j.driver.Driver;
import org.neo4j.driver.GraphDatabase;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * Neo4j Driver configuration for lineage graph queries.
 * Provides a singleton Driver instance for efficient connection pooling.
 */
@Slf4j
@Configuration
public class Neo4jConfig {

    @Value("${neo4j.uri:bolt://localhost:7687}")
    private String uri;

    @Value("${neo4j.username:neo4j}")
    private String username;

    @Value("${neo4j.password:pmspassword123}")
    private String password;

    @Value("${neo4j.connection-timeout:30s}")
    private Duration connectionTimeout;

    @Value("${neo4j.max-connection-pool-size:50}")
    private int maxConnectionPoolSize;

    @Bean
    public Driver neo4jDriver() {
        log.info("Initializing Neo4j driver with URI: {}", uri);

        Config config = Config.builder()
                .withConnectionTimeout(connectionTimeout.toSeconds(), TimeUnit.SECONDS)
                .withMaxConnectionPoolSize(maxConnectionPoolSize)
                .withConnectionLivenessCheckTimeout(5, TimeUnit.MINUTES)
                .build();

        Driver driver = GraphDatabase.driver(uri, AuthTokens.basic(username, password), config);

        // Verify connectivity
        try {
            driver.verifyConnectivity();
            log.info("Neo4j connection verified successfully");
        } catch (Exception e) {
            log.warn("Neo4j connection verification failed: {}. Lineage queries will use fallback.", e.getMessage());
        }

        return driver;
    }
}
