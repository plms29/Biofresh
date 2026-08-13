"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BadgeCheck, Boxes, ExternalLink } from "lucide-react";
import {
  BATCH_STATUS_LABEL,
  BATCH_STATUS_ORDER,
  GRADE_LABEL,
  type Grade,
} from "@/types";
import { useBio } from "@/store/use-biofresh";
import { useHydrated, useNow } from "@/hooks/use-client-state";
import { PRODUCTS } from "@/lib/domain/catalog";
import { batchLots } from "@/lib/domain/inventory";
import { full, kg, untilText, vnd, vndShort } from "@/lib/domain/format";
import { DataRow, EmptyState, PageHeader, SectionTitle } from "@/components/common/layout-bits";
import {
  AllocationStatusTag,
  BatchStatusTag,
  GradeTag,
} from "@/components/common/badges";
import { QrCode } from "@/components/common/qr-code";
import { ProtocolTracker } from "@/components/packhouse/protocol-tracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GRADES: Grade[] = ["A", "B", "PROCESS", "REJECT"];

export default function BatchDetailPage() {
  const params = useParams<{ id: string }>();
  const batchId = decodeURIComponent(params.id);
  const hydrated = useHydrated();
  const now = useNow();

  const batch = useBio((s) => s.batches.find((b) => b.id === batchId));
  const allocations = useBio((s) => s.allocations);
  const orders = useBio((s) => s.orders);
  const cases = useBio((s) => s.cases);
  const harvestOrders = useBio((s) => s.harvestOrders);

  if (!hydrated) return null;

  // Sau khi hydrate mới có window — mã QR cần địa chỉ đầy đủ để quét được.
  const passportUrl = `${window.location.origin}/p/${encodeURIComponent(batchId)}`;

  if (!batch) {
    return (
      <div className="flex flex-col gap-6">
        <Button variant="ghost" asChild className="w-fit">
          <Link href="/batches">
            <ArrowLeft /> Danh sách lô
          </Link>
        </Button>
        <EmptyState
          icon={Boxes}
          title={`Không tìm thấy lô ${batchId}`}
          hint="Lô có thể đã bị xoá khi đặt lại dữ liệu trình diễn."
        />
      </div>
    );
  }

  const meta = PRODUCTS[batch.product];
  const lots = batchLots(batch, allocations);
  const batchAllocs = allocations.filter((a) => a.batchId === batch.id);
  const ho = harvestOrders.find((h) => h.id === batch.harvestOrderId);
  const batchCases = cases.filter((c) => c.batchId === batch.id);
  const currentStep = BATCH_STATUS_ORDER.indexOf(batch.status);

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" asChild className="w-fit">
        <Link href="/batches">
          <ArrowLeft /> Danh sách lô
        </Link>
      </Button>

      <PageHeader
        eyebrow={`${meta.emoji} ${meta.label}`}
        title={batch.id}
        description={`${batch.origin} · thu hoạch ${full(batch.harvestedAt)}${
          ho ? ` · lệnh ${ho.id}` : ""
        }`}
        actions={
          <Button variant="outline" size="lg" asChild>
            <Link href={`/p/${encodeURIComponent(batch.id)}`} target="_blank">
              <BadgeCheck /> Hộ chiếu Quy trình
            </Link>
          </Button>
        }
      />

      {/* Hành trình trạng thái */}
      <Card>
        <CardContent>
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {BATCH_STATUS_ORDER.map((s, i) => {
              const done = i <= currentStep;
              return (
                <li key={s} className="flex flex-col gap-1.5">
                  <span
                    className={cn(
                      "h-1.5 rounded-full",
                      done ? "bg-leaf-500" : "bg-muted"
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs",
                      done ? "font-medium text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {BATCH_STATUS_LABEL[s]}
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <BatchStatusTag status={batch.status} />
            <span className="tnum text-sm text-muted-foreground">
              {kg(batch.totalKg)} · nhập kho {full(batch.intakeAt)}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Kết quả kiểm soát chất lượng */}
          <Card>
            <CardHeader className="border-b">
              <SectionTitle
                title="Kết quả kiểm soát chất lượng"
                hint={
                  batch.qc
                    ? `${batch.qc.confirmedBy} · ${full(batch.qc.confirmedAt)}`
                    : "Kho đóng gói chưa xác nhận phân loại."
                }
              />
            </CardHeader>
            <CardContent>
              {!batch.qc ? (
                <EmptyState
                  title="Chưa có kết quả phân loại"
                  hint="Tồn kho chỉ xuất hiện sau khi kho đóng gói xác nhận số kg từng hạng."
                />
              ) : (
                <>
                  <div className="grid gap-2 sm:grid-cols-4">
                    {GRADES.map((g) => {
                      const lot = lots.find((l) => l.grade === g);
                      return (
                        <div
                          key={g}
                          className="rounded-xl bg-muted/50 px-3 py-2.5"
                        >
                          <GradeTag grade={g} />
                          <p className="tnum mt-1.5 font-heading text-base font-semibold">
                            {kg(batch.qc!.gradeKg[g])}
                          </p>
                          {lot && g !== "REJECT" ? (
                            <p className="tnum text-xs text-muted-foreground">
                              còn {kg(lot.availableKg)}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                  {batch.qc.notes ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Ghi chú: {batch.qc.notes}
                    </p>
                  ) : null}
                  {batch.qc.photos.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {batch.qc.photos.map((src, i) => (
                        // Ảnh do kho tải lên, lưu dạng data URL
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={src}
                          alt={`Ảnh phân loại ${i + 1}`}
                          className="size-20 rounded-lg object-cover ring-1 ring-foreground/10"
                        />
                      ))}
                    </div>
                  ) : null}
                  {/* Hạn hành động chỉ còn ý nghĩa khi lô chưa xuất/đóng và vẫn còn hàng chưa phân bổ. */}
                  {lots.some((l) => l.grade !== "REJECT" && l.availableKg > 0) &&
                  batch.status !== "closed" &&
                  batch.status !== "shipped" &&
                  now > 0 ? (
                    <p className="mt-3 text-sm text-sun-700">
                      Hạn phải hành động: {untilText(lots[0].actionDeadline, now)} (
                      {meta.actionWindowHours} giờ sau kiểm soát chất lượng).
                    </p>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          {/* Quy trình Thực địa */}
          <Card>
            <CardHeader className="border-b">
              <SectionTitle
                title="Quy trình Thực địa BioFresh"
                hint="Sáu bước bắt buộc; đây là nội dung duy nhất khách mua thấy khi quét QR."
              />
            </CardHeader>
            <CardContent>
              <ProtocolTracker
                batch={batch}
                readOnly={batch.status === "closed"}
              />
            </CardContent>
          </Card>

          {/* Phân bổ */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Phân bổ hàng</CardTitle>
            </CardHeader>
            <CardContent>
              {batchAllocs.length === 0 ? (
                <EmptyState
                  title="Chưa phân bổ"
                  hint="Bán hàng phân bổ lô con cho đơn hàng hoặc kênh bán."
                />
              ) : (
                <ul className="flex flex-col gap-2">
                  {batchAllocs.map((a) => {
                    const order = orders.find((o) => o.id === a.orderId);
                    return (
                      <li
                        key={a.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/50 px-3.5 py-2.5 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">{a.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {GRADE_LABEL[a.grade]} · {a.createdBy}
                            {order ? ` · đơn ${order.id}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="tnum font-medium">{kg(a.kg)}</span>
                          <AllocationStatusTag status={a.status} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Quyết định xử lý hàng dư thừa */}
          {batchCases.length > 0 ? (
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Quyết định xử lý</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2 text-sm">
                  {batchCases.map((c) => {
                    const chosen = c.options.find(
                      (o) => o.id === c.chosenOptionId
                    );
                    return (
                      <li
                        key={c.id}
                        className="rounded-xl bg-muted/50 px-3.5 py-3"
                      >
                        <p className="flex flex-wrap items-center gap-2 font-medium">
                          <GradeTag grade={c.grade} />
                          {kg(c.unallocatedKg)} chưa phân bổ
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          {chosen
                            ? `Đã chốt: ${chosen.label} · giá trị ròng dự kiến ${vndShort(
                                chosen.netValue
                              )} · ${c.decidedBy}`
                            : "Đang chờ Quản lý chọn phương án."}
                        </p>
                      </li>
                    );
                  })}
                </ul>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link href="/manager">
                    Mở Phòng quyết định <ExternalLink className="size-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Cột phải: QR + thông tin lô */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Mã QR của lô</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              <QrCode value={passportUrl} />
              <p className="text-center text-xs text-muted-foreground">
                Khách mua quét mã chỉ thấy Hộ chiếu Quy trình. Không có giá, không
                có tồn kho, không có dữ liệu nội bộ.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/p/${encodeURIComponent(batch.id)}`} target="_blank">
                  Mở như khách mua
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Thông tin lô</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                <DataRow label="Sản phẩm">
                  {meta.emoji} {meta.label}
                </DataRow>
                <DataRow label="Nguồn gốc">{batch.origin}</DataRow>
                <DataRow label="Thu hoạch">{full(batch.harvestedAt)}</DataRow>
                <DataRow label="Nhập kho">{full(batch.intakeAt)}</DataRow>
                <DataRow label="Tổng khối lượng">{kg(batch.totalKg)}</DataRow>
                {ho ? (
                  <DataRow label="Lệnh thu hoạch">
                    {ho.id} · {kg(ho.pickedKg)}
                  </DataRow>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {batch.outcome ? (
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Kết quả cuối</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  <DataRow label="Đã xuất">{kg(batch.outcome.shippedKg)}</DataRow>
                  <DataRow label="Khách chấp nhận">
                    {kg(batch.outcome.acceptedKg)}
                  </DataRow>
                  <DataRow label="Khách từ chối">
                    {kg(batch.outcome.rejectedKg)}
                  </DataRow>
                  <DataRow label="Doanh thu thực tế">
                    {vnd(batch.outcome.actualRevenue)}
                  </DataRow>
                  <DataRow label="Đóng lô">{full(batch.outcome.closedAt)}</DataRow>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
