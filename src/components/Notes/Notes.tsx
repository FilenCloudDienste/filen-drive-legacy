import { memo } from "react"
import { Flex } from "@chakra-ui/react"

export interface NotesProps {
	darkMode: boolean
	isMobile: boolean
	windowHeight: number
	windowWidth: number
	sidebarWidth: number
	lang: string
}

const Notes = memo(({ darkMode, isMobile, windowHeight, windowWidth, sidebarWidth, lang }: NotesProps) => {
	return <Flex flexDirection="row"></Flex>
})

export default Notes
