package com.insuretech.pms.rfp.service;

import com.insuretech.pms.rfp.dto.ClassifyRfpResponse;
import com.insuretech.pms.rfp.dto.ExtractionResult;
import com.insuretech.pms.rfp.entity.ProcessingStatus;
import com.insuretech.pms.rfp.repository.RfpRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service for RFP-related LLM operations: extraction and classification.
 */
@Service
@Slf4j
public class RfpLlmService {

    private final WebClient webClient;
    private final RfpRepository rfpRepository;

    public RfpLlmService(
            @Value("${ai.service.url:http://llm-service:8000}") String llmServiceUrl,
            RfpRepository rfpRepository) {
        this.webClient = WebClient.builder()
                .baseUrl(llmServiceUrl)
                .build();
        this.rfpRepository = rfpRepository;
    }

    /**
     * Trigger async requirement extraction from RFP document.
     * Updates RFP status as extraction progresses.
     */
    @Async
    @Transactional
    public void extractRequirementsAsync(String rfpId, String projectId, String documentText) {
        log.info("Starting async requirement extraction for RFP: {}", rfpId);

        try {
            // Update status to extracting
            updateRfpStatus(rfpId, ProcessingStatus.EXTRACTING, "Requirement extraction in progress");

            // Call LLM service for extraction
            ExtractionResult result = callExtractionApi(documentText, rfpId, projectId);

            if (result != null && result.isSuccess()) {
                updateRfpStatus(rfpId, ProcessingStatus.COMPLETED,
                        String.format("Extracted %d requirements", result.getRequirementCount()));
                log.info("Requirement extraction completed for RFP: {}, count: {}", rfpId, result.getRequirementCount());
            } else {
                String errorMsg = result != null ? result.getError() : "Unknown error";
                updateRfpStatus(rfpId, ProcessingStatus.FAILED, errorMsg);
                log.error("Requirement extraction failed for RFP: {}: {}", rfpId, errorMsg);
            }

        } catch (Exception e) {
            log.error("Requirement extraction error for RFP: {}", rfpId, e);
            updateRfpStatus(rfpId, ProcessingStatus.FAILED, e.getMessage());
        }
    }

    /**
     * Classify requirements using AI.
     */
    @SuppressWarnings("unchecked")
    public ClassifyRfpResponse classifyRequirements(String rfpId, String projectId, String documentText) {
        log.info("Starting AI classification for RFP: {}", rfpId);

        try {
            Map<String, Object> request = new HashMap<>();
            request.put("prompt", buildClassificationPrompt(documentText));
            request.put("max_tokens", 1000);
            request.put("temperature", 0.3);

            Map<String, Object> response = webClient.post()
                    .uri("/api/chat/generate")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response != null && response.containsKey("data")) {
                Map<String, Object> data = (Map<String, Object>) response.get("data");
                return parseClassificationResponse(rfpId, data);
            }

            return ClassifyRfpResponse.builder()
                    .rfpId(rfpId)
                    .message("Classification completed but no data returned")
                    .build();

        } catch (Exception e) {
            log.error("AI classification failed for RFP: {}", rfpId, e);
            return ClassifyRfpResponse.builder()
                    .rfpId(rfpId)
                    .message("Classification failed: " + e.getMessage())
                    .build();
        }
    }

    @SuppressWarnings("unchecked")
    private ExtractionResult callExtractionApi(String documentText, String rfpId, String projectId) {
        try {
            Map<String, Object> request = new HashMap<>();
            request.put("document_text", documentText);
            request.put("rfp_id", rfpId);
            request.put("project_id", projectId);
            request.put("tenant_id", projectId);

            Map<String, Object> response = webClient.post()
                    .uri("/api/rfp/extract")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response != null) {
                boolean success = Boolean.TRUE.equals(response.get("success"));
                int count = 0;
                if (response.containsKey("requirements")) {
                    Object reqs = response.get("requirements");
                    if (reqs instanceof List) {
                        count = ((List<?>) reqs).size();
                    }
                }
                return ExtractionResult.builder()
                        .success(success)
                        .requirementCount(count)
                        .build();
            }

            return ExtractionResult.builder()
                    .success(false)
                    .error("No response from LLM service")
                    .build();

        } catch (Exception e) {
            log.error("Extraction API call failed: {}", e.getMessage());
            return ExtractionResult.builder()
                    .success(false)
                    .error(e.getMessage())
                    .build();
        }
    }

    private void updateRfpStatus(String rfpId, ProcessingStatus status, String message) {
        rfpRepository.findById(rfpId).ifPresent(rfp -> {
            rfp.setProcessingStatus(status);
            rfp.setProcessingMessage(message);
            rfpRepository.save(rfp);
        });
    }

    private String buildClassificationPrompt(String documentText) {
        return """
                Analyze the following RFP document and classify the requirements.
                Count requirements by category:
                - AI: AI/ML related requirements
                - SI: System Integration requirements
                - COMMON: Common/shared functionality
                - NON_FUNCTIONAL: Performance, security, scalability requirements

                Return a JSON object with counts:
                {"ai_count": N, "si_count": N, "common_count": N, "non_functional_count": N}

                Document:
                """ + truncateForPrompt(documentText, 3000);
    }

    private ClassifyRfpResponse parseClassificationResponse(String rfpId, Map<String, Object> data) {
        String content = (String) data.getOrDefault("content", "{}");

        // Parse JSON from response
        int aiCount = 0, siCount = 0, commonCount = 0, nfCount = 0;

        try {
            // Simple parsing - in production use Jackson
            if (content.contains("ai_count")) {
                aiCount = extractIntFromJson(content, "ai_count");
                siCount = extractIntFromJson(content, "si_count");
                commonCount = extractIntFromJson(content, "common_count");
                nfCount = extractIntFromJson(content, "non_functional_count");
            }
        } catch (Exception e) {
            log.warn("Failed to parse classification response: {}", e.getMessage());
        }

        return ClassifyRfpResponse.builder()
                .rfpId(rfpId)
                .aiCount(aiCount)
                .siCount(siCount)
                .commonCount(commonCount)
                .nonFunctionalCount(nfCount)
                .message("Requirements classified successfully")
                .build();
    }

    private int extractIntFromJson(String json, String key) {
        String pattern = "\"" + key + "\"\\s*:\\s*(\\d+)";
        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile(pattern).matcher(json);
        if (matcher.find()) {
            return Integer.parseInt(matcher.group(1));
        }
        return 0;
    }

    private String truncateForPrompt(String text, int maxLength) {
        if (text == null) return "";
        return text.length() <= maxLength ? text : text.substring(0, maxLength) + "...";
    }
}
