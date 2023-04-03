import { useEffect, useState } from "react"
import Cookies from "../../cookies"

const useWindowWidth = (): number => {
	const [width, setWidth] = useState<number>(
		typeof Cookies.get("windowWidth") == "string" ? parseInt(Cookies.get("windowWidth") as string) : 1920
	)

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
