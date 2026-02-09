package com.insuretech.pms.support;

import com.insuretech.pms.auth.reactive.entity.R2dbcUser;
import com.insuretech.pms.project.reactive.entity.*;
import com.insuretech.pms.task.reactive.entity.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Factory class for creating R2DBC test entities.
 * Provides fluent builders for all reactive entities used in testing.
 */
public final class R2dbcTestDataFactory {

    private static final AtomicInteger counter = new AtomicInteger(0);

    private R2dbcTestDataFactory() {
    }

    public static void resetCounter() {
        counter.set(0);
    }

    private static int nextId() {
        return counter.incrementAndGet();
    }

    // ========== User ==========
    public static UserBuilder user() {
        return new UserBuilder();
    }

    public static R2dbcUser defaultUser() {
        return user().build();
    }

    public static R2dbcUser admin() {
        return user().role("ADMIN").build();
    }

    public static R2dbcUser pm() {
        return user().role("PM").build();
    }

    public static R2dbcUser developer() {
        return user().role("DEVELOPER").build();
    }

    // ========== Project ==========
    public static ProjectBuilder project() {
        return new ProjectBuilder();
    }

    public static R2dbcProject defaultProject() {
        return project().build();
    }

    // ========== ProjectMember ==========
    public static ProjectMemberBuilder projectMember() {
        return new ProjectMemberBuilder();
    }

    public static R2dbcProjectMember defaultProjectMember(String projectId, String userId) {
        return projectMember().projectId(projectId).userId(userId).build();
    }

    // ========== Phase ==========
    public static PhaseBuilder phase() {
        return new PhaseBuilder();
    }

    public static R2dbcPhase defaultPhase(String projectId) {
        return phase().projectId(projectId).build();
    }

    // ========== Sprint ==========
    public static SprintBuilder sprint() {
        return new SprintBuilder();
    }

    public static R2dbcSprint defaultSprint(String projectId) {
        return sprint().projectId(projectId).build();
    }

    public static R2dbcSprint activeSprint(String projectId) {
        return sprint().projectId(projectId).status("ACTIVE").build();
    }

    // ========== UserStory ==========
    public static UserStoryBuilder userStory() {
        return new UserStoryBuilder();
    }

    public static R2dbcUserStory defaultUserStory(String projectId) {
        return userStory().projectId(projectId).build();
    }

    // ========== Task ==========
    public static TaskBuilder task() {
        return new TaskBuilder();
    }

    public static R2dbcTask defaultTask(String columnId) {
        return task().columnId(columnId).build();
    }

    // ========== KanbanColumn ==========
    public static KanbanColumnBuilder kanbanColumn() {
        return new KanbanColumnBuilder();
    }

    public static R2dbcKanbanColumn defaultKanbanColumn(String projectId) {
        return kanbanColumn().projectId(projectId).build();
    }

    // ========== Part ==========
    public static PartBuilder part() {
        return new PartBuilder();
    }

    public static R2dbcPart defaultPart(String projectId) {
        return part().projectId(projectId).build();
    }

    // ========== WbsGroup ==========
    public static WbsGroupBuilder wbsGroup() {
        return new WbsGroupBuilder();
    }

    public static R2dbcWbsGroup defaultWbsGroup(String phaseId) {
        return wbsGroup().phaseId(phaseId).build();
    }

    // ========== WbsItem ==========
    public static WbsItemBuilder wbsItem() {
        return new WbsItemBuilder();
    }

    public static R2dbcWbsItem defaultWbsItem(String groupId) {
        return wbsItem().groupId(groupId).build();
    }

    // ========== WbsTask ==========
    public static WbsTaskBuilder wbsTask() {
        return new WbsTaskBuilder();
    }

    public static R2dbcWbsTask defaultWbsTask(String itemId) {
        return wbsTask().itemId(itemId).build();
    }

    // ========== Epic ==========
    public static EpicBuilder epic() {
        return new EpicBuilder();
    }

    public static R2dbcEpic defaultEpic(String projectId) {
        return epic().projectId(projectId).build();
    }

    // ========== Feature ==========
    public static FeatureBuilder feature() {
        return new FeatureBuilder();
    }

    public static R2dbcFeature defaultFeature(String epicId) {
        return feature().epicId(epicId).build();
    }

    // ========== Backlog ==========
    public static BacklogBuilder backlog() {
        return new BacklogBuilder();
    }

    public static R2dbcBacklog defaultBacklog(String projectId) {
        return backlog().projectId(projectId).build();
    }

    // ========== BacklogItem ==========
    public static BacklogItemBuilder backlogItem() {
        return new BacklogItemBuilder();
    }

    public static R2dbcBacklogItem defaultBacklogItem(String backlogId) {
        return backlogItem().backlogId(backlogId).build();
    }

    // ========== Kpi ==========
    public static KpiBuilder kpi() {
        return new KpiBuilder();
    }

    public static R2dbcKpi defaultKpi(String phaseId) {
        return kpi().phaseId(phaseId).build();
    }

    // ========== Deliverable ==========
    public static DeliverableBuilder deliverable() {
        return new DeliverableBuilder();
    }

    public static R2dbcDeliverable defaultDeliverable(String phaseId) {
        return deliverable().phaseId(phaseId).build();
    }

    // ========== Issue ==========
    public static IssueBuilder issue() {
        return new IssueBuilder();
    }

    public static R2dbcIssue defaultIssue(String projectId) {
        return issue().projectId(projectId).build();
    }

    // ========== Meeting ==========
    public static MeetingBuilder meeting() {
        return new MeetingBuilder();
    }

    public static R2dbcMeeting defaultMeeting(String projectId) {
        return meeting().projectId(projectId).build();
    }

    // ========== WeeklyReport ==========
    public static WeeklyReportBuilder weeklyReport() {
        return new WeeklyReportBuilder();
    }

    public static R2dbcWeeklyReport defaultWeeklyReport(String projectId) {
        return weeklyReport().projectId(projectId).build();
    }

    // ========== Builder Classes ==========

    public static class UserBuilder {
        private String id = UUID.randomUUID().toString();
        private String email;
        private String password = "password123";
        private String name;
        private String role = "DEVELOPER";
        private String department = "Engineering";
        private Boolean active = true;
        private LocalDateTime lastLoginAt;
        private LocalDateTime createdAt = LocalDateTime.now();
        private LocalDateTime updatedAt = LocalDateTime.now();

        public UserBuilder() {
            int idx = nextId();
            this.email = "user" + idx + "@test.com";
            this.name = "Test User " + idx;
        }

        public UserBuilder id(String id) { this.id = id; return this; }
        public UserBuilder email(String email) { this.email = email; return this; }
        public UserBuilder password(String password) { this.password = password; return this; }
        public UserBuilder name(String name) { this.name = name; return this; }
        public UserBuilder role(String role) { this.role = role; return this; }
        public UserBuilder department(String department) { this.department = department; return this; }
        public UserBuilder active(Boolean active) { this.active = active; return this; }
        public UserBuilder lastLoginAt(LocalDateTime lastLoginAt) { this.lastLoginAt = lastLoginAt; return this; }

