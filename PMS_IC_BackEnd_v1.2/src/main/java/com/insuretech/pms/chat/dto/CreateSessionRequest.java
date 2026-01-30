package com.insuretech.pms.chat.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for creating a new chat session.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSessionRequest {

    /**
     * Optional title for the chat session.
     * If not provided, a default title will be used.
     */
    @Size(max = 200, message = "Title must not exceed 200 characters")
    private String title;
}
