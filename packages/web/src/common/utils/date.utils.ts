import dayjs, { Dayjs } from "dayjs";
import {
  HOURS_AM_FORMAT,
  HOURS_AM_SHORT_FORMAT,
  YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT,
} from "@web/common/constants/dates";
import { ColorNames } from "@web/common/types/styles";
import { getColor } from "@web/common/utils/colors";

import { roundToNext } from ".";
import { GRID_TIME_STEP } from "../constants/grid.constants";

export const getAmPmTimes = () => {
  console.log("getting times"); //++
  return getTimes().map((time) =>
    dayjs(`2000-00-00 ${time}`, YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT)
      .format(HOURS_AM_FORMAT)
      .toLowerCase()
  );
};

export const getColorsByHour = (currentHour: number) => {
  const colors: string[] = [];

  [...(new Array(23) as number[])].map((_, index) => {
    // + 1 cuz comparing labels (23 intervals) vs hours in day (24)
    const isCurrentHour = currentHour === index + 1;
    const color = isCurrentHour
      ? getColor(ColorNames.TEAL_3)
      : `${getColor(ColorNames.WHITE_4)}80`;

    colors.push(color);

    return dayjs()
      .startOf("day")
      .add(index + 1, "hour")
      .format(HOURS_AM_SHORT_FORMAT);
  });

  return colors;
};

export const getNextIntervalTimes = () => {
  const currentMinute = dayjs().minute();
  const nextInterval = roundToNext(currentMinute, GRID_TIME_STEP);
  const start = dayjs().minute(nextInterval).second(0);
  const end = start.add(1, "hour");
  const startDate = start.format();
  const endDate = end.format();

  return { startDate, endDate };
};

export const getHourLabels = () => {
  const day = dayjs();

  return [...(new Array(23) as number[])].map((_, index) => {
    return day
      .startOf("day")
      .add(index + 1, "hour")
      .format(HOURS_AM_SHORT_FORMAT);
  });
};

export const getTimes = () =>
  Array(24 * 4)
    .fill(0)
    .map((_, i) => {
      // eslint-disable-next-line no-bitwise
      return `0${~~(i / 4)}:0${60 * ((i / 4) % 1)}`.replace(/\d(\d\d)/g, "$1");
    });

export const getTimeLabel = (startDate: string, endDate: string) => {
  const startLabel = dayjs(startDate).format(HOURS_AM_FORMAT);
  const endLabel = dayjs(endDate).format(HOURS_AM_FORMAT);
  const times = `${startLabel} - ${endLabel}`;

  //++ if lastitems === ':00', then drop (12:00pm -> 12pm)

  return times;
};

// uses inferred timezone and shortened string to
// convert to a string format that the backend/gcal/mongo accepts:
// '2022-02-04 12:15' -> '2022-02-04T12:15:00-06:00'
export const toUTCOffset = (date: string | Dayjs | Date) => {
  if (typeof date === "string" || date instanceof Date) {
    return dayjs(date).format();
  } else return date.format(); // then already a DayJs object
};
