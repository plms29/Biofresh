"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useBatchStore } from "@/store/batch-store";
import {
  formatVND,
  formatDate,
  getGradeColor,
  getStatusColor,
  getStatusLabel,
} from "@/lib/utils";
import { FRUIT_META } from "@/types";
import {
  Search,
  Plus,
  Filter,
  WifiOff,
  ArrowUpDown,
  Eye,
  Brain,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function BatchesPage() {
  const { batches } = useBatchStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredBatches = batches.filter((b) => {
    const matchesSearch =
      !searchQuery.trim() ||
      b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.fruitLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.farmName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || b.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: "all", label: "Tất cả" },
    { value: "harvested", label: "Đã thu hoạch" },
    { value: "processing", label: "Đang xử lý" },
    { value: "cold_storage", label: "Kho lạnh" },
    { value: "ready_to_sell", label: "Sẵn sàng bán" },
    { value: "sold", label: "Đã bán" },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Page Header */}
      <motion.div
        variants={item}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">
            Batch Traceability
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Digital Batch Identity — End-to-end post-harvest tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Offline mode indicator */}
          <Badge
            variant="outline"
            className="gap-1.5 text-[10px] border-amber-200 text-amber-700 bg-amber-50"
          >
            <WifiOff className="w-3 h-3" />
            Hỗ trợ Offline
          </Badge>
          <Button className="gap-2 bg-biofresh-500 hover:bg-biofresh-600 rounded-xl h-10">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Tạo lô mới</span>
          </Button>
        </div>
      </motion.div>

      {/* Search & Filter Bar */}
      <motion.div variants={item}>
        <Card className="border-biofresh-100">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo mã lô, loại trái cây, nông trại..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-cream/30 border-biofresh-200/50 focus:border-biofresh-400 h-10 text-sm rounded-xl"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
                {statusOptions.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={statusFilter === opt.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(opt.value)}
                    className={`text-xs rounded-lg shrink-0 ${
                      statusFilter === opt.value
                        ? "bg-biofresh-500 hover:bg-biofresh-600"
                        : "border-biofresh-200/50 text-muted-foreground hover:bg-biofresh-50"
                    }`}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Batch Count */}
      <motion.div variants={item}>
        <p className="text-xs text-muted-foreground">
          Hiển thị{" "}
          <span className="font-semibold text-foreground">
            {filteredBatches.length}
          </span>{" "}
          / {batches.length} lô hàng
        </p>
      </motion.div>

      {/* Batch Table */}
      <motion.div variants={item}>
        <Card className="border-biofresh-100 overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-biofresh-50/50 hover:bg-biofresh-50/50">
                    <TableHead className="text-xs font-semibold">
                      <div className="flex items-center gap-1">
                        Mã lô
                        <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                      </div>
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Loại trái cây
                    </TableHead>
                    <TableHead className="text-xs font-semibold hidden md:table-cell">
                      Nông trại
                    </TableHead>
                    <TableHead className="text-xs font-semibold hidden sm:table-cell">
                      Ngày thu hoạch
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Khối lượng
                    </TableHead>
                    <TableHead className="text-xs font-semibold hidden lg:table-cell">
                      Chất lượng
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Trạng thái
                    </TableHead>
                    <TableHead className="text-xs font-semibold hidden lg:table-cell">
                      Giá trị
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Thao tác
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBatches.map((batch, index) => {
                    const fruit = FRUIT_META[batch.fruitType];
                    return (
                      <motion.tr
                        key={batch.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="group hover:bg-biofresh-50/30 border-b border-border/50 transition-colors"
                      >
                        <TableCell className="font-mono text-xs text-biofresh-700 font-semibold">
                          <Link
                            href={`/batches/${batch.id}`}
                            className="hover:underline"
                          >
                            {batch.id}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{fruit.emoji}</span>
                            <div>
                              <p className="text-xs font-medium">
                                {fruit.label}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {batch.variety}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                          <div>
                            <p className="font-medium text-foreground">
                              {batch.farmName}
                            </p>
                            <p className="text-[10px]">{batch.location}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                          {formatDate(batch.harvestDate)}
                        </TableCell>
                        <TableCell className="text-xs font-semibold">
                          {batch.weightKg}
                          <span className="text-muted-foreground font-normal">
                            kg
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${getGradeColor(
                              batch.grade
                            )}`}
                          >
                            Grade {batch.grade}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${getStatusColor(
                              batch.status
                            )}`}
                          >
                            {getStatusLabel(batch.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium hidden lg:table-cell">
                          {formatVND(batch.estimatedValue)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-biofresh-600"
                            >
                              <Link href={`/batches/${batch.id}`}>
                                <Eye className="w-3.5 h-3.5" />
                              </Link>
                            </Button>
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-biofresh-600"
                            >
                              <Link
                                href={`/ai-engine?batch=${batch.id}`}
                              >
                                <Brain className="w-3.5 h-3.5" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {filteredBatches.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">
                  Không tìm thấy lô hàng nào phù hợp
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
