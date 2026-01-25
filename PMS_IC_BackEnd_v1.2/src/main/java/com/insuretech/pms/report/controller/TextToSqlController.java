package com.insuretech.pms.report.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.report.dto.TextToSqlRequest;
import com.insuretech.pms.report.dto.TextToSqlResponse;
import com.insuretech.pms.report.entity.TextToSqlLog;
import com.insuretech.pms.report.service.TextToSqlService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller for Text-to-SQL natural language query conversion
 */
@Tag(name = "Text to SQL", description = "Natural language to SQL conversion API")
@RestController
@RequestMapping("/api/text-to-sql")
@RequiredArgsConstructor
public class TextToSqlController {

    private final TextToSqlService textToSqlService;

    @Operation(summary = "Convert natural language question to SQL and optionally execute")
    @PostMapping("/query")
    public ResponseEntity<ApiResponse<TextToSqlResponse>> processQuestion(
            @Valid @RequestBody TextToSqlRequest request,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-User-Role") String userRole) {

        TextToSqlResponse response = textToSqlService.processQuestion(request, userId, userRole);

        // Return response - client checks response.success for query status
        String message = Boolean.TRUE.equals(response.getSuccess()) ?
                "Query processed successfully" : response.getErrorMessage();
        return ResponseEntity.ok(ApiResponse.success(message, response));
    }

    @Operation(summary = "Get query suggestions based on previous queries")
    @GetMapping("/suggestions")
    public ResponseEntity<ApiResponse<List<String>>> getSuggestions(
            @Parameter(description = "Project ID") @RequestParam String projectId,
            @Parameter(description = "Search prefix") @RequestParam(defaultValue = "") String prefix) {

        List<String> suggestions = textToSqlService.getSuggestions(projectId, prefix);
        return ResponseEntity.ok(ApiResponse.success(suggestions));
    }

    @Operation(summary = "Get recent query history for user")
    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<TextToSqlLog>>> getQueryHistory(
            @RequestHeader("X-User-Id") String userId,
            @Parameter(description = "Number of recent queries") @RequestParam(defaultValue = "10") int limit) {

        List<TextToSqlLog> history = textToSqlService.getRecentQueries(userId, limit);
        return ResponseEntity.ok(ApiResponse.success(history));
    }
}
