import type { Workspace } from "./types";
import { money } from "./ledger";

export type CaseAlertCategory = "Court order" | "Maintenance";

export type CaseAlertStatus =
  | "Received"
  | "Recorded"
  | "Paid"
  | "Upcoming"
  | "Overdue"
  | "Pending"
  | (string & {});

export type CaseAlert = {
  id: string | number;
  caseId?: number;
  category: "Court order" | "Maintenance" | string;
  title: string;
  description: string;
  date: string;
  status: string;
};

/**
 * Derives in-app case alerts and reminders from recorded orders and payments
 * in the active session. This runs entirely in-memory and does not connect to
 * external court services or trigger external push/SMS notifications.
 */
export function deriveCaseAlerts(
  data: Workspace,
  selectedCase?: number,
): CaseAlert[] {
  const alerts: CaseAlert[] = [];

  const validProceedingIds = new Set(
    data.proceedings
      .filter((p) => !selectedCase || p.caseId === selectedCase)
      .map((p) => p.id),
  );

  for (const order of data.orders) {
    if (selectedCase && !validProceedingIds.has(order.proceedingId)) continue;
    const proc = data.proceedings.find((p) => p.id === order.proceedingId);
    alerts.push({
      id: `order-${order.id}`,
      caseId: proc?.caseId,
      category: "Court order",
      title: order.orderType || `Order #${order.id}`,
      description:
        order.description ||
        `Recorded order for ${money(order.amount)} per month`,
      date:
        order.orderDate ||
        order.effectiveDate ||
        new Date().toISOString().slice(0, 10),
      status: "Recorded",
    });
  }

  const validOrderIds = new Set(
    data.orders
      .filter((o) => !selectedCase || validProceedingIds.has(o.proceedingId))
      .map((o) => o.id),
  );

  for (const payment of data.payments) {
    if (selectedCase && !validOrderIds.has(payment.orderId)) continue;
    const order = data.orders.find((o) => o.id === payment.orderId);
    const proc = order
      ? data.proceedings.find((p) => p.id === order.proceedingId)
      : undefined;

    const statusLabel =
      payment.status === "RECEIVED"
        ? "Received"
        : payment.status === "PENDING"
          ? "Upcoming"
          : "Pending";

    alerts.push({
      id: `payment-${payment.id}`,
      caseId: proc?.caseId,
      category: "Maintenance",
      title: `Maintenance payment ${payment.period ? `(${payment.period})` : ""}`.trim(),
      description: payment.reference
        ? `Ref: ${payment.reference} · Amount: ${money(payment.amount)}`
        : `Payment of ${money(payment.amount)} recorded`,
      date: payment.paymentDate.slice(0, 10),
      status: statusLabel,
    });
  }

  return alerts.sort((a, b) => b.date.localeCompare(a.date));
}
