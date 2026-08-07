import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `You are BioFresh Guide, an intelligent post-harvest management assistant specialized in agricultural produce.
Your role is to consult farmers and cooperative managers on preservation techniques, pathogen treatments (e.g., Botrytis cinerea), profit optimization, and quality tracking for various batches (Strawberries, Dragon Fruit, Mangoes, etc.).
Answer concisely, professionally, and use appropriate scientific terms while remaining accessible. Always prioritize high-tech solutions (freeze-drying, chitosan bio-coatings, smart cold storage).
Provide market price estimates in USD or local context if requested.`;

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
