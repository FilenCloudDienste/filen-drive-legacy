import { memo, useCallback } from "react"
import { Flex, Input, Button } from "@chakra-ui/react"
import useWindowHeight from "../../lib/hooks/useWindowHeight"
import useIsMobile from "../../lib/hooks/useIsMobile"
import { getColor } from "../../styles/colors"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { Contact as IContact } from "../../lib/api"
import AppText from "../AppText"
import { Virtuoso } from "react-virtuoso"
import Contact from "./Contact"
import eventListener from "../../lib/eventListener"

export const ContactsList = memo(
	({
		search,
		setSearch,
		contacts,
		activeTab,
		containerWidth
	}: {
		search: string
		setSearch: React.Dispatch<React.SetStateAction<string>>
		contacts: IContact[]
		activeTab: string
		containerWidth: number
	}) => {
		const darkMode = useDarkMode()
		const isMobile = useIsMobile()
		const windowHeight = useWindowHeight()

		const itemContent = useCallback((index: number, contact: IContact) => {
			return (
				<Contact
					key={contact.uuid}
					contact={contact}
				/>
			)
		}, [])

		return (
			<>
				<Flex
					flexDirection="row"
					gap="10px"
					paddingTop="20px"
				>
					<Input
						value={search}
						onChange={e => setSearch(e.target.value)}
						autoFocus={false}
						spellCheck={false}
						border="none"
						borderRadius="10px"
						width="100%"
						height="35px"
						backgroundColor={getColor(darkMode, "backgroundSecondary")}
						color={getColor(darkMode, "textPrimary")}
						_placeholder={{
							color: getColor(darkMode, "textSecondary")
						}}
						placeholder="Search..."
						paddingLeft="10px"
						paddingRight="10px"
						shadow="none"
						outline="none"
						_hover={{
							shadow: "none",
							outline: "none"
						}}
						_active={{
							shadow: "none",
							outline: "none"
						}}
						_focus={{
							shadow: "none",
							outline: "none"
						}}
						_highlighted={{
							shadow: "none",
							outline: "none"
						}}
						fontSize={15}
					/>
					<Button
						width="35px"
						borderRadius="10px"
						onClick={() => eventListener.emit("openAddContactModal")}
					>
						Add
					</Button>
				</Flex>
				<Flex
					flexDirection="row"
					gap="10px"
					marginTop="25px"
				>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						noOfLines={1}
						wordBreak="break-all"
						color={getColor(darkMode, "textSecondary")}
						fontSize={13}
						textTransform="uppercase"
					>
						{activeTab === "contacts/online" ? "Online" : activeTab === "contacts/offline" ? "Offline" : "All"}
					</AppText>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						noOfLines={1}
						wordBreak="break-all"
						color={getColor(darkMode, "textSecondary")}
						fontSize={13}
						textTransform="uppercase"
					>
						&mdash;
					</AppText>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						noOfLines={1}
						wordBreak="break-all"
						color={getColor(darkMode, "textSecondary")}
						fontSize={13}
						textTransform="uppercase"
					>
						{contacts.length}
					</AppText>
				</Flex>
				<Flex
					flexDirection="column"
					marginTop="15px"
					width={containerWidth + "px"}
					height={windowHeight - 190 + "px"}
				>
					<Virtuoso
						data={contacts}
						height={windowHeight - 190}
						width={containerWidth}
						itemContent={itemContent}
						totalCount={contacts.length}
						overscan={8}
						style={{
							overflowX: "hidden",
							overflowY: "auto",
							height: windowHeight - 190 + "px",
							width: containerWidth + "px"
						}}
					/>
				</Flex>
			</>
		)
	}
)

export default ContactsList