        public R2dbcUser build() {
            R2dbcUser user = R2dbcUser.builder()
                    .id(id)
                    .email(email)
                    .password(password)
                    .name(name)
                    .role(role)
                    .department(department)
                    .active(active)
                    .lastLoginAt(lastLoginAt)
                    .build();
            user.setCreatedAt(createdAt);
            user.setUpdatedAt(updatedAt);
            return user;
        }
    }

    public static class ProjectBuilder {
        private String id = UUID.randomUUID().toString();
        private String name;
        private String description;
        private String status = "PLANNING";
        private LocalDate startDate = LocalDate.now();
        private LocalDate endDate = LocalDate.now().plusMonths(6);
        private BigDecimal budget = new BigDecimal("1000000");
        private BigDecimal aiWeight = new BigDecimal("0.70");
        private BigDecimal siWeight = new BigDecimal("0.30");
        private Integer progress = 0;
        private Boolean isDefault = false;
        private LocalDateTime createdAt = LocalDateTime.now();
        private LocalDateTime updatedAt = LocalDateTime.now();

        public ProjectBuilder() {
            int idx = nextId();
            this.name = "Test Project " + idx;
            this.description = "Description for test project " + idx;
        }

        public ProjectBuilder id(String id) { this.id = id; return this; }
        public ProjectBuilder name(String name) { this.name = name; return this; }
        public ProjectBuilder description(String description) { this.description = description; return this; }
        public ProjectBuilder status(String status) { this.status = status; return this; }
        public ProjectBuilder startDate(LocalDate startDate) { this.startDate = startDate; return this; }
        public ProjectBuilder endDate(LocalDate endDate) { this.endDate = endDate; return this; }
        public ProjectBuilder budget(BigDecimal budget) { this.budget = budget; return this; }
        public ProjectBuilder aiWeight(BigDecimal aiWeight) { this.aiWeight = aiWeight; return this; }
        public ProjectBuilder siWeight(BigDecimal siWeight) { this.siWeight = siWeight; return this; }
        public ProjectBuilder progress(Integer progress) { this.progress = progress; return this; }
        public ProjectBuilder isDefault(Boolean isDefault) { this.isDefault = isDefault; return this; }

        public R2dbcProject build() {
            R2dbcProject project = R2dbcProject.builder()
                    .id(id)
                    .name(name)
                    .description(description)
                    .status(status)
                    .startDate(startDate)
                    .endDate(endDate)
                    .budget(budget)
                    .aiWeight(aiWeight)
                    .siWeight(siWeight)
                    .progress(progress)
                    .isDefault(isDefault)
                    .build();
            project.setCreatedAt(createdAt);
            project.setUpdatedAt(updatedAt);
            return project;
        }
    }

    public static class ProjectMemberBuilder {
        private String id = UUID.randomUUID().toString();
        private String projectId;
        private String userId;
        private String role = "DEVELOPER";
        private Boolean active = true;
        private LocalDateTime createdAt = LocalDateTime.now();
        private LocalDateTime updatedAt = LocalDateTime.now();

        public ProjectMemberBuilder id(String id) { this.id = id; return this; }
        public ProjectMemberBuilder projectId(String projectId) { this.projectId = projectId; return this; }
        public ProjectMemberBuilder userId(String userId) { this.userId = userId; return this; }
        public ProjectMemberBuilder role(String role) { this.role = role; return this; }
        public ProjectMemberBuilder active(Boolean active) { this.active = active; return this; }

        public R2dbcProjectMember build() {
            R2dbcProjectMember member = R2dbcProjectMember.builder()
                    .id(id)
                    .projectId(projectId)
                    .userId(userId)
                    .role(role)
                    .active(active)
                    .build();
            member.setCreatedAt(createdAt);
            member.setUpdatedAt(updatedAt);
            return member;
        }
    }

    public static class PhaseBuilder {
        private String id = UUID.randomUUID().toString();
        private String projectId;
        private String name;
        private Integer orderNum = 1;
        private String status = "NOT_STARTED";
        private String gateStatus;
        private LocalDate startDate = LocalDate.now();
        private LocalDate endDate = LocalDate.now().plusMonths(1);
        private Integer progress = 0;
        private String description;
        private String trackType = "COMMON";
        private LocalDateTime createdAt = LocalDateTime.now();
        private LocalDateTime updatedAt = LocalDateTime.now();

        public PhaseBuilder() {
            int idx = nextId();
            this.name = "Test Phase " + idx;
            this.description = "Description for phase " + idx;
        }

        public PhaseBuilder id(String id) { this.id = id; return this; }
        public PhaseBuilder projectId(String projectId) { this.projectId = projectId; return this; }
        public PhaseBuilder name(String name) { this.name = name; return this; }
        public PhaseBuilder orderNum(Integer orderNum) { this.orderNum = orderNum; return this; }
        public PhaseBuilder status(String status) { this.status = status; return this; }
        public PhaseBuilder gateStatus(String gateStatus) { this.gateStatus = gateStatus; return this; }
        public PhaseBuilder startDate(LocalDate startDate) { this.startDate = startDate; return this; }
        public PhaseBuilder endDate(LocalDate endDate) { this.endDate = endDate; return this; }
        public PhaseBuilder progress(Integer progress) { this.progress = progress; return this; }
        public PhaseBuilder description(String description) { this.description = description; return this; }
        public PhaseBuilder trackType(String trackType) { this.trackType = trackType; return this; }

        public R2dbcPhase build() {
            R2dbcPhase phase = R2dbcPhase.builder()
                    .id(id)
                    .projectId(projectId)
                    .name(name)
                    .orderNum(orderNum)
                    .status(status)
                    .gateStatus(gateStatus)
                    .startDate(startDate)
                    .endDate(endDate)
                    .progress(progress)
                    .description(description)
                    .trackType(trackType)
                    .build();
            phase.setCreatedAt(createdAt);
            phase.setUpdatedAt(updatedAt);
            return phase;
        }
    }

    public static class SprintBuilder {
        private String id = UUID.randomUUID().toString();
        private String projectId;
        private String name;
        private String goal;
        private LocalDate startDate = LocalDate.now();
        private LocalDate endDate = LocalDate.now().plusWeeks(2);
        private String status = "PLANNED";
        private Integer conwipLimit = 10;
        private Boolean enableWipValidation = true;
        private String neo4jNodeId;
        private LocalDateTime createdAt = LocalDateTime.now();
        private LocalDateTime updatedAt = LocalDateTime.now();

        public SprintBuilder() {
            int idx = nextId();
            this.name = "Sprint " + idx;
            this.goal = "Goal for sprint " + idx;
        }

