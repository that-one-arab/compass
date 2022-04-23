import styled from "styled-components";
import { Flex } from "@web/components/Flex";
import { getColor } from "@web/common/utils/colors";
import { ColorNames } from "@web/common/types/styles";
import { ZIndex } from "@web/common/constants/web.constants";
import { Text } from "@web/components/Text";
import { SomedayEventForm } from "@web/views/SomedayEventForm";

export interface Props {
  flex?: number;
}

export const Styled = styled.div<Props>`
  margin-bottom: 5px;
  color: ${getColor(ColorNames.WHITE_1)};
  flex: ${({ flex }) => flex};
  width: 100%;
  max-height: calc(100% - 46px);
`;

export const StyledHeader = styled(Flex)`
  margin-bottom: 20px;
`;

export const StyledHeaderTitle = styled(Text)`
  margin: 0 10px;
`;

export const StyledAddEventButton = styled(Text)`
  line-height: 18px;
  margin-right: 30px;
  cursor: pointer;
`;

export const StyledPaginationFlex = styled(Flex)`
  width: 40px;
`;

export interface ArrowButtonProps {
  disabled?: boolean;
}

export const StyledArrowButton = styled(Flex)<ArrowButtonProps>`
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  border-radius: 50%;
  width: 18px;
  height: 18px;

  color: ${({ disabled }) => disabled && getColor(ColorNames.WHITE_4)};

  &:hover {
    background: ${getColor(ColorNames.GREY_2)};
  }
`;

export const StyledEventsList = styled.div`
  padding: 20px;
  height: calc(100% - 67px);
`;
