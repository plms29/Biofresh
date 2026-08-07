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
  "Mình sẽ phân tích dữ liệu lô hàng cho bạn ngay! Hãy chờ chút nha~ 🌿",
  "Dựa trên dữ liệu thị trường hiện tại, mình khuyên bạn nên ưu tiên chế biến sản phẩm giá trị gia tăng nhé!",
  "Nhiệt độ kho lạnh đang ổn định ở 3°C — rất tốt cho bảo quản dâu tây! ❄️",
  "Bạn có muốn mình tạo Freshness Passport cho lô hàng này không? Siêu thị rất thích sản phẩm có truy xuất nguồn gốc! 📋",
  "Mẹo nhỏ: Thu hoạch dâu tây vào sáng sớm (5-7h) khi sương chưa tan sẽ giữ được độ tươi tốt nhất! 🌅",
  "Giá thanh long ruột đỏ đang tăng 20% tại thị trường Nhật. Đây là cơ hội tốt để xuất khẩu nha! 🇯🇵",
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
        content: data.text || "Xin lỗi, mình đang gặp chút sự cố kết nối. 🌿",
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
        content: "Oops! Không thể kết nối với BioFresh Engine lúc này (Hãy kiểm tra GEMINI_API_KEY). 😢",
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
