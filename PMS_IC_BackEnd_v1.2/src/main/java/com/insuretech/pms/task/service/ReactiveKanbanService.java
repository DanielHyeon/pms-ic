package com.insuretech.pms.task.service;

import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.task.dto.KanbanBoardDto;
import com.insuretech.pms.task.dto.TaskDto;
import com.insuretech.pms.task.dto.TaskMoveRequest;
import com.insuretech.pms.task.reactive.entity.R2dbcKanbanColumn;
import com.insuretech.pms.task.reactive.entity.R2dbcTask;
import com.insuretech.pms.task.reactive.repository.ReactiveKanbanColumnRepository;
import com.insuretech.pms.task.reactive.repository.ReactiveTaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.reactive.TransactionalOperator;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveKanbanService {

    private final ReactiveTaskRepository taskRepository;
    private final ReactiveKanbanColumnRepository columnRepository;
    private final TransactionalOperator transactionalOperator;

    // SSE event sinks for real-time updates per project
    private final Map<String, Sinks.Many<TaskEvent>> projectEventSinks = new ConcurrentHashMap<>();

    public Mono<KanbanBoardDto> getKanbanBoard(String projectId) {
        return columnRepository.findByProjectIdOrderByOrderNumAsc(projectId)
                .flatMap(column -> taskRepository.findByColumnIdOrderByOrderNumAsc(column.getId())
                        .map(this::toTaskDto)
                        .collectList()
                        .map(tasks -> KanbanBoardDto.ColumnDto.builder()
                                .id(column.getId())
                                .name(column.getName())
                                .orderNum(column.getOrderNum())
                                .wipLimit(column.getWipLimit())
                                .color(column.getColor())
                                .tasks(tasks)
                                .build()))
                .collectList()
                .map(columns -> KanbanBoardDto.builder()
                        .projectId(projectId)
                        .columns(columns)
                        .build());
    }

    public Mono<TaskDto> createTask(String projectId, TaskDto dto) {
        return columnRepository.findByProjectIdOrderByOrderNumAsc(projectId)
                .next()
                .switchIfEmpty(Mono.error(CustomException.notFound("No kanban columns found for project")))
                .flatMap(column -> {
                    R2dbcTask task = R2dbcTask.builder()
                            .id(UUID.randomUUID().toString())
                            .columnId(column.getId())
                            .title(dto.getTitle())
                            .description(dto.getDescription())
                            .assigneeId(dto.getAssigneeId())
                            .priority(dto.getPriority() != null ? dto.getPriority() : "MEDIUM")
                            .status("TODO")
                            .dueDate(dto.getDueDate())
                            .tags(dto.getTags())
                            .build();
                    return taskRepository.save(task);
                })
                .map(this::toTaskDto)
                .as(transactionalOperator::transactional)
                .doOnSuccess(task -> emitEvent(projectId, TaskEvent.created(task)));
    }

    public Mono<TaskDto> moveTask(String taskId, TaskMoveRequest request) {
        return taskRepository.findById(taskId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Task not found: " + taskId)))
                .flatMap(task -> {
                    String oldColumnId = task.getColumnId();
                    task.setColumnId(request.getTargetColumnId());
                    task.setOrderNum(request.getOrderNum());
                    return taskRepository.save(task)
                            .map(savedTask -> {
                                TaskDto dto = toTaskDto(savedTask);
                                dto.setPreviousColumnId(oldColumnId);
                                return dto;
                            });
                })
                .as(transactionalOperator::transactional)
                .doOnSuccess(task -> {
                    String projectId = getProjectIdFromColumn(request.getTargetColumnId());
                    if (projectId != null) {
                        emitEvent(projectId, TaskEvent.moved(task));
                    }
                });
    }

    public Mono<TaskDto> updateTask(String taskId, TaskDto dto) {
        return taskRepository.findById(taskId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Task not found: " + taskId)))
                .flatMap(task -> {
                    task.setTitle(dto.getTitle());
                    task.setDescription(dto.getDescription());
                    task.setAssigneeId(dto.getAssigneeId());
                    if (dto.getPriority() != null) {
                        task.setPriority(dto.getPriority());
                    }
                    if (dto.getStatus() != null) {
                        task.setStatus(dto.getStatus());
                    }
                    task.setDueDate(dto.getDueDate());
                    task.setTags(dto.getTags());
                    return taskRepository.save(task);
                })
                .map(this::toTaskDto)
                .as(transactionalOperator::transactional)
                .doOnSuccess(task -> {
                    String projectId = getProjectIdFromColumn(task.getColumnId());
                    if (projectId != null) {
                        emitEvent(projectId, TaskEvent.updated(task));
                    }
                });
    }

    public Mono<Void> deleteTask(String taskId) {
        return taskRepository.findById(taskId)
                .switchIfEmpty(Mono.error(CustomException.notFound("Task not found: " + taskId)))
                .flatMap(task -> {
                    String columnId = task.getColumnId();
                    return taskRepository.delete(task)
                            .then(Mono.fromRunnable(() -> {
                                String projectId = getProjectIdFromColumn(columnId);
                                if (projectId != null) {
                                    emitEvent(projectId, TaskEvent.deleted(taskId));
                                }
                            }));
                });
    }

    // SSE streaming for real-time updates
    public Flux<TaskEvent> streamTaskEvents(String projectId) {
        return getOrCreateSink(projectId).asFlux()
                .doOnCancel(() -> log.debug("Client disconnected from kanban stream: {}", projectId));
    }

    private Sinks.Many<TaskEvent> getOrCreateSink(String projectId) {
        return projectEventSinks.computeIfAbsent(projectId,
                id -> Sinks.many().multicast().onBackpressureBuffer(256));
    }

    private void emitEvent(String projectId, TaskEvent event) {
        Sinks.Many<TaskEvent> sink = projectEventSinks.get(projectId);
        if (sink != null) {
            sink.tryEmitNext(event);
        }
    }

    private String getProjectIdFromColumn(String columnId) {
        // In a real implementation, cache this lookup
        return columnRepository.findById(columnId)
                .map(R2dbcKanbanColumn::getProjectId)
                .block();
    }

    private TaskDto toTaskDto(R2dbcTask task) {
        return TaskDto.builder()
                .id(task.getId())
                .columnId(task.getColumnId())
                .title(task.getTitle())
                .description(task.getDescription())
                .assigneeId(task.getAssigneeId())
                .priority(task.getPriority())
                .status(task.getStatus())
                .dueDate(task.getDueDate())
                .orderNum(task.getOrderNum())
                .tags(task.getTags())
                .sprintId(task.getSprintId())
                .userStoryId(task.getUserStoryId())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();
    }

    // Task event for SSE streaming
    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class TaskEvent {
        private String eventType;
        private String taskId;
        private TaskDto task;

        public static TaskEvent created(TaskDto task) {
            return TaskEvent.builder()
                    .eventType("CREATED")
                    .taskId(task.getId())
                    .task(task)
                    .build();
        }

        public static TaskEvent updated(TaskDto task) {
            return TaskEvent.builder()
                    .eventType("UPDATED")
                    .taskId(task.getId())
                    .task(task)
                    .build();
        }

        public static TaskEvent moved(TaskDto task) {
            return TaskEvent.builder()
                    .eventType("MOVED")
                    .taskId(task.getId())
                    .task(task)
                    .build();
        }

        public static TaskEvent deleted(String taskId) {
            return TaskEvent.builder()
                    .eventType("DELETED")
                    .taskId(taskId)
                    .build();
        }
    }
}
