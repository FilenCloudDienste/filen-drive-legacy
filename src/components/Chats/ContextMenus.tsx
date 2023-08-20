import { memo, useState, useEffect } from "react"
import {
	Menu as ContextMenu,
	Item as ContextMenuItem,
	Separator as ContextMenuSeparator,
	Submenu as ContextMenuSubmenu,
	contextMenu,
	animation
} from "react-contexify"
import { ChatMessage } from "../../lib/api"
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

		return () => {
			openChatMessageContextMenuListener.remove()
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
						<ContextMenuItem
							onClick={() =>
								navigator.clipboard
									.writeText(selectedMessage.message)
									.then(() => {
										showToast("success", i18n(lang, "copied"), "bottom", 5000)
									})
									.catch(err => {
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
					</>
				)}
			</ContextMenu>
		</>
	)
})

export default ContextMenus
