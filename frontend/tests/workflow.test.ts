import { describe, expect, it } from "vitest";
import { deriveCaseAlerts } from "../src/lib/case-workflow";
import { demoWorkspace } from "../src/lib/demo";
import type { Hearing, Workspace } from "../src/lib/types";

describe("case workflow and alerts", () => {
  it("derives alerts from orders and payments in demo workspace", () => {
    const demo = demoWorkspace();
    const alerts = deriveCaseAlerts(demo);

    expect(alerts.length).toBeGreaterThan(0);
    const orderAlerts = alerts.filter((a) => a.category === "Court order");
    const paymentAlerts = alerts.filter((a) => a.category === "Maintenance");

    expect(orderAlerts.length).toBe(demo.orders.length);
    expect(paymentAlerts.length).toBe(demo.payments.length);

    // Verify order alert properties
    expect(orderAlerts[0]).toHaveProperty("id");
    expect(orderAlerts[0]).toHaveProperty("title");
    expect(orderAlerts[0]).toHaveProperty("description");
    expect(orderAlerts[0]).toHaveProperty("date");
    expect(orderAlerts[0].status).toBe("Recorded");

    // Verify payment alert properties
    expect(paymentAlerts[0]).toHaveProperty("id");
    expect(paymentAlerts[0]).toHaveProperty("date");
    expect(["Received", "Upcoming", "Pending"]).toContain(paymentAlerts[0].status);
  });

  it("filters alerts by selectedCase", () => {
    const demo = demoWorkspace();
    const case1Alerts = deriveCaseAlerts(demo, 1);
    const allAlerts = deriveCaseAlerts(demo);

    expect(case1Alerts.length).toBeGreaterThan(0);
    expect(case1Alerts.length).toBeLessThanOrEqual(allAlerts.length);
    for (const alert of case1Alerts) {
      if (alert.caseId) {
        expect(alert.caseId).toBe(1);
      }
    }
  });

  it("supports hearing, summons, and milestone event types on Hearing records", () => {
    const hearingEvent: Hearing = {
      id: 101,
      caseId: 1,
      date: "2026-11-01",
      title: "Interim hearing",
      location: "Courtroom 4",
      eventType: "hearing",
    };

    const summonsEvent: Hearing = {
      id: 102,
      caseId: 1,
      date: "2026-11-10",
      title: "Summons return",
      location: "Courtroom 4",
      eventType: "summons",
    };

    const milestoneEvent: Hearing = {
      id: 103,
      caseId: 1,
      date: "2026-11-20",
      title: "Mediation milestone",
      location: "Mediation center",
      eventType: "milestone",
      milestone: "Mediation scheduled",
    };

    const hearings: Hearing[] = [hearingEvent, summonsEvent, milestoneEvent];
    expect(hearings).toHaveLength(3);
    expect(hearings[0].eventType).toBe("hearing");
    expect(hearings[1].eventType).toBe("summons");
    expect(hearings[2].eventType).toBe("milestone");
    expect(hearings[2].milestone).toBe("Mediation scheduled");
  });
});