        public SprintBuilder id(String id) { this.id = id; return this; }
        public SprintBuilder projectId(String projectId) { this.projectId = projectId; return this; }
        public SprintBuilder name(String name) { this.name = name; return this; }
        public SprintBuilder goal(String goal) { this.goal = goal; return this; }
        public SprintBuilder startDate(LocalDate startDate) { this.startDate = startDate; return this; }
        public SprintBuilder endDate(LocalDate endDate) { this.endDate = endDate; return this; }
        public SprintBuilder status(String status) { this.status = status; return this; }
        public SprintBuilder conwipLimit(Integer conwipLimit) { this.conwipLimit = conwipLimit; return this; }
        public SprintBuilder enableWipValidation(Boolean enableWipValidation) { this.enableWipValidation = enableWipValidation; return this; }
        public SprintBuilder neo4jNodeId(String neo4jNodeId) { this.neo4jNodeId = neo4jNodeId; return this; }

        public R2dbcSprint build() {
            R2dbcSprint sprint = R2dbcSprint.builder()
                    .id(id)
                    .projectId(projectId)
                    .name(name)
                    .goal(goal)
                    .startDate(startDate)
                    .endDate(endDate)
                    .status(status)
                    .conwipLimit(conwipLimit)
                    .enableWipValidation(enableWipValidation)
                    .neo4jNodeId(neo4jNodeId)
                    .build();
            sprint.setCreatedAt(createdAt);
            sprint.setUpdatedAt(updatedAt);
            return sprint;
        }
    }

    public static class UserStoryBuilder {
        private String id = UUID.randomUUID().toString();
        private String projectId;
        private String sprintId;
        private String title;
        private String description;
        private String acceptanceCriteria;
        private String priority = "MEDIUM";
        private Integer storyPoints = 3;
        private String status = "IDEA";
        private String assigneeId;
        private String epic;
        private Integer priorityOrder = 1;
        private String featureId;
        private String wbsItemId;
        private String partId;
        private LocalDateTime createdAt = LocalDateTime.now();
        private LocalDateTime updatedAt = LocalDateTime.now();

        public UserStoryBuilder() {
            int idx = nextId();
            this.title = "User Story " + idx;
            this.description = "As a user, I want feature " + idx;
            this.acceptanceCriteria = "Given precondition\nWhen action\nThen result";
            this.epic = "Epic " + idx;
        }

        public UserStoryBuilder id(String id) { this.id = id; return this; }
        public UserStoryBuilder projectId(String projectId) { this.projectId = projectId; return this; }
        public UserStoryBuilder sprintId(String sprintId) { this.sprintId = sprintId; return this; }
        public UserStoryBuilder title(String title) { this.title = title; return this; }
        public UserStoryBuilder description(String description) { this.description = description; return this; }
        public UserStoryBuilder acceptanceCriteria(String acceptanceCriteria) { this.acceptanceCriteria = acceptanceCriteria; return this; }
        public UserStoryBuilder priority(String priority) { this.priority = priority; return this; }
        public UserStoryBuilder storyPoints(Integer storyPoints) { this.storyPoints = storyPoints; return this; }
        public UserStoryBuilder status(String status) { this.status = status; return this; }
        public UserStoryBuilder assigneeId(String assigneeId) { this.assigneeId = assigneeId; return this; }
        public UserStoryBuilder epic(String epic) { this.epic = epic; return this; }
        public UserStoryBuilder priorityOrder(Integer priorityOrder) { this.priorityOrder = priorityOrder; return this; }
        public UserStoryBuilder featureId(String featureId) { this.featureId = featureId; return this; }
        public UserStoryBuilder wbsItemId(String wbsItemId) { this.wbsItemId = wbsItemId; return this; }
        public UserStoryBuilder partId(String partId) { this.partId = partId; return this; }

        public R2dbcUserStory build() {
            R2dbcUserStory story = R2dbcUserStory.builder()
                    .id(id)
                    .projectId(projectId)
                    .sprintId(sprintId)
                    .title(title)
                    .description(description)
                    .acceptanceCriteria(acceptanceCriteria)
                    .priority(priority)
                    .storyPoints(storyPoints)
                    .status(status)
                    .assigneeId(assigneeId)
                    .epic(epic)
                    .priorityOrder(priorityOrder)
                    .featureId(featureId)
                    .wbsItemId(wbsItemId)
                    .partId(partId)
                    .build();
            story.setCreatedAt(createdAt);
            story.setUpdatedAt(updatedAt);
            return story;
        }
    }

    public static class TaskBuilder {
        private String id = UUID.randomUUID().toString();
        private String columnId;
        private String phaseId;
        private String title;
        private String description;
        private String assigneeId;
        private String priority = "MEDIUM";
        private String status = "TODO";
        private LocalDate dueDate = LocalDate.now().plusWeeks(1);
        private Integer orderNum = 1;
        private String tags;
        private String sprintId;
        private String userStoryId;
        private String requirementId;
        private String partId;
        private String trackType = "COMMON";
        private LocalDateTime createdAt = LocalDateTime.now();
        private LocalDateTime updatedAt = LocalDateTime.now();

        public TaskBuilder() {
            int idx = nextId();
            this.title = "Task " + idx;
            this.description = "Task description " + idx;
        }

        public TaskBuilder id(String id) { this.id = id; return this; }
        public TaskBuilder columnId(String columnId) { this.columnId = columnId; return this; }
        public TaskBuilder phaseId(String phaseId) { this.phaseId = phaseId; return this; }
        public TaskBuilder title(String title) { this.title = title; return this; }
        public TaskBuilder description(String description) { this.description = description; return this; }
        public TaskBuilder assigneeId(String assigneeId) { this.assigneeId = assigneeId; return this; }
        public TaskBuilder priority(String priority) { this.priority = priority; return this; }
        public TaskBuilder status(String status) { this.status = status; return this; }
        public TaskBuilder dueDate(LocalDate dueDate) { this.dueDate = dueDate; return this; }
        public TaskBuilder orderNum(Integer orderNum) { this.orderNum = orderNum; return this; }
        public TaskBuilder tags(String tags) { this.tags = tags; return this; }
        public TaskBuilder sprintId(String sprintId) { this.sprintId = sprintId; return this; }
        public TaskBuilder userStoryId(String userStoryId) { this.userStoryId = userStoryId; return this; }
        public TaskBuilder requirementId(String requirementId) { this.requirementId = requirementId; return this; }
        public TaskBuilder partId(String partId) { this.partId = partId; return this; }
        public TaskBuilder trackType(String trackType) { this.trackType = trackType; return this; }

        public R2dbcTask build() {
            R2dbcTask task = R2dbcTask.builder()
                    .id(id)
                    .columnId(columnId)
                    .phaseId(phaseId)
                    .title(title)
                    .description(description)
                    .assigneeId(assigneeId)
                    .priority(priority)
                    .status(status)
                    .dueDate(dueDate)
                    .orderNum(orderNum)
                    .tags(tags)
                    .sprintId(sprintId)
                    .userStoryId(userStoryId)
                    .requirementId(requirementId)
                    .partId(partId)
                    .trackType(trackType)
                    .build();
            task.setCreatedAt(createdAt);
            task.setUpdatedAt(updatedAt);
            return task;
        }
    }

