import { useMutation } from '@tanstack/react-query';
import { apiService } from '../../services/api';

export const chatKeys = {
  all: ['chat'] as const,
  sessions: () => [...chatKeys.all, 'sessions'] as const,
  session: (sessionId: string) => [...chatKeys.sessions(), sessionId] as const,
};

interface ChatMessageRequest {
  message: string;
  sessionId: string | null;
  projectId?: string;
  userRole?: string;
  userAccessLevel?: number;
}

interface ChatMessageResponse {
  reply?: string;
  sessionId?: string;
  sources?: Array<{ title: string; content: string }>;
}

export function useSendChatMessage() {
  return useMutation<ChatMessageResponse, Error, ChatMessageRequest>({
    mutationFn: (data) => apiService.sendChatMessage(data),
  });
}
