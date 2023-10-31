import { memo, useState, useMemo, useEffect, useCallback } from "react"
import { Flex, Tabs, TabList, TabPanel, TabPanels, Tab, Badge } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import { Contact as IContact, ContactRequest, BlockedContact } from "../../lib/api"
import { safeAwait } from "../../lib/helpers"
import { show as showToast } from "../Toast/Toast"
import { ONLINE_TIMEOUT } from "../../lib/constants"
import AddContactModal from "./AddContactModal"
import { useLocation, useNavigate } from "react-router-dom"
import { getTabIndex, fetchContacts } from "./utils"
import ContactsList from "./ContactsList"
import ContextMenus from "./ContextMenus"
import RequestsList from "./RequestsList"
import eventListener from "../../lib/eventListener"
import BlockedList from "./BlockedList"
import { i18n } from "../../i18n"
import AppText from "../AppText"
import db from "../../lib/db"
import BlockModal from "./BlockModal"
import RemoveModal from "./RemoveModal"

export interface ContactsProps {
	sidebarWidth: number
	windowWidth: number
	darkMode: boolean
	isMobile: boolean
	lang: string
}

export const Contacts = memo(({ sidebarWidth, windowWidth, darkMode, isMobile, lang }: ContactsProps) => {
	const [search, setSearch] = useState<string>("")
	const [loadingContacts, setLoadingContacts] = useState<boolean>(true)
	const [contacts, setContacts] = useState<IContact[]>([])
	const [incomingRequests, setIncomingRequests] = useState<ContactRequest[]>([])
	const [outgoingRequests, setOutgoingRequests] = useState<ContactRequest[]>([])
	const [blocked, setBlocked] = useState<BlockedContact[]>([])
	const location = useLocation()
	const navigate = useNavigate()

	const activeTabIndex = useMemo(() => {
		const activeTab = location.hash.split("/").slice(1).join("/").split("?")[0]
		const activeTabIndex = getTabIndex(activeTab)

		return activeTabIndex
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
			.sort((a, b) => {
				const isOnlineA = a.lastActive > Date.now() - ONLINE_TIMEOUT
				const isOnlineB = b.lastActive > Date.now() - ONLINE_TIMEOUT

				if (isOnlineA > isOnlineB) {
					return -1
				} else if (isOnlineA < isOnlineB) {
					return 1
				} else {
					return a.email.localeCompare(b.email)
				}
			})
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

		return sorted
	}, [contacts, search])

	const onlineContacts = useMemo(() => {
		return contactsSorted.filter(contact => contact.lastActive > Date.now() - ONLINE_TIMEOUT)
	}, [contactsSorted])

	const offlineContacts = useMemo(() => {
		return contactsSorted.filter(contact => contact.lastActive < Date.now() - ONLINE_TIMEOUT)
	}, [contactsSorted])

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

	const loadContacts = useCallback(async (refresh: boolean = false) => {
		const cache = await db.get("contacts", "contacts")
		const hasCache =
			cache &&
			cache.contacts &&
			Array.isArray(cache.contacts) &&
			cache.requestsOut &&
			Array.isArray(cache.requestsOut) &&
			cache.requestsOut &&
			Array.isArray(cache.requestsOut) &&
			cache.blocked &&
			Array.isArray(cache.blocked)

		if (!hasCache) {
			setLoadingContacts(true)
			setContacts([])
			setOutgoingRequests([])
			setIncomingRequests([])
			setBlocked([])
		}

		const [err, res] = await safeAwait(fetchContacts(refresh))

		if (err) {
			console.error(err)

			setLoadingContacts(false)

			showToast("error", err.message, "bottom", 5000)

			return
		}

		setContacts(res.contacts)
		setOutgoingRequests(res.requestsOut)
		setIncomingRequests(res.requestsIn)
		setBlocked(res.blocked)
		setLoadingContacts(false)

		if (res.cache) {
			loadContacts(true)
		}
	}, [])

	useEffect(() => {
		loadContacts()
		setSearch("")
	}, [location.hash])

	useEffect(() => {
		const removeContactRequestListener = eventListener.on("removeContactRequest", (uuid: string) => {
			setIncomingRequests(prev => prev.filter(request => request.uuid !== uuid))
			setOutgoingRequests(prev => prev.filter(request => request.uuid !== uuid))

			loadContacts(true)
		})

		const updateInterval = setInterval(() => {
			loadContacts(true)
		}, 5000)

		return () => {
			removeContactRequestListener.remove()

			clearInterval(updateInterval)
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
				isLazy={false}
				lazyBehavior="keepMounted"
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
							contacts={onlineContacts}
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
							contacts={offlineContacts}
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
			<BlockModal setContacts={setContacts} />
			<RemoveModal setContacts={setContacts} />
		</Flex>
	)
})

export default Contacts
