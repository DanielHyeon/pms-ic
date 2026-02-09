package com.insuretech.pms.rfp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AnalyzeRequest {

    private String modelName;
    private String promptVersion;
    private Map<String, Object> generationParams;
}
