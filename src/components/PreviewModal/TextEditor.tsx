import { memo, useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from "react"
import { ItemProps, UploadQueueItemFile } from "../../types"
import {
	Modal,
	ModalOverlay,
	ModalContent,
	ModalBody,
	Flex,
	ModalHeader,
	ModalFooter,
	Menu,
	MenuButton,
	MenuList,
	MenuItem,
	forwardRef
} from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import eventListener from "../../lib/eventListener"
import { getFileExt } from "../../lib/helpers"
import AppText from "../AppText"
import { createCodeMirrorTheme } from "../../styles/codeMirror"
import { javascript } from "@codemirror/lang-javascript"
import { json } from "@codemirror/lang-json"
import { rust } from "@codemirror/lang-rust"
import { python } from "@codemirror/lang-python"
import { css } from "@codemirror/lang-css"
import { cpp } from "@codemirror/lang-cpp"
import { markdown } from "@codemirror/lang-markdown"
import { xml } from "@codemirror/lang-xml"
import { php } from "@codemirror/lang-php"
import { java } from "@codemirror/lang-java"
import { html } from "@codemirror/lang-html"
import { sql } from "@codemirror/lang-sql"
import Button from "../Button"
import { BiChevronDown } from "react-icons/bi"
import { i18n } from "../../i18n"
import memoryCache from "../../lib/memoryCache"
import { EditorView } from "@codemirror/view"
import { useLocation } from "react-router-dom"
import memoize from "lodash/memoize"
import ModalCloseButton from "../ModalCloseButton"
import { ErrorBoundary } from "react-error-boundary"

const CodeMirror = lazy(() => import("@uiw/react-codemirror"))
const MarkdownPreview = lazy(() => import("@uiw/react-markdown-preview"))

export const getCodeMirrorLanguageExtensionForFile = memoize((name: string) => {
	const ext = getFileExt(name)

	switch (ext) {
		case "json":
			return json()
			break
		case "xml":
			return xml()
			break
		case "rs":
			return rust()
			break
		case "py":
			return python()
			break
		case "css":
			return css()
			break
		case "cpp":
			return cpp()
			break
		case "md":
			return markdown()
			break
		case "php":
			return php()
			break
		case "java":
			return java()
			break
		case "html":
		case "html5":
			return html()
			break
		case "sql":
			return sql()
			break
		case "ts":
			return javascript({
				typescript: true
			})
			break
		case "tsx":
			return javascript({
				typescript: true,
				jsx: true
			})
			break
		case "jsx":
			return javascript({
				jsx: true
			})
			break
		default:
			return markdown()
			break
	}
})

export interface TextEditorProps {
	darkMode: boolean
	isMobile: boolean
	windowHeight: number
	windowWidth: number
	currentItem: ItemProps
	text: string
	lang: string
	isNewFile?: boolean
}

export interface BeforeCloseModalProps {
	darkMode: boolean
	isMobile: boolean
	lang: string
	isNewFile?: boolean
}

export interface FileMenuProps {
	darkMode: boolean
	isMobile: boolean
	lang: string
	isNewFile?: boolean
}

const FileMenu = memo(({ darkMode, isMobile, lang, isNewFile }: FileMenuProps) => {
	const [hovering, setHovering] = useState<boolean>(false)

	return (
		<Menu>
			<MenuButton
				as={forwardRef((props, ref) => (
					<Flex
						ref={ref}
						{...props}
						alignItems="center"
						onMouseEnter={() => setHovering(true)}
						onMouseLeave={() => setHovering(false)}
						backgroundColor={hovering ? getColor(darkMode, "backgroundPrimary") : "transparent"}
						paddingLeft="10px"
						paddingRight="5px"
						borderRadius="5px"
						paddingTop="2px"
						paddingBottom="3px"
						cursor="pointer"
						marginRight="15px"
					>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							noOfLines={1}
							wordBreak="break-all"
							color={getColor(darkMode, "textSecondary")}
							cursor="pointer"
							_hover={{
								color: getColor(darkMode, "textPrimary")
							}}
						>
							{i18n(lang, "file")}
						</AppText>
						<BiChevronDown
							color={getColor(darkMode, "textSecondary")}
							fontSize={18}
							style={{
								marginLeft: "5px"
							}}
						/>
					</Flex>
				))}
			>
				{i18n(lang, "file")}
			</MenuButton>
			<MenuList
				boxShadow="base"
				paddingTop="5px"
				paddingBottom="5px"
				backgroundColor={getColor(darkMode, "backgroundSecondary")}
				borderColor={getColor(darkMode, "borderPrimary")}
				minWidth="150px"
			>
				<MenuItem
					height="auto"
					fontSize={14}
					paddingTop="5px"
					paddingBottom="5px"
					backgroundColor={getColor(darkMode, "backgroundSecondary")}
					color={getColor(darkMode, "textSecondary")}
					_hover={{
						backgroundColor: getColor(darkMode, "backgroundPrimary"),
						color: getColor(darkMode, "textPrimary")
					}}
					_focus={{
						backgroundColor: getColor(darkMode, "backgroundPrimary"),
						color: getColor(darkMode, "textPrimary")
					}}
					_active={{
						backgroundColor: getColor(darkMode, "backgroundPrimary"),
						color: getColor(darkMode, "textPrimary")
					}}
					onClick={() => eventListener.emit("saveTextEditor")}
					justifyContent="space-between"
					alignItems="center"
				>
					<Flex>{i18n(lang, "save")}</Flex>
					<Flex
						fontSize={11}
						paddingTop="3px"
					>
						{i18n(lang, "ctrlPlusS")}
					</Flex>
				</MenuItem>
				<MenuItem
					height="auto"
					fontSize={14}
					paddingTop="5px"
					paddingBottom="5px"
					backgroundColor={getColor(darkMode, "backgroundSecondary")}
					color={getColor(darkMode, "textSecondary")}
					_hover={{
						backgroundColor: getColor(darkMode, "backgroundPrimary"),
						color: getColor(darkMode, "textPrimary")
					}}
					_focus={{
						backgroundColor: getColor(darkMode, "backgroundPrimary"),
						color: getColor(darkMode, "textPrimary")
					}}
					_active={{
						backgroundColor: getColor(darkMode, "backgroundPrimary"),
						color: getColor(darkMode, "textPrimary")
					}}
					onClick={() => {
						if (!memoryCache.get("textEditorChanged")) {
							eventListener.emit("previewModalBeforeClose")
						} else {
							eventListener.emit("openBeforeCloseModal")
						}
					}}
					justifyContent="space-between"
					alignItems="center"
				>
					<Flex>{i18n(lang, "exit")}</Flex>
					<Flex
						fontSize={11}
						paddingTop="3px"
					></Flex>
				</MenuItem>
			</MenuList>
		</Menu>
	)
})

const BeforeCloseModal = memo(({ darkMode, isMobile, lang, isNewFile }: BeforeCloseModalProps) => {
	const [open, setOpen] = useState<boolean>(false)
	const isOpen = useRef<boolean>(false)

	const windowOnKeyDown = useCallback(
		(e: KeyboardEvent): void => {
			if (e.which == 13 && isOpen.current) {
				eventListener.emit("saveTextEditor")
				eventListener.emit("closePreviewModal")
				eventListener.emit("closeCreateTextFileModalEditor")
			}
		},
		[isOpen.current]
	)

	useEffect(() => {
		isOpen.current = open
	}, [open])

	useEffect(() => {
		window.addEventListener("keydown", windowOnKeyDown)

		const openBeforeCloseModalListener = eventListener.on("openBeforeCloseModal", () => {
			setOpen(true)
		})

		return () => {
			openBeforeCloseModalListener.remove()

			window.removeEventListener("keydown", windowOnKeyDown)
		}
	}, [])

	return (
		<Modal
			onClose={() => setOpen(false)}
			isOpen={open}
			isCentered={true}
			size={isMobile ? "full" : "md"}
			autoFocus={false}
		>
			<ModalOverlay backgroundColor="rgba(0, 0, 0, 0.4)" />
			<ModalContent
				backgroundColor={getColor(darkMode, "backgroundSecondary")}
				color={getColor(darkMode, "textSecondary")}
				borderRadius="10px"
				border={"1px solid " + getColor(darkMode, "borderPrimary")}
			>
				<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "fileHasBeenChanged")}</ModalHeader>
				<ModalCloseButton darkMode={darkMode} />
				<ModalBody
					height="100%"
					width="100%"
					alignItems="center"
					justifyContent="center"
				>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						color={getColor(darkMode, "textPrimary")}
					>
						{i18n(lang, "textEditorExitSure")}
					</AppText>
				</ModalBody>
				<ModalFooter>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						cursor="pointer"
						color={getColor(darkMode, "textSecondary")}
						_hover={{
							color: getColor(darkMode, "textPrimary"),
							textDecoration: "underline"
						}}
						onClick={() => setOpen(false)}
						marginRight="20px"
					>
						{i18n(lang, "cancel")}
					</AppText>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						cursor="pointer"
						color={getColor(darkMode, "textSecondary")}
						_hover={{
							color: getColor(darkMode, "textPrimary"),
							textDecoration: "underline"
						}}
						onClick={() => {
							eventListener.emit("closePreviewModal")
							eventListener.emit("closeCreateTextFileModalEditor")
						}}
						marginRight="20px"
					>
						{i18n(lang, "exit")}
					</AppText>
					<Button
						darkMode={darkMode}
						isMobile={isMobile}
						height="40px"
						backgroundColor={darkMode ? "white" : "gray"}
						color={darkMode ? "black" : "white"}
						border={"1px solid " + (darkMode ? "white" : "gray")}
						_hover={{
							backgroundColor: getColor(darkMode, "backgroundSecondary"),
							border: "1px solid " + (darkMode ? "white" : "gray"),
							color: darkMode ? "white" : "gray"
						}}
						onClick={() => {
							eventListener.emit("saveTextEditor")
							eventListener.emit("closePreviewModal")
							eventListener.emit("closeCreateTextFileModalEditor")
						}}
					>
						{i18n(lang, "saveChanges")}
					</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
})

