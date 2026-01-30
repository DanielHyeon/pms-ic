package com.insuretech.pms.chat.service;

import com.insuretech.pms.chat.dto.ChatAnalyticsDto.*;
import com.insuretech.pms.chat.reactive.entity.R2dbcChatMessage;
import com.insuretech.pms.chat.reactive.entity.R2dbcChatSession;
import com.insuretech.pms.chat.reactive.repository.ReactiveChatMessageRepository;
import com.insuretech.pms.chat.reactive.repository.ReactiveChatSessionRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * Service for computing chat analytics metrics.
 * Provides session statistics, user engagement metrics, and LLM engine usage data.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveChatAnalyticsService {

    private final ReactiveChatSessionRepository sessionRepository;
    private final ReactiveChatMessageRepository messageRepository;
    private final MeterRegistry meterRegistry;

    /**
     * Get overall chat analytics summary.
     */
    public Mono<AnalyticsSummary> getAnalyticsSummary(AnalyticsFilter filter) {
        log.info("Generating analytics summary: start={}, end={}",
                filter.getStartDate(), filter.getEndDate());

        return Mono.zip(
                getSessionSummary(filter),
                getUserEngagementSummary(filter),
                getEngineSummary(filter)
        ).map(tuple -> AnalyticsSummary.builder()
                .sessions(tuple.getT1())
                .userEngagement(tuple.getT2())
                .engines(tuple.getT3())
                .generatedAt(LocalDateTime.now())
                .periodStart(filter.getStartDate().toString())
                .periodEnd(filter.getEndDate().toString())
                .build());
    }

    /**
     * Get session-level summary statistics.
     */
    public Mono<SessionSummary> getSessionSummary(AnalyticsFilter filter) {
        return sessionRepository.findAll()
                .filter(session -> isWithinDateRange(session.getCreatedAt(), filter))
                .collectList()
                .flatMap(sessions -> {
                    long totalSessions = sessions.size();
                    long activeSessions = sessions.stream()
                            .filter(s -> Boolean.TRUE.equals(s.getActive()))
                            .count();
                    long inactiveSessions = totalSessions - activeSessions;

                    return messageRepository.findAll()
                            .filter(msg -> isMessageWithinFilter(msg, filter, sessions))
                            .collectList()
                            .map(messages -> {
                                long totalMessages = messages.size();
                                long userMessages = messages.stream()
                                        .filter(m -> "USER".equals(m.getRole()))
                                        .count();
                                long assistantMessages = messages.stream()
                                        .filter(m -> "ASSISTANT".equals(m.getRole()))
                                        .count();

                                double avgMessagesPerSession = totalSessions > 0
                                        ? (double) totalMessages / totalSessions : 0.0;

                                // Compute average response time from metrics if available
                                double avgResponseTime = getAverageResponseTime();

                                return SessionSummary.builder()
                                        .totalSessions(totalSessions)
                                        .activeSessions(activeSessions)
                                        .inactiveSessions(inactiveSessions)
                                        .avgMessagesPerSession(round(avgMessagesPerSession, 2))
                                        .avgResponseTimeMs(round(avgResponseTime, 2))
                                        .totalMessages(totalMessages)
                                        .userMessages(userMessages)
                                        .assistantMessages(assistantMessages)
                                        .build();
                            });
                });
    }

    /**
     * Get detailed session statistics.
     */
    public Mono<SessionStatistics> getSessionStatistics(AnalyticsFilter filter) {
        return getSessionSummary(filter)
                .flatMap(summary -> Mono.zip(
                        getTopSessionsByMessages(filter),
                        getRecentSessions(filter),
                        getSessionsByDay(filter)
                ).map(tuple -> SessionStatistics.builder()
                        .summary(summary)
                        .topSessionsByMessages(tuple.getT1())
                        .recentSessions(tuple.getT2())
                        .sessionsByDay(tuple.getT3())
                        .build()));
    }

    /**
     * Get top sessions by message count.
     */
    private Mono<List<SessionDetail>> getTopSessionsByMessages(AnalyticsFilter filter) {
        return sessionRepository.findAll()
                .filter(session -> isWithinDateRange(session.getCreatedAt(), filter))
                .flatMap(session -> messageRepository.countBySessionId(session.getId())
                        .map(count -> SessionDetail.builder()
                                .sessionId(session.getId())
                                .userId(session.getUserId())
                                .title(session.getTitle())
                                .messageCount(count)
                                .createdAt(session.getCreatedAt())
                                .active(Boolean.TRUE.equals(session.getActive()))
                                .build()))
                .collectSortedList(Comparator.comparingLong(SessionDetail::getMessageCount).reversed())
                .map(list -> list.stream()
                        .limit(filter.getLimit() != null ? filter.getLimit() : 10)
                        .collect(Collectors.toList()));
    }

    /**
     * Get recently active sessions.
     */
    private Mono<List<SessionDetail>> getRecentSessions(AnalyticsFilter filter) {
        return sessionRepository.findAll()
                .filter(session -> isWithinDateRange(session.getCreatedAt(), filter))
                .collectSortedList(Comparator.comparing(
                        R2dbcChatSession::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .flatMap(sessions -> Flux.fromIterable(sessions)
                        .take(filter.getLimit() != null ? filter.getLimit() : 10)
                        .flatMap(session -> messageRepository.countBySessionId(session.getId())
                                .map(count -> SessionDetail.builder()
                                        .sessionId(session.getId())
                                        .userId(session.getUserId())
                                        .title(session.getTitle())
                                        .messageCount(count)
                                        .createdAt(session.getCreatedAt())
                                        .active(Boolean.TRUE.equals(session.getActive()))
                                        .build()))
                        .collectList());
    }

    /**
     * Get session counts grouped by day.
     */
    private Mono<Map<String, Long>> getSessionsByDay(AnalyticsFilter filter) {
        return sessionRepository.findAll()
                .filter(session -> isWithinDateRange(session.getCreatedAt(), filter))
                .collectList()
                .map(sessions -> sessions.stream()
                        .filter(s -> s.getCreatedAt() != null)
                        .collect(Collectors.groupingBy(
                                s -> s.getCreatedAt().toLocalDate().toString(),
                                TreeMap::new,
                                Collectors.counting())));
    }

    /**
     * Get user engagement summary metrics.
     */
    public Mono<UserEngagementSummary> getUserEngagementSummary(AnalyticsFilter filter) {
        LocalDateTime now = LocalDateTime.now();

        return sessionRepository.findAll()
                .filter(session -> isWithinDateRange(session.getCreatedAt(), filter))
                .collectList()
                .flatMap(sessions -> {
                    Set<String> allUserIds = sessions.stream()
                            .map(R2dbcChatSession::getUserId)
                            .filter(Objects::nonNull)
                            .collect(Collectors.toSet());

                    Set<String> activeUsers24h = sessions.stream()
                            .filter(s -> s.getCreatedAt() != null &&
                                    s.getCreatedAt().isAfter(now.minusDays(1)))
                            .map(R2dbcChatSession::getUserId)
                            .filter(Objects::nonNull)
                            .collect(Collectors.toSet());

                    Set<String> activeUsers7d = sessions.stream()
                            .filter(s -> s.getCreatedAt() != null &&
                                    s.getCreatedAt().isAfter(now.minusDays(7)))
                            .map(R2dbcChatSession::getUserId)
                            .filter(Objects::nonNull)
                            .collect(Collectors.toSet());

                    Set<String> activeUsers30d = sessions.stream()
                            .filter(s -> s.getCreatedAt() != null &&
                                    s.getCreatedAt().isAfter(now.minusDays(30)))
                            .map(R2dbcChatSession::getUserId)
                            .filter(Objects::nonNull)
                            .collect(Collectors.toSet());

                    long totalUsers = allUserIds.size();
                    double avgSessionsPerUser = totalUsers > 0
                            ? (double) sessions.size() / totalUsers : 0.0;

                    return messageRepository.findAll()
                            .filter(msg -> isMessageWithinFilter(msg, filter, sessions))
                            .count()
                            .map(totalMessages -> {
                                double avgMessagesPerUser = totalUsers > 0
                                        ? (double) totalMessages / totalUsers : 0.0;

                                return UserEngagementSummary.builder()
                                        .totalUsers(totalUsers)
                                        .activeUsersLast24h(activeUsers24h.size())
                                        .activeUsersLast7d(activeUsers7d.size())
                                        .activeUsersLast30d(activeUsers30d.size())
                                        .avgMessagesPerUser(round(avgMessagesPerUser, 2))
                                        .avgSessionsPerUser(round(avgSessionsPerUser, 2))
                                        .build();
                            });
                });
    }

    /**
     * Get detailed user engagement statistics.
     */
    public Mono<UserEngagementStatistics> getUserEngagementStatistics(AnalyticsFilter filter) {
        return getUserEngagementSummary(filter)
                .flatMap(summary -> Mono.zip(
                        getTopUsersByMessages(filter),
                        getRecentActiveUsers(filter),
                        getUserActivityByDay(filter)
                ).map(tuple -> UserEngagementStatistics.builder()
                        .summary(summary)
                        .topUsersByMessages(tuple.getT1())
                        .recentActiveUsers(tuple.getT2())
                        .userActivityByDay(tuple.getT3())
                        .build()));
    }

    /**
     * Get top users by message count.
     */
    private Mono<List<UserEngagementDetail>> getTopUsersByMessages(AnalyticsFilter filter) {
        return sessionRepository.findAll()
                .filter(session -> isWithinDateRange(session.getCreatedAt(), filter))
                .collectMultimap(R2dbcChatSession::getUserId)
                .flatMapMany(sessionsByUser -> Flux.fromIterable(sessionsByUser.entrySet()))
                .filter(entry -> entry.getKey() != null)
                .flatMap(entry -> {
                    String userId = entry.getKey();
                    List<R2dbcChatSession> userSessions = new ArrayList<>(entry.getValue());

                    return Flux.fromIterable(userSessions)
                            .flatMap(session -> messageRepository.countBySessionId(session.getId()))
                            .reduce(0L, Long::sum)
                            .map(totalMessages -> UserEngagementDetail.builder()
                                    .userId(userId)
                                    .totalMessages(totalMessages)
                                    .totalSessions(userSessions.size())
                                    .lastActiveAt(userSessions.stream()
                                            .map(R2dbcChatSession::getCreatedAt)
                                            .filter(Objects::nonNull)
                                            .max(Comparator.naturalOrder())
                                            .orElse(null))
                                    .firstMessageAt(userSessions.stream()
                                            .map(R2dbcChatSession::getCreatedAt)
                                            .filter(Objects::nonNull)
                                            .min(Comparator.naturalOrder())
                                            .orElse(null))
                                    .build());
                })
                .collectSortedList(Comparator.comparingLong(UserEngagementDetail::getTotalMessages).reversed())
                .map(list -> list.stream()
                        .limit(filter.getLimit() != null ? filter.getLimit() : 10)
                        .collect(Collectors.toList()));
    }

    /**
     * Get recently active users.
     */
    private Mono<List<UserEngagementDetail>> getRecentActiveUsers(AnalyticsFilter filter) {
        return sessionRepository.findAll()
                .filter(session -> isWithinDateRange(session.getCreatedAt(), filter))
                .collectMultimap(R2dbcChatSession::getUserId)
                .flatMapMany(sessionsByUser -> Flux.fromIterable(sessionsByUser.entrySet()))
                .filter(entry -> entry.getKey() != null)
                .flatMap(entry -> {
                    String userId = entry.getKey();
                    List<R2dbcChatSession> userSessions = new ArrayList<>(entry.getValue());

                    LocalDateTime lastActive = userSessions.stream()
                            .map(R2dbcChatSession::getCreatedAt)
                            .filter(Objects::nonNull)
                            .max(Comparator.naturalOrder())
                            .orElse(null);

                    return Flux.fromIterable(userSessions)
                            .flatMap(session -> messageRepository.countBySessionId(session.getId()))
                            .reduce(0L, Long::sum)
                            .map(totalMessages -> UserEngagementDetail.builder()
                                    .userId(userId)
                                    .totalMessages(totalMessages)
                                    .totalSessions(userSessions.size())
                                    .lastActiveAt(lastActive)
                                    .build());
                })
                .collectSortedList(Comparator.comparing(
                        UserEngagementDetail::getLastActiveAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(list -> list.stream()
                        .limit(filter.getLimit() != null ? filter.getLimit() : 10)
                        .collect(Collectors.toList()));
    }

    /**
     * Get user activity counts by day.
     */
    private Mono<Map<String, Long>> getUserActivityByDay(AnalyticsFilter filter) {
        return sessionRepository.findAll()
                .filter(session -> isWithinDateRange(session.getCreatedAt(), filter))
                .collectList()
                .map(sessions -> sessions.stream()
                        .filter(s -> s.getCreatedAt() != null)
                        .collect(Collectors.groupingBy(
                                s -> s.getCreatedAt().toLocalDate().toString(),
                                TreeMap::new,
                                Collectors.mapping(R2dbcChatSession::getUserId,
                                        Collectors.collectingAndThen(Collectors.toSet(), set -> (long) set.size())))));
    }

    /**
     * Get LLM engine usage summary.
     */
    public Mono<EngineSummary> getEngineSummary(AnalyticsFilter filter) {
        return messageRepository.findAll()
                .filter(msg -> "ASSISTANT".equals(msg.getRole()) &&
                        isWithinDateRange(msg.getCreatedAt(), filter))
                .collectList()
                .map(messages -> {
                    long totalRequests = messages.size();

                    Map<String, Long> requestsByEngine = messages.stream()
                            .collect(Collectors.groupingBy(
                                    m -> m.getEngine() != null ? m.getEngine() : "unknown",
                                    Collectors.counting()));

                    // Compute success rates from Micrometer metrics
                    Map<String, Double> successRateByEngine = computeSuccessRates(requestsByEngine.keySet());

                    // Compute average response times from metrics
                    Map<String, Double> avgResponseTimeByEngine = computeAvgResponseTimes(requestsByEngine.keySet());

                    return EngineSummary.builder()
                            .totalRequests(totalRequests)
                            .requestsByEngine(requestsByEngine)
                            .successRateByEngine(successRateByEngine)
                            .avgResponseTimeByEngine(avgResponseTimeByEngine)
                            .build();
                });
    }

    /**
     * Get detailed engine usage statistics.
     */
    public Mono<EngineStatistics> getEngineStatistics(AnalyticsFilter filter) {
        return getEngineSummary(filter)
                .flatMap(summary -> Mono.zip(
                        getEngineDetails(filter),
                        getRequestsByEnginePerDay(filter),
                        getErrorsByEngine()
                ).map(tuple -> EngineStatistics.builder()
                        .summary(summary)
                        .engineDetails(tuple.getT1())
                        .requestsByEnginePerDay(tuple.getT2())
                        .errorsByEngine(tuple.getT3())
                        .build()));
    }

    /**
     * Get detailed stats for each engine.
     */
    private Mono<List<EngineDetail>> getEngineDetails(AnalyticsFilter filter) {
        return messageRepository.findAll()
                .filter(msg -> "ASSISTANT".equals(msg.getRole()) &&
                        isWithinDateRange(msg.getCreatedAt(), filter))
                .collectMultimap(m -> m.getEngine() != null ? m.getEngine() : "unknown")
                .map(messagesByEngine -> messagesByEngine.entrySet().stream()
                        .map(entry -> {
                            String engine = entry.getKey();
                            Collection<R2dbcChatMessage> messages = entry.getValue();
                            long totalRequests = messages.size();

                            // Get metrics from Micrometer
                            double successRate = getEngineSuccessRate(engine);
                            double avgResponseTime = getEngineAvgResponseTime(engine);
                            double avgTokens = getEngineAvgTokens(engine);

                            LocalDateTime lastUsed = messages.stream()
                                    .map(R2dbcChatMessage::getCreatedAt)
                                    .filter(Objects::nonNull)
                                    .max(Comparator.naturalOrder())
                                    .orElse(null);

                            long successfulRequests = (long) (totalRequests * successRate / 100);
                            long failedRequests = totalRequests - successfulRequests;

                            return EngineDetail.builder()
                                    .engineName(engine)
                                    .totalRequests(totalRequests)
                                    .successfulRequests(successfulRequests)
                                    .failedRequests(failedRequests)
                                    .successRate(round(successRate, 2))
                                    .avgResponseTimeMs(round(avgResponseTime, 2))
                                    .avgTokensPerRequest(round(avgTokens, 2))
                                    .lastUsedAt(lastUsed)
                                    .build();
                        })
                        .sorted(Comparator.comparingLong(EngineDetail::getTotalRequests).reversed())
                        .collect(Collectors.toList()));
    }

    /**
     * Get request counts by engine per day.
     */
    private Mono<Map<String, Long>> getRequestsByEnginePerDay(AnalyticsFilter filter) {
        return messageRepository.findAll()
                .filter(msg -> "ASSISTANT".equals(msg.getRole()) &&
                        isWithinDateRange(msg.getCreatedAt(), filter))
                .collectList()
                .map(messages -> messages.stream()
                        .filter(m -> m.getCreatedAt() != null)
                        .collect(Collectors.groupingBy(
                                m -> m.getCreatedAt().toLocalDate().toString() + "_" +
                                        (m.getEngine() != null ? m.getEngine() : "unknown"),
                                TreeMap::new,
                                Collectors.counting())));
    }

    /**
     * Get error counts by engine from metrics.
     */
    private Mono<Map<String, Long>> getErrorsByEngine() {
        Map<String, Long> errors = new HashMap<>();

        try {
            meterRegistry.getMeters().stream()
                    .filter(m -> m.getId().getName().equals("llm.errors"))
                    .forEach(meter -> {
                        String engine = meter.getId().getTag("engine");
                        if (engine != null && meter instanceof Counter) {
                            errors.merge(engine, (long) ((Counter) meter).count(), Long::sum);
                        }
                    });
        } catch (Exception e) {
            log.debug("Could not retrieve error metrics: {}", e.getMessage());
        }

        return Mono.just(errors);
    }

    // Helper methods for metrics retrieval

    private double getAverageResponseTime() {
        try {
            return meterRegistry.getMeters().stream()
                    .filter(m -> m.getId().getName().equals("llm.request.duration"))
                    .filter(m -> m instanceof Timer)
                    .mapToDouble(m -> ((Timer) m).mean(TimeUnit.MILLISECONDS))
                    .average()
                    .orElse(0.0);
        } catch (Exception e) {
            log.debug("Could not retrieve response time metrics: {}", e.getMessage());
            return 0.0;
        }
    }

    private Map<String, Double> computeSuccessRates(Set<String> engines) {
        Map<String, Double> rates = new HashMap<>();
        for (String engine : engines) {
            rates.put(engine, getEngineSuccessRate(engine));
        }
        return rates;
    }

    private Map<String, Double> computeAvgResponseTimes(Set<String> engines) {
        Map<String, Double> times = new HashMap<>();
        for (String engine : engines) {
            times.put(engine, getEngineAvgResponseTime(engine));
        }
        return times;
    }

    private double getEngineSuccessRate(String engine) {
        try {
            long totalRequests = meterRegistry.getMeters().stream()
                    .filter(m -> m.getId().getName().equals("chat.requests.total") &&
                            engine.equals(m.getId().getTag("engine")))
                    .filter(m -> m instanceof Counter)
                    .mapToLong(m -> (long) ((Counter) m).count())
                    .sum();

            long errors = meterRegistry.getMeters().stream()
                    .filter(m -> m.getId().getName().equals("llm.errors") &&
                            engine.equals(m.getId().getTag("engine")))
                    .filter(m -> m instanceof Counter)
                    .mapToLong(m -> (long) ((Counter) m).count())
                    .sum();

            if (totalRequests == 0) return 100.0;
            return ((double) (totalRequests - errors) / totalRequests) * 100;
        } catch (Exception e) {
            log.debug("Could not compute success rate for engine {}: {}", engine, e.getMessage());
            return 100.0; // Default to 100% if no error data
        }
    }

    private double getEngineAvgResponseTime(String engine) {
        try {
            return meterRegistry.getMeters().stream()
                    .filter(m -> m.getId().getName().equals("llm.request.duration") &&
                            engine.equals(m.getId().getTag("engine")))
                    .filter(m -> m instanceof Timer)
                    .mapToDouble(m -> ((Timer) m).mean(TimeUnit.MILLISECONDS))
                    .average()
                    .orElse(0.0);
        } catch (Exception e) {
            log.debug("Could not retrieve response time for engine {}: {}", engine, e.getMessage());
            return 0.0;
        }
    }

    private double getEngineAvgTokens(String engine) {
        try {
            return meterRegistry.getMeters().stream()
                    .filter(m -> m.getId().getName().equals("llm.tokens.generated") &&
                            engine.equals(m.getId().getTag("engine")))
                    .filter(m -> m instanceof Counter)
                    .findFirst()
                    .map(m -> {
                        Counter counter = (Counter) m;
                        long requests = meterRegistry.getMeters().stream()
                                .filter(mr -> mr.getId().getName().equals("chat.requests.total") &&
                                        engine.equals(mr.getId().getTag("engine")))
                                .filter(mr -> mr instanceof Counter)
                                .mapToLong(mr -> (long) ((Counter) mr).count())
                                .sum();
                        return requests > 0 ? counter.count() / requests : 0.0;
                    })
                    .orElse(0.0);
        } catch (Exception e) {
            log.debug("Could not retrieve token metrics for engine {}: {}", engine, e.getMessage());
            return 0.0;
        }
    }

    // Utility methods

    private boolean isWithinDateRange(LocalDateTime dateTime, AnalyticsFilter filter) {
        if (dateTime == null) return true;
        boolean afterStart = filter.getStartDate() == null || !dateTime.isBefore(filter.getStartDate());
        boolean beforeEnd = filter.getEndDate() == null || !dateTime.isAfter(filter.getEndDate());
        return afterStart && beforeEnd;
    }

    private boolean isMessageWithinFilter(R2dbcChatMessage msg, AnalyticsFilter filter,
                                          List<R2dbcChatSession> sessions) {
        // Check date range
        if (!isWithinDateRange(msg.getCreatedAt(), filter)) {
            return false;
        }

        // Check if message belongs to a session in the filtered sessions
        Set<String> sessionIds = sessions.stream()
                .map(R2dbcChatSession::getId)
                .collect(Collectors.toSet());

        return sessionIds.contains(msg.getSessionId());
    }

    private double round(double value, int places) {
        if (Double.isNaN(value) || Double.isInfinite(value)) {
            return 0.0;
        }
        double scale = Math.pow(10, places);
        return Math.round(value * scale) / scale;
    }
}
