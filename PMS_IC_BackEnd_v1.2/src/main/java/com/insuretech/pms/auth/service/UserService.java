package com.insuretech.pms.auth.service;

import com.insuretech.pms.auth.dto.CreateUserRequest;
import com.insuretech.pms.auth.dto.LoginResponse;
import com.insuretech.pms.auth.dto.UpdateUserRequest;
import com.insuretech.pms.auth.entity.User;
import com.insuretech.pms.auth.repository.UserRepository;
import com.insuretech.pms.common.exception.CustomException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<LoginResponse.UserInfo> getAllUsers() {
        return userRepository.findAll().stream()
                .map(LoginResponse.UserInfo::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public LoginResponse.UserInfo getUserById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> CustomException.notFound("User not found: " + id));
        return LoginResponse.UserInfo.from(user);
    }

    @Transactional
    public LoginResponse.UserInfo createUser(CreateUserRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw CustomException.badRequest("Email already exists: " + request.getEmail());
        }

        User user = User.builder()
                .id(UUID.randomUUID().toString())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .department(request.getDepartment())
                .role(parseRole(request.getRole()))
                .active(true)
                .build();

        User savedUser = userRepository.save(user);
        return LoginResponse.UserInfo.from(savedUser);
    }

    @Transactional
    public LoginResponse.UserInfo updateUser(String id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> CustomException.notFound("User not found: " + id));

        if (request.getName() != null) {
            user.setName(request.getName());
        }
        if (request.getDepartment() != null) {
            user.setDepartment(request.getDepartment());
        }
        if (request.getRole() != null) {
            user.setRole(parseRole(request.getRole()));
        }

        User savedUser = userRepository.save(user);
        return LoginResponse.UserInfo.from(savedUser);
    }

    @Transactional
    public void deleteUser(String id) {
        if (!userRepository.existsById(id)) {
            throw CustomException.notFound("User not found: " + id);
        }
        userRepository.deleteById(id);
    }

    @Transactional
    public LoginResponse.UserInfo updateUserStatus(String id, boolean active) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> CustomException.notFound("User not found: " + id));

        user.setActive(active);
        User savedUser = userRepository.save(user);
        return LoginResponse.UserInfo.from(savedUser);
    }

    @Transactional
    public LoginResponse.UserInfo updateUserRole(String id, String role) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> CustomException.notFound("User not found: " + id));

        user.setRole(parseRole(role));
        User savedUser = userRepository.save(user);
        return LoginResponse.UserInfo.from(savedUser);
    }

    private User.UserRole parseRole(String role) {
        if (role == null || role.isBlank()) {
            return User.UserRole.DEVELOPER;
        }
        try {
            return User.UserRole.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException e) {
            return User.UserRole.DEVELOPER;
        }
    }
}
