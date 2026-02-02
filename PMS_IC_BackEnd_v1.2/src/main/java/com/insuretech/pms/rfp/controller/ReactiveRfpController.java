package com.insuretech.pms.rfp.controller;

import com.insuretech.pms.common.dto.ApiResponse;
import com.insuretech.pms.rfp.dto.CreateRfpRequest;
import com.insuretech.pms.rfp.dto.RfpDto;
import com.insuretech.pms.rfp.dto.UpdateRfpRequest;
import com.insuretech.pms.rfp.service.ReactiveRfpService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v2/projects/{projectId}/rfps")
@RequiredArgsConstructor
public class ReactiveRfpController {

    private final ReactiveRfpService rfpService;

    @GetMapping
    public Mono<ResponseEntity<ApiResponse<List<RfpDto>>>> getRfpsByProject(
            @PathVariable String projectId) {
        return rfpService.getRfpsByProject(projectId)
                .collectList()
                .map(rfps -> ResponseEntity.ok(ApiResponse.success(rfps)));
    }

    @GetMapping("/{rfpId}")
    public Mono<ResponseEntity<ApiResponse<RfpDto>>> getRfpById(
            @PathVariable String projectId,
            @PathVariable String rfpId) {
        return rfpService.getRfpById(rfpId)
                .map(rfp -> ResponseEntity.ok(ApiResponse.success(rfp)));
    }

    @PostMapping
    public Mono<ResponseEntity<ApiResponse<RfpDto>>> createRfp(
            @PathVariable String projectId,
            @Valid @RequestBody CreateRfpRequest request) {
        return rfpService.createRfp(projectId, request)
                .map(rfp -> ResponseEntity.ok(ApiResponse.success("RFP created", rfp)));
    }

    @PutMapping("/{rfpId}")
    public Mono<ResponseEntity<ApiResponse<RfpDto>>> updateRfp(
            @PathVariable String projectId,
            @PathVariable String rfpId,
            @Valid @RequestBody UpdateRfpRequest request) {
        return rfpService.updateRfp(rfpId, request)
                .map(rfp -> ResponseEntity.ok(ApiResponse.success("RFP updated", rfp)));
    }

    @DeleteMapping("/{rfpId}")
    public Mono<ResponseEntity<ApiResponse<Void>>> deleteRfp(
            @PathVariable String projectId,
            @PathVariable String rfpId) {
        return rfpService.deleteRfp(rfpId)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("RFP deleted", null))));
    }

    @PatchMapping("/{rfpId}/status")
    public Mono<ResponseEntity<ApiResponse<Void>>> updateRfpStatus(
            @PathVariable String projectId,
            @PathVariable String rfpId,
            @RequestParam String status) {
        return rfpService.updateStatus(rfpId, status)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Status updated", null))));
    }
}
