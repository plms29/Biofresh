// ============================================================
// BioFresh OS — Mascot Store (Zustand)
// Controls the Decision Intelligence Assistant's state
// ============================================================

import { create } from "zustand";
import type { ChatMessage } from "@/types";

interface MascotState {
  isVisible: boolean;
  isChatOpen: boolean;
  isThinking: boolean;
  currentMessage: string;
  chatHistory: ChatMessage[];

  // Actions
  showMascot: () => void;
  hideMascot: () => void;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  setThinking: (thinking: boolean) => void;
  setCurrentMessage: (message: string) => void;
  addMessage: (message: ChatMessage) => void;
  sendMessage: (content: string) => void;
  clearChat: () => void;
}

const defaultResponses = [
  "Analyzing batch parameters... please wait a moment! 🌿",
  "I detected Botrytis cinerea risk based on recent humidity data. Recommend Chitosan coating treatment immediately. 🛡️",
  "Temperature in the cold storage is stable at 3°C — optimal for strawberry preservation! ❄️",
  "Would you like me to generate a Quality Assurance Passport for this batch? B2B partners require strict traceability! 📋",
  "Pro-tip: Harvesting strawberries in the early morning (5-7 AM) while dew remains ensures peak freshness! 🌅",
  "Red dragon fruit prices have surged 20% in the Japanese market. This is a great window for export! 🇯🇵",
];

export const useMascotStore = create<MascotState>((set, get) => ({
  isVisible: true,
  isChatOpen: false,
  isThinking: false,
  currentMessage: "",
  chatHistory: [],

  showMascot: () => set({ isVisible: true }),
  hideMascot: () => set({ isVisible: false }),
  openChat: () => set({ isChatOpen: true }),
  closeChat: () => set({ isChatOpen: false }),
  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
  setThinking: (thinking) => set({ isThinking: thinking }),
  setCurrentMessage: (message) => set({ currentMessage: message }),

  addMessage: (message) =>
    set((state) => ({
      chatHistory: [...state.chatHistory, message],
    })),

  sendMessage: async (content) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      chatHistory: [...state.chatHistory, userMsg],
      isThinking: true,
    }));

    try {
      const history = get().chatHistory;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) throw new Error("Chat API failed");

      const data = await res.json();
      
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: data.text || "Analyzing batch parameters... please wait a moment! 🌿",
        timestamp: new Date().toISOString(),
      };

      set((state) => ({
        chatHistory: [...state.chatHistory, assistantMsg],
        isThinking: false,
      }));
    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: "Oops! Cannot connect to the BioFresh Engine right now. 😢",
        timestamp: new Date().toISOString(),
      };
      set((state) => ({
        chatHistory: [...state.chatHistory, errorMsg],
        isThinking: false,
      }));
    }
  },

  clearChat: () => set({ chatHistory: [] }),
}));
