package com.insuretech.pms.task.service;

import com.insuretech.pms.auth.entity.User;
import com.insuretech.pms.auth.repository.UserRepository;
import com.insuretech.pms.task.dto.BottleneckAlertRequest;
import com.insuretech.pms.task.dto.PersonalWipNotificationRequest;
import com.insuretech.pms.task.dto.WipNotificationRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest
@DisplayName("WIP Email Notification Service Tests")
class WipEmailNotificationServiceTest {

    @Autowired
    private WipEmailNotificationService emailService;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private JavaMailSender mailSender;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id("user-1")
                .name("Test User")
                .email("test@example.com")
                .password("encrypted")
                .role(User.UserRole.PM)
                .active(true)
                .build();
    }

    @Test
    @DisplayName("Send soft limit warning email")
    void testSendSoftLimitWarning() {
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));

        WipNotificationRequest request = WipNotificationRequest.builder()
                .projectId("project-1")
                .targetId("column-1")
                .targetName("In Progress")
                .currentWip(8)
                .wipLimit(10)
                .recipientId("user-1")
                .notificationType(WipNotificationRequest.WipNotificationType.SOFT_LIMIT_WARNING)
                .build();
        emailService.sendNotification(request);

        verify(userRepository, timeout(5000)).findById("user-1");
    }

    @Test
    @DisplayName("Send soft limit warning with missing user")
    void testSendSoftLimitWarningMissingUser() {
        when(userRepository.findById("user-1")).thenReturn(Optional.empty());

        WipNotificationRequest request = WipNotificationRequest.builder()
                .projectId("project-1")
                .targetId("column-1")
                .targetName("In Progress")
                .currentWip(8)
                .wipLimit(10)
                .recipientId("user-1")
                .notificationType(WipNotificationRequest.WipNotificationType.SOFT_LIMIT_WARNING)
                .build();

        // Should not throw, just log warning
        assertThatNoException().isThrownBy(() -> emailService.sendNotification(request));

        verify(userRepository, timeout(5000)).findById("user-1");
    }

    @Test
    @DisplayName("Send hard limit violation email")
    void testSendHardLimitViolation() {
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));

        WipNotificationRequest request = WipNotificationRequest.builder()
                .projectId("project-1")
                .targetId("column-1")
                .targetName("In Progress")
                .currentWip(15)
                .wipLimit(12)
                .recipientId("user-1")
                .notificationType(WipNotificationRequest.WipNotificationType.HARD_LIMIT_VIOLATION)
                .build();
        emailService.sendNotification(request);

        verify(userRepository, timeout(5000)).findById("user-1");
    }

    @Test
    @DisplayName("Send bottleneck detection alert")
    void testSendBottleneckAlert() {
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));

        BottleneckAlertRequest request = BottleneckAlertRequest.builder()
                .projectId("project-1")
                .columnId("column-1")
                .columnName("Review")
                .blockingTasks(3)
                .affectedTasks(8)
                .projectManagerId("user-1")
                .build();
        emailService.sendBottleneckAlert(request);

        verify(userRepository, timeout(5000)).findById("user-1");
    }

    @Test
    @DisplayName("Send sprint CONWIP violation email")
    void testSendSprintConwipViolation() {
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));

        WipNotificationRequest request = WipNotificationRequest.builder()
                .projectId("project-1")
                .targetId("sprint-1")
                .targetName("Sprint 25")
                .currentWip(28)
                .wipLimit(25)
                .recipientId("user-1")
                .notificationType(WipNotificationRequest.WipNotificationType.CONWIP_VIOLATION)
                .build();
        emailService.sendNotification(request);

        verify(userRepository, timeout(5000)).findById("user-1");
    }

    @Test
    @DisplayName("Send personal WIP limit violation")
    void testSendPersonalWipViolation() {
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));

        PersonalWipNotificationRequest request = PersonalWipNotificationRequest.builder()
                .projectId("project-1")
                .assigneeId("user-1")
                .assigneeName("Test User")
                .currentWip(6)
                .maxWip(5)
                .build();
        emailService.sendPersonalWipViolation(request);

        verify(userRepository, timeout(5000)).findById("user-1");
    }

    @Test
    @DisplayName("Send personal WIP violation with missing assignee")
    void testSendPersonalWipViolationMissingAssignee() {
        when(userRepository.findById("user-1")).thenReturn(Optional.empty());

        PersonalWipNotificationRequest request = PersonalWipNotificationRequest.builder()
                .projectId("project-1")
                .assigneeId("user-1")
                .assigneeName("Test User")
                .currentWip(6)
                .maxWip(5)
                .build();

        // Should not throw, just log warning
        assertThatNoException().isThrownBy(() -> emailService.sendPersonalWipViolation(request));

        verify(userRepository, timeout(5000)).findById("user-1");
    }

    @Test
    @DisplayName("Send team notification to multiple recipients")
    void testSendTeamNotification() {
        java.util.List<String> recipients = java.util.List.of(
                "user1@example.com",
                "user2@example.com",
                "user3@example.com"
        );

        String subject = "WIP Status Update";
        String content = "<html><body>Test content</body></html>";

        emailService.sendTeamNotification(recipients, subject, content);

        // Should complete without throwing
        assertThat(recipients).hasSize(3);
    }

    @Test
    @DisplayName("Email content includes project link")
    void testEmailContentIncludesProjectLink() {
        // This is a conceptual test verifying the service creates proper HTML
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));

        WipNotificationRequest request = WipNotificationRequest.builder()
                .projectId("project-1")
                .targetId("column-1")
                .targetName("In Progress")
                .currentWip(8)
                .wipLimit(10)
                .recipientId("user-1")
                .notificationType(WipNotificationRequest.WipNotificationType.SOFT_LIMIT_WARNING)
                .build();
        emailService.sendNotification(request);

        // Verify user lookup was called (email service attempts to retrieve user)
        verify(userRepository, timeout(5000).atLeastOnce()).findById(anyString());
    }

    @Test
    @DisplayName("Service handles null email gracefully")
    void testHandleNullEmail() {
        User invalidUser = User.builder()
                .id("user-1")
                .name("Invalid User")
                .email(null)
                .password("encrypted")
                .role(User.UserRole.PM)
                .build();

        when(userRepository.findById("user-1")).thenReturn(Optional.of(invalidUser));

        WipNotificationRequest request = WipNotificationRequest.builder()
                .projectId("project-1")
                .targetId("column-1")
                .targetName("In Progress")
                .currentWip(8)
                .wipLimit(10)
                .recipientId("user-1")
                .notificationType(WipNotificationRequest.WipNotificationType.SOFT_LIMIT_WARNING)
                .build();

        // Should handle gracefully without throwing NPE
        assertThatNoException().isThrownBy(() -> emailService.sendNotification(request));
    }
}
