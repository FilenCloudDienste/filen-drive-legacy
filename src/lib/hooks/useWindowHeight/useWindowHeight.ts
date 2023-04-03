import { useEffect, useState } from "react"
import Cookies from "../../cookies"

const useWindowHeight = (): number => {
	const [height, setHeight] = useState<number>(
		typeof Cookies.get("windowHeight") == "string" ? parseInt(Cookies.get("windowHeight") as string) : 1080
	)

	useEffect(() => {
		setHeight(document.documentElement.clientHeight || window.innerHeight)

		const listener = (): void => {
			setHeight(document.documentElement.clientHeight || window.innerHeight)

			Cookies.set("windowHeight", (document.documentElement.clientHeight || window.innerHeight).toString())
		}

		window.addEventListener("resize", listener)

		return () => {
			window.removeEventListener("resize", listener)
		}
	}, [])

	return height
}

export default useWindowHeight
