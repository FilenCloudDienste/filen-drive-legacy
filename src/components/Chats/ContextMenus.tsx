import { memo, useState, useEffect } from "react"
import { Menu as ContextMenu, Item as ContextMenuItem, contextMenu, animation, Separator as ContextMenuSeparator } from "react-contexify"
import { ChatMessage, ChatConversation } from "../../lib/api"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useLang from "../../lib/hooks/useLang"
import eventListener from "../../lib/eventListener"
import { i18n } from "../../i18n"
import useDb from "../../lib/hooks/useDb"
import { getColor } from "../../styles/colors"
import { show as showToast } from "../Toast/Toast"

const ContextMenus = memo(({ setContextMenuOpen }: { setContextMenuOpen: React.Dispatch<React.SetStateAction<string>> }) => {
	const darkMode = useDarkMode()
	const lang = useLang()
	const [selectedMessage, setSelectedMessage] = useState<ChatMessage | undefined>(undefined)
	const [selectedConversation, setSelectedConversation] = useState<ChatConversation | undefined>(undefined)
	const [userId] = useDb("userId", 0)

	useEffect(() => {
		const openChatMessageContextMenuListener = eventListener.on(
			"openChatMessageContextMenu",
			({ message, position, event }: { message: ChatMessage; position: { x: number; y: number }; event: KeyboardEvent }) => {
				setSelectedMessage(message)
				setContextMenuOpen(message.uuid)

				contextMenu.show({
					id: "chatMessageContextMenu",
					event,
					position
				})
			}
		)

		const openChatConversationContextMenuListener = eventListener.on(
			"openChatConversationContextMenu",
			({
				conversation,
				position,
				event
			}: {
				conversation: ChatConversation
				position: { x: number; y: number }
				event: KeyboardEvent
			}) => {
				setSelectedConversation(conversation)

				contextMenu.show({
					id: "chatConversationContextMenu",
					event,
					position
				})
			}
		)

		return () => {
			openChatMessageContextMenuListener.remove()
			openChatConversationContextMenuListener.remove()
		}
	}, [userId])

	return (
		<>
			<ContextMenu
				id="chatMessageContextMenu"
				animation={{
					enter: animation.fade,
					exit: false
				}}
				theme={darkMode ? "filendark" : "filenlight"}
				onShown={() => {
					if (!selectedMessage) {
						return
					}

					setContextMenuOpen(selectedMessage.uuid)
				}}
				onHidden={() => setContextMenuOpen("")}
			>
				{selectedMessage && (
					<>
						<ContextMenuItem onClick={() => eventListener.emit("replyToChatMessage", selectedMessage)}>
							{i18n(lang, "replyToChatMessage")}
						</ContextMenuItem>
						<ContextMenuItem
							onClick={() =>
								navigator.clipboard.writeText(selectedMessage.message).catch(err => {
									console.error(err)

									showToast("error", err.toString(), "bottom", 5000)
								})
							}
						>
							{i18n(lang, "copyText")}
						</ContextMenuItem>
						{userId === selectedMessage.senderId && (
							<ContextMenuItem onClick={() => eventListener.emit("editChatMessage", selectedMessage)}>
								{i18n(lang, "edit")}
							</ContextMenuItem>
						)}
						{userId === selectedMessage.senderId && (
							<ContextMenuItem
								onClick={e =>
									eventListener.emit("openDeleteChatMessageModal", {
										uuid: selectedMessage.uuid,
										shift: e.event.shiftKey
									})
								}
							>
								<span
									style={{
										color: getColor(darkMode, "red")
									}}
								>
									{i18n(lang, "delete")}
								</span>
							</ContextMenuItem>
						)}
						<ContextMenuSeparator />
						<ContextMenuItem
							onClick={() =>
								navigator.clipboard.writeText(selectedMessage.uuid).catch(err => {
									console.error(err)

									showToast("error", err.toString(), "bottom", 5000)
								})
							}
						>
							{i18n(lang, "copyId")}
						</ContextMenuItem>
					</>
				)}
			</ContextMenu>
			<ContextMenu
				id="chatConversationContextMenu"
				animation={{
					enter: animation.fade,
					exit: false
				}}
				theme={darkMode ? "filendark" : "filenlight"}
			>
				{selectedConversation && (
					<>
						{selectedConversation.ownerId === userId && (
							<>
								<ContextMenuItem
									onClick={() => eventListener.emit("openChatConversationEditNameModal", selectedConversation)}
								>
									{i18n(lang, "chatConversationEditName")}
								</ContextMenuItem>
							</>
						)}
						<ContextMenuItem
							onClick={() => {
								if (selectedConversation.ownerId === userId) {
									eventListener.emit("openDeleteChatConversationModal", selectedConversation)
								} else {
									eventListener.emit("openLeaveChatConversationModal", selectedConversation)
								}
							}}
						>
							<span
								style={{
									color: getColor(darkMode, "red")
								}}
							>
								{selectedConversation.ownerId === userId ? i18n(lang, "delete") : i18n(lang, "leave")}
							</span>
						</ContextMenuItem>
						<ContextMenuSeparator />
						<ContextMenuItem
							onClick={() =>
								navigator.clipboard.writeText(selectedConversation.uuid).catch(err => {
									console.error(err)

									showToast("error", err.toString(), "bottom", 5000)
								})
							}
						>
							{i18n(lang, "copyId")}
						</ContextMenuItem>
					</>
				)}
			</ContextMenu>
		</>
	)
})

export default ContextMenus
