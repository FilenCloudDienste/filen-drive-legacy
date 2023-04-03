import { useEffect, useState } from "react"

const useWindowScrollY = (): number => {
	const [y, setY] = useState<number>(0)

	useEffect(() => {
		setY(window.scrollY)

		const listener = (): void => setY(window.scrollY)

		window.addEventListener("scroll", listener)

		return () => {
			window.removeEventListener("scroll", listener)
		}
	}, [])

	return y
}

export default useWindowScrollY