    public static class KanbanColumnBuilder {
        private String id = UUID.randomUUID().toString();
        private String projectId;
        private String name;
        private Integer orderNum = 1;
        private Integer wipLimit;
        private LocalDateTime createdAt = LocalDateTime.now();
        private LocalDateTime updatedAt = LocalDateTime.now();

        public KanbanColumnBuilder() {
            int idx = nextId();
            this.name = "Column " + idx;
        }

        public KanbanColumnBuilder id(String id) { this.id = id; return this; }
        public KanbanColumnBuilder projectId(String projectId) { this.projectId = projectId; return this; }
        public KanbanColumnBuilder name(String name) { this.name = name; return this; }
        public KanbanColumnBuilder orderNum(Integer orderNum) { this.orderNum = orderNum; return this; }
        public KanbanColumnBuilder wipLimit(Integer wipLimit) { this.wipLimit = wipLimit; return this; }

        public R2dbcKanbanColumn build() {
            R2dbcKanbanColumn column = R2dbcKanbanColumn.builder()
                    .id(id)
                    .projectId(projectId)
                    .name(name)
                    .orderNum(orderNum)
                    .wipLimit(wipLimit)
                    .build();
            column.setCreatedAt(createdAt);
            column.setUpdatedAt(updatedAt);
            return column;
        }
    }

    public static class PartBuilder {
        private String id = UUID.randomUUID().toString();
        private String projectId;
        private String name;
        private String description;
        private String leaderId;
        private String leaderName;
        private String status = "ACTIVE";
        private LocalDate startDate = LocalDate.now();
        private LocalDate endDate = LocalDate.now().plusMonths(1);
        private Integer progress = 0;
        private LocalDateTime createdAt = LocalDateTime.now();
        private LocalDateTime updatedAt = LocalDateTime.now();

        public PartBuilder() {
            int idx = nextId();
            this.name = "Part " + idx;
            this.description = "Part description " + idx;
        }

        public PartBuilder id(String id) { this.id = id; return this; }
        public PartBuilder projectId(String projectId) { this.projectId = projectId; return this; }
        public PartBuilder name(String name) { this.name = name; return this; }
        public PartBuilder description(String description) { this.description = description; return this; }
        public PartBuilder leaderId(String leaderId) { this.leaderId = leaderId; return this; }
        public PartBuilder leaderName(String leaderName) { this.leaderName = leaderName; return this; }
        public PartBuilder status(String status) { this.status = status; return this; }
        public PartBuilder startDate(LocalDate startDate) { this.startDate = startDate; return this; }
        public PartBuilder endDate(LocalDate endDate) { this.endDate = endDate; return this; }
        public PartBuilder progress(Integer progress) { this.progress = progress; return this; }

        public R2dbcPart build() {
            R2dbcPart part = R2dbcPart.builder()
                    .id(id)
                    .projectId(projectId)
                    .name(name)
                    .description(description)
                    .leaderId(leaderId)
                    .leaderName(leaderName)
                    .status(status)
                    .startDate(startDate)
                    .endDate(endDate)
                    .progress(progress)
                    .build();
            part.setCreatedAt(createdAt);
            part.setUpdatedAt(updatedAt);
            return part;
        }
    }

    public static class WbsGroupBuilder {
        private String id = UUID.randomUUID().toString();
        private String phaseId;
        private String name;
        private Integer orderNum = 1;
        private Integer progress = 0;
        private LocalDateTime createdAt = LocalDateTime.now();
        private LocalDateTime updatedAt = LocalDateTime.now();

        public WbsGroupBuilder() {
            int idx = nextId();
            this.name = "WBS Group " + idx;
        }

        public WbsGroupBuilder id(String id) { this.id = id; return this; }
        public WbsGroupBuilder phaseId(String phaseId) { this.phaseId = phaseId; return this; }
        public WbsGroupBuilder name(String name) { this.name = name; return this; }
        public WbsGroupBuilder orderNum(Integer orderNum) { this.orderNum = orderNum; return this; }
        public WbsGroupBuilder progress(Integer progress) { this.progress = progress; return this; }

        public R2dbcWbsGroup build() {
            R2dbcWbsGroup group = R2dbcWbsGroup.builder()
                    .id(id)
                    .phaseId(phaseId)
                    .name(name)
                    .orderNum(orderNum)
                    .progress(progress)
                    .build();
            group.setCreatedAt(createdAt);
            group.setUpdatedAt(updatedAt);
            return group;
        }
    }

    public static class WbsItemBuilder {
        private String id = UUID.randomUUID().toString();
        private String groupId;
        private String phaseId;
        private String code;
        private String name;
        private String description;
        private String status = "NOT_STARTED";
        private Integer progress = 0;
        private LocalDate plannedStartDate = LocalDate.now();
        private LocalDate plannedEndDate = LocalDate.now().plusWeeks(1);
        private LocalDate actualStartDate;
        private LocalDate actualEndDate;
        private Integer weight = 100;
        private Integer orderNum = 0;
        private Integer estimatedHours;
        private Integer actualHours;
        private String assigneeId;
        private LocalDateTime createdAt = LocalDateTime.now();
        private LocalDateTime updatedAt = LocalDateTime.now();

        public WbsItemBuilder() {
            int idx = nextId();
            this.code = "WI-" + idx;
            this.name = "WBS Item " + idx;
            this.description = "WBS Item description " + idx;
        }

        public WbsItemBuilder id(String id) { this.id = id; return this; }
        public WbsItemBuilder groupId(String groupId) { this.groupId = groupId; return this; }
        public WbsItemBuilder phaseId(String phaseId) { this.phaseId = phaseId; return this; }
        public WbsItemBuilder code(String code) { this.code = code; return this; }
        public WbsItemBuilder name(String name) { this.name = name; return this; }
        public WbsItemBuilder description(String description) { this.description = description; return this; }
        public WbsItemBuilder status(String status) { this.status = status; return this; }
        public WbsItemBuilder progress(Integer progress) { this.progress = progress; return this; }
        public WbsItemBuilder plannedStartDate(LocalDate plannedStartDate) { this.plannedStartDate = plannedStartDate; return this; }
        public WbsItemBuilder plannedEndDate(LocalDate plannedEndDate) { this.plannedEndDate = plannedEndDate; return this; }
        public WbsItemBuilder actualStartDate(LocalDate actualStartDate) { this.actualStartDate = actualStartDate; return this; }
        public WbsItemBuilder actualEndDate(LocalDate actualEndDate) { this.actualEndDate = actualEndDate; return this; }
        public WbsItemBuilder weight(Integer weight) { this.weight = weight; return this; }
        public WbsItemBuilder orderNum(Integer orderNum) { this.orderNum = orderNum; return this; }
        public WbsItemBuilder estimatedHours(Integer estimatedHours) { this.estimatedHours = estimatedHours; return this; }
        public WbsItemBuilder actualHours(Integer actualHours) { this.actualHours = actualHours; return this; }
        public WbsItemBuilder assigneeId(String assigneeId) { this.assigneeId = assigneeId; return this; }

