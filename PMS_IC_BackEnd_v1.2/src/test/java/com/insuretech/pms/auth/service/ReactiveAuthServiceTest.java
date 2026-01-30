package com.insuretech.pms.auth.service;

import com.insuretech.pms.auth.dto.LoginRequest;
import com.insuretech.pms.auth.dto.LoginResponse;
import com.insuretech.pms.auth.reactive.entity.R2dbcUser;
import com.insuretech.pms.auth.reactive.repository.ReactiveUserRepository;
import com.insuretech.pms.common.exception.CustomException;
import com.insuretech.pms.support.R2dbcTestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.data.redis.core.ReactiveValueOperations;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReactiveAuthService Tests")
class ReactiveAuthServiceTest {

    @Mock
    private ReactiveUserRepository userRepository;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private ReactiveRedisTemplate<String, Object> redisTemplate;

    @Mock
    private ReactiveValueOperations<String, Object> valueOperations;

    @InjectMocks
    private ReactiveAuthService authService;

    private R2dbcUser testUser;
    private String testEmail;
    private String testPassword;
    private String encodedPassword;

    @BeforeEach
    void setUp() {
        R2dbcTestDataFactory.resetCounter();
        testEmail = "test@example.com";
        testPassword = "password123";
        encodedPassword = "$2a$10$encodedPassword";

        testUser = R2dbcTestDataFactory.user()
                .email(testEmail)
                .password(encodedPassword)
                .name("Test User")
                .role("DEVELOPER")
                .department("Engineering")
                .active(true)
                .build();

        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Nested
    @DisplayName("login")
    class Login {

        @Test
        @DisplayName("should return login response with tokens for valid credentials")
        void shouldReturnLoginResponseForValidCredentials() {
            // Given
            LoginRequest request = new LoginRequest(testEmail, testPassword);
            String accessToken = "access-token-123";
            String refreshToken = "refresh-token-456";

            when(userRepository.findByEmailAndActiveTrue(testEmail))
                    .thenReturn(Mono.just(testUser));
            when(passwordEncoder.matches(testPassword, encodedPassword))
                    .thenReturn(true);
            when(jwtTokenProvider.generateToken(testEmail))
                    .thenReturn(accessToken);
            when(jwtTokenProvider.generateRefreshToken(testEmail))
                    .thenReturn(refreshToken);
            when(userRepository.save(any(R2dbcUser.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
            when(valueOperations.set(anyString(), any(), any(Duration.class)))
                    .thenReturn(Mono.just(true));

            // When & Then
            StepVerifier.create(authService.login(request))
                    .assertNext(response -> {
                        assertThat(response.getToken()).isEqualTo(accessToken);
                        assertThat(response.getRefreshToken()).isEqualTo(refreshToken);
                        assertThat(response.getUser()).isNotNull();
                        assertThat(response.getUser().getEmail()).isEqualTo(testEmail);
                        assertThat(response.getUser().getName()).isEqualTo("Test User");
                        assertThat(response.getUser().getRole()).isEqualTo("developer");
                    })
                    .verifyComplete();

            verify(userRepository).save(any(R2dbcUser.class));
        }

        @Test
        @DisplayName("should set system role for ADMIN user")
        void shouldSetSystemRoleForAdminUser() {
            // Given
            R2dbcUser adminUser = R2dbcTestDataFactory.admin();
            adminUser.setEmail(testEmail);
            adminUser.setPassword(encodedPassword);

            LoginRequest request = new LoginRequest(testEmail, testPassword);

            when(userRepository.findByEmailAndActiveTrue(testEmail))
                    .thenReturn(Mono.just(adminUser));
            when(passwordEncoder.matches(testPassword, encodedPassword))
                    .thenReturn(true);
            when(jwtTokenProvider.generateToken(testEmail))
                    .thenReturn("token");
            when(jwtTokenProvider.generateRefreshToken(testEmail))
                    .thenReturn("refresh");
            when(userRepository.save(any(R2dbcUser.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
            when(valueOperations.set(anyString(), any(), any(Duration.class)))
                    .thenReturn(Mono.just(true));

            // When & Then
            StepVerifier.create(authService.login(request))
                    .assertNext(response -> {
                        assertThat(response.getUser().getSystemRole()).isEqualTo("admin");
                        assertThat(response.getUser().getRole()).isEqualTo("admin");
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should set system role for AUDITOR user")
        void shouldSetSystemRoleForAuditorUser() {
            // Given
            R2dbcUser auditorUser = R2dbcTestDataFactory.user()
                    .email(testEmail)
                    .password(encodedPassword)
                    .role("AUDITOR")
                    .build();

            LoginRequest request = new LoginRequest(testEmail, testPassword);

            when(userRepository.findByEmailAndActiveTrue(testEmail))
                    .thenReturn(Mono.just(auditorUser));
            when(passwordEncoder.matches(testPassword, encodedPassword))
                    .thenReturn(true);
            when(jwtTokenProvider.generateToken(testEmail))
                    .thenReturn("token");
            when(jwtTokenProvider.generateRefreshToken(testEmail))
                    .thenReturn("refresh");
            when(userRepository.save(any(R2dbcUser.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
            when(valueOperations.set(anyString(), any(), any(Duration.class)))
                    .thenReturn(Mono.just(true));

            // When & Then
            StepVerifier.create(authService.login(request))
                    .assertNext(response -> {
                        assertThat(response.getUser().getSystemRole()).isEqualTo("auditor");
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should not set system role for non-admin user")
        void shouldNotSetSystemRoleForNonAdminUser() {
            // Given
            LoginRequest request = new LoginRequest(testEmail, testPassword);

            when(userRepository.findByEmailAndActiveTrue(testEmail))
                    .thenReturn(Mono.just(testUser));
            when(passwordEncoder.matches(testPassword, encodedPassword))
                    .thenReturn(true);
            when(jwtTokenProvider.generateToken(testEmail))
                    .thenReturn("token");
            when(jwtTokenProvider.generateRefreshToken(testEmail))
                    .thenReturn("refresh");
            when(userRepository.save(any(R2dbcUser.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
            when(valueOperations.set(anyString(), any(), any(Duration.class)))
                    .thenReturn(Mono.just(true));

            // When & Then
            StepVerifier.create(authService.login(request))
                    .assertNext(response -> {
                        assertThat(response.getUser().getSystemRole()).isNull();
                        assertThat(response.getUser().getRole()).isEqualTo("developer");
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should throw unauthorized when user not found")
        void shouldThrowUnauthorizedWhenUserNotFound() {
            // Given
            LoginRequest request = new LoginRequest(testEmail, testPassword);

            when(userRepository.findByEmailAndActiveTrue(testEmail))
                    .thenReturn(Mono.empty());

            // When & Then
            StepVerifier.create(authService.login(request))
                    .expectErrorMatches(error ->
                            error instanceof CustomException &&
                            ((CustomException) error).getStatus() == HttpStatus.UNAUTHORIZED &&
                            error.getMessage().contains("Invalid email or password"))
                    .verify();

            verify(passwordEncoder, never()).matches(anyString(), anyString());
        }

        @Test
        @DisplayName("should throw unauthorized when password is incorrect")
        void shouldThrowUnauthorizedWhenPasswordIncorrect() {
            // Given
            LoginRequest request = new LoginRequest(testEmail, "wrongPassword");

            when(userRepository.findByEmailAndActiveTrue(testEmail))
                    .thenReturn(Mono.just(testUser));
            when(passwordEncoder.matches("wrongPassword", encodedPassword))
                    .thenReturn(false);

            // When & Then
            StepVerifier.create(authService.login(request))
                    .expectErrorMatches(error ->
                            error instanceof CustomException &&
                            ((CustomException) error).getStatus() == HttpStatus.UNAUTHORIZED &&
                            error.getMessage().contains("Invalid email or password"))
                    .verify();

            verify(jwtTokenProvider, never()).generateToken(anyString());
        }

        @Test
        @DisplayName("should update last login timestamp")
        void shouldUpdateLastLoginTimestamp() {
            // Given
            LoginRequest request = new LoginRequest(testEmail, testPassword);

            when(userRepository.findByEmailAndActiveTrue(testEmail))
                    .thenReturn(Mono.just(testUser));
            when(passwordEncoder.matches(testPassword, encodedPassword))
                    .thenReturn(true);
            when(jwtTokenProvider.generateToken(testEmail))
                    .thenReturn("token");
            when(jwtTokenProvider.generateRefreshToken(testEmail))
                    .thenReturn("refresh");
            when(userRepository.save(any(R2dbcUser.class)))
                    .thenAnswer(invocation -> {
                        R2dbcUser savedUser = invocation.getArgument(0);
                        assertThat(savedUser.getLastLoginAt()).isNotNull();
                        return Mono.just(savedUser);
                    });
            when(valueOperations.set(anyString(), any(), any(Duration.class)))
                    .thenReturn(Mono.just(true));

            // When & Then
            StepVerifier.create(authService.login(request))
                    .assertNext(response -> assertThat(response.getToken()).isNotNull())
                    .verifyComplete();

            verify(userRepository).save(argThat(user ->
                    user.getLastLoginAt() != null));
        }

        @Test
        @DisplayName("should store refresh token in Redis")
        void shouldStoreRefreshTokenInRedis() {
            // Given
            LoginRequest request = new LoginRequest(testEmail, testPassword);
            String refreshToken = "refresh-token-123";

            when(userRepository.findByEmailAndActiveTrue(testEmail))
                    .thenReturn(Mono.just(testUser));
            when(passwordEncoder.matches(testPassword, encodedPassword))
                    .thenReturn(true);
            when(jwtTokenProvider.generateToken(testEmail))
                    .thenReturn("token");
            when(jwtTokenProvider.generateRefreshToken(testEmail))
                    .thenReturn(refreshToken);
            when(userRepository.save(any(R2dbcUser.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
            when(valueOperations.set(eq("refresh_token:" + testEmail), eq(refreshToken), any(Duration.class)))
                    .thenReturn(Mono.just(true));

            // When & Then
            StepVerifier.create(authService.login(request))
                    .assertNext(response -> assertThat(response.getRefreshToken()).isEqualTo(refreshToken))
                    .verifyComplete();

            verify(valueOperations).set(
                    eq("refresh_token:" + testEmail),
                    eq(refreshToken),
                    eq(Duration.ofDays(7))
            );
        }

        @Test
        @DisplayName("should return empty project roles list")
        void shouldReturnEmptyProjectRolesList() {
            // Given
            LoginRequest request = new LoginRequest(testEmail, testPassword);

            when(userRepository.findByEmailAndActiveTrue(testEmail))
                    .thenReturn(Mono.just(testUser));
            when(passwordEncoder.matches(testPassword, encodedPassword))
                    .thenReturn(true);
            when(jwtTokenProvider.generateToken(testEmail))
                    .thenReturn("token");
            when(jwtTokenProvider.generateRefreshToken(testEmail))
                    .thenReturn("refresh");
            when(userRepository.save(any(R2dbcUser.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
            when(valueOperations.set(anyString(), any(), any(Duration.class)))
                    .thenReturn(Mono.just(true));

            // When & Then
            StepVerifier.create(authService.login(request))
                    .assertNext(response -> {
                        assertThat(response.getProjectRoles()).isNotNull();
                        assertThat(response.getProjectRoles()).isEmpty();
                    })
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("logout")
    class Logout {

        @Test
        @DisplayName("should delete refresh token from Redis")
        void shouldDeleteRefreshTokenFromRedis() {
            // Given
            String email = "user@example.com";
            when(redisTemplate.delete("refresh_token:" + email))
                    .thenReturn(Mono.just(1L));

            // When & Then
            StepVerifier.create(authService.logout(email))
                    .verifyComplete();

            verify(redisTemplate).delete("refresh_token:" + email);
        }

        @Test
        @DisplayName("should complete even if token does not exist")
        void shouldCompleteEvenIfTokenDoesNotExist() {
            // Given
            String email = "nonexistent@example.com";
            when(redisTemplate.delete("refresh_token:" + email))
                    .thenReturn(Mono.just(0L));

            // When & Then
            StepVerifier.create(authService.logout(email))
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("refreshToken")
    class RefreshToken {

        @Test
        @DisplayName("should return new access token for valid refresh token")
        void shouldReturnNewAccessTokenForValidRefreshToken() {
            // Given
            String refreshToken = "valid-refresh-token";
            String newAccessToken = "new-access-token";

            when(jwtTokenProvider.validateToken(refreshToken)).thenReturn(true);
            when(jwtTokenProvider.getUsernameFromToken(refreshToken)).thenReturn(testEmail);
            when(valueOperations.get("refresh_token:" + testEmail))
                    .thenReturn(Mono.just(refreshToken));
            when(userRepository.findByEmail(testEmail))
                    .thenReturn(Mono.just(testUser));
            when(jwtTokenProvider.generateToken(testEmail))
                    .thenReturn(newAccessToken);

            // When & Then
            StepVerifier.create(authService.refreshToken(refreshToken))
                    .assertNext(response -> {
                        assertThat(response.getToken()).isEqualTo(newAccessToken);
                        assertThat(response.getRefreshToken()).isEqualTo(refreshToken);
                        assertThat(response.getUser().getEmail()).isEqualTo(testEmail);
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should throw unauthorized for invalid token signature")
        void shouldThrowUnauthorizedForInvalidTokenSignature() {
            // Given
            String invalidToken = "invalid-refresh-token";

            when(jwtTokenProvider.validateToken(invalidToken)).thenReturn(false);

            // When & Then
            StepVerifier.create(authService.refreshToken(invalidToken))
                    .expectErrorMatches(error ->
                            error instanceof CustomException &&
                            ((CustomException) error).getStatus() == HttpStatus.UNAUTHORIZED &&
                            error.getMessage().contains("Invalid refresh token"))
                    .verify();

            verify(userRepository, never()).findByEmail(anyString());
        }

        @Test
        @DisplayName("should throw unauthorized when stored token does not match")
        void shouldThrowUnauthorizedWhenStoredTokenDoesNotMatch() {
            // Given
            String refreshToken = "refresh-token";
            String differentStoredToken = "different-token";

            when(jwtTokenProvider.validateToken(refreshToken)).thenReturn(true);
            when(jwtTokenProvider.getUsernameFromToken(refreshToken)).thenReturn(testEmail);
            when(valueOperations.get("refresh_token:" + testEmail))
                    .thenReturn(Mono.just(differentStoredToken));

            // When & Then
            StepVerifier.create(authService.refreshToken(refreshToken))
                    .expectErrorMatches(error ->
                            error instanceof CustomException &&
                            ((CustomException) error).getStatus() == HttpStatus.UNAUTHORIZED)
                    .verify();
        }

        @Test
        @DisplayName("should throw unauthorized when no stored token exists")
        void shouldThrowUnauthorizedWhenNoStoredTokenExists() {
            // Given
            String refreshToken = "refresh-token";

            when(jwtTokenProvider.validateToken(refreshToken)).thenReturn(true);
            when(jwtTokenProvider.getUsernameFromToken(refreshToken)).thenReturn(testEmail);
            when(valueOperations.get("refresh_token:" + testEmail))
                    .thenReturn(Mono.empty());

            // When & Then
            StepVerifier.create(authService.refreshToken(refreshToken))
                    .expectErrorMatches(error ->
                            error instanceof CustomException &&
                            ((CustomException) error).getStatus() == HttpStatus.UNAUTHORIZED)
                    .verify();
        }

        @Test
        @DisplayName("should throw not found when user does not exist")
        void shouldThrowNotFoundWhenUserDoesNotExist() {
            // Given
            String refreshToken = "valid-refresh-token";

            when(jwtTokenProvider.validateToken(refreshToken)).thenReturn(true);
            when(jwtTokenProvider.getUsernameFromToken(refreshToken)).thenReturn(testEmail);
            when(valueOperations.get("refresh_token:" + testEmail))
                    .thenReturn(Mono.just(refreshToken));
            when(userRepository.findByEmail(testEmail))
                    .thenReturn(Mono.empty());

            // When & Then
            StepVerifier.create(authService.refreshToken(refreshToken))
                    .expectErrorMatches(error ->
                            error instanceof CustomException &&
                            ((CustomException) error).getStatus() == HttpStatus.NOT_FOUND &&
                            error.getMessage().contains("User not found"))
                    .verify();
        }
    }

    @Nested
    @DisplayName("getCurrentUser")
    class GetCurrentUser {

        @Test
        @DisplayName("should return user for valid email")
        void shouldReturnUserForValidEmail() {
            // Given
            when(userRepository.findByEmail(testEmail))
                    .thenReturn(Mono.just(testUser));

            // When & Then
            StepVerifier.create(authService.getCurrentUser(testEmail))
                    .assertNext(user -> {
                        assertThat(user.getEmail()).isEqualTo(testEmail);
                        assertThat(user.getName()).isEqualTo("Test User");
                        assertThat(user.getRole()).isEqualTo("DEVELOPER");
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should throw not found for non-existent user")
        void shouldThrowNotFoundForNonExistentUser() {
            // Given
            String unknownEmail = "unknown@example.com";
            when(userRepository.findByEmail(unknownEmail))
                    .thenReturn(Mono.empty());

            // When & Then
            StepVerifier.create(authService.getCurrentUser(unknownEmail))
                    .expectErrorMatches(error ->
                            error instanceof CustomException &&
                            ((CustomException) error).getStatus() == HttpStatus.NOT_FOUND &&
                            error.getMessage().contains("User not found"))
                    .verify();
        }
    }

    @Nested
    @DisplayName("User Role Handling")
    class UserRoleHandling {

        @Test
        @DisplayName("should handle null role gracefully")
        void shouldHandleNullRoleGracefully() {
            // Given
            R2dbcUser userWithNullRole = R2dbcTestDataFactory.user()
                    .email(testEmail)
                    .password(encodedPassword)
                    .role(null)
                    .build();

            LoginRequest request = new LoginRequest(testEmail, testPassword);

            when(userRepository.findByEmailAndActiveTrue(testEmail))
                    .thenReturn(Mono.just(userWithNullRole));
            when(passwordEncoder.matches(testPassword, encodedPassword))
                    .thenReturn(true);
            when(jwtTokenProvider.generateToken(testEmail))
                    .thenReturn("token");
            when(jwtTokenProvider.generateRefreshToken(testEmail))
                    .thenReturn("refresh");
            when(userRepository.save(any(R2dbcUser.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
            when(valueOperations.set(anyString(), any(), any(Duration.class)))
                    .thenReturn(Mono.just(true));

            // When & Then
            StepVerifier.create(authService.login(request))
                    .assertNext(response -> {
                        assertThat(response.getUser().getRole()).isNull();
                        assertThat(response.getUser().getSystemRole()).isNull();
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should convert role to lowercase")
        void shouldConvertRoleToLowercase() {
            // Given
            R2dbcUser userWithUppercaseRole = R2dbcTestDataFactory.user()
                    .email(testEmail)
                    .password(encodedPassword)
                    .role("PM")
                    .build();

            LoginRequest request = new LoginRequest(testEmail, testPassword);

            when(userRepository.findByEmailAndActiveTrue(testEmail))
                    .thenReturn(Mono.just(userWithUppercaseRole));
            when(passwordEncoder.matches(testPassword, encodedPassword))
                    .thenReturn(true);
            when(jwtTokenProvider.generateToken(testEmail))
                    .thenReturn("token");
            when(jwtTokenProvider.generateRefreshToken(testEmail))
                    .thenReturn("refresh");
            when(userRepository.save(any(R2dbcUser.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
            when(valueOperations.set(anyString(), any(), any(Duration.class)))
                    .thenReturn(Mono.just(true));

            // When & Then
            StepVerifier.create(authService.login(request))
                    .assertNext(response -> {
                        assertThat(response.getUser().getRole()).isEqualTo("pm");
                    })
                    .verifyComplete();
        }
    }
}
