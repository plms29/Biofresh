"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Camera,
  Upload,
  X,
  ImageIcon,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Package,
  Ruler,
  Bug,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useState, useRef } from "react";
import type { QualityVisionResult } from "@/types";

const mockResult: QualityVisionResult = {
  fruitCount: 48,
  sizeDistribution: { small: 18, medium: 55, large: 27 },
  qualityIssues: [
    "Phát hiện 3 trái có dấu hiệu nấm Botrytis cinerea",
    "2 trái bị dập nhẹ do vận chuyển",
    "1 trái chưa chín đều (vàng một phần)",
  ],
  overallGrade: "B",
  botrytisCount: 3,
  confidence: 94.7,
};

export default function QualityVisionPage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [result, setResult] = useState<QualityVisionResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
      setScanComplete(false);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const startScan = () => {
    setIsScanning(true);
    setScanComplete(false);
    setTimeout(() => {
      setIsScanning(false);
      setScanComplete(true);
      setResult(mockResult);
    }, 3500);
  };

  const resetAll = () => {
    setUploadedImage(null);
    setIsScanning(false);
    setScanComplete(false);
    setResult(null);
  };

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
          <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">
              AI Crop Quality Vision
            </h1>
            <p className="text-sm text-muted-foreground">
              Kiểm tra chất lượng bằng AI — Đếm trái, đo kích thước, phát hiện
              bệnh
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-biofresh-100 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Upload className="w-4 h-4 text-biofresh-500" />
                Tải ảnh kiểm tra
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!uploadedImage ? (
                /* Drag & Drop Zone */
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 md:p-12 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[300px] ${
                    isDragOver
                      ? "border-biofresh-500 bg-biofresh-50 scale-[1.02]"
                      : "border-biofresh-300/50 hover:border-biofresh-400 hover:bg-biofresh-50/30"
                  }`}
                >
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{
                      repeat: Infinity,
                      duration: 3,
                      ease: "easeInOut",
                    }}
                    className="w-16 h-16 rounded-2xl bg-biofresh-100 flex items-center justify-center mb-4"
                  >
                    <ImageIcon className="w-8 h-8 text-biofresh-500" />
                  </motion.div>
                  <p className="text-sm font-medium text-center mb-1">
                    Kéo thả ảnh thùng trái cây vào đây
                  </p>
                  <p className="text-xs text-muted-foreground text-center">
                    hoặc click để chọn file (JPG, PNG, WebP)
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 gap-2 rounded-xl border-biofresh-300 text-biofresh-700"
                  >
                    <Camera className="w-4 h-4" />
                    Chụp ảnh
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileInput}
                  />
                </div>
              ) : (
                /* Image Preview with Scan */
                <div className="relative rounded-2xl overflow-hidden">
                  <img
                    src={uploadedImage}
                    alt="Uploaded"
                    className="w-full h-auto max-h-[400px] object-cover rounded-2xl"
                  />

                  {/* Scan line animation */}
                  {isScanning && (
                    <div className="absolute inset-0 bg-black/20 rounded-2xl">
                      <div className="scan-line" />
                      {/* Detection boxes */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0.7, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0"
                      >
                        <div className="absolute top-[15%] left-[20%] w-12 h-12 border-2 border-biofresh-400 rounded-lg" />
                        <div className="absolute top-[30%] left-[45%] w-10 h-10 border-2 border-biofresh-400 rounded-lg" />
                        <div className="absolute top-[50%] left-[30%] w-14 h-14 border-2 border-red-400 rounded-lg" />
                        <div className="absolute top-[25%] left-[65%] w-11 h-11 border-2 border-biofresh-400 rounded-lg" />
                        <div className="absolute top-[60%] left-[55%] w-10 h-10 border-2 border-biofresh-400 rounded-lg" />
                      </motion.div>
                    </div>
                  )}

                  {/* Controls */}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <Button
                      onClick={resetAll}
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 rounded-full bg-white/80 hover:bg-white"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Scan button overlay */}
                  {!isScanning && !scanComplete && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                      <Button
                        onClick={startScan}
                        size="lg"
                        className="gap-2 bg-biofresh-500 hover:bg-biofresh-600 rounded-xl shadow-lg px-8"
                      >
                        <Sparkles className="w-5 h-5" />
                        Bắt đầu quét AI
                      </Button>
                    </div>
                  )}

                  {/* Scanning label */}
                  {isScanning && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                      <div className="bg-black/60 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            repeat: Infinity,
                            duration: 1,
                            ease: "linear",
                          }}
                        >
                          <Sparkles className="w-4 h-4" />
                        </motion.div>
                        Đang quét...
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Results Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-biofresh-100 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-biofresh-500" />
                Kết quả phân tích
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!result ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <Camera className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isScanning
                      ? "Đang phân tích ảnh..."
                      : "Tải ảnh và bấm quét để xem kết quả"}
                  </p>
                  {isScanning && (
                    <div className="mt-4 w-48">
                      <motion.div
                        className="h-1.5 bg-biofresh-200 rounded-full overflow-hidden"
                      >
                        <motion.div
                          className="h-full bg-biofresh-500 rounded-full"
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 3.5, ease: "easeInOut" }}
                        />
                      </motion.div>
                    </div>
                  )}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-5"
                >
                  {/* Confidence */}
                  <div className="flex items-center justify-between p-3 bg-biofresh-50 rounded-xl">
                    <span className="text-xs text-muted-foreground">
                      Độ tin cậy AI
                    </span>
                    <span className="text-sm font-bold text-biofresh-700">
                      {result.confidence}%
                    </span>
                  </div>

                  {/* Fruit Count */}
                  <div className="text-center p-4 bg-gradient-to-br from-biofresh-50 to-emerald-50 rounded-xl">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Package className="w-5 h-5 text-biofresh-600" />
                      <span className="text-xs text-muted-foreground">
                        Số trái phát hiện
                      </span>
                    </div>
                    <p className="text-4xl font-bold text-biofresh-700">
                      {result.fruitCount}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      trái dâu tây
                    </p>
                  </div>

                  {/* Size Distribution */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-3">
                      <Ruler className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold">
                        Phân bố kích thước
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-12">
                          Nhỏ
                        </span>
                        <div className="flex-1">
                          <Progress
                            value={result.sizeDistribution.small}
                            className="h-3"
                          />
                        </div>
                        <span className="text-xs font-medium w-10 text-right">
                          {result.sizeDistribution.small}%
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-12">
                          Vừa
                        </span>
                        <div className="flex-1">
                          <Progress
                            value={result.sizeDistribution.medium}
                            className="h-3"
                          />
                        </div>
                        <span className="text-xs font-medium w-10 text-right">
                          {result.sizeDistribution.medium}%
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-12">
                          Lớn
                        </span>
                        <div className="flex-1">
                          <Progress
                            value={result.sizeDistribution.large}
                            className="h-3"
                          />
                        </div>
                        <span className="text-xs font-medium w-10 text-right">
                          {result.sizeDistribution.large}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Overall Grade */}
                  <div className="flex items-center justify-between p-3 bg-cream rounded-xl">
                    <span className="text-xs font-semibold">
                      Phân loại chất lượng
                    </span>
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-sm font-bold px-4">
                      Grade {result.overallGrade}
                    </Badge>
                  </div>

                  {/* Quality Issues */}
                  {result.qualityIssues.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Bug className="w-3.5 h-3.5 text-orange-500" />
                        <span className="text-xs font-semibold text-orange-700">
                          Vấn đề phát hiện ({result.qualityIssues.length})
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {result.qualityIssues.map((issue, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 p-2.5 bg-orange-50 border border-orange-100 rounded-lg"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                            <span className="text-[11px] text-orange-800">
                              {issue}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action */}
                  <Button className="w-full gap-2 bg-biofresh-500 hover:bg-biofresh-600 rounded-xl h-11">
                    <CheckCircle2 className="w-4 h-4" />
                    Thêm vào lô hàng DBI
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
