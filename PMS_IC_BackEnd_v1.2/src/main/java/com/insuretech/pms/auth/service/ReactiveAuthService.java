package com.insuretech.pms.auth.service;

import com.insuretech.pms.auth.dto.LoginRequest;
import com.insuretech.pms.auth.dto.LoginResponse;
import com.insuretech.pms.auth.reactive.entity.R2dbcUser;
import com.insuretech.pms.auth.reactive.repository.ReactiveUserRepository;
import com.insuretech.pms.common.exception.CustomException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveAuthService {

    private static final String REFRESH_TOKEN_KEY_PREFIX = "refresh_token:";
    private static final Duration REFRESH_TOKEN_TTL = Duration.ofDays(7);
    private static final Set<String> SYSTEM_WIDE_ROLES = Set.of("ADMIN", "AUDITOR");

    private final ReactiveUserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final ReactiveRedisTemplate<String, Object> redisTemplate;

    public Mono<LoginResponse> login(LoginRequest request) {
        return userRepository.findByEmailAndActiveTrue(request.getEmail())
                .switchIfEmpty(Mono.error(CustomException.unauthorized("Invalid email or password")))
                .flatMap(user -> validatePassword(user, request.getPassword()))
                .flatMap(this::updateLastLoginAndGenerateTokens);
    }

    private Mono<R2dbcUser> validatePassword(R2dbcUser user, String rawPassword) {
        if (!passwordEncoder.matches(rawPassword, user.getPassword())) {
            return Mono.error(CustomException.unauthorized("Invalid email or password"));
        }
        return Mono.just(user);
    }

    private Mono<LoginResponse> updateLastLoginAndGenerateTokens(R2dbcUser user) {
        user.setLastLoginAt(LocalDateTime.now());

        String token = jwtTokenProvider.generateToken(user.getEmail());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getEmail());

        return userRepository.save(user)
                .flatMap(savedUser -> storeRefreshToken(savedUser.getEmail(), refreshToken)
                        .thenReturn(buildLoginResponse(savedUser, token, refreshToken)));
    }

    private LoginResponse buildLoginResponse(R2dbcUser user, String token, String refreshToken) {
        String systemRole = null;
        String role = user.getRole();

        if (role != null && SYSTEM_WIDE_ROLES.contains(role.toUpperCase())) {
            systemRole = role.toLowerCase();
        }

        LoginResponse.UserInfo userInfo = LoginResponse.UserInfo.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .role(role != null ? role.toLowerCase() : null)
                .systemRole(systemRole)
                .department(user.getDepartment())
                .build();

        log.info("User logged in: {}", user.getEmail());

        return LoginResponse.builder()
                .token(token)
                .refreshToken(refreshToken)
                .user(userInfo)
                .projectRoles(Collections.emptyList())
                .build();
    }

    public Mono<Void> logout(String email) {
        return deleteRefreshToken(email)
                .doOnSuccess(v -> log.info("User logged out: {}", email));
    }

    public Mono<LoginResponse> refreshToken(String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            return Mono.error(CustomException.unauthorized("Invalid refresh token"));
        }

        String email = jwtTokenProvider.getUsernameFromToken(refreshToken);

        return getStoredRefreshToken(email)
                .filter(storedToken -> storedToken.equals(refreshToken))
                .switchIfEmpty(Mono.error(CustomException.unauthorized("Invalid refresh token")))
                .flatMap(storedToken -> userRepository.findByEmail(email))
                .switchIfEmpty(Mono.error(CustomException.notFound("User not found")))
                .map(user -> {
                    String newToken = jwtTokenProvider.generateToken(email);
                    return buildLoginResponse(user, newToken, refreshToken);
                });
    }

    public Mono<R2dbcUser> getCurrentUser(String email) {
        return userRepository.findByEmail(email)
                .switchIfEmpty(Mono.error(CustomException.notFound("User not found")));
    }

    private Mono<Boolean> storeRefreshToken(String email, String token) {
        String redisKey = REFRESH_TOKEN_KEY_PREFIX + email;
        return redisTemplate.opsForValue().set(redisKey, token, REFRESH_TOKEN_TTL);
    }

    private Mono<Void> deleteRefreshToken(String email) {
        String redisKey = REFRESH_TOKEN_KEY_PREFIX + email;
        return redisTemplate.delete(redisKey).then();
    }

    private Mono<String> getStoredRefreshToken(String email) {
        String redisKey = REFRESH_TOKEN_KEY_PREFIX + email;
        return redisTemplate.opsForValue().get(redisKey)
                .map(Object::toString);
    }
}
