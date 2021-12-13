/* eslint-disable @typescript-eslint/no-namespace */
import { Event, Event$NoId } from "@compass/core/src/types/event.types";

import { gSchema$Event } from "../../../declarations";
import { BaseError } from "../errors/errors.base";

export namespace GcalMapper {
  const notCancelled = (e: gSchema$Event) => {
    return e.status && e.status !== "cancelled";
  };

  export const toCompass = (
    userId: string,
    events: gSchema$Event[]
  ): Event[] | Event$NoId[] => {
    const mapped = events
      .filter(notCancelled) //todo dont remove this for sync updates
      .map((e: gSchema$Event) => _toCompass(userId, e));

    return mapped;
  };

  export const toGcal = (userId: string, event: Event$NoId): gSchema$Event => {
    const gcalEvent = {
      summary: event.summary,
      description: event.description,
      start: event.start,
      end: event.end,
    };

    return gcalEvent;
  };
}

const _toCompass = (
  userId: string,
  gEvent: gSchema$Event
): Event | Event$NoId => {
  // TODO - move to validation service
  if (!gEvent.id) {
    throw new BaseError(
      "Bad Google Event Id",
      "You got a google event without an Id, something is off",
      500,
      false
    );
  }
  const gEventId = gEvent.id ? gEvent.id : "uh oh";
  const summary = gEvent.summary ? gEvent.summary : "untitled";

  const compassEvent = {
    gEventId: gEventId,
    user: userId,
    priorities: [],
    summary: summary,
    description: gEvent.description,
    start: gEvent.start,
    end: gEvent.end,
  };
  return compassEvent;
};
