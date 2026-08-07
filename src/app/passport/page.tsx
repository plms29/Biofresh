"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useBatchStore } from "@/store/batch-store";
import { formatDate, getGradeColor, formatVND } from "@/lib/utils";
import { FRUIT_META } from "@/types";
import type { TreatmentType } from "@/types";
import {
  FileCheck,
  Leaf,
  MapPin,
  Calendar,
  Award,
  Share2,
  Printer,
  QrCode,
  CheckCircle2,
  Sprout,
  FlaskConical,
  Snowflake,
  PackageCheck,
  Truck,
  Search,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const journeyStepIcons: Record<TreatmentType, React.ComponentType<{ className?: string }>> = {
  quality_check: Search,
  chitosan_spray: FlaskConical,
  cold_storage: Snowflake,
  bio_coating: ShieldCheck,
  freeze_drying: Snowflake,
  packaging: PackageCheck,
  transport: Truck,
};

function FreshnessPassportContent() {
  const searchParams = useSearchParams();
  const { batches } = useBatchStore();
  const batchParam = searchParams.get("batch");
  const [selectedBatchId, setSelectedBatchId] = useState(
    batchParam || batches[1]?.id || ""
  );

  const batch = batches.find((b) => b.id === selectedBatchId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
            <FileCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">
              Quality Assurance Passport
            </h1>
            <p className="text-sm text-muted-foreground">
              Traceability record — Share with B2B partners
            </p>
          </div>
        </div>
      </motion.div>

      {/* Batch Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-biofresh-100">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {batches.map((b) => {
                const fruit = FRUIT_META[b.fruitType];
                return (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBatchId(b.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                      selectedBatchId === b.id
                        ? "bg-biofresh-500 text-white shadow-md"
                        : "bg-biofresh-50 text-biofresh-700 hover:bg-biofresh-100 border border-biofresh-200/50"
                    }`}
                  >
                    <span>{fruit.emoji}</span>
                    <span>{b.id}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Passport Card */}
      {batch && (
        <motion.div
          key={batch.id}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="passport-border rounded-2xl overflow-hidden shadow-xl">
            {/* Passport Header */}
            <div className="biofresh-gradient p-6 md:p-8 text-white relative overflow-hidden">
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl border border-white/30">
                    {FRUIT_META[batch.fruitType].emoji}
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold">
                      {batch.fruitLabel}
                    </h2>
                    <p className="text-white/80 text-sm">{batch.variety}</p>
                    <p className="text-white/60 text-xs font-mono mt-1">
                      Passport ID: {batch.id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                    <Leaf className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              {/* Decorative */}
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
              <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5" />
            </div>

            {/* Passport Body */}
            <div className="bg-white p-6 md:p-8 space-y-6">
              {/* Key Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-biofresh-50 rounded-xl">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sprout className="w-3.5 h-3.5 text-biofresh-600" />
                    <span className="text-[10px] text-muted-foreground">
                      Origin Farm
                    </span>
                  </div>
                  <p className="text-xs font-semibold">{batch.farmName}</p>
                </div>
                <div className="p-3 bg-biofresh-50 rounded-xl">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-biofresh-600" />
                    <span className="text-[10px] text-muted-foreground">
                      Xuất xứ
                    </span>
                  </div>
                  <p className="text-xs font-semibold">{batch.location}</p>
                </div>
                <div className="p-3 bg-biofresh-50 rounded-xl">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-biofresh-600" />
                    <span className="text-[10px] text-muted-foreground">
                      Thu hoạch
                    </span>
                  </div>
                  <p className="text-xs font-semibold">
                    {formatDate(batch.harvestDate)}
                  </p>
                </div>
                <div className="p-3 bg-biofresh-50 rounded-xl">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Award className="w-3.5 h-3.5 text-biofresh-600" />
                    <span className="text-[10px] text-muted-foreground">
                      Quality Grade
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${getGradeColor(batch.grade)}`}
                  >
                    Loại {batch.grade}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Journey Timeline */}
              <div>
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-biofresh-500" />
                  Hành trình sản phẩm
                </h3>

                <div className="relative">
                  {/* Timeline bar */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-biofresh-200" />

                  <div className="space-y-4">
                    {/* Harvest step (always first) */}
                    <div className="flex gap-4 relative">
                      <div className="w-9 h-9 rounded-full bg-biofresh-500 flex items-center justify-center z-10 shrink-0">
                        <Sprout className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 p-3 bg-biofresh-50 rounded-xl border border-biofresh-100">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold text-biofresh-800">
                            Harvest Date
                          </h4>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDate(batch.harvestDate)}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {batch.farmName}, {batch.location}
                        </p>
                        <p className="text-[10px] text-biofresh-600 mt-0.5">
                          Weather: {batch.harvestWeather}
                        </p>
                      </div>
                    </div>

                    {/* Treatment steps */}
                    {batch.treatments.map((treatment: any) => {
                      const TIcon =
                        journeyStepIcons[treatment.type] || CheckCircle2;
                      return (
                        <div key={treatment.id} className="flex gap-4 relative">
                          <div className="w-9 h-9 rounded-full bg-biofresh-100 border-2 border-biofresh-400 flex items-center justify-center z-10 shrink-0">
                            <TIcon className="w-4 h-4 text-biofresh-600" />
                          </div>
                          <div className="flex-1 p-3 bg-white rounded-xl border border-biofresh-100">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-semibold">
                                {treatment.label}
                              </h4>
                              <span className="text-[10px] text-muted-foreground">
                                {formatDate(treatment.timestamp)}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {treatment.description}
                            </p>
                            {treatment.notes && (
                              <p className="text-[10px] text-biofresh-600 mt-1">
                                {treatment.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Certifications */}
              <div>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  Certifications & Standards
                </h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    "VietGAP",
                    "Chitosan Organic",
                    "Traceability Verified",
                    "BioFresh Verified",
                  ].map((cert) => (
                    <Badge
                      key={cert}
                      variant="outline"
                      className="text-xs bg-amber-50 text-amber-700 border-amber-200 gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {cert}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* QR Code & Quality Score */}
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* QR Placeholder */}
                <div className="w-32 h-32 bg-biofresh-50 rounded-xl border-2 border-dashed border-biofresh-300 flex flex-col items-center justify-center shrink-0">
                  <QrCode className="w-12 h-12 text-biofresh-400 mb-1" />
                  <p className="text-[9px] text-muted-foreground text-center">
                    Scan to view digital record
                  </p>
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <div className="inline-flex items-center gap-4 p-4 bg-gradient-to-r from-biofresh-50 to-emerald-50 rounded-xl">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">
                        Overall Quality Score
                      </p>
                      <p className="text-4xl font-bold text-biofresh-600">
                        {batch.qualityMetrics.overallScore}
                        <span className="text-lg text-muted-foreground">
                          /100
                        </span>
                      </p>
                    </div>
                    <div className="w-16 h-16 rounded-full border-4 border-biofresh-400 flex items-center justify-center">
                      <ShieldCheck className="w-7 h-7 text-biofresh-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* BioFresh Branding */}
              <div className="flex items-center justify-between pt-4 border-t border-dashed border-biofresh-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg biofresh-gradient flex items-center justify-center">
                    <Leaf className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-biofresh-700">
                      BioFresh OS
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      Smart Post-Harvest Management
                    </p>
                  </div>
                </div>
                <p className="text-[9px] text-muted-foreground">
                  Xác minh lúc:{" "}
                  {new Date().toLocaleDateString("vi-VN")}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4 justify-center">
            <Button
              variant="outline"
              className="gap-2 rounded-xl border-biofresh-200 text-biofresh-700 hover:bg-biofresh-50"
              onClick={() => window.print()}
            >
              <Printer className="w-4 h-4" />
              In Passport
            </Button>
            <Button className="gap-2 rounded-xl bg-biofresh-500 hover:bg-biofresh-600">
              <Share2 className="w-4 h-4" />
              Chia sẻ cho đối tác
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default function PassportPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Đang tải...</div>}>
      <FreshnessPassportContent />
    </Suspense>
  );
}
