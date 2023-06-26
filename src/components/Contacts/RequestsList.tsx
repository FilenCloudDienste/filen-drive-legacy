import { memo, useCallback } from "react"
import { Flex, Input } from "@chakra-ui/react"
import useWindowHeight from "../../lib/hooks/useWindowHeight"
import useIsMobile from "../../lib/hooks/useIsMobile"
import { getColor } from "../../styles/colors"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { ContactRequest } from "../../lib/api"
import AppText from "../AppText"
import { Virtuoso } from "react-virtuoso"
import Request from "./Request"

export const RequestsList = memo(
	({
		search,
		setSearch,
		requests,
		activeTab,
		containerWidth
	}: {
		search: string
		setSearch: React.Dispatch<React.SetStateAction<string>>
		requests: ContactRequest[]
		activeTab: string
		containerWidth: number
	}) => {
		const darkMode = useDarkMode()
		const isMobile = useIsMobile()
		const windowHeight = useWindowHeight()

		const itemContent = useCallback(
			(index: number, request: ContactRequest) => {
				return (
					<Request
						key={request.uuid}
						request={request}
						activeTab={activeTab}
					/>
				)
			},
			[activeTab]
		)

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
						{activeTab === "contacts/requests" ? "Incoming requests" : "Outgoing requests"}
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
						{requests.length}
					</AppText>
				</Flex>
				<Flex
					flexDirection="column"
					marginTop="15px"
					width={containerWidth + "px"}
					height={windowHeight - 190 + "px"}
				>
					<Virtuoso
						data={requests}
						height={windowHeight - 190}
						width={containerWidth}
						itemContent={itemContent}
						totalCount={requests.length}
						overscan={8}
						style={{
							overflowX: "hidden",
							overflowY: "auto"
						}}
					/>
				</Flex>
			</>
		)
	}
)

export default RequestsList
