import { memo, useState, useMemo, useEffect, useCallback } from "react"
import { Flex, Tabs, TabList, TabPanel, TabPanels, Tab, Badge } from "@chakra-ui/react"
import useWindowWidth from "../../lib/hooks/useWindowWidth"
import useIsMobile from "../../lib/hooks/useIsMobile"
import { getColor } from "../../styles/colors"
import useDarkMode from "../../lib/hooks/useDarkMode"
import {
	Contact as IContact,
	contacts as getContacts,
	contactsRequestsIn,
	contactsRequestsOut,
	ContactRequest,
	BlockedContact,
	contactsBlocked
} from "../../lib/api"
import { safeAwait } from "../../lib/helpers"
import { show as showToast } from "../Toast/Toast"
import { ONLINE_TIMEOUT } from "../../lib/constants"
import AddContactModal from "./AddContactModal"
import { useLocation, useNavigate } from "react-router-dom"
import { getTabIndex } from "./utils"
import ContactsList from "./ContactsList"
import ContextMenus from "./ContextMenus"
import RequestsList from "./RequestsList"
import eventListener from "../../lib/eventListener"
import BlockedList from "./BlockedList"
import useLang from "../../lib/hooks/useLang"
import { i18n } from "../../i18n"
import AppText from "../AppText"

