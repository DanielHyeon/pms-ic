package com.insuretech.pms.chat.service;

import com.insuretech.pms.chat.dto.ModelInfoResponse;
import com.insuretech.pms.chat.dto.OcrConfigResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.nio.file.Path;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class LlmService {

    private final WebClient.Builder webClientBuilder;

    @Value("${ai.service.url}")
    private String aiServiceUrl;
    private static final String DEFAULT_MODEL_DIR = "/app/models";

    /**
     * 현재 사용 중인 모델 정보 조회
     */
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
                        .status((String) response.getOrDefault("status", "active"))
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
            } catch (org.springframework.web.reactive.function.client.WebClientResponseException e) {
                log.error("WebClient error changing model to {}: Status={}, Body={}", 
                        modelPath, e.getStatusCode(), e.getResponseBodyAsString(), e);
                String errorBody = e.getResponseBodyAsString();
                String errorMessage = extractErrorMessage(errorBody);
                throw new RuntimeException("모델 변경 실패: " + errorMessage, e);
            } catch (org.springframework.web.reactive.function.client.WebClientException e) {
                // 연결 실패 등 네트워크 에러 처리
                String errorMsg = e.getMessage();
                if (errorMsg != null && errorMsg.contains("Connection refused")) {
                    errorMsg = String.format("LLM 서비스에 연결할 수 없습니다 (%s). 서비스가 실행 중인지 확인하세요. " +
                            "Docker를 사용하는 경우 'docker-compose up llm-service' 명령으로 서비스를 시작하세요.", aiServiceUrl);
                } else if (errorMsg != null && errorMsg.contains("timeout")) {
                    errorMsg = String.format("LLM 서비스 응답 시간 초과 (%s). 서비스가 정상적으로 동작하는지 확인하세요.", aiServiceUrl);
                } else if (errorMsg == null || errorMsg.isEmpty()) {
                    errorMsg = String.format("LLM 서비스 연결 실패 (%s)", aiServiceUrl);
                }
                log.error("WebClient connection error: {}", errorMsg, e);
                throw new RuntimeException("모델 변경 실패: " + errorMsg, e);
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
     * 에러 응답 본문에서 메시지 추출
     */
    private String extractErrorMessage(String errorBody) {
        if (errorBody == null || errorBody.isEmpty()) {
            return "알 수 없는 오류";
        }
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            java.util.Map<String, Object> errorMap = mapper.readValue(errorBody, java.util.Map.class);
            String message = (String) errorMap.getOrDefault("message", errorMap.getOrDefault("error", errorBody));
            return message != null && !message.isEmpty() ? message : "알 수 없는 오류";
        } catch (Exception e) {
            log.warn("Failed to parse error response: {}", errorBody);
            return errorBody.length() > 200 ? errorBody.substring(0, 200) + "..." : errorBody;
        }
    }

    /**
     * LLM 서비스 헬스 체크
     */
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
            } catch (org.springframework.web.reactive.function.client.WebClientResponseException e) {
                log.error("WebClient error changing OCR engine to {}: Status={}, Body={}",
                        ocrEngine, e.getStatusCode(), e.getResponseBodyAsString(), e);
                String errorBody = e.getResponseBodyAsString();
                String errorMessage = extractErrorMessage(errorBody);
                throw new RuntimeException("OCR 엔진 변경 실패: " + errorMessage, e);
            } catch (org.springframework.web.reactive.function.client.WebClientException e) {
                String errorMsg = e.getMessage();
                if (errorMsg != null && errorMsg.contains("Connection refused")) {
                    errorMsg = String.format("LLM 서비스에 연결할 수 없습니다 (%s). 서비스가 실행 중인지 확인하세요.", aiServiceUrl);
                } else if (errorMsg != null && errorMsg.contains("timeout")) {
                    errorMsg = String.format("LLM 서비스 응답 시간 초과 (%s).", aiServiceUrl);
                } else if (errorMsg == null || errorMsg.isEmpty()) {
                    errorMsg = String.format("LLM 서비스 연결 실패 (%s)", aiServiceUrl);
                }
                log.error("WebClient connection error: {}", errorMsg, e);
                throw new RuntimeException("OCR 엔진 변경 실패: " + errorMsg, e);
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
