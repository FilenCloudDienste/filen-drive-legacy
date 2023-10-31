import { memo, useCallback, useState, useRef, useEffect, Suspense, lazy } from "react"
import { Flex, Menu, MenuButton, MenuList, forwardRef, MenuItem, Avatar } from "@chakra-ui/react"
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
import { safeAwait, getCurrentParent, findClosestIndex, generateAvatarColorCode } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import AppText from "../AppText"
import { AiOutlineSmile, AiFillPlusCircle, AiOutlineCaretDown, AiFillCloseCircle } from "react-icons/ai"
import { ErrorBoundary } from "react-error-boundary"
import { createEditor, Editor, BaseEditor, Transforms } from "slate"
import useMeasure from "react-use-measure"
import { ReactEditor } from "slate-react"
import { Slate, Editable, withReact } from "slate-react"
import { withHistory } from "slate-history"
import { SearchIndex } from "emoji-mart"
import { EmojiElement } from "./utils"
import { custom as customEmojis } from "./customEmojis"
import emojiData from "@emoji-mart/data"
import { ItemProps } from "../../types"
import { show as showToast, dismiss as dismissToast } from "../Toast/Toast"
import throttle from "lodash/throttle"
import { selectFromCloud } from "../SelectFromCloud/SelectFromCloud"
import useDb from "../../lib/hooks/useDb"
import { getUserNameFromMessage, getUserNameFromParticipant } from "./utils"
import InputTyping, { TYPING_TIMEOUT } from "./InputTyping"
import { validate } from "uuid"

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
	setReplyMessageUUID: React.Dispatch<React.SetStateAction<string>>
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
		setEditingMessageUUID,
		setReplyMessageUUID
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
		const [replyToMessage, setReplyToMessage] = useState<ChatMessage | undefined>(undefined)
		const [mentionMode, setMentionMode] = useState<boolean>(false)
		const [mentionPosition, setMentionPosition] = useState<number>(0)
		const [mentionSearch, setMentionSearch] = useState<ChatConversationParticipant[]>([])
		const mentionModeRef = useRef<boolean>(false)
		const focusEditorTimeout = useRef<ReturnType<typeof setTimeout>>()

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
			const uuid = getCurrentParent(window.location.href)

			if (!validate(uuid)) {
				return
			}

			const type = isTyping.current ? "down" : "up"

			if (lastTypingType.current === type) {
				return
			}

			lastTypingType.current = type

			const [sendErr] = await safeAwait(chatSendTyping(uuid, type))

			if (sendErr) {
				console.error(sendErr)
			}
		}, [])

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

		const focusEditor = useCallback(() => {
			if (!editor) {
				return
			}

			ReactEditor.focus(editor)
			Transforms.select(editor, Editor.end(editor, []))
		}, [editor])

		const insertEmoji = useCallback(
			(emoji: string) => {
				if (!editor || emoji.length === 0) {
					return
				}

				const currentText = getEditorText()
				const newText = currentText.length === 0 || currentText.endsWith(" ") ? emoji + " " : " " + emoji + " "

				focusEditor()

				Transforms.insertText(editor, newText)
				Transforms.select(editor, Editor.end(editor, []))

				focusEditor()
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

				focusEditor()

				Transforms.insertText(editor, newText)
				Transforms.select(editor, Editor.end(editor, []))

				focusEditor()
			},
			[editor]
		)

		const insertText = useCallback(
			(text: string) => {
				if (!editor || text.length === 0) {
					return
				}

				focusEditor()

				Transforms.insertText(editor, text)
				Transforms.select(editor, Editor.end(editor, []))

				focusEditor()
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

		const addMentionToInput = useCallback(
			(id: number) => {
				if (!editor || !currentConversation) {
					return
				}

				const foundParticipant = currentConversation.participants.filter(p => p.userId === id)
				const selection = editor.selection

				if (selection && selection.anchor && foundParticipant.length !== 0) {
					const selectedChildrenIndex = selection.anchor.path[0]
					const selected = editor.children[selectedChildrenIndex] as CustomElement

					if (selected && selected.children && Array.isArray(selected.children) && selected.children.length > 0) {
						const message = selected.children[0].text
						const closestIndex = findClosestIndex(message, "@", selection.anchor.offset)

						if (closestIndex !== -1) {
							const replacedMessage = message.slice(0, closestIndex) + "@" + foundParticipant[0].email + " "

							if (replacedMessage.trim().length > 0) {
								const currentChildren = editor.children as CustomElement[]

								editor.children = currentChildren.map((child, index) =>
									index === selectedChildrenIndex
										? {
												...child,
												children: [
													{
														...child.children,
														text: replacedMessage
													}
												]
										  }
										: child
								)

								Transforms.select(editor, Editor.end(editor, []))
							}
						}
					}
				}
			},
			[editor, currentConversation]
		)

		const addTextAfterTextComponent = useCallback(
			(component: string, text: string) => {
				if (!editor) {
					return
				}

				const selection = editor.selection

				if (selection && selection.anchor) {
					const selectedChildrenIndex = selection.anchor.path[0]
					const selected = editor.children[selectedChildrenIndex] as CustomElement

					if (selected && selected.children && Array.isArray(selected.children) && selected.children.length > 0) {
						const message = selected.children[0].text
						const closestIndex = findClosestIndex(message, component, selection.anchor.offset)

						if (closestIndex !== -1) {
							const replacedMessage = message.slice(0, closestIndex) + text + " "

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

		const toggleMentions = useCallback(() => {
			if (!editor || !currentConversation) {
				return
			}

			const selection = editor.selection

			if (selection && selection.anchor) {
				const selected = editor.children[selection.anchor.path[0]] as CustomElement

				if (selected && selected.children && Array.isArray(selected.children) && selected.children.length > 0) {
					const message = selected.children[0].text

					if (message.length === 0 || message.indexOf("@") === -1 || selection.anchor.offset <= 0) {
						setMentionMode(false)

						mentionModeRef.current = false

						return
					}

					const closestIndex = findClosestIndex(message, "@", selection.anchor.offset)
					const sliced = message.slice(closestIndex === -1 ? message.lastIndexOf("@") : closestIndex, selection.anchor.offset)
					const open = sliced.startsWith("@") && sliced.length >= 1 && sliced.indexOf(" ") === -1 && !sliced.endsWith(" ")

					setMentionMode(open)

					if (open && !mentionModeRef.current) {
						setEmojiSuggestionsPosition(0)
					}

					mentionModeRef.current = open

					if (open) {
						const searchFor = sliced.split("@").join("").trim().toLowerCase()
						const filteredParticipants = currentConversation.participants.filter(
							p => p.email.toLowerCase().indexOf(searchFor) !== -1 || p.nickName.toLowerCase().indexOf(searchFor) !== -1
						)

						if (filteredParticipants.length === 0) {
							setMentionMode(false)

							mentionModeRef.current = false

							return
						}

						setMentionSearch([
							...filteredParticipants,
							...[
								{
									userId: 0,
									email: "everyone",
									avatar: null,
									nickName: "everyone",
									metadata: "",
									permissionsAdd: false,
									addedTimestamp: 0
								}
							]
						])
					} else {
						setMentionMode(false)

						mentionModeRef.current = false
					}
				}
			}
		}, [editor, currentConversation])

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

						emojiSuggestionsOpenRef.current = false

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

			if (message.length > 4096) {
				showToast("error", i18n(lang, "chatMessageLimitReached", true, ["__LIMIT__"], ["2000"]))

				return
			}

			const uuid = uuidv4()
			const replyMessage = replyToMessage

			setReplyToMessage(undefined)
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
					replyTo: {
						uuid: typeof replyMessage !== "undefined" ? replyMessage.uuid : "",
						senderId: typeof replyMessage !== "undefined" ? replyMessage.senderId : 0,
						senderEmail: typeof replyMessage !== "undefined" ? replyMessage.senderEmail : "",
						senderAvatar:
							typeof replyMessage !== "undefined" && typeof replyMessage.senderAvatar === "string"
								? replyMessage.senderAvatar
								: "",
						senderNickName:
							typeof replyMessage !== "undefined" && typeof replyMessage.senderNickName === "string"
								? replyMessage.senderNickName
								: "",
						message: typeof replyMessage !== "undefined" ? replyMessage.message : ""
					},
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

			const [sendErr] = await safeAwait(
				sendChatMessage(
					currentConversation.uuid,
					uuid,
					messageEncrypted,
					typeof replyMessage !== "undefined" ? replyMessage.uuid : ""
				)
			)

			if (sendErr) {
				setFailedMessages(prev => [...prev, uuid])

				console.error(sendErr)

				return
			}

			eventListener.emit("scrollChatToBottom")
			eventListener.emit("chatMessageSent", {
				conversation: currentConversation!.uuid,
				uuid,
				senderId: currentConversationMe!.userId,
				senderEmail: currentConversationMe!.email,
				senderAvatar: currentConversationMe!.avatar,
				senderNickName: currentConversationMe!.nickName,
				message,
				replyTo: {
					uuid: typeof replyMessage !== "undefined" ? replyMessage.uuid : "",
					senderId: typeof replyMessage !== "undefined" ? replyMessage.senderId : 0,
					senderEmail: typeof replyMessage !== "undefined" ? replyMessage.senderEmail : "",
					senderAvatar:
						typeof replyMessage !== "undefined" && typeof replyMessage.senderAvatar === "string"
							? replyMessage.senderAvatar
							: "",
					senderNickName:
						typeof replyMessage !== "undefined" && typeof replyMessage.senderNickName === "string"
							? replyMessage.senderNickName
							: "",
					message: typeof replyMessage !== "undefined" ? replyMessage.message : ""
				},
				embedDisabled: false,
				edited: false,
				editedTimestamp: 0,
				sentTimestamp: Date.now()
			})

			clearTimeout(isTypingTimer.current)

			isTyping.current = false

			sendTypingEvents()
		}, [currentConversation, currentConversationMe, replyToMessage])

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
				messageToEditRef.current.conversation !== currentConversation.uuid ||
				JSON.stringify(message) === JSON.stringify(messageToEditRef.current.message)
			) {
				messageToEditRef.current = undefined

				setEditMode(false)
				setEditingMessageUUID("")
				clearEditor()

				return
			}

			if (message.length > 4096) {
				showToast("error", i18n(lang, "chatMessageLimitReached", true, ["__LIMIT__"], ["2000"]))

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

		const windowOnKeyDown = useCallback(
			(e: KeyboardEvent) => {
				if (e.key === "Escape" && editMode) {
					e.preventDefault()

					clearEditor()

					messageToEditRef.current = undefined

					setEditingMessageUUID("")
					setEditMode(false)
				}

				if (e.key === "Escape" && typeof replyToMessage !== "undefined") {
					e.preventDefault()

					setReplyToMessage(undefined)
				}
			},
			[editMode, replyToMessage]
		)

		useEffect(() => {
			setReplyMessageUUID(typeof replyToMessage === "undefined" ? "" : replyToMessage.uuid)
		}, [replyToMessage])

		useEffect(() => {
			if (!editMode) {
				setEditingMessageUUID("")
			}
		}, [editMode])

		useEffect(() => {
			setEmojiSuggestionsPosition(0)
		}, [emojiSuggestions.length])

		useEffect(() => {
			if (!mentionMode) {
				setMentionPosition(0)
				setMentionSearch([])
			}
		}, [mentionMode])

		useEffect(() => {
			clearEditor()
			setEmojiSuggestionsOpen(false)
			setEmojiSuggestionsText("")
			setEmojiSuggestions([])
			setEditMode(false)
			setMentionMode(false)
		}, [conversationUUID])

		useEffect(() => {
			if (editor) {
				clearTimeout(focusEditorTimeout.current)

				focusEditorTimeout.current = setTimeout(() => {
					focusEditor()
				}, 300)
			}
		}, [conversationUUID, editor])

		useEffect(() => {
			eventListener.emit("scrollChatToBottom")
		}, [editorBounds.height])

		useEffect(() => {
			window.addEventListener("keydown", windowOnKeyDown)

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
				focusEditor()
			})

			const showChatScrollDownBtnListener = eventListener.on("showChatScrollDownBtn", (show: boolean) => {
				setShowScrollDownBtn(show)
			})

			const replyToChatMessageListener = eventListener.on("replyToChatMessage", (message: ChatMessage) => {
				setReplyToMessage(message)
				focusEditor()
			})

			return () => {
				window.removeEventListener("keydown", windowOnKeyDown)

				chatAddFilesListener.remove()
				editChatMessageListener.remove()
				showChatScrollDownBtnListener.remove()
				replyToChatMessageListener.remove()
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
								{mentionMode && currentConversation && (
									<Flex
										position="absolute"
										zIndex={75}
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
										<Flex>
											<AppText
												isMobile={isMobile}
												darkMode={darkMode}
												fontSize={13}
												noOfLines={1}
												wordBreak="break-all"
												color={getColor(darkMode, "textSecondary")}
												textTransform="uppercase"
											>
												{i18n(lang, "chatParticipants")}
											</AppText>
										</Flex>
										<Flex
											flexDirection="column"
											maxHeight="350px"
											width="100%"
											overflowX="hidden"
											overflowY="auto"
										>
											{(mentionSearch.length > 0 ? mentionSearch : currentConversation.participants).map(
												(p, index) => {
													return (
														<Flex
															key={index}
															flexDirection="column"
															width="100%"
														>
															{p.email === "everyone" && (
																<Flex
																	width="100%"
																	height="1px"
																	backgroundColor={getColor(darkMode, "borderSecondary")}
																	marginTop="8px"
																	marginBottom="8px"
																/>
															)}
															<Flex
																backgroundColor={
																	mentionPosition === index
																		? getColor(darkMode, "backgroundTertiary")
																		: getColor(darkMode, "backgroundSecondary")
																}
																color={getColor(darkMode, "textSecondary")}
																_hover={{
																	backgroundColor: getColor(darkMode, "backgroundTertiary"),
																	color: getColor(darkMode, "textPrimary")
																}}
																padding="5px"
																paddingLeft="10px"
																paddingRight="10px"
																borderRadius="5px"
																flexDirection="row"
																alignItems="center"
																justifyContent="space-between"
																gap="15px"
																cursor="pointer"
																onClick={() => {
																	if (p.email === "everyone") {
																		addTextAfterTextComponent("@", "@everyone")
																	} else {
																		addMentionToInput(p.userId)
																	}

																	setMentionMode(false)
																}}
															>
																<Flex
																	flexDirection="row"
																	alignItems="center"
																	gap="8px"
																>
																	{p.email !== "everyone" && (
																		<Avatar
																			name={
																				typeof p.avatar === "string" &&
																				p.avatar.indexOf("https://") !== -1
																					? undefined
																					: p.email
																			}
																			src={
																				typeof p.avatar === "string" &&
																				p.avatar.indexOf("https://") !== -1
																					? p.avatar
																					: undefined
																			}
																			bg={generateAvatarColorCode(p.email, darkMode, p.avatar)}
																			width="26px"
																			height="26px"
																			borderRadius="full"
																			border="none"
																		/>
																	)}
																	<AppText
																		isMobile={isMobile}
																		darkMode={darkMode}
																		fontSize={14}
																		noOfLines={1}
																		wordBreak="break-all"
																		color={getColor(darkMode, "textPrimary")}
																	>
																		{p.email === "everyone"
																			? "@everyone"
																			: getUserNameFromParticipant(p)}
																	</AppText>
																</Flex>
																{p.email !== "everyone" && (
																	<AppText
																		isMobile={isMobile}
																		darkMode={darkMode}
																		fontSize={13}
																		noOfLines={1}
																		wordBreak="break-all"
																		color={getColor(darkMode, "textSecondary")}
																	>
																		{p.email}
																	</AppText>
																)}
															</Flex>
														</Flex>
													)
												}
											)}
										</Flex>
									</Flex>
								)}
								{typeof replyToMessage !== "undefined" && (
									<Flex
										position="absolute"
										zIndex={50}
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
										<Flex
											flexDirection="row"
											alignItems="center"
											gap="5px"
										>
											<AppText
												isMobile={isMobile}
												darkMode={darkMode}
												fontSize={13}
												noOfLines={1}
												wordBreak="break-all"
												color={getColor(darkMode, "textSecondary")}
											>
												{i18n(lang, "chatReplyingTo")}
											</AppText>
											<AppText
												isMobile={isMobile}
												darkMode={darkMode}
												fontSize={13}
												noOfLines={1}
												wordBreak="break-all"
												color={getColor(darkMode, "textPrimary")}
											>
												{getUserNameFromMessage(replyToMessage)}
											</AppText>
										</Flex>
										<Flex
											flexDirection="row"
											alignItems="center"
											onClick={() => setReplyToMessage(undefined)}
											color={getColor(darkMode, "textSecondary")}
											_hover={{
												color: getColor(darkMode, "textPrimary")
											}}
										>
											<AiFillCloseCircle
												size={20}
												onClick={() => setReplyToMessage(undefined)}
												style={{
													flexShrink: 0,
													cursor: "pointer"
												}}
											/>
										</Flex>
									</Flex>
								)}
								{messages.length > 0 &&
									showScrollDownBtn &&
									emojiSuggestions.length <= 0 &&
									!emojiSuggestionsOpen &&
									emojiSuggestionsText.length <= 0 && (
										<Flex
											position="absolute"
											zIndex={10}
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
												noOfLines={1}
												wordBreak="break-all"
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
													noOfLines={1}
													wordBreak="break-all"
												>
													{i18n(lang, "chatJumpToPresent")}
												</AppText>
												<AiOutlineCaretDown
													size={13}
													onClick={() => eventListener.emit("scrollChatToBottom", "smooth")}
													color={getColor(darkMode, "textPrimary")}
													style={{
														flexShrink: 0
													}}
												/>
											</Flex>
										</Flex>
									)}
								{emojiSuggestions.length > 0 && emojiSuggestionsOpen && emojiSuggestionsText.length > 0 && (
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
									zIndex={1001}
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
								toggleMentions()

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

								if (mentionMode && inputFocused) {
									if (e.key === "ArrowUp") {
										e.preventDefault()
									}
								}

								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault()

									if (inputFocused && mentionMode && mentionSearch.length > 0) {
										if (typeof mentionSearch[mentionPosition] !== "undefined") {
											if (mentionSearch[mentionPosition].email === "everyone") {
												addTextAfterTextComponent("@", "@everyone")
											} else {
												addMentionToInput(mentionSearch[mentionPosition].userId)
											}

											setMentionMode(false)
										}
									} else {
										if (
											emojiSuggestions.length > 0 &&
											emojiSuggestionsOpen &&
											emojiSuggestionsText.length > 0 &&
											inputFocused
										) {
											if (typeof emojiSuggestions[emojiSuggestionsPosition] === "string") {
												addTextAfterTextComponent(":", emojiSuggestions[emojiSuggestionsPosition])
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

								if (e.key === "Escape" && typeof replyToMessage !== "undefined") {
									e.preventDefault()

									setReplyToMessage(undefined)
								}
							}}
							onKeyUp={e => {
								onKeyDownOrUp()
								toggleEmojiSuggestions()
								toggleMentions()

								if (mentionMode && inputFocused && mentionSearch.length > 0) {
									e.preventDefault()

									if (e.key === "ArrowUp") {
										setMentionPosition(prev => (prev - 1 < 0 ? mentionSearch.length - 1 : prev >= 1 ? prev - 1 : prev))
									} else if (e.key === "ArrowDown") {
										setMentionPosition(prev =>
											prev + 1 >= mentionSearch.length ? 0 : prev + 1 <= mentionSearch.length - 1 ? prev + 1 : prev
										)
									}
								}

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
							maxLength={2000}
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
								zIndex: 101
							}}
						/>
					</Slate>
				</Flex>
				<InputTyping
					darkMode={darkMode}
					isMobile={isMobile}
					lang={lang}
				/>
			</Flex>
		)
	}
)

export default Input
