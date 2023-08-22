import { memo } from "react"
import { Flex, Menu, MenuButton, MenuList, MenuItem, forwardRef, Button, MenuDivider } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import { UploadButtonProps } from "../../types"
import eventListener from "../../lib/eventListener"
import { i18n } from "../../i18n"

const UploadButton = memo(({ darkMode, isMobile, lang, enabled }: UploadButtonProps) => {
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
					disabled={!enabled}
					as={forwardRef((props, ref) => (
						<Flex
							ref={ref}
							{...props}
						>
							<Button
								borderRadius="5px"
								backgroundColor={darkMode ? "white" : getColor(darkMode, "backgroundSecondary")}
								color="black"
								autoFocus={false}
								fontWeight="bold"
								fontSize={13}
								padding="10px"
								height="26px"
								border="1px solid transparent"
								marginRight="15px"
								disabled={!enabled}
								_hover={{
									backgroundColor: "transparent",
									border: "1px solid " + (darkMode ? "white" : "black"),
									color: darkMode ? "white" : "black"
								}}
								_active={{
									backgroundColor: "transparent",
									border: "1px solid " + (darkMode ? "white" : "black"),
									color: darkMode ? "white" : "black"
								}}
								_focus={{
									backgroundColor: "transparent",
									border: "1px solid " + (darkMode ? "white" : "black"),
									color: darkMode ? "white" : "black"
								}}
							>
								{i18n(lang, "new")}
							</Button>
						</Flex>
					))}
				>
					{i18n(lang, "new")}
				</MenuButton>
				<MenuList
					boxShadow="base"
					paddingTop="5px"
					paddingBottom="5px"
					backgroundColor={getColor(darkMode, "backgroundPrimary")}
					borderColor={getColor(darkMode, "borderPrimary")}
					minWidth="150px"
					zIndex={1000001}
				>
					<MenuItem
						height="auto"
						fontSize={14}
						paddingTop="5px"
						paddingBottom="5px"
						backgroundColor={getColor(darkMode, "backgroundPrimary")}
						color={getColor(darkMode, "textSecondary")}
						_hover={{
							backgroundColor: getColor(darkMode, "backgroundSecondary"),
							color: getColor(darkMode, "textPrimary")
						}}
						_active={{
							backgroundColor: getColor(darkMode, "backgroundSecondary"),
							color: getColor(darkMode, "textPrimary")
						}}
						_focus={{
							backgroundColor: getColor(darkMode, "backgroundSecondary"),
							color: getColor(darkMode, "textPrimary")
						}}
						onClick={() => document.getElementById("file-input")?.click()}
					>
						{i18n(lang, "uploadFiles")}
					</MenuItem>
					<MenuItem
						height="auto"
						fontSize={14}
						paddingTop="5px"
						paddingBottom="5px"
						backgroundColor={getColor(darkMode, "backgroundPrimary")}
						color={getColor(darkMode, "textSecondary")}
						_hover={{
							backgroundColor: getColor(darkMode, "backgroundSecondary"),
							color: getColor(darkMode, "textPrimary")
						}}
						_active={{
							backgroundColor: getColor(darkMode, "backgroundSecondary"),
							color: getColor(darkMode, "textPrimary")
						}}
						_focus={{
							backgroundColor: getColor(darkMode, "backgroundSecondary"),
							color: getColor(darkMode, "textPrimary")
						}}
						onClick={() => document.getElementById("folder-input")?.click()}
					>
						{i18n(lang, "uploadFolders")}
					</MenuItem>
					<MenuItem
						height="auto"
						fontSize={14}
						paddingTop="5px"
						paddingBottom="5px"
						backgroundColor={getColor(darkMode, "backgroundPrimary")}
						color={getColor(darkMode, "textSecondary")}
						_hover={{
							backgroundColor: getColor(darkMode, "backgroundSecondary"),
							color: getColor(darkMode, "textPrimary")
						}}
						_active={{
							backgroundColor: getColor(darkMode, "backgroundSecondary"),
							color: getColor(darkMode, "textPrimary")
						}}
						_focus={{
							backgroundColor: getColor(darkMode, "backgroundSecondary"),
							color: getColor(darkMode, "textPrimary")
						}}
						onClick={() => eventListener.emit("openCreateFolderModal")}
					>
						{i18n(lang, "newFolder")}
					</MenuItem>
					<MenuDivider />
					<MenuItem
						height="auto"
						fontSize={14}
						paddingTop="5px"
						paddingBottom="5px"
						backgroundColor={getColor(darkMode, "backgroundPrimary")}
						color={getColor(darkMode, "textSecondary")}
						_hover={{
							backgroundColor: getColor(darkMode, "backgroundSecondary"),
							color: getColor(darkMode, "textPrimary")
						}}
						_active={{
							backgroundColor: getColor(darkMode, "backgroundSecondary"),
							color: getColor(darkMode, "textPrimary")
						}}
						_focus={{
							backgroundColor: getColor(darkMode, "backgroundSecondary"),
							color: getColor(darkMode, "textPrimary")
						}}
						onClick={() => eventListener.emit("openUploadModal", { files: undefined, openModal: true })}
					>
						{i18n(lang, "openUploads")}
					</MenuItem>
				</MenuList>
			</Menu>
		</Flex>
	)
})

export default UploadButton
