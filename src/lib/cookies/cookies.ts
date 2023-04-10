import Cookies from "js-cookie"
import eventListener from "../eventListener"

export const set = (key: string, value: string, opts: { domain: string | undefined } | undefined = undefined): boolean => {
	try {
		Cookies.set(key, value, {
			expires: new Date(Date.now() + 86400000 * 365),
			domain: process.env.NODE_ENV == "development" ? undefined : ".filen.io"
		})

		eventListener.emit("cookiesSet", {
			key,
			value
		})
	} catch (e) {
		console.error(e)

		return false
	}

	return true
}

export const get = (key: string): string | null => {
	const value = Cookies.get(key)

	if (typeof value !== "string") {
		return null
	}

	return value
}

export const remove = (key: string): boolean => {
	try {
		Cookies.remove(key, {
			domain: process.env.NODE_ENV == "development" ? undefined : ".filen.io"
		})

		eventListener.emit("cookiesRemove", {
			key
		})
	} catch (e) {
		console.error(e)

		return false
	}

	return true
}

export default {
	set,
	get,
	remove
}
