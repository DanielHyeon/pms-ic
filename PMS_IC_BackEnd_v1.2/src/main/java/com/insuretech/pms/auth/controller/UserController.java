package com.insuretech.pms.auth.controller;

import com.insuretech.pms.auth.dto.CreateUserRequest;
import com.insuretech.pms.auth.dto.LoginResponse;
import com.insuretech.pms.auth.dto.UpdateUserRequest;
import com.insuretech.pms.auth.service.UserService;
import com.insuretech.pms.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "Users", description = "사용자 관리 API")
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @Operation(summary = "사용자 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<List<LoginResponse.UserInfo>>> getAllUsers() {
        List<LoginResponse.UserInfo> users = userService.getAllUsers();
        return ResponseEntity.ok(ApiResponse.success(users));
    }

    @Operation(summary = "사용자 상세 조회")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<LoginResponse.UserInfo>> getUserById(@PathVariable String id) {
        LoginResponse.UserInfo user = userService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    @Operation(summary = "사용자 생성")
    @PostMapping
    public ResponseEntity<ApiResponse<LoginResponse.UserInfo>> createUser(@RequestBody CreateUserRequest request) {
        LoginResponse.UserInfo user = userService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("User created", user));
    }

    @Operation(summary = "사용자 수정")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<LoginResponse.UserInfo>> updateUser(
            @PathVariable String id,
            @RequestBody UpdateUserRequest request) {
        LoginResponse.UserInfo user = userService.updateUser(id, request);
        return ResponseEntity.ok(ApiResponse.success("User updated", user));
    }

    @Operation(summary = "사용자 삭제")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable String id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(ApiResponse.success("User deleted", null));
    }

    @Operation(summary = "사용자 상태 변경")
    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<LoginResponse.UserInfo>> updateUserStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> request) {
        boolean active = "active".equalsIgnoreCase(request.get("status"));
        LoginResponse.UserInfo user = userService.updateUserStatus(id, active);
        return ResponseEntity.ok(ApiResponse.success("User status updated", user));
    }

    @Operation(summary = "사용자 시스템 역할 변경")
    @PutMapping("/{id}/system-role")
    public ResponseEntity<ApiResponse<LoginResponse.UserInfo>> updateUserSystemRole(
            @PathVariable String id,
            @RequestBody Map<String, String> request) {
        LoginResponse.UserInfo user = userService.updateUserRole(id, request.get("systemRole"));
        return ResponseEntity.ok(ApiResponse.success("User role updated", user));
    }
}