        public R2dbcWbsItem build() {
            R2dbcWbsItem item = R2dbcWbsItem.builder()
                    .id(id)
                    .groupId(groupId)
                    .phaseId(phaseId)
                    .code(code)
                    .name(name)
                    .description(description)
                    .status(status)
                    .progress(progress)
                    .plannedStartDate(plannedStartDate)
                    .plannedEndDate(plannedEndDate)
                    .actualStartDate(actualStartDate)
                    .actualEndDate(actualEndDate)
                    .weight(weight)
                    .orderNum(orderNum)
                    .estimatedHours(estimatedHours)
                    .actualHours(actualHours)
                    .assigneeId(assigneeId)
                    .build();
            item.setCreatedAt(createdAt);
            item.setUpdatedAt(updatedAt);
            return item;
        }
    }

    public static class WbsTaskBuilder {
        private String id = UUID.randomUUID().toString();
        private String itemId;
        private String groupId;
        private String phaseId;
        private String code;
        private String name;
        private String description;
        private String status = "NOT_STARTED";
        private Integer progress = 0;
        private Integer weight = 100;
        private Integer orderNum = 0;
        private Integer estimatedHours;
        private Integer actualHours;
        private String assigneeId;
        private String linkedTaskId;
        private LocalDate plannedStartDate = LocalDate.now();
        private LocalDate plannedEndDate = LocalDate.now().plusDays(3);
        private LocalDate actualStartDate;
        private LocalDate actualEndDate;
        private LocalDateTime createdAt = LocalDateTime.now();
        private LocalDateTime updatedAt = LocalDateTime.now();

        public WbsTaskBuilder() {
            int idx = nextId();
            this.code = "WT-" + idx;
            this.name = "WBS Task " + idx;
            this.description = "WBS Task description " + idx;
        }

        public WbsTaskBuilder id(String id) { this.id = id; return this; }
        public WbsTaskBuilder itemId(String itemId) { this.itemId = itemId; return this; }
        public WbsTaskBuilder groupId(String groupId) { this.groupId = groupId; return this; }
        public WbsTaskBuilder phaseId(String phaseId) { this.phaseId = phaseId; return this; }
        public WbsTaskBuilder code(String code) { this.code = code; return this; }
        public WbsTaskBuilder name(String name) { this.name = name; return this; }
        public WbsTaskBuilder description(String description) { this.description = description; return this; }
        public WbsTaskBuilder status(String status) { this.status = status; return this; }
        public WbsTaskBuilder progress(Integer progress) { this.progress = progress; return this; }
        public WbsTaskBuilder weight(Integer weight) { this.weight = weight; return this; }
        public WbsTaskBuilder orderNum(Integer orderNum) { this.orderNum = orderNum; return this; }
        public WbsTaskBuilder estimatedHours(Integer estimatedHours) { this.estimatedHours = estimatedHours; return this; }
        public WbsTaskBuilder actualHours(Integer actualHours) { this.actualHours = actualHours; return this; }
        public WbsTaskBuilder assigneeId(String assigneeId) { this.assigneeId = assigneeId; return this; }
        public WbsTaskBuilder linkedTaskId(String linkedTaskId) { this.linkedTaskId = linkedTaskId; return this; }
        public WbsTaskBuilder plannedStartDate(LocalDate plannedStartDate) { this.plannedStartDate = plannedStartDate; return this; }
        public WbsTaskBuilder plannedEndDate(LocalDate plannedEndDate) { this.plannedEndDate = plannedEndDate; return this; }
        public WbsTaskBuilder actualStartDate(LocalDate actualStartDate) { this.actualStartDate = actualStartDate; return this; }
        public WbsTaskBuilder actualEndDate(LocalDate actualEndDate) { this.actualEndDate = actualEndDate; return this; }

        public R2dbcWbsTask build() {
            R2dbcWbsTask task = R2dbcWbsTask.builder()
                    .id(id)
                    .itemId(itemId)
                    .groupId(groupId)
                    .phaseId(phaseId)
                    .code(code)
                    .name(name)
                    .description(description)
                    .status(status)
                    .progress(progress)
                    .weight(weight)
                    .orderNum(orderNum)
                    .estimatedHours(estimatedHours)
                    .actualHours(actualHours)
                    .assigneeId(assigneeId)
                    .linkedTaskId(linkedTaskId)
                    .plannedStartDate(plannedStartDate)
                    .plannedEndDate(plannedEndDate)
                    .actualStartDate(actualStartDate)
                    .actualEndDate(actualEndDate)
                    .build();
            task.setCreatedAt(createdAt);
            task.setUpdatedAt(updatedAt);
            return task;
        }
    }

    public static class EpicBuilder {
        private String id = UUID.randomUUID().toString();
        private String projectId;
        private String phaseId;
        private String name;
        private String description;
        private String status = "DRAFT";
        private String goal;
        private String ownerId;
        private LocalDate targetCompletionDate;
        private Integer businessValue;
        private Integer totalStoryPoints = 0;
        private Integer itemCount = 0;
        private String color;
        private Integer progress = 0;
        private String priority = "MEDIUM";
        private LocalDateTime createdAt = LocalDateTime.now();
        private LocalDateTime updatedAt = LocalDateTime.now();

        public EpicBuilder() {
            int idx = nextId();
            this.name = "Epic " + idx;
            this.description = "Epic description " + idx;
            this.goal = "Goal for epic " + idx;
        }

        public EpicBuilder id(String id) { this.id = id; return this; }
        public EpicBuilder projectId(String projectId) { this.projectId = projectId; return this; }
        public EpicBuilder phaseId(String phaseId) { this.phaseId = phaseId; return this; }
        public EpicBuilder name(String name) { this.name = name; return this; }
        public EpicBuilder description(String description) { this.description = description; return this; }
        public EpicBuilder status(String status) { this.status = status; return this; }
        public EpicBuilder goal(String goal) { this.goal = goal; return this; }
        public EpicBuilder ownerId(String ownerId) { this.ownerId = ownerId; return this; }
        public EpicBuilder targetCompletionDate(LocalDate targetCompletionDate) { this.targetCompletionDate = targetCompletionDate; return this; }
        public EpicBuilder businessValue(Integer businessValue) { this.businessValue = businessValue; return this; }
        public EpicBuilder totalStoryPoints(Integer totalStoryPoints) { this.totalStoryPoints = totalStoryPoints; return this; }
        public EpicBuilder itemCount(Integer itemCount) { this.itemCount = itemCount; return this; }
        public EpicBuilder color(String color) { this.color = color; return this; }
        public EpicBuilder progress(Integer progress) { this.progress = progress; return this; }
        public EpicBuilder priority(String priority) { this.priority = priority; return this; }

        public R2dbcEpic build() {
            R2dbcEpic epic = R2dbcEpic.builder()
                    .id(id)
                    .projectId(projectId)
                    .phaseId(phaseId)
                    .name(name)
                    .description(description)
                    .status(status)
                    .goal(goal)
                    .ownerId(ownerId)
                    .targetCompletionDate(targetCompletionDate)
                    .businessValue(businessValue)
                    .totalStoryPoints(totalStoryPoints)
                    .itemCount(itemCount)
                    .color(color)
                    .progress(progress)
                    .priority(priority)
                    .build();
            epic.setCreatedAt(createdAt);
            epic.setUpdatedAt(updatedAt);
            return epic;
        }
    }

