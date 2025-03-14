import React, { FC, memo } from "react";
import { Priorities } from "@core/constants/core.constants";
import { DAY_COMPACT, DAY_HOUR_MIN_M } from "@core/constants/date.constants";
import { Schema_Event } from "@core/types/event.types";
import { getWidthBuffer } from "@web/common/utils/grid.util";
import { Flex } from "@web/components/Flex";
import { AlignItems, FlexWrap } from "@web/components/Flex/styled";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { Text } from "@web/components/Text";
import { snapToGrid } from "@web/views/Calendar/components/Event/Grid/GridEventPreview/snap.grid";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import {
  Measurements_Grid,
  Refs_Grid,
} from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { EVENT_ALLDAY_HEIGHT } from "@web/views/Calendar/layout.constants";
import { SOMEDAY_EVENT_HEIGHT } from "../../../Sidebar/SomedayTab/SomedayEvents/SomedayEvent/styled";
import { StyledGridEventPreview, getItemStyles, layerStyles } from "./styled";

interface Props {
  dateCalcs: DateCalcs;
  dayIndex: number;
  event: Schema_Event;
  isOverAllDayRow: boolean;
  isOverMainGrid: boolean;
  measurements: Measurements_Grid;
  mouseCoords: { x: number; y: number };
  startOfView: WeekProps["component"]["startOfView"];
  mainGridRef: Refs_Grid["mainGridRef"];
}

const _GridEventPreview: FC<Props> = ({
  dateCalcs,
  dayIndex,
  event,
  isOverAllDayRow,
  isOverMainGrid,
  measurements,
  mouseCoords,
  startOfView,
  mainGridRef,
}) => {
  const { colWidths } = measurements;
  const { x, y } = mouseCoords;

  /* Helpers */
  const getHeight = () => {
    if (isOverAllDayRow) return EVENT_ALLDAY_HEIGHT;

    const height = isOverMainGrid
      ? measurements.hourHeight
      : SOMEDAY_EVENT_HEIGHT;

    return height;
  };

  const getTimePreview = () => {
    const minutes = dateCalcs.getMinuteByY(y);
    const format = isOverAllDayRow ? DAY_COMPACT : DAY_HOUR_MIN_M;
    const timePreview = startOfView
      .add(dayIndex, "day")
      .add(minutes, "minutes")
      .format(format);
    return timePreview;
  };

  const getWidth = () => {
    if (isOverMainGrid) {
      const buffer = getWidthBuffer(dayIndex) + 20;
      return measurements.colWidths[dayIndex] - buffer;
    }
    // allday
    return colWidths[dayIndex] - 15;
  };

  /* Size */
  const height = getHeight();
  const width = getWidth();

  const { x: snappedX, y: snappedY } = snapToGrid(
    x,
    y,
    measurements,
    mainGridRef.current?.scrollTop || 0,
  );

  return (
    <div style={layerStyles}>
      <div style={getItemStyles({ x: snappedX, y: snappedY })}>
        <StyledGridEventPreview
          className={"active"}
          duration={1}
          height={height}
          priority={event.priority || Priorities.UNASSIGNED}
          role="button"
          tabIndex={0}
          width={width}
        >
          <Flex alignItems={AlignItems.CENTER} flexWrap={FlexWrap.WRAP}>
            <Text size="m" role="textbox">
              {event.title}
            </Text>

            {isOverMainGrid && (
              <>
                <SpaceCharacter />
                <Text size="s">{getTimePreview()}</Text>
              </>
            )}
          </Flex>
        </StyledGridEventPreview>
      </div>
    </div>
  );
};

export const GridEventPreview = memo(_GridEventPreview);
