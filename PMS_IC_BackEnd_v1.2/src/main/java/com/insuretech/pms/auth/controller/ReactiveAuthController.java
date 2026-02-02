package com.insuretech.pms.auth.controller;

import com.insuretech.pms.auth.dto.LoginRequest;
import com.insuretech.pms.auth.dto.LoginResponse;
import com.insuretech.pms.auth.dto.RefreshTokenRequest;
import com.insuretech.pms.auth.service.ReactiveAuthService;
import com.insuretech.pms.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.security.Principal;

@RestController
@RequestMapping({"/api/auth", "/api/v2/auth"})
@RequiredArgsConstructor
public class ReactiveAuthController {

    private final ReactiveAuthService authService;

    @PostMapping("/login")
    public Mono<ResponseEntity<ApiResponse<LoginResponse>>> login(
            @Valid @RequestBody LoginRequest request) {
        return authService.login(request)
                .map(response -> ResponseEntity.ok(ApiResponse.success(response)));
    }

    @PostMapping("/logout")
    public Mono<ResponseEntity<ApiResponse<Void>>> logout(Principal principal) {
        if (principal == null) {
            return Mono.just(ResponseEntity.ok(ApiResponse.success(null)));
        }
        return authService.logout(principal.getName())
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("Logged out successfully", null))));
    }

    @PostMapping("/refresh")
    public Mono<ResponseEntity<ApiResponse<LoginResponse>>> refreshToken(
            @Valid @RequestBody RefreshTokenRequest request) {
        return authService.refreshToken(request.getRefreshToken())
                .map(response -> ResponseEntity.ok(ApiResponse.success(response)));
    }

    @GetMapping("/me")
    public Mono<ResponseEntity<ApiResponse<LoginResponse.UserInfo>>> getCurrentUser(Principal principal) {
        if (principal == null) {
            return Mono.just(ResponseEntity.status(401).body(ApiResponse.error("Not authenticated")));
        }
        return authService.getCurrentUser(principal.getName())
                .map(user -> {
                    LoginResponse.UserInfo userInfo = LoginResponse.UserInfo.builder()
                            .id(user.getId())
                            .email(user.getEmail())
                            .name(user.getName())
                            .role(user.getRole())
                            .department(user.getDepartment())
                            .build();
                    return ResponseEntity.ok(ApiResponse.success(userInfo));
                });
    }
}
