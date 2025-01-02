import { AxiosResponse } from "axios";
import { normalize } from "normalizr";
import { call, put, select } from "redux-saga/effects";
import { Schema_Event } from "@core/types/event.types";
import { Payload_NormalizedAsyncAction } from "@web/common/types/entity.types";
import {
  replaceIdWithOptimisticId,
  handleError,
} from "@web/common/utils/event.util";
import { RootState } from "@web/store";

import { Action_Someday_Reorder } from "../slices/someday.slice.types";
import { EventApi } from "../event.api";
import {
  Action_ConvertSomedayEvent,
  Response_GetEventsSaga,
  Action_DeleteEvent,
  Action_GetEvents,
  Response_GetEventsSuccess,
} from "../event.types";
import { selectEventById } from "../selectors/event.selectors";
import { eventsEntitiesSlice } from "../slices/event.slice";
import { getSomedayEventsSlice } from "../slices/someday.slice";
import {
  insertOptimisticEvent,
  replaceOptimisticId,
  normalizedEventsSchema,
} from "./saga.util";

export function* convertSomedayEvent({ payload }: Action_ConvertSomedayEvent) {
  const { _id, updatedFields } = payload;
  const optimisticId: string | null = null;

  try {
    //get grid event from store
    const currEvent = (yield select((state: RootState) =>
      selectEventById(state, _id)
    )) as Response_GetEventsSaga;
    const gridEvent = { ...currEvent, ...updatedFields };
    // remove extra props before sending to DB
    delete gridEvent.order;
    delete gridEvent.recurrence;

    //get optimisitcGridEvent
    const optimisticGridEvent = replaceIdWithOptimisticId(gridEvent);
    yield put(getSomedayEventsSlice.actions.remove({ _id }));
    yield* insertOptimisticEvent(optimisticGridEvent, false);

    // call API
    const response = (yield call(
      EventApi.edit,
      _id,
      gridEvent,
      {}
    )) as AxiosResponse<Schema_Event>;

    const convertedEvent = response.data;

    // replace ids
    yield* replaceOptimisticId(
      optimisticGridEvent._id,
      convertedEvent._id as string,
      false
    );
  } catch (error) {
    if (optimisticId) {
      yield put(eventsEntitiesSlice.actions.delete({ _id: optimisticId }));
    }
    yield put(getSomedayEventsSlice.actions.insert(_id));
    yield put(getSomedayEventsSlice.actions.error());
    handleError(error as Error);
  }
}

export function* deleteSomedayEvent({ payload }: Action_DeleteEvent) {
  try {
    yield put(eventsEntitiesSlice.actions.delete(payload));

    yield call(EventApi.delete, payload._id);
  } catch (error) {
    yield put(getSomedayEventsSlice.actions.error());
    handleError(error as Error);
    yield put(getSomedayEventsSlice.actions.request());
  }
}

export function* getSomedayEvents({ payload }: Action_GetEvents) {
  try {
    const res = (yield call(EventApi.get, {
      someday: true,
      startDate: payload.startDate,
      endDate: payload.endDate,
    })) as Response_GetEventsSuccess;

    const normalizedEvents = normalize<Schema_Event>(res.data, [
      normalizedEventsSchema(),
    ]);
    yield put(
      eventsEntitiesSlice.actions.insert(normalizedEvents.entities.events)
    );

    const data = {
      data: normalizedEvents.result as Payload_NormalizedAsyncAction,
    };
    yield put(getSomedayEventsSlice.actions.success(data));
  } catch (error) {
    yield put(getSomedayEventsSlice.actions.error());
  }
}

export function* reorderSomedayEvents({ payload }: Action_Someday_Reorder) {
  try {
    yield call(EventApi.reorder, payload);
  } catch (error) {
    yield put(getSomedayEventsSlice.actions.error());
    handleError(error as Error);
  }
}
