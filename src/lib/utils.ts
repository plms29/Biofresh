import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { QualityGrade, BatchStatus, ProfitLevel, RiskLevel } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateString))
}

export function formatDateShort(dateString: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "short",
  }).format(new Date(dateString))
}

export function getGradeColor(grade: QualityGrade): string {
  const map: Record<QualityGrade, string> = {
    A: "bg-emerald-100 text-emerald-800 border-emerald-200",
    B: "bg-blue-100 text-blue-800 border-blue-200",
    C: "bg-amber-100 text-amber-800 border-amber-200",
    D: "bg-red-100 text-red-800 border-red-200",
  }
  return map[grade]
}

export function getStatusColor(status: BatchStatus): string {
  const map: Record<BatchStatus, string> = {
    harvested: "bg-lime-100 text-lime-800 border-lime-200",
    processing: "bg-sky-100 text-sky-800 border-sky-200",
    cold_storage: "bg-cyan-100 text-cyan-800 border-cyan-200",
    ready_to_sell: "bg-emerald-100 text-emerald-800 border-emerald-200",
    sold: "bg-gray-100 text-gray-600 border-gray-200",
    spoiled: "bg-red-100 text-red-800 border-red-200",
  }
  return map[status]
}

export function getStatusLabel(status: BatchStatus): string {
  const map: Record<BatchStatus, string> = {
    harvested: "Đã thu hoạch",
    processing: "Đang xử lý",
    cold_storage: "Kho lạnh",
    ready_to_sell: "Sẵn sàng bán",
    sold: "Đã bán",
    spoiled: "Hư hỏng",
  }
  return map[status]
}

export function getProfitColor(level: ProfitLevel): string {
  const map: Record<ProfitLevel, string> = {
    low: "bg-red-100 text-red-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-blue-100 text-blue-700",
    very_high: "bg-emerald-100 text-emerald-700",
  }
  return map[level]
}

export function getRiskColor(level: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    low: "bg-emerald-100 text-emerald-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-red-100 text-red-700",
  }
  return map[level]
}
