import { memo, useMemo } from "react"
import { Flex } from "@chakra-ui/react"
import type { ItemDragTooltipProps } from "../../types"
import { getItemDragIndicatorCoords } from "../../lib/helpers"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import { THEME_COLOR } from "../../lib/constants"

const DragSelect = memo(({ darkMode, isMobile, itemDragState }: ItemDragTooltipProps) => {
	const coords = useMemo(() => {
		return getItemDragIndicatorCoords(itemDragState.clientX, itemDragState.clientY, 15, 20)
	}, [itemDragState.clientX, itemDragState.clientY])

	return (
		<>
			{itemDragState.clientX > 0 &&
				itemDragState.clientY > 0 &&
				itemDragState.items.length > 0 &&
				(() => {
					return (
						<>
							<Flex
								position="absolute"
								left={coords.left + 10 + "px"}
								top={coords.top + 15 + "px"}
								backgroundColor={getColor(darkMode, "backgroundSecondary")}
								borderRadius="5px"
								width="200px"
								height="auto"
								paddingLeft="10px"
								paddingRight="10px"
								paddingTop="5px"
								paddingBottom="5px"
								border={"1px solid " + getColor(darkMode, "borderPrimary")}
								zIndex={10000}
							>
								<Flex
									position="absolute"
									top={-3}
									right={-3}
									height="22px"
									minWidth="22px"
									borderRadius="50%"
									backgroundColor={THEME_COLOR}
									alignItems="center"
									justifyContent="center"
								>
									<AppText
										darkMode={darkMode}
										isMobile={isMobile}
										fontSize={13}
										color="white"
										noOfLines={1}
									>
										{itemDragState.items.length}
									</AppText>
								</Flex>
								<AppText
									darkMode={darkMode}
									isMobile={isMobile}
									noOfLines={1}
								>
									{itemDragState.items[0].name}
								</AppText>
							</Flex>
							{itemDragState.items.length >= 2 && (
								<Flex
									position="absolute"
									marginLeft={coords.left + 15 + "px"}
									marginTop={coords.top + 20 + "px"}
									backgroundColor={getColor(darkMode, "backgroundSecondary")}
									borderRadius="5px"
									width="200px"
									height="auto"
									paddingLeft="10px"
									paddingRight="10px"
									paddingTop="5px"
									paddingBottom="5px"
									border={"1px solid " + getColor(darkMode, "borderPrimary")}
									zIndex={1000}
								>
									<AppText
										darkMode={darkMode}
										isMobile={isMobile}
										color="transparent"
										noOfLines={1}
									>
										{itemDragState.items[0].name}
									</AppText>
								</Flex>
							)}
						</>
					)
				})()}
		</>
	)
})

export default DragSelect
