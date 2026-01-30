package com.insuretech.pms.chat.controller;

import com.insuretech.pms.chat.gateway.GgufConfigService;
import com.insuretech.pms.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.Map;

/**
 * Reactive REST Controller for GGUF configuration management.
 * Only accessible by ADMIN and PMO_HEAD roles.
 */
@Slf4j
@RestController
@RequestMapping("/api/llm/gguf")
@RequiredArgsConstructor
@Tag(name = "GGUF Configuration", description = "GGUF model configuration management")
public class ReactiveGgufConfigController {

    private final GgufConfigService ggufConfigService;

    @GetMapping("/config")
    @Operation(summary = "Get current GGUF configuration")
    @PreAuthorize("hasAnyRole('ADMIN', 'PMO_HEAD')")
    public Mono<ResponseEntity<ApiResponse<Map<String, Object>>>> getCurrentConfig() {
        log.debug("Getting current GGUF configuration");
        Map<String, Object> config = ggufConfigService.getCurrentConfig();
        return Mono.just(ResponseEntity.ok(ApiResponse.success(config)));
    }

    @PutMapping("/enabled")
    @Operation(summary = "Enable or disable GGUF")
    @PreAuthorize("hasRole('ADMIN')")
    public Mono<ResponseEntity<ApiResponse<Map<String, Object>>>> setEnabled(
            @RequestBody EnabledRequest request) {
        log.info("Setting GGUF enabled: {}", request.enabled());

        ggufConfigService.setEnabled(request.enabled());
        return Mono.just(ResponseEntity.ok(ApiResponse.success(Map.of(
                "enabled", request.enabled(),
                "message", "GGUF " + (request.enabled() ? "enabled" : "disabled")
        ))));
    }

    @PutMapping("/url")
    @Operation(summary = "Update GGUF server URL")
    @PreAuthorize("hasRole('ADMIN')")
    public Mono<ResponseEntity<ApiResponse<Map<String, Object>>>> updateUrl(
            @RequestBody UpdateUrlRequest request) {
        log.info("Updating GGUF URL to: {}", request.url());

        try {
            ggufConfigService.updateUrl(request.url());
            return Mono.just(ResponseEntity.ok(ApiResponse.success(Map.of(
                    "url", request.url(),
                    "message", "GGUF URL updated"
            ))));
        } catch (IllegalArgumentException e) {
            return Mono.just(ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage())));
        }
    }

    @PutMapping("/model")
    @Operation(summary = "Update GGUF model")
    @PreAuthorize("hasAnyRole('ADMIN', 'PMO_HEAD')")
    public Mono<ResponseEntity<ApiResponse<Map<String, Object>>>> updateModel(
            @RequestBody UpdateModelRequest request) {
        log.info("Updating GGUF model to: {}", request.model());

        try {
            ggufConfigService.updateModel(request.model());
            return Mono.just(ResponseEntity.ok(ApiResponse.success(Map.of(
                    "model", request.model(),
                    "message", "GGUF model updated"
            ))));
        } catch (IllegalArgumentException e) {
            return Mono.just(ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage())));
        }
    }

    // Request DTOs
    public record EnabledRequest(boolean enabled) {}
    public record UpdateUrlRequest(String url) {}
    public record UpdateModelRequest(String model) {}
}
