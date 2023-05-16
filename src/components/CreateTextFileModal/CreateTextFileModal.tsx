import { memo, useState, useEffect, useRef, useCallback } from "react"
import type { CreateFolderModalProps, ItemProps } from "../../types"
import { Modal, ModalOverlay, ModalContent, ModalBody, Flex, ModalFooter, ModalHeader } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import eventListener from "../../lib/eventListener"
import AppText from "../AppText"
import Input from "../Input"
import { getCurrentURLParentFolder, fileAndFolderNameValidation } from "../../lib/helpers"
import { show as showToast } from "../Toast/Toast"
import { v4 as uuidv4 } from "uuid"
import { i18n } from "../../i18n"
import TextEditor from "../PreviewModal/TextEditor"
import { UPLOAD_VERSION } from "../../lib/constants"
import memoryCache from "../../lib/memoryCache"
import ModalCloseButton from "../ModalCloseButton"

export const CreateTextFileModalEditor = memo(({ darkMode, isMobile, lang, windowHeight, windowWidth }: CreateFolderModalProps) => {
	const [open, setOpen] = useState<boolean>(false)
	const [newName, setNewName] = useState<string>("")

	useEffect(() => {
		const openCreateTextFileModalEditorListener = eventListener.on("openCreateTextFileModalEditor", (n: string) => {
			memoryCache.set("textEditorChanged", false)

			setNewName(n)
			setOpen(true)
		})

		const closeCreateTextFileModalEditorListener = eventListener.on("closeCreateTextFileModalEditor", (n: string) => {
			memoryCache.set("textEditorChanged", false)

			setNewName("")
			setOpen(false)
		})

		return () => {
			openCreateTextFileModalEditorListener.remove()
			closeCreateTextFileModalEditorListener.remove()
		}
	}, [])

	return (
		<Modal
			onClose={() => {
				if (memoryCache.get("textEditorChanged")) {
					eventListener.emit("openBeforeCloseModal")

					return
				}

				setOpen(false)
			}}
			isOpen={open}
			size="full"
		>
			<ModalOverlay backgroundColor="rgba(0, 0, 0, 0.4)" />
			<ModalContent
				backgroundColor={getColor(darkMode, "backgroundPrimary")}
				color={getColor(darkMode, "textSecondary")}
				borderRadius="0px"
				padding="0px"
				overflow="hidden"
			>
				<ModalCloseButton darkMode={darkMode} />
				<ModalBody padding="0px">
					<Flex
						height={windowHeight + "px"}
						width={windowWidth + "px"}
						alignItems="center"
						justifyContent="center"
						overflow="hidden"
					>
						<TextEditor
							darkMode={darkMode}
							isMobile={isMobile}
							windowWidth={windowWidth}
							windowHeight={windowHeight}
							currentItem={{
								type: "file",
								parent: getCurrentURLParentFolder(),
								uuid: uuidv4(),
								name: newName,
								size: 0,
								mime: "text/plain",
								lastModified: Date.now(),
								lastModifiedSort: Date.now(),
								timestamp: Math.floor(Date.now() / 1000),
								selected: false,
								color: "default",
								sharerEmail: "",
								sharerId: 0,
								receiverEmail: "",
								receiverId: 0,
								version: UPLOAD_VERSION,
								rm: "",
								favorited: 0,
								chunks: 0,
								writeAccess: true,
								root: "",
								key: "",
								bucket: "",
								region: ""
							}}
							text=""
							lang={lang}
						/>
					</Flex>
				</ModalBody>
			</ModalContent>
		</Modal>
	)
})

export const CreateTextFileModal = memo(
	({ darkMode, isMobile, windowHeight, windowWidth, setItems, items, lang }: CreateFolderModalProps) => {
		const [open, setOpen] = useState<boolean>(false)
		const [newName, setNewName] = useState<string>("")
		const inputRef = useRef()
		const currentItems = useRef<ItemProps[]>([])
		const newNameRef = useRef<string>("")

		const create = useCallback(() => {
			const value = newNameRef.current.trim()

			if (value.length == 0) {
				showToast("error", i18n(lang, "pleaseChooseDiffName"), "bottom", 5000)

				return
			}

			if (currentItems.current.filter(item => item.name.toLowerCase() == value.toLowerCase() && item.type == "file").length > 0) {
				showToast("error", i18n(lang, "pleaseChooseDiffName"), "bottom", 5000)

				return
			}

			if (!fileAndFolderNameValidation(value)) {
				showToast("error", i18n(lang, "pleaseChooseDiffName"), "bottom", 5000)

				return
			}

			eventListener.emit("openCreateTextFileModalEditor", value)

			setNewName("")
			setOpen(false)
		}, [newNameRef.current, currentItems.current])

		const setSelectionRange = useCallback(async () => {
			await new Promise(resolve => {
				const wait = setInterval(() => {
					if (inputRef.current) {
						clearInterval(wait)

						return resolve(true)
					}
				})
			})

			if (!inputRef.current) {
				return
			}

			const input = inputRef.current as HTMLInputElement

			input.setSelectionRange(0, 0)
		}, [inputRef.current])

		useEffect(() => {
			currentItems.current = items
		}, [items])

		useEffect(() => {
			newNameRef.current = newName
		}, [newName])

		useEffect(() => {
			const openCreateTextFileModalListener = eventListener.on("openCreateTextFileModal", () => {
				setOpen(true)
				setNewName(".txt")
				setSelectionRange()
			})

			return () => {
				openCreateTextFileModalListener.remove()
			}
		}, [])

		return (
			<Modal
				onClose={() => setOpen(false)}
				isOpen={open}
				isCentered={true}
				size={isMobile ? "xl" : "md"}
			>
				<ModalOverlay backgroundColor="rgba(0, 0, 0, 0.4)" />
				<ModalContent
					backgroundColor={getColor(darkMode, "backgroundSecondary")}
					color={getColor(darkMode, "textSecondary")}
					borderRadius={isMobile ? "0px" : "5px"}
				>
					<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "createTextFile")}</ModalHeader>
					<ModalCloseButton darkMode={darkMode} />
					<ModalBody
						height="100%"
						width="100%"
						alignItems="center"
						justifyContent="center"
					>
						<Input
							darkMode={darkMode}
							isMobile={isMobile}
							value={newName}
							placeholder={i18n(lang, "newTextFileName")}
							autoFocus={true}
							onChange={e => setNewName(e.target.value)}
							ref={inputRef}
							color={getColor(darkMode, "textSecondary")}
							_placeholder={{
								color: getColor(darkMode, "textSecondary")
							}}
							onKeyDown={e => {
								if (e.which == 13) {
									create()
								}
							}}
						/>
					</ModalBody>
					<ModalFooter>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							noOfLines={1}
							wordBreak="break-all"
							color={getColor(darkMode, "linkPrimary")}
							cursor="pointer"
							onClick={() => create()}
						>
							{i18n(lang, "create")}
						</AppText>
					</ModalFooter>
				</ModalContent>
			</Modal>
		)
	}
)

export default CreateTextFileModal
