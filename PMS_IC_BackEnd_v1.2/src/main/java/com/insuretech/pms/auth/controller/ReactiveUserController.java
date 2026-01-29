package com.insuretech.pms.auth.controller;

import com.insuretech.pms.auth.dto.UserDto;
import com.insuretech.pms.auth.service.ReactiveUserService;
import com.insuretech.pms.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;

@RestController
@RequestMapping("/api/v2/users")
@RequiredArgsConstructor
public class ReactiveUserController {

    private final ReactiveUserService userService;

    @GetMapping
    public Mono<ResponseEntity<ApiResponse<List<UserDto>>>> getAllUsers() {
        return userService.getAllUsers()
                .collectList()
                .map(users -> ResponseEntity.ok(ApiResponse.success(users)));
    }

    @GetMapping("/{id}")
    public Mono<ResponseEntity<ApiResponse<UserDto>>> getUserById(@PathVariable String id) {
        return userService.getUserById(id)
                .map(user -> ResponseEntity.ok(ApiResponse.success(user)));
    }

    @PostMapping
    public Mono<ResponseEntity<ApiResponse<UserDto>>> createUser(
            @Valid @RequestBody UserDto dto) {
        return userService.createUser(dto)
                .map(user -> ResponseEntity.ok(ApiResponse.success("User created", user)));
    }

    @PutMapping("/{id}")
    public Mono<ResponseEntity<ApiResponse<UserDto>>> updateUser(
            @PathVariable String id,
            @Valid @RequestBody UserDto dto) {
        return userService.updateUser(id, dto)
                .map(user -> ResponseEntity.ok(ApiResponse.success("User updated", user)));
    }

    @DeleteMapping("/{id}")
    public Mono<ResponseEntity<ApiResponse<Void>>> deleteUser(@PathVariable String id) {
        return userService.deleteUser(id)
                .then(Mono.just(ResponseEntity.ok(ApiResponse.success("User deleted", null))));
    }

    @PatchMapping("/{id}/status")
    public Mono<ResponseEntity<ApiResponse<UserDto>>> updateUserStatus(
            @PathVariable String id,
            @RequestParam boolean active) {
        return userService.updateUserStatus(id, active)
                .map(user -> ResponseEntity.ok(ApiResponse.success("Status updated", user)));
    }
}
