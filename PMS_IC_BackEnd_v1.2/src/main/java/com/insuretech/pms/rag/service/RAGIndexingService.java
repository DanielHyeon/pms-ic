package com.insuretech.pms.rag.service;

import com.insuretech.pms.common.security.RoleAccessLevel;
import com.insuretech.pms.project.reactive.entity.R2dbcProjectMember.ProjectRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFShape;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.apache.poi.xslf.usermodel.XSLFTextShape;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

/**
 * RAG 문서 인덱싱 서비스
 * 업로드된 파일을 LLM 서비스의 벡터 DB에 인덱싱
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RAGIndexingService {

    private final RestTemplate restTemplate;

    @Value("${ai.service.url:http://localhost:8000}")
    private String llmServiceUrl;

    /**
     * Index file to RAG system (legacy method for backward compatibility)
     */
    public boolean indexFile(String documentId, Path filePath, Map<String, String> metadata) {
        return indexFile(documentId, filePath, metadata, null, null, null);
    }

    /**
     * Index file to RAG system with project partitioning and access control
     *
     * @param documentId       Unique document identifier
     * @param filePath         Path to the file
     * @param metadata         Additional metadata
     * @param projectId        Project ID for partitioning
     * @param uploadedByUserId User ID who uploaded the file
     * @param uploadedByRole   Role of the uploader (determines access level)
     */
    public boolean indexFile(
            String documentId,
            Path filePath,
            Map<String, String> metadata,
            String projectId,
            String uploadedByUserId,
            ProjectRole uploadedByRole
    ) {
        try {
            String content = extractTextFromFile(filePath);

            if (content == null || content.trim().isEmpty()) {
                log.warn("No text extracted from file: {}", filePath);
                return false;
            }

            // Build metadata with access control info
            Map<String, String> enrichedMetadata = new HashMap<>(metadata != null ? metadata : new HashMap<>());

            if (projectId != null) {
                enrichedMetadata.put("project_id", projectId);
            }
            if (uploadedByUserId != null) {
                enrichedMetadata.put("uploaded_by_user_id", uploadedByUserId);
            }
            if (uploadedByRole != null) {
                enrichedMetadata.put("uploaded_by_role", uploadedByRole.name());
                enrichedMetadata.put("access_level", String.valueOf(RoleAccessLevel.getLevel(uploadedByRole)));
            }

            return indexDocument(documentId, content, enrichedMetadata);

        } catch (Exception e) {
            log.error("Failed to index file: {}", filePath, e);
            return false;
        }
    }

    /**
     * Extract text from file based on file extension
     */
    private String extractTextFromFile(Path filePath) throws IOException {
        String fileName = filePath.getFileName().toString().toLowerCase();

        if (fileName.endsWith(".pdf")) {
            return extractFromPdf(filePath);
        } else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
            return extractFromDocx(filePath);
        } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
            return extractFromExcel(filePath);
        } else if (fileName.endsWith(".pptx") || fileName.endsWith(".ppt")) {
            return extractFromPowerPoint(filePath);
        } else if (fileName.endsWith(".txt") || fileName.endsWith(".md") || fileName.endsWith(".csv")) {
            return Files.readString(filePath);
        } else {
            log.warn("Unsupported file type: {}", fileName);
            return null;
        }
    }

    /**
     * PDF에서 텍스트 추출
     */
    private String extractFromPdf(Path filePath) throws IOException {
        try (PDDocument document = org.apache.pdfbox.Loader.loadPDF(filePath.toFile())) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        }
    }

    /**
     * Extract text from Word document (.docx)
     */
    private String extractFromDocx(Path filePath) throws IOException {
        try (FileInputStream fis = new FileInputStream(filePath.toFile());
             XWPFDocument document = new XWPFDocument(fis)) {

            StringBuilder text = new StringBuilder();
            for (XWPFParagraph paragraph : document.getParagraphs()) {
                text.append(paragraph.getText()).append("\n\n");
            }
            return text.toString();
        }
    }

    /**
     * Extract text from Excel file (.xlsx, .xls)
     */
    private String extractFromExcel(Path filePath) throws IOException {
        try (FileInputStream fis = new FileInputStream(filePath.toFile());
             XSSFWorkbook workbook = new XSSFWorkbook(fis)) {

            StringBuilder text = new StringBuilder();

            for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
                Sheet sheet = workbook.getSheetAt(i);
                text.append("### Sheet: ").append(sheet.getSheetName()).append("\n\n");

                for (Row row : sheet) {
                    StringBuilder rowText = new StringBuilder();
                    for (Cell cell : row) {
                        String cellValue = getCellValueAsString(cell);
                        if (!cellValue.isEmpty()) {
                            if (rowText.length() > 0) {
                                rowText.append("\t");
                            }
                            rowText.append(cellValue);
                        }
                    }
                    if (rowText.length() > 0) {
                        text.append(rowText).append("\n");
                    }
                }
                text.append("\n");
            }
            return text.toString();
        }
    }

    /**
     * Get cell value as string regardless of cell type
     */
    private String getCellValueAsString(Cell cell) {
        if (cell == null) {
            return "";
        }
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> {
                if (org.apache.poi.ss.usermodel.DateUtil.isCellDateFormatted(cell)) {
                    yield cell.getLocalDateTimeCellValue().toString();
                }
                yield String.valueOf(cell.getNumericCellValue());
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try {
                    yield cell.getStringCellValue();
                } catch (Exception e) {
                    yield String.valueOf(cell.getNumericCellValue());
                }
            }
            default -> "";
        };
    }

    /**
     * Extract text from PowerPoint file (.pptx, .ppt)
     */
    private String extractFromPowerPoint(Path filePath) throws IOException {
        try (FileInputStream fis = new FileInputStream(filePath.toFile());
             XMLSlideShow ppt = new XMLSlideShow(fis)) {

            StringBuilder text = new StringBuilder();
            int slideNum = 1;

            for (XSLFSlide slide : ppt.getSlides()) {
                text.append("### Slide ").append(slideNum++).append("\n\n");

                for (XSLFShape shape : slide.getShapes()) {
                    if (shape instanceof XSLFTextShape textShape) {
                        String shapeText = textShape.getText();
                        if (shapeText != null && !shapeText.trim().isEmpty()) {
                            text.append(shapeText.trim()).append("\n\n");
                        }
                    }
                }
            }
            return text.toString();
        }
    }

    /**
     * LLM 서비스에 문서 인덱싱 요청
     */
    private boolean indexDocument(String documentId, String content, Map<String, String> metadata) {
        try {
            String url = llmServiceUrl + "/api/documents";

            // 요청 바디 구성
            Map<String, Object> document = new HashMap<>();
            document.put("id", documentId);
            document.put("content", content);
            document.put("metadata", metadata != null ? metadata : new HashMap<>());

            List<Map<String, Object>> documents = List.of(document);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("documents", documents);

            // HTTP 요청
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(url, request, Map.class);

            if (response != null && response.containsKey("success_count")) {
                Integer successCount = (Integer) response.get("success_count");
                log.info("Document indexed successfully: {} (success_count={})", documentId, successCount);
                return successCount != null && successCount > 0;
            }

            return false;

        } catch (Exception e) {
            log.error("Failed to index document to LLM service: {}", documentId, e);
            return false;
        }
    }

    /**
     * 문서 삭제
     */
    public boolean deleteDocument(String documentId) {
        try {
            String url = llmServiceUrl + "/api/documents/" + documentId;
            restTemplate.delete(url);
            log.info("Document deleted from RAG: {}", documentId);
            return true;

        } catch (Exception e) {
            log.error("Failed to delete document from RAG: {}", documentId, e);
            return false;
        }
    }

    /**
     * RAG 통계 조회
     */
    public Map<String, Object> getStats() {
        try {
            String url = llmServiceUrl + "/api/documents/stats";

            @SuppressWarnings("unchecked")
            Map<String, Object> stats = restTemplate.getForObject(url, Map.class);

            return stats != null ? stats : Collections.emptyMap();

        } catch (Exception e) {
            log.error("Failed to get RAG stats", e);
            return Collections.emptyMap();
        }
    }

    /**
     * Check if document exists in RAG system
     *
     * @param documentId Document ID to check
     * @return true if exists, false otherwise
     */
    public boolean documentExists(String documentId) {
        try {
            String url = llmServiceUrl + "/api/documents/" + documentId;

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);

            return response != null && Boolean.TRUE.equals(response.get("exists"));

        } catch (Exception e) {
            // 404 means document doesn't exist
            if (e.getMessage() != null && e.getMessage().contains("404")) {
                return false;
            }
            log.error("Failed to check document existence: {}", documentId, e);
            return false;
        }
    }

    /**
     * Update document metadata without re-indexing
     *
     * @param documentId Document ID
     * @param metadata   Metadata to update (status, approver, approved_at, access_level, etc.)
     * @return true if successful, false otherwise
     */
    public boolean updateDocumentMetadata(String documentId, Map<String, Object> metadata) {
        try {
            String url = llmServiceUrl + "/api/documents/" + documentId + "/metadata";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(metadata, headers);

            // Use exchange with PATCH method
            restTemplate.exchange(
                    url,
                    org.springframework.http.HttpMethod.PATCH,
                    request,
                    Map.class
            );

            log.info("Document metadata updated successfully: {}", documentId);
            return true;

        } catch (Exception e) {
            log.error("Failed to update document metadata: {}", documentId, e);
            return false;
        }
    }
}
