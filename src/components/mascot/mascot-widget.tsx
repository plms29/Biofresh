"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMascotStore } from "@/store/mascot-store";
import Image from "next/image";
import { X, Send, Sparkles, MessageCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

export function MascotWidget() {
  const {
    isVisible,
    isChatOpen,
    isThinking,
    chatHistory,
    toggleChat,
    closeChat,
    sendMessage,
  } = useMascotStore();
  const [inputValue, setInputValue] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isThinking]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue.trim());
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat Panel */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-[360px] max-h-[480px] bg-white rounded-2xl shadow-2xl shadow-biofresh-500/10 border border-biofresh-200/50 flex flex-col overflow-hidden"
          >
            {/* Chat Header */}
            <div className="biofresh-gradient px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Image
                  src="/mascot.png"
                  alt="BioFresh Guide"
                  width={28}
                  height={28}
                  className="rounded-full bg-white/20 p-0.5"
                />
                <div>
                  <h3 className="text-white text-sm font-semibold">
                    BioFresh Guide
                  </h3>
                  <p className="text-white/70 text-[10px]">
                    Decision Intelligence Assistant
                  </p>
                </div>
              </div>
              <button
                onClick={closeChat}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[320px]">
              {/* Welcome message */}
              {chatHistory.length === 0 && (
                <div className="flex gap-2">
                  <Image
                    src="/mascot.png"
                    alt="Guide"
                    width={24}
                    height={24}
                    className="shrink-0 mt-1"
                  />
                  <div className="bg-biofresh-50 rounded-2xl rounded-tl-sm px-3 py-2.5 text-sm text-biofresh-900">
                    <p className="font-medium mb-1">Xin chào! 🌿</p>
                    <p className="text-xs text-biofresh-700 leading-relaxed">
                      Mình là BioFresh Guide — trợ lý AI chuyên phân tích sau
                      thu hoạch. Hỏi mình bất cứ điều gì về lô hàng, giá thị
                      trường, hay cách bảo quản tốt nhất nhé!
                    </p>
                  </div>
                </div>
              )}

              {chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${
                    msg.role === "user" ? "justify-end" : ""
                  }`}
                >
                  {msg.role === "assistant" && (
                    <Image
                      src="/mascot.png"
                      alt="Guide"
                      width={24}
                      height={24}
                      className="shrink-0 mt-1"
                    />
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-biofresh-500 text-white rounded-tr-sm"
                        : "bg-biofresh-50 text-biofresh-900 rounded-tl-sm"
                    }`}
                  >
                    <p className="leading-relaxed text-xs">{msg.content}</p>
                  </div>
                </div>
              ))}

              {/* Thinking indicator */}
              {isThinking && (
                <div className="flex gap-2">
                  <Image
                    src="/mascot.png"
                    alt="Guide"
                    width={24}
                    height={24}
                    className="shrink-0 mt-1 animate-pulse"
                  />
                  <div className="bg-biofresh-50 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1">
                      <motion.span
                        className="w-2 h-2 bg-biofresh-400 rounded-full"
                        animate={{ y: [0, -6, 0] }}
                        transition={{
                          repeat: Infinity,
                          duration: 0.6,
                          delay: 0,
                        }}
                      />
                      <motion.span
                        className="w-2 h-2 bg-biofresh-400 rounded-full"
                        animate={{ y: [0, -6, 0] }}
                        transition={{
                          repeat: Infinity,
                          duration: 0.6,
                          delay: 0.15,
                        }}
                      />
                      <motion.span
                        className="w-2 h-2 bg-biofresh-400 rounded-full"
                        animate={{ y: [0, -6, 0] }}
                        transition={{
                          repeat: Infinity,
                          duration: 0.6,
                          delay: 0.3,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Quick suggestions */}
            {chatHistory.length === 0 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {[
                  "Nên bán lô dâu tây ở đâu?",
                  "Cách bảo quản thanh long?",
                  "Giá thị trường hôm nay",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-biofresh-50 text-biofresh-700 hover:bg-biofresh-100 border border-biofresh-200/50 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="border-t border-biofresh-100 p-3 flex gap-2 shrink-0">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hỏi BioFresh Guide..."
                className="flex-1 text-sm px-3 py-2 rounded-xl bg-biofresh-50/50 border border-biofresh-200/50 focus:outline-none focus:ring-2 focus:ring-biofresh-400/30 focus:border-biofresh-400 placeholder:text-biofresh-400"
              />
              <Button
                onClick={handleSend}
                size="icon"
                className="shrink-0 h-9 w-9 rounded-xl bg-biofresh-500 hover:bg-biofresh-600"
                disabled={!inputValue.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mascot Button */}
      <motion.button
        onClick={toggleChat}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative group"
      >
        <motion.div
          animate={{
            y: [0, -6, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 3,
            ease: "easeInOut",
          }}
          className="relative"
        >
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-full pulse-glow" />

          {/* Mascot image */}
          <div className="w-16 h-16 rounded-full bg-white shadow-lg shadow-biofresh-500/20 border-2 border-biofresh-300 flex items-center justify-center overflow-hidden p-1 relative z-10">
            <Image
              src="/mascot.png"
              alt="BioFresh Guide"
              width={52}
              height={52}
              className="object-contain"
            />
          </div>

          {/* Status dot */}
          <div className="absolute bottom-0 right-0 w-4 h-4 bg-biofresh-400 rounded-full border-2 border-white z-20 flex items-center justify-center">
            {isChatOpen ? (
              <MessageCircle className="w-2.5 h-2.5 text-white" />
            ) : (
              <Sparkles className="w-2.5 h-2.5 text-white" />
            )}
          </div>
        </motion.div>

        {/* Tooltip */}
        {!isChatOpen && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap bg-biofresh-800 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          >
            Hỏi BioFresh Guide 💬
          </motion.div>
        )}
      </motion.button>
    </div>
  );
}
