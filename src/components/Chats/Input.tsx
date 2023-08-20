import { memo, useCallback, useState, useRef, useEffect, Suspense, lazy } from "react"
import { Flex, Menu, MenuButton, MenuList, forwardRef, MenuItem } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import { i18n } from "../../i18n"
import {
	ChatMessage,
	sendChatMessage,
	ChatConversation,
	chatSendTyping,
	ChatConversationParticipant,
	enableItemPublicLink,
	itemPublicLinkInfo,
	editChatMessage
} from "../../lib/api"
import db from "../../lib/db"
import { v4 as uuidv4 } from "uuid"
import { encryptChatMessage, decryptChatMessageKey } from "../../lib/worker/worker.com"
import { safeAwait, getCurrentParent, findClosestIndex } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import { SocketEvent } from "../../lib/services/socket"
import AppText from "../AppText"
import { AiOutlineSmile, AiFillPlusCircle, AiOutlineCaretDown } from "react-icons/ai"
import { ErrorBoundary } from "react-error-boundary"
import { createEditor, Editor, BaseEditor, Transforms } from "slate"
import useMeasure from "react-use-measure"
import { ReactEditor } from "slate-react"
import { Slate, Editable, withReact } from "slate-react"
import { withHistory } from "slate-history"
import { IoEllipsisHorizontalOutline } from "react-icons/io5"
import { useLocation } from "react-router-dom"
import { SearchIndex } from "emoji-mart"
import { EmojiElement } from "./utils"
import { custom as customEmojis } from "./customEmojis"
import emojiData from "@emoji-mart/data"
import { ItemProps } from "../../types"
import { show as showToast, dismiss as dismissToast } from "../Toast/Toast"
import throttle from "lodash/throttle"
import { selectFromCloud } from "../SelectFromCloud/SelectFromCloud"
import useDb from "../../lib/hooks/useDb"

type CustomElement = { type: "paragraph"; children: CustomText[] }
type CustomText = { text: string }

declare module "slate" {
	interface CustomTypes {
		Editor: BaseEditor & ReactEditor
		Element: CustomElement
		Text: CustomText
	}
}

const EmojiPicker = lazy(() => import("@emoji-mart/react"))

export interface ChatContainerInputTypingProps {
	darkMode: boolean
	isMobile: boolean
	lang: string
}

export const TYPING_TIMEOUT = 3000
export const TYPING_TIMEOUT_LAG = 30000

export const ChatContainerInputTyping = memo(({ darkMode, isMobile, lang }: ChatContainerInputTypingProps) => {
	const [usersTyping, setUsersTyping] = useState<ChatConversationParticipant[]>([])
	const usersTypingTimeout = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
	const location = useLocation()

	useEffect(() => {
		setUsersTyping([])

		usersTypingTimeout.current = {}
	}, [location.hash])

	useEffect(() => {
		const chatTypingListener = eventListener.on("socketEvent", (event: SocketEvent) => {
			if (event.type === "chatTyping" && getCurrentParent(window.location.href) === event.data.conversation) {
				clearTimeout(usersTypingTimeout.current[event.data.senderId])

				if (event.data.type === "down") {
					setUsersTyping(prev =>
						[
							...prev.filter(user => user.userId !== event.data.senderId),
							{
								userId: event.data.senderId,
								email: event.data.senderEmail,
								avatar: event.data.senderAvatar,
								nickName: event.data.senderNickName,
								metadata: "",
								permissionsAdd: false,
								addedTimestamp: 0
							}
						].sort((a, b) => a.email.localeCompare(b.email))
					)

					usersTypingTimeout.current[event.data.senderId] = setTimeout(() => {
						setUsersTyping(prev => prev.filter(user => user.userId !== event.data.senderId))
					}, TYPING_TIMEOUT_LAG)
				} else {
					setUsersTyping(prev => prev.filter(user => user.userId !== event.data.senderId))
				}
			}

			if (event.type === "chatMessageNew" && getCurrentParent(window.location.href) === event.data.conversation) {
				clearTimeout(usersTypingTimeout.current[event.data.senderId])

				setUsersTyping(prev => prev.filter(user => user.userId !== event.data.senderId))
			}
		})

		return () => {
			chatTypingListener.remove()
		}
	}, [])

	return (
		<Flex
			key={"typing-" + location.hash}
			flexDirection="row"
			overflow="hidden"
			marginTop="-10px"
			height="20px"
		>
			<Flex
				position="absolute"
				marginTop="-8px"
				alignItems="center"
			>
				{usersTyping.length === 0 ? (
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						color="transparent"
						fontSize={12}
						wordBreak="break-word"
						marginLeft="3px"
					>
						&nsbp;
					</AppText>
				) : (
					<>
						<IoEllipsisHorizontalOutline
							color={getColor(darkMode, "textPrimary")}
							fontSize={20}
						/>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							color={getColor(darkMode, "textPrimary")}
							fontSize={12}
							wordBreak="break-word"
							fontWeight="bold"
							marginLeft="5px"
						>
							{usersTyping.map(user => user.email).join(", ")}
						</AppText>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							color={getColor(darkMode, "textSecondary")}
							fontSize={12}
							wordBreak="break-word"
							marginLeft="3px"
						>
							{" is typing..."}
						</AppText>
					</>
				)}
			</Flex>
		</Flex>
	)
})

