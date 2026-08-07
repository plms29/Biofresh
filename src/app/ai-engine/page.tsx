"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useBatchStore } from "@/store/batch-store";
import { getAIScenariosForBatch } from "@/lib/mock-data";
import {
  formatVND,
  getGradeColor,
  getProfitColor,
  getRiskColor,
} from "@/lib/utils";
import { FRUIT_META } from "@/types";
import type { AIScenario } from "@/types";
import {
  Brain,
  Sparkles,
  Star,
  Clock,
  CheckCircle2,
  ChevronDown,
  TrendingUp,
  ShieldAlert,
  ListChecks,
  ArrowRight,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const analysisSteps = [
  { label: "Đánh giá chất lượng lô hàng", icon: "🔍", duration: 1200 },
  { label: "Phân tích giá thị trường hiện tại", icon: "📊", duration: 1000 },
  { label: "Tính toán chi phí logistics", icon: "🚛", duration: 800 },
  { label: "So sánh các phương án xử lý", icon: "⚖️", duration: 1000 },
  { label: "Tối ưu hóa lợi nhuận", icon: "💰", duration: 600 },
];

function AIEngineContent() {
  const searchParams = useSearchParams();
  const { batches } = useBatchStore();
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [scenarios, setScenarios] = useState<AIScenario[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  useEffect(() => {
    const batchParam = searchParams.get("batch");
    if (batchParam) {
      setSelectedBatchId(batchParam);
    }
  }, [searchParams]);

  const selectedBatch = batches.find((b) => b.id === selectedBatchId);

  const startAnalysis = useCallback(async () => {
    if (!selectedBatchId || !selectedBatch) return;

    setIsAnalyzing(true);
    setShowResults(false);
    setCurrentStep(0);
    setSelectedScenario(null);

    // Start API call in background
    const apiPromise = fetch("/api/ai-engine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchData: selectedBatch }),
    })
      .then((res) => res.json())
      .catch((err) => ({ error: err.message }));

    // Run animation steps
    for (let i = 0; i < analysisSteps.length; i++) {
      setCurrentStep(i);
      await new Promise((resolve) => setTimeout(resolve, analysisSteps[i].duration));
    }

    // Wait for API to finish if it hasn't already
    const data = await apiPromise;
    
    if (data.scenarios && data.scenarios.length > 0) {
      setScenarios(data.scenarios);
    } else {
      // Fallback to mock data if API fails (e.g. missing API key)
      console.warn("AI API failed or returned empty, falling back to mock data:", data.error);
      setScenarios(getAIScenariosForBatch(selectedBatchId));
    }
    
    setIsAnalyzing(false);
    setShowResults(true);
  }, [selectedBatchId, selectedBatch]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 max-w-5xl mx-auto"
    >
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl biofresh-gradient flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">
              Decision Intelligence Engine
            </h1>
            <p className="text-sm text-muted-foreground">
              Phân tích AI — Tối ưu hóa quyết định sau thu hoạch
            </p>
          </div>
        </div>
      </motion.div>

      {/* Step 1: Select Batch */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-biofresh-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-biofresh-500 text-white text-xs flex items-center justify-center">
                1
              </span>
              Chọn lô hàng để phân tích
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {batches
                .filter((b) => b.status !== "sold")
                .map((batch) => {
                  const fruit = FRUIT_META[batch.fruitType];
                  const isSelected = selectedBatchId === batch.id;
                  return (
                    <button
                      key={batch.id}
                      onClick={() => {
                        setSelectedBatchId(batch.id);
                        setShowResults(false);
                        setScenarios([]);
                      }}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? "border-biofresh-500 bg-biofresh-50 shadow-md shadow-biofresh-500/10"
                          : "border-border hover:border-biofresh-300 hover:bg-biofresh-50/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{fruit.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate">
                            {batch.fruitLabel}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {batch.id}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs font-bold">
                              {batch.weightKg}kg
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] ${getGradeColor(
                                batch.grade
                              )}`}
                            >
                              Grade {batch.grade}
                            </Badge>
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-biofresh-500 shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>

            {/* Analyze button */}
            {selectedBatch && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex justify-center"
              >
                <Button
                  onClick={startAnalysis}
                  disabled={isAnalyzing}
                  size="lg"
                  className="gap-2 bg-biofresh-500 hover:bg-biofresh-600 rounded-xl px-8 h-12"
                >
                  <Zap className="w-5 h-5" />
                  Phân tích bằng AI
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Step 2: Processing Animation */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="border-biofresh-200 overflow-hidden">
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center">
                  {/* Mascot thinking */}
                  <motion.div
                    animate={{ rotate: [0, -5, 5, -5, 0] }}
                    transition={{
                      repeat: Infinity,
                      duration: 2,
                      ease: "easeInOut",
                    }}
                    className="mb-6"
                  >
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-biofresh-100 flex items-center justify-center pulse-glow">
                        <Image
                          src="/mascot.png"
                          alt="Thinking..."
                          width={64}
                          height={64}
                          className="drop-shadow-lg"
                        />
                      </div>
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-biofresh-500 flex items-center justify-center"
                      >
                        <Brain className="w-4 h-4 text-white" />
                      </motion.div>
                    </div>
                  </motion.div>

                  <h3 className="text-lg font-bold mb-1">
                    Đang phân tích...
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    BioFresh Guide đang đánh giá phương án tối ưu cho lô hàng
                    của bạn
                  </p>

                  {/* Progress steps */}
                  <div className="w-full max-w-md space-y-3">
                    {analysisSteps.map((step, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0.3 }}
                        animate={{
                          opacity: i <= currentStep ? 1 : 0.3,
                        }}
                        className="flex items-center gap-3"
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${
                            i < currentStep
                              ? "bg-biofresh-100"
                              : i === currentStep
                              ? "bg-biofresh-500 text-white shimmer"
                              : "bg-gray-100"
                          }`}
                        >
                          {i < currentStep ? (
                            <CheckCircle2 className="w-4 h-4 text-biofresh-600" />
                          ) : (
                            step.icon
                          )}
                        </div>
                        <span
                          className={`text-sm ${
                            i <= currentStep
                              ? "text-foreground font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {step.label}
                        </span>
                        {i === currentStep && (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              repeat: Infinity,
                              duration: 1,
                              ease: "linear",
                            }}
                            className="ml-auto"
                          >
                            <Sparkles className="w-4 h-4 text-biofresh-500" />
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 3: Results */}
      <AnimatePresence>
        {showResults && scenarios.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-biofresh-500 text-white text-xs flex items-center justify-center">
                2
              </span>
              <h2 className="text-sm font-semibold">
                Phương án đề xuất ({scenarios.length} lựa chọn)
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {scenarios.map((scenario, index) => (
                <motion.div
                  key={scenario.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.15 }}
                >
                  <Card
                    className={`h-full relative overflow-hidden transition-all cursor-pointer ${
                      scenario.isRecommended
                        ? "border-biofresh-400 shadow-lg shadow-biofresh-500/10 ring-1 ring-biofresh-400"
                        : selectedScenario === scenario.id
                        ? "border-biofresh-300 shadow-md"
                        : "border-border hover:border-biofresh-200"
                    }`}
                    onClick={() => setSelectedScenario(scenario.id)}
                  >
                    {/* Recommended badge */}
                    {scenario.isRecommended && (
                      <div className="absolute top-0 right-0">
                        <div className="biofresh-gradient text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-300 text-yellow-300" />
                          ĐỀ XUẤT
                        </div>
                      </div>
                    )}

                    <CardContent className="p-5 space-y-4">
                      {/* Title */}
                      <div>
                        <h3 className="text-sm font-bold pr-16">
                          {scenario.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {scenario.description}
                        </p>
                      </div>

                      <Separator />

                      {/* Metrics */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <TrendingUp className="w-3.5 h-3.5" />
                            Lợi nhuận
                          </div>
                          <Badge
                            className={`text-[10px] ${getProfitColor(
                              scenario.profitLevel
                            )} border-0`}
                          >
                            {scenario.profitLabel}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Rủi ro
                          </div>
                          <Badge
                            className={`text-[10px] ${getRiskColor(
                              scenario.riskLevel
                            )} border-0`}
                          >
                            {scenario.riskLabel}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            Thời gian
                          </div>
                          <span className="text-xs font-medium">
                            {scenario.timeline}
                          </span>
                        </div>

                        <div className="p-2.5 bg-biofresh-50 rounded-lg">
                          <p className="text-[10px] text-muted-foreground mb-0.5">
                            Lợi nhuận ước tính
                          </p>
                          <p className="text-lg font-bold text-biofresh-700">
                            {formatVND(scenario.estimatedProfit)}
                          </p>
                        </div>
                      </div>

                      {/* Requirements */}
                      <div>
                        <div className="flex items-center gap-1 mb-2">
                          <ListChecks className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Yêu cầu
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {scenario.requirements.map((req, i) => (
                            <li
                              key={i}
                              className="text-[11px] text-muted-foreground flex items-start gap-1.5"
                            >
                              <span className="text-biofresh-400 mt-0.5">
                                •
                              </span>
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Action */}
                      <Button
                        className={`w-full rounded-xl text-xs h-10 ${
                          scenario.isRecommended
                            ? "bg-biofresh-500 hover:bg-biofresh-600"
                            : "bg-foreground/90 hover:bg-foreground"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedScenario(scenario.id);
                        }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        Chọn phương án này
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Mascot Commentary */}
            {selectedScenario && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="biofresh-gradient-light border-biofresh-200">
                  <CardContent className="p-5 flex items-start gap-4">
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{
                        repeat: Infinity,
                        duration: 3,
                        ease: "easeInOut",
                      }}
                    >
                      <Image
                        src="/mascot.png"
                        alt="BioFresh Guide"
                        width={56}
                        height={56}
                        className="drop-shadow-md"
                      />
                    </motion.div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-biofresh-600" />
                        <span className="text-xs font-semibold text-biofresh-700">
                          BioFresh Guide nói:
                        </span>
                      </div>
                      <p className="text-sm text-biofresh-800 leading-relaxed">
                        {
                          scenarios.find((s) => s.id === selectedScenario)
                            ?.mascotComment
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function AIEnginePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Đang tải...</div>}>
      <AIEngineContent />
    </Suspense>
  );
}
