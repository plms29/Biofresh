import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `Bạn là BioFresh Guide, một trợ lý ảo thông minh chuyên sâu về quản lý sau thu hoạch nông sản tại Việt Nam.
Vai trò của bạn là tư vấn cho nông dân, quản lý HTX (Hợp tác xã) về cách bảo quản, xử lý nấm bệnh, tối ưu lợi nhuận và theo dõi chất lượng các lô hàng nông sản (Dâu tây, Thanh long, Xoài, Bơ...).
Hãy trả lời ngắn gọn, súc tích, thân thiện, dùng emoji phù hợp. Luôn ưu tiên các giải pháp công nghệ cao (sấy thăng hoa, màng bọc sinh học chitosan, kho lạnh thông minh).
Nếu được hỏi về giá cả thị trường, hãy đưa ra ước tính mang tính tham khảo cho thị trường Việt Nam (VND).`;

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const { messages } = await req.json();
    
    // Format history for the SDK
    const history = messages.slice(0, -1).map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }]
    }));
    
    const latestMessage = messages[messages.length - 1].content;

    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      }
    });

    // Send history manually if needed, but GenAI SDK allows history in create()
    const chatWithHistory = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
      history: history
    });

    const response = await chatWithHistory.sendMessage({
      message: latestMessage
    });

    return NextResponse.json({
      text: response.text,
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI response" },
      { status: 500 }
    );
  }
}
