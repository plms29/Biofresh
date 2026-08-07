"use client";

import { motion } from "framer-motion";
import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useBatchStore } from "@/store/batch-store";
import {
  formatVND,
  formatDate,
  getGradeColor,
  getStatusColor,
  getStatusLabel,
} from "@/lib/utils";
import { FRUIT_META } from "@/types";
import type { TreatmentType } from "@/types";
import {
  ArrowLeft,
  Brain,
  FileCheck,
  MapPin,
  Thermometer,
  Droplets,
  Cloud,
  Sprout,
  ShieldCheck,
  Snowflake,
  FlaskConical,
  PackageCheck,
  Truck,
  Search,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

const treatmentIcons: Record<TreatmentType, React.ComponentType<{ className?: string }>> = {
  quality_check: Search,
  chitosan_spray: FlaskConical,
  cold_storage: Snowflake,
  bio_coating: ShieldCheck,
  freeze_drying: Snowflake,
  packaging: PackageCheck,
  transport: Truck,
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { getBatchById } = useBatchStore();
  const batch = getBatchById(id);

  if (!batch) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <p className="text-lg text-muted-foreground">
          Không tìm thấy lô hàng
        </p>
        <Button asChild variant="outline">
          <Link href="/batches">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại danh sách
          </Link>
        </Button>
      </div>
    );
  }

  const fruit = FRUIT_META[batch.fruitType];
  const qualityItems = [
    { label: "Độ tươi", value: batch.qualityMetrics.freshness, color: "bg-emerald-500" },
    { label: "Màu sắc", value: batch.qualityMetrics.color, color: "bg-blue-500" },
    { label: "Độ cứng", value: batch.qualityMetrics.firmness, color: "bg-amber-500" },
    { label: "Hương thơm", value: batch.qualityMetrics.aroma, color: "bg-purple-500" },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-5xl mx-auto"
    >
      {/* Back button + Header */}
      <motion.div variants={item} className="flex flex-col gap-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="w-fit text-xs text-muted-foreground hover:text-biofresh-700 -ml-2"
        >
          <Link href="/batches">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Quay lại danh sách
          </Link>
        </Button>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-biofresh-100 flex items-center justify-center text-3xl">
              {fruit.emoji}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{batch.fruitLabel}</h1>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${getGradeColor(batch.grade)}`}
                >
                  Grade {batch.grade}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${getStatusColor(batch.status)}`}
                >
                  {getStatusLabel(batch.status)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                <span className="font-mono text-biofresh-600 font-semibold">
                  {batch.id}
                </span>{" "}
                · {batch.variety}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl border-biofresh-200 text-biofresh-700 hover:bg-biofresh-50"
            >
              <Link href={`/passport?batch=${batch.id}`}>
                <FileCheck className="w-3.5 h-3.5" />
                Freshness Passport
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="gap-1.5 rounded-xl bg-biofresh-500 hover:bg-biofresh-600"
            >
              <Link href={`/ai-engine?batch=${batch.id}`}>
                <Brain className="w-3.5 h-3.5" />
                Phân tích AI
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Info Grid */}
      <motion.div
        variants={item}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <Card className="border-biofresh-100">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-biofresh-100 flex items-center justify-center shrink-0">
              <Sprout className="w-4 h-4 text-biofresh-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">Giống</p>
              <p className="text-xs font-medium truncate">{batch.seedType}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-biofresh-100">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <Thermometer className="w-4 h-4 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">Độ chín</p>
              <p className="text-xs font-medium">{batch.ripeness}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-biofresh-100">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-100 flex items-center justify-center shrink-0">
              <Cloud className="w-4 h-4 text-sky-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">
                Harvest Weather
              </p>
              <p className="text-xs font-medium truncate">
                {batch.harvestWeather}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-biofresh-100">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-rose-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">Location</p>
              <p className="text-xs font-medium truncate">{batch.location}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {batch.farmName}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Quality Metrics */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="border-biofresh-100 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-biofresh-500" />
                Quality Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Overall Score */}
              <div className="text-center p-4 bg-biofresh-50 rounded-xl">
                <p className="text-4xl font-bold text-biofresh-600">
                  {batch.qualityMetrics.overallScore}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Overall Score / 100
                </p>
              </div>

              {/* Individual metrics */}
              <div className="space-y-3">
                {qualityItems.map((qi) => (
                  <div key={qi.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{qi.label}</span>
                      <span className="font-medium">{qi.value}%</span>
                    </div>
                    <Progress value={qi.value} className="h-2" />
                  </div>
                ))}
              </div>

              {/* Alerts */}
              {batch.qualityMetrics.botrytisDetected && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs font-medium text-red-700">
                    ⚠️ Botrytis cinerea detected
                  </p>
                  <p className="text-[10px] text-red-600 mt-0.5">
                    Urgent action required — remove infected fruits and isolate the batch
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between text-xs p-3 bg-cream rounded-xl">
                <span className="text-muted-foreground">Defective fruits detected</span>
                <span className="font-semibold">
                  {batch.qualityMetrics.defectCount} fruits
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Treatment Timeline */}
        <motion.div variants={item} className="lg:col-span-3">
          <Card className="border-biofresh-100 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-biofresh-500" />
                Treatment Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-biofresh-200" />

                <div className="space-y-6">
                  {batch.treatments.map((treatment, index) => {
                    const TIcon =
                      treatmentIcons[treatment.type] || CheckCircle2;
                    return (
                      <motion.div
                        key={treatment.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex gap-4 relative"
                      >
                        {/* Timeline dot */}
                        <div className="w-9 h-9 rounded-full bg-biofresh-100 border-2 border-biofresh-400 flex items-center justify-center z-10 shrink-0">
                          <TIcon className="w-4 h-4 text-biofresh-600" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 bg-white border border-biofresh-100 rounded-xl p-4 card-hover">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-semibold">
                                {treatment.label}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                {treatment.description}
                              </p>
                            </div>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                              {formatDate(treatment.timestamp)}
                            </span>
                          </div>

                          {/* Extra info */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {treatment.temperature !== undefined && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-sky-50 text-sky-700 border-sky-200"
                              >
                                <Thermometer className="w-2.5 h-2.5 mr-1" />
                                {treatment.temperature}°C
                              </Badge>
                            )}
                            {treatment.humidity !== undefined && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-blue-50 text-blue-700 border-blue-200"
                              >
                                <Droplets className="w-2.5 h-2.5 mr-1" />
                                {treatment.humidity}%
                              </Badge>
                            )}
                          </div>

                          {treatment.notes && (
                            <p className="text-[11px] text-biofresh-700 mt-2 bg-biofresh-50 px-3 py-1.5 rounded-lg">
                              📝 {treatment.notes}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Mascot Recommendation */}
      <motion.div variants={item}>
        <Card className="biofresh-gradient-light border-biofresh-200">
          <CardContent className="p-5 flex items-start gap-4">
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            >
              <Image
                src="/mascot.png"
                alt="BioFresh Guide"
                width={56}
                height={56}
                className="drop-shadow-md"
              />
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <Brain className="w-3.5 h-3.5 text-biofresh-600" />
                <span className="text-xs font-semibold text-biofresh-700">
                  Decision Intelligence Assistant
                </span>
              </div>
              <p className="text-sm text-biofresh-800 leading-relaxed">
                {batch.fruitType === "strawberry" && batch.grade !== "A"
                  ? `This ${batch.weightKg}kg ${batch.fruitLabel} batch should be moved to cold storage until reaching 200kg for freeze-drying. Profit margins will increase by 100% compared to fresh market sales! 🌟`
                  : batch.qualityMetrics.botrytisDetected
                  ? `⚠️ Botrytis infection detected in this batch. Immediate action required: remove infected fruit and apply high-concentration Chitosan treatment. Recommend rapid dispatch to prevent further losses.`
                  : `This Grade ${batch.grade} ${batch.fruitLabel} batch is in optimal condition! I recommend reviewing the AI diagnostics to determine the most profitable distribution strategy. 💚`}
              </p>
              <Button
                asChild
                size="sm"
                className="mt-3 gap-1.5 bg-biofresh-500 hover:bg-biofresh-600 rounded-lg text-xs"
              >
                <Link href={`/ai-engine?batch=${batch.id}`}>
                  <Brain className="w-3.5 h-3.5" />
                  Xem phân tích chi tiết
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
