package com.insuretech.pms.chat.service;

import com.insuretech.pms.common.client.WebClientErrorHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientException;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.util.Map;

/**
 * Reactive Service for Database Administration.
 * Proxies requests to the LLM service DB admin API for:
 * - Neo4j synchronization
 * - Database backup and restore
 * - Database statistics
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveDbAdminService {

    private final WebClient.Builder webClientBuilder;
    private final WebClientErrorHandler errorHandler;

    @Value("${ai.service.url}")
    private String aiServiceUrl;

    // ============================================
    // Sync Operations
    // ============================================

    /**
     * Trigger PostgreSQL to Neo4j synchronization
     */
    public Mono<Map<String, Object>> triggerSync(String syncType, String triggeredBy) {
        WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

        Map<String, Object> request = Map.of(
                "sync_type", syncType != null ? syncType : "full",
                "triggered_by", triggeredBy != null ? triggeredBy : "admin"
        );

        return webClient.post()
                .uri("/api/admin/db/sync")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .onErrorResume(WebClientResponseException.class, e -> {
                    String errorMessage = errorHandler.handleResponseException(e, "Neo4j sync trigger");
                    return Mono.error(errorHandler.createException("Neo4j sync trigger", errorMessage, e));
                })
                .onErrorResume(WebClientException.class, e -> {
                    String errorMessage = errorHandler.handleConnectionException(e, aiServiceUrl, "Neo4j sync trigger");
                    return Mono.error(errorHandler.createException("Neo4j sync trigger", errorMessage, e));
                });
    }

    /**
     * Get current sync status
     */
    public Mono<Map<String, Object>> getSyncStatus() {
        WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

        return webClient.get()
                .uri("/api/admin/db/sync/status")
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .onErrorResume(WebClientResponseException.class, e -> {
                    String errorMessage = errorHandler.handleResponseException(e, "Sync status query");
                    return Mono.error(errorHandler.createException("Sync status query", errorMessage, e));
                })
                .onErrorResume(WebClientException.class, e -> {
                    String errorMessage = errorHandler.handleConnectionException(e, aiServiceUrl, "Sync status query");
                    return Mono.error(errorHandler.createException("Sync status query", errorMessage, e));
                });
    }

    /**
     * Get sync history
     */
    public Mono<Map<String, Object>> getSyncHistory(int limit) {
        WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

        return webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/admin/db/sync/history")
                        .queryParam("limit", limit)
                        .build())
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .onErrorResume(WebClientResponseException.class, e -> {
                    String errorMessage = errorHandler.handleResponseException(e, "Sync history query");
                    return Mono.error(errorHandler.createException("Sync history query", errorMessage, e));
                })
                .onErrorResume(WebClientException.class, e -> {
                    String errorMessage = errorHandler.handleConnectionException(e, aiServiceUrl, "Sync history query");
                    return Mono.error(errorHandler.createException("Sync history query", errorMessage, e));
                });
    }

    // ============================================
    // Backup Operations
    // ============================================

    /**
     * Create a database backup
     */
    public Mono<Map<String, Object>> createBackup(String backupType, String createdBy) {
        WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

        Map<String, Object> request = Map.of(
                "backup_type", backupType != null ? backupType : "FULL",
                "created_by", createdBy != null ? createdBy : "admin"
        );

        return webClient.post()
                .uri("/api/admin/db/backup")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .onErrorResume(WebClientResponseException.class, e -> {
                    String errorMessage = errorHandler.handleResponseException(e, "Backup creation");
                    return Mono.error(errorHandler.createException("Backup creation", errorMessage, e));
                })
                .onErrorResume(WebClientException.class, e -> {
                    String errorMessage = errorHandler.handleConnectionException(e, aiServiceUrl, "Backup creation");
                    return Mono.error(errorHandler.createException("Backup creation", errorMessage, e));
                });
    }

    /**
     * Get current backup status
     */
    public Mono<Map<String, Object>> getBackupStatus() {
        WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

        return webClient.get()
                .uri("/api/admin/db/backup/status")
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .onErrorResume(WebClientResponseException.class, e -> {
                    String errorMessage = errorHandler.handleResponseException(e, "Backup status query");
                    return Mono.error(errorHandler.createException("Backup status query", errorMessage, e));
                })
                .onErrorResume(WebClientException.class, e -> {
                    String errorMessage = errorHandler.handleConnectionException(e, aiServiceUrl, "Backup status query");
                    return Mono.error(errorHandler.createException("Backup status query", errorMessage, e));
                });
    }

    /**
     * List all backups
     */
    public Mono<Map<String, Object>> listBackups(int limit) {
        WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

        return webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/admin/db/backups")
                        .queryParam("limit", limit)
                        .build())
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .onErrorResume(WebClientResponseException.class, e -> {
                    String errorMessage = errorHandler.handleResponseException(e, "Backup list query");
                    return Mono.error(errorHandler.createException("Backup list query", errorMessage, e));
                })
                .onErrorResume(WebClientException.class, e -> {
                    String errorMessage = errorHandler.handleConnectionException(e, aiServiceUrl, "Backup list query");
                    return Mono.error(errorHandler.createException("Backup list query", errorMessage, e));
                });
    }

    /**
     * Restore from a backup
     */
    public Mono<Map<String, Object>> restoreBackup(String backupId) {
        WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

        Map<String, Object> request = Map.of("confirm", true);

        return webClient.post()
                .uri("/api/admin/db/restore/{backupId}", backupId)
                .bodyValue(request)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .onErrorResume(WebClientResponseException.class, e -> {
                    String errorMessage = errorHandler.handleResponseException(e, "Backup restore");
                    return Mono.error(errorHandler.createException("Backup restore", errorMessage, e));
                })
                .onErrorResume(WebClientException.class, e -> {
                    String errorMessage = errorHandler.handleConnectionException(e, aiServiceUrl, "Backup restore");
                    return Mono.error(errorHandler.createException("Backup restore", errorMessage, e));
                });
    }

    /**
     * Delete a backup
     */
    public Mono<Map<String, Object>> deleteBackup(String backupId) {
        WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

        return webClient.delete()
                .uri("/api/admin/db/backups/{backupId}", backupId)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .onErrorResume(WebClientResponseException.class, e -> {
                    String errorMessage = errorHandler.handleResponseException(e, "Backup delete");
                    return Mono.error(errorHandler.createException("Backup delete", errorMessage, e));
                })
                .onErrorResume(WebClientException.class, e -> {
                    String errorMessage = errorHandler.handleConnectionException(e, aiServiceUrl, "Backup delete");
                    return Mono.error(errorHandler.createException("Backup delete", errorMessage, e));
                });
    }

    // ============================================
    // Statistics
    // ============================================

    /**
     * Get database statistics
     */
    public Mono<Map<String, Object>> getDatabaseStats() {
        WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

        return webClient.get()
                .uri("/api/admin/db/stats")
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .onErrorResume(WebClientResponseException.class, e -> {
                    String errorMessage = errorHandler.handleResponseException(e, "Database stats query");
                    return Mono.error(errorHandler.createException("Database stats query", errorMessage, e));
                })
                .onErrorResume(WebClientException.class, e -> {
                    String errorMessage = errorHandler.handleConnectionException(e, aiServiceUrl, "Database stats query");
                    return Mono.error(errorHandler.createException("Database stats query", errorMessage, e));
                });
    }
}
