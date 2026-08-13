"use client";

import * as React from "react";
import Link from "next/link";
import { Boxes, Search } from "lucide-react";
import { BATCH_STATUS_LABEL, type BatchStatus } from "@/types";
import { useBio } from "@/store/use-biofresh";
import { useHydrated } from "@/hooks/use-client-state";
import { PRODUCTS } from "@/lib/domain/catalog";
import { batchLots } from "@/lib/domain/inventory";
import { protocolDoneCount } from "@/lib/domain/protocol";
import { dt, kg } from "@/lib/domain/format";
import { EmptyState, PageHeader } from "@/components/common/layout-bits";
import { BatchStatusTag } from "@/components/common/badges";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/field";

const STATUSES = Object.keys(BATCH_STATUS_LABEL) as BatchStatus[];

export default function BatchesPage() {
  const hydrated = useHydrated();
  const batches = useBio((s) => s.batches);
  const allocations = useBio((s) => s.allocations);

  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<"all" | BatchStatus>("all");

  const rows = batches
    .filter((b) => (status === "all" ? true : b.status === status))
    .filter((b) => {
      if (!q.trim()) return true;
      const needle = q.trim().toLowerCase();
      return (
        b.id.toLowerCase().includes(needle) ||
        b.origin.toLowerCase().includes(needle) ||
        PRODUCTS[b.product].label.toLowerCase().includes(needle)
      );
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Lô hàng"
        title="Lô hàng là đối tượng trung tâm"
        description="Mọi vai trò cùng nhìn một lô: nguồn gốc, kết quả phân loại, phân bổ, 6 bước quy trình và mã QR Hộ chiếu."
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo mã lô, vườn hoặc sản phẩm…"
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as "all" | BatchStatus)}
          className="sm:w-56"
        >
          <option value="all">Tất cả trạng thái</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {BATCH_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </div>

      {!hydrated ? null : rows.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="Không tìm thấy lô nào"
          hint="Thử xoá bộ lọc hoặc tìm bằng mã lô khác."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((b) => {
            const lots = batchLots(b, allocations);
            const available = lots
              .filter((l) => l.grade !== "REJECT")
              .reduce((s, l) => s + l.availableKg, 0);
            return (
              <Link key={b.id} href={`/batches/${b.id}`} className="group">
                <Card className="h-full transition-all group-hover:ring-leaf-300">
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-heading text-base font-semibold">
                          {b.id}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {PRODUCTS[b.product].emoji} {PRODUCTS[b.product].label} ·{" "}
                          {b.origin}
                        </p>
                      </div>
                      <BatchStatusTag status={b.status} />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Khối lượng</p>
                        <p className="tnum font-medium">{kg(b.totalKg)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Chưa phân bổ</p>
                        <p className="tnum font-medium">
                          {b.qc ? kg(available) : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Quy trình</p>
                        <p className="tnum font-medium">
                          {protocolDoneCount(b)}/6
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Thu hoạch {dt(b.harvestedAt)}
                      {b.qc ? ` · phân loại ${dt(b.qc.confirmedAt)}` : ""}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
