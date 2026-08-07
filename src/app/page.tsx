"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useBatchStore } from "@/store/batch-store";
import { formatVND, formatDate, getGradeColor, getStatusColor, getStatusLabel } from "@/lib/utils";
import { dailyInsights } from "@/lib/mock-data";
import { FRUIT_META } from "@/types";
import {
  Package,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  QrCode,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  ThermometerSun,
  Droplets,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMemo } from "react";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function DashboardPage() {
  const { batches, metrics } = useBatchStore();

  const todayInsight = useMemo(() => {
    const idx = new Date().getDate() % dailyInsights.length;
    return dailyInsights[idx];
  }, []);

  const recentBatches = batches.slice(0, 5);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Welcome Card with Mascot */}
      <motion.div variants={item}>
        <Card className="biofresh-gradient border-0 overflow-hidden relative">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Mascot */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="shrink-0"
              >
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-white/20 backdrop-blur-sm p-2 border border-white/30">
                  <Image
                    src="/mascot.png"
                    alt="BioFresh Guide"
                    width={100}
                    height={100}
                    className="object-contain drop-shadow-lg"
                  />
                </div>
              </motion.div>

              {/* Insight text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  <span className="text-white/80 text-xs font-medium uppercase tracking-wider">
                    Continuous Learning Loop — Insight hôm nay
                  </span>
                </div>
                <p className="text-white text-base md:text-lg font-medium leading-relaxed">
                  &ldquo;{todayInsight}&rdquo;
                </p>
                <p className="text-white/60 text-xs mt-3 flex items-center gap-1">
                  <ThermometerSun className="w-3.5 h-3.5" />
                  Đà Lạt: 18°C
                  <Droplets className="w-3.5 h-3.5 ml-2" />
                  Độ ẩm: 85%
                </p>
              </div>
            </div>
          </CardContent>

          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-white/5" />
        </Card>
      </motion.div>

      {/* Metrics Grid */}
      <motion.div
        variants={item}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Active Batches */}
        <Card className="card-hover border-biofresh-100">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-biofresh-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-biofresh-600" />
              </div>
              <Badge variant="secondary" className="text-[10px] bg-biofresh-50 text-biofresh-700">
                +2 tuần này
              </Badge>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-foreground">
              {metrics.activeBatches}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Lô hàng đang hoạt động
            </p>
          </CardContent>
        </Card>

        {/* Spoilage Saved */}
        <Card className="card-hover border-emerald-100">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-emerald-600" />
              </div>
              <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700">
                ↓ {metrics.spoilageSavedPercent}%
              </Badge>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-foreground">
              {metrics.spoilageSaved} <span className="text-base font-normal text-muted-foreground">kg</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Giảm hao hụt tháng này
            </p>
          </CardContent>
        </Card>

        {/* Estimated Profit */}
        <Card className="card-hover border-amber-100">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-600" />
              </div>
              <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700">
                +12% MoM
              </Badge>
            </div>
            <p className="text-xl md:text-2xl font-bold text-foreground">
              {formatVND(metrics.estimatedProfit)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Lợi nhuận ước tính
            </p>
          </CardContent>
        </Card>

        {/* Harvest Alerts */}
        <Card className="card-hover border-orange-100">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>
              <Badge className="text-[10px] bg-orange-500 text-white border-0">
                Cần xử lý
              </Badge>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-foreground">
              {metrics.harvestAlerts}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Cảnh báo thu hoạch
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Action Buttons + Recent Batches */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <motion.div variants={item} className="lg:col-span-1 space-y-4">
          <Card className="border-biofresh-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Thao tác nhanh
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                asChild
                className="w-full justify-start gap-3 h-12 bg-biofresh-500 hover:bg-biofresh-600 text-white rounded-xl"
              >
                <Link href="/batches">
                  <QrCode className="w-5 h-5" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Tạo lô hàng mới</p>
                    <p className="text-[10px] text-white/70">Scan QR Code</p>
                  </div>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full justify-start gap-3 h-12 border-biofresh-200 text-biofresh-700 hover:bg-biofresh-50 rounded-xl"
              >
                <Link href="/ai-engine">
                  <Sparkles className="w-5 h-5" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Phân tích AI</p>
                    <p className="text-[10px] text-muted-foreground">
                      Decision Engine
                    </p>
                  </div>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full justify-start gap-3 h-12 border-biofresh-200 text-biofresh-700 hover:bg-biofresh-50 rounded-xl"
              >
                <Link href="/quality-vision">
                  <ShieldCheck className="w-5 h-5" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Cập nhật bảo quản</p>
                    <p className="text-[10px] text-muted-foreground">
                      Kiểm tra chất lượng
                    </p>
                  </div>
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Mini spoilage chart */}
          <Card className="border-biofresh-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Xu hướng hao hụt (7 ngày)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1.5 h-20">
                {[35, 28, 22, 30, 18, 15, 12].map((val, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${val * 2.5}%` }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    className="flex-1 rounded-t-md bg-biofresh-400/80 hover:bg-biofresh-500 transition-colors relative group"
                  >
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      {val}kg
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="flex justify-between mt-2">
                {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
                  <span key={d} className="text-[9px] text-muted-foreground flex-1 text-center">
                    {d}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Batches Table */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="border-biofresh-100">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Lô hàng gần đây
              </CardTitle>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-xs text-biofresh-600 hover:text-biofresh-700 hover:bg-biofresh-50"
              >
                <Link href="/batches">
                  Xem tất cả
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">Mã lô</TableHead>
                    <TableHead className="text-xs">Loại</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Ngày thu hoạch</TableHead>
                    <TableHead className="text-xs">Khối lượng</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Chất lượng</TableHead>
                    <TableHead className="text-xs">Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentBatches.map((batch, index) => {
                    const fruit = FRUIT_META[batch.fruitType];
                    return (
                      <TableRow key={batch.id} className="cursor-pointer hover:bg-biofresh-50/50">
                        <TableCell className="font-mono text-xs text-biofresh-700 font-medium">
                          <Link href={`/batches/${batch.id}`} className="hover:underline">
                            {batch.id}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">{fruit.emoji}</span>
                            <span className="text-xs">{fruit.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                          {formatDate(batch.harvestDate)}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {batch.weightKg}kg
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className={`text-[10px] ${getGradeColor(batch.grade)}`}>
                            Grade {batch.grade}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${getStatusColor(batch.status)}`}>
                            {getStatusLabel(batch.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
