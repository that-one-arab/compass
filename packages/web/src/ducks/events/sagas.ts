import { call, put, takeLatest, select } from "@redux-saga/core/effects";
import { normalize, schema } from "normalizr";
import dayjs from "dayjs";

import { Params_Events_Wip, Schema_Event } from "@core/types/event.types";

import { NormalizedAsyncActionPayload } from "@web/common/types/entities";
import { YEAR_MONTH_DAY_FORMAT } from "@web/common/constants/dates";

import { EventApi } from "@web/ducks/events/event.api";
import {
  createEventSlice,
  deleteEventSlice,
  editEventSlice,
  eventsEntitiesSlice,
  getCurrentMonthEventsSlice,
  getFutureEventsSlice,
  getWeekEventsSlice,
} from "./slice";
import {
  CreateEventAction,
  Payload_DeleteEvent,
  EditEventAction,
  GetEventsSagaResponse,
  GetEventsSuccessResponse,
  GetPaginatedEventsAction,
  GetWeekEventsAction,
} from "./types";
import { selectPaginatedEventsBySectionType } from "./selectors";

function* getEventsSaga(payload: Params_Events_Wip) {
  const res: GetEventsSuccessResponse = (yield call(
    EventApi.get,
    payload
  )) as GetEventsSuccessResponse;

  const eventsSchema = new schema.Entity("events", {}, { idAttribute: "_id" });
  const normalizedEvents = normalize<Schema_Event>(res.data, [eventsSchema]);

  yield put(
    eventsEntitiesSlice.actions.insert(normalizedEvents.entities.events)
  );

  return {
    ...res,
    data: normalizedEvents.result as NormalizedAsyncActionPayload,
  };
}

function* getWeekEventsSaga({ payload }: GetWeekEventsAction) {
  try {
    const data: GetEventsSagaResponse = (yield call(
      getEventsSaga,
      payload
    )) as GetEventsSagaResponse;

    yield put(getWeekEventsSlice.actions.success(data));
  } catch (error) {
    yield put(getWeekEventsSlice.actions.error());
  }
}

function* getCurrentMonthEventsSaga({ payload }: GetPaginatedEventsAction) {
  try {
    const startDate = dayjs().startOf("month").format(YEAR_MONTH_DAY_FORMAT);
    const endDate = dayjs().endOf("month").format(YEAR_MONTH_DAY_FORMAT);
    const data: GetEventsSagaResponse = (yield call(getEventsSaga, {
      ...payload,
      startDate,
      endDate,
    })) as GetEventsSagaResponse;

    yield put(getCurrentMonthEventsSlice.actions.success(data));
  } catch (error) {
    yield put(getCurrentMonthEventsSlice.actions.error());
  }
}

function* getFutureEventsSaga({ payload }: GetPaginatedEventsAction) {
  try {
    const startDate = dayjs().endOf("month").format(YEAR_MONTH_DAY_FORMAT);
    const data: GetEventsSagaResponse = (yield call(getEventsSaga, {
      ...payload,
      startDate,
    })) as GetEventsSagaResponse;

    yield put(getFutureEventsSlice.actions.success(data));
  } catch (error) {
    yield put(getFutureEventsSlice.actions.error());
  }
}

function* getEverySectionEvents() {
  const currentMonthEvents: GetEventsSagaResponse = (yield select((state) =>
    selectPaginatedEventsBySectionType(state, "currentMonth")
  )) as GetEventsSagaResponse;

  const futureEvents: GetEventsSagaResponse = (yield select((state) =>
    selectPaginatedEventsBySectionType(state, "future")
  )) as GetEventsSagaResponse;

  const weekEvents: GetEventsSagaResponse = (yield select((state) =>
    selectPaginatedEventsBySectionType(state, "week")
  )) as GetEventsSagaResponse;

  yield put(getCurrentMonthEventsSlice.actions.request(currentMonthEvents));
  yield put(getFutureEventsSlice.actions.request(futureEvents));
  yield put(getWeekEventsSlice.actions.request(weekEvents));
}

function* createEventSaga({ payload }: CreateEventAction) {
  try {
    yield call(EventApi.create, payload);
    yield put(createEventSlice.actions.success());

    yield call(getEverySectionEvents);
  } catch (error) {
    yield put(createEventSlice.actions.error());
  }
}

function* deleteEventSaga({ payload }: Payload_DeleteEvent) {
  try {
    yield call(EventApi.delete, payload._id);
    yield put(deleteEventSlice.actions.success());

    yield call(getEverySectionEvents);
  } catch (error) {
    yield put(deleteEventSlice.actions.error());
  }
}

function* editEventSaga({ payload }: EditEventAction) {
  try {
    yield call(EventApi.edit, payload._id, payload.event);
    yield put(editEventSlice.actions.success());
    yield call(getEverySectionEvents);
  } catch (error) {
    yield put(editEventSlice.actions.error());
  }
}

export function* eventsSagas() {
  yield takeLatest(getWeekEventsSlice.actions.request, getWeekEventsSaga);
  yield takeLatest(
    getCurrentMonthEventsSlice.actions.request,
    getCurrentMonthEventsSaga
  );
  yield takeLatest(getFutureEventsSlice.actions.request, getFutureEventsSaga);
  yield takeLatest(createEventSlice.actions.request, createEventSaga);
  yield takeLatest(editEventSlice.actions.request, editEventSaga);
  yield takeLatest(deleteEventSlice.actions.request, deleteEventSaga);
}
