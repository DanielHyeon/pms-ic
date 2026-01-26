package com.insuretech.pms.project.service;

import com.insuretech.pms.project.dto.CriticalPathResponse;
import com.insuretech.pms.project.dto.WbsDependencyDto;
import com.insuretech.pms.project.entity.WbsGroup;
import com.insuretech.pms.project.entity.WbsItem;
import com.insuretech.pms.project.repository.WbsGroupRepository;
import com.insuretech.pms.project.repository.WbsItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Service for calculating Critical Path using CPM algorithm via LLM service.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class WbsCriticalPathService {

    private final WbsDependencyService dependencyService;
    private final WbsGroupRepository groupRepository;
    private final WbsItemRepository itemRepository;
    private final WebClient.Builder webClientBuilder;

    @Value("${ai.service.url:http://llm-service:8000}")
    private String llmServiceUrl;

    /**
     * Calculate Critical Path for a project
     */
    @Cacheable(value = "criticalPath", key = "#projectId", unless = "#result == null")
    public CriticalPathResponse calculateCriticalPath(String projectId) {
        log.info("Calculating critical path for project: {}", projectId);

        try {
            // Get WBS items and dependencies
            List<Map<String, Object>> items = collectWbsItems(projectId);
            List<WbsDependencyDto> dependencyDtos = dependencyService.getProjectDependencies(projectId);

            if (items.isEmpty()) {
                log.warn("No WBS items found for project: {}", projectId);
                return CriticalPathResponse.builder()
                        .criticalPath(Collections.emptyList())
                        .itemsWithFloat(Collections.emptyMap())
                        .projectDuration(0)
                        .calculatedAt(LocalDateTime.now())
                        .build();
            }

            // Convert dependencies to map format
            List<Map<String, Object>> dependencies = dependencyDtos.stream()
                    .map(dto -> {
                        Map<String, Object> dep = new HashMap<>();
                        dep.put("predecessorId", dto.getPredecessorId());
                        dep.put("successorId", dto.getSuccessorId());
                        dep.put("dependencyType", dto.getDependencyType());
                        dep.put("lagDays", dto.getLagDays());
                        return dep;
                    })
                    .toList();

            // Call LLM service for CPM calculation
            return callLlmServiceForCriticalPath(items, dependencies);

        } catch (Exception e) {
            log.error("Failed to calculate critical path for project {}: {}", projectId, e.getMessage(), e);
            return CriticalPathResponse.builder()
                    .criticalPath(Collections.emptyList())
                    .itemsWithFloat(Collections.emptyMap())
                    .projectDuration(0)
                    .calculatedAt(LocalDateTime.now())
                    .build();
        }
    }

    /**
     * Evict critical path cache when WBS data changes
     */
    @CacheEvict(value = "criticalPath", key = "#projectId")
    public void evictCriticalPathCache(String projectId) {
        log.info("Evicting critical path cache for project: {}", projectId);
    }

    private List<Map<String, Object>> collectWbsItems(String projectId) {
        List<Map<String, Object>> items = new ArrayList<>();

        // Collect WBS Groups
        List<WbsGroup> groups = groupRepository.findByProjectIdOrdered(projectId);
        for (WbsGroup group : groups) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", group.getId());
            item.put("name", group.getName());
            item.put("type", "GROUP");
            item.put("startDate", group.getPlannedStartDate() != null ? group.getPlannedStartDate().toString() : null);
            item.put("endDate", group.getPlannedEndDate() != null ? group.getPlannedEndDate().toString() : null);
            items.add(item);
        }

        // Collect WBS Items
        List<WbsItem> wbsItems = itemRepository.findByProjectIdOrdered(projectId);
        for (WbsItem wbsItem : wbsItems) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", wbsItem.getId());
            item.put("name", wbsItem.getName());
            item.put("type", "ITEM");
            item.put("startDate", wbsItem.getPlannedStartDate() != null ? wbsItem.getPlannedStartDate().toString() : null);
            item.put("endDate", wbsItem.getPlannedEndDate() != null ? wbsItem.getPlannedEndDate().toString() : null);
            items.add(item);
        }

        // Note: WbsTask is excluded from critical path as it doesn't have date fields

        return items;
    }

    @SuppressWarnings("unchecked")
    private CriticalPathResponse callLlmServiceForCriticalPath(
            List<Map<String, Object>> items,
            List<Map<String, Object>> dependencies) {

        try {
            WebClient webClient = webClientBuilder.baseUrl(llmServiceUrl).build();

            Map<String, Object> request = new HashMap<>();
            request.put("items", items);
            request.put("dependencies", dependencies);

            Map<String, Object> response = webClient.post()
                    .uri("/api/wbs/critical-path")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response == null || !Boolean.TRUE.equals(response.get("success"))) {
                String error = response != null ? (String) response.get("error") : "Unknown error";
                log.error("LLM service returned error: {}", error);
                return buildEmptyResponse();
            }

            Map<String, Object> data = (Map<String, Object>) response.get("data");
            if (data == null) {
                return buildEmptyResponse();
            }

            // Parse response
            List<String> criticalPath = (List<String>) data.getOrDefault("criticalPath", Collections.emptyList());
            int projectDuration = data.get("projectDuration") != null
                    ? ((Number) data.get("projectDuration")).intValue()
                    : 0;

            Map<String, CriticalPathResponse.ItemFloatData> itemsWithFloat = new HashMap<>();
            Map<String, Object> floatData = (Map<String, Object>) data.get("itemsWithFloat");
            if (floatData != null) {
                for (Map.Entry<String, Object> entry : floatData.entrySet()) {
                    Map<String, Object> itemData = (Map<String, Object>) entry.getValue();
                    itemsWithFloat.put(entry.getKey(), CriticalPathResponse.ItemFloatData.builder()
                            .name((String) itemData.get("name"))
                            .duration(getInt(itemData, "duration"))
                            .earlyStart(getInt(itemData, "earlyStart"))
                            .earlyFinish(getInt(itemData, "earlyFinish"))
                            .lateStart(getInt(itemData, "lateStart"))
                            .lateFinish(getInt(itemData, "lateFinish"))
                            .totalFloat(getInt(itemData, "totalFloat"))
                            .freeFloat(getInt(itemData, "freeFloat"))
                            .isCritical(Boolean.TRUE.equals(itemData.get("isCritical")))
                            .build());
                }
            }

            return CriticalPathResponse.builder()
                    .criticalPath(criticalPath)
                    .itemsWithFloat(itemsWithFloat)
                    .projectDuration(projectDuration)
                    .calculatedAt(LocalDateTime.now())
                    .build();

        } catch (Exception e) {
            log.error("Failed to call LLM service for critical path: {}", e.getMessage(), e);
            return buildEmptyResponse();
        }
    }

    private int getInt(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        return 0;
    }

    private CriticalPathResponse buildEmptyResponse() {
        return CriticalPathResponse.builder()
                .criticalPath(Collections.emptyList())
                .itemsWithFloat(Collections.emptyMap())
                .projectDuration(0)
                .calculatedAt(LocalDateTime.now())
                .build();
    }
}
