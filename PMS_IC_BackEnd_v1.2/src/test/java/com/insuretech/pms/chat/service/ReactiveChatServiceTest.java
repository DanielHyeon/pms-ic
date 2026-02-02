package com.insuretech.pms.chat.service;

import com.insuretech.pms.chat.dto.*;
import com.insuretech.pms.chat.dto.sse.SseEventBuilder;
import com.insuretech.pms.chat.exception.ChatException;
import com.insuretech.pms.chat.gateway.LlmGatewayService;
import com.insuretech.pms.chat.reactive.entity.R2dbcChatMessage;
import com.insuretech.pms.chat.reactive.entity.R2dbcChatSession;
import com.insuretech.pms.chat.reactive.repository.ReactiveChatMessageRepository;
import com.insuretech.pms.chat.reactive.repository.ReactiveChatSessionRepository;
import com.insuretech.pms.chat.tool.StreamingToolOrchestrator;
import com.insuretech.pms.chat.tool.ToolRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.ReactiveListOperations;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.transaction.reactive.TransactionalOperator;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReactiveChatService Tests")
class ReactiveChatServiceTest {

    @Mock
    private ReactiveChatSessionRepository sessionRepository;

    @Mock
    private ReactiveChatMessageRepository messageRepository;

    @Mock
    private ReactiveAIChatClient reactiveAIChatClient;

    @Mock
    private ReactiveRedisTemplate<String, Object> reactiveRedisTemplate;

    @Mock
    private TransactionalOperator transactionalOperator;

    @Mock
    private LlmGatewayService llmGatewayService;

    @Mock
    private SseEventBuilder sseBuilder;

    @Mock
    private StreamingToolOrchestrator streamingToolOrchestrator;

    @Mock
    private ToolRegistry toolRegistry;

    @Mock
    private ReactiveListOperations<String, Object> listOperations;

    @InjectMocks
    private ReactiveChatService chatService;

    private R2dbcChatSession testSession;
    private R2dbcChatMessage testUserMessage;
    private R2dbcChatMessage testAssistantMessage;
    private String testUserId;
    private String testSessionId;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        testUserId = "user-123";
        testSessionId = UUID.randomUUID().toString();

        testSession = R2dbcChatSession.builder()
                .id(testSessionId)
                .userId(testUserId)
                .title("Test Chat")
                .active(true)
                .build();
        testSession.setCreatedAt(LocalDateTime.now());

        testUserMessage = R2dbcChatMessage.builder()
                .id(UUID.randomUUID().toString())
                .sessionId(testSessionId)
                .role("USER")
                .content("Hello, how are you?")
                .build();
        testUserMessage.setCreatedAt(LocalDateTime.now());

        testAssistantMessage = R2dbcChatMessage.builder()
                .id(UUID.randomUUID().toString())
                .sessionId(testSessionId)
                .role("ASSISTANT")
                .content("I'm doing well, thank you!")
                .build();
        testAssistantMessage.setCreatedAt(LocalDateTime.now().plusSeconds(1));

