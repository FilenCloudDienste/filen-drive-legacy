import { Text } from "@chakra-ui/react"
import { memo } from "react"
import { AppTextProps } from "../../types"
import { getColor } from "../../styles/colors"

const AppText = memo((props: AppTextProps) => {
	const { darkMode, isMobile, fontWeight, ...baseProps } = props

	return (
		<Text
			fontFamily="Inter, sans-serif"
			color={getColor(darkMode, "textPrimary")}
			userSelect="none"
			{...baseProps}
		>
			{props.children}
		</Text>
	)
})

export default AppText
