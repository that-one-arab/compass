import styled from "styled-components";
import { ColorNames } from "@web/common/types/styles";
import { getColor } from "@web/common/utils/colors";
import { Flex } from "@web/components/Flex";

import { PAGE_TOP_PADDING, PAGE_X_PADDING } from "./layout.constants";

export const Styled = styled(Flex)`
  height: 100vh;
  overflow: hidden;
  width: 100vw;
`;

export const StyledCalendar = styled(Flex)`
  flex-grow: 1;
  height: 100%;
  background: ${getColor(ColorNames.DARK_2)};
  padding: ${PAGE_TOP_PADDING}px ${PAGE_X_PADDING}px 0 ${PAGE_X_PADDING}px;
`;
