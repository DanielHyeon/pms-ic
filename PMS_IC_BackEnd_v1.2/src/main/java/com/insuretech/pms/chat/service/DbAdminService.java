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

import java.util.Map;

/**
 * Service for Database Administration.
 * Proxies requests to the LLM service DB admin API for:
 * - Neo4j synchronization
 * - Database backup and restore
 * - Database statistics
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DbAdminService {

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
    public Map<String, Object> triggerSync(String syncType, String triggeredBy) {
        try {
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
                    .block();

        } catch (WebClientResponseException e) {
            String errorMessage = errorHandler.handleResponseException(e, "Neo4j 동기화 시작");
            throw errorHandler.createException("Neo4j 동기화 시작", errorMessage, e);
        } catch (WebClientException e) {
            String errorMessage = errorHandler.handleConnectionException(e, aiServiceUrl, "Neo4j 동기화 시작");
            throw errorHandler.createException("Neo4j 동기화 시작", errorMessage, e);
        }
    }

    /**
     * Get current sync status
     */
    public Map<String, Object> getSyncStatus() {
        try {
            WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

            return webClient.get()
                    .uri("/api/admin/db/sync/status")
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

        } catch (WebClientResponseException e) {
            String errorMessage = errorHandler.handleResponseException(e, "동기화 상태 조회");
            throw errorHandler.createException("동기화 상태 조회", errorMessage, e);
        } catch (WebClientException e) {
            String errorMessage = errorHandler.handleConnectionException(e, aiServiceUrl, "동기화 상태 조회");
            throw errorHandler.createException("동기화 상태 조회", errorMessage, e);
        }
    }

    /**
     * Get sync history
     */
    public Map<String, Object> getSyncHistory(int limit) {
        try {
            WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

            return webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/admin/db/sync/history")
                            .queryParam("limit", limit)
                            .build())
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

        } catch (WebClientResponseException e) {
            String errorMessage = errorHandler.handleResponseException(e, "동기화 히스토리 조회");
            throw errorHandler.createException("동기화 히스토리 조회", errorMessage, e);
        } catch (WebClientException e) {
            String errorMessage = errorHandler.handleConnectionException(e, aiServiceUrl, "동기화 히스토리 조회");
            throw errorHandler.createException("동기화 히스토리 조회", errorMessage, e);
        }
    }

    // ============================================
    // Backup Operations
    // ============================================

    /**
     * Create a database backup
     */
    public Map<String, Object> createBackup(String backupType, String createdBy) {
        try {
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
                    .block();

        } catch (WebClientResponseException e) {
            String errorMessage = errorHandler.handleResponseException(e, "백업 생성");
            throw errorHandler.createException("백업 생성", errorMessage, e);
        } catch (WebClientException e) {
            String errorMessage = errorHandler.handleConnectionException(e, aiServiceUrl, "백업 생성");
            throw errorHandler.createException("백업 생성", errorMessage, e);
        }
    }

    /**
     * Get current backup status
     */
    public Map<String, Object> getBackupStatus() {
        try {
            WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

            return webClient.get()
                    .uri("/api/admin/db/backup/status")
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

        } catch (WebClientResponseException e) {
            String errorMessage = errorHandler.handleResponseException(e, "백업 상태 조회");
            throw errorHandler.createException("백업 상태 조회", errorMessage, e);
        } catch (WebClientException e) {
            String errorMessage = errorHandler.handleConnectionException(e, aiServiceUrl, "백업 상태 조회");
            throw errorHandler.createException("백업 상태 조회", errorMessage, e);
        }
    }

    /**
     * List all backups
     */
    public Map<String, Object> listBackups(int limit) {
        try {
            WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

            return webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/admin/db/backups")
                            .queryParam("limit", limit)
                            .build())
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

        } catch (WebClientResponseException e) {
            String errorMessage = errorHandler.handleResponseException(e, "백업 목록 조회");
            throw errorHandler.createException("백업 목록 조회", errorMessage, e);
        } catch (WebClientException e) {
            String errorMessage = errorHandler.handleConnectionException(e, aiServiceUrl, "백업 목록 조회");
            throw errorHandler.createException("백업 목록 조회", errorMessage, e);
        }
    }

    /**
     * Restore from a backup
     */
    public Map<String, Object> restoreBackup(String backupId) {
        try {
            WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

            Map<String, Object> request = Map.of("confirm", true);

            return webClient.post()
                    .uri("/api/admin/db/restore/{backupId}", backupId)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

        } catch (WebClientResponseException e) {
            String errorMessage = errorHandler.handleResponseException(e, "백업 복원");
            throw errorHandler.createException("백업 복원", errorMessage, e);
        } catch (WebClientException e) {
            String errorMessage = errorHandler.handleConnectionException(e, aiServiceUrl, "백업 복원");
            throw errorHandler.createException("백업 복원", errorMessage, e);
        }
    }

    /**
     * Delete a backup
     */
    public Map<String, Object> deleteBackup(String backupId) {
        try {
            WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

            return webClient.delete()
                    .uri("/api/admin/db/backups/{backupId}", backupId)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

        } catch (WebClientResponseException e) {
            String errorMessage = errorHandler.handleResponseException(e, "백업 삭제");
            throw errorHandler.createException("백업 삭제", errorMessage, e);
        } catch (WebClientException e) {
            String errorMessage = errorHandler.handleConnectionException(e, aiServiceUrl, "백업 삭제");
            throw errorHandler.createException("백업 삭제", errorMessage, e);
        }
    }

    // ============================================
    // Statistics
    // ============================================

    /**
     * Get database statistics
     */
    public Map<String, Object> getDatabaseStats() {
        try {
            WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

            return webClient.get()
                    .uri("/api/admin/db/stats")
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

        } catch (WebClientResponseException e) {
            String errorMessage = errorHandler.handleResponseException(e, "데이터베이스 통계 조회");
            throw errorHandler.createException("데이터베이스 통계 조회", errorMessage, e);
        } catch (WebClientException e) {
            String errorMessage = errorHandler.handleConnectionException(e, aiServiceUrl, "데이터베이스 통계 조회");
            throw errorHandler.createException("데이터베이스 통계 조회", errorMessage, e);
        }
    }
}
