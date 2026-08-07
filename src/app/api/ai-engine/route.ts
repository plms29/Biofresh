import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `You are the BioFresh Decision Engine - a Post-Harvest Data Analysis AI.
Your task is to receive data for an agricultural produce batch and provide 3 scenarios to optimize profits and minimize risks for farmers/cooperatives.
You must return STRICTLY FORMATTED JSON, WITHOUT ANY ADDITIONAL TEXT OUTSIDE THE JSON.`;

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
    
    const prompt = `Analyze the following batch and return 3 scenarios (AIScenario) in JSON.
Batch Data:
${JSON.stringify(batchData, null, 2)}

JSON Format Requirement (must be an array containing 3 objects):
[
  {
    "id": "scenario_1",
    "title": "Scenario Name (short)",
    "description": "Detailed description",
    "profitLevel": "low" | "medium" | "high" | "very_high",
    "profitLabel": "Display label (e.g., High Profit)",
    "riskLevel": "low" | "medium" | "high",
    "riskLabel": "Risk label (e.g., Low Risk)",
    "estimatedProfit": 15000000,
    "timeline": "Timeframe (e.g., 2-3 days)",
    "requirements": ["Requirement 1", "Requirement 2"],
    "isRecommended": true/false (only 1 scenario can be true),
    "mascotComment": "Advice from BioFresh Guide in professional English, use emojis"
  }
]
RETURN ONLY JSON, NO MARKDOWN OR BACKTICKS.`;

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
