package com.insuretech.pms.chat.controller;

import com.insuretech.pms.chat.service.RagAdminService;
import com.insuretech.pms.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller for RAG (Retrieval-Augmented Generation) knowledge base administration.
 * Only accessible by administrators.
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/rag")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') or hasRole('PMO_HEAD')")
public class RagAdminController {

    private final RagAdminService ragAdminService;

    /**
     * Get list of all documents in RAG knowledge base
     */
    @GetMapping("/documents")
    public ResponseEntity<ApiResponse<Map<String, Object>>> listDocuments() {
        log.info("Listing RAG documents");
        Map<String, Object> result = ragAdminService.listDocuments();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * Get RAG knowledge base statistics
     */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        log.info("Getting RAG stats");
        Map<String, Object> result = ragAdminService.getStats();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * Get list of available PDF files that can be loaded
     */
    @GetMapping("/files")
    public ResponseEntity<ApiResponse<Map<String, Object>>> listAvailableFiles() {
        log.info("Listing available RAG files");
        Map<String, Object> result = ragAdminService.listAvailableFiles();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * Trigger loading of PDF files into RAG
     */
    @PostMapping("/load")
    public ResponseEntity<ApiResponse<Map<String, Object>>> loadDocuments(
            @RequestBody(required = false) LoadRequest request) {
        List<String> files = request != null ? request.getFiles() : null;
        boolean clearExisting = request != null && request.isClearExisting();

        log.info("Loading RAG documents. Files: {}, Clear existing: {}",
                files != null ? files : "all", clearExisting);

        Map<String, Object> result = ragAdminService.loadDocuments(files, clearExisting);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * Get current loading status
     */
    @GetMapping("/load/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLoadingStatus() {
        Map<String, Object> result = ragAdminService.getLoadingStatus();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * Delete a specific document from RAG
     */
    @DeleteMapping("/documents/{docId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> deleteDocument(
            @PathVariable String docId) {
        log.info("Deleting RAG document: {}", docId);
        Map<String, Object> result = ragAdminService.deleteDocument(docId);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * Clear all documents from RAG
     */
    @DeleteMapping("/documents")
    public ResponseEntity<ApiResponse<Map<String, Object>>> clearAllDocuments() {
        log.warn("Clearing all RAG documents");
        Map<String, Object> result = ragAdminService.clearAllDocuments();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * Request DTO for loading documents
     */
    @lombok.Data
    public static class LoadRequest {
        private List<String> files;
        private boolean clearExisting;
    }
}
