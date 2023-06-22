import { memo } from "react"
import { Flex, Skeleton } from "@chakra-ui/react"
import useIsMobile from "../../lib/hooks/useIsMobile"
import useDarkMode from "../../lib/hooks/useDarkMode"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import { Note as INote } from "../../lib/api"
import { randomStringUnsafe, getRandomArbitrary } from "../../lib/helpers"
import { NotesSizes } from "./Notes"
import Title from "./Title"
import { AiOutlineSync, AiOutlineCheckCircle } from "react-icons/ai"

export const Topbar = memo(
	({
		sizes,
		currentNote,
		setNotes,
		synced,
		setSynced
	}: {
		sizes: NotesSizes
		currentNote: INote | undefined
		setNotes: React.Dispatch<React.SetStateAction<INote[]>>
		synced: { title: boolean; content: boolean }
		setSynced: React.Dispatch<React.SetStateAction<{ title: boolean; content: boolean }>>
	}) => {
		const darkMode = useDarkMode()
		const isMobile = useIsMobile()

		return (
			<Flex
				width={sizes.note + "px"}
				height="50px"
				flexDirection="row"
				borderBottom={"1px solid " + getColor(darkMode, "borderPrimary")}
				alignItems="center"
				paddingLeft="15px"
				paddingRight="15px"
				justifyContent="space-between"
			>
				<Flex
					flex={1}
					flexDirection="row"
					justifyContent="flex-start"
				>
					{currentNote ? (
						<Title
							currentNote={currentNote}
							setNotes={setNotes}
							setSynced={setSynced}
						/>
					) : (
						<Skeleton
							startColor={getColor(darkMode, "backgroundSecondary")}
							endColor={getColor(darkMode, "backgroundTertiary")}
							borderRadius="10px"
							height="20px"
							boxShadow="sm"
						>
							<AppText
								darkMode={darkMode}
								isMobile={isMobile}
								noOfLines={1}
								wordBreak="break-all"
								color={getColor(darkMode, "textPrimary")}
								fontSize={16}
							>
								{randomStringUnsafe(getRandomArbitrary(10, 50))}
							</AppText>
						</Skeleton>
					)}
				</Flex>
				<Flex
					flex={1}
					flexDirection="row"
					justifyContent="flex-end"
				>
					{synced.content && synced.title ? (
						<AiOutlineCheckCircle
							size={24}
							color={getColor(darkMode, "green")}
							style={{
								flexShrink: 0
							}}
						/>
					) : (
						<AiOutlineSync
							className="icon-spin"
							size={24}
							color={getColor(darkMode, "textPrimary")}
							style={{
								flexShrink: 0
							}}
						/>
					)}
				</Flex>
			</Flex>
		)
	}
)

export default Topbar
