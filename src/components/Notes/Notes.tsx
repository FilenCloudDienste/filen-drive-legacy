import { memo, useState, useMemo, useEffect } from "react"
import { Flex } from "@chakra-ui/react"
import useWindowHeight from "../../lib/hooks/useWindowHeight"
import useWindowWidth from "../../lib/hooks/useWindowWidth"
import useIsMobile from "../../lib/hooks/useIsMobile"
import { Note as INote, Contact as IContact } from "../../lib/api"
import Sidebar from "./Sidebar"
import Content from "./Content"
import ContextMenus from "./ContextMenus"
import { useLocation } from "react-router-dom"
import { validate } from "uuid"
import { getCurrentParent } from "../../lib/helpers"
import HistoryModal from "./HistoryModal"
import { AddParticipantModal, AddContactModal } from "./AddParticipantModal"
import eventListener from "../../lib/eventListener"
import { SocketEvent } from "../../lib/services/socket"

export interface NotesSizes {
	notes: number
	note: number
}

export interface NotesProps {
	sidebarWidth: number
}

export const Notes = memo(({ sidebarWidth }: NotesProps) => {
	const windowWidth = useWindowWidth()
	const isMobile = useIsMobile()
	const windowHeight = useWindowHeight()
	const [currentNoteUUID, setCurrentNoteUUID] = useState<string>("")
	const [notes, setNotes] = useState<INote[]>([])
	const location = useLocation()

	const currentNote = useMemo(() => {
		const note = notes.filter(note => note.uuid === currentNoteUUID)

		if (note.length === 0) {
			return undefined
		}

		return note[0]
	}, [notes, currentNoteUUID])

	const sizes: NotesSizes = useMemo(() => {
		const notes = isMobile ? 125 : windowWidth > 1100 ? 350 : 250
		const note = windowWidth - sidebarWidth - notes

		return {
			notes,
			note
		}
	}, [windowWidth, sidebarWidth, isMobile])

	useEffect(() => {
		const uuid = getCurrentParent(location.hash)

		if (uuid && validate(uuid)) {
			setCurrentNoteUUID(uuid)
		}
	}, [location.hash])

	useEffect(() => {
		const noteParticipantAddedFromContactsListener = eventListener.on(
			"noteParticipantAddedFromContacts",
			({
				contact,
				note,
				metadata,
				permissionsWrite
			}: {
				contact: IContact
				note: INote
				metadata: string
				permissionsWrite: boolean
			}) => {
				setNotes(prev =>
					prev.map(n =>
						n.uuid === note.uuid
							? {
									...n,
									participants: [
										...n.participants,
										...[
											{
												userId: contact.userId,
												isOwner: false,
												email: contact.email,
												avatar: contact.avatar,
												nickName: contact.nickName,
												metadata,
												permissionsWrite,
												addedTimestamp: Date.now()
											}
										]
									]
							  }
							: n
					)
				)
			}
		)

		const noteParticipantRemovedListener = eventListener.on(
			"noteParticipantRemoved",
			({ note, userId }: { note: INote; userId: number }) => {
				setNotes(prev =>
					prev.map(n =>
						n.uuid === note.uuid
							? {
									...n,
									participants: n.participants.filter(p => p.userId !== userId)
							  }
							: n
					)
				)
			}
		)

		const noteParticipantPermissionsChangedListener = eventListener.on(
			"noteParticipantPermissionsChanged",
			({ note, userId, permissionsWrite }: { note: INote; userId: number; permissionsWrite: boolean }) => {
				setNotes(prev =>
					prev.map(n =>
						n.uuid === note.uuid
							? {
									...n,
									participants: n.participants.map(p => (p.userId === userId ? { ...p, permissionsWrite } : p))
							  }
							: n
					)
				)
			}
		)

		const socketEventListener = eventListener.on("socketEvent", async (data: SocketEvent) => {
			if (data.type === "noteParticipantPermissions") {
				setNotes(prev =>
					prev.map(n =>
						n.uuid === data.data.note
							? {
									...n,
									participants: n.participants.map(p =>
										p.userId === data.data.userId ? { ...p, permissionsWrite: data.data.permissionsWrite } : p
									)
							  }
							: n
					)
				)
			} else if (data.type === "noteRestored") {
				setNotes(prev =>
					prev.map(n =>
						n.uuid === data.data.note
							? {
									...n,
									trash: false,
									archive: false
							  }
							: n
					)
				)
			}
		})

		return () => {
			noteParticipantAddedFromContactsListener.remove()
			noteParticipantRemovedListener.remove()
			noteParticipantPermissionsChangedListener.remove()
			socketEventListener.remove()
		}
	}, [])

	return (
		<Flex flexDirection="row">
			<Flex
				width={sizes.notes + "px"}
				height={windowHeight + "px"}
				flexDirection="column"
			>
				<Sidebar
					sizes={sizes}
					currentNote={currentNote}
					notes={notes}
					setNotes={setNotes}
				/>
			</Flex>
			<Flex
				width={sizes.note + "px"}
				height={windowHeight + "px"}
				flexDirection="column"
			>
				<Content
					sizes={sizes}
					currentNote={currentNote}
					setNotes={setNotes}
				/>
			</Flex>
			<ContextMenus setNotes={setNotes} />
			<HistoryModal />
			<AddParticipantModal />
			<AddContactModal />
		</Flex>
	)
})

export default Notes
