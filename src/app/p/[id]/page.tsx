"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { BadgeCheck, Check, Clock, Leaf, ShieldCheck } from "lucide-react";
import { useBio } from "@/store/use-biofresh";
import { useHydrated } from "@/hooks/use-client-state";
import { PRODUCTS } from "@/lib/domain/catalog";
import { PROTOCOL_STEPS, isProtocolComplete, protocolCompletedAt } from "@/lib/domain/protocol";
import { full } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

/**
 * Hộ chiếu Quy trình — trang duy nhất khách mua nhìn thấy sau khi quét mã QR.
 * Chỉ xem. Tuyệt đối không có giá, khách mua khác, tồn kho hay dữ liệu quyết định.
 */
export default function PassportPage() {
  const params = useParams<{ id: string }>();
  const batchId = decodeURIComponent(params.id);
  const hydrated = useHydrated();

  const batch = useBio((s) => s.batches.find((b) => b.id === batchId));
  const coopName = useBio((s) => s.config.coopName);

  const complete = batch ? isProtocolComplete(batch) : false;
  const completedAt = batch ? protocolCompletedAt(batch) : undefined;

  return (
    <div className="min-h-dvh bg-leaf-900/[0.03] surface-grid">
      <div className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
        <div className="overflow-hidden rounded-3xl bg-card ring-1 ring-foreground/10">
          {/* Đầu trang */}
          <div className="hero-leaf px-6 py-7">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-leaf-600 text-white">
                <Leaf className="size-5" />
              </span>
              <div className="leading-tight">
                <p className="font-heading text-sm font-semibold">
                  BioFresh <span className="text-leaf-600">OS</span>
                </p>
                <p className="text-xs text-muted-foreground">Hộ chiếu Quy trình</p>
              </div>
            </div>

            {!hydrated ? null : batch ? (
              <>
                <h1 className="mt-5 font-heading text-2xl font-semibold">
                  {PRODUCTS[batch.product].emoji} {PRODUCTS[batch.product].label}
                </h1>
                <p className="tnum mt-1 text-sm text-muted-foreground">
                  Mã lô <strong className="text-foreground">{batch.id}</strong>
                </p>
                <div
                  className={cn(
                    "mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset",
                    complete
                      ? "bg-leaf-600 text-white ring-leaf-700/30"
                      : "bg-sun-100 text-sun-700 ring-sun-300"
                  )}
                >
                  {complete ? (
                    <>
                      <BadgeCheck className="size-4" /> Đã hoàn tất xử lý
                    </>
                  ) : (
                    <>
                      <Clock className="size-4" /> Đang xử lý
                    </>
                  )}
                </div>
              </>
            ) : (
              <h1 className="mt-5 font-heading text-xl font-semibold">
                Không tìm thấy lô {batchId}
              </h1>
            )}
          </div>

          {hydrated && batch ? (
            <>
              {/* Thông tin lô — chỉ những gì công khai được */}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border px-6 py-5 text-sm">
                <div>
                  <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                    Đơn vị sản xuất
                  </dt>
                  <dd className="mt-0.5 font-medium">{coopName}</dd>
                </div>
                <div>
                  <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                    Nguồn gốc
                  </dt>
                  <dd className="mt-0.5 font-medium">{batch.origin}</dd>
                </div>
                <div>
                  <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                    Thời gian thu hoạch
                  </dt>
                  <dd className="tnum mt-0.5 font-medium">
                    {full(batch.harvestedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                    Hoàn tất xử lý / đóng gói
                  </dt>
                  <dd className="tnum mt-0.5 font-medium">
                    {completedAt ? full(completedAt) : "Đang thực hiện"}
                  </dd>
                </div>
              </dl>

              {/* 6 bước Quy trình Thực địa */}
              <div className="px-6 py-5">
                <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
                  <ShieldCheck className="size-4 text-leaf-600" />
                  Quy trình Thực địa BioFresh
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sáu bước bắt buộc được ghi nhận tại kho đóng gói, kèm mốc thời
                  gian.
                </p>

                <ol className="mt-4 flex flex-col">
                  {PROTOCOL_STEPS.map((def, i) => {
                    const step = batch.protocol.find((p) => p.key === def.key);
                    const done = step?.status === "done";
                    const last = i === PROTOCOL_STEPS.length - 1;
                    return (
                      <li key={def.key} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span
                            className={cn(
                              "tnum flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                              done
                                ? "bg-leaf-600 text-white"
                                : "bg-muted text-muted-foreground ring-1 ring-border"
                            )}
                          >
                            {done ? <Check className="size-3.5" /> : i + 1}
                          </span>
                          {!last ? (
                            <span
                              className={cn(
                                "my-1 w-0.5 flex-1",
                                done ? "bg-leaf-300" : "bg-border"
                              )}
                            />
                          ) : null}
                        </div>
                        <div className={cn("pb-5", last && "pb-0")}>
                          <p
                            className={cn(
                              "text-sm font-medium",
                              !done && "text-muted-foreground"
                            )}
                          >
                            {def.label}
                          </p>
                          <p className="tnum mt-0.5 text-xs text-muted-foreground">
                            {done ? full(step?.at) : "Chưa ghi nhận"}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>

              {batch.publicNote ? (
                <div className="border-t border-border bg-leaf-50 px-6 py-4">
                  <p className="text-xs font-semibold tracking-wide text-leaf-700 uppercase">
                    Ghi chú của đơn vị sản xuất
                  </p>
                  <p className="mt-1 text-sm text-leaf-900/85">
                    {batch.publicNote}
                  </p>
                </div>
              ) : null}

              <div className="border-t border-border px-6 py-4">
                <p className="text-xs text-muted-foreground">
                  Trang này chỉ để xem. BioFresh không hiển thị giá, danh sách khách
                  mua, tồn kho hay dữ liệu quyết định nội bộ của đơn vị sản xuất.
                </p>
              </div>
            </>
          ) : hydrated ? (
            <div className="px-6 py-8">
              <p className="text-sm text-muted-foreground">
                Mã QR này không khớp với lô nào trong hệ thống. Vui lòng liên hệ đơn
                vị sản xuất để được xác nhận.
              </p>
            </div>
          ) : null}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          BioFresh OS · Hộ chiếu Quy trình theo lô
        </p>
      </div>
    </div>
  );
}