export interface InputProps {
	darkMode: boolean
	isMobile: boolean
	lang: string
	currentConversation: ChatConversation | undefined
	currentConversationMe: ChatConversationParticipant | undefined
	setFailedMessages: React.Dispatch<React.SetStateAction<string[]>>
	messages: ChatMessage[]
	setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
	setEmojiPickerOpen: React.Dispatch<React.SetStateAction<boolean>>
	conversationUUID: string
	setEditingMessageUUID: React.Dispatch<React.SetStateAction<string>>
}

export const Input = memo(
	({
		darkMode,
		isMobile,
		lang,
		currentConversation,
		currentConversationMe,
		setFailedMessages,
		messages,
		setMessages,
		setEmojiPickerOpen,
		conversationUUID,
		setEditingMessageUUID
	}: InputProps) => {
		const isTyping = useRef<boolean>(false)
		const isTypingTimer = useRef<ReturnType<typeof setTimeout>>()
		const lastTypingType = useRef<string>("")
		const [editor] = useState(() => withReact(withHistory(createEditor())))
		const [editorRef, editorBounds] = useMeasure()
		const [emojiSuggestionsOpen, setEmojiSuggestionsOpen] = useState<boolean>(false)
		const [emojiSuggestionsText, setEmojiSuggestionsText] = useState<string>("")
		const [emojiSuggestions, setEmojiSuggestions] = useState<string[]>([])
		const [emojiSuggestionsPosition, setEmojiSuggestionsPosition] = useState<number>(0)
		const emojiSuggestionsOpenRef = useRef<boolean>(false)
		const [inputFocused, setInputFocused] = useState<boolean>(false)
		const [editMode, setEditMode] = useState<boolean>(false)
		const messageToEditRef = useRef<ChatMessage | undefined>(undefined)
		const [userId] = useDb("userId", 0)
		const [showScrollDownBtn, setShowScrollDownBtn] = useState<boolean>(false)

		const selectItemsFromCloud = useCallback(async () => {
			const items = await selectFromCloud()

			const itemsWithLinkUUIDs: ItemProps[] = []
			const promises: Promise<void>[] = []
			const enablingLinksToast = showToast("loading", i18n(lang, "creatingPublicLinks"), "bottom", 86400000 * 365)

			for (const item of items) {
				promises.push(
					new Promise<void>((resolve, reject) =>
						enableItemPublicLink(item)
							.then(() => {
								itemPublicLinkInfo(item)
									.then(info => {
										itemsWithLinkUUIDs.push({
											...item,
											linkUUID: info.uuid
										})

										resolve()
									})
									.catch(reject)
							})
							.catch(reject)
					)
				)
			}

			await Promise.allSettled(promises)

			dismissToast(enablingLinksToast)

			insertPublicLinks(
				itemsWithLinkUUIDs
					.filter(item => typeof item.linkUUID === "string" && typeof item.key === "string")
					.map(item => window.location.protocol + "//" + window.location.host + "/d/" + item.linkUUID + "#" + item.key)
			)
		}, [])

		const sendTypingEvents = useCallback(async () => {
			if (!currentConversation) {
				return
			}

			const type = isTyping.current ? "down" : "up"

			if (lastTypingType.current === type) {
				return
			}

			lastTypingType.current = type

			const [sendErr] = await safeAwait(chatSendTyping(currentConversation.uuid, type))

			if (sendErr) {
				console.error(sendErr)
			}
		}, [currentConversation])

		const onKeyDownOrUp = useCallback(async () => {
			isTyping.current = true

			sendTypingEvents()

			clearTimeout(isTypingTimer.current)

			isTypingTimer.current = setTimeout(() => {
				isTyping.current = false

				sendTypingEvents()
			}, TYPING_TIMEOUT)
		}, [])

		const getEditorText = useCallback(() => {
			if (!editor) {
				return ""
			}

			let message = ""

			try {
				message = (editor.children as CustomElement[])
					.map(child => (child.children[0].text.length === 0 ? "\n" : child.children[0].text))
					.join("\n")
					.trim()
			} catch (e) {
				console.error(e)
			}

			return message
		}, [editor])

		const insertEmoji = useCallback(
			(emoji: string) => {
				if (!editor || emoji.length === 0) {
					return
				}

				const currentText = getEditorText()
				const newText = currentText.length === 0 || currentText.endsWith(" ") ? emoji + " " : " " + emoji + " "

				ReactEditor.focus(editor)
				Transforms.insertText(editor, newText)
				Transforms.select(editor, Editor.end(editor, []))
			},
			[editor]
		)

		const insertPublicLinks = useCallback(
			(links: string[]) => {
				if (!editor || links.length === 0) {
					return
				}

				const currentText = getEditorText()
				const newText =
					currentText.length === 0 || currentText.endsWith("\n") ? links.join("\n") + "\n\n" : "\n" + links.join("\n") + "\n\n"

				ReactEditor.focus(editor)
				Transforms.insertText(editor, newText)
				Transforms.select(editor, Editor.end(editor, []))
			},
			[editor]
		)

		const insertText = useCallback(
			(text: string) => {
				if (!editor || text.length === 0) {
					return
				}

				ReactEditor.focus(editor)
				Transforms.insertText(editor, text)
				Transforms.select(editor, Editor.end(editor, []))
			},
			[editor]
		)

		const clearEditor = useCallback(() => {
			if (!editor) {
				return
			}

			Transforms.delete(editor, {
				at: {
					anchor: Editor.start(editor, []),
					focus: Editor.end(editor, [])
				}
			})
		}, [editor])

		const replaceEmojiSuggestionWithEmoji = useCallback(
			(emoji: string) => {
				if (!editor) {
					return
				}

				const selection = editor.selection

				if (selection && selection.anchor) {
					const selectedChildrenIndex = selection.anchor.path[0]
					const selected = editor.children[selectedChildrenIndex] as CustomElement

					if (selected && selected.children && Array.isArray(selected.children) && selected.children.length > 0) {
						const message = selected.children[0].text
						const closestIndex = findClosestIndex(message, ":", selection.anchor.offset)

						if (closestIndex !== -1) {
							const replacedMessage = message.slice(0, closestIndex) + emoji + " "

							if (replacedMessage.trim().length > 0) {
								const currentChildren = editor.children as CustomElement[]

								editor.children = currentChildren.map((child, index) =>
									index === selectedChildrenIndex
										? { ...child, children: [{ ...child.children, text: replacedMessage }] }
										: child
								)

								Transforms.select(editor, Editor.end(editor, []))
							}
						}
					}
				}
			},
			[editor]
		)

		const toggleEmojiSuggestions = useCallback(() => {
			if (!editor) {
				return
			}

			const selection = editor.selection

			if (selection && selection.anchor) {
				const selected = editor.children[selection.anchor.path[0]] as CustomElement

				if (selected && selected.children && Array.isArray(selected.children) && selected.children.length > 0) {
					const message = selected.children[0].text

					if (message.length === 0 || message.indexOf(":") === -1 || selection.anchor.offset <= 0) {
						setEmojiSuggestions([])
						setEmojiSuggestionsPosition(0)
						setEmojiSuggestionsOpen(false)
						setEmojiSuggestionsText("")

						return
					}

					const closestIndex = findClosestIndex(message, ":", selection.anchor.offset)
					const sliced = message
						.trim()
						.slice(closestIndex === -1 ? message.lastIndexOf(":") : closestIndex, selection.anchor.offset)
					const open =
						sliced.startsWith(":") &&
						sliced.length >= 3 &&
						sliced.indexOf(" ") === -1 &&
						!sliced.endsWith(":") &&
						!sliced.endsWith(" ")

					if (open && !emojiSuggestionsOpenRef.current) {
						setEmojiSuggestionsPosition(0)
					}

					emojiSuggestionsOpenRef.current = open

					setEmojiSuggestionsOpen(open)
					setEmojiSuggestionsText(open ? sliced : "")

					if (open) {
						SearchIndex.search(sliced.split(":").join(""))
							.then(result => {
								const filtered = result.filter(
									(emoji: any) => emoji && emoji.skins && Array.isArray(emoji.skins) && emoji.skins.length > 0
								)

								if (Array.isArray(filtered) && filtered.length > 0) {
									const shortCodes = filtered.map((emoji: any) => emoji.skins[0].shortcodes)

									if (Array.isArray(shortCodes) && shortCodes.length > 0) {
										setEmojiSuggestions(shortCodes.slice(0, 8))

										return
									}
								}

								setEmojiSuggestions([])
							})
							.catch(console.error)
					} else {
						setEmojiSuggestions([])

						SearchIndex.reset()
					}
				}
			}
		}, [editor])

		const sendMessage = useCallback(async () => {
			if (!editor) {
				return
			}

			const message = getEditorText()

			if (typeof message !== "string" || message.length === 0 || !currentConversation || !currentConversationMe) {
				clearEditor()

				return
			}

			const uuid = uuidv4()

			clearEditor()
			setMessages(prev => [
				{
					conversation: currentConversation!.uuid,
					uuid,
					senderId: currentConversationMe!.userId,
					senderEmail: currentConversationMe!.email,
					senderAvatar: currentConversationMe!.avatar,
					senderNickName: currentConversationMe!.nickName,
					message,
					embedDisabled: false,
					edited: false,
					editedTimestamp: 0,
					sentTimestamp: Date.now()
				},
				...prev
			])

			const privateKey = await db.get("privateKey")
			const key = await decryptChatMessageKey(currentConversationMe.metadata, privateKey)

			if (key.length === 0) {
				setFailedMessages(prev => [...prev, uuid])

				return
			}

			const messageEncrypted = await encryptChatMessage(message, key)

			if (messageEncrypted.length === 0) {
				setFailedMessages(prev => [...prev, uuid])

				return
			}

			const [sendErr] = await safeAwait(sendChatMessage(currentConversation.uuid, uuid, messageEncrypted))

			if (sendErr) {
				setFailedMessages(prev => [...prev, uuid])

				console.error(sendErr)

				return
			}

			eventListener.emit("chatMessageSent", {
				conversation: currentConversation!.uuid,
				uuid,
				senderId: currentConversationMe!.userId,
				senderEmail: currentConversationMe!.email,
				senderAvatar: currentConversationMe!.avatar,
				senderNickName: currentConversationMe!.nickName,
				message,
				embedDisabled: false,
				edited: false,
				editedTimestamp: 0,
				sentTimestamp: Date.now()
			})

			clearTimeout(isTypingTimer.current)

			isTyping.current = false

			sendTypingEvents()
		}, [currentConversation, currentConversationMe])

		const editMessage = useCallback(async () => {
			if (!editor || !editMode) {
				messageToEditRef.current = undefined

				setEditMode(false)
				setEditingMessageUUID("")

				return
			}

			const message = getEditorText()

			if (
				typeof message !== "string" ||
				message.length === 0 ||
				!currentConversation ||
				!currentConversationMe ||
				!messageToEditRef.current ||
				messageToEditRef.current.conversation !== currentConversation.uuid
			) {
				messageToEditRef.current = undefined

				setEditMode(false)
				setEditingMessageUUID("")
				clearEditor()

				return
			}

			const uuid = messageToEditRef.current.uuid

			messageToEditRef.current = undefined

			clearEditor()
			setEditMode(false)
			setEditingMessageUUID("")
			setMessages(prev => prev.map(m => (m.uuid === uuid ? { ...m, message, edited: true, editedTimestamp: Date.now() } : m)))

			const privateKey = await db.get("privateKey")
			const key = await decryptChatMessageKey(currentConversationMe.metadata, privateKey)

			if (key.length === 0) {
				setFailedMessages(prev => [...prev, uuid])

				return
			}

			const messageEncrypted = await encryptChatMessage(message, key)

			if (messageEncrypted.length === 0) {
				setFailedMessages(prev => [...prev, uuid])

				return
			}

			const [editErr] = await safeAwait(editChatMessage(currentConversation.uuid, uuid, messageEncrypted))

			if (editErr) {
				setFailedMessages(prev => [...prev, uuid])

				console.error(editErr)

				return
			}

			clearTimeout(isTypingTimer.current)

			isTyping.current = false

			sendTypingEvents()
		}, [currentConversation, currentConversationMe, editMode])

		const findLastMessageToEdit = useCallback(() => {
			if (editMode || getEditorText().length > 0) {
				return
			}

			const lastMessagesFromUser = messages.filter(m => m.senderId === userId).sort((a, b) => a.sentTimestamp - b.sentTimestamp)

			if (lastMessagesFromUser.length <= 0) {
				return
			}

			eventListener.emit("editChatMessage", lastMessagesFromUser[lastMessagesFromUser.length - 1])
		}, [messages, editMode, userId])

		const onPaste = useCallback(
			throttle((e: React.ClipboardEvent<HTMLDivElement>) => {
				const files = e.clipboardData.files

				if (files.length === 0) {
					return
				}

				const preparingToast = showToast("loading", i18n(lang, "preparingFilesDots"))
				const toUpload = []

				for (let i = 0; i < files.length; i++) {
					Object.defineProperty(files[i], "fullPath", {
						value: files[i].name,
						writable: true
					})

					toUpload.push(files[i])
				}

				const requestId = window.location.href

				const sub = eventListener.on("uploadsDone", ({ requestId: rId, items }: { requestId: string; items: ItemProps[] }) => {
					if (rId === requestId) {
						sub.remove()

						eventListener.emit("chatAddFiles", {
							conversation: getCurrentParent(requestId),
							items
						})
					}
				})

				eventListener.emit("openUploadModal", {
					files: toUpload.filter(file => file.size > 0),
					openModal: true,
					chatUpload: true,
					requestId
				})

				dismissToast(preparingToast)
			}, 100),
			[]
		)

		useEffect(() => {
			setEmojiSuggestionsPosition(0)
		}, [emojiSuggestions.length])

		useEffect(() => {
			clearEditor()
			setEmojiSuggestionsOpen(false)
			setEmojiSuggestionsText("")
			setEmojiSuggestions([])
		}, [conversationUUID])

		useEffect(() => {
			eventListener.emit("scrollChatToBottom")
		}, [editorBounds.height])

		useEffect(() => {
			const chatAddFilesListener = eventListener.on(
				"chatAddFiles",
				({ conversation, items }: { conversation: string; items: ItemProps[] }) => {
					if (getCurrentParent() === conversation) {
						insertPublicLinks(
							items
								.filter(item => typeof item.linkUUID === "string" && typeof item.key === "string")
								.map(
									item => window.location.protocol + "//" + window.location.host + "/d/" + item.linkUUID + "#" + item.key
								)
						)
					}
				}
			)

			const editChatMessageListener = eventListener.on("editChatMessage", (messageToEdit: ChatMessage) => {
				messageToEditRef.current = messageToEdit

				setEditingMessageUUID(messageToEdit.uuid)
				setEditMode(true)
				clearEditor()
				insertText(messageToEdit.message)
			})

			const showChatScrollDownBtnListener = eventListener.on("showChatScrollDownBtn", (show: boolean) => {
				setShowScrollDownBtn(show)
			})

			return () => {
				chatAddFilesListener.remove()
				editChatMessageListener.remove()
				showChatScrollDownBtnListener.remove()
			}
		}, [])

		return (
			<Flex
				flexDirection="column"
				width="100%"
				overflow="hidden"
			>
				<Flex
					ref={editorRef}
					marginBottom="24px"
					paddingTop="2px"
				>
					<Slate
						editor={editor}
						initialValue={[
							{
								type: "paragraph",
								children: [
									{
										text: ""
									}
								]
							}
						]}
					>
						{editorBounds && editorBounds.height > 0 && editorBounds.width > 0 && (
							<>
								{messages.length > 0 &&
									showScrollDownBtn &&
									emojiSuggestions.length <= 0 &&
									!emojiSuggestionsOpen &&
									emojiSuggestionsText.length <= 0 && (
										<Flex
											position="absolute"
											zIndex={1001}
											bottom={editorBounds.height + 20 + "px"}
											width={editorBounds.width}
											height="47px"
											backgroundColor={getColor(darkMode, "backgroundTertiary")}
											boxShadow="md"
											borderRadius="10px"
											borderBottomRadius="0px"
											padding="8px"
											paddingLeft="10px"
											paddingRight="10px"
											transition="200ms"
											maxHeight="350px"
											overflow="hidden"
											flexDirection="row"
											justifyContent="space-between"
											gap="25px"
											alignItems="flex-start"
										>
											<AppText
												isMobile={isMobile}
												darkMode={darkMode}
												fontSize={13}
												color={getColor(darkMode, "textSecondary")}
											>
												{i18n(lang, "chatViewingOlderMessages")}
											</AppText>
											<Flex
												flexDirection="row"
												gap="8px"
												alignItems="center"
											>
												<AppText
													isMobile={isMobile}
													darkMode={darkMode}
													fontSize={12}
													color={getColor(darkMode, "textPrimary")}
													onClick={() => eventListener.emit("scrollChatToBottom", "smooth")}
													cursor="pointer"
												>
													{i18n(lang, "chatJumpToPresent")}
												</AppText>
												<AiOutlineCaretDown
													size={13}
													color={getColor(darkMode, "textPrimary")}
													style={{
														flexShrink: 0
													}}
												/>
											</Flex>
										</Flex>
									)}
								{emojiSuggestions.length > 0 && emojiSuggestionsOpen && emojiSuggestionsText.length > 0 && inputFocused && (
									<Flex
										position="absolute"
										zIndex={100001}
										bottom={editorBounds.height + 45 + "px"}
										width={editorBounds.width}
										height="auto"
										backgroundColor={getColor(darkMode, "backgroundSecondary")}
										border={"1px solid " + getColor(darkMode, "borderPrimary")}
										boxShadow="md"
										borderRadius="10px"
										padding="10px"
										transition="200ms"
										maxHeight="350px"
										overflow="hidden"
										flexDirection="column"
										gap="10px"
									>
										<Flex
											flexDirection="row"
											alignItems="center"
											gap="5px"
										>
											<AppText
												isMobile={isMobile}
												darkMode={darkMode}
												fontSize={11}
												textTransform="uppercase"
												color={getColor(darkMode, "textPrimary")}
											>
												{i18n(lang, "chatEmojisMatching")}
											</AppText>
											<AppText
												isMobile={isMobile}
												darkMode={darkMode}
												fontSize={11}
												textTransform="uppercase"
												color={getColor(darkMode, "textSecondary")}
											>
												{emojiSuggestionsText}
											</AppText>
										</Flex>
										{emojiSuggestions.length > 0 && (
											<Flex flexDirection="column">
												{emojiSuggestions.map((shortCode, index) => {
													return (
														<Flex
															key={index}
															backgroundColor={
																emojiSuggestionsPosition === index
																	? getColor(darkMode, "backgroundTertiary")
																	: getColor(darkMode, "backgroundSecondary")
															}
															color={getColor(darkMode, "textSecondary")}
															_hover={{
																backgroundColor: getColor(darkMode, "backgroundTertiary"),
																color: getColor(darkMode, "textPrimary")
															}}
															padding="3px"
															paddingLeft="5px"
															paddingRight="5px"
															borderRadius="5px"
															flexDirection="row"
															alignItems="center"
															gap="5px"
															cursor="pointer"
															onClick={() => insertEmoji(shortCode)}
														>
															<Flex
																alignItems="center"
																width="24px"
															>
																<EmojiElement
																	shortcodes={shortCode}
																	fallback={shortCode}
																	size="18px"
																/>
															</Flex>
															<AppText
																isMobile={isMobile}
																darkMode={darkMode}
																fontSize={15}
																color={getColor(darkMode, "textPrimary")}
															>
																{shortCode}
															</AppText>
														</Flex>
													)
												})}
											</Flex>
										)}
									</Flex>
								)}
								<Menu>
									<MenuButton
										as={forwardRef((props, ref) => (
											<Flex
												ref={ref}
												{...props}
												position="absolute"
												zIndex={100001}
												marginLeft="10px"
												color={getColor(darkMode, "textSecondary")}
												_hover={{
													color: getColor(darkMode, "textPrimary")
												}}
												marginTop="9px"
											>
												<AiFillPlusCircle
													size={22}
													cursor="pointer"
												/>
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
										marginLeft="-10px"
										marginBottom="5px"
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
											onClick={selectItemsFromCloud}
										>
											{i18n(lang, "selectFromCloud")}
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
											onClick={() => document.getElementById("file-input-chat")?.click()}
										>
											{i18n(lang, "selectFromComputer")}
										</MenuItem>
									</MenuList>
								</Menu>
								<Flex
									position="absolute"
									zIndex={100001}
									marginTop="2px"
									marginLeft={editorBounds.width - 30 + "px"}
								>
									<Menu
										onOpen={() => setEmojiPickerOpen(true)}
										onClose={() => setEmojiPickerOpen(false)}
									>
										<MenuButton
											as={forwardRef((props, ref) => (
												<Flex
													ref={ref}
													{...props}
													cursor="pointer"
													marginTop="8px"
													color={getColor(darkMode, "textSecondary")}
													_hover={{
														color: getColor(darkMode, "textPrimary")
													}}
												>
													<AiOutlineSmile size={22} />
												</Flex>
											))}
										>
											Emojis
										</MenuButton>
										<MenuList
											boxShadow="base"
											padding="0px"
											borderColor={getColor(darkMode, "borderPrimary")}
											backgroundColor={getColor(darkMode, "backgroundSecondary")}
											background={getColor(darkMode, "backgroundSecondary")}
											marginTop="-485px"
											marginRight="-8px"
										>
											<ErrorBoundary fallback={<></>}>
												<Suspense fallback={<></>}>
													<EmojiPicker
														onEmojiSelect={(e: { shortcodes: string }) => insertEmoji(e.shortcodes)}
														onClickOutside={() => setEmojiPickerOpen(false)}
														autoFocus={true}
														emojiButtonColors={getColor(darkMode, "purple")}
														icons="outline"
														locale={lang}
														theme={darkMode ? "dark" : "light"}
														data={emojiData}
														custom={customEmojis}
													/>
												</Suspense>
											</ErrorBoundary>
										</MenuList>
									</Menu>
								</Flex>
							</>
						)}
						<Editable
							placeholder={i18n(lang, "chatInput")}
							onFocus={() => setInputFocused(true)}
							onBlur={() => setInputFocused(false)}
							onPaste={onPaste}
							onKeyDown={e => {
								onKeyDownOrUp()
								toggleEmojiSuggestions()

								if (
									emojiSuggestions.length > 0 &&
									emojiSuggestionsOpen &&
									emojiSuggestionsText.length > 0 &&
									inputFocused
								) {
									if (e.key === "ArrowUp") {
										e.preventDefault()
									}
								}

								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault()

									if (
										emojiSuggestions.length > 0 &&
										emojiSuggestionsOpen &&
										emojiSuggestionsText.length > 0 &&
										inputFocused
									) {
										if (typeof emojiSuggestions[emojiSuggestionsPosition] === "string") {
											replaceEmojiSuggestionWithEmoji(emojiSuggestions[emojiSuggestionsPosition])
											setEmojiSuggestionsOpen(false)
											setEmojiSuggestionsText("")
											setEmojiSuggestions([])
											setEmojiSuggestionsPosition(0)
										}
									} else {
										if (editMode) {
											editMessage()
										} else {
											sendMessage()
										}
									}
								}

								if (editMode && getEditorText().length <= 0) {
									e.preventDefault()

									messageToEditRef.current = undefined

									setEditingMessageUUID("")
									setEditMode(false)
								} else {
									if (e.key === "ArrowUp" && getEditorText().length <= 0) {
										e.preventDefault()

										findLastMessageToEdit()
									}
								}

								if (e.key === "Escape" && editMode) {
									e.preventDefault()

									clearEditor()

									messageToEditRef.current = undefined

									setEditingMessageUUID("")
									setEditMode(false)
								}
							}}
							onKeyUp={e => {
								onKeyDownOrUp()
								toggleEmojiSuggestions()

								if (
									emojiSuggestions.length > 0 &&
									emojiSuggestionsOpen &&
									emojiSuggestionsText.length > 0 &&
									inputFocused
								) {
									e.preventDefault()

									if (e.key === "ArrowUp") {
										setEmojiSuggestionsPosition(prev =>
											prev - 1 < 0 ? emojiSuggestions.length - 1 : prev >= 1 ? prev - 1 : prev
										)
									} else if (e.key === "ArrowDown") {
										setEmojiSuggestionsPosition(prev =>
											prev + 1 >= emojiSuggestions.length
												? 0
												: prev + 1 <= emojiSuggestions.length - 1
												? prev + 1
												: prev
										)
									}
								}

								if (editMode && getEditorText().length <= 0) {
									e.preventDefault()

									messageToEditRef.current = undefined

									setEditingMessageUUID("")
									setEditMode(false)
								}
							}}
							className="slate-editor"
							autoCorrect="none"
							autoCapitalize="none"
							autoFocus={false}
							autoComplete="none"
							spellCheck={false}
							style={{
								backgroundColor: getColor(darkMode, "backgroundSecondary"),
								width: "100%",
								minHeight: "40px",
								maxHeight: "40vh",
								overflowY: "auto",
								overflowX: "hidden",
								borderRadius: "10px",
								paddingLeft: "45px",
								paddingRight: "50px",
								paddingTop: "10px",
								paddingBottom: "10px",
								color: getColor(darkMode, "textPrimary"),
								fontSize: 14,
								position: "relative",
								overflowWrap: "break-word",
								zIndex: 10001
							}}
						/>
					</Slate>
				</Flex>
				<ChatContainerInputTyping
					darkMode={darkMode}
					isMobile={isMobile}
					lang={lang}
				/>
			</Flex>
		)
	}
)

export default Input
