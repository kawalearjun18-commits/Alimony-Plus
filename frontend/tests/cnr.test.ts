
import { describe, expect, it } from "vitest";
import {
  formatCourtDate,
  parseCnrResponse,
} from "../src/lib/cnr";

const validResponse = {
  cnrNumber: "UPLK010012342026",
  caseTitle: "Synthetic maintenance case",
  courtName: "Example Family Court",
  caseStatus: "Pending",
  currentStage: "Evidence",
  nextHearingDate: "2026-10-16",
  courtHall: "Courtroom 3",
};

describe("CNR response parsing", () => {
  it("parses a valid response", () => {
    expect(parseCnrResponse(validResponse)).toEqual(
      validResponse
    );
  });

  it("rejects null and array responses", () => {
    expect(() => parseCnrResponse(null)).toThrow(
      "Invalid CNR response."
    );

    expect(() => parseCnrResponse([])).toThrow(
      "Invalid CNR response."
    );
  });

  it("rejects responses missing required fields", () => {
    const { cnrNumber: _cnrNumber, ...incomplete } =
      validResponse;

    expect(() => parseCnrResponse(incomplete)).toThrow(
      "CNR response is missing required case details."
    );
  });

  it("converts blank optional fields to null", () => {
    expect(
      parseCnrResponse({
        ...validResponse,
        nextHearingDate: " ",
        courtHall: "",
      })
    ).toMatchObject({
      nextHearingDate: null,
      courtHall: null,
    });
  });
});

describe("court date formatting", () => {
  it("formats a valid date in Indian locale", () => {
    expect(formatCourtDate("2026-10-16")).toBe(
      "16 Oct 2026"
    );
  });

  it("handles missing and invalid dates", () => {
    expect(formatCourtDate(null)).toBe("Not available");

    expect(formatCourtDate("16/10/2026")).toBe(
      "Date unavailable"
    );

    expect(formatCourtDate("2026-02-30")).toBe(
      "Date unavailable"
    );
  });
});
