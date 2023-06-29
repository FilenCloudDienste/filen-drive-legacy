import { memo, useState, useEffect, useCallback, useRef } from "react"
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalFooter, ModalHeader, Flex } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import { i18n } from "../../i18n"
import ModalCloseButton from "../ModalCloseButton"
import { noteHistory, noteHistoryRestore, Note as INote, NoteHistory } from "../../lib/api"
import { decryptNoteKeyParticipant, decryptNoteContent } from "../../lib/worker/worker.com"
import { safeAwait } from "../../lib/helpers"
import Input from "../Input"
import eventListener from "../../lib/eventListener"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useLang from "../../lib/hooks/useLang"
import { show as showToast } from "../Toast/Toast"
import useWindowHeight from "../../lib/hooks/useWindowHeight"
import useWindowWidth from "../../lib/hooks/useWindowWidth"
import Editor from "./Editor"
import db from "../../lib/db"

export const HistoryNote = memo(
	({
		note,
		index,
		setSelectedIndex
	}: {
		note: NoteHistory
		index: number
		setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
	}) => {
		const darkMode = useDarkMode()
		const isMobile = useIsMobile()

		return (
			<Flex paddingRight="10px">
				<Flex
					padding="10px"
					backgroundColor={getColor(darkMode, "backgroundPrimary")}
					borderRadius="5px"
					marginBottom="5px"
					width="100%"
				>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						noOfLines={1}
						wordBreak="break-all"
						color={getColor(darkMode, "linkPrimary")}
						fontSize={15}
						cursor="pointer"
						_hover={{
							textDecoration: "underline"
						}}
						onClick={() => setSelectedIndex(index)}
					>
						{new Date(note.editedTimestamp).toLocaleString()}
					</AppText>
				</Flex>
			</Flex>
		)
	}
)

export const HistoryModal = memo(() => {
	const darkMode = useDarkMode()
	const isMobile = useIsMobile()
	const lang = useLang()
	const [open, setOpen] = useState<boolean>(false)
	const [loadingHistory, setLoadingHistory] = useState<boolean>(false)
	const [history, setHistory] = useState<NoteHistory[]>([])
	const windowHeight = useWindowHeight()
	const windowWidth = useWindowWidth()
	const [selectedIndex, setSelectedIndex] = useState<number>(0)
	const [selectedNote, setSelectedNote] = useState<INote | undefined>(undefined)
	const selectedNoteRef = useRef<INote | undefined>(undefined)

	const loadHistory = useCallback(async () => {
		if (!selectedNoteRef.current) {
			return
		}

		setLoadingHistory(true)

		const [historyErr, historyRes] = await safeAwait(noteHistory(selectedNoteRef.current.uuid))

		if (historyErr) {
			console.error(historyErr)

			showToast("error", historyErr.toString(), "bottom", 5000)

			return
		}

		const privateKey = await db.get("privateKey")
		const userId = await db.get("userId")

		for (let i = 0; i < historyRes.length; i++) {
			const noteKey = await decryptNoteKeyParticipant(
				selectedNoteRef.current.participants.filter(participant => participant.userId === userId)[0].metadata,
				privateKey
			)
			const contentDecrypted = await decryptNoteContent(historyRes[i].content, noteKey)

			historyRes[i].content = contentDecrypted
		}

		setHistory(historyRes.sort((a, b) => b.editedTimestamp - a.editedTimestamp))
		setLoadingHistory(false)
	}, [])

	useEffect(() => {
		const openNoteHistoryModalListener = eventListener.on("openNoteHistoryModal", (note: INote) => {
			selectedNoteRef.current = note

			setSelectedNote(note)
			setHistory([])
			setLoadingHistory(true)
			setOpen(true)
			setSelectedIndex(0)

			loadHistory()
		})

		return () => {
			openNoteHistoryModalListener.remove()
		}
	}, [])

	return (
		<Modal
			onClose={() => setOpen(false)}
			isOpen={open}
			isCentered={true}
			size={history.length > 0 ? "full" : isMobile ? "xl" : "md"}
		>
			<ModalOverlay backgroundColor="rgba(0, 0, 0, 0.4)" />
			<ModalContent
				backgroundColor={getColor(darkMode, "backgroundSecondary")}
				color={getColor(darkMode, "textSecondary")}
				borderRadius="10px"
				border={"1px solid " + getColor(darkMode, "borderPrimary")}
			>
				<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "noteHistory")}</ModalHeader>
				<ModalCloseButton darkMode={darkMode} />
				<ModalBody
					width={windowWidth + "px"}
					height={windowHeight + "px"}
				>
					<Flex
						flexDirection="row"
						gap="15px"
					>
						<Flex
							flexDirection="column"
							height={windowHeight - 150 + "px"}
							width="300px"
							overflowX="hidden"
							overflowY="auto"
						>
							{history.map((note, index) => {
								return (
									<HistoryNote
										key={note.id}
										note={note}
										index={index}
										setSelectedIndex={setSelectedIndex}
									/>
								)
							})}
						</Flex>
						<Flex
							backgroundColor={getColor(darkMode, "backgroundPrimary")}
							height={windowHeight - 150 + "px"}
							width={windowWidth - 350 + "px"}
							borderRadius="10px"
						>
							{history.length > 0 && selectedNote && (
								<Editor
									height={windowHeight - 150}
									width={windowWidth - 350}
									content={history[selectedIndex].content}
									setContent={() => {}}
									currentNote={selectedNote}
									type={history[0].type}
									onBlur={() => {}}
									showMarkdownPreview={true}
									onContentChange={() => {}}
									canEdit={false}
								/>
							)}
						</Flex>
					</Flex>
				</ModalBody>
			</ModalContent>
		</Modal>
	)
})

export default HistoryModal
