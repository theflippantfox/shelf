/**
 * /api/analytics/pnl — Profit & Loss data for the active shop.
 * Calendar, daily breakdown, top products, and bill-by-bill data.
 */
import { json } from "@sveltejs/kit";
import { userClientFromCtx } from "$lib/server/supabase";
import {
  parsePeriod,
  buildProfitCalendar,
  type Period,
} from "$lib/utils/analytics";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const toNum = (v: any): number => {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const itemSelect = (extra: string) =>
  `id, sale_id, product_id, product_name, product_sku, qty, unit_price, cost_at_sale, line_total, ` +
  `product:products(id, name, sku, price, cost_price, category:categories(id, name, color)), ` +
  `sales!inner(shop_id, created_at)${extra}`;

export const GET = async ({
  cookies,
  locals,
  url,
  setHeaders,
}: import("@sveltejs/kit").RequestEvent) => {
  const shop = locals.currentShop;
  if (!shop) return json({});

  const shopId = shop.id;
  const shopTz = shop.timezone ?? "UTC";
  const currency = shop.currency_symbol ?? "$";
  const period: Period = parsePeriod(url, shopTz);

  const tab = url.searchParams.get("tab") ?? "calendar";
  const monthParam = url.searchParams.get("month");

  const supabase = userClientFromCtx({ cookies } as any);

  const targetMonth = monthParam
    ? dayjs.tz(`${monthParam}-01`, shopTz)
    : dayjs().tz(shopTz);

  const calMonthFrom = targetMonth.startOf("month").toISOString();
  const calMonthTo = targetMonth.endOf("month").toISOString();

  // Fetch products for cost map
  const { data: stockProducts = [] } = await supabase
    .from("products")
    .select("id, name, price, cost_price, qty, category_id")
    .eq("shop_id", shopId)
    .is("archived_at", null);

  const productCostMap = new Map<string, number>(
    ((stockProducts as any[]) ?? []).map(
      (p: any) => [p.id, p.cost_price ?? 0] as const,
    ),
  );

  // Parallel data fetches
  const [
    { data: calendarItems = [] },
    { data: periodItems = [] },
    { data: compareItems = [] },
    { data: periodSales = [] },
  ] = await Promise.all([
    supabase
      .from("sale_items")
      .select(itemSelect(""))
      .eq("sales.shop_id", shopId)
      .gte("sales.created_at", calMonthFrom)
      .lte("sales.created_at", calMonthTo),
    supabase
      .from("sale_items")
      .select(itemSelect(""))
      .eq("sales.shop_id", shopId)
      .gte("sales.created_at", period.from)
      .lte("sales.created_at", period.to),
    supabase
      .from("sale_items")
      .select(itemSelect(""))
      .eq("sales.shop_id", shopId)
      .gte("sales.created_at", period.cFrom)
      .lte("sales.created_at", period.cTo),
    supabase
      .from("sales")
      .select(
        "id, sale_ref, total, subtotal, tax_amount, payment_method, created_at, customer_id, customer:customers(name)",
      )
      .eq("shop_id", shopId)
      .is("voided_at", null)
      .gte("created_at", period.from)
      .lte("created_at", period.to)
      .order("created_at", { ascending: false }),
  ]);

  // Direct product cost fallback
  const allItems = [
    ...((calendarItems as any[]) ?? []),
    ...((periodItems as any[]) ?? []),
    ...((compareItems as any[]) ?? []),
  ];
  const soldProductIds = Array.from(
    new Set(
      allItems.map((it: any) => it.product_id).filter(Boolean) as string[],
    ),
  );

  if (soldProductIds.length && productCostMap.size === 0) {
    const { data: directProducts = [] } = await supabase
      .from("products")
      .select("id, cost_price")
      .in("id", soldProductIds);
    for (const p of directProducts as any[]) {
      const cost = Number(p.cost_price ?? 0);
      if (cost > 0) productCostMap.set(p.id, cost);
    }
  }

  // Build calendar
  const profitCalendar = buildProfitCalendar(
    calendarItems as any[],
    productCostMap,
    shopTz,
    targetMonth,
  );

  // Cost helpers
  const unitCost = (it: any): number => {
    const snap = toNum(it.cost_at_sale);
    if (snap > 0) return snap;
    const mapped = productCostMap.get(it.product_id);
    if (mapped !== undefined && mapped > 0) return mapped;
    return toNum(it.product?.cost_price);
  };
  const itemCogs = (it: any) => unitCost(it) * toNum(it.qty);

  // Current period totals
  const pItems = (periodItems as any[]) ?? [];
  const cItems = (compareItems as any[]) ?? [];
  let curRev = 0,
    curCogs = 0;
  for (const it of pItems) {
    curRev += toNum(it.line_total);
    curCogs += itemCogs(it);
  }
  const curProfit = curRev - curCogs;
  const curMargin =
    curRev > 0 ? Math.round((curProfit / curRev) * 1000) / 10 : 0;

  // Compare period totals
  let prevRev = 0,
    prevCogs = 0;
  for (const it of cItems) {
    prevRev += toNum(it.line_total);
    prevCogs += itemCogs(it);
  }
  const prevProfit = prevRev - prevCogs;
  const prevMargin =
    prevRev > 0 ? Math.round((prevProfit / prevRev) * 1000) / 10 : 0;

  const delta = (cur: number, prev: number) => {
    if (prev === 0) {
      const dir: "up" | "flat" = cur > 0 ? "up" : "flat";
      return { pct: cur > 0 ? 100 : 0, direction: dir };
    }
    const pct = Math.round(((cur - prev) / Math.abs(prev)) * 100);
    const dir: "up" | "down" | "flat" =
      pct > 0 ? "up" : pct < 0 ? "down" : "flat";
    return { pct: Math.abs(pct), direction: dir };
  };

  // Day-by-day breakdown
  const dayMap: Record<
    string,
    { revenue: number; cogs: number; count: number }
  > = {};
  for (const it of pItems) {
    const ca = it.sales?.created_at;
    if (!ca) continue;
    const key = dayjs(ca).tz(shopTz).format("YYYY-MM-DD");
    if (!dayMap[key]) dayMap[key] = { revenue: 0, cogs: 0, count: 0 };
    dayMap[key].revenue += toNum(it.line_total);
    dayMap[key].cogs += itemCogs(it);
  }
  const daySaleIds: Record<string, Set<string>> = {};
  for (const it of pItems) {
    const ca = it.sales?.created_at;
    if (!ca) continue;
    const key = dayjs(ca).tz(shopTz).format("YYYY-MM-DD");
    if (!daySaleIds[key]) daySaleIds[key] = new Set();
    daySaleIds[key].add(it.sale_id);
  }
  const dailyRows = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({
      date,
      label: dayjs(date).tz(shopTz).format("D MMM"),
      revenue: Math.round(d.revenue),
      cogs: Math.round(d.cogs),
      profit: Math.round(d.revenue - d.cogs),
      margin:
        d.revenue > 0
          ? Math.round(((d.revenue - d.cogs) / d.revenue) * 1000) / 10
          : 0,
      count: daySaleIds[date]?.size ?? 0,
    }));

  // Top products by profit
  const prodMap: Record<
    string,
    { name: string; sku: string; revenue: number; cogs: number; units: number }
  > = {};
  for (const it of pItems) {
    const name = it.product_name ?? it.product?.name ?? "Unknown";
    const sku = it.product_sku ?? it.product?.sku ?? "";
    const key = it.product_id || sku || name;
    if (!prodMap[key])
      prodMap[key] = { name, sku, revenue: 0, cogs: 0, units: 0 };
    prodMap[key].revenue += toNum(it.line_total);
    prodMap[key].cogs += itemCogs(it);
    prodMap[key].units += toNum(it.qty);
  }
  const topProducts = Object.values(prodMap)
    .map((p) => ({
      ...p,
      profit: Math.round(p.revenue - p.cogs),
      margin:
        p.revenue > 0
          ? Math.round(((p.revenue - p.cogs) / p.revenue) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10);

  // Cost coverage
  const withCost = pItems.filter((it) => unitCost(it) > 0).length;
  const coverage =
    pItems.length > 0 ? Math.round((withCost / pItems.length) * 100) : 0;

  // Bill-by-bill
  const saleItemsMap: Record<string, { revenue: number; cogs: number }> = {};
  for (const it of pItems) {
    if (!saleItemsMap[it.sale_id])
      saleItemsMap[it.sale_id] = { revenue: 0, cogs: 0 };
    saleItemsMap[it.sale_id].revenue += toNum(it.line_total);
    saleItemsMap[it.sale_id].cogs += itemCogs(it);
  }

  const bills = ((periodSales as any[]) ?? []).map((s: any) => {
    const si = saleItemsMap[s.id] ?? { revenue: 0, cogs: 0 };
    const rev = Math.round(si.revenue);
    const cog = Math.round(si.cogs);
    const prof = rev - cog;
    return {
      id: s.id,
      ref: s.sale_ref ?? s.id.slice(0, 8),
      date: s.created_at,
      customer: (s.customer as any)?.name ?? null,
      revenue: rev,
      cogs: cog,
      profit: prof,
      margin: rev > 0 ? Math.round((prof / rev) * 1000) / 10 : 0,
    };
  });

  setHeaders({ "cache-control": "private, max-age=60" });

  return json({
    pnl: {
      shopTz,
      currency,
      tab,
      period,
      profitCalendar,
      calendarMonth: targetMonth.format("YYYY-MM"),
      kpis: {
        revenue: {
          current: Math.round(curRev),
          previous: Math.round(prevRev),
          delta: delta(curRev, prevRev),
        },
        cogs: {
          current: Math.round(curCogs),
          previous: Math.round(prevCogs),
          delta: delta(curCogs, prevCogs),
        },
        profit: {
          current: Math.round(curProfit),
          previous: Math.round(prevProfit),
          delta: delta(curProfit, prevProfit),
        },
        margin: {
          current: curMargin,
          previous: prevMargin,
          delta: delta(curMargin, prevMargin),
        },
        coverage,
      },
      dailyRows,
      topProducts,
      bills,
    },
  });
};