export const Contacts = memo(({ sidebarWidth }: { sidebarWidth: number }) => {
	const windowWidth = useWindowWidth()
	const [search, setSearch] = useState<string>("")
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()
	const [loadingContacts, setLoadingContacts] = useState<boolean>(true)
	const [contacts, setContacts] = useState<IContact[]>([])
	const [incomingRequests, setIncomingRequests] = useState<ContactRequest[]>([])
	const [outgoingRequests, setOutgoingRequests] = useState<ContactRequest[]>([])
	const [blocked, setBlocked] = useState<BlockedContact[]>([])
	const location = useLocation()
	const navigate = useNavigate()
	const lang = useLang()

	const [activeTab, activeTabIndex] = useMemo(() => {
		const activeTab = location.hash.split("/").slice(1).join("/").split("?")[0]
		const activeTabIndex = getTabIndex(activeTab)

		return [activeTab, activeTabIndex]
	}, [location.hash])

	const containerWidth = useMemo(() => {
		if (isMobile) {
			return windowWidth - sidebarWidth - 50
		}

		return Math.floor((windowWidth - sidebarWidth) / 2)
	}, [windowWidth, sidebarWidth, isMobile])

	const blockedSorted = useMemo(() => {
		return blocked
			.sort((a, b) => a.email.localeCompare(b.email))
			.filter(block => {
				if (search.length === 0) {
					return true
				}

				if (
					block.email.toLowerCase().trim().indexOf(search.toLowerCase().trim()) !== -1 ||
					block.nickName.toLowerCase().trim().indexOf(search.toLowerCase().trim()) !== -1
				) {
					return true
				}

				return false
			})
	}, [blocked, search])

	const contactsSorted = useMemo(() => {
		const sorted = contacts
			.sort((a, b) => a.email.localeCompare(b.email))
			.sort((a, b) => b.lastActive - a.lastActive)
			.filter(contact => {
				if (search.length === 0) {
					return true
				}

				if (
					contact.email.toLowerCase().trim().indexOf(search.toLowerCase().trim()) !== -1 ||
					contact.nickName.toLowerCase().trim().indexOf(search.toLowerCase().trim()) !== -1
				) {
					return true
				}

				return false
			})

		const online = sorted.filter(contact => contact.lastActive > Date.now() - ONLINE_TIMEOUT)
		const offline = sorted.filter(contact => contact.lastActive < Date.now() - ONLINE_TIMEOUT)

		return activeTab === "contacts/online" ? online : activeTab === "contacts/offline" ? offline : sorted
	}, [contacts, search, activeTab])

	const incomingRequestsSorted = useMemo(() => {
		return incomingRequests
			.sort((a, b) => a.email.localeCompare(b.email))
			.filter(contact => {
				if (search.length === 0) {
					return true
				}

				if (
					contact.email.toLowerCase().trim().indexOf(search.toLowerCase().trim()) !== -1 ||
					contact.nickName.toLowerCase().trim().indexOf(search.toLowerCase().trim()) !== -1
				) {
					return true
				}

				return false
			})
	}, [incomingRequests, search])

	const outgoingRequestsSorted = useMemo(() => {
		return outgoingRequests
			.sort((a, b) => a.email.localeCompare(b.email))
			.filter(contact => {
				if (search.length === 0) {
					return true
				}

				if (
					contact.email.toLowerCase().trim().indexOf(search.toLowerCase().trim()) !== -1 ||
					contact.nickName.toLowerCase().trim().indexOf(search.toLowerCase().trim()) !== -1
				) {
					return true
				}

				return false
			})
	}, [outgoingRequests, search])

	const loadContacts = useCallback(async (showLoader: boolean = true) => {
		setLoadingContacts(showLoader)

		const [err, res] = await safeAwait(Promise.all([getContacts(), contactsRequestsOut(), contactsRequestsIn(), contactsBlocked()]))

		if (err) {
			console.error(err)

			setLoadingContacts(false)

			showToast("error", err.message, "bottom", 5000)

			return
		}

		setContacts(res[0])
		setOutgoingRequests(res[1])
		setIncomingRequests(res[2])
		setBlocked(res[3])
		setLoadingContacts(false)
	}, [])

	useEffect(() => {
		loadContacts()
	}, [location.hash])

	useEffect(() => {
		const removeContactRequestListener = eventListener.on("removeContactRequest", (uuid: string) => {
			setIncomingRequests(prev => prev.filter(request => request.uuid !== uuid))
			setOutgoingRequests(prev => prev.filter(request => request.uuid !== uuid))
		})

		return () => {
			removeContactRequestListener.remove()
		}
	}, [])

	return (
		<Flex
			flexDirection="column"
			width={containerWidth + "px"}
			padding="25px"
		>
			<Tabs
				colorScheme="purple"
				borderColor={getColor(darkMode, "backgroundSecondary")}
				color={getColor(darkMode, "textSecondary")}
				defaultIndex={activeTabIndex}
				isLazy={true}
				width={containerWidth + "px"}
				display="flex"
				flexDirection="column"
				overflowY="hidden"
			>
				<TabList
					position="fixed"
					width={isMobile ? "100%" : windowWidth - sidebarWidth - 70 + "px"}
					backgroundColor={getColor(darkMode, "backgroundPrimary")}
					zIndex={1001}
					height="42px"
					overflowX={isMobile ? "auto" : undefined}
				>
					<Tab
						_hover={{
							backgroundColor: getColor(darkMode, "backgroundSecondary")
						}}
						onClick={() => navigate("/#/contacts/online")}
					>
						{i18n(lang, "contactsOnline")}
					</Tab>
					<Tab
						_hover={{
							backgroundColor: getColor(darkMode, "backgroundSecondary")
						}}
						onClick={() => navigate("/#/contacts/all")}
					>
						{i18n(lang, "contactsAll")}
					</Tab>
					<Tab
						_hover={{
							backgroundColor: getColor(darkMode, "backgroundSecondary")
						}}
						onClick={() => navigate("/#/contacts/offline")}
					>
						{i18n(lang, "contactsOffline")}
					</Tab>
					<Tab
						_hover={{
							backgroundColor: getColor(darkMode, "backgroundSecondary")
						}}
						onClick={() => navigate("/#/contacts/pending")}
					>
						{i18n(lang, "contactsPending")}
					</Tab>
					<Tab
						_hover={{
							backgroundColor: getColor(darkMode, "backgroundSecondary")
						}}
						onClick={() => navigate("/#/contacts/requests")}
						flexDirection="row"
						alignItems="center"
						gap="10px"
					>
						<Flex>{i18n(lang, "contactsRequests")}</Flex>
						{incomingRequests.length > 0 && (
							<Flex
								width="20px"
								height="20px"
								padding="0px"
								backgroundColor={getColor(darkMode, "red")}
								color="white"
								borderRadius="full"
								alignItems="center"
								justifyContent="center"
								fontSize={12}
								paddingRight="2px"
							>
								{incomingRequests.length >= 99 ? 99 : incomingRequests.length}
							</Flex>
						)}
					</Tab>
					<Tab
						_hover={{
							backgroundColor: getColor(darkMode, "backgroundSecondary")
						}}
						onClick={() => navigate("/#/contacts/blocked")}
					>
						{i18n(lang, "contactsBlocked")}
					</Tab>
					<Flex
						paddingLeft="15px"
						paddingRight="15px"
						justifyContent="center"
						alignItems="center"
					>
						<Badge
							cursor="pointer"
							onClick={() => eventListener.emit("openAddContactModal")}
							backgroundColor={getColor(darkMode, "green")}
							borderRadius="5px"
							paddingLeft="6px"
							paddingRight="6px"
							paddingTop="1px"
							paddingBottom="1px"
						>
							<AppText
								darkMode={darkMode}
								isMobile={isMobile}
								noOfLines={1}
								wordBreak="break-all"
								color="white"
								fontWeight="600 !important"
								fontSize={14}
							>
								{i18n(lang, "addContactSmall")}
							</AppText>
						</Badge>
					</Flex>
				</TabList>
				<TabPanels zIndex={101}>
					<TabPanel
						marginTop="42px"
						padding="0px"
					>
						<ContactsList
							search={search}
							setSearch={setSearch}
							contacts={contactsSorted}
							activeTab="contacts/online"
							containerWidth={containerWidth}
							loadingContacts={loadingContacts}
						/>
					</TabPanel>
					<TabPanel
						marginTop="42px"
						padding="0px"
					>
						<ContactsList
							search={search}
							setSearch={setSearch}
							contacts={contactsSorted}
							activeTab="contacts/all"
							containerWidth={containerWidth}
							loadingContacts={loadingContacts}
						/>
					</TabPanel>
					<TabPanel
						marginTop="42px"
						padding="0px"
					>
						<ContactsList
							search={search}
							setSearch={setSearch}
							contacts={contactsSorted}
							activeTab="contacts/offline"
							containerWidth={containerWidth}
							loadingContacts={loadingContacts}
						/>
					</TabPanel>
					<TabPanel
						marginTop="42px"
						padding="0px"
					>
						<RequestsList
							search={search}
							setSearch={setSearch}
							requests={outgoingRequestsSorted}
							activeTab="contacts/pending"
							containerWidth={containerWidth}
							loadingContacts={loadingContacts}
						/>
					</TabPanel>
					<TabPanel
						marginTop="42px"
						padding="0px"
					>
						<RequestsList
							search={search}
							setSearch={setSearch}
							requests={incomingRequestsSorted}
							activeTab="contacts/requests"
							containerWidth={containerWidth}
							loadingContacts={loadingContacts}
						/>
					</TabPanel>
					<TabPanel
						marginTop="42px"
						padding="0px"
					>
						<BlockedList
							search={search}
							setSearch={setSearch}
							blocked={blockedSorted}
							setBlocked={setBlocked}
							containerWidth={containerWidth}
							loadingContacts={loadingContacts}
						/>
					</TabPanel>
				</TabPanels>
			</Tabs>
			<AddContactModal />
			<ContextMenus setContacts={setContacts} />
		</Flex>
	)
})

export default Contacts
