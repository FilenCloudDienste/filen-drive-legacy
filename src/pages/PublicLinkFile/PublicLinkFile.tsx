import { memo, useCallback, useEffect, useRef, useState, useMemo } from "react"
import type { AppBaseProps, LinkGetInfoV1, ItemProps, LinkHasPasswordV1 } from "../../types"
import { useParams } from "react-router-dom"
import { validate as validateUUID } from "uuid"
import InvalidLink from "../../components/PublicLink/InvalidLink"
import { publicLinkInfo, publicLinkHasPassword } from "../../lib/api"
import { Flex, Spinner, Image } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import { hashFn } from "../../lib/worker/worker.com"
import Input from "../../components/Input"
import AppText from "../../components/AppText"
import Container from "../../components/PublicLink/Container"
import { getImageForFileByExt, getFileExt, formatBytes, getFilePreviewType } from "../../lib/helpers"
import { decryptMetadata, deriveKeyFromPassword } from "../../lib/worker/worker.com"
import Button from "../../components/Button"
import { queueFileDownload, downloadFile } from "../../lib/services/download"
import { show as showToast, dismiss as dismissToast } from "../../components/Toast/Toast"
import LogoAnimated from "../../assets/images/logo_animated.gif"
import memoryCache from "../../lib/memoryCache"
import CodeMirror from "@uiw/react-codemirror"
import { createCodeMirrorTheme } from "../../styles/codeMirror"
import Cookies from "../../lib/cookies"
import eventListener from "../../lib/eventListener"
import PreviewContainer from "../../components/PublicLink/PreviewContainer"
import ImagePreview from "../../components/ImagePreview"
import { MdReportGmailerrorred } from "react-icons/md"
import AbuseReportModal from "../../components/AbuseReportModal"
import { i18n } from "../../i18n"
import { getCodeMirrorLanguageExtensionForFile } from "../../components/PreviewModal/TextEditor"

const SUPPORTED_PREVIEW_TYPES: string[] = ["image", "text", "pdf", "video"]
const MAX_SIZE: number = 1024 * 1024 * 16

const getItemFromFile = (
	info: LinkGetInfoV1,
	file: { name: string; size: number; mime: string },
	key: string
): ItemProps => {
	const item: ItemProps = {
		root: "",
		type: "file",
		uuid: info.uuid,
		name: file.name,
		size: file.size,
		mime: file.mime,
		lastModified: new Date().getTime(),
		lastModifiedSort: new Date().getTime(),
		timestamp: info.timestamp,
		selected: false,
		color: "default",
		parent: "base",
		rm: "",
		version: info.version,
		sharerEmail: "",
		sharerId: 0,
		receiverEmail: "",
		receiverId: 0,
		writeAccess: true,
		chunks: info.chunks,
		favorited: 0,
		key,
		bucket: info.bucket,
		region: info.region
	}

	return item
}

