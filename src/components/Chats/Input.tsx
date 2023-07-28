import { memo, useCallback, useState, useRef, useEffect, Suspense, lazy } from "react"
import { Flex, Menu, MenuButton, MenuList, forwardRef } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import { i18n } from "../../i18n"
import { ChatMessage, sendChatMessage, ChatConversation, chatSendTyping, ChatConversationParticipant } from "../../lib/api"
import db from "../../lib/db"
import { v4 as uuidv4 } from "uuid"
import { encryptChatMessage, decryptChatMessageKey } from "../../lib/worker/worker.com"
import { safeAwait } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import { SocketEvent } from "../../lib/services/socket"
import AppText from "../AppText"
import { AiOutlineSmile, AiFillPlusCircle } from "react-icons/ai"
import { ErrorBoundary } from "react-error-boundary"
import { createEditor, Editor, BaseEditor, Transforms } from "slate"
import useMeasure from "react-use-measure"
import { ReactEditor } from "slate-react"
import { Slate, Editable, withReact } from "slate-react"
import { withHistory } from "slate-history"
import { IoEllipsisHorizontalOutline } from "react-icons/io5"

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
	currentConversation: ChatConversation | undefined
}

export const TYPING_TIMEOUT = 2000
export const TYPING_TIMEOUT_LAG = 30000

export const ChatContainerInputTyping = memo(({ darkMode, isMobile, lang, currentConversation }: ChatContainerInputTypingProps) => {
	const [usersTyping, setUsersTyping] = useState<ChatConversationParticipant[]>([])
	const usersTypingTimeout = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
	const currentConversationRef = useRef<ChatConversation | undefined>(undefined)

	useEffect(() => {
		currentConversationRef.current = currentConversation
	}, [currentConversation])

	useEffect(() => {
		const chatTypingListener = eventListener.on("socketEvent", (event: SocketEvent) => {
			if (
				event.type === "chatTyping" &&
				currentConversationRef.current &&
				currentConversationRef.current.uuid === event.data.conversation
			) {
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

			if (
				event.type === "chatMessageNew" &&
				currentConversationRef.current &&
				currentConversationRef.current.uuid === event.data.conversation
			) {
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
	setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
	setEmojiPickerOpen: React.Dispatch<React.SetStateAction<boolean>>
	conversationUUID: string
}

export const Input = memo(
	({
		darkMode,
		isMobile,
		lang,
		currentConversation,
		currentConversationMe,
		setFailedMessages,
		setMessages,
		setEmojiPickerOpen,
		conversationUUID
	}: InputProps) => {
		const isTyping = useRef<boolean>(false)
		const isTypingTimer = useRef<ReturnType<typeof setTimeout>>()
		const lastTypingType = useRef<string>("")
		const [editor] = useState(() => withReact(withHistory(createEditor())))
		const [editorRef, editorBounds] = useMeasure()

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

		const sendMessage = useCallback(async () => {
			let message = ""

			try {
				message = (editor.children as CustomElement[])
					.map(child => (child.children[0].text.length === 0 ? "\n" : child.children[0].text))
					.join("\n")
					.trim()
			} catch (e) {
				console.error(e)
			}

			if (message.length === 0 || !currentConversation || !currentConversationMe) {
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

			clearTimeout(isTypingTimer.current)

			isTyping.current = false

			sendTypingEvents()
		}, [currentConversation, currentConversationMe])

		useEffect(() => {
			clearEditor()
		}, [conversationUUID])

		useEffect(() => {
			eventListener.emit("scrollChatToBottom")
		}, [editorBounds.height])

		return (
			<Flex
				flexDirection="column"
				width="100%"
				overflow="hidden"
			>
				<Flex
					ref={editorRef}
					marginBottom="24px"
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
						<Flex
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
									{i18n(lang, "file")}
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
												onEmojiSelect={(e: { shortcodes: string }) => editor.insertText(e.shortcodes)}
												onClickOutside={() => setEmojiPickerOpen(false)}
												autoFocus={false}
												emojiButtonColors={getColor(darkMode, "purple")}
												icons="outline"
												locale={lang}
												theme={darkMode ? "dark" : "light"}
											/>
										</Suspense>
									</ErrorBoundary>
								</MenuList>
							</Menu>
						</Flex>
						<Editable
							placeholder={i18n(lang, "chatInput")}
							onKeyDown={e => {
								onKeyDownOrUp()

								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault()

									sendMessage()
								}
							}}
							autoCorrect="none"
							autoCapitalize="none"
							autoFocus={false}
							autoComplete="none"
							spellCheck={false}
							style={{
								backgroundColor: getColor(darkMode, "backgroundSecondary"),
								width: "100%",
								minHeight: "40px",
								maxHeight: "50vh",
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
								overflowWrap: "break-word"
							}}
						/>
					</Slate>
				</Flex>
				<ChatContainerInputTyping
					darkMode={darkMode}
					isMobile={isMobile}
					lang={lang}
					currentConversation={currentConversation}
				/>
			</Flex>
		)
	}
)

export default Input
