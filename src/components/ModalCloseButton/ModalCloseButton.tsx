import { memo } from "react"
import { getColor } from "../../styles/colors"
import { ModalCloseButton as ChakraModalCloseButton } from "@chakra-ui/react"

const ModalCloseButton = memo(({ darkMode }: { darkMode: boolean }) => {
	return (
		<ChakraModalCloseButton
			color={darkMode ? getColor(darkMode, "textSecondary") : "black"}
			backgroundColor={getColor(darkMode, "backgroundTertiary")}
			_hover={{
				color: darkMode ? getColor(darkMode, "textPrimary") : "black",
				backgroundColor: darkMode ? getColor(darkMode, "backgroundPrimary") : "lightgray"
			}}
			autoFocus={false}
			tabIndex={-1}
			borderRadius="full"
			zIndex={1000001}
		/>
	)
})

export default ModalCloseButton