const TextEditor = memo(({ darkMode, isMobile, windowHeight, windowWidth, currentItem, text, lang, isNewFile }: TextEditorProps) => {
	const [textEdited, setTextEdited] = useState<string>(text)
	const newText = useRef<string>("")
	const beforeText = useRef<string>(text)
	const location = useLocation()

	const showMarkDownPreview: boolean = useMemo(() => {
		if (
			getFileExt(currentItem.name) == "md" &&
			location.pathname.indexOf("/d/") == -1 &&
			location.pathname.indexOf("/f/") == -1 &&
			window.location.href.indexOf("/f/") == -1 &&
			window.location.href.indexOf("/d/") == -1
		) {
			return true
		}

		return false
	}, [currentItem, location])

	const textEditorWidth: number = useMemo(() => {
		if (showMarkDownPreview) {
			return Math.floor(windowWidth / 2)
		}

		return windowWidth
	}, [showMarkDownPreview, windowWidth])

	const save = useCallback(() => {
		if (beforeText.current == newText.current) {
			return
		}

		const encoded = new TextEncoder().encode(newText.current)

		const blob = new Blob([encoded.buffer], {
			type: currentItem.mime
		})

		let file = new File([blob], currentItem.name, {
			type: currentItem.mime
		}) as UploadQueueItemFile

		file = Object.assign(file, {
			fullPath: currentItem.name
		})

		eventListener.emit("openUploadModal", {
			files: [file],
			openModal: false
		})

		beforeText.current = newText.current

		memoryCache.set("textEditorChanged", false)
	}, [newText.current, currentItem, beforeText.current])

	const windowOnKeyDownListener = useCallback(
		(e: KeyboardEvent) => {
			if (window.location.href.indexOf("/f/") !== -1 || window.location.href.indexOf("/d/") !== -1) {
				return
			}

			if (e.which == 83 && (e.ctrlKey || e.metaKey) && typeof currentItem !== "undefined") {
				e.preventDefault()
				e.stopPropagation()

				save()
			} else {
				if (!e.ctrlKey && !e.metaKey && !e.altKey && !(e.which == 27)) {
					memoryCache.set("textEditorChanged", true)
				}
			}
		},
		[newText.current, currentItem]
	)

	useEffect(() => {
		newText.current = textEdited
	}, [textEdited])

	useEffect(() => {
		memoryCache.set("textEditorChanged", false)

		window.addEventListener("keydown", windowOnKeyDownListener)

		const previewModalBeforeCloseListener = eventListener.on("previewModalBeforeClose", () => {
			if (memoryCache.get("textEditorChanged")) {
				eventListener.emit("openBeforeCloseModal")

				return
			}

			eventListener.emit("closePreviewModal")
		})

		const saveTextEditorListener = eventListener.on("saveTextEditor", () => save())

		return () => {
			window.removeEventListener("keydown", windowOnKeyDownListener)

			previewModalBeforeCloseListener.remove()
			saveTextEditorListener.remove()
		}
	}, [])

	return (
		<ErrorBoundary fallback={<></>}>
			<Suspense fallback={<></>}>
				<Flex
					className="full-viewport"
					flexDirection="column"
					backgroundColor={getColor(darkMode, "backgroundSecondary")}
				>
					<Flex
						width={windowWidth}
						height="50px"
						flexDirection="row"
						alignItems="center"
						paddingLeft="15px"
						paddingRight="15px"
						borderBottom={"1px solid " + getColor(darkMode, "borderPrimary")}
					>
						{window.location.href.indexOf("/f/") == -1 && window.location.href.indexOf("/d/") == -1 && (
							<Flex>
								<FileMenu
									darkMode={darkMode}
									isMobile={isMobile}
									lang={lang}
									isNewFile={isNewFile}
								/>
							</Flex>
						)}
						<Flex>
							<AppText
								darkMode={darkMode}
								isMobile={isMobile}
								noOfLines={1}
								wordBreak="break-all"
								color={getColor(darkMode, "textSecondary")}
							>
								{currentItem.name}
							</AppText>
						</Flex>
					</Flex>
					<Flex
						width={windowWidth + "px"}
						height={windowHeight - 50 + "px"}
					>
						<CodeMirror
							value={text}
							width={textEditorWidth + "px"}
							height={windowHeight - 50 + "px"}
							theme={createCodeMirrorTheme(darkMode)}
							indentWithTab={true}
							autoFocus={true}
							basicSetup={{
								crosshairCursor: false,
								searchKeymap: false,
								foldKeymap: false,
								lintKeymap: false,
								completionKeymap: false,
								closeBracketsKeymap: false,
								foldGutter: false
							}}
							onChange={value => {
								if (window.location.href.indexOf("/f/") !== -1 || window.location.href.indexOf("/d/") !== -1) {
									return
								}

								setTextEdited(value)
							}}
							style={{
								paddingLeft: "5px",
								paddingRight: "5px",
								maxWidth: textEditorWidth + 4 + "px",
								maxHeight: windowHeight - 50 + "px",
								width: textEditorWidth + 4 + "px",
								height: windowHeight - 50 + "px",
								marginLeft: "-5px"
							}}
							extensions={[getCodeMirrorLanguageExtensionForFile(currentItem.name), EditorView.lineWrapping]}
						/>
						{showMarkDownPreview &&
							window.location.href.indexOf("/f/") === -1 &&
							window.location.href.indexOf("/d/") === -1 && (
								<Flex
									width={textEditorWidth + "px"}
									height={windowHeight - 50 + "px"}
									overflowY="auto"
									overflowX="hidden"
									backgroundColor={getColor(darkMode, "backgroundPrimary")}
									borderLeft={"2px solid " + getColor(darkMode, "borderPrimary")}
								>
									<MarkdownPreview
										source={textEdited}
										style={{
											width: textEditorWidth + "px",
											height: windowHeight - 50 + "px",
											paddingLeft: "15px",
											paddingRight: "15px",
											paddingTop: "6px",
											paddingBottom: "15px",
											color: getColor(darkMode, "textPrimary"),
											userSelect: "all",
											backgroundColor: getColor(darkMode, "backgroundPrimary")
										}}
										rehypeRewrite={(node, index, parent) => {
											try {
												if (
													// @ts-ignore
													node.tagName === "a" &&
													parent &&
													// @ts-ignore
													/^h(1|2|3|4|5|6)/.test(parent.tagName)
												) {
													parent.children = parent.children.slice(1)
												}

												if (
													// @ts-ignore
													node.tagName === "a" &&
													// @ts-ignore
													node.properties &&
													// @ts-ignore
													node.properties.href &&
													// @ts-ignore
													node.properties.href.indexOf("#") !== -1
												) {
													// @ts-ignore
													node.properties.href = window.location.hash
												}
											} catch (e) {
												console.error(e)
											}
										}}
										skipHtml={true}
										linkTarget="_blank"
										warpperElement={{
											"data-color-mode": darkMode ? "dark" : "light"
										}}
									/>
								</Flex>
							)}
					</Flex>
				</Flex>
				<BeforeCloseModal
					darkMode={darkMode}
					isMobile={isMobile}
					lang={lang}
					isNewFile={isNewFile}
				/>
			</Suspense>
		</ErrorBoundary>
	)
})

export default TextEditor
