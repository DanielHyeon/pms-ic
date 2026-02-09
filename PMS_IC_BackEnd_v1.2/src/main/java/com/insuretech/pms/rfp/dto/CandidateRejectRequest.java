package com.insuretech.pms.rfp.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CandidateRejectRequest {

    @NotEmpty(message = "candidateIds must not be empty")
    private List<String> candidateIds;

    private String reason;
}