    public static class FeatureBuilder {
        private String id = UUID.randomUUID().toString();
        private String epicId;
        private String partId;
        private String wbsGroupId;
        private String name;
        private String description;
        private String status = "OPEN";
        private String priority = "MEDIUM";
        private Integer orderNum = 0;
        private LocalDateTime createdAt = LocalDateTime.now();
        private LocalDateTime updatedAt = LocalDateTime.now();

        public FeatureBuilder() {
            int idx = nextId();
            this.name = "Feature " + idx;
            this.description = "Feature description " + idx;
        }

        public FeatureBuilder id(String id) { this.id = id; return this; }
        public FeatureBuilder epicId(String epicId) { this.epicId = epicId; return this; }
        public FeatureBuilder partId(String partId) { this.partId = partId; return this; }
        public FeatureBuilder wbsGroupId(String wbsGroupId) { this.wbsGroupId = wbsGroupId; return this; }
        public FeatureBuilder name(String name) { this.name = name; return this; }
        public FeatureBuilder description(String description) { this.description = description; return this; }
        public FeatureBuilder status(String status) { this.status = status; return this; }
        public FeatureBuilder priority(String priority) { this.priority = priority; return this; }
        public FeatureBuilder orderNum(Integer orderNum) { this.orderNum = orderNum; return this; }

        public R2dbcFeature build() {
            R2dbcFeature feature = R2dbcFeature.builder()
                    .id(id)
                    .epicId(epicId)
                    .partId(partId)
                    .wbsGroupId(wbsGroupId)
                    .name(name)
                    .description(description)
                    .status(status)
                    .priority(priority)
                    .orderNum(orderNum)
                    .build();
            feature.setCreatedAt(createdAt);
            feature.setUpdatedAt(updatedAt);
            return feature;
        }
    }

    public static class BacklogBuilder {
        private String id = UUID.randomUUID().toString();
        private String projectId;
        private String name = "Product Backlog";
        private String description;
        private String status = "ACTIVE";
        private LocalDateTime createdAt = LocalDateTime.now();
        private LocalDateTime updatedAt = LocalDateTime.now();

        public BacklogBuilder() {
            int idx = nextId();
            this.name = "Backlog " + idx;
            this.description = "Backlog description " + idx;
        }

        public BacklogBuilder id(String id) { this.id = id; return this; }
        public BacklogBuilder projectId(String projectId) { this.projectId = projectId; return this; }
        public BacklogBuilder name(String name) { this.name = name; return this; }
        public BacklogBuilder description(String description) { this.description = description; return this; }
        public BacklogBuilder status(String status) { this.status = status; return this; }

        public R2dbcBacklog build() {
            R2dbcBacklog backlog = R2dbcBacklog.builder()
                    .id(id)
                    .projectId(projectId)
                    .name(name)
                    .description(description)
                    .status(status)
                    .build();
            backlog.setCreatedAt(createdAt);
            backlog.setUpdatedAt(updatedAt);
            return backlog;
        }
    }

    public static class BacklogItemBuilder {
        private String id = UUID.randomUUID().toString();
        private String backlogId;
        private String requirementId;
        private String originType = "MANUAL";
        private String epicIdRef;
        private String epicId;
        private Integer priorityOrder = 1;
        private String status = "BACKLOG";
        private Integer storyPoints;
        private Integer estimatedEffortHours;
        private String acceptanceCriteria;
        private String sprintId;
        private LocalDateTime createdAt = LocalDateTime.now();
        private LocalDateTime updatedAt = LocalDateTime.now();

        public BacklogItemBuilder() {
            int idx = nextId();
            this.acceptanceCriteria = "Acceptance criteria " + idx;
        }

        public BacklogItemBuilder id(String id) { this.id = id; return this; }
        public BacklogItemBuilder backlogId(String backlogId) { this.backlogId = backlogId; return this; }
        public BacklogItemBuilder requirementId(String requirementId) { this.requirementId = requirementId; return this; }
        public BacklogItemBuilder originType(String originType) { this.originType = originType; return this; }
        public BacklogItemBuilder epicIdRef(String epicIdRef) { this.epicIdRef = epicIdRef; return this; }
        public BacklogItemBuilder epicId(String epicId) { this.epicId = epicId; return this; }
        public BacklogItemBuilder priorityOrder(Integer priorityOrder) { this.priorityOrder = priorityOrder; return this; }
        public BacklogItemBuilder status(String status) { this.status = status; return this; }
        public BacklogItemBuilder storyPoints(Integer storyPoints) { this.storyPoints = storyPoints; return this; }
        public BacklogItemBuilder estimatedEffortHours(Integer estimatedEffortHours) { this.estimatedEffortHours = estimatedEffortHours; return this; }
        public BacklogItemBuilder acceptanceCriteria(String acceptanceCriteria) { this.acceptanceCriteria = acceptanceCriteria; return this; }
        public BacklogItemBuilder sprintId(String sprintId) { this.sprintId = sprintId; return this; }

        public R2dbcBacklogItem build() {
            R2dbcBacklogItem item = R2dbcBacklogItem.builder()
                    .id(id)
                    .backlogId(backlogId)
                    .requirementId(requirementId)
                    .originType(originType)
                    .epicIdRef(epicIdRef)
                    .epicId(epicId)
                    .priorityOrder(priorityOrder)
                    .status(status)
                    .storyPoints(storyPoints)
                    .estimatedEffortHours(estimatedEffortHours)
                    .acceptanceCriteria(acceptanceCriteria)
                    .sprintId(sprintId)
                    .build();
            item.setCreatedAt(createdAt);
            item.setUpdatedAt(updatedAt);
            return item;
        }
    }

    public static class KpiBuilder {
        private String id = UUID.randomUUID().toString();
        private String projectId;
        private String name;
        private String category;
        private String target;
        private String current;
        private String status = "ON_TRACK";
        private LocalDateTime createdAt = LocalDateTime.now();
        private LocalDateTime updatedAt = LocalDateTime.now();

        public KpiBuilder() {
            int idx = nextId();
            this.name = "KPI " + idx;
            this.target = "100";
            this.current = "0";
        }

        public KpiBuilder id(String id) { this.id = id; return this; }
        /** @deprecated Use {@link #projectId(String)} instead */
        public KpiBuilder phaseId(String phaseId) { this.projectId = phaseId; return this; }
        public KpiBuilder projectId(String projectId) { this.projectId = projectId; return this; }
        public KpiBuilder name(String name) { this.name = name; return this; }
        public KpiBuilder category(String category) { this.category = category; return this; }
        public KpiBuilder target(String target) { this.target = target; return this; }
        public KpiBuilder current(String current) { this.current = current; return this; }
        public KpiBuilder status(String status) { this.status = status; return this; }

