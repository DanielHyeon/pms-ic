package com.insuretech.pms.task.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KanbanBoardDto {
    private String projectId;
    private List<ColumnDto> columns;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ColumnDto {
        private String id;
        private String name;
        private Integer orderNum;
        private Integer wipLimit;
        private String color;
        private List<TaskDto> tasks;
    }
}
