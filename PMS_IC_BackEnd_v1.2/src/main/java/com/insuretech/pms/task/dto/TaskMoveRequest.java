package com.insuretech.pms.task.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaskMoveRequest {
    private String targetColumnId;
    private Integer orderNum;
}
