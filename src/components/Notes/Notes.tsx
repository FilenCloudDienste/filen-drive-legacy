import { memo, useState, useMemo, useEffect } from "react"
import { Flex } from "@chakra-ui/react"
import useWindowHeight from "../../lib/hooks/useWindowHeight"
import useWindowWidth from "../../lib/hooks/useWindowWidth"
import useIsMobile from "../../lib/hooks/useIsMobile"
import { Note as INote } from "../../lib/api"
import Sidebar from "./Sidebar"
import Content from "./Content"
import ContextMenus from "./ContextMenus"
import { useLocation } from "react-router-dom"
import { validate } from "uuid"
import { getCurrentParent } from "../../lib/helpers"
import HistoryModal from "./HistoryModal"

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
			<ContextMenus
				currentNote={currentNote}
				setNotes={setNotes}
			/>
			<HistoryModal />
		</Flex>
	)
})

export default Notes
