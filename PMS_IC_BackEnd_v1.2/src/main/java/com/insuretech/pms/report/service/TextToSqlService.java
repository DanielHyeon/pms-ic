package com.insuretech.pms.report.service;

import com.insuretech.pms.report.dto.TextToSqlRequest;
import com.insuretech.pms.report.dto.TextToSqlResponse;
import com.insuretech.pms.report.entity.TextToSqlLog;
import com.insuretech.pms.report.repository.TextToSqlLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Service for converting natural language to SQL and executing queries
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TextToSqlService {

    private final LlmServiceClient llmClient;
    private final JdbcTemplate jdbcTemplate;
    private final TextToSqlLogRepository logRepository;

    // Dangerous SQL patterns
    private static final Pattern DANGEROUS_PATTERNS = Pattern.compile(
            "(?i)(DROP|DELETE|TRUNCATE|ALTER|CREATE|INSERT|UPDATE|GRANT|REVOKE|EXEC|EXECUTE|xp_|sp_)",
            Pattern.CASE_INSENSITIVE
    );

    /**
     * Process a natural language question and convert to SQL
     */
    @Transactional
    public TextToSqlResponse processQuestion(TextToSqlRequest request, String userId, String userRole) {
        long startTime = System.currentTimeMillis();
        TextToSqlLog logEntry = new TextToSqlLog();
        logEntry.setUserId(userId);
        logEntry.setProjectId(request.getProjectId());
        logEntry.setUserRole(userRole);
        logEntry.setNaturalLanguageQuery(request.getQuestion());

        try {
            // 1. Generate SQL using LLM
            long llmStart = System.currentTimeMillis();
            Map<String, Object> llmResponse = llmClient.textToSql(
                    request.getQuestion(),
                    request.getProjectId(),
                    userRole,
                    userId
            );
            int generationMs = (int) (System.currentTimeMillis() - llmStart);

            String generatedSql = (String) llmResponse.get("sql");
            String explanation = (String) llmResponse.get("explanation");
            BigDecimal confidence = llmResponse.get("confidence") != null ?
                    new BigDecimal(llmResponse.get("confidence").toString()) : BigDecimal.ZERO;

            logEntry.setGeneratedSql(generatedSql);
            logEntry.setSqlExplanation(explanation);
            logEntry.setLlmConfidence(confidence);
            logEntry.setGenerationMs(generationMs);
            logEntry.setLlmModel(llmClient.getModelName());

            // 2. Sanitize SQL
            SqlSanitizationResult sanitization = sanitizeSql(generatedSql, request.getProjectId());
            logEntry.setSanitizationNotes(sanitization.notes);
            logEntry.setWasSanitized(sanitization.wasSanitized);

            if (!sanitization.isValid) {
                logEntry.setExecutionStatus("REJECTED");
                logEntry.setErrorMessage(sanitization.errorMessage);
                logRepository.save(logEntry);

                return TextToSqlResponse.builder()
                        .success(false)
                        .sql(generatedSql)
                        .explanation(explanation)
                        .confidence(confidence)
                        .wasSanitized(true)
                        .sanitizationNotes(sanitization.errorMessage)
                        .errorMessage("Query was blocked for security reasons")
                        .errorCode("SECURITY_BLOCK")
                        .generationMs(generationMs)
                        .build();
            }

            // 3. Execute if requested
            List<Map<String, Object>> results = Collections.emptyList();
            int executionMs = 0;
            if (Boolean.TRUE.equals(request.getExecuteQuery())) {
                long execStart = System.currentTimeMillis();
                results = executeQuery(sanitization.sanitizedSql, request.getMaxRows());
                executionMs = (int) (System.currentTimeMillis() - execStart);
                logEntry.setExecutionMs(executionMs);
                logEntry.setResultCount(results.size());
            }

            logEntry.setExecutionStatus("SUCCESS");
            logRepository.save(logEntry);

            return TextToSqlResponse.builder()
                    .success(true)
                    .sql(sanitization.sanitizedSql)
                    .explanation(explanation)
                    .confidence(confidence)
                    .results(results)
                    .resultCount(results.size())
                    .wasSanitized(sanitization.wasSanitized)
                    .sanitizationNotes(sanitization.notes)
                    .generationMs(generationMs)
                    .executionMs(executionMs)
                    .build();

        } catch (Exception e) {
            log.error("TextToSQL processing failed: {}", e.getMessage(), e);
            logEntry.setExecutionStatus("FAILED");
            logEntry.setErrorMessage(e.getMessage());
            logRepository.save(logEntry);

            return TextToSqlResponse.builder()
                    .success(false)
                    .errorMessage(e.getMessage())
                    .errorCode("PROCESSING_ERROR")
                    .generationMs((int) (System.currentTimeMillis() - startTime))
                    .build();
        }
    }

    /**
     * Sanitize SQL query for security
     */
    private SqlSanitizationResult sanitizeSql(String sql, String projectId) {
        SqlSanitizationResult result = new SqlSanitizationResult();
        result.sanitizedSql = sql;
        result.isValid = true;
        result.wasSanitized = false;

        if (sql == null || sql.trim().isEmpty()) {
            result.isValid = false;
            result.errorMessage = "Empty SQL query";
            return result;
        }

        // Check for dangerous patterns
        if (DANGEROUS_PATTERNS.matcher(sql).find()) {
            result.isValid = false;
            result.errorMessage = "Query contains forbidden operations (DROP, DELETE, etc.)";
            return result;
        }

        // Only allow SELECT statements
        String upperSql = sql.trim().toUpperCase();
        if (!upperSql.startsWith("SELECT")) {
            result.isValid = false;
            result.errorMessage = "Only SELECT queries are allowed";
            return result;
        }

        // Inject project_id filter if not present
        if (!sql.toLowerCase().contains("project_id")) {
            result.wasSanitized = true;
            result.notes = "Added project_id filter for security";
            // Simple injection - in production, use a proper SQL parser
            if (sql.toLowerCase().contains("where")) {
                result.sanitizedSql = sql.replaceFirst(
                        "(?i)where",
                        "WHERE project_id = '" + projectId + "' AND"
                );
            } else {
                result.sanitizedSql = sql + " WHERE project_id = '" + projectId + "'";
            }
        }

        // Add LIMIT if not present
        if (!sql.toLowerCase().contains("limit")) {
            result.sanitizedSql = result.sanitizedSql + " LIMIT 1000";
            result.wasSanitized = true;
            if (result.notes == null) {
                result.notes = "Added LIMIT clause";
            } else {
                result.notes += "; Added LIMIT clause";
            }
        }

        return result;
    }

    /**
     * Execute a safe SELECT query
     */
    private List<Map<String, Object>> executeQuery(String sql, Integer maxRows) {
        int limit = maxRows != null ? Math.min(maxRows, 1000) : 100;

        // Ensure limit is applied
        if (!sql.toLowerCase().contains("limit")) {
            sql = sql + " LIMIT " + limit;
        }

        return jdbcTemplate.queryForList(sql);
    }

    /**
     * Get recent queries for a user
     */
    public List<TextToSqlLog> getRecentQueries(String userId, int limit) {
        return logRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, limit))
                .getContent();
    }

    /**
     * Get successful queries for suggestion/autocomplete
     */
    public List<String> getSuggestions(String projectId, String prefix) {
        return logRepository.findByExecutionStatusOrderByCreatedAtDesc("SUCCESS").stream()
                .filter(log -> log.getProjectId() != null && log.getProjectId().equals(projectId))
                .map(TextToSqlLog::getNaturalLanguageQuery)
                .filter(q -> q != null && q.toLowerCase().contains(prefix.toLowerCase()))
                .limit(5)
                .toList();
    }

    private static class SqlSanitizationResult {
        String sanitizedSql;
        boolean isValid;
        boolean wasSanitized;
        String notes;
        String errorMessage;
    }
}
