import { useEffect, useState } from "react"
import Cookies from "../../cookies"

const getInitialValue = () => {
	const value = Cookies.get("windowWidth")

	return typeof value === "string" ? parseInt(value as string) : 1920
}

const useWindowWidth = (): number => {
	const [width, setWidth] = useState<number>(getInitialValue())

	useEffect(() => {
		setWidth(document.documentElement.clientWidth || window.innerWidth)

		const listener = (): void => {
			setWidth(document.documentElement.clientWidth || window.innerWidth)

			Cookies.set("windowWidth", (document.documentElement.clientWidth || window.innerWidth).toString())
		}

		window.addEventListener("resize", listener)

		return () => {
			window.removeEventListener("resize", listener)
		}
	}, [])

	return width
}

export default useWindowWidth
