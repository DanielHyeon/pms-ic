package com.insuretech.pms.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for updating a chat session title.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateSessionTitleRequest {

    /**
     * The new title for the chat session.
     * Required and must not exceed 200 characters.
     */
    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must not exceed 200 characters")
    private String title;
}
