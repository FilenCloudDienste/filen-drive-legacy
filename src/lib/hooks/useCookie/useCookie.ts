import { useEffect, useState } from "react"
import Cookies from "../../cookies"
import eventListener from "../../eventListener"

const useCookie = (key: string): [string | null, (key: string) => boolean] => {
	const [cookie, setCookie] = useState<string | null>(Cookies.get(key))

	const set = (value: string): boolean => {
		Cookies.set(key, value)

		return true
	}

	useEffect(() => {
		const setListener = eventListener.on("cookiesSet", (data: { key: string; value: string }) => {
			if (data.key !== key) {
				return false
			}

			setCookie(data.value)
		})

		const removeListener = eventListener.on("cookiesRemove", (data: { key: string }) => {
			if (data.key !== key) {
				return false
			}

			setCookie(null)
		})

		return () => {
			setListener.remove()
			removeListener.remove()
		}
	}, [])

	return [cookie, set]
}

export default useCookie
