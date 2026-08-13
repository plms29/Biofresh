"use client";

import Link from "next/link";
import * as React from "react";
import {
  ArrowRight,
  Boxes,
  ClipboardList,
  Coins,
  PackageSearch,
  ShoppingBasket,
  Sprout,
  Warehouse,
} from "lucide-react";
import { ROLE_META, type Role } from "@/types";
import { useBio } from "@/store/use-biofresh";
import { useHydrated, useNow } from "@/hooks/use-client-state";
import { computeAlerts } from "@/lib/domain/alerts";
import {
  sellableInventory,
  unallocatedLots,
  valueAtRisk,
} from "@/lib/domain/inventory";
import { dt, kg, vndShort } from "@/lib/domain/format";
import { AlertList } from "@/components/common/alert-list";
import { Kpi, PageHeader, SectionTitle } from "@/components/common/layout-bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FLOW = [
  {
    step: "1",
    role: "sales" as Role,
    title: "Nhập nhu cầu & tiêu chuẩn",
    text: "Khách mua vẫn gửi đơn qua Zalo, thư điện tử, điện thoại. Bán hàng nhập vào hệ thống.",
    icon: ShoppingBasket,
  },
  {
    step: "2",
    role: "field" as Role,
    title: "Hướng dẫn hái trực quan",
    text: "Tiêu chuẩn khách mua tự chuyển thành hướng dẫn rút gọn cho ngoài vườn.",
    icon: Sprout,
  },
  {
    step: "3",
    role: "packhouse" as Role,
    title: "Nhập số lượng & hạng thực tế",
    text: "Kho đóng gói xác nhận lô và nhập kết quả phân loại bằng tay.",
    icon: Warehouse,
  },
  {
    step: "4",
    role: "sales" as Role,
    title: "Tồn kho thật cập nhật ngay",
    text: "Bán hàng thấy đúng số kg từng hạng có thể bán, kèm cảnh báo thiếu hàng.",
    icon: PackageSearch,
  },
  {
    step: "5",
    role: "manager" as Role,
    title: "Phòng quyết định hàng dư thừa",
    text: "Bán ngay / đổi kênh / bảo quản / chế biến / giữ hàng — có so sánh giá trị ròng.",
    icon: ClipboardList,
  },
  {
    step: "6",
    role: "packhouse" as Role,
    title: "Thực thi và đóng lô",
    text: "Ghi 6 bước Quy trình Thực địa BioFresh, xuất hàng, nhập kết quả thực tế.",
    icon: Boxes,
  },
];

export default function OverviewPage() {
  const hydrated = useHydrated();
  const now = useNow();
  const state = useBio();

  const alerts = React.useMemo(
    () =>
      now === 0
        ? []
        : computeAlerts({
            orders: state.orders,
            batches: state.batches,
            allocations: state.allocations,
            harvestOrders: state.harvestOrders,
            cases: state.cases,
            config: state.config,
            now,
          }),
    [state, now]
  );

  const inventory = sellableInventory(state.batches, state.allocations);
  const availableKg = inventory.reduce((s, r) => s + r.availableKg, 0);
  const surplus = unallocatedLots(state.batches, state.allocations);
  const surplusKg = surplus.reduce((s, l) => s + l.availableKg, 0);
  const atRisk = valueAtRisk(surplus);
  const openOrders = state.orders.filter(
    (o) => o.status === "confirmed" || o.status === "draft"
  );
  const openCases = state.cases.filter((c) => !c.chosenOptionId);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Tổng quan chuỗi"
        title="Một lô hàng, một dòng dữ liệu, bốn vai trò"
        description="BioFresh chỉ giải bốn điểm đứt gãy: nhu cầu khách mua không xuống được vườn, bán hàng không thấy tồn kho thật, kết quả phân loại không về kịp, và hàng dư thừa không ai quyết. Khách mua không cần đăng nhập — họ chỉ quét QR xem Hộ chiếu Quy trình."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Đơn đang mở"
          value={hydrated ? openOrders.length : "—"}
          sub={`${state.orders.filter((o) => o.status === "confirmed").length} đơn đã chốt`}
          icon={ShoppingBasket}
        />
        <Kpi
          label="Tồn kho có thể bán"
          value={hydrated ? kg(availableKg) : "—"}
          sub="Hạng A và B đã kiểm soát chất lượng"
          tone="leaf"
          icon={PackageSearch}
        />
        <Kpi
          label="Chưa phân bổ"
          value={hydrated ? kg(surplusKg) : "—"}
          sub={`${surplus.length} lô con đang chờ quyết định`}
          tone="sun"
          icon={Boxes}
        />
        <Kpi
          label="Tiền đang có nguy cơ"
          value={hydrated ? vndShort(atRisk) : "—"}
          sub="Theo giá tham chiếu nội bộ"
          tone="risk"
          icon={Coins}
        />
      </div>

      <section className="flex flex-col gap-3">
        <SectionTitle
          title="Luồng vận hành"
          hint="Mỗi bước là một màn hình theo vai trò, dùng chung một cơ sở dữ liệu."
        />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {FLOW.map((f) => (
            <Link
              key={f.step}
              href={ROLE_META[f.role].home}
              className="group rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-all hover:ring-leaf-300"
            >
              <div className="flex items-center gap-2.5">
                <span className="tnum flex size-7 items-center justify-center rounded-lg bg-leaf-50 text-sm font-semibold text-leaf-700 ring-1 ring-leaf-200">
                  {f.step}
                </span>
                <f.icon className="size-4 text-leaf-600" />
                <span className="ml-auto text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {ROLE_META[f.role].short}
                </span>
              </div>
              <p className="mt-3 font-heading text-sm font-semibold">{f.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-leaf-700 opacity-0 transition-opacity group-hover:opacity-100">
                Mở màn hình <ArrowRight className="size-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center justify-between">
              <span>Cảnh báo toàn hệ thống</span>
              <span className="tnum text-sm font-normal text-muted-foreground">
                {hydrated ? alerts.length : 0} mục
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hydrated ? <AlertList alerts={alerts} limit={6} /> : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle>Hoạt động gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {(hydrated ? state.activity.slice(0, 8) : []).map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-leaf-400" />
                  <div className="min-w-0">
                    <p className="text-sm">{a.text}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {a.actor} · {dt(a.at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {openCases.length > 0 && hydrated ? (
        <Link
          href="/manager"
          className="flex items-center gap-3 rounded-xl bg-leaf-700 px-5 py-4 text-white transition-colors hover:bg-leaf-800"
        >
          <ClipboardList className="size-5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">
              {openCases.length} ca quyết định đang chờ Quản lý
            </p>
            <p className="text-sm text-white/80">
              Tổng {kg(openCases.reduce((s, c) => s + c.unallocatedKg, 0))} chưa
              phân bổ.
            </p>
          </div>
          <ArrowRight className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}
