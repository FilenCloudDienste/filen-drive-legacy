import { memo, useMemo } from "react"
import { Button as ChakraButton } from "@chakra-ui/react"
import { AppButtonProps } from "../../types"
import { getColor } from "../../styles/colors"

const getButtonColors = (darkMode: boolean, colorMode: string | undefined) => {
    switch(colorMode){
        case "blue":
            return {
                color: "white",
                background: getColor(darkMode, "linkPrimary"),
                hover: getColor(darkMode, "linkPrimary"),
                active: getColor(darkMode, "linkPrimary"),
                focus: getColor(darkMode, "linkPrimary")
            }
        break
        default:
            return {
                color: getColor(darkMode, "textPrimary"),
                background: getColor(darkMode, "backgroundSecondary"),
                hover: getColor(darkMode, "backgroundSecondary"),
                active: getColor(darkMode, "backgroundSecondary"),
                focus: getColor(darkMode, "backgroundSecondary")
            }
        break
    }
}

const Button = memo(({ darkMode, isMobile, colorMode, ...baseProps }: AppButtonProps) => {
    const buttonColors = useMemo(() => {
        return getButtonColors(darkMode, colorMode)
    }, [colorMode, darkMode])

    return (
        <ChakraButton
            borderRadius="10px"
            backgroundColor={buttonColors.background}
            color={buttonColors.color}
            _hover={{
                backgroundColor: buttonColors.hover,
                color: buttonColors.color
            }}
            _active={{
                backgroundColor: buttonColors.active,
                color: buttonColors.color
            }}
            _focus={{
                backgroundColor: buttonColors.focus,
                color: buttonColors.color
            }}
            autoFocus={false}
            {...baseProps}
        />
    )
})

export default Button