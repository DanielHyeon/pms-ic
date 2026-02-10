package com.insuretech.pms.common.config;

import com.insuretech.pms.common.security.JwtWebFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableReactiveMethodSecurity;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.SecurityWebFiltersOrder;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.security.web.server.context.NoOpServerSecurityContextRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * 개발 환경 전용 보안 설정.
 * RFP 관련 API를 인증 없이 접근 가능하게 하여 E2E 테스트를 용이하게 한다.
 * 운영 환경에서는 ReactiveSecurityConfig(@Profile("!dev"))가 활성화된다.
 */
@Configuration
@Profile("dev")
@EnableWebFluxSecurity
@EnableReactiveMethodSecurity
@RequiredArgsConstructor
public class ReactiveSecurityConfigDev {

    private final JwtWebFilter jwtWebFilter;

    @Value("${cors.allowed-origins:http://localhost:5173}")
    private String allowedOrigins;

    @Value("${cors.allowed-methods:GET,POST,PUT,DELETE,PATCH,OPTIONS}")
    private String allowedMethods;

    @Bean
    public SecurityWebFilterChain devSecurityFilterChain(ServerHttpSecurity http) {
        return http
                .cors(cors -> cors.configurationSource(devCorsConfigurationSource()))
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .httpBasic(ServerHttpSecurity.HttpBasicSpec::disable)
                .formLogin(ServerHttpSecurity.FormLoginSpec::disable)
                .securityContextRepository(NoOpServerSecurityContextRepository.getInstance())
                .authorizeExchange(exchanges -> exchanges
                        // OPTIONS 요청은 항상 허용
                        .pathMatchers(HttpMethod.OPTIONS).permitAll()
                        // 기존 공개 엔드포인트
                        .pathMatchers(
                                "/api/auth/login",
                                "/api/auth/refresh",
                                "/api/v2/auth/login",
                                "/api/v2/auth/refresh",
                                "/api/config",
                                "/api/chat/**",
                                "/api/v2/chat/**",
                                "/api/llm/**",
                                "/actuator/**",
                                "/swagger-ui/**",
                                "/v3/api-docs/**",
                                "/api-docs/**",
                                "/swagger-ui.html",
                                "/webjars/**"
                        ).permitAll()
                        // 개발 환경: RFP 관련 API 인증 없이 허용
                        .pathMatchers("/api/v2/projects/*/origin/**").permitAll()
                        .pathMatchers("/api/v2/projects/*/rfps/**").permitAll()
                        .pathMatchers("/api/v2/projects/*/requirements/**").permitAll()
                        // 나머지는 인증 필요
                        .anyExchange().authenticated()
                )
                // JWT 필터는 등록하되, permitAll이므로 토큰 없어도 통과
                .addFilterAt(jwtWebFilter, SecurityWebFiltersOrder.AUTHENTICATION)
                .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource devCorsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
        configuration.setAllowedMethods(Arrays.asList(allowedMethods.split(",")));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