        lenient().when(transactionalOperator.transactional(any(Mono.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(reactiveRedisTemplate.opsForList()).thenReturn(listOperations);
    }

    @Nested
    @DisplayName("streamChat")
    class StreamChat {

        @Test
        @DisplayName("should stream chat chunks for existing session")
        void shouldStreamChatChunksForExistingSession() {
            // Given
            String message = "Hello!";
            ChatRequest request = new ChatRequest();
            request.setSessionId(testSessionId);
            request.setMessage(message);

            ChatChunk chunk1 = ChatChunk.token(testSessionId, "1", "Hello");
            ChatChunk chunk2 = ChatChunk.token(testSessionId, "2", " there!");
            ChatChunk doneChunk = ChatChunk.done(testSessionId, "3", 0.95);

            when(sessionRepository.findByIdAndActiveTrue(testSessionId))
                    .thenReturn(Mono.just(testSession));
            when(messageRepository.save(any(R2dbcChatMessage.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
            when(messageRepository.findRecentBySessionId(eq(testSessionId), anyInt()))
                    .thenReturn(Flux.empty());
            when(reactiveAIChatClient.streamChat(any(AIChatContext.class)))
                    .thenReturn(Flux.just(chunk1, chunk2, doneChunk));

            // When & Then
            StepVerifier.create(chatService.streamChat(request, testUserId))
                    .assertNext(chunk -> {
                        assertThat(chunk.getContent()).isEqualTo("Hello");
                        assertThat(chunk.isDone()).isFalse();
                    })
                    .assertNext(chunk -> {
                        assertThat(chunk.getContent()).isEqualTo(" there!");
                        assertThat(chunk.isDone()).isFalse();
                    })
                    .assertNext(chunk -> {
                        assertThat(chunk.isDone()).isTrue();
                        assertThat(chunk.getConfidence()).isEqualTo(0.95);
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should create new session when sessionId is null")
        void shouldCreateNewSessionWhenSessionIdIsNull() {
            // Given
            String message = "Start a new conversation";
            ChatRequest request = new ChatRequest();
            request.setSessionId(null);
            request.setMessage(message);

            ChatChunk responseChunk = ChatChunk.done(null, "1", 0.9);

            when(sessionRepository.save(any(R2dbcChatSession.class)))
                    .thenAnswer(invocation -> {
                        R2dbcChatSession session = invocation.getArgument(0);
                        assertThat(session.getTitle()).isEqualTo("New Chat");
                        assertThat(session.getUserId()).isEqualTo(testUserId);
                        assertThat(session.getActive()).isTrue();
                        return Mono.just(session);
                    });
            when(messageRepository.save(any(R2dbcChatMessage.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
            when(messageRepository.findRecentBySessionId(anyString(), anyInt()))
                    .thenReturn(Flux.empty());
            when(reactiveAIChatClient.streamChat(any(AIChatContext.class)))
                    .thenReturn(Flux.just(responseChunk));

            // When & Then
            StepVerifier.create(chatService.streamChat(request, testUserId))
                    .assertNext(chunk -> assertThat(chunk.isDone()).isTrue())
                    .verifyComplete();

            verify(sessionRepository).save(any(R2dbcChatSession.class));
        }

        @Test
        @DisplayName("should return error chunk when session not found")
        void shouldReturnErrorChunkWhenSessionNotFound() {
            // Given
            String nonExistentSessionId = "non-existent-session";
            ChatRequest request = new ChatRequest();
            request.setSessionId(nonExistentSessionId);
            request.setMessage("Hello");

            when(sessionRepository.findByIdAndActiveTrue(nonExistentSessionId))
                    .thenReturn(Mono.empty());

            // When & Then
            StepVerifier.create(chatService.streamChat(request, testUserId))
                    .assertNext(chunk -> {
                        assertThat(chunk.getType()).isEqualTo(ChatChunk.ChunkType.ERROR);
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should include recent messages in context")
        void shouldIncludeRecentMessagesInContext() {
            // Given
            ChatRequest request = new ChatRequest();
            request.setSessionId(testSessionId);
            request.setMessage("Continue our conversation");

            R2dbcChatMessage recentMsg1 = R2dbcChatMessage.builder()
                    .id("msg-1")
                    .sessionId(testSessionId)
                    .role("USER")
                    .content("Previous question")
                    .build();
            recentMsg1.setCreatedAt(LocalDateTime.now().minusMinutes(5));

            R2dbcChatMessage recentMsg2 = R2dbcChatMessage.builder()
                    .id("msg-2")
                    .sessionId(testSessionId)
                    .role("ASSISTANT")
                    .content("Previous answer")
                    .build();
            recentMsg2.setCreatedAt(LocalDateTime.now().minusMinutes(4));

            when(sessionRepository.findByIdAndActiveTrue(testSessionId))
                    .thenReturn(Mono.just(testSession));
            when(messageRepository.save(any(R2dbcChatMessage.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
            when(messageRepository.findRecentBySessionId(testSessionId, 10))
                    .thenReturn(Flux.just(recentMsg2, recentMsg1));  // Returned in DESC order

            ArgumentCaptor<AIChatContext> contextCaptor = ArgumentCaptor.forClass(AIChatContext.class);
            when(reactiveAIChatClient.streamChat(contextCaptor.capture()))
                    .thenReturn(Flux.just(ChatChunk.done(testSessionId, "1", 0.9)));

            // When
            StepVerifier.create(chatService.streamChat(request, testUserId))
                    .assertNext(chunk -> assertThat(chunk.isDone()).isTrue())
                    .verifyComplete();

            // Then
            AIChatContext capturedContext = contextCaptor.getValue();
            assertThat(capturedContext.getRecentMessages()).hasSize(2);
        }

        @Test
        @DisplayName("should handle AI client error gracefully")
        void shouldHandleAIClientErrorGracefully() {
            // Given
            ChatRequest request = new ChatRequest();
            request.setSessionId(testSessionId);
            request.setMessage("Hello");

            when(sessionRepository.findByIdAndActiveTrue(testSessionId))
                    .thenReturn(Mono.just(testSession));
            when(messageRepository.save(any(R2dbcChatMessage.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
            when(messageRepository.findRecentBySessionId(eq(testSessionId), anyInt()))
                    .thenReturn(Flux.empty());
            when(reactiveAIChatClient.streamChat(any(AIChatContext.class)))
                    .thenReturn(Flux.error(new RuntimeException("AI service unavailable")));

            // When & Then
            StepVerifier.create(chatService.streamChat(request, testUserId))
                    .assertNext(chunk -> {
                        assertThat(chunk.getType()).isEqualTo(ChatChunk.ChunkType.ERROR);
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should throw ChatException for empty message")
        void shouldThrowChatExceptionForEmptyMessage() {
            // Given
            ChatRequest request = new ChatRequest();
            request.setSessionId(testSessionId);
            request.setMessage("");

            // When & Then - validation throws synchronously
            StepVerifier.create(Mono.fromCallable(() -> {
                        chatService.streamChat(request, testUserId);
                        return null;
                    }))
                    .expectErrorMatches(error ->
                            error instanceof ChatException &&
                            ((ChatException) error).getErrorCode().equals("CHAT_MESSAGE_EMPTY"))
                    .verify();
        }

        @Test
        @DisplayName("should throw ChatException for null message")
        void shouldThrowChatExceptionForNullMessage() {
            // Given
            ChatRequest request = new ChatRequest();
            request.setSessionId(testSessionId);
            request.setMessage(null);

            // When & Then - validation throws synchronously
            StepVerifier.create(Mono.fromCallable(() -> {
                        chatService.streamChat(request, testUserId);
                        return null;
                    }))
                    .expectErrorMatches(error ->
                            error instanceof ChatException &&
                            ((ChatException) error).getErrorCode().equals("CHAT_MESSAGE_EMPTY"))
                    .verify();
        }
    }

    @Nested
    @DisplayName("sendMessage")
    class SendMessage {

        @Test
        @DisplayName("should send message and return response for existing session")
        void shouldSendMessageAndReturnResponse() {
            // Given
            ChatRequest request = new ChatRequest();
            request.setSessionId(testSessionId);
            request.setMessage("Hello!");
            request.setProjectId("project-1");
            request.setUserRole("PM");
            request.setUserAccessLevel(3);

            ChatResponse expectedResponse = ChatResponse.builder()
                    .reply("Hello! How can I help you?")
                    .confidence(0.95)
                    .suggestions(List.of("Ask about project status", "Request a report"))
                    .build();

            when(sessionRepository.findByIdAndActiveTrue(testSessionId))
                    .thenReturn(Mono.just(testSession));
            when(messageRepository.save(any(R2dbcChatMessage.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
            when(messageRepository.findRecentBySessionId(eq(testSessionId), anyInt()))
                    .thenReturn(Flux.empty());
            when(reactiveAIChatClient.chat(any(AIChatContext.class)))
                    .thenReturn(Mono.just(expectedResponse));
            when(listOperations.rightPush(anyString(), any()))
                    .thenReturn(Mono.just(1L));
            when(reactiveRedisTemplate.expire(anyString(), any()))
                    .thenReturn(Mono.just(true));

            // When & Then
            StepVerifier.create(chatService.sendMessage(request, testUserId))
                    .assertNext(response -> {
                        assertThat(response.getReply()).isEqualTo("Hello! How can I help you?");
                        assertThat(response.getConfidence()).isEqualTo(0.95);
                        assertThat(response.getSessionId()).isEqualTo(testSessionId);
                        assertThat(response.getSuggestions()).hasSize(2);
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should create new session when sessionId is null")
        void shouldCreateNewSessionForNullSessionId() {
            // Given
            ChatRequest request = new ChatRequest();
            request.setSessionId(null);
            request.setMessage("Hello!");

            ChatResponse expectedResponse = ChatResponse.builder()
                    .reply("Hello!")
                    .confidence(0.9)
                    .build();

            when(sessionRepository.save(any(R2dbcChatSession.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
            when(messageRepository.save(any(R2dbcChatMessage.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
            when(messageRepository.findRecentBySessionId(anyString(), anyInt()))
                    .thenReturn(Flux.empty());
            when(reactiveAIChatClient.chat(any(AIChatContext.class)))
                    .thenReturn(Mono.just(expectedResponse));
            when(listOperations.rightPush(anyString(), any()))
                    .thenReturn(Mono.just(1L));
            when(reactiveRedisTemplate.expire(anyString(), any()))
                    .thenReturn(Mono.just(true));

            // When & Then
            StepVerifier.create(chatService.sendMessage(request, testUserId))
                    .assertNext(response -> {
                        assertThat(response.getReply()).isEqualTo("Hello!");
                        assertThat(response.getSessionId()).isNotNull();
                    })
                    .verifyComplete();

            verify(sessionRepository).save(argThat(session ->
                    session.getTitle().equals("New Chat") && session.getUserId().equals(testUserId)));
        }

        @Test
        @DisplayName("should save both user and assistant messages")
        void shouldSaveBothUserAndAssistantMessages() {
            // Given
            ChatRequest request = new ChatRequest();
            request.setSessionId(testSessionId);
            request.setMessage("User message");

            ChatResponse expectedResponse = ChatResponse.builder()
                    .reply("Assistant reply")
                    .confidence(0.9)
                    .build();

            when(sessionRepository.findByIdAndActiveTrue(testSessionId))
                    .thenReturn(Mono.just(testSession));
            when(messageRepository.save(any(R2dbcChatMessage.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
            when(messageRepository.findRecentBySessionId(eq(testSessionId), anyInt()))
                    .thenReturn(Flux.empty());
            when(reactiveAIChatClient.chat(any(AIChatContext.class)))
                    .thenReturn(Mono.just(expectedResponse));
            when(listOperations.rightPush(anyString(), any()))
                    .thenReturn(Mono.just(1L));
            when(reactiveRedisTemplate.expire(anyString(), any()))
                    .thenReturn(Mono.just(true));

            // When
            StepVerifier.create(chatService.sendMessage(request, testUserId))
                    .assertNext(response -> assertThat(response).isNotNull())
                    .verifyComplete();

            // Then - verify both messages were saved
            ArgumentCaptor<R2dbcChatMessage> messageCaptor = ArgumentCaptor.forClass(R2dbcChatMessage.class);
            verify(messageRepository, times(2)).save(messageCaptor.capture());

            List<R2dbcChatMessage> savedMessages = messageCaptor.getAllValues();
            assertThat(savedMessages).hasSize(2);

            // First message should be user message
            assertThat(savedMessages.get(0).getRole()).isEqualTo("USER");
            assertThat(savedMessages.get(0).getContent()).isEqualTo("User message");

            // Second message should be assistant message
            assertThat(savedMessages.get(1).getRole()).isEqualTo("ASSISTANT");
            assertThat(savedMessages.get(1).getContent()).isEqualTo("Assistant reply");
        }

        @Test
        @DisplayName("should cache messages in Redis")
        void shouldCacheMessagesInRedis() {
            // Given
            ChatRequest request = new ChatRequest();
            request.setSessionId(testSessionId);
            request.setMessage("Cache this");

            ChatResponse expectedResponse = ChatResponse.builder()
                    .reply("Cached!")
                    .confidence(0.9)
                    .build();

            when(sessionRepository.findByIdAndActiveTrue(testSessionId))
                    .thenReturn(Mono.just(testSession));
            when(messageRepository.save(any(R2dbcChatMessage.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
            when(messageRepository.findRecentBySessionId(eq(testSessionId), anyInt()))
                    .thenReturn(Flux.empty());
            when(reactiveAIChatClient.chat(any(AIChatContext.class)))
                    .thenReturn(Mono.just(expectedResponse));
            when(listOperations.rightPush(eq("chat:session:" + testSessionId), eq("Cache this")))
                    .thenReturn(Mono.just(1L));
            when(reactiveRedisTemplate.expire(eq("chat:session:" + testSessionId), any()))
                    .thenReturn(Mono.just(true));

            // When & Then
            StepVerifier.create(chatService.sendMessage(request, testUserId))
                    .assertNext(response -> assertThat(response).isNotNull())
                    .verifyComplete();

            verify(listOperations).rightPush("chat:session:" + testSessionId, "Cache this");
        }

        @Test
        @DisplayName("should throw ChatException for non-existent session")
        void shouldThrowChatExceptionForNonExistentSession() {
            // Given
            String nonExistentSessionId = "non-existent";
            ChatRequest request = new ChatRequest();
            request.setSessionId(nonExistentSessionId);
            request.setMessage("Hello");

            when(sessionRepository.findByIdAndActiveTrue(nonExistentSessionId))
                    .thenReturn(Mono.empty());

            // When & Then
            StepVerifier.create(chatService.sendMessage(request, testUserId))
                    .expectErrorMatches(error ->
                            error instanceof ChatException &&
                            ((ChatException) error).getStatus() == HttpStatus.NOT_FOUND)
                    .verify();
        }

        @Test
        @DisplayName("should throw ChatException for empty message")
        void shouldThrowChatExceptionForEmptyMessage() {
            // Given
            ChatRequest request = new ChatRequest();
            request.setSessionId(testSessionId);
            request.setMessage("");

            // When & Then - validation throws synchronously
            StepVerifier.create(Mono.defer(() -> chatService.sendMessage(request, testUserId)))
                    .expectErrorMatches(error ->
                            error instanceof ChatException &&
                            ((ChatException) error).getErrorCode().equals("CHAT_MESSAGE_EMPTY"))
                    .verify();
        }

        @Test
        @DisplayName("should build context with project and role information")
        void shouldBuildContextWithProjectAndRoleInfo() {
            // Given
            ChatRequest request = new ChatRequest();
            request.setSessionId(testSessionId);
            request.setMessage("Test");
            request.setProjectId("project-abc");
            request.setUserRole("PM");
            request.setUserAccessLevel(4);

            ChatResponse expectedResponse = ChatResponse.builder()
                    .reply("Response")
                    .confidence(0.9)
                    .build();

            when(sessionRepository.findByIdAndActiveTrue(testSessionId))
                    .thenReturn(Mono.just(testSession));
            when(messageRepository.save(any(R2dbcChatMessage.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
            when(messageRepository.findRecentBySessionId(eq(testSessionId), anyInt()))
                    .thenReturn(Flux.empty());

            ArgumentCaptor<AIChatContext> contextCaptor = ArgumentCaptor.forClass(AIChatContext.class);
            when(reactiveAIChatClient.chat(contextCaptor.capture()))
                    .thenReturn(Mono.just(expectedResponse));
            when(listOperations.rightPush(anyString(), any()))
                    .thenReturn(Mono.just(1L));
            when(reactiveRedisTemplate.expire(anyString(), any()))
                    .thenReturn(Mono.just(true));

            // When
            StepVerifier.create(chatService.sendMessage(request, testUserId))
                    .assertNext(response -> assertThat(response).isNotNull())
                    .verifyComplete();

            // Then
            AIChatContext capturedContext = contextCaptor.getValue();
            assertThat(capturedContext.getUserId()).isEqualTo(testUserId);
            assertThat(capturedContext.getMessage()).isEqualTo("Test");
            assertThat(capturedContext.getProjectId()).isEqualTo("project-abc");
            assertThat(capturedContext.getUserRole()).isEqualTo("PM");
            assertThat(capturedContext.getUserAccessLevel()).isEqualTo(4);
        }
    }

    @Nested
    @DisplayName("streamChatV2")
    class StreamChatV2 {

        @Test
        @DisplayName("should stream SSE events without tools")
        void shouldStreamSseEventsWithoutTools() {
            // Given
            ChatStreamRequest request = ChatStreamRequest.builder()
                    .sessionId(testSessionId)
                    .message("Hello")
                    .enableTools(false)
                    .build();

            ServerSentEvent<String> metaEvent = ServerSentEvent.<String>builder()
                    .event("meta")
                    .data("{\"engine\":\"vllm\"}")
                    .build();
            ServerSentEvent<String> deltaEvent = ServerSentEvent.<String>builder()
                    .event("delta")
                    .data("{\"text\":\"Hello!\"}")
                    .build();
            ServerSentEvent<String> doneEvent = ServerSentEvent.<String>builder()
                    .event("done")
                    .data("{}")
                    .build();

            when(sessionRepository.findByIdAndActiveTrue(testSessionId))
                    .thenReturn(Mono.just(testSession));
            when(messageRepository.save(any(R2dbcChatMessage.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
            when(messageRepository.findRecentBySessionId(eq(testSessionId), anyInt()))
                    .thenReturn(Flux.empty());
            lenient().when(toolRegistry.hasTools()).thenReturn(false);
            when(llmGatewayService.streamChat(any()))
                    .thenReturn(Flux.just(metaEvent, deltaEvent, doneEvent));

            // When & Then
            StepVerifier.create(chatService.streamChatV2(request, testUserId))
                    .assertNext(event -> assertThat(event.event()).isEqualTo("meta"))
                    .assertNext(event -> assertThat(event.event()).isEqualTo("delta"))
                    .assertNext(event -> assertThat(event.event()).isEqualTo("done"))
                    .verifyComplete();
        }

        @Test
        @DisplayName("should use tool orchestrator when tools are enabled")
        void shouldUseToolOrchestratorWhenToolsEnabled() {
            // Given
            ChatStreamRequest request = ChatStreamRequest.builder()
                    .sessionId(testSessionId)
                    .message("What's the project status?")
                    .enableTools(true)
                    .build();

            ServerSentEvent<String> responseEvent = ServerSentEvent.<String>builder()
                    .event("done")
                    .data("{}")
                    .build();

            when(sessionRepository.findByIdAndActiveTrue(testSessionId))
                    .thenReturn(Mono.just(testSession));
            when(messageRepository.save(any(R2dbcChatMessage.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
            when(messageRepository.findRecentBySessionId(eq(testSessionId), anyInt()))
                    .thenReturn(Flux.empty());
            when(toolRegistry.hasTools()).thenReturn(true);
            when(toolRegistry.getAllDefinitions()).thenReturn(Collections.emptyList());
            when(streamingToolOrchestrator.streamWithTools(any(), any(), any()))
                    .thenReturn(Flux.just(responseEvent));

            // When & Then
            StepVerifier.create(chatService.streamChatV2(request, testUserId))
                    .assertNext(event -> assertThat(event.event()).isEqualTo("done"))
                    .verifyComplete();

            verify(streamingToolOrchestrator).streamWithTools(eq(llmGatewayService), any(), any());
        }

        @Test
        @DisplayName("should handle error and return error SSE event")
        void shouldHandleErrorAndReturnErrorSseEvent() {
            // Given
            ChatStreamRequest request = ChatStreamRequest.builder()
                    .sessionId(testSessionId)
                    .message("Hello")
                    .enableTools(false)
                    .build();

            ServerSentEvent<String> errorEvent = ServerSentEvent.<String>builder()
                    .event("error")
                    .data("{\"code\":\"STREAM_ERROR\",\"message\":\"Connection failed\"}")
                    .build();

            when(sessionRepository.findByIdAndActiveTrue(testSessionId))
                    .thenReturn(Mono.just(testSession));
            when(messageRepository.save(any(R2dbcChatMessage.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
            when(messageRepository.findRecentBySessionId(eq(testSessionId), anyInt()))
                    .thenReturn(Flux.empty());
            lenient().when(toolRegistry.hasTools()).thenReturn(false);
            when(llmGatewayService.streamChat(any()))
                    .thenReturn(Flux.error(new RuntimeException("Connection failed")));
            when(sseBuilder.error(anyString(), anyString(), anyString()))
                    .thenReturn(errorEvent);

            // When & Then
            StepVerifier.create(chatService.streamChatV2(request, testUserId))
                    .assertNext(event -> {
                        assertThat(event.event()).isEqualTo("error");
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should create new session when sessionId is null")
        void shouldCreateNewSessionWhenSessionIdIsNull() {
            // Given
            ChatStreamRequest request = ChatStreamRequest.builder()
                    .sessionId(null)
                    .message("Start new chat")
                    .enableTools(false)
                    .build();

            ServerSentEvent<String> doneEvent = ServerSentEvent.<String>builder()
                    .event("done")
                    .data("{}")
                    .build();

            when(sessionRepository.save(any(R2dbcChatSession.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
            when(messageRepository.save(any(R2dbcChatMessage.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
            when(messageRepository.findRecentBySessionId(anyString(), anyInt()))
                    .thenReturn(Flux.empty());
            lenient().when(toolRegistry.hasTools()).thenReturn(false);
            when(llmGatewayService.streamChat(any()))
                    .thenReturn(Flux.just(doneEvent));

            // When & Then
            StepVerifier.create(chatService.streamChatV2(request, testUserId))
                    .assertNext(event -> assertThat(event.event()).isEqualTo("done"))
                    .verifyComplete();

            verify(sessionRepository).save(any(R2dbcChatSession.class));
        }

        @Test
        @DisplayName("should throw ChatException for empty message in V2")
        void shouldThrowChatExceptionForEmptyMessageV2() {
            // Given
            ChatStreamRequest request = ChatStreamRequest.builder()
                    .sessionId(testSessionId)
                    .message("")
                    .enableTools(false)
                    .build();

            // When & Then - validation throws synchronously
            StepVerifier.create(Mono.fromCallable(() -> {
                        chatService.streamChatV2(request, testUserId);
                        return null;
                    }))
                    .expectErrorMatches(error ->
                            error instanceof ChatException &&
                            ((ChatException) error).getErrorCode().equals("CHAT_MESSAGE_EMPTY"))
                    .verify();
        }
    }

    @Nested
    @DisplayName("getHistory")
    class GetHistory {

        @Test
        @DisplayName("should return messages ordered by created time ascending")
        void shouldReturnMessagesOrderedByCreatedTimeAsc() {
            // Given
            R2dbcChatMessage msg1 = R2dbcChatMessage.builder()
                    .id("1")
                    .sessionId(testSessionId)
                    .role("USER")
                    .content("First")
                    .build();
            msg1.setCreatedAt(LocalDateTime.now().minusMinutes(10));

            R2dbcChatMessage msg2 = R2dbcChatMessage.builder()
                    .id("2")
                    .sessionId(testSessionId)
                    .role("ASSISTANT")
                    .content("Second")
                    .build();
            msg2.setCreatedAt(LocalDateTime.now().minusMinutes(5));

            when(messageRepository.findBySessionIdOrderByCreatedAtAsc(testSessionId))
                    .thenReturn(Flux.just(msg1, msg2));

            // When & Then
            StepVerifier.create(chatService.getHistory(testSessionId))
                    .assertNext(msg -> {
                        assertThat(msg.getContent()).isEqualTo("First");
                        assertThat(msg.getRole()).isEqualTo("USER");
                    })
                    .assertNext(msg -> {
                        assertThat(msg.getContent()).isEqualTo("Second");
                        assertThat(msg.getRole()).isEqualTo("ASSISTANT");
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should return empty flux for session with no messages")
        void shouldReturnEmptyFluxForSessionWithNoMessages() {
            // Given
            when(messageRepository.findBySessionIdOrderByCreatedAtAsc(testSessionId))
                    .thenReturn(Flux.empty());

            // When & Then
            StepVerifier.create(chatService.getHistory(testSessionId))
                    .verifyComplete();
        }

        @Test
        @DisplayName("should throw ChatException for null session ID")
        void shouldThrowChatExceptionForNullSessionId() {
            // When & Then
            StepVerifier.create(chatService.getHistory(null))
                    .expectErrorMatches(error ->
                            error instanceof ChatException &&
                            ((ChatException) error).getErrorCode().equals("CHAT_SESSION_NOT_FOUND"))
                    .verify();
        }

        @Test
        @DisplayName("should throw ChatException for empty session ID")
        void shouldThrowChatExceptionForEmptySessionId() {
            // When & Then
            StepVerifier.create(chatService.getHistory(""))
                    .expectErrorMatches(error ->
                            error instanceof ChatException &&
                            ((ChatException) error).getErrorCode().equals("CHAT_SESSION_NOT_FOUND"))
                    .verify();
        }
    }

    @Nested
    @DisplayName("deleteSession")
    class DeleteSession {

        @Test
        @DisplayName("should deactivate session and delete Redis cache for owner")
        void shouldDeactivateSessionAndDeleteRedisCacheForOwner() {
            // Given
            when(sessionRepository.findByIdAndActiveTrue(testSessionId))
                    .thenReturn(Mono.just(testSession));
            when(sessionRepository.deactivateSession(testSessionId))
                    .thenReturn(Mono.empty());
            when(reactiveRedisTemplate.delete("chat:session:" + testSessionId))
                    .thenReturn(Mono.just(1L));

            // When & Then
            StepVerifier.create(chatService.deleteSession(testSessionId, testUserId))
                    .verifyComplete();

            verify(sessionRepository).deactivateSession(testSessionId);
            verify(reactiveRedisTemplate).delete("chat:session:" + testSessionId);
        }

        @Test
        @DisplayName("should allow guest to delete any session")
        void shouldAllowGuestToDeleteAnySession() {
            // Given
            when(sessionRepository.findByIdAndActiveTrue(testSessionId))
                    .thenReturn(Mono.just(testSession));
            when(sessionRepository.deactivateSession(testSessionId))
                    .thenReturn(Mono.empty());
            when(reactiveRedisTemplate.delete("chat:session:" + testSessionId))
                    .thenReturn(Mono.just(1L));

            // When & Then
            StepVerifier.create(chatService.deleteSession(testSessionId, "guest"))
                    .verifyComplete();
        }

        @Test
        @DisplayName("should throw ChatException when non-owner tries to delete")
        void shouldThrowChatExceptionWhenNonOwnerTriesToDelete() {
            // Given
            String differentUserId = "different-user";
            when(sessionRepository.findByIdAndActiveTrue(testSessionId))
                    .thenReturn(Mono.just(testSession));

            // When & Then
            StepVerifier.create(chatService.deleteSession(testSessionId, differentUserId))
                    .expectErrorMatches(error ->
                            error instanceof ChatException &&
                            ((ChatException) error).getStatus() == HttpStatus.FORBIDDEN &&
                            error.getMessage().contains("Cannot delete another user's session"))
                    .verify();
        }

        @Test
        @DisplayName("should throw ChatException for non-existent session")
        void shouldThrowChatExceptionForNonExistentSession() {
            // Given
            String nonExistentSessionId = "non-existent";
            when(sessionRepository.findByIdAndActiveTrue(nonExistentSessionId))
                    .thenReturn(Mono.empty());

            // When & Then
            StepVerifier.create(chatService.deleteSession(nonExistentSessionId, testUserId))
                    .expectErrorMatches(error ->
                            error instanceof ChatException &&
                            ((ChatException) error).getStatus() == HttpStatus.NOT_FOUND)
                    .verify();
        }

        @Test
        @DisplayName("should throw ChatException for null session ID")
        void shouldThrowChatExceptionForNullSessionId() {
            // When & Then
            StepVerifier.create(chatService.deleteSession(null, testUserId))
                    .expectErrorMatches(error ->
                            error instanceof ChatException &&
                            ((ChatException) error).getErrorCode().equals("CHAT_SESSION_NOT_FOUND"))
                    .verify();
        }

        @Test
        @DisplayName("should complete even when Redis key does not exist")
        void shouldCompleteEvenWhenRedisKeyDoesNotExist() {
            // Given
            when(sessionRepository.findByIdAndActiveTrue(testSessionId))
                    .thenReturn(Mono.just(testSession));
            when(sessionRepository.deactivateSession(testSessionId))
                    .thenReturn(Mono.empty());
            when(reactiveRedisTemplate.delete("chat:session:" + testSessionId))
                    .thenReturn(Mono.just(0L));

            // When & Then
            StepVerifier.create(chatService.deleteSession(testSessionId, testUserId))
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("getUserSessions")
    class GetUserSessions {

        @Test
        @DisplayName("should return active sessions for user")
        void shouldReturnActiveSessionsForUser() {
            // Given
            R2dbcChatSession session1 = R2dbcChatSession.builder()
                    .id("session-1")
                    .userId(testUserId)
                    .title("Chat 1")
                    .active(true)
                    .build();

            R2dbcChatSession session2 = R2dbcChatSession.builder()
                    .id("session-2")
                    .userId(testUserId)
                    .title("Chat 2")
                    .active(true)
                    .build();

            when(sessionRepository.findByUserIdAndActiveTrue(testUserId))
                    .thenReturn(Flux.just(session1, session2));

            // When & Then
            StepVerifier.create(chatService.getUserSessions(testUserId))
                    .assertNext(session -> {
                        assertThat(session.getId()).isEqualTo("session-1");
                        assertThat(session.getTitle()).isEqualTo("Chat 1");
                    })
                    .assertNext(session -> {
                        assertThat(session.getId()).isEqualTo("session-2");
                        assertThat(session.getTitle()).isEqualTo("Chat 2");
                    })
                    .verifyComplete();
        }

        @Test
        @DisplayName("should return empty flux for user with no sessions")
        void shouldReturnEmptyFluxForUserWithNoSessions() {
            // Given
            String userWithNoSessions = "no-sessions-user";
            when(sessionRepository.findByUserIdAndActiveTrue(userWithNoSessions))
                    .thenReturn(Flux.empty());

            // When & Then
            StepVerifier.create(chatService.getUserSessions(userWithNoSessions))
                    .verifyComplete();
        }

        @Test
        @DisplayName("should return empty flux for null user ID")
        void shouldReturnEmptyFluxForNullUserId() {
            // When & Then
            StepVerifier.create(chatService.getUserSessions(null))
                    .verifyComplete();
        }

        @Test
        @DisplayName("should return empty flux for empty user ID")
        void shouldReturnEmptyFluxForEmptyUserId() {
            // When & Then
            StepVerifier.create(chatService.getUserSessions(""))
                    .verifyComplete();
        }
    }

    @Nested
    @DisplayName("Session Creation")
    class SessionCreation {

        @Test
        @DisplayName("should create session with default title 'New Chat'")
        void shouldCreateSessionWithDefaultTitle() {
            // Given
            ChatRequest request = new ChatRequest();
            request.setSessionId(null);
            request.setMessage("Hello");

            ChatResponse response = ChatResponse.builder()
                    .reply("Hi!")
                    .confidence(0.9)
                    .build();

            ArgumentCaptor<R2dbcChatSession> sessionCaptor = ArgumentCaptor.forClass(R2dbcChatSession.class);

            when(sessionRepository.save(sessionCaptor.capture()))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
            when(messageRepository.save(any(R2dbcChatMessage.class)))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
            when(messageRepository.findRecentBySessionId(anyString(), anyInt()))
                    .thenReturn(Flux.empty());
            when(reactiveAIChatClient.chat(any(AIChatContext.class)))
                    .thenReturn(Mono.just(response));
            when(listOperations.rightPush(anyString(), any()))
                    .thenReturn(Mono.just(1L));
            when(reactiveRedisTemplate.expire(anyString(), any()))
                    .thenReturn(Mono.just(true));

            // When
            StepVerifier.create(chatService.sendMessage(request, testUserId))
                    .assertNext(r -> assertThat(r).isNotNull())
                    .verifyComplete();

            // Then
            R2dbcChatSession createdSession = sessionCaptor.getValue();
            assertThat(createdSession.getTitle()).isEqualTo("New Chat");
            assertThat(createdSession.getUserId()).isEqualTo(testUserId);
            assertThat(createdSession.getActive()).isTrue();
            assertThat(createdSession.getId()).isNotNull();
            assertThat(createdSession.getCreatedAt()).isNotNull();
        }
    }

    @Nested
    @DisplayName("Message Persistence")
    class MessagePersistence {

        @Test
        @DisplayName("should set correct role for user message")
        void shouldSetCorrectRoleForUserMessage() {
            // Given
            ChatRequest request = new ChatRequest();
            request.setSessionId(testSessionId);
            request.setMessage("User input");

            ChatResponse response = ChatResponse.builder()
                    .reply("Response")
                    .confidence(0.9)
                    .build();

            ArgumentCaptor<R2dbcChatMessage> messageCaptor = ArgumentCaptor.forClass(R2dbcChatMessage.class);

            when(sessionRepository.findByIdAndActiveTrue(testSessionId))
                    .thenReturn(Mono.just(testSession));
            when(messageRepository.save(messageCaptor.capture()))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
            when(messageRepository.findRecentBySessionId(eq(testSessionId), anyInt()))
                    .thenReturn(Flux.empty());
            when(reactiveAIChatClient.chat(any(AIChatContext.class)))
                    .thenReturn(Mono.just(response));
            when(listOperations.rightPush(anyString(), any()))
                    .thenReturn(Mono.just(1L));
            when(reactiveRedisTemplate.expire(anyString(), any()))
                    .thenReturn(Mono.just(true));

            // When
            StepVerifier.create(chatService.sendMessage(request, testUserId))
                    .assertNext(r -> assertThat(r).isNotNull())
                    .verifyComplete();

            // Then
            List<R2dbcChatMessage> savedMessages = messageCaptor.getAllValues();

            R2dbcChatMessage userMessage = savedMessages.stream()
                    .filter(m -> m.getRole().equals("USER"))
                    .findFirst()
                    .orElseThrow();

            assertThat(userMessage.getContent()).isEqualTo("User input");
            assertThat(userMessage.getSessionId()).isEqualTo(testSessionId);
            assertThat(userMessage.getId()).isNotNull();
            assertThat(userMessage.getCreatedAt()).isNotNull();
        }

        @Test
        @DisplayName("should set correct role for assistant message")
        void shouldSetCorrectRoleForAssistantMessage() {
            // Given
            ChatRequest request = new ChatRequest();
            request.setSessionId(testSessionId);
            request.setMessage("User input");

            ChatResponse response = ChatResponse.builder()
                    .reply("Assistant response")
                    .confidence(0.9)
                    .build();

            ArgumentCaptor<R2dbcChatMessage> messageCaptor = ArgumentCaptor.forClass(R2dbcChatMessage.class);

            when(sessionRepository.findByIdAndActiveTrue(testSessionId))
                    .thenReturn(Mono.just(testSession));
            when(messageRepository.save(messageCaptor.capture()))
                    .thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
            when(messageRepository.findRecentBySessionId(eq(testSessionId), anyInt()))
                    .thenReturn(Flux.empty());
            when(reactiveAIChatClient.chat(any(AIChatContext.class)))
                    .thenReturn(Mono.just(response));
            when(listOperations.rightPush(anyString(), any()))
                    .thenReturn(Mono.just(1L));
            when(reactiveRedisTemplate.expire(anyString(), any()))
                    .thenReturn(Mono.just(true));

            // When
            StepVerifier.create(chatService.sendMessage(request, testUserId))
                    .assertNext(r -> assertThat(r).isNotNull())
                    .verifyComplete();

            // Then
            List<R2dbcChatMessage> savedMessages = messageCaptor.getAllValues();

            R2dbcChatMessage assistantMessage = savedMessages.stream()
                    .filter(m -> m.getRole().equals("ASSISTANT"))
                    .findFirst()
                    .orElseThrow();

            assertThat(assistantMessage.getContent()).isEqualTo("Assistant response");
            assertThat(assistantMessage.getSessionId()).isEqualTo(testSessionId);
        }
    }
}
