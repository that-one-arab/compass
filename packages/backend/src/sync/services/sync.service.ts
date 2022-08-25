import { GaxiosError } from "gaxios";
import { v4 as uuidv4 } from "uuid";
import { gCalendar, gSchema$Channel } from "@core/types/gcal";
import {
  Payload_Sync_Notif,
  Schema_Sync,
  Payload_Sync_Events,
} from "@core/types/sync.types";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import { Logger } from "@core/logger/winston.logger";
import { Collections } from "@backend/common/constants/collections";
import {
  error,
  GenericError,
  SyncError,
} from "@backend/common/errors/types/backend.errors";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { getCalendarsToSync } from "@backend/auth/services/auth.utils";
import { isAccessRevoked } from "@backend/common/services/gcal/gcal.utils";

import {
  assembleEventImports,
  deleteSync,
  isWatchingEvents,
  getCalendarInfo,
  importEvents,
  importEventsByCalendar,
  prepareEventSyncChannels,
  startWatchingGcalsById,
  updateSyncTokenForGcal,
  updateSyncDataFor,
  updateSyncTokenFor,
  updateRefreshedAt,
  deleteAllSyncData,
} from "./sync.service.helpers";
import { getChannelExpiration } from "./sync.utils";

const logger = Logger("app:sync.service");
class SyncService {
  deleteAllByUser = async (userId: string) => {
    const delRes = await mongoService.db
      .collection(Collections.SYNC)
      .deleteMany({ user: userId });
    return delRes;
  };

  handleGcalNotification = async (payload: Payload_Sync_Notif) => {
    logger.debug(JSON.stringify(payload, null, 2));

    if (payload.resourceState !== "exists") {
      logger.info("sync initialized");
      return "ignored";
    }

    const { userId, gCalendarId, nextSyncToken } = await getCalendarInfo(
      payload.resourceId
    );

    const syncInfo = {
      channelId: payload.channelId,
      expiration: payload.expiration,
      gCalendarId,
      nextSyncToken,
      resourceId: payload.resourceId,
    };

    const response = await importEventsByCalendar(userId, syncInfo);
    return response;
  };

  importFull = async (
    gcal: gCalendar,
    gCalendarIds: string[],
    userId: string
  ) => {
    const eventImports = gCalendarIds.map(async (gCalId) => {
      const { nextSyncToken } = await importEvents(userId, gcal, gCalId);
      await updateSyncTokenForGcal(userId, gCalId, nextSyncToken);
    });

    await Promise.all(eventImports);
  };

  importIncremental = async (userId: string, gcal?: gCalendar) => {
    if (!gcal) gcal = await getGcalClient(userId);

    const sync = await prepareEventSyncChannels(userId, gcal);

    const importEvents = assembleEventImports(userId, gcal, sync.google.events);

    const result = await Promise.all(importEvents);

    return result;
  };

  startWatchingGcal = async (
    userId: string,
    gCalendarId: string,
    gcal?: gCalendar
  ) => {
    const channelId = uuidv4();
    if (!gcal) gcal = await getGcalClient(userId);

    const alreadyWatching = await isWatchingEvents(userId, gCalendarId);
    if (alreadyWatching) {
      throw error(SyncError.CalendarWatchExists, "Skipped Start Watch");
    }

    logger.debug(
      `Setting up event watch for:\n\tgCalendarId: '${gCalendarId}'\n\tchannelId: '${channelId}'\n\tuser: ${userId}`
    );

    const expiration = getChannelExpiration();
    const { watch } = (await gcalService.watchEvents(
      gcal,
      gCalendarId,
      channelId,
      expiration
    )) as { watch: gSchema$Channel };

    const { resourceId } = watch;
    if (!resourceId) {
      throw error(SyncError.MissingResourceId, "Calendar Watch Failed");
    }

    const sync = await updateSyncDataFor("events", userId, {
      gCalendarId,
      channelId,
      resourceId,
      expiration,
    });

    return sync;
  };

  startWatchingGcals = async (userId: string, gcal: gCalendar) => {
    const { gCalendarIds, nextSyncToken } = await getCalendarsToSync(
      userId,
      gcal
    );

    await updateSyncTokenFor("calendarlist", userId, nextSyncToken);

    await startWatchingGcalsById(userId, gCalendarIds, gcal);
  };

