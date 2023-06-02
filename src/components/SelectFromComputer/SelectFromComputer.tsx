import { memo } from "react"
import { Flex, Menu, MenuButton, MenuList, MenuItem, forwardRef, Button } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import { SelectFromComputerProps } from "../../types"
import eventListener from "../../lib/eventListener"
import { i18n } from "../../i18n"

const SelectFromComputer = memo(({ darkMode, isMobile, lang, mode = "text" }: SelectFromComputerProps) => {
	return (
		<Flex
			backgroundColor="transparent"
			borderRadius={5}
			alignItems="center"
			justifyContent="center"
			cursor="pointer"
		>
			<Menu>
				<MenuButton
					as={forwardRef((props, ref) => (
						<Flex
							ref={ref}
							{...props}
						>
							{mode == "text" && (
								<AppText
									darkMode={darkMode}
									isMobile={isMobile}
									noOfLines={1}
									fontSize={14}
									wordBreak="break-all"
									color={getColor(darkMode, "linkPrimary")}
									cursor="pointer"
									_hover={{
										textDecoration: "underline"
									}}
								>
									{i18n(lang, "selectFromComputer")}
								</AppText>
							)}
							{mode == "uploadButton" && (
								<Button
									backgroundColor={darkMode ? "white" : "gray"}
									color={darkMode ? "black" : "white"}
									height="28px"
									paddingLeft="10px"
									paddingRight="10px"
									fontSize={13}
									border={"1px solid " + darkMode ? "white" : "gray"}
								>
									{i18n(lang, "upload")}
								</Button>
							)}
						</Flex>
					))}
				>
					{i18n(lang, "selectFromComputer")}
				</MenuButton>
				<MenuList
					boxShadow="base"
					paddingTop="5px"
					paddingBottom="5px"
					backgroundColor={getColor(darkMode, "backgroundPrimary")}
					borderColor={getColor(darkMode, "borderPrimary")}
					minWidth="150px"
				>
					<MenuItem
						height="auto"
						fontSize={14}
						paddingTop="5px"
						paddingBottom="5px"
						backgroundColor={getColor(darkMode, "backgroundPrimary")}
						color={getColor(darkMode, "textPrimary")}
						_hover={{
							backgroundColor: getColor(darkMode, "backgroundSecondary")
						}}
						_active={{
							backgroundColor: getColor(darkMode, "backgroundSecondary")
						}}
						_focus={{
							backgroundColor: getColor(darkMode, "backgroundSecondary")
						}}
						onClick={() => document.getElementById("file-input")?.click()}
					>
						{i18n(lang, "files")}
					</MenuItem>
					<MenuItem
						height="auto"
						fontSize={14}
						paddingTop="5px"
						paddingBottom="5px"
						backgroundColor={getColor(darkMode, "backgroundPrimary")}
						color={getColor(darkMode, "textPrimary")}
						_hover={{
							backgroundColor: getColor(darkMode, "backgroundSecondary")
						}}
						_active={{
							backgroundColor: getColor(darkMode, "backgroundSecondary")
						}}
						_focus={{
							backgroundColor: getColor(darkMode, "backgroundSecondary")
						}}
						onClick={() => document.getElementById("folder-input")?.click()}
					>
						{i18n(lang, "folders")}
					</MenuItem>
					{mode == "uploadButton" && (
						<MenuItem
							height="auto"
							fontSize={14}
							paddingTop="5px"
							paddingBottom="5px"
							backgroundColor={getColor(darkMode, "backgroundPrimary")}
							color={getColor(darkMode, "textPrimary")}
							_hover={{
								backgroundColor: getColor(darkMode, "backgroundSecondary")
							}}
							_active={{
								backgroundColor: getColor(darkMode, "backgroundSecondary")
							}}
							_focus={{
								backgroundColor: getColor(darkMode, "backgroundSecondary")
							}}
							onClick={() => eventListener.emit("openCreateFolderModal")}
						>
							{i18n(lang, "newFolder")}
						</MenuItem>
					)}
				</MenuList>
			</Menu>
		</Flex>
	)
})

export default SelectFromComputer
