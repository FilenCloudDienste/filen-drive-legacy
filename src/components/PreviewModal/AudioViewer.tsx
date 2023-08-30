import { memo, useRef, useEffect } from "react"
import { ItemProps } from "../../types"
import { Spinner, Flex } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import db from "../../lib/db"
import { isBetween } from "../../lib/helpers"

export interface VideoViewerProps {
	darkMode: boolean
	isMobile: boolean
	windowHeight: number
	windowWidth: number
	currentItem: ItemProps
	audio: string
}

const AudioViewer = memo(({ darkMode, isMobile, windowHeight, windowWidth, currentItem, audio }: VideoViewerProps) => {
	const playerRef = useRef<HTMLAudioElement>(null)

	useEffect(() => {
		;(async () => {
			if (playerRef.current) {
				const vol = await db.get("audioViewerVolume")

				if (typeof vol == "number") {
					if (isBetween(0, 1, vol)) {
						playerRef.current.volume = vol
					} else {
						playerRef.current.volume = 0.1
					}
				} else {
					playerRef.current.volume = 0.1
				}
			}
		})()
	}, [])

	return (
		<Flex
			className="full-viewport"
			flexDirection="column"
			backgroundColor={getColor(darkMode, "backgroundPrimary")}
		>
			<Flex
				width={windowWidth}
				height="50px"
				flexDirection="row"
				alignItems="center"
				justifyContent="space-between"
				paddingLeft="15px"
				paddingRight="15px"
				backgroundColor={getColor(darkMode, "backgroundSecondary")}
				position="absolute"
				zIndex={100001}
				borderBottom={"1px solid " + getColor(darkMode, "borderPrimary")}
			>
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
				alignItems="center"
				justifyContent="center"
				marginTop="50px"
			>
				{audio.length > 0 ? (
					<audio
						autoPlay={true}
						controls={true}
						ref={playerRef}
						src={audio}
						onVolumeChange={() => {
							if (playerRef.current) {
								db.set("audioViewerVolume", playerRef.current.muted ? 0 : playerRef.current.volume).catch(console.error)
							}
						}}
						style={{
							borderRadius: "10px"
						}}
					/>
				) : (
					<Spinner
						width="64px"
						height="64px"
						color={getColor(darkMode, "textPrimary")}
					/>
				)}
			</Flex>
		</Flex>
	)
})

export default AudioViewer
