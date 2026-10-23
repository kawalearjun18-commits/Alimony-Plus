
export type CnrCase = {
  cnrNumber: string;
  caseTitle: string;
  courtName: string;
  caseStatus: string;
  currentStage: string;
  nextHearingDate: string | null;
  courtHall: string | null;
};

function optionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

export function formatCourtDate(value: string | null): string {
  if (!value) return "Not available";

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) return "Date unavailable";

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function parseCnrResponse(input: unknown): CnrCase {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new Error("Invalid CNR response.");
  }

  const data = input as Record<string, unknown>;

  const cnrNumber = optionalText(data.cnrNumber);
  const caseTitle = optionalText(data.caseTitle);
  const courtName = optionalText(data.courtName);
  const caseStatus = optionalText(data.caseStatus);
  const currentStage = optionalText(data.currentStage);

  if (
    !cnrNumber ||
    !caseTitle ||
    !courtName ||
    !caseStatus ||
    !currentStage
  ) {
    throw new Error(
      "CNR response is missing required case details."
    );
  }

  return {
    cnrNumber,
    caseTitle,
    courtName,
    caseStatus,
    currentStage,
    nextHearingDate: optionalText(data.nextHearingDate),
    courtHall: optionalText(data.courtHall),
  };
}
