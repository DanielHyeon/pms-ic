package com.insuretech.pms.report.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.HashMap;
import java.util.Map;

/**
 * Client for LLM service communication
 */
@Service
@Slf4j
public class LlmServiceClient {

    private final WebClient webClient;
    private final String modelName;

    public LlmServiceClient(
            @Value("${ai.service.url:http://llm-service:8000}") String llmServiceUrl,
            @Value("${ai.model.name:gemma-3-12b}") String modelName) {
        this.webClient = WebClient.builder()
                .baseUrl(llmServiceUrl)
                .build();
        this.modelName = modelName;
    }

    /**
     * Generate content using LLM
     */
    public String generateContent(String prompt, Map<String, Object> context, String userRole) {
        try {
            Map<String, Object> request = new HashMap<>();
            request.put("prompt", prompt);
            request.put("context", context);
            request.put("user_role", userRole);
            request.put("max_tokens", 500);
            request.put("temperature", 0.7);

            Map<String, Object> response = webClient.post()
                    .uri("/api/report/generate-section")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response != null && response.containsKey("data")) {
                @SuppressWarnings("unchecked")
                Map<String, Object> data = (Map<String, Object>) response.get("data");
                return (String) data.getOrDefault("content", "");
            }

            return "";
        } catch (Exception e) {
            log.error("LLM content generation failed: {}", e.getMessage());
            return "Failed to generate content: " + e.getMessage();
        }
    }

    /**
     * Generate executive summary
     */
    public String generateExecutiveSummary(Map<String, Object> reportData, String userRole) {
        String prompt = buildExecutiveSummaryPrompt(userRole);
        return generateContent(prompt, reportData, userRole);
    }

    /**
     * Convert natural language to SQL
     */
    public Map<String, Object> textToSql(String question, String projectId, String userRole, String userId) {
        try {
            Map<String, Object> request = new HashMap<>();
            request.put("question", question);
            request.put("project_id", projectId);
            request.put("user_role", userRole);
            request.put("user_id", userId);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = webClient.post()
                    .uri("/api/report/text-to-sql")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            return response;
        } catch (Exception e) {
            log.error("TextToSQL conversion failed: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", e.getMessage());
            return errorResponse;
        }
    }

    public String getModelName() {
        return modelName;
    }

    private String buildExecutiveSummaryPrompt(String userRole) {
        return switch (userRole) {
            case "sponsor", "pmo_head" -> """
                Generate an executive summary for senior leadership focusing on:
                - Overall project health and status
                - Key achievements and milestones
                - Strategic risks and mitigation
                - Budget and resource status
                Keep it concise (3-4 paragraphs) and business-focused.
                """;
            case "pm" -> """
                Generate a project manager summary focusing on:
                - Sprint/iteration progress
                - Team performance metrics
                - Blockers and resolution status
                - Next period priorities
                Keep it actionable and detailed.
                """;
            case "team_lead" -> """
                Generate a team summary focusing on:
                - Team member contributions
                - Completed and in-progress work
                - Team blockers and dependencies
                - Resource allocation
                """;
            default -> """
                Generate a work summary focusing on:
                - Completed tasks and achievements
                - Current work in progress
                - Any blockers or issues
                - Next steps and priorities
                """;
        };
    }
}
