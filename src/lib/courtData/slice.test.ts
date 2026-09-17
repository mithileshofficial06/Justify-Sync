import { describe, expect, it } from "vitest";
import { mapSlice, parseCsv, parseDate, sectionIdFor, toRecords } from "./slice";

describe("parseCsv", () => {
  it("handles quotes, embedded commas, escaped quotes and CRLF", () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi"""\r\n')).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"'],
    ]);
  });
});

describe("parseDate", () => {
  it.each([
    ["2017-03-09", "2017-03-09"],
    ["09-03-2017", "2017-03-09"],
    ["9/3/2017", "2017-03-09"],
  ])("%s", (raw, iso) => {
    expect(parseDate(raw)?.toISOString().slice(0, 10)).toBe(iso);
  });

  it("rejects impossible dates instead of rolling them over", () => {
    expect(parseDate("31-02-2017")).toBeNull();
    expect(parseDate("")).toBeNull();
  });
});

describe("sectionIdFor", () => {
  it.each([
    ["Indian Penal Code", "379", "IPC_379"],
    ["The Indian Penal Code, 1860", "Sec. 498A", "IPC_498A"],
    ["IPC", "379 IPC", "IPC_379"],
    ["Narcotic Drugs and Psychotropic Substances Act", "21(b)", "NDPS_21_B"],
    ["Arms Act, 1959", "25 (1B)(a)", "ARMS_25_1B_A"],
  ])("%s / %s", (act, section, id) => {
    expect(sectionIdFor(act, section)).toBe(id);
  });

  it("returns null for an act it does not know", () => {
    expect(sectionIdFor("Motor Vehicles Act", "185")).toBeNull();
  });
});

describe("mapSlice", () => {
  const kb = new Set(["IPC_379", "IPC_323", "IPC_325"]);
  const csv = `case_ref,act,section,filing_date,decision_date,arrest_date,snapshot_date
A1,Indian Penal Code,325,2016-01-10,,,2018-08-01
A1,Indian Penal Code,323,2016-01-10,,,2018-08-01
A2,Indian Penal Code,379,2017-05-01,2018-01-01,,2018-08-01
A3,Indian Penal Code,379,2017-05-01,,2017-04-20,2018-08-01
A4,Indian Penal Code,420,2017-05-01,,,2018-08-01
A5,Indian Penal Code,379,2017-05-01,,,2018-08-01
A5,Motor Vehicles Act,185,2017-05-01,,,2018-08-01
A6,Indian Penal Code,379,,,,2018-08-01`;
  const result = mapSlice(toRecords(parseCsv(csv)), kb);

  it("groups multi-section cases and keeps only pending ones fully covered by the knowledge base", () => {
    expect(result.totalCases).toBe(6);
    expect(result.cases.map((c) => c.caseRef)).toEqual(["A1", "A3"]);
    expect(result.cases[0].sectionIds).toEqual(["IPC_325", "IPC_323"]);
  });

  it("uses the filing date as a labelled proxy only when no arrest date exists", () => {
    const [a1, a3] = result.cases;
    expect(a1.arrestDateIsProxy).toBe(true);
    expect(a1.arrestDate.toISOString().slice(0, 10)).toBe("2016-01-10");
    expect(a3.arrestDateIsProxy).toBe(false);
    expect(a3.arrestDate.toISOString().slice(0, 10)).toBe("2017-04-20");
  });

  it("counts every skip by reason and records which sections blocked cases", () => {
    expect(result.skipped).toEqual({ disposed: 1, section_not_in_kb: 2, missing_date: 1, future_date: 0 });
    expect(Object.fromEntries(result.unmatchedSections)).toEqual({ "IPC 420": 1, "Motor Vehicles Act 185": 1 });
  });
});
