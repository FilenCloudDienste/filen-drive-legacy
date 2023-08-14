import { memo, useState, useEffect, useRef, useCallback, useMemo, Component } from "react"
import eventListener from "../../lib/eventListener"
import { getColor } from "../../styles/colors"
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, Flex, ModalFooter, Progress } from "@chakra-ui/react"
import {
	UploadModalProps,
	UploadQueueItem,
	UploadQueueItemFile,
	UploadModalListProps,
	UploadModalListItemProps,
	CurrentUpload,
	ItemProps
} from "../../types"
import { List as RVList, AutoSizer } from "react-virtualized"
import AppText from "../AppText"
import { v4 as uuidv4 } from "uuid"
import { queueFileUpload } from "../../lib/services/upload"
import {
	getCurrentURLParentFolder,
	calcSpeed,
	calcTimeLeft,
	getTimeRemaining,
	bpsToReadable,
	pathGetDirname,
	pathGetBasename,
	getEveryPossibleFolderPathFromPath
} from "../../lib/helpers"
import useTransfers from "../../lib/hooks/useTransfers"
import { i18n } from "../../i18n"
import { createFolder } from "../../lib/api"
import SelectFromComputer from "../SelectFromComputer"
import { addFolderNameToDb } from "../../lib/services/items"
import { throttle } from "lodash"
import { CHAKRA_COLOR_SCHEME } from "../../lib/constants"
import { show as showToast, update as updateToast, dismiss as dismissToast } from "../Toast/Toast"
import { ONE_YEAR } from "../../lib/constants"
import ModalCloseButton from "../ModalCloseButton"

const ROW_HEIGHT = 45

export interface UploadModalListItemActionButtonsProps {
	darkMode: boolean
	isMobile: boolean
	done: boolean | undefined
	uuid: string
	paused: boolean
	setPaused: React.Dispatch<React.SetStateAction<boolean>>
	lang: string
	hovering: boolean
}

class UploadModalListItemActionButtons extends Component<UploadModalListItemActionButtonsProps> {
	shouldComponentUpdate(nextProps: UploadModalListItemActionButtonsProps): boolean {
		if (
			nextProps.paused !== this.props.paused ||
			nextProps.done !== this.props.done ||
			nextProps.hovering !== this.props.hovering ||
			nextProps.lang !== this.props.lang
		) {
			return true
		}

		return false
	}

	render() {
		const { darkMode, isMobile, done, uuid, paused, setPaused, lang, hovering } = this.props

		if (done) {
			return null
		}

		if (!hovering) {
			return null
		}

		return (
			<>
				{paused ? (
					<Flex
						width="auto"
						height="auto"
						padding="2px"
						paddingLeft="5px"
						paddingRight="5px"
						backgroundColor={darkMode ? "white" : "gray"}
						borderRadius="20px"
						marginLeft="5px"
						cursor="pointer"
						onClick={() => {
							setPaused(false)

							eventListener.emit("resumeTransfer", uuid)
						}}
					>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							noOfLines={1}
							fontSize={12}
							color={darkMode ? "black" : "white"}
							fontWeight="bold"
						>
							{i18n(lang, "resume")}
						</AppText>
					</Flex>
				) : (
					<Flex
						width="auto"
						height="auto"
						padding="2px"
						paddingLeft="5px"
						paddingRight="5px"
						backgroundColor={darkMode ? "white" : "gray"}
						borderRadius="20px"
						marginLeft="5px"
						cursor="pointer"
						onClick={() => {
							setPaused(true)

							eventListener.emit("pauseTransfer", uuid)
						}}
					>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							noOfLines={1}
							fontSize={12}
							color={darkMode ? "black" : "white"}
							fontWeight="bold"
						>
							{i18n(lang, "pause")}
						</AppText>
					</Flex>
				)}
				<Flex
					width="auto"
					height="auto"
					padding="2px"
					paddingLeft="5px"
					paddingRight="5px"
					backgroundColor={darkMode ? "white" : "gray"}
					borderRadius="20px"
					marginLeft="5px"
					cursor="pointer"
					onClick={() => {
						setPaused(false)

						eventListener.emit("stopTransfer", uuid)
					}}
				>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						noOfLines={1}
						fontSize={12}
						color={darkMode ? "black" : "white"}
						fontWeight="bold"
					>
						{i18n(lang, "stop")}
					</AppText>
				</Flex>
			</>
		)
	}
}

