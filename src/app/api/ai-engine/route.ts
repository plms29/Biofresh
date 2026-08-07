import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `Bạn là BioFresh Decision Engine - AI Phân tích dữ liệu nông sản sau thu hoạch.
Nhiệm vụ của bạn là nhận dữ liệu của một lô hàng nông sản, sau đó đưa ra 3 phương án xử lý (scenario) để tối ưu hoá lợi nhuận và giảm thiểu rủi ro cho người nông dân/HTX.
Hãy trả về ĐÚNG ĐỊNH DẠNG JSON THEO YÊU CẦU, KHÔNG THÊM BẤT KỲ TEXT NÀO KHÁC BÊN NGOÀI JSON.`;

// Define the expected output schema structure directly in the prompt for simplicity,
// or use structured outputs if supported by the SDK configuration.

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const { batchData } = await req.json();
    
    const prompt = `Phân tích lô hàng sau và trả về 3 phương án (AIScenario) bằng JSON.
Dữ liệu lô hàng:
${JSON.stringify(batchData, null, 2)}

Yêu cầu định dạng JSON (là một array chứa 3 object):
[
  {
    "id": "scenario_1",
    "title": "Tên phương án (ngắn gọn)",
    "description": "Mô tả chi tiết",
    "profitLevel": "low" | "medium" | "high" | "very_high",
    "profitLabel": "Nhãn hiển thị (VD: Lợi nhuận cao)",
    "riskLevel": "low" | "medium" | "high",
    "riskLabel": "Nhãn rủi ro (VD: Rủi ro thấp)",
    "estimatedProfit": 15000000,
    "timeline": "Thời gian hoàn thành (VD: 2-3 ngày)",
    "requirements": ["Yêu cầu 1", "Yêu cầu 2"],
    "isRecommended": true/false (chỉ 1 phương án là true),
    "mascotComment": "Lời khuyên từ BioFresh Guide bằng tiếng Việt thân thiện, dùng emoji"
  }
]
CHỈ TRẢ VỀ JSON, KHÔNG CÓ MARKDOWN HOẶC BACKTICKS.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2,
        responseMimeType: "application/json"
      }
    });

    // Parse the JSON text returned by the model
    let scenarios = [];
    try {
      const text = response.text || "[]";
      // Clean up markdown code blocks if the model ignores the instruction
      const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      scenarios = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, "Raw Response:", response.text);
      throw new Error("Failed to parse AI response as JSON");
    }

    return NextResponse.json({ scenarios });
  } catch (error) {
    console.error("AI Engine API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI scenarios" },
      { status: 500 }
    );
  }
}
