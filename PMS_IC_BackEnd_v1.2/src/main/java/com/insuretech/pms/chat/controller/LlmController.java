package com.insuretech.pms.chat.controller;

import com.insuretech.pms.chat.dto.ModelChangeRequest;
import com.insuretech.pms.chat.dto.ModelInfoResponse;
import com.insuretech.pms.chat.dto.OcrConfigRequest;
import com.insuretech.pms.chat.dto.OcrConfigResponse;
import com.insuretech.pms.chat.service.LlmService;
import com.insuretech.pms.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Tag(name = "LLM", description = "LLM 모델 및 OCR 설정 관리 API")
@RestController
@RequestMapping("/api/llm")
@RequiredArgsConstructor
public class LlmController {

    private final LlmService llmService;

    // ==================== LLM Model APIs ====================

    @Operation(summary = "현재 모델 조회", description = "현재 사용 중인 LLM 모델 정보를 조회합니다")
    @GetMapping("/model")
    public ResponseEntity<ApiResponse<ModelInfoResponse>> getCurrentModel() {
        ModelInfoResponse modelInfo = llmService.getCurrentModel();
        return ResponseEntity.ok(ApiResponse.success(modelInfo));
    }

    @Operation(summary = "모델 변경", description = "LLM 모델을 변경합니다 (관리자 전용)")
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/model")
    public ResponseEntity<ApiResponse<ModelInfoResponse>> changeModel(@RequestBody ModelChangeRequest request) {
        ModelInfoResponse modelInfo = llmService.changeModel(request.getModelPath());
        return ResponseEntity.ok(ApiResponse.success("모델이 성공적으로 변경되었습니다", modelInfo));
    }

    // ==================== Lightweight Model APIs ====================

    @Operation(summary = "경량 모델 조회", description = "현재 설정된 경량 모델 정보를 조회합니다")
    @GetMapping("/model/lightweight")
    public ResponseEntity<ApiResponse<ModelInfoResponse>> getLightweightModel() {
        ModelInfoResponse modelInfo = llmService.getLightweightModel();
        return ResponseEntity.ok(ApiResponse.success(modelInfo));
    }

    @Operation(summary = "경량 모델 변경", description = "경량 모델을 변경합니다 (관리자 전용)")
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/model/lightweight")
    public ResponseEntity<ApiResponse<ModelInfoResponse>> changeLightweightModel(@RequestBody ModelChangeRequest request) {
        ModelInfoResponse modelInfo = llmService.changeLightweightModel(request.getModelPath());
        return ResponseEntity.ok(ApiResponse.success("경량 모델이 성공적으로 변경되었습니다", modelInfo));
    }

    // ==================== Medium Model APIs ====================

    @Operation(summary = "중형 모델 조회", description = "현재 설정된 중형 모델 정보를 조회합니다")
    @GetMapping("/model/medium")
    public ResponseEntity<ApiResponse<ModelInfoResponse>> getMediumModel() {
        ModelInfoResponse modelInfo = llmService.getMediumModel();
        return ResponseEntity.ok(ApiResponse.success(modelInfo));
    }

    @Operation(summary = "중형 모델 변경", description = "중형 모델을 변경합니다 (관리자 전용)")
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/model/medium")
    public ResponseEntity<ApiResponse<ModelInfoResponse>> changeMediumModel(@RequestBody ModelChangeRequest request) {
        ModelInfoResponse modelInfo = llmService.changeMediumModel(request.getModelPath());
        return ResponseEntity.ok(ApiResponse.success("중형 모델이 성공적으로 변경되었습니다", modelInfo));
    }

    @Operation(summary = "LLM 서비스 상태 확인", description = "LLM 서비스의 헬스 상태를 확인합니다")
    @GetMapping("/health")
    public ResponseEntity<ApiResponse<Object>> checkHealth() {
        Object healthStatus = llmService.checkHealth();
        return ResponseEntity.ok(ApiResponse.success(healthStatus));
    }

    // ==================== OCR Configuration APIs ====================

    @Operation(summary = "현재 OCR 엔진 조회", description = "현재 설정된 OCR 엔진 정보를 조회합니다")
    @GetMapping("/ocr")
    public ResponseEntity<ApiResponse<OcrConfigResponse>> getCurrentOcrEngine() {
        OcrConfigResponse ocrConfig = llmService.getCurrentOcrEngine();
        return ResponseEntity.ok(ApiResponse.success(ocrConfig));
    }

    @Operation(summary = "OCR 엔진 변경", description = "OCR 엔진을 변경합니다 (관리자 전용). 옵션: varco, paddle, tesseract, pypdf")
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/ocr")
    public ResponseEntity<ApiResponse<OcrConfigResponse>> changeOcrEngine(@RequestBody OcrConfigRequest request) {
        OcrConfigResponse ocrConfig = llmService.changeOcrEngine(request.getOcrEngine());
        return ResponseEntity.ok(ApiResponse.success("OCR 엔진이 성공적으로 변경되었습니다", ocrConfig));
    }
}
