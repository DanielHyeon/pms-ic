package com.insuretech.pms.common.service;

import com.insuretech.pms.common.exception.CustomException;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

/**
 * Common file storage service for handling file uploads across the application.
 * Provides centralized file validation, storage, and retrieval functionality.
 */
@Slf4j
@Service
public class FileStorageService {

    private static final long DEFAULT_MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
            "txt", "csv", "json", "xml",
            "png", "jpg", "jpeg", "gif",
            "zip", "tar", "gz"
    );

    @Value("${pms.storage.base-path:uploads}")
    private String basePath;

    @Value("${pms.storage.max-file-size:104857600}")
    private long maxFileSize;

    /**
     * Result of a file storage operation
     */
    @Getter
    public static class StorageResult {
        private final String storedFileName;
        private final String originalFileName;
        private final String filePath;
        private final long fileSize;
        private final String fileExtension;

        public StorageResult(String storedFileName, String originalFileName, String filePath, long fileSize, String fileExtension) {
            this.storedFileName = storedFileName;
            this.originalFileName = originalFileName;
            this.filePath = filePath;
            this.fileSize = fileSize;
            this.fileExtension = fileExtension;
        }
    }

    /**
     * Store a file in the specified subdirectory
     *
     * @param file         the file to store
     * @param subdirectory subdirectory under base path (e.g., "deliverables", "rfp/projectId")
     * @return StorageResult containing file metadata
     */
    public StorageResult storeFile(MultipartFile file, String subdirectory) {
        validateFile(file);

        String rawFileName = file.getOriginalFilename();
        String originalFileName = StringUtils.cleanPath(rawFileName != null ? rawFileName : "unnamed");
        String extension = getFileExtension(originalFileName);
        String storedFileName = UUID.randomUUID() + "-" + originalFileName;

        Path targetDir = Paths.get(basePath, subdirectory);
        Path targetPath = targetDir.resolve(storedFileName);

        try {
            Files.createDirectories(targetDir);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            log.info("File stored: {} -> {} (size: {} bytes)", originalFileName, targetPath, file.getSize());

            return new StorageResult(
                    storedFileName,
                    originalFileName,
                    targetPath.toString(),
                    file.getSize(),
                    extension
            );
        } catch (IOException e) {
            log.error("Failed to store file: {}", originalFileName, e);
            throw CustomException.internalError("Failed to store file: " + originalFileName);
        }
    }

    /**
     * Store a file with a custom filename
     *
     * @param file           the file to store
     * @param subdirectory   subdirectory under base path
     * @param customFileName custom filename to use (will be prefixed with UUID)
     * @return StorageResult containing file metadata
     */
    public StorageResult storeFileWithName(MultipartFile file, String subdirectory, String customFileName) {
        validateFile(file);

        String rawFileName = file.getOriginalFilename();
        String originalFileName = StringUtils.cleanPath(rawFileName != null ? rawFileName : "unnamed");
        String extension = getFileExtension(originalFileName);
        String storedFileName = UUID.randomUUID() + "-" + StringUtils.cleanPath(customFileName != null ? customFileName : originalFileName);

        Path targetDir = Paths.get(basePath, subdirectory);
        Path targetPath = targetDir.resolve(storedFileName);

        try {
            Files.createDirectories(targetDir);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            log.info("File stored with custom name: {} -> {} (size: {} bytes)", originalFileName, targetPath, file.getSize());

            return new StorageResult(
                    storedFileName,
                    originalFileName,
                    targetPath.toString(),
                    file.getSize(),
                    extension
            );
        } catch (IOException e) {
            log.error("Failed to store file: {}", originalFileName, e);
            throw CustomException.internalError("Failed to store file: " + originalFileName);
        }
    }

    /**
     * Load a file as a Resource
     *
     * @param filePath the full path to the file
     * @return Resource for the file
     */
    public Resource loadFile(String filePath) {
        if (filePath == null || filePath.isBlank()) {
            throw CustomException.badRequest("File path is required");
        }

        try {
            Path path = Paths.get(filePath);
            Resource resource = new UrlResource(path.toUri());

            if (!resource.exists() || !resource.isReadable()) {
                throw CustomException.notFound("File not found: " + filePath);
            }

            return resource;
        } catch (MalformedURLException e) {
            log.error("Invalid file path: {}", filePath, e);
            throw CustomException.internalError("Invalid file path: " + filePath);
        }
    }

    /**
     * Delete a file
     *
     * @param filePath the full path to the file
     * @return true if deleted successfully
     */
    public boolean deleteFile(String filePath) {
        if (filePath == null || filePath.isBlank()) {
            return false;
        }

        try {
            Path path = Paths.get(filePath);
            boolean deleted = Files.deleteIfExists(path);

            if (deleted) {
                log.info("File deleted: {}", filePath);
            }

            return deleted;
        } catch (IOException e) {
            log.error("Failed to delete file: {}", filePath, e);
            return false;
        }
    }

    /**
     * Validate file before storage
     */
    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw CustomException.badRequest("File is required");
        }

        if (file.getSize() > getMaxFileSize()) {
            throw CustomException.badRequest(
                    String.format("File size exceeds maximum allowed size (%d MB)",
                            getMaxFileSize() / (1024 * 1024))
            );
        }

        String originalFileName = file.getOriginalFilename();
        if (originalFileName == null || originalFileName.isBlank()) {
            throw CustomException.badRequest("Invalid file name");
        }

        String extension = getFileExtension(originalFileName);
        if (!ALLOWED_EXTENSIONS.contains(extension.toLowerCase())) {
            throw CustomException.badRequest(
                    String.format("File type '%s' is not allowed. Allowed types: %s",
                            extension, String.join(", ", ALLOWED_EXTENSIONS))
            );
        }

        // Security check: prevent path traversal
        String cleanedPath = StringUtils.cleanPath(originalFileName);
        if (cleanedPath.contains("..")) {
            throw CustomException.badRequest("Invalid file path");
        }
    }

    /**
     * Get file extension from filename
     */
    public String getFileExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            return "";
        }
        return fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
    }

    /**
     * Get maximum allowed file size
     */
    public long getMaxFileSize() {
        return maxFileSize > 0 ? maxFileSize : DEFAULT_MAX_FILE_SIZE;
    }

    /**
     * Check if file exists
     */
    public boolean fileExists(String filePath) {
        if (filePath == null || filePath.isBlank()) {
            return false;
        }
        return Files.exists(Paths.get(filePath));
    }
}
