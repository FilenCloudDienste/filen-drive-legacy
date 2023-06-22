import { memo, useState, useCallback, useEffect, useRef } from "react"
import { Input } from "@chakra-ui/react"
import useWindowHeight from "../../lib/hooks/useWindowHeight"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useLang from "../../lib/hooks/useLang"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import { Note as INote, editNoteTitle } from "../../lib/api"
import { safeAwait } from "../../lib/helpers"
import db from "../../lib/db"
import { encryptNoteTitle, encryptNoteContent, decryptNoteKeyParticipant } from "../../lib/worker/worker.com"
import eventListener from "../../lib/eventListener"
import { debounce } from "lodash"

export const Title = memo(
	({ currentNote, setNotes }: { currentNote: INote | undefined; setNotes: React.Dispatch<React.SetStateAction<INote[]>> }) => {
		const isMobile = useIsMobile()
		const darkMode = useDarkMode()
		const [saving, setSaving] = useState<boolean>(false)
		const [title, setTitle] = useState<string>("")
		const titleRef = useRef<string>("")
		const startTitle = useRef<string | undefined>(undefined)

		const editTitle = useCallback(async () => {
			if (!currentNote || saving || startTitle.current === titleRef.current) {
				return
			}

			setSaving(true)

			const userId = await db.get("userId")
			const privateKey = await db.get("privateKey")
			const noteKey = await decryptNoteKeyParticipant(
				currentNote.participants.filter(participant => participant.userId === userId)[0].metadata,
				privateKey
			)
			const titleEncrypted = await encryptNoteTitle(titleRef.current, noteKey)

			await editNoteTitle(currentNote.uuid, titleEncrypted)

			startTitle.current = titleRef.current

			setSaving(false)
		}, [saving, currentNote])

		const debouncedSave = useCallback(debounce(editTitle, 3000), [])

		useEffect(() => {
			if (currentNote) {
				setTitle(currentNote.title)
			}
		}, [currentNote])

		useEffect(() => {
			titleRef.current = title

			if (typeof startTitle.current === "undefined") {
				startTitle.current = title
			}
		}, [title])

		return (
			<Input
				value={title}
				onChange={e => {
					if (currentNote) {
						setNotes(prev => prev.map(note => (note.uuid === currentNote.uuid ? { ...note, title: e.target.value } : note)))
					}

					debouncedSave()
				}}
				onBlur={() => editTitle()}
				onKeyDown={e => {
					if (e.key === "Enter") {
						editTitle()
					}
				}}
				autoFocus={false}
				spellCheck={false}
				border="none"
				borderRadius="0px"
				color={getColor(darkMode, "textPrimary")}
				_placeholder={{
					color: getColor(darkMode, "textSecondary")
				}}
				placeholder="Note title"
				paddingLeft="0px"
				paddingRight="0px"
				margin="0px"
				outline="none"
				_hover={{
					shadow: "none",
					outline: "none"
				}}
				_active={{
					shadow: "none",
					outline: "none"
				}}
				_focus={{
					shadow: "none",
					outline: "none"
				}}
				_highlighted={{
					shadow: "none",
					outline: "none"
				}}
				fontSize={15}
				height="100%"
			/>
		)
	}
)

export default Title
