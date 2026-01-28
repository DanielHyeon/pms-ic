package com.insuretech.pms.chat.service;

import com.insuretech.pms.chat.dto.ModelInfoResponse;
import com.insuretech.pms.chat.dto.OcrConfigResponse;
import com.insuretech.pms.common.client.WebClientErrorHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientException;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.nio.file.Path;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class LlmService {

    private final WebClient.Builder webClientBuilder;
    private final WebClientErrorHandler errorHandler;

    @Value("${ai.service.url}")
    private String aiServiceUrl;
    private static final String DEFAULT_MODEL_DIR = "/app/models";

    /**
     * 현재 사용 중인 모델 정보 조회
     */
    @SuppressWarnings({"unchecked", "null"})
    public ModelInfoResponse getCurrentModel() {
        try {
            WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

            Map<String, Object> response = webClient.get()
                    .uri("/api/model/current")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response != null) {
                return ModelInfoResponse.builder()
                        .currentModel(normalizeModelName((String) response.get("currentModel")))
                        .status(Objects.toString(response.getOrDefault("status", "active"), "active"))
                        .timestamp(System.currentTimeMillis())
                        .build();
            }

            throw new IllegalStateException("Failed to get current model info");
        } catch (Exception e) {
            log.error("Error getting current model: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to get current model information", e);
        }
    }

    /**
     * LLM 모델 변경
     */
    @SuppressWarnings({"unchecked", "null"})
    public ModelInfoResponse changeModel(String modelPath) {
        try {
            String resolvedModelPath = resolveModelPath(modelPath);
            log.info("Changing LLM model to: {} (resolved: {})", modelPath, resolvedModelPath);

            WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

            Map<String, Object> request = Map.of("modelPath", resolvedModelPath);

            try {
                Map<String, Object> response = webClient.put()
                        .uri("/api/model/change")
                        .bodyValue(request)
                        .retrieve()
                        .bodyToMono(Map.class)
                        .block();

                if (response != null && "success".equals(response.get("status"))) {
                    log.info("Successfully changed model to: {}", resolvedModelPath);
                    return ModelInfoResponse.builder()
                            .currentModel(normalizeModelName((String) response.get("currentModel")))
                            .status((String) response.get("status"))
                            .timestamp(System.currentTimeMillis())
                            .build();
                }

                String errorMessage = response != null ? 
                        (String) response.getOrDefault("message", response.getOrDefault("error", "Unknown error")) :
                        "No response from LLM service";
                log.error("Model change failed. Response: {}", response);
                throw new IllegalStateException("Model change failed: " + errorMessage);
            } catch (WebClientResponseException e) {
                String errorMessage = errorHandler.handleResponseException(e, "모델 변경");
                throw errorHandler.createException("모델 변경", errorMessage, e);
            } catch (WebClientException e) {
                String errorMessage = errorHandler.handleConnectionException(e, aiServiceUrl, "모델 변경");
                throw errorHandler.createException("모델 변경", errorMessage, e);
            }
        } catch (RuntimeException e) {
            // 이미 처리된 예외는 그대로 전달
            throw e;
        } catch (Exception e) {
            log.error("Error changing model to {}: {}", modelPath, e.getMessage(), e);
            throw new RuntimeException("모델 변경 실패: " + e.getMessage(), e);
        }
    }

    /**
     * LLM 서비스 헬스 체크
     */
    @SuppressWarnings("null")
    public Object checkHealth() {
        try {
            WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

            return webClient.get()
                    .uri("/health")
                    .retrieve()
                    .bodyToMono(Object.class)
                    .block();
        } catch (Exception e) {
            log.error("LLM service health check failed: {}", e.getMessage());
            return Map.of(
                    "status", "unhealthy",
                    "error", e.getMessage()
            );
        }
    }

    // ==================== Lightweight Model APIs ====================

    /**
     * 경량 모델 정보 조회
     */
    @SuppressWarnings({"unchecked", "null"})
    public ModelInfoResponse getLightweightModel() {
        try {
            WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

            Map<String, Object> response = webClient.get()
                    .uri("/api/model/lightweight")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response != null) {
                return ModelInfoResponse.builder()
                        .currentModel(normalizeModelName((String) response.get("currentModel")))
                        .status((String) response.getOrDefault("status", "active"))
                        .timestamp(System.currentTimeMillis())
                        .build();
            }

            throw new IllegalStateException("Failed to get lightweight model info");
        } catch (Exception e) {
            log.error("Error getting lightweight model: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to get lightweight model information", e);
        }
    }

    /**
     * 경량 모델 변경
     */
    @SuppressWarnings({"unchecked", "null"})
    public ModelInfoResponse changeLightweightModel(String modelPath) {
        try {
            String resolvedModelPath = resolveModelPath(modelPath);
            log.info("Changing lightweight model to: {} (resolved: {})", modelPath, resolvedModelPath);

            WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

            Map<String, Object> request = Map.of("modelPath", resolvedModelPath);

            Map<String, Object> response = webClient.put()
                    .uri("/api/model/lightweight")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response != null && "success".equals(response.get("status"))) {
                log.info("Successfully changed lightweight model to: {}", resolvedModelPath);
                return ModelInfoResponse.builder()
                        .currentModel(normalizeModelName((String) response.get("currentModel")))
                        .status((String) response.get("status"))
                        .timestamp(System.currentTimeMillis())
                        .build();
            }

            String errorMessage = response != null ?
                    (String) response.getOrDefault("message", response.getOrDefault("error", "Unknown error")) :
                    "No response from LLM service";
            throw new IllegalStateException("Lightweight model change failed: " + errorMessage);
        } catch (Exception e) {
            log.error("Error changing lightweight model to {}: {}", modelPath, e.getMessage(), e);
            throw new RuntimeException("경량 모델 변경 실패: " + e.getMessage(), e);
        }
    }

    // ==================== Medium Model APIs ====================

    /**
     * 중형 모델 정보 조회
     */
    @SuppressWarnings({"unchecked", "null"})
    public ModelInfoResponse getMediumModel() {
        try {
            WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

            Map<String, Object> response = webClient.get()
                    .uri("/api/model/medium")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response != null) {
                return ModelInfoResponse.builder()
                        .currentModel(normalizeModelName((String) response.get("currentModel")))
                        .status((String) response.getOrDefault("status", "active"))
                        .timestamp(System.currentTimeMillis())
                        .build();
            }

            throw new IllegalStateException("Failed to get medium model info");
        } catch (Exception e) {
            log.error("Error getting medium model: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to get medium model information", e);
        }
    }

    /**
     * 중형 모델 변경
     */
    @SuppressWarnings({"unchecked", "null"})
    public ModelInfoResponse changeMediumModel(String modelPath) {
        try {
            String resolvedModelPath = resolveModelPath(modelPath);
            log.info("Changing medium model to: {} (resolved: {})", modelPath, resolvedModelPath);

            WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

            Map<String, Object> request = Map.of("modelPath", resolvedModelPath);

            Map<String, Object> response = webClient.put()
                    .uri("/api/model/medium")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response != null && "success".equals(response.get("status"))) {
                log.info("Successfully changed medium model to: {}", resolvedModelPath);
                return ModelInfoResponse.builder()
                        .currentModel(normalizeModelName((String) response.get("currentModel")))
                        .status((String) response.get("status"))
                        .timestamp(System.currentTimeMillis())
                        .build();
            }

            String errorMessage = response != null ?
                    (String) response.getOrDefault("message", response.getOrDefault("error", "Unknown error")) :
                    "No response from LLM service";
            throw new IllegalStateException("Medium model change failed: " + errorMessage);
        } catch (Exception e) {
            log.error("Error changing medium model to {}: {}", modelPath, e.getMessage(), e);
            throw new RuntimeException("중형 모델 변경 실패: " + e.getMessage(), e);
        }
    }

    // ==================== OCR Configuration APIs ====================

    private static final Set<String> VALID_OCR_ENGINES = Set.of("varco", "paddle", "tesseract", "pypdf");

    /**
     * 현재 OCR 엔진 설정 조회
     */
    @SuppressWarnings({"unchecked", "null"})
    public OcrConfigResponse getCurrentOcrEngine() {
        try {
            WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

            Map<String, Object> response = webClient.get()
                    .uri("/api/ocr/current")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response != null) {
                return OcrConfigResponse.builder()
                        .ocrEngine((String) response.get("ocrEngine"))
                        .status((String) response.getOrDefault("status", "active"))
                        .timestamp(System.currentTimeMillis())
                        .build();
            }

            throw new IllegalStateException("Failed to get current OCR engine info");
        } catch (Exception e) {
            log.error("Error getting current OCR engine: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to get current OCR engine information", e);
        }
    }

    /**
     * OCR 엔진 변경
     */
    @SuppressWarnings({"unchecked", "null"})
    public OcrConfigResponse changeOcrEngine(String ocrEngine) {
        try {
            if (ocrEngine == null || !VALID_OCR_ENGINES.contains(ocrEngine.toLowerCase())) {
                throw new IllegalArgumentException(
                        "Invalid OCR engine: " + ocrEngine + ". Valid options: " + VALID_OCR_ENGINES);
            }

            String normalizedEngine = ocrEngine.toLowerCase();
            log.info("Changing OCR engine to: {}", normalizedEngine);

            WebClient webClient = webClientBuilder.baseUrl(aiServiceUrl).build();

            Map<String, Object> request = Map.of("ocrEngine", normalizedEngine);

            try {
                Map<String, Object> response = webClient.put()
                        .uri("/api/ocr/change")
                        .bodyValue(request)
                        .retrieve()
                        .bodyToMono(Map.class)
                        .block();

                if (response != null && "success".equals(response.get("status"))) {
                    log.info("Successfully changed OCR engine to: {}", normalizedEngine);
                    return OcrConfigResponse.builder()
                            .ocrEngine((String) response.get("ocrEngine"))
                            .status((String) response.get("status"))
                            .timestamp(System.currentTimeMillis())
                            .build();
                }

                String errorMessage = response != null ?
                        (String) response.getOrDefault("message", response.getOrDefault("error", "Unknown error")) :
                        "No response from LLM service";
                log.error("OCR engine change failed. Response: {}", response);
                throw new IllegalStateException("OCR engine change failed: " + errorMessage);
            } catch (WebClientResponseException e) {
                String errorMessage = errorHandler.handleResponseException(e, "OCR 엔진 변경");
                throw errorHandler.createException("OCR 엔진 변경", errorMessage, e);
            } catch (WebClientException e) {
                String errorMessage = errorHandler.handleConnectionException(e, aiServiceUrl, "OCR 엔진 변경");
                throw errorHandler.createException("OCR 엔진 변경", errorMessage, e);
            }
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error changing OCR engine to {}: {}", ocrEngine, e.getMessage(), e);
            throw new RuntimeException("OCR 엔진 변경 실패: " + e.getMessage(), e);
        }
    }

    private String normalizeModelName(String modelPath) {
        if (modelPath == null || modelPath.isBlank()) {
            return modelPath;
        }
        return Path.of(modelPath).getFileName().toString();
    }

    private String resolveModelPath(String modelPath) {
        if (modelPath == null) {
            return null;
        }
        String trimmed = modelPath.trim();
        if (trimmed.isEmpty()) {
            return trimmed;
        }
        if (trimmed.startsWith("/")) {
            return trimmed;
        }
        return DEFAULT_MODEL_DIR + "/" + trimmed;
    }
}