        public R2dbcKpi build() {
            R2dbcKpi kpi = R2dbcKpi.builder()
                    .id(id)
                    .projectId(projectId)
                    .name(name)
                    .category(category)
                    .target(target != null ? new java.math.BigDecimal(target) : null)
                    .current(current != null ? new java.math.BigDecimal(current) : null)
                    .status(status)
                    .build();
            kpi.setCreatedAt(createdAt);
            kpi.setUpdatedAt(updatedAt);
            return kpi;
        }
    }

    public static class DeliverableBuilder {
        private String id = UUID.randomUUID().toString();
        private String phaseId;
        private String name;
        private String description;
        private String type = "DOCUMENT";
        private String status = "PENDING";
        private String filePath;
        private String fileName;
        private Long fileSize;
        private String uploadedBy;
        private String approver;
        private LocalDateTime approvedAt;
        private LocalDateTime createdAt = LocalDateTime.now();
        private LocalDateTime updatedAt = LocalDateTime.now();

        public DeliverableBuilder() {
            int idx = nextId();
            this.name = "Deliverable " + idx;
            this.description = "Deliverable description " + idx;
        }

        public DeliverableBuilder id(String id) { this.id = id; return this; }
        public DeliverableBuilder phaseId(String phaseId) { this.phaseId = phaseId; return this; }
        public DeliverableBuilder name(String name) { this.name = name; return this; }
        public DeliverableBuilder description(String description) { this.description = description; return this; }
        public DeliverableBuilder type(String type) { this.type = type; return this; }
        public DeliverableBuilder status(String status) { this.status = status; return this; }
        public DeliverableBuilder filePath(String filePath) { this.filePath = filePath; return this; }
        public DeliverableBuilder fileName(String fileName) { this.fileName = fileName; return this; }
        public DeliverableBuilder fileSize(Long fileSize) { this.fileSize = fileSize; return this; }
        public DeliverableBuilder uploadedBy(String uploadedBy) { this.uploadedBy = uploadedBy; return this; }
        public DeliverableBuilder approver(String approver) { this.approver = approver; return this; }
        public DeliverableBuilder approvedAt(LocalDateTime approvedAt) { this.approvedAt = approvedAt; return this; }

        public R2dbcDeliverable build() {
            R2dbcDeliverable deliverable = R2dbcDeliverable.builder()
                    .id(id)
                    .phaseId(phaseId)
                    .name(name)
                    .description(description)
                    .type(type)
                    .status(status)
                    .filePath(filePath)
                    .fileName(fileName)
                    .fileSize(fileSize)
                    .uploadedBy(uploadedBy)
                    .approver(approver)
                    .approvedAt(approvedAt)
                    .build();
            deliverable.setCreatedAt(createdAt);
            deliverable.setUpdatedAt(updatedAt);
            return deliverable;
        }
    }

    public static class IssueBuilder {
        private String id = UUID.randomUUID().toString();
        private String projectId;
        private String title;
        private String description;
        private String issueType = "OTHER";
        private String priority = "MEDIUM";
        private String status = "OPEN";
        private String assignee;
        private String reporter;
        private String reviewer;
        private LocalDate dueDate;
        private LocalDateTime resolvedAt;
        private String resolution;
        private String comments;
        private LocalDateTime createdAt = LocalDateTime.now();
        private LocalDateTime updatedAt = LocalDateTime.now();

        public IssueBuilder() {
            int idx = nextId();
            this.title = "Issue " + idx;
            this.description = "Issue description " + idx;
        }

        public IssueBuilder id(String id) { this.id = id; return this; }
        public IssueBuilder projectId(String projectId) { this.projectId = projectId; return this; }
        public IssueBuilder title(String title) { this.title = title; return this; }
        public IssueBuilder description(String description) { this.description = description; return this; }
        public IssueBuilder issueType(String issueType) { this.issueType = issueType; return this; }
        public IssueBuilder priority(String priority) { this.priority = priority; return this; }
        public IssueBuilder status(String status) { this.status = status; return this; }
        public IssueBuilder assignee(String assignee) { this.assignee = assignee; return this; }
        public IssueBuilder reporter(String reporter) { this.reporter = reporter; return this; }
        public IssueBuilder reviewer(String reviewer) { this.reviewer = reviewer; return this; }
        public IssueBuilder dueDate(LocalDate dueDate) { this.dueDate = dueDate; return this; }
        public IssueBuilder resolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; return this; }
        public IssueBuilder resolution(String resolution) { this.resolution = resolution; return this; }
        public IssueBuilder comments(String comments) { this.comments = comments; return this; }

