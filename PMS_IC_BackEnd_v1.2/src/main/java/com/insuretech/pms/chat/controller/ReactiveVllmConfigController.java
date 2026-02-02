package com.insuretech.pms.chat.controller;

import com.insuretech.pms.chat.gateway.VllmConfigService;
import com.insuretech.pms.chat.gateway.VllmConfigService.VllmConfigChangeResult;
import com.insuretech.pms.chat.gateway.VllmConfigService.VllmModelInfo;
import com.insuretech.pms.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

/**
 * Reactive REST Controller for vLLM configuration management.
 * Only accessible by ADMIN and PMO_HEAD roles.
 */
@Slf4j
@RestController
@RequestMapping("/api/llm/vllm")
@RequiredArgsConstructor
@Tag(name = "vLLM Configuration", description = "vLLM model configuration management")
public class ReactiveVllmConfigController {

    private final VllmConfigService vllmConfigService;

    @GetMapping("/config")
    @Operation(summary = "Get current vLLM configuration")
    @PreAuthorize("hasAnyRole('ADMIN', 'PMO_HEAD')")
    public Mono<ResponseEntity<ApiResponse<Map<String, Object>>>> getCurrentConfig() {
        log.debug("Getting current vLLM configuration");
        Map<String, Object> config = vllmConfigService.getCurrentConfig();
        return Mono.just(ResponseEntity.ok(ApiResponse.success(config)));
    }

    @GetMapping("/models")
    @Operation(summary = "Get available vLLM models")
    @PreAuthorize("hasAnyRole('ADMIN', 'PMO_HEAD')")
    public Mono<ResponseEntity<ApiResponse<List<VllmModelInfo>>>> getAvailableModels() {
        log.debug("Getting available vLLM models");
        List<VllmModelInfo> models = vllmConfigService.getAvailableModels();
        return Mono.just(ResponseEntity.ok(ApiResponse.success(models)));
    }

    @PutMapping("/model")
    @Operation(summary = "Change vLLM model (backward compatible - changes medium model)")
    @PreAuthorize("hasAnyRole('ADMIN', 'PMO_HEAD')")
    public Mono<ResponseEntity<ApiResponse<VllmConfigChangeResult>>> changeModel(
            @RequestBody ChangeModelRequest request) {
        log.info("Changing vLLM model to: {}", request.modelId());

        try {
            VllmConfigChangeResult result = vllmConfigService.changeModel(request.modelId());
            return Mono.just(ResponseEntity.ok(ApiResponse.success(result)));
        } catch (IllegalArgumentException e) {
            log.error("Invalid model change request: {}", e.getMessage());
            return Mono.just(ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage())));
        }
    }

    @PutMapping("/model/lightweight")
    @Operation(summary = "Change vLLM lightweight model")
    @PreAuthorize("hasAnyRole('ADMIN', 'PMO_HEAD')")
    public Mono<ResponseEntity<ApiResponse<VllmConfigChangeResult>>> changeLightweightModel(
            @RequestBody ChangeModelRequest request) {
        log.info("Changing vLLM lightweight model to: {}", request.modelId());

        try {
            VllmConfigChangeResult result = vllmConfigService.changeLightweightModel(request.modelId());
            return Mono.just(ResponseEntity.ok(ApiResponse.success(result)));
        } catch (IllegalArgumentException e) {
            log.error("Invalid lightweight model change request: {}", e.getMessage());
            return Mono.just(ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage())));
        }
    }

    @PutMapping("/model/medium")
    @Operation(summary = "Change vLLM medium model")
    @PreAuthorize("hasAnyRole('ADMIN', 'PMO_HEAD')")
    public Mono<ResponseEntity<ApiResponse<VllmConfigChangeResult>>> changeMediumModel(
            @RequestBody ChangeModelRequest request) {
        log.info("Changing vLLM medium model to: {}", request.modelId());

        try {
            VllmConfigChangeResult result = vllmConfigService.changeMediumModel(request.modelId());
            return Mono.just(ResponseEntity.ok(ApiResponse.success(result)));
        } catch (IllegalArgumentException e) {
            log.error("Invalid medium model change request: {}", e.getMessage());
            return Mono.just(ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage())));
        }
    }

    @PutMapping("/enabled")
    @Operation(summary = "Enable or disable vLLM")
    @PreAuthorize("hasRole('ADMIN')")
    public Mono<ResponseEntity<ApiResponse<Map<String, Object>>>> setEnabled(
            @RequestBody EnabledRequest request) {
        log.info("Setting vLLM enabled: {}", request.enabled());

        vllmConfigService.setEnabled(request.enabled());
        return Mono.just(ResponseEntity.ok(ApiResponse.success(Map.of(
                "enabled", request.enabled(),
                "message", "vLLM " + (request.enabled() ? "enabled" : "disabled")
        ))));
    }

    @PutMapping("/url")
    @Operation(summary = "Update vLLM server URL")
    @PreAuthorize("hasRole('ADMIN')")
    public Mono<ResponseEntity<ApiResponse<Map<String, Object>>>> updateUrl(
            @RequestBody UpdateUrlRequest request) {
        log.info("Updating vLLM URL to: {}", request.url());

        try {
            vllmConfigService.updateUrl(request.url());
            return Mono.just(ResponseEntity.ok(ApiResponse.success(Map.of(
                    "url", request.url(),
                    "message", "vLLM URL updated"
            ))));
        } catch (IllegalArgumentException e) {
            return Mono.just(ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage())));
        }
    }

    // Request DTOs
    public record ChangeModelRequest(String modelId) {}
    public record EnabledRequest(boolean enabled) {}
    public record UpdateUrlRequest(String url) {}
}
