import { create } from 'zustand';
import type { AiChatContextInjection } from '../types/aiBriefing';

interface AiChatBridgeState {
  pending: AiChatContextInjection | null;
  inject: (context: AiChatContextInjection) => void;
  consume: () => AiChatContextInjection | null;
  clear: () => void;
}

export const useAiChatBridgeStore = create<AiChatBridgeState>((set, get) => ({
  pending: null,
  inject: (context) => set({ pending: context }),
  consume: () => {
    const ctx = get().pending;
    set({ pending: null });
    return ctx;
  },
  clear: () => set({ pending: null }),
}));
