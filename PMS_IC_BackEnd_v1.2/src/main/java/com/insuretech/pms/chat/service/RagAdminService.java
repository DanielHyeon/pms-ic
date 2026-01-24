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

import java.util.List;
import java.util.Map;

/**
 * Service for RAG (Retrieval-Augmented Generation) knowledge base administration.
 * Proxies requests to the LLM service RAG admin API.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RagAdminService {

    private final WebClient.Builder webClientBuilder;
    private final WebClientErrorHandler errorHandler;

    @Value("${ai.service.url}")
    private String aiServiceUrl;

    /**
     * Get list of all documents in RAG knowledge base
     */
    public Map<String, Object> listDocuments() {
        try {
            WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

            return webClient.get()
                    .uri("/api/admin/rag/documents")
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

        } catch (WebClientResponseException e) {
            String errorMessage = errorHandler.handleResponseException(e, "RAG 문서 목록 조회");
            throw errorHandler.createException("RAG 문서 목록 조회", errorMessage, e);
        } catch (WebClientException e) {
            String errorMessage = errorHandler.handleConnectionException(e, aiServiceUrl, "RAG 문서 목록 조회");
            throw errorHandler.createException("RAG 문서 목록 조회", errorMessage, e);
        }
    }

    /**
     * Get RAG knowledge base statistics
     */
    public Map<String, Object> getStats() {
        try {
            WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

            return webClient.get()
                    .uri("/api/admin/rag/stats")
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

        } catch (WebClientResponseException e) {
            String errorMessage = errorHandler.handleResponseException(e, "RAG 통계 조회");
            throw errorHandler.createException("RAG 통계 조회", errorMessage, e);
        } catch (WebClientException e) {
            String errorMessage = errorHandler.handleConnectionException(e, aiServiceUrl, "RAG 통계 조회");
            throw errorHandler.createException("RAG 통계 조회", errorMessage, e);
        }
    }

    /**
     * Get list of available PDF files that can be loaded
     */
    public Map<String, Object> listAvailableFiles() {
        try {
            WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

            return webClient.get()
                    .uri("/api/admin/rag/files")
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

        } catch (WebClientResponseException e) {
            String errorMessage = errorHandler.handleResponseException(e, "RAG 파일 목록 조회");
            throw errorHandler.createException("RAG 파일 목록 조회", errorMessage, e);
        } catch (WebClientException e) {
            String errorMessage = errorHandler.handleConnectionException(e, aiServiceUrl, "RAG 파일 목록 조회");
            throw errorHandler.createException("RAG 파일 목록 조회", errorMessage, e);
        }
    }

    /**
     * Trigger loading of PDF files into RAG
     */
    public Map<String, Object> loadDocuments(List<String> files, boolean clearExisting) {
        try {
            WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

            Map<String, Object> request = Map.of(
                    "files", files != null ? files : List.of(),
                    "clear_existing", clearExisting
            );

            return webClient.post()
                    .uri("/api/admin/rag/load")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

        } catch (WebClientResponseException e) {
            String errorMessage = errorHandler.handleResponseException(e, "RAG 문서 로드");
            throw errorHandler.createException("RAG 문서 로드", errorMessage, e);
        } catch (WebClientException e) {
            String errorMessage = errorHandler.handleConnectionException(e, aiServiceUrl, "RAG 문서 로드");
            throw errorHandler.createException("RAG 문서 로드", errorMessage, e);
        }
    }

    /**
     * Get current loading status
     */
    public Map<String, Object> getLoadingStatus() {
        try {
            WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

            return webClient.get()
                    .uri("/api/admin/rag/load/status")
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

        } catch (WebClientResponseException e) {
            String errorMessage = errorHandler.handleResponseException(e, "RAG 로딩 상태 조회");
            throw errorHandler.createException("RAG 로딩 상태 조회", errorMessage, e);
        } catch (WebClientException e) {
            String errorMessage = errorHandler.handleConnectionException(e, aiServiceUrl, "RAG 로딩 상태 조회");
            throw errorHandler.createException("RAG 로딩 상태 조회", errorMessage, e);
        }
    }

    /**
     * Delete a specific document from RAG
     */
    public Map<String, Object> deleteDocument(String docId) {
        try {
            WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

            return webClient.delete()
                    .uri("/api/admin/rag/documents/{docId}", docId)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

        } catch (WebClientResponseException e) {
            String errorMessage = errorHandler.handleResponseException(e, "RAG 문서 삭제");
            throw errorHandler.createException("RAG 문서 삭제", errorMessage, e);
        } catch (WebClientException e) {
            String errorMessage = errorHandler.handleConnectionException(e, aiServiceUrl, "RAG 문서 삭제");
            throw errorHandler.createException("RAG 문서 삭제", errorMessage, e);
        }
    }

    /**
     * Clear all documents from RAG
     */
    public Map<String, Object> clearAllDocuments() {
        try {
            WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

            Map<String, Object> request = Map.of("confirm", true);

            return webClient.method(org.springframework.http.HttpMethod.DELETE)
                    .uri("/api/admin/rag/documents")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

        } catch (WebClientResponseException e) {
            String errorMessage = errorHandler.handleResponseException(e, "RAG 전체 삭제");
            throw errorHandler.createException("RAG 전체 삭제", errorMessage, e);
        } catch (WebClientException e) {
            String errorMessage = errorHandler.handleConnectionException(e, aiServiceUrl, "RAG 전체 삭제");
            throw errorHandler.createException("RAG 전체 삭제", errorMessage, e);
        }
    }
}
