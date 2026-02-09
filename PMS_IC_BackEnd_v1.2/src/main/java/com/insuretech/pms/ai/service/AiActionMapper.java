package com.insuretech.pms.ai.service;

import com.insuretech.pms.ai.dto.AiInsightDto;
import com.insuretech.pms.ai.dto.AiRecommendedActionDto;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Maps detected insights to recommended actions.
 * Each insight type has predefined action templates with priority and route.
 */
@Component
public class AiActionMapper {

    private record ActionTemplate(
            String actionId,
            String label,
            String description,
            String requiredCapability,
            String targetRoute,
            int priority
    ) {}

    private static final Map<String, List<ActionTemplate>> ACTION_TEMPLATES = Map.of(
            "DELAY", List.of(
                    new ActionTemplate("create-issue", "이슈로 등록",
                            "지연 태스크를 이슈로 등록하여 추적합니다",
                            "manage_issues", "/issues?action=new", 1),
                    new ActionTemplate("create-risk", "리스크 승격",
                            "일정 지연을 리스크로 등록합니다",
                            "manage_decisions", "/decisions?tab=risk&action=new", 2)
            ),
            "BOTTLENECK", List.of(
                    new ActionTemplate("reassign-task", "작업 재할당",
                            "과부하된 담당자의 태스크를 재분배합니다",
                            "manage_kanban", "/kanban?action=bulk-assign", 1),
                    new ActionTemplate("create-meeting-agenda", "회의 안건 생성",
                            "병목 현상을 팀 회의에서 논의합니다",
                            "view_meetings", "/meetings?action=new", 2)
            ),
            "QUALITY", List.of(
                    new ActionTemplate("create-issue", "이슈 리뷰",
                            "고심각도 이슈를 검토합니다",
                            "manage_issues", "/issues?filter=critical", 1),
                    new ActionTemplate("escalate-pmo", "PMO 보고",
                            "품질 이슈를 PMO에 에스컬레이션합니다",
                            "manage_decisions", "/decisions?action=escalate", 2)
            ),
            "RESOURCE", List.of(
                    new ActionTemplate("reassign-task", "담당자 배정",
                            "미배정 태스크에 담당자를 할당합니다",
                            "manage_kanban", "/kanban?action=assign", 1)
            ),
            "PROGRESS", List.of(
                    new ActionTemplate("create-meeting-agenda", "진행 점검 회의",
                            "스프린트 진행 상황을 팀과 검토합니다",
                            "view_meetings", "/meetings?action=new", 1)
            ),
            "POSITIVE", List.of(
                    new ActionTemplate("update-progress", "진행 보고",
                            "긍정적 진행 상황을 보고서에 반영합니다",
                            "view_reports", "/reports?tab=weekly", 3)
            ),
            "RISK", List.of(
                    new ActionTemplate("create-risk", "리스크 등록",
                            "감지된 리스크를 등록합니다",
                            "manage_decisions", "/decisions?tab=risk&action=new", 1)
            ),
            "POLICY_GAP", List.of(
                    new ActionTemplate("run-governance", "거버넌스 점검",
                            "정책 준수 검사를 실행합니다",
                            "manage_governance", "/governance?action=check", 1)
            )
    );

    /**
     * Maps insights to deduplicated recommended actions.
     */
    public List<AiRecommendedActionDto> mapActions(List<AiInsightDto> insights) {
        // Collect all action IDs with their source insight IDs
        Map<String, Set<String>> actionToInsights = new LinkedHashMap<>();
        Map<String, ActionTemplate> actionTemplates = new LinkedHashMap<>();

        for (AiInsightDto insight : insights) {
            List<ActionTemplate> templates = ACTION_TEMPLATES.getOrDefault(insight.type(), List.of());
            for (ActionTemplate tmpl : templates) {
                actionToInsights.computeIfAbsent(tmpl.actionId(), k -> new LinkedHashSet<>())
                        .add(insight.id());
                actionTemplates.putIfAbsent(tmpl.actionId(), tmpl);
            }
        }

        // Build deduplicated action list
        return actionTemplates.entrySet().stream()
                .map(entry -> {
                    ActionTemplate tmpl = entry.getValue();
                    Set<String> sourceIds = actionToInsights.get(entry.getKey());
                    return AiRecommendedActionDto.builder()
                            .actionId(tmpl.actionId())
                            .label(tmpl.label())
                            .description(tmpl.description())
                            .requiredCapability(tmpl.requiredCapability())
                            .targetRoute(tmpl.targetRoute())
                            .priority(tmpl.priority())
                            .sourceInsightIds(new ArrayList<>(sourceIds))
                            .build();
                })
                .sorted(Comparator.comparingInt(AiRecommendedActionDto::priority))
                .toList();
    }
}
