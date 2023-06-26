import { memo, useRef, useMemo } from "react"
import { Flex } from "@chakra-ui/react"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useLang from "../../lib/hooks/useLang"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { Note as INote, NoteType } from "../../lib/api"
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror"
import { createCodeMirrorThemeNotesText, createCodeMirrorTheme } from "../../styles/codeMirror"
import { EditorView } from "@codemirror/view"
import MarkdownPreview from "@uiw/react-markdown-preview"
import { getCodeMirrorLanguageExtensionForFile } from "../PreviewModal/TextEditor"
import { getColor } from "../../styles/colors"
import ReactQuill from "react-quill"
import "react-quill/dist/quill.snow.css"

export const Editor = memo(
	({
		width,
		height,
		content,
		setContent,
		type,
		currentNote,
		onBlur,
		showMarkdownPreview,
		onContentChange,
		canEdit
	}: {
		width: number
		height: number
		content: string
		setContent: React.Dispatch<React.SetStateAction<string>>
		type: NoteType
		currentNote: INote | undefined
		onBlur?: React.FocusEventHandler<HTMLDivElement>
		showMarkdownPreview: boolean
		onContentChange?: (content: string) => void
		canEdit: boolean
	}) => {
		const darkMode = useDarkMode()
		const lang = useLang()
		const isMobile = useIsMobile()
		const codeMirrorRef = useRef<ReactCodeMirrorRef>(null)

		const codeExt = useMemo(() => {
			if (!currentNote) {
				return ""
			}

			return currentNote.title
		}, [currentNote])

		return (
			<Flex
				width={width + "px"}
				height={height + "px"}
				flexDirection="column"
			>
				{type === "text" && (
					<CodeMirror
						key={"text-editor-" + currentNote?.uuid}
						ref={codeMirrorRef}
						onBlur={onBlur}
						value={content}
						width={width + "px"}
						height={height + "px"}
						theme={createCodeMirrorThemeNotesText(darkMode)}
						placeholder={canEdit ? "Note content..." : undefined}
						autoFocus={content.length === 0}
						basicSetup={{
							crosshairCursor: false,
							searchKeymap: false,
							foldKeymap: false,
							lintKeymap: false,
							completionKeymap: false,
							closeBracketsKeymap: false,
							foldGutter: false,
							lineNumbers: false
						}}
						editable={canEdit}
						onChange={value => {
							if (!canEdit) {
								return
							}

							if (typeof onContentChange === "function") {
								onContentChange(value)
							}

							setContent(value)
						}}
						style={{
							padding: "0px",
							paddingTop: "5px",
							paddingRight: "20px",
							maxWidth: width + "px",
							maxHeight: height + "px",
							width: width + "px",
							height: height + "px",
							fontSize: 16
						}}
						extensions={[EditorView.lineWrapping]}
					/>
				)}
				{type === "code" && (
					<CodeMirror
						key={"code-editor-" + currentNote?.uuid}
						ref={codeMirrorRef}
						onBlur={onBlur}
						value={content}
						width={width + "px"}
						height={height + 10 + "px"}
						placeholder={canEdit ? "Note content..." : undefined}
						theme={createCodeMirrorTheme(darkMode)}
						indentWithTab={true}
						autoFocus={content.length === 0}
						basicSetup={{
							crosshairCursor: false,
							searchKeymap: false,
							foldKeymap: false,
							lintKeymap: false,
							completionKeymap: false,
							closeBracketsKeymap: false,
							foldGutter: false
						}}
						editable={canEdit}
						onChange={value => {
							if (!canEdit) {
								return
							}

							if (typeof onContentChange === "function") {
								onContentChange(value)
							}

							setContent(value)
						}}
						style={{
							padding: "0px",
							paddingRight: "20px",
							maxWidth: width + "px",
							maxHeight: height + 10 + "px",
							width: width + "px",
							height: height + 10 + "px",
							fontSize: 16
						}}
						extensions={[getCodeMirrorLanguageExtensionForFile(codeExt), EditorView.lineWrapping]}
					/>
				)}
				{type === "md" && (
					<Flex flexDirection="row">
						{canEdit && (
							<Flex>
								<CodeMirror
									key={"md-editor-" + currentNote?.uuid}
									ref={codeMirrorRef}
									value={content}
									width={(showMarkdownPreview ? Math.floor(width / 2) : width) + "px"}
									height={height + 10 + "px"}
									placeholder={canEdit ? "Note content..." : undefined}
									theme={createCodeMirrorThemeNotesText(darkMode)}
									indentWithTab={true}
									onBlur={onBlur}
									autoFocus={content.length === 0}
									basicSetup={{
										crosshairCursor: false,
										searchKeymap: false,
										foldKeymap: false,
										lintKeymap: false,
										completionKeymap: false,
										closeBracketsKeymap: false,
										foldGutter: false,
										lineNumbers: false
									}}
									editable={canEdit}
									onChange={value => {
										if (!canEdit) {
											return
										}

										if (typeof onContentChange === "function") {
											onContentChange(value)
										}

										setContent(value)
									}}
									style={{
										padding: "0px",
										paddingTop: "5px",
										paddingRight: "20px",
										maxWidth: (showMarkdownPreview ? Math.floor(width / 2) : width) + "px",
										maxHeight: height + 10 + "px",
										width: (showMarkdownPreview ? Math.floor(width / 2) : width) + "px",
										height: height + 10 + "px",
										fontSize: 16
									}}
									extensions={[getCodeMirrorLanguageExtensionForFile(".md"), EditorView.lineWrapping]}
								/>
							</Flex>
						)}
						{showMarkdownPreview && (
							<Flex>
								<MarkdownPreview
									source={content}
									style={{
										width: !canEdit ? width : Math.floor(width / 2) + "px",
										height: height + 10 + "px",
										paddingLeft: "15px",
										paddingRight: "15px",
										paddingTop: "10px",
										paddingBottom: "15px",
										color: getColor(darkMode, "textPrimary"),
										userSelect: "all",
										backgroundColor: getColor(darkMode, "backgroundPrimary"),
										borderLeft: !canEdit ? undefined : "1px solid " + getColor(darkMode, "borderPrimary"),
										overflowY: "auto",
										overflowX: "hidden"
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
				)}
				{type === "rich" && (
					<ReactQuill
						theme="snow"
						value={content}
						placeholder={canEdit ? "Note content..." : undefined}
						onBlur={() => {
							if (typeof onBlur === "function") {
								onBlur(undefined as any)
							}
						}}
						modules={{
							toolbar: [
								[{ header: [1, 2, 3, false] }],
								["bold", "italic", "underline"],
								["code-block"],
								[{ list: "ordered" }, { list: "bullet" }, { list: "check" }]
							]
						}}
						style={{
							width: width + "px",
							height: height - 44 + "px",
							border: "none",
							color: getColor(darkMode, "textPrimary")
						}}
						onChange={value => {
							if (!canEdit) {
								return
							}

							if (typeof onContentChange === "function") {
								onContentChange(value)
							}

							setContent(value)
						}}
					/>
				)}
			</Flex>
		)
	}
)

export default Editor
