import { useEffect, useState } from "react"
import useWindowWidth from "../useWindowWidth"
import Cookies from "../../cookies"

const getInitialValue = () => {
	const value = Cookies.get("windowWidth")

	return typeof value === "string" ? (parseInt(value as string) <= 768 ? true : false) : false
}

const useIsMobile = (): boolean => {
	const [isMobile, setIsMobile] = useState<boolean>(getInitialValue())
	const windowWidth: number = useWindowWidth()

	useEffect(() => {
		setIsMobile(windowWidth <= 768)
	}, [windowWidth])

	return isMobile
}

export default useIsMobile
