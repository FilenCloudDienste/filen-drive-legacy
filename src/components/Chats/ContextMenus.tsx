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

const ContextMenus = memo(({ setContextMenuOpen }: { setContextMenuOpen: React.Dispatch<React.SetStateAction<string>> }) => {
	const darkMode = useDarkMode()
	const lang = useLang()
	const [selectedMessage, setSelectedMessage] = useState<ChatMessage | undefined>(undefined)
	const [userId] = useDb("userId", 0)

	useEffect(() => {
		const openChatMessageContextMenuListener = eventListener.on(
			"openChatMessageContextMenu",
			({ message, position, event }: { message: ChatMessage; position: { x: number; y: number }; event: KeyboardEvent }) => {
				if (userId !== message.senderId) {
					return
				}

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
						<ContextMenuItem onClick={() => eventListener.emit("openDeleteChatMessageModal", selectedMessage.uuid)}>
							{i18n(lang, "delete")}
						</ContextMenuItem>
					</>
				)}
			</ContextMenu>
		</>
	)
})

export default ContextMenus
