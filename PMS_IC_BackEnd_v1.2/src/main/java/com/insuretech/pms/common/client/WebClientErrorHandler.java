package com.insuretech.pms.common.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClientException;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.Map;

/**
 * Utility class for handling WebClient errors in a consistent manner.
 * Provides methods to extract meaningful error messages and classify connection errors.
 */
@Slf4j
@Component
public class WebClientErrorHandler {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Handle WebClientResponseException and extract meaningful error message.
     *
     * @param e         the exception to handle
     * @param operation description of the operation that failed
     * @return user-friendly error message
     */
    public String handleResponseException(WebClientResponseException e, String operation) {
        log.error("WebClient error during {}: Status={}, Body={}",
                operation, e.getStatusCode(), e.getResponseBodyAsString(), e);
        return extractErrorMessage(e.getResponseBodyAsString());
    }

    /**
     * Handle WebClientException (connection errors) with service URL context.
     *
     * @param e          the exception to handle
     * @param serviceUrl the service URL for context
     * @param operation  description of the operation that failed
     * @return user-friendly error message
     */
    public String handleConnectionException(WebClientException e, String serviceUrl, String operation) {
        String errorMsg = classifyConnectionError(e.getMessage(), serviceUrl);
        log.error("WebClient connection error during {}: {}", operation, errorMsg, e);
        return errorMsg;
    }

    /**
     * Classify connection error type and provide user-friendly message.
     *
     * @param errorMessage original error message
     * @param serviceUrl   the service URL for context
     * @return classified user-friendly error message
     */
    public String classifyConnectionError(String errorMessage, String serviceUrl) {
        if (errorMessage == null || errorMessage.isEmpty()) {
            return String.format("서비스 연결 실패 (%s)", serviceUrl);
        }

        if (errorMessage.contains("Connection refused")) {
            return String.format(
                    "서비스에 연결할 수 없습니다 (%s). " +
                    "서비스가 실행 중인지 확인하세요. " +
                    "Docker를 사용하는 경우 'docker-compose up <service-name>' 명령으로 서비스를 시작하세요.",
                    serviceUrl
            );
        }

        if (errorMessage.contains("timeout") || errorMessage.contains("Timeout")) {
            return String.format(
                    "서비스 응답 시간 초과 (%s). " +
                    "서비스가 정상적으로 동작하는지 확인하세요.",
                    serviceUrl
            );
        }

        if (errorMessage.contains("UnknownHostException") || errorMessage.contains("unknown host")) {
            return String.format(
                    "알 수 없는 호스트 (%s). 서비스 URL 설정을 확인하세요.",
                    serviceUrl
            );
        }

        return String.format("서비스 연결 오류 (%s): %s", serviceUrl, errorMessage);
    }

    /**
     * Extract error message from JSON response body.
     *
     * @param errorBody the response body to parse
     * @return extracted error message or fallback message
     */
    public String extractErrorMessage(String errorBody) {
        if (errorBody == null || errorBody.isEmpty()) {
            return "알 수 없는 오류";
        }

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> errorMap = objectMapper.readValue(errorBody, Map.class);
            String message = (String) errorMap.getOrDefault("message",
                    errorMap.getOrDefault("error", errorBody));
            return message != null && !message.isEmpty() ? message : "알 수 없는 오류";
        } catch (Exception e) {
            log.warn("Failed to parse error response: {}", errorBody);
            return errorBody.length() > 200 ? errorBody.substring(0, 200) + "..." : errorBody;
        }
    }

    /**
     * Create a RuntimeException with appropriate error message.
     *
     * @param operation    description of the operation that failed
     * @param errorMessage the error message to include
     * @param cause        the original exception
     * @return RuntimeException with formatted message
     */
    public RuntimeException createException(String operation, String errorMessage, Throwable cause) {
        return new RuntimeException(operation + " 실패: " + errorMessage, cause);
    }

    /**
     * Create a RuntimeException without a cause.
     *
     * @param operation    description of the operation that failed
     * @param errorMessage the error message to include
     * @return RuntimeException with formatted message
     */
    public RuntimeException createException(String operation, String errorMessage) {
        return new RuntimeException(operation + " 실패: " + errorMessage);
    }
}
