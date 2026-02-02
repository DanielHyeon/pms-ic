package com.insuretech.pms.chat.observability;

import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;
import reactor.util.context.Context;

import java.util.UUID;

/**
 * WebFlux filter for trace ID propagation
 */
@Slf4j
@Component
@Order(-1)
public class TraceIdFilter implements WebFilter {

    public static final String TRACE_ID_HEADER = "X-Trace-Id";
    public static final String TRACE_ID_KEY = "traceId";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String traceId = exchange.getRequest().getHeaders().getFirst(TRACE_ID_HEADER);
        if (traceId == null || traceId.isBlank()) {
            traceId = UUID.randomUUID().toString();
        }

        final String finalTraceId = traceId;

        // Add to response headers
        exchange.getResponse().getHeaders().add(TRACE_ID_HEADER, traceId);

        return chain.filter(exchange)
                .contextWrite(Context.of(TRACE_ID_KEY, finalTraceId))
                .doOnEach(signal -> {
                    if (!signal.isOnComplete()) {
                        MDC.put(TRACE_ID_KEY, finalTraceId);
                    }
                })
                .doFinally(signalType -> MDC.remove(TRACE_ID_KEY));
    }

    public static Mono<String> getTraceId() {
        return Mono.deferContextual(ctx ->
                Mono.just(ctx.getOrDefault(TRACE_ID_KEY, UUID.randomUUID().toString()))
        );
    }
}