        public R2dbcIssue build() {
            R2dbcIssue issue = R2dbcIssue.builder()
                    .id(id)
                    .projectId(projectId)
                    .title(title)
                    .description(description)
                    .issueType(issueType)
                    .priority(priority)
                    .status(status)
                    .assignee(assignee)
                    .reporter(reporter)
                    .reviewer(reviewer)
                    .dueDate(dueDate)
                    .resolvedAt(resolvedAt)
                    .resolution(resolution)
                    .comments(comments)
                    .build();
            issue.setCreatedAt(createdAt);
            issue.setUpdatedAt(updatedAt);
            return issue;
        }
    }

    public static class MeetingBuilder {
        private String id = UUID.randomUUID().toString();
        private String projectId;
        private String title;
        private String description;
        private String meetingType = "OTHER";
        private String status = "SCHEDULED";
        private LocalDateTime scheduledAt = LocalDateTime.now().plusDays(1);
        private String location;
        private String organizer;
        private String attendees;
        private String minutes;
        private LocalDateTime actualStartAt;
        private LocalDateTime actualEndAt;
        private LocalDateTime createdAt = LocalDateTime.now();
        private LocalDateTime updatedAt = LocalDateTime.now();

        public MeetingBuilder() {
            int idx = nextId();
            this.title = "Meeting " + idx;
            this.description = "Meeting description " + idx;
            this.location = "Conference Room " + idx;
        }

        public MeetingBuilder id(String id) { this.id = id; return this; }
        public MeetingBuilder projectId(String projectId) { this.projectId = projectId; return this; }
        public MeetingBuilder title(String title) { this.title = title; return this; }
        public MeetingBuilder description(String description) { this.description = description; return this; }
        public MeetingBuilder meetingType(String meetingType) { this.meetingType = meetingType; return this; }
        public MeetingBuilder status(String status) { this.status = status; return this; }
        public MeetingBuilder scheduledAt(LocalDateTime scheduledAt) { this.scheduledAt = scheduledAt; return this; }
        public MeetingBuilder location(String location) { this.location = location; return this; }
        public MeetingBuilder organizer(String organizer) { this.organizer = organizer; return this; }
        public MeetingBuilder attendees(String attendees) { this.attendees = attendees; return this; }
        public MeetingBuilder minutes(String minutes) { this.minutes = minutes; return this; }
        public MeetingBuilder actualStartAt(LocalDateTime actualStartAt) { this.actualStartAt = actualStartAt; return this; }
        public MeetingBuilder actualEndAt(LocalDateTime actualEndAt) { this.actualEndAt = actualEndAt; return this; }

        public R2dbcMeeting build() {
            R2dbcMeeting meeting = R2dbcMeeting.builder()
                    .id(id)
                    .projectId(projectId)
                    .title(title)
                    .description(description)
                    .meetingType(meetingType)
                    .status(status)
                    .scheduledAt(scheduledAt)
                    .location(location)
                    .organizer(organizer)
                    .attendees(attendees)
                    .minutes(minutes)
                    .actualStartAt(actualStartAt)
                    .actualEndAt(actualEndAt)
                    .build();
            meeting.setCreatedAt(createdAt);
            meeting.setUpdatedAt(updatedAt);
            return meeting;
        }
    }

    public static class WeeklyReportBuilder {
        private String id = UUID.randomUUID().toString();
        private String projectId;
        private String sprintId;
        private LocalDate weekStartDate = LocalDate.now().minusDays(LocalDate.now().getDayOfWeek().getValue() - 1);
        private LocalDate weekEndDate = weekStartDate.plusDays(6);
        private String generatedBy;
        private LocalDate generatedAt = LocalDate.now();
        private Integer totalTasks = 0;
        private Integer completedTasks = 0;
        private Integer inProgressTasks = 0;
        private Integer todoTasks = 0;
        private Integer blockedTasks = 0;
        private Double completionRate = 0.0;
        private Double velocity = 0.0;
        private Integer storyPointsCompleted = 0;
        private Integer storyPointsInProgress = 0;
        private Integer storyPointsPlanned = 0;
        private Integer averageWipCount = 0;
        private Integer peakWipCount = 0;
        private Double flowEfficiency = 0.0;
        private String bottlenecks;
        private Double velocityTrend = 0.0;
        private Double completionTrend = 0.0;
        private String recommendations;
        private String summary;
        private String generatedContent;
        private String llmModel;
        private Double llmConfidenceScore;
        private LocalDateTime createdAt = LocalDateTime.now();
        private LocalDateTime updatedAt = LocalDateTime.now();

        public WeeklyReportBuilder() {
            int idx = nextId();
            this.summary = "Weekly report summary " + idx;
            this.recommendations = "Recommendations for week " + idx;
        }

        public WeeklyReportBuilder id(String id) { this.id = id; return this; }
        public WeeklyReportBuilder projectId(String projectId) { this.projectId = projectId; return this; }
        public WeeklyReportBuilder sprintId(String sprintId) { this.sprintId = sprintId; return this; }
        public WeeklyReportBuilder weekStartDate(LocalDate weekStartDate) { this.weekStartDate = weekStartDate; return this; }
        public WeeklyReportBuilder weekEndDate(LocalDate weekEndDate) { this.weekEndDate = weekEndDate; return this; }
        public WeeklyReportBuilder generatedBy(String generatedBy) { this.generatedBy = generatedBy; return this; }
        public WeeklyReportBuilder generatedAt(LocalDate generatedAt) { this.generatedAt = generatedAt; return this; }
        public WeeklyReportBuilder totalTasks(Integer totalTasks) { this.totalTasks = totalTasks; return this; }
        public WeeklyReportBuilder completedTasks(Integer completedTasks) { this.completedTasks = completedTasks; return this; }
        public WeeklyReportBuilder inProgressTasks(Integer inProgressTasks) { this.inProgressTasks = inProgressTasks; return this; }
        public WeeklyReportBuilder todoTasks(Integer todoTasks) { this.todoTasks = todoTasks; return this; }
        public WeeklyReportBuilder blockedTasks(Integer blockedTasks) { this.blockedTasks = blockedTasks; return this; }
        public WeeklyReportBuilder completionRate(Double completionRate) { this.completionRate = completionRate; return this; }
        public WeeklyReportBuilder velocity(Double velocity) { this.velocity = velocity; return this; }
        public WeeklyReportBuilder storyPointsCompleted(Integer storyPointsCompleted) { this.storyPointsCompleted = storyPointsCompleted; return this; }
        public WeeklyReportBuilder storyPointsInProgress(Integer storyPointsInProgress) { this.storyPointsInProgress = storyPointsInProgress; return this; }
        public WeeklyReportBuilder storyPointsPlanned(Integer storyPointsPlanned) { this.storyPointsPlanned = storyPointsPlanned; return this; }
        public WeeklyReportBuilder averageWipCount(Integer averageWipCount) { this.averageWipCount = averageWipCount; return this; }
        public WeeklyReportBuilder peakWipCount(Integer peakWipCount) { this.peakWipCount = peakWipCount; return this; }
        public WeeklyReportBuilder flowEfficiency(Double flowEfficiency) { this.flowEfficiency = flowEfficiency; return this; }
        public WeeklyReportBuilder bottlenecks(String bottlenecks) { this.bottlenecks = bottlenecks; return this; }
        public WeeklyReportBuilder velocityTrend(Double velocityTrend) { this.velocityTrend = velocityTrend; return this; }
        public WeeklyReportBuilder completionTrend(Double completionTrend) { this.completionTrend = completionTrend; return this; }
        public WeeklyReportBuilder recommendations(String recommendations) { this.recommendations = recommendations; return this; }
        public WeeklyReportBuilder summary(String summary) { this.summary = summary; return this; }
        public WeeklyReportBuilder generatedContent(String generatedContent) { this.generatedContent = generatedContent; return this; }
        public WeeklyReportBuilder llmModel(String llmModel) { this.llmModel = llmModel; return this; }
        public WeeklyReportBuilder llmConfidenceScore(Double llmConfidenceScore) { this.llmConfidenceScore = llmConfidenceScore; return this; }

        public R2dbcWeeklyReport build() {
            R2dbcWeeklyReport report = R2dbcWeeklyReport.builder()
                    .id(id)
                    .projectId(projectId)
                    .sprintId(sprintId)
                    .weekStartDate(weekStartDate)
                    .weekEndDate(weekEndDate)
                    .generatedBy(generatedBy)
                    .generatedAt(generatedAt)
                    .totalTasks(totalTasks)
                    .completedTasks(completedTasks)
                    .inProgressTasks(inProgressTasks)
                    .todoTasks(todoTasks)
                    .blockedTasks(blockedTasks)
                    .completionRate(completionRate)
                    .velocity(velocity)
                    .storyPointsCompleted(storyPointsCompleted)
                    .storyPointsInProgress(storyPointsInProgress)
                    .storyPointsPlanned(storyPointsPlanned)
                    .averageWipCount(averageWipCount)
                    .peakWipCount(peakWipCount)
                    .flowEfficiency(flowEfficiency)
                    .bottlenecks(bottlenecks)
                    .velocityTrend(velocityTrend)
                    .completionTrend(completionTrend)
                    .recommendations(recommendations)
                    .summary(summary)
                    .generatedContent(generatedContent)
                    .llmModel(llmModel)
                    .llmConfidenceScore(llmConfidenceScore)
                    .build();
            report.setCreatedAt(createdAt);
            report.setUpdatedAt(updatedAt);
            return report;
        }
    }
}