const UploadModalListItem = memo(({ darkMode, isMobile, item, style, lang }: UploadModalListItemProps) => {
	const [paused, setPaused] = useState<boolean>(false)
	const [hovering, setHovering] = useState<boolean>(false)

	const progress: number = useMemo(() => {
		return isNaN(item.percent) ? 0 : item.percent >= 100 ? 100 : item.percent
	}, [item.percent])

	return (
		<Flex
			style={style}
			width="100%"
			height={ROW_HEIGHT + "px"}
			flexDirection="column"
			paddingLeft="25px"
			paddingRight="25px"
			onMouseEnter={() => setHovering(true)}
			onMouseLeave={() => setHovering(false)}
		>
			<Flex
				alignItems="center"
				justifyContent="space-between"
			>
				<Flex>
					<AppText
						darkMode={darkMode}
						isMobile={isMobile}
						noOfLines={1}
						fontSize={15}
						fontWeight="bold"
						wordBreak="break-all"
						paddingRight="15px"
					>
						{item.file.name}
					</AppText>
				</Flex>
				<Flex>
					{item.errored ? (
						<Flex
							width="auto"
							height="auto"
							padding="2px"
							paddingLeft="5px"
							paddingRight="5px"
							backgroundColor="red.500"
							borderRadius="20px"
						>
							<AppText
								darkMode={darkMode}
								isMobile={isMobile}
								noOfLines={1}
								fontSize={12}
								color="white"
								fontWeight="bold"
							>
								{i18n(lang, "uploadErrored")}
							</AppText>
						</Flex>
					) : (
						<>
							{!paused && !hovering && !item.done && (
								<Flex
									width="auto"
									height="auto"
									padding="2px"
									paddingLeft="5px"
									paddingRight="5px"
									backgroundColor={darkMode ? "white" : "gray"}
									borderRadius="20px"
								>
									<AppText
										darkMode={darkMode}
										isMobile={isMobile}
										noOfLines={1}
										fontSize={12}
										color={darkMode ? "black" : "white"}
										fontWeight="bold"
									>
										{progress <= 0.01 ? (
											<>{i18n(lang, "queued")}</>
										) : progress >= 99.99 ? (
											<>{i18n(lang, "finishing")}</>
										) : item.done ? (
											<>{i18n(lang, "done")}</>
										) : (
											<>{progress.toFixed(2)}%</>
										)}
									</AppText>
								</Flex>
							)}
							{progress >= 0.01 && progress <= 99.99 && !item.done && (
								<UploadModalListItemActionButtons
									darkMode={darkMode}
									isMobile={isMobile}
									paused={paused}
									setPaused={setPaused}
									done={item.done}
									uuid={item.uuid}
									lang={lang}
									hovering={hovering}
								/>
							)}
						</>
					)}
				</Flex>
			</Flex>
			<Flex marginTop="6px">
				<Progress
					value={item.done || item.errored ? 100 : progress}
					isIndeterminate={item.errored || item.done ? false : progress >= 99.99 || progress <= 0.01 || paused ? true : false}
					colorScheme={item.done ? "green" : item.errored ? "red" : CHAKRA_COLOR_SCHEME}
					width="100%"
					height="3px"
					borderRadius="10px"
					backgroundColor={getColor(darkMode, "backgroundSecondary")}
				/>
			</Flex>
		</Flex>
	)
})

const UploadModalList = memo(({ darkMode, isMobile, currentUploads, lang }: UploadModalListProps) => {
	const rowRenderer = useCallback(
		({ style, key, index }: { style: React.CSSProperties; key: string; index: number }) => {
			const item = currentUploads[index]

			return (
				<UploadModalListItem
					key={key}
					darkMode={darkMode}
					isMobile={isMobile}
					item={item}
					style={style}
					lang={lang}
				/>
			)
		},
		[currentUploads, lang]
	)

	return (
		<Flex
			width="100%"
			height="100%"
			outline="none"
		>
			{/* @ts-ignore */}
			<AutoSizer
				style={{
					outline: "none"
				}}
			>
				{({ height, width }) => (
					<>
						{/* @ts-ignore */}
						<RVList
							height={height}
							rowHeight={ROW_HEIGHT}
							rowCount={Object.keys(currentUploads).length}
							width={width}
							rowRenderer={rowRenderer}
							style={{
								outline: "none"
							}}
						/>
					</>
				)}
			</AutoSizer>
		</Flex>
	)
})

