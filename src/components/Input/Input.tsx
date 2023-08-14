import { memo, forwardRef } from "react"
import { Input as ChakraInput } from "@chakra-ui/react"
import { InputProps } from "../../types"
import { getColor } from "../../styles/colors"

const Input = memo(
	forwardRef<any, InputProps>((props, ref) => {
		const { darkMode, isMobile, ...baseProps } = props

		return (
			<ChakraInput
				ref={ref}
				color={getColor(darkMode, "textPrimary")}
				border={"1px solid " + getColor(darkMode, "borderPrimary") + " !important"}
				shadow="none"
				outline="none"
				borderRadius="10px"
				_placeholder={{
					color: "gray",
					shadow: "none",
					outline: "none"
				}}
				_hover={{
					//border: "1px solid " + getColor(darkMode, "borderActive") + " !important",
					shadow: "none",
					outline: "none"
				}}
				_active={{
					//border: "1px solid " + getColor(darkMode, "borderActive") + " !important",
					shadow: "none",
					outline: "none"
				}}
				_focus={{
					//border: "1px solid " + getColor(darkMode, "borderActive") + " !important",
					shadow: "none",
					outline: "none"
				}}
				_highlighted={{
					//border: "1px solid " + getColor(darkMode, "borderActive") + " !important",
					shadow: "none",
					outline: "none"
				}}
				{...baseProps}
			/>
		)
	})
)

export default Input