  stopWatch = async (
    userId: string,
    channelId: string,
    resourceId: string,
    gcal?: gCalendar
  ) => {
    if (!gcal) gcal = await getGcalClient(userId);

    logger.debug(
      `Stopping watch for channelId: ${channelId} and resourceId: ${resourceId}`
    );
    const params = {
      requestBody: {
        id: channelId,
        resourceId: resourceId,
      },
    };

    try {
      const stopResult = await gcal.channels.stop(params);
      if (stopResult.status !== 204) {
        throw error(GenericError.NotSure, "Stop Failed");
      }

      await deleteSync(userId, "events", channelId);

      return {
        channelId: channelId,
        resourceId: resourceId,
      };
    } catch (e) {
      const _e = e as GaxiosError;
      const code = (_e.code as unknown as number) || 0;

      const msg = "Stop Ignored, Sync Deleted";

      const noAccess = isAccessRevoked(_e);
      if (noAccess) {
        logger.warn("Access revoked, cleaning data ...");
        await deleteAllSyncData(userId);
        throw error(SyncError.AccessRevoked, msg);
      }

      if (_e.code === "404" || code === 404) {
        await deleteSync(userId, "events", channelId);
        throw error(SyncError.ChannelDoesNotExist, msg);
      }

      logger.error(e);
      throw error(GenericError.NotSure, "Stop Failed");
    }
  };

  stopWatches = async (userId: string) => {
    logger.debug(`Stopping all gcal event watches for user: ${userId}`);

    const sync = (await mongoService.db
      .collection(Collections.SYNC)
      .findOne({ user: userId })) as unknown as Schema_Sync;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!sync || !sync.google.events) {
      throw error(SyncError.NoWatchesForUser, "Ignored Stop Request");
    }

    const gcal = await getGcalClient(userId);

    for (const es of sync.google.events) {
      await this.stopWatch(userId, es.channelId, es.resourceId, gcal);
    }

    const watchStopSummary = {
      watchStopCount: sync.google.events.length,
    };
    return watchStopSummary;
  };

  refreshWatch = async (
    userId: string,
    gcal: gCalendar,
    payload: Payload_Sync_Events
  ) => {
    await this.stopWatch(userId, payload.channelId, payload.resourceId, gcal);

    await this.startWatchingGcal(userId, payload.gCalendarId, gcal);

    await updateRefreshedAt(userId, payload.gCalendarId);
  };
}

export default new SyncService();

/* //--
OLDhandleGcalNotification = async (payload: Payload_Sync_Notif) => {
    try {
      const result = {
        params: undefined,
        init: undefined,
        watch: undefined,
        prep: undefined,
        events: undefined,
      };

      // There is new data to sync from GCal //
      if (payload.resourceState === "exists") {
        const { channelPrepResult, userId, gcal, nextSyncToken } =
          await OLDprepareSyncChannels(payload);

        result.watch = channelPrepResult;

        const params: Params_Sync_Gcal = {
          ...payload,
          userId: userId,
          nextSyncToken,
          // TODO use non-hard-coded calendarId once supporting non-'primary' calendars
          calendarId: GCAL_PRIMARY,
        };
        result.params = params;

        const prepResult = await OLDprepareUpdate(gcal, params);
        result.prep = prepResult;

        if (prepResult.operations.length > 0)
          result.events = await mongoService.db
            .collection(Collections.EVENT)
            .bulkWrite(prepResult.operations);
      }

      // syncFileLogger.debug(JSON.stringify(result, null, 2));
      syncFileLogger.debug(result);
      return result;
    } catch (e) {
      logger.error(e);
      syncFileLogger.error(e);
      return new BaseError("Sync Failed", e, Status.INTERNAL_SERVER, false);
    }
  };

  updateNextSyncToken = async (userId: string, nextSyncToken: string) => {
    const msg = `Failed to update the nextSyncToken for calendar record of user: ${userId}`;
    const err = new BaseError("Update Failed", msg, 500, true);

    try {
      // updates the primary calendar's nextSyncToken
      // query will need to be updated once supporting non-primary calendars
      const result = await mongoService.db
        .collection(Collections.CALENDARLIST)
        .findOneAndUpdate(
          { user: userId, "google.items.primary": true },
          {
            $set: {
              "google.items.$.sync.nextSyncToken": nextSyncToken,
              updatedAt: new Date(),
            },
          },
          { returnDocument: "after" }
        );

      if (result.value !== null) {
        return { status: `updated to: ${nextSyncToken}` };
      } else {
        logger.error(msg);
        return { status: "Failed to update properly", debugResult: result };
      }
    } catch (e) {
      logger.error(e);
      throw err;
    }
  };
  */