const PublicLinkFile = memo(({ windowWidth, windowHeight, darkMode, isMobile, lang }: AppBaseProps) => {
	const params = useParams()
	const key = useRef<string>(window.location.hash.split("#").join("").split("!").join("")).current
	const [info, setInfo] = useState<LinkGetInfoV1 | undefined>(undefined)
	const [needsPassword, setNeedsPassword] = useState<boolean>(false)
	const [password, setPassword] = useState<string>("")
	const [notFound, setNotFound] = useState<boolean>(false)
	const [file, setFile] = useState<{ name: string; size: number; mime: string } | undefined>(undefined)
	const downloadTimeout = useRef<number>(0)
	const [previewBuffer, setPreviewBuffer] = useState<Uint8Array | undefined>(undefined)
	const [image, setImage] = useState<string>("")
	const [text, setText] = useState<string>("")
	const [pdf, setPDF] = useState<string>("")
	const [loadingPassword, setLoadingPassword] = useState<boolean>(false)
	const [passwordCorrect, setPasswordCorrect] = useState<boolean>(false)
	const [video, setVideo] = useState<string>("")

	const [previewContainerWidth, previewContainerHeight] = useMemo(() => {
		if (isMobile) {
			return [windowWidth, windowHeight]
		}
		return [(windowWidth - 400) / 1.15, windowHeight / 1.35]
	}, [windowWidth, windowHeight, isMobile])

	const toggleColorMode = useCallback((): void => {
		Cookies.set("colorMode", darkMode ? "light" : "dark")

		eventListener.emit("colorModeChanged", !darkMode)
	}, [darkMode])

	const download = useCallback(() => {
		if (downloadTimeout.current > new Date().getTime()) {
			return
		}

		downloadTimeout.current = new Date().getTime() + 2500

		queueFileDownload(
			getItemFromFile(info as LinkGetInfoV1, file as { name: string; size: number; mime: string }, key)
		)
			.then(console.log)
			.catch(console.error)
	}, [info, file, key, downloadTimeout.current])

	const fetchInfo = useCallback(() => {
		if (typeof params.uuid == "string" && typeof key == "string") {
			if (validateUUID(params.uuid) && key.length == 32) {
				const getInfo = async (passwordInfo: LinkHasPasswordV1) => {
					setLoadingPassword(true)
					setPasswordCorrect(false)

					publicLinkInfo(
						params.uuid as string,
						passwordInfo.hasPassword
							? passwordInfo.salt.length == 32
								? ((await deriveKeyFromPassword(
										password,
										passwordInfo.salt,
										200000,
										"SHA-512",
										512,
										true
								  )) as string)
								: await hashFn(password.length == 0 ? "empty" : password)
							: await hashFn("empty")
					)
						.then(async linkInfo => {
							setLoadingPassword(false)
							setPasswordCorrect(true)

							try {
								const [name, size, mime] = await Promise.all([
									decryptMetadata(linkInfo.name, key),
									decryptMetadata(linkInfo.size, key),
									decryptMetadata(linkInfo.mime, key)
								])

								setFile({
									name,
									size: parseInt(size),
									mime
								})

								setInfo(linkInfo)

								if (
									SUPPORTED_PREVIEW_TYPES.includes(getFilePreviewType(getFileExt(name))) &&
									MAX_SIZE > parseInt(size)
								) {
									memoryCache.set("hideTransferProgress:" + linkInfo.uuid, true)

									downloadFile(
										getItemFromFile(linkInfo, { name, size: parseInt(size), mime }, key),
										false
									)
										.then(buffer => {
											if (buffer instanceof Uint8Array) {
												memoryCache.remove("hideTransferProgress:" + linkInfo.uuid)

												setPreviewBuffer(buffer)

												if (getFilePreviewType(getFileExt(name)) == "image") {
													const blob = new Blob([buffer], {
														type: mime
													})

													const url = window.URL.createObjectURL(blob)

													setImage(url)
												} else if (getFilePreviewType(getFileExt(name)) == "text") {
													try {
														setText(new TextDecoder().decode(buffer))
													} catch (e) {
														console.error(e)
													}
												} else if (getFilePreviewType(getFileExt(name)) == "pdf") {
													try {
														const blob = new Blob([buffer], {
															type: mime
														})

														const url = window.URL.createObjectURL(blob)

														setPDF(url)
													} catch (e) {
														console.error(e)
													}
												} else if (getFilePreviewType(getFileExt(name)) == "video") {
													try {
														const blob = new Blob([buffer], {
															type: mime
														})

														const url = window.URL.createObjectURL(blob)

														setVideo(url)
													} catch (e) {
														console.error(e)
													}
												}
											} else {
												return console.error(new Error("buffer !== Uint8Array"))
											}
										})
										.catch(console.error)
								}
							} catch (e) {
								console.error(e)

								setInfo(undefined)
								setNotFound(true)
							}
						})
						.catch(err => {
							setLoadingPassword(false)

							if (err.toString().toLowerCase().indexOf("wrong password") !== -1) {
								setNeedsPassword(true)
								setPassword("")
								setPasswordCorrect(false)
							} else if (err.toString().toLowerCase().indexOf("not found") !== -1) {
								setInfo(undefined)
								setNotFound(true)
							} else {
								console.error(err)
							}
						})
				}

				publicLinkHasPassword(params.uuid)
					.then(passwordInfo => {
						if (passwordInfo.hasPassword) {
							if (password.length > 0) {
								getInfo(passwordInfo)
							} else {
								setNeedsPassword(true)
								setPassword("")
							}
						} else {
							getInfo(passwordInfo)
						}
					})
					.catch(err => {
						if (err.toString().toLowerCase().indexOf("not found") !== -1) {
							setInfo(undefined)
							setNotFound(true)
						} else {
							console.error(err)
						}
					})
			}
		}
	}, [params, key, password])

	useEffect(() => {
		const transfersToastId = showToast("transfers")

		fetchInfo()

		return () => {
			dismissToast(transfersToastId)
		}
	}, [])

	if (
		typeof params.uuid !== "string" ||
		!validateUUID(params.uuid) ||
		typeof key !== "string" ||
		key.length !== 32 ||
		notFound
	) {
		return (
			<InvalidLink
				windowWidth={windowWidth}
				windowHeight={windowHeight}
				darkMode={darkMode}
				isMobile={isMobile}
				lang={lang}
			/>
		)
	}

	if (typeof info == "undefined" && !needsPassword) {
		return (
			<Flex
				className="full-viewport"
				flexDirection="column"
				backgroundColor={getColor(darkMode, "backgroundPrimary")}
				overflow="hidden"
				justifyContent="center"
				alignItems="center"
			>
				<Image
					src={LogoAnimated}
					width="128px"
					height="128px"
				/>
			</Flex>
		)
	}

	return (
		<Container
			windowWidth={windowWidth}
			windowHeight={windowHeight}
			darkMode={darkMode}
			isMobile={isMobile}
			lang={lang}
		>
			<Flex
				width={isMobile ? windowWidth + "px" : windowWidth - 400 + "px"}
				height="100%"
				flexDirection="column"
				justifyContent="center"
				alignItems="center"
				overflow="hidden"
			>
				{needsPassword && !passwordCorrect ? (
					<Flex
						width="300px"
						flexDirection="column"
						justifyContent="center"
						alignItems="center"
					>
						<Input
							darkMode={darkMode}
							isMobile={isMobile}
							value={password}
							onChange={e => setPassword(e.target.value)}
							placeholder={i18n(lang, "password")}
							type="password"
							onKeyDown={e => {
								if (e.which == 13) {
									fetchInfo()
								}
							}}
							color={getColor(darkMode, "textSecondary")}
							_placeholder={{
								color: getColor(darkMode, "textSecondary")
							}}
						/>
						<Button
							darkMode={darkMode}
							isMobile={isMobile}
							backgroundColor={darkMode ? "white" : "gray"}
							color={darkMode ? "black" : "white"}
							border={"1px solid " + (darkMode ? "white" : "gray")}
							marginTop="15px"
							height="35px"
							_hover={{
								backgroundColor: getColor(darkMode, "backgroundPrimary"),
								border: "1px solid " + (darkMode ? "white" : "gray"),
								color: darkMode ? "white" : "gray"
							}}
							onClick={() => fetchInfo()}
						>
							{loadingPassword ? (
								<Spinner
									width="16px"
									height="16px"
								/>
							) : (
								i18n(lang, "unlockLink")
							)}
						</Button>
					</Flex>
				) : (
					<>
						{typeof file == "undefined" || typeof info == "undefined" ? (
							<Flex
								width="300px"
								flexDirection="column"
								justifyContent="center"
								alignItems="center"
							>
								<Spinner
									width="32px"
									height="32px"
									color={getColor(darkMode, "textPrimary")}
								/>
							</Flex>
						) : (
							<>
								{SUPPORTED_PREVIEW_TYPES.includes(getFilePreviewType(getFileExt(file.name))) &&
								MAX_SIZE > file.size ? (
									<>
										{getFilePreviewType(getFileExt(file.name)) == "image" && (
											<>
												{typeof previewBuffer == "undefined" || image.length == 0 ? (
													<Flex
														width="300px"
														flexDirection="column"
														justifyContent="center"
														alignItems="center"
													>
														<Spinner
															width="32px"
															height="32px"
															color={getColor(darkMode, "textPrimary")}
														/>
													</Flex>
												) : (
													<PreviewContainer
														darkMode={darkMode}
														isMobile={isMobile}
														windowWidth={windowWidth}
														windowHeight={windowHeight}
														lang={lang}
														info={info}
														file={file}
														download={download}
														toggleColorMode={toggleColorMode}
														previewContainerWidth={previewContainerWidth}
														previewContainerHeight={previewContainerHeight}
														password={password}
													>
														<ImagePreview image={image} />
													</PreviewContainer>
												)}
											</>
										)}
										{getFilePreviewType(getFileExt(file.name)) == "text" && (
											<>
												{typeof previewBuffer == "undefined" || text.length == 0 ? (
													<Flex
														width="300px"
														flexDirection="column"
														justifyContent="center"
														alignItems="center"
													>
														<Spinner
															width="32px"
															height="32px"
															color={getColor(darkMode, "textPrimary")}
														/>
													</Flex>
												) : (
													<PreviewContainer
														darkMode={darkMode}
														isMobile={isMobile}
														windowWidth={windowWidth}
														windowHeight={windowHeight}
														lang={lang}
														info={info}
														file={file}
														download={download}
														toggleColorMode={toggleColorMode}
														previewContainerWidth={previewContainerWidth}
														previewContainerHeight={previewContainerHeight}
														password={password}
													>
														<CodeMirror
															value={text}
															width={previewContainerWidth - 10 + "px"}
															height={previewContainerHeight - 10 + "px"}
															theme={createCodeMirrorTheme(darkMode)}
															indentWithTab={true}
															basicSetup={{
																crosshairCursor: false,
																searchKeymap: false,
																foldKeymap: false,
																lintKeymap: false,
																completionKeymap: false,
																closeBracketsKeymap: false,
																foldGutter: false
															}}
															onChange={() => setText(prev => prev)}
															style={{
																paddingLeft: "5px",
																paddingRight: "5px"
															}}
															extensions={[
																getCodeMirrorLanguageExtensionForFile(file.name)
															]}
														/>
													</PreviewContainer>
												)}
											</>
										)}
										{getFilePreviewType(getFileExt(file.name)) == "pdf" && (
											<>
												{typeof previewBuffer == "undefined" || pdf.length == 0 ? (
													<Flex
														width="300px"
														flexDirection="column"
														justifyContent="center"
														alignItems="center"
													>
														<Spinner
															width="32px"
															height="32px"
															color={getColor(darkMode, "textPrimary")}
														/>
													</Flex>
												) : (
													<PreviewContainer
														darkMode={darkMode}
														isMobile={isMobile}
														windowWidth={windowWidth}
														windowHeight={windowHeight}
														lang={lang}
														info={info}
														file={file}
														download={download}
														toggleColorMode={toggleColorMode}
														previewContainerWidth={previewContainerWidth}
														previewContainerHeight={previewContainerHeight}
														password={password}
													>
														<iframe
															src={pdf}
															width="100%"
															height="100%"
														/>
													</PreviewContainer>
												)}
											</>
										)}
										{getFilePreviewType(getFileExt(file.name)) == "video" && (
											<>
												{typeof previewBuffer == "undefined" || video.length == 0 ? (
													<Flex
														width="300px"
														flexDirection="column"
														justifyContent="center"
														alignItems="center"
													>
														<Spinner
															width="32px"
															height="32px"
															color={getColor(darkMode, "textPrimary")}
														/>
													</Flex>
												) : (
													<PreviewContainer
														darkMode={darkMode}
														isMobile={isMobile}
														windowWidth={windowWidth}
														windowHeight={windowHeight}
														lang={lang}
														info={info}
														file={file}
														download={download}
														toggleColorMode={toggleColorMode}
														previewContainerWidth={previewContainerWidth}
														previewContainerHeight={previewContainerHeight}
														password={password}
													>
														<video
															autoPlay={true}
															controls={true}
															src={video}
															style={{
																maxHeight: "100%",
																maxWidth: "100%"
															}}
														/>
													</PreviewContainer>
												)}
											</>
										)}
									</>
								) : (
									<Flex
										width={(windowWidth - 400) / 2 + "px"}
										flexDirection="column"
										justifyContent="center"
										alignItems="center"
									>
										<Flex
											border={"1px solid " + getColor(darkMode, "borderPrimary")}
											padding="15px"
											boxShadow="md"
											borderRadius="10px"
										>
											<Image
												src={getImageForFileByExt(getFileExt(file.name))}
												width="64px"
												height="64px"
												flexShrink={0}
												objectFit="cover"
											/>
										</Flex>
										<AppText
											darkMode={darkMode}
											isMobile={isMobile}
											noOfLines={1}
											wordBreak="break-all"
											fontSize={20}
											color={getColor(darkMode, "textPrimary")}
											marginTop="15px"
										>
											{file.name}
										</AppText>
										<AppText
											darkMode={darkMode}
											isMobile={isMobile}
											noOfLines={1}
											wordBreak="break-all"
											fontSize={15}
											color={getColor(darkMode, "textSecondary")}
											marginTop="1px"
										>
											{formatBytes(file.size)}
										</AppText>
										<Flex
											alignItems="center"
											marginTop="30px"
										>
											{info.downloadBtn && (
												<Button
													darkMode={darkMode}
													isMobile={isMobile}
													backgroundColor={darkMode ? "white" : "gray"}
													color={darkMode ? "black" : "white"}
													border={"1px solid " + (darkMode ? "white" : "gray")}
													height="35px"
													_hover={{
														backgroundColor: getColor(darkMode, "backgroundPrimary"),
														border: "1px solid " + (darkMode ? "white" : "gray"),
														color: darkMode ? "white" : "gray"
													}}
													onClick={() => download()}
												>
													{i18n(lang, "download")}
												</Button>
											)}
											<Button
												darkMode={darkMode}
												isMobile={isMobile}
												backgroundColor={darkMode ? "white" : "gray"}
												color={darkMode ? "black" : "white"}
												border={"1px solid " + (darkMode ? "white" : "gray")}
												height="35px"
												marginLeft="10px"
												_hover={{
													backgroundColor: getColor(darkMode, "backgroundPrimary"),
													border: "1px solid " + (darkMode ? "white" : "gray"),
													color: darkMode ? "white" : "gray"
												}}
												onClick={() =>
													eventListener.emit("openAbuseReportModal", {
														password
													})
												}
											>
												<MdReportGmailerrorred fontSize={24} />
											</Button>
										</Flex>
									</Flex>
								)}
							</>
						)}
					</>
				)}
			</Flex>
			<AbuseReportModal
				darkMode={darkMode}
				isMobile={isMobile}
				lang={lang}
			/>
		</Container>
	)
})

export default PublicLinkFile
