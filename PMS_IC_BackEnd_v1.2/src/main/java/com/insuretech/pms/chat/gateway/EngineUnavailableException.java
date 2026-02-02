package com.insuretech.pms.chat.gateway;

/**
 * Exception thrown when no healthy LLM engine is available
 */
public class EngineUnavailableException extends RuntimeException {

    public EngineUnavailableException(String message) {
        super(message);
    }

    public EngineUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