const UploadModal = memo(({ darkMode, isMobile, windowWidth, windowHeight, lang, items }: UploadModalProps) => {
	const [open, setOpen] = useState<boolean>(false)
	const [finishedTransfers, setFinishedTransfers] = useState<{ [key: string]: CurrentUpload }>({})
	const [remaining, setRemaining] = useState<number>(0)
	const [speed, setSpeed] = useState<number>(0)
	const [percent, setPercent] = useState<number>(0)
	const bytesSent = useRef<number>(0)
	const allBytes = useRef<number>(0)
	const progressStarted = useRef<number>(-1)
	const currentItems = useRef<ItemProps[]>([])
	const [erroredTransfers, setErroredTransfers] = useState<{ [key: string]: CurrentUpload }>({})

	const { currentUploads } = useTransfers({
		onUploadDone: upload => {
			const now: number = Date.now()

			setFinishedTransfers(prev => ({
				...prev,
				[upload.data.uuid]: {
					...upload.data,
					started: now,
					bytes: 0,
					percent: 0,
					lastTime: now,
					lastBps: 0,
					timeLeft: 0,
					timestamp: now,
					done: true
				}
			}))
		},
		onUploadStart: upload => {
			const now: number = Date.now()

			if (progressStarted.current == -1) {
				progressStarted.current = now
			} else {
				if (now < progressStarted.current) {
					progressStarted.current = now
				}
			}

			allBytes.current += upload.data.file.size
		},
		onUploadError: upload => {
			if (allBytes.current >= upload.data.file.size) {
				allBytes.current -= upload.data.file.size
			}

			setErroredTransfers(prev => ({
				...prev,
				[upload.data.uuid]: {
					file: upload.data.file,
					bytes: 0,
					lastBps: 0,
					lastTime: 0,
					percent: 0,
					started: 0,
					timeLeft: 0,
					timestamp: Date.now(),
					uuid: upload.data.uuid,
					done: false,
					errored: true
				}
			}))
		},
		onUploadProgress: progress => {
			bytesSent.current += progress.data.bytes
		},
		onTransferStopped: uuid => {
			let size: number = 0

			for (const prop in currentUploads) {
				if (currentUploads[prop].uuid == uuid) {
					size += currentUploads[prop].file.size
				}
			}

			if (allBytes.current >= size) {
				allBytes.current -= size
			}
		}
	})

	const updateStats = useCallback(
		throttle(() => {
			const now: number = Date.now()

			if (progressStarted.current > 0 && allBytes.current > 0 && bytesSent.current > 0) {
				const transferRemaining: number = calcTimeLeft(bytesSent.current, allBytes.current, progressStarted.current)
				const transferPercent: number = (bytesSent.current / allBytes.current) * 100
				const transferSpeed: number = calcSpeed(now, progressStarted.current, bytesSent.current)

				setRemaining(transferRemaining)
				setSpeed(transferSpeed)
				setPercent(isNaN(transferPercent) ? 0 : transferPercent >= 100 ? 100 : transferPercent)
			}
		}, 100),
		[]
	)

	useEffect(() => {
		currentItems.current = items
	}, [items])

	useEffect(() => {
		if (Object.keys(currentUploads).length <= 0) {
			bytesSent.current = 0
			progressStarted.current = -1
			allBytes.current = 0

			setRemaining(0)
			setSpeed(0)
			setPercent(0)

			eventListener.emit("transferRemaining", 0)
			eventListener.emit("transferPercent", 0)
			eventListener.emit("transferSpeed", 0)
		}
	}, [Object.keys(currentUploads).length])

	useEffect(() => {
		updateStats()
	}, [JSON.stringify(currentUploads)])

	useEffect(() => {
		const openUploadModalListener = eventListener.on(
			"openUploadModal",
			async ({ files = undefined, openModal = true }: { files?: UploadQueueItemFile[]; openModal?: boolean }) => {
				if (Array.isArray(files)) {
					const parent: string = getCurrentURLParentFolder()

					const addToQueue: UploadQueueItem[] = files.map(item => ({
						file: item,
						uuid: uuidv4(),
						bytes: 0
					}))

					const needsToCreateFolders: boolean = files.filter(file => file.fullPath.split("/").length >= 2).length > 0
					const existingFolderPaths: { [key: string]: string } = { ".": parent }

					if (needsToCreateFolders) {
						const createFolderToast = showToast("loading", i18n(lang, "creatingFolders"), "bottom", ONE_YEAR)

						let folderPathsToCreate: string[] = []

						for (let i = 0; i < addToQueue.length; i++) {
							if (addToQueue[i].file.fullPath.split("/").length >= 2) {
								const dirname: string = pathGetDirname(addToQueue[i].file.fullPath)

								if (!folderPathsToCreate.includes(dirname)) {
									folderPathsToCreate.push(dirname)
								}
							}
						}

						const possible: string[] = []

						for (let i = 0; i < folderPathsToCreate.length; i++) {
							const possiblePaths = getEveryPossibleFolderPathFromPath(folderPathsToCreate[i])

							for (let x = 0; x < possiblePaths.length; x++) {
								if (!folderPathsToCreate.includes(possiblePaths[x]) && !possible.includes(possiblePaths[x])) {
									possible.push(possiblePaths[x])
								}
							}
						}

						folderPathsToCreate = [...folderPathsToCreate, ...possible].sort(
							(a, b) => a.split("/").length - b.split("/").length
						)

						const predefinedFolderUUIDs: { [key: number]: string } = {}
						const createdFolders: ItemProps[] = []

						for (let i = 0; i < folderPathsToCreate.length; i++) {
							const uuid = uuidv4()

							predefinedFolderUUIDs[i] = uuid

							eventListener.emit("createFolder", {
								type: "start",
								data: {
									uuid,
									name: "",
									parent: ""
								}
							})
						}

						updateToast(
							createFolderToast,
							"loading",
							i18n(lang, "creatingFoldersProgress", true, ["__LEFT__"], [folderPathsToCreate.length.toString()]),
							ONE_YEAR
						)

						for (let i = 0; i < folderPathsToCreate.length; i++) {
							const parentPath: string = pathGetDirname(folderPathsToCreate[i])
							const newFolderName: string = pathGetBasename(folderPathsToCreate[i])
							const newFolderUUID: string = predefinedFolderUUIDs[i]

							if (typeof existingFolderPaths[parentPath] !== "string") {
								console.error("Could not find parent for path", parentPath)
								console.error({ existingFolderPaths, folderPathsToCreate })

								dismissToast(createFolderToast)

								return
							}

							try {
								eventListener.emit("createFolder", {
									type: "started",
									data: {
										uuid: newFolderUUID,
										name: newFolderName,
										parent: existingFolderPaths[parentPath]
									}
								})

								const createdFolderUUID: string = await createFolder({
									uuid: newFolderUUID,
									name: newFolderName,
									parent: existingFolderPaths[parentPath],
									emitEvents: false
								})

								await addFolderNameToDb(createdFolderUUID, newFolderName)

								existingFolderPaths[folderPathsToCreate[i]] = createdFolderUUID

								eventListener.emit("createFolder", {
									type: "done",
									data: {
										uuid: newFolderUUID,
										name: newFolderName,
										parent: existingFolderPaths[parentPath]
									}
								})

								const newFolderItem: ItemProps = {
									type: "folder",
									parent: existingFolderPaths[parentPath],
									uuid: createdFolderUUID,
									name: newFolderName,
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

								eventListener.emit("addFolder", {
									item: newFolderItem
								})

								createdFolders.push(newFolderItem)
							} catch (e: any) {
								console.error(e)

								eventListener.emit("createFolder", {
									type: "err",
									data: {
										uuid: newFolderUUID,
										name: newFolderName,
										parent: existingFolderPaths[parentPath]
									},
									err: e.toString()
								})

								dismissToast(createFolderToast)

								return
							}

							updateToast(
								createFolderToast,
								"loading",
								i18n(lang, "creatingFoldersProgress", true, ["__LEFT__"], [(folderPathsToCreate.length - i).toString()]),
								ONE_YEAR
							)
						}

						dismissToast(createFolderToast)
					}

					setOpen(openModal)

					for (let i = 0; i < addToQueue.length; i++) {
						if (addToQueue[i].file.fullPath.split("/").length >= 2 && needsToCreateFolders) {
							const dirname: string = pathGetDirname(addToQueue[i].file.fullPath)

							if (typeof existingFolderPaths[dirname] == "string") {
								queueFileUpload(addToQueue[i], existingFolderPaths[dirname]).catch(console.error)
							}
						} else {
							queueFileUpload(addToQueue[i], parent).catch(console.error)
						}
					}
				} else {
					setOpen(openModal)
				}
			}
		)

		return () => {
			openUploadModalListener.remove()
		}
	}, [])

	return (
		<Modal
			onClose={() => setOpen(false)}
			isOpen={open}
			isCentered={true}
			size={isMobile ? "xl" : "xl"}
		>
			<ModalOverlay backgroundColor="rgba(0, 0, 0, 0.4)" />
			<ModalContent
				backgroundColor={getColor(darkMode, "backgroundSecondary")}
				color={getColor(darkMode, "textSecondary")}
				borderRadius="10px"
				border={"1px solid " + getColor(darkMode, "borderPrimary")}
				height={windowHeight / 2 + "px"}
			>
				<ModalHeader color={getColor(darkMode, "textPrimary")}>{i18n(lang, "upload")}</ModalHeader>
				<ModalCloseButton darkMode={darkMode} />
				<ModalBody
					height="100%"
					width="100%"
					padding="0px"
					outline="none"
				>
					{Object.keys(currentUploads).length + Object.keys(finishedTransfers).length + Object.keys(erroredTransfers).length >
					0 ? (
						<UploadModalList
							darkMode={darkMode}
							isMobile={isMobile}
							lang={lang}
							currentUploads={[
								...Object.keys(currentUploads)
									.map(key => currentUploads[key])
									.sort((a, b) => (isNaN(b.percent) ? 0 : b.percent) - (isNaN(a.percent) ? 0 : a.percent)),
								...Object.keys(erroredTransfers)
									.map(key => erroredTransfers[key])
									.sort((a, b) => b.timestamp - a.timestamp),
								...Object.keys(finishedTransfers)
									.map(key => finishedTransfers[key])
									.sort((a, b) => b.timestamp - a.timestamp)
							]}
						/>
					) : (
						<Flex
							height="100%"
							width="100%"
							paddingLeft="25px"
							paddingRight="25px"
							outline="none"
						>
							<AppText
								darkMode={darkMode}
								isMobile={isMobile}
								noOfLines={1}
								fontSize={15}
								fontWeight="bold"
								color={getColor(darkMode, "textSecondary")}
							>
								{i18n(lang, "noUploadsQueued")}
							</AppText>
						</Flex>
					)}
				</ModalBody>
				<ModalFooter>
					<Flex
						width="100%"
						flexDirection="row"
						alignItems="center"
						justifyContent="space-between"
					>
						<SelectFromComputer
							darkMode={darkMode}
							isMobile={isMobile}
							lang={lang}
						/>
						<AppText
							darkMode={darkMode}
							isMobile={isMobile}
							noOfLines={1}
							wordBreak="break-all"
							color={getColor(darkMode, "textSecondary")}
							fontSize={14}
						>
							{Object.keys(currentUploads).length > 0 &&
								(() => {
									const remainingReadable = getTimeRemaining(Date.now() + remaining * 1000)

									if (remainingReadable.total <= 1 || remainingReadable.seconds <= 1) {
										remainingReadable.total = 1
										remainingReadable.days = 0
										remainingReadable.hours = 0
										remainingReadable.minutes = 0
										remainingReadable.seconds = 1
									}

									return (
										i18n(
											lang,
											"aboutRemaining",
											false,
											["__TIME__"],
											[
												(remainingReadable.days > 0 ? remainingReadable.days + "d " : "") +
													(remainingReadable.hours > 0 ? remainingReadable.hours + "h " : "") +
													(remainingReadable.minutes > 0 ? remainingReadable.minutes + "m " : "") +
													(remainingReadable.seconds > 0 ? remainingReadable.seconds + "s " : "")
											]
										) +
										", " +
										bpsToReadable(speed)
									)
								})()}
						</AppText>
					</Flex>
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
})

export default UploadModal
