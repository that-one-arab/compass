import { allDayEventsMinimal } from "@core/test-data/data.allDayEvents";
import { allDayEvents } from "@core/test-data/data.allDayEvents2";

import {
  getAllDayCounts,
  getAllDayEventWidth,
  orderEvents,
} from "../event.helpers";

describe("getAllDayCounts", () => {
  const allDayCounts = getAllDayCounts(allDayEvents);
  it("adds dates up correctly", () => {
    expect(allDayCounts["2022-02-07"]).toBe(3);
    expect(allDayCounts["2022-02-08"]).toBe(1);
    expect(allDayCounts["2022-02-09"]).toBe(1);
    expect(allDayCounts["2022-02-11"]).toBe(1);
  });

  it("returns one key for unique date", () => {
    const numDates = Object.keys(allDayCounts).length;
    expect(numDates).toBe(4); //07, 08, 09, 11
  });
});

describe("getAllDayEventWidth", () => {
  it("foo", () => {
    expect(1).toBe(1);
  });
});

describe("orderAllDayEvents", () => {
  const events = orderEvents(allDayEventsMinimal);
  it("doesn't add or remove any events", () => {
    expect(events.length).toEqual(allDayEventsMinimal.length);
  });
  it("sets the order for each event", () => {
    events.forEach((e) => {
      if (e.allDayOrder === undefined) throw Error("missing order");
    });
  });
  it("orders title descending (c, b, a)", () => {
    const first = events.filter((e) => e.title === "test1")[0];
    expect(first.allDayOrder).toBe(5);

    const fifth = events.filter((e) => e.title === "test5")[0];
    expect(fifth.allDayOrder).toBe(1);
  });

  it("sets unique order for two events with same title", () => {
    const dup1 = events.filter((e) => e.title === "test3duplicate")[0];
    const dup2 = events.filter((e) => e.title === "test3duplicate")[1];
    expect(dup1.allDayOrder).not.toEqual(dup2.allDayOrder);
  });
});
