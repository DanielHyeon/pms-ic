package com.insuretech.pms.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * DTOs for Chat Analytics API responses.
 * Provides structured data for chat statistics, user engagement, and LLM engine usage.
 */
public class ChatAnalyticsDto {

    /**
     * Overall chat analytics summary combining key metrics.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AnalyticsSummary {
        private SessionSummary sessions;
        private UserEngagementSummary userEngagement;
        private EngineSummary engines;
        private LocalDateTime generatedAt;
        private String periodStart;
        private String periodEnd;
    }

    /**
     * Session-level statistics.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SessionSummary {
        private long totalSessions;
        private long activeSessions;
        private long inactiveSessions;
        private double avgMessagesPerSession;
        private double avgResponseTimeMs;
        private long totalMessages;
        private long userMessages;
        private long assistantMessages;
    }

    /**
     * Detailed session statistics with individual session data.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SessionStatistics {
        private SessionSummary summary;
        private List<SessionDetail> topSessionsByMessages;
        private List<SessionDetail> recentSessions;
        private Map<String, Long> sessionsByDay;
    }

    /**
     * Individual session detail.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SessionDetail {
        private String sessionId;
        private String userId;
        private String title;
        private long messageCount;
        private LocalDateTime createdAt;
        private LocalDateTime lastMessageAt;
        private boolean active;
    }

    /**
     * User engagement summary metrics.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserEngagementSummary {
        private long totalUsers;
        private long activeUsersLast24h;
        private long activeUsersLast7d;
        private long activeUsersLast30d;
        private double avgMessagesPerUser;
        private double avgSessionsPerUser;
    }

    /**
     * Detailed user engagement statistics.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserEngagementStatistics {
        private UserEngagementSummary summary;
        private List<UserEngagementDetail> topUsersByMessages;
        private List<UserEngagementDetail> recentActiveUsers;
        private Map<String, Long> userActivityByDay;
    }

    /**
     * Individual user engagement detail.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserEngagementDetail {
        private String userId;
        private String username;
        private long totalMessages;
        private long totalSessions;
        private LocalDateTime lastActiveAt;
        private LocalDateTime firstMessageAt;
    }

    /**
     * LLM engine usage summary.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EngineSummary {
        private long totalRequests;
        private Map<String, Long> requestsByEngine;
        private Map<String, Double> successRateByEngine;
        private Map<String, Double> avgResponseTimeByEngine;
    }

    /**
     * Detailed LLM engine usage statistics.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EngineStatistics {
        private EngineSummary summary;
        private List<EngineDetail> engineDetails;
        private Map<String, Long> requestsByEnginePerDay;
        private Map<String, Long> errorsByEngine;
    }

    /**
     * Individual engine usage detail.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EngineDetail {
        private String engineName;
        private long totalRequests;
        private long successfulRequests;
        private long failedRequests;
        private double successRate;
        private double avgResponseTimeMs;
        private double avgTokensPerRequest;
        private LocalDateTime lastUsedAt;
    }

    /**
     * Request parameters for filtering analytics data.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AnalyticsFilter {
        private LocalDateTime startDate;
        private LocalDateTime endDate;
        private String userId;
        private String engine;
        private Integer limit;
        private Integer offset;

        public static AnalyticsFilter defaultFilter() {
            return AnalyticsFilter.builder()
                    .startDate(LocalDateTime.now().minusDays(30))
                    .endDate(LocalDateTime.now())
                    .limit(100)
                    .offset(0)
                    .build();
        }
    }

    /**
     * Time-series data point for charts.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TimeSeriesDataPoint {
        private LocalDateTime timestamp;
        private long value;
        private String label;
    }

    /**
     * Aggregated metrics for a specific time period.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PeriodMetrics {
        private String period;
        private long sessions;
        private long messages;
        private long activeUsers;
        private Map<String, Long> engineUsage;
    }
}
