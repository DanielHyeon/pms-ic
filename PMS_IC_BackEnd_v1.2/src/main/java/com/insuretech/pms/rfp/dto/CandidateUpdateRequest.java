package com.insuretech.pms.rfp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CandidateUpdateRequest {

    private String text;
    private String category;
    private String priorityHint;
}
