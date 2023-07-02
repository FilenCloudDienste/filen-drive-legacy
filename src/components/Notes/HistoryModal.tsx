import { memo, useState, useEffect, useCallback, useRef } from "react"
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalFooter, ModalHeader, Flex } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import { i18n } from "../../i18n"
import ModalCloseButton from "../ModalCloseButton"
import { noteHistoryRestore, Note as INote, NoteHistory } from "../../lib/api"
import { safeAwait } from "../../lib/helpers"
import eventListener from "../../lib/eventListener"
import useDarkMode from "../../lib/hooks/useDarkMode"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useLang from "../../lib/hooks/useLang"
import { show as showToast, dismiss as dismissToast } from "../Toast/Toast"
import useWindowHeight from "../../lib/hooks/useWindowHeight"
import useWindowWidth from "../../lib/hooks/useWindowWidth"
import Editor from "./Editor"
import { AutoSizer } from "react-virtualized"

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
	const [history, setHistory] = useState<NoteHistory[]>([])
	const [selectedIndex, setSelectedIndex] = useState<number>(0)
	const [selectedNote, setSelectedNote] = useState<INote | undefined>(undefined)
	const windowHeight = useWindowHeight()

	const restore = useCallback(async () => {
		if (!selectedNote) {
			return
		}

		const version = history[selectedIndex]

		if (!version) {
			return
		}

		const loadingToast = showToast("loading", i18n(lang, "loadingDots"), "bottom", 864000000)

		const [err] = await safeAwait(noteHistoryRestore(selectedNote.uuid, version.id))

		if (err) {
			console.error(err)

			dismissToast(loadingToast)

			showToast("error", err.message, "bottom", 5000)

			return
		}

		dismissToast(loadingToast)

		eventListener.emit("refreshNoteContent", selectedNote.uuid)
		eventListener.emit("refreshNotes")

		setOpen(false)
	}, [selectedNote, selectedIndex, history, lang])

	useEffect(() => {
		const openNoteHistoryModalListener = eventListener.on(
			"openNoteHistoryModal",
			({ note, history }: { note: INote; history: NoteHistory[] }) => {
				setSelectedNote(note)
				setSelectedIndex(0)
				setHistory(history)
				setOpen(true)
			}
		)

		return () => {
			openNoteHistoryModalListener.remove()
		}
	}, [])

	return (
		<Modal
			onClose={() => setOpen(false)}
			isOpen={open}
			isCentered={true}
			size={isMobile ? "full" : "6xl"}
		>
			<ModalOverlay backgroundColor="rgba(0, 0, 0, 0.4)" />
			<ModalContent
				backgroundColor={getColor(darkMode, "backgroundSecondary")}
				color={getColor(darkMode, "textSecondary")}
				borderRadius={isMobile ? "0px" : "10px"}
				border={isMobile ? undefined : "1px solid " + getColor(darkMode, "borderPrimary")}
			>
				<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "noteHistoryModal")}</ModalHeader>
				<ModalCloseButton darkMode={darkMode} />
				<ModalBody>
					<div
						style={{
							width: "100%",
							height: Math.floor(windowHeight * 0.75) + "px"
						}}
					>
						<AutoSizer>
							{({ width, height }) => {
								return (
									<Flex
										flexDirection="row"
										gap="15px"
										height={height + "px"}
										width={width + "px"}
									>
										<Flex
											flexDirection="column"
											width="300px"
											height={height + "px"}
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
											borderRadius="10px"
											height={height + "px"}
											width={width - 300 + "px"}
										>
											{history.length > 0 && selectedNote && selectedIndex >= 0 && (
												<Editor
													height={height}
													width={width - 300}
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
								)
							}}
						</AutoSizer>
					</div>
				</ModalBody>
				{history.length > 0 && selectedNote && selectedIndex >= 0 && (
					<ModalFooter>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							noOfLines={1}
							wordBreak="break-all"
							color={getColor(darkMode, "linkPrimary")}
							cursor="pointer"
							onClick={() => restore()}
							_hover={{
								textDecoration: "underline"
							}}
						>
							{i18n(lang, "noteHistoryRestore")}
						</AppText>
					</ModalFooter>
				)}
			</ModalContent>
		</Modal>
	)
})

export default HistoryModal
