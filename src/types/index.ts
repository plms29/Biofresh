// ============================================================
// BioFresh OS — Type Definitions
// ============================================================

export type FruitType =
  | "strawberry"
  | "dragon_fruit"
  | "mango"
  | "avocado"
  | "lychee"
  | "passion_fruit"
  | "durian"
  | "rambutan";

export type QualityGrade = "A" | "B" | "C" | "D";

export type BatchStatus =
  | "harvested"
  | "processing"
  | "cold_storage"
  | "ready_to_sell"
  | "sold"
  | "spoiled";

export type TreatmentType =
  | "chitosan_spray"
  | "cold_storage"
  | "bio_coating"
  | "freeze_drying"
  | "packaging"
  | "quality_check"
  | "transport";

export interface Treatment {
  id: string;
  type: TreatmentType;
  label: string;
  description: string;
  timestamp: string;
  temperature?: number;
  humidity?: number;
  notes?: string;
}

export interface QualityMetrics {
  freshness: number; // 0-100
  color: number; // 0-100
  firmness: number; // 0-100
  aroma: number; // 0-100
  overallScore: number; // 0-100
  botrytisDetected: boolean;
  defectCount: number;
}

export interface Batch {
  id: string;
  fruitType: FruitType;
  fruitLabel: string;
  variety: string;
  weightKg: number;
  harvestDate: string;
  location: string;
  farmName: string;
  grade: QualityGrade;
  status: BatchStatus;
  seedType: string;
  ripeness: number; // 0-100
  harvestWeather: string;
  treatments: Treatment[];
  qualityMetrics: QualityMetrics;
  estimatedValue: number; // VND
  imageUrl?: string;
}

export type RiskLevel = "low" | "medium" | "high";
export type ProfitLevel = "low" | "medium" | "high" | "very_high";

export interface AIScenario {
  id: string;
  title: string;
  description: string;
  profitLevel: ProfitLevel;
  profitLabel: string;
  riskLevel: RiskLevel;
  riskLabel: string;
  estimatedProfit: number;
  timeline: string;
  requirements: string[];
  isRecommended: boolean;
  mascotComment: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface DashboardMetrics {
  activeBatches: number;
  spoilageSaved: number; // kg
  spoilageSavedPercent: number;
  estimatedProfit: number; // VND
  harvestAlerts: number;
}

export interface QualityVisionResult {
  fruitCount: number;
  sizeDistribution: {
    small: number;
    medium: number;
    large: number;
  };
  qualityIssues: string[];
  overallGrade: QualityGrade;
  botrytisCount: number;
  confidence: number;
}

export interface FreshnessPassportData {
  batchId: string;
  batch: Batch;
  journeySteps: {
    label: string;
    description: string;
    date: string;
    icon: string;
    completed: boolean;
  }[];
  certifications: string[];
  qrCodeUrl: string;
}

// Fruit display metadata
export interface FruitMeta {
  emoji: string;
  label: string;
  color: string;
}

export const FRUIT_META: Record<FruitType, FruitMeta> = {
  strawberry: { emoji: "🍓", label: "Dâu tây", color: "text-red-500" },
  dragon_fruit: { emoji: "🐉", label: "Thanh long", color: "text-pink-500" },
  mango: { emoji: "🥭", label: "Xoài", color: "text-amber-500" },
  avocado: { emoji: "🥑", label: "Bơ", color: "text-green-700" },
  lychee: { emoji: "🔴", label: "Vải thiều", color: "text-rose-500" },
  passion_fruit: { emoji: "💜", label: "Chanh dây", color: "text-purple-500" },
  durian: { emoji: "🍈", label: "Sầu riêng", color: "text-yellow-600" },
  rambutan: { emoji: "🔴", label: "Chôm chôm", color: "text-red-600" },
};
