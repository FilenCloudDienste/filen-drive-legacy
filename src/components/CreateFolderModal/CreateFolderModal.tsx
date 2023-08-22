import { memo, useState, useEffect, useRef, useCallback } from "react"
import { CreateFolderModalProps, ItemProps } from "../../types"
import { Modal, ModalOverlay, ModalContent, ModalBody, Spinner, ModalFooter, ModalHeader } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import eventListener from "../../lib/eventListener"
import AppText from "../AppText"
import Input from "../Input"
import { createFolder } from "../../lib/api"
import db from "../../lib/db"
import { orderItemsByType, getCurrentURLParentFolder } from "../../lib/helpers"
import { show as showToast } from "../Toast/Toast"
import { v4 as uuidv4 } from "uuid"
import { addFolderNameToDb } from "../../lib/services/items"
import { i18n } from "../../i18n"
import ModalCloseButton from "../ModalCloseButton"

const CreateFolderModal = memo(({ darkMode, isMobile, windowHeight, windowWidth, setItems, items, lang }: CreateFolderModalProps) => {
	const [open, setOpen] = useState<boolean>(false)
	const [newName, setNewName] = useState<string>("")
	const [loading, setLoading] = useState<boolean>(false)
	const inputRef = useRef()
	const currentItems = useRef<ItemProps[]>([])
	const newNameRef = useRef<string>("")

	const create = useCallback(async () => {
		if (loading) {
			return
		}

		const value = newNameRef.current.trim()

		if (value.length == 0) {
			showToast("error", i18n(lang, "pleaseChooseDiffName"), "bottom", 5000)

			return
		}

		if (currentItems.current.filter(item => item.name == value && item.type == "folder").length > 0) {
			showToast("error", i18n(lang, "pleaseChooseDiffName"), "bottom", 5000)

			return
		}

		setLoading(true)

		const uuid = uuidv4()
		const parent = getCurrentURLParentFolder()

		try {
			await createFolder({ uuid, name: value, parent, emitEvents: false })
			await addFolderNameToDb(uuid, value)
		} catch (e: any) {
			console.error(e)

			setLoading(false)

			showToast("error", e.toString(), "bottom", 5000)
		}

		const newFolderItem: ItemProps = {
			type: "folder",
			parent,
			uuid,
			name: value,
			size: 0,
			mime: "Folder",
			lastModified: Date.now(),
			lastModifiedSort: Date.now(),
			timestamp: Math.floor(Date.now() / 1000),
			selected: false,
			color: "default",
			sharerEmail: "",
			sharerId: 0,
			receiverEmail: "",
			receiverId: 0,
			version: 0,
			rm: "",
			favorited: 0,
			chunks: 0,
			writeAccess: true,
			root: "",
			key: "",
			bucket: "",
			region: ""
		}

		const sortBy = (await db.get("sortBy")) || {}

		setItems(prev =>
			orderItemsByType([...prev, ...[{ ...newFolderItem, selected: false }]], sortBy[window.location.href], window.location.href)
		)
		setOpen(false)
		setLoading(false)
		setNewName("")
	}, [loading, currentItems.current, newNameRef.current])

	useEffect(() => {
		newNameRef.current = newName
	}, [newName])

	useEffect(() => {
		currentItems.current = items
	}, [items])

	useEffect(() => {
		const openCreateFolderModalListener = eventListener.on("openCreateFolderModal", () => setOpen(true))

		return () => {
			openCreateFolderModalListener.remove()
		}
	}, [])

	return (
		<Modal
			onClose={() => {
				setNewName("")
				setOpen(false)
			}}
			isOpen={open}
			isCentered={true}
			size={isMobile ? "xl" : "md"}
		>
			<ModalOverlay backgroundColor="rgba(0, 0, 0, 0.4)" />
			<ModalContent
				backgroundColor={getColor(darkMode, "backgroundSecondary")}
				color={getColor(darkMode, "textSecondary")}
				borderRadius="10px"
				border={"1px solid " + getColor(darkMode, "borderPrimary")}
			>
				<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "createFolder")}</ModalHeader>
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
						placeholder={i18n(lang, "newFolderName")}
						autoFocus={true}
						onChange={e => setNewName(e.target.value)}
						isDisabled={loading}
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
					{loading ? (
						<Spinner
							width="16px"
							height="16px"
							color={getColor(darkMode, "textPrimary")}
						/>
					) : (
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							noOfLines={1}
							wordBreak="break-all"
							color={getColor(darkMode, "linkPrimary")}
							cursor="pointer"
							onClick={() => create()}
							_hover={{
								textDecoration: "underline"
							}}
						>
							{i18n(lang, "create")}
						</AppText>
					)}
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
})

export default CreateFolderModal
