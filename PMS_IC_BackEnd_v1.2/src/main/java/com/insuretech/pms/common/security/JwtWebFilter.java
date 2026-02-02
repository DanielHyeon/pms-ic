package com.insuretech.pms.common.security;

import com.insuretech.pms.auth.service.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.userdetails.ReactiveUserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtWebFilter implements WebFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final ReactiveUserDetailsService reactiveUserDetailsService;

    private static final String BEARER_PREFIX = "Bearer ";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String token = extractToken(exchange.getRequest());

        if (!StringUtils.hasText(token)) {
            return chain.filter(exchange);
        }

        if (!jwtTokenProvider.validateToken(token)) {
            return chain.filter(exchange);
        }

        try {
            String username = jwtTokenProvider.getUsernameFromToken(token);

            return reactiveUserDetailsService.findByUsername(username)
                    .map(userDetails -> new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    ))
                    .flatMap(authentication -> chain.filter(exchange)
                            .contextWrite(ReactiveSecurityContextHolder.withAuthentication(authentication)))
                    .switchIfEmpty(chain.filter(exchange));

        } catch (Exception ex) {
            log.error("Could not set user authentication in security context", ex);
            return chain.filter(exchange);
        }
    }

    private String extractToken(ServerHttpRequest request) {
        String bearerToken = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith(BEARER_PREFIX)) {
            return bearerToken.substring(BEARER_PREFIX.length());
        }

        return null;
    }
}
