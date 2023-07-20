import { useEffect, useState } from "react"
import Cookies from "../../cookies"

const getInitialValue = () => {
	const value = Cookies.get("windowHeight")

	return typeof value === "string" ? parseInt(value as string) : 1080
}

const useWindowHeight = (): number => {
	const [height, setHeight] = useState<number>(getInitialValue())

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
