package com.insuretech.pms.auth.service;

import com.insuretech.pms.auth.dto.UserDto;
import com.insuretech.pms.auth.reactive.entity.R2dbcUser;
import com.insuretech.pms.auth.reactive.repository.ReactiveUserRepository;
import com.insuretech.pms.common.exception.CustomException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.reactive.TransactionalOperator;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReactiveUserService {

    private final ReactiveUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TransactionalOperator transactionalOperator;

    public Flux<UserDto> getAllUsers() {
        return userRepository.findByActiveTrue()
                .map(this::toDto);
    }

    public Mono<UserDto> getUserById(String id) {
        return userRepository.findById(id)
                .switchIfEmpty(Mono.error(CustomException.notFound("User not found: " + id)))
                .map(this::toDto);
    }

    public Mono<UserDto> getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .switchIfEmpty(Mono.error(CustomException.notFound("User not found: " + email)))
                .map(this::toDto);
    }

    public Mono<UserDto> createUser(UserDto dto) {
        return userRepository.existsByEmail(dto.getEmail())
                .flatMap(exists -> {
                    if (exists) {
                        return Mono.error(CustomException.conflict("Email already exists: " + dto.getEmail()));
                    }
                    R2dbcUser user = R2dbcUser.builder()
                            .id(UUID.randomUUID().toString())
                            .email(dto.getEmail())
                            .password(passwordEncoder.encode(dto.getPassword()))
                            .name(dto.getName())
                            .role(dto.getRole())
                            .department(dto.getDepartment())
                            .active(true)
                            .build();
                    return userRepository.save(user);
                })
                .map(this::toDto)
                .as(transactionalOperator::transactional)
                .doOnSuccess(u -> log.info("Created user: {}", u.getEmail()));
    }

    public Mono<UserDto> updateUser(String id, UserDto dto) {
        return userRepository.findById(id)
                .switchIfEmpty(Mono.error(CustomException.notFound("User not found: " + id)))
                .flatMap(user -> {
                    user.setName(dto.getName());
                    user.setDepartment(dto.getDepartment());
                    if (dto.getRole() != null) {
                        user.setRole(dto.getRole());
                    }
                    return userRepository.save(user);
                })
                .map(this::toDto)
                .as(transactionalOperator::transactional)
                .doOnSuccess(u -> log.info("Updated user: {}", u.getEmail()));
    }

    public Mono<Void> deleteUser(String id) {
        return userRepository.findById(id)
                .switchIfEmpty(Mono.error(CustomException.notFound("User not found: " + id)))
                .flatMap(user -> {
                    user.setActive(false);
                    return userRepository.save(user);
                })
                .then()
                .doOnSuccess(v -> log.info("Deleted (deactivated) user: {}", id));
    }

    public Mono<UserDto> updateUserStatus(String id, boolean active) {
        return userRepository.updateActiveStatus(id, active)
                .then(userRepository.findById(id))
                .switchIfEmpty(Mono.error(CustomException.notFound("User not found: " + id)))
                .map(this::toDto);
    }

    private UserDto toDto(R2dbcUser user) {
        return UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .role(user.getRole())
                .department(user.getDepartment())
                .active(user.getActive())
                .lastLoginAt(user.getLastLoginAt())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
