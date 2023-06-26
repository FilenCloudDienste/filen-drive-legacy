import { memo, useState, useEffect, useCallback } from "react"
import "react-contexify/dist/ReactContexify.css"
import {
	Menu as ContextMenu,
	Item as ContextMenuItem,
	Separator as ContextMenuSeparator,
	Submenu as ContextMenuSubmenu,
	contextMenu,
	animation
} from "react-contexify"
import { Contact as IContact, contactsDelete, contactsBlockedAdd } from "../../lib/api"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useLang from "../../lib/hooks/useLang"
import useIsMobile from "../../lib/hooks/useIsMobile"
import eventListener from "../../lib/eventListener"
import { show as showToast, dismiss as dismissToast } from "../Toast/Toast"
import { safeAwait } from "../../lib/helpers"

const ContextMenus = memo(({ setContacts }: { setContacts: React.Dispatch<React.SetStateAction<IContact[]>> }) => {
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()
	const lang = useLang()
	const [selectedContact, setSelectedContact] = useState<IContact | undefined>(undefined)

	const del = useCallback(async () => {
		if (!selectedContact) {
			return
		}

		const loadingToast = showToast("loading", "Deleting contact", "bottom", 864000000)

		const [err] = await safeAwait(contactsDelete(selectedContact.uuid))

		if (err) {
			console.error(err)

			dismissToast(loadingToast)

			showToast("error", err.message, "bottom", 5000)

			return
		}

		dismissToast(loadingToast)

		setContacts(prev => prev.filter(contact => contact.uuid !== selectedContact.uuid))
	}, [selectedContact])

	const block = useCallback(async () => {
		if (!selectedContact) {
			return
		}

		const loadingToast = showToast("loading", "Blocking contact", "bottom", 864000000)

		const [err] = await safeAwait(contactsBlockedAdd(selectedContact.email))

		if (err) {
			console.error(err)

			dismissToast(loadingToast)

			showToast("error", err.message, "bottom", 5000)

			return
		}

		dismissToast(loadingToast)

		setContacts(prev => prev.filter(contact => contact.uuid !== selectedContact.uuid))
	}, [selectedContact])

	useEffect(() => {
		const openContactContextMenuListener = eventListener.on(
			"openContactContextMenu",
			({ contact, position, event }: { contact: IContact; position: { x: number; y: number }; event: KeyboardEvent }) => {
				setSelectedContact(contact)

				contextMenu.show({
					id: "contactContextMenu",
					event,
					position
				})
			}
		)

		return () => {
			openContactContextMenuListener.remove()
		}
	}, [])

	return (
		<>
			<ContextMenu
				id="contactContextMenu"
				animation={{
					enter: animation.fade,
					exit: false
				}}
				theme={darkMode ? "filendark" : "filenlight"}
			>
				{selectedContact && (
					<>
						<ContextMenuItem onClick={() => del()}>Remove</ContextMenuItem>
						<ContextMenuItem onClick={() => block()}>Block</ContextMenuItem>
					</>
				)}
			</ContextMenu>
		</>
	)
})

export default ContextMenus
