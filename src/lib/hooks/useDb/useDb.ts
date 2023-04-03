import { useEffect, useState } from "react"
import db from "../../db"
import eventListener from "../../eventListener"

const useDb = (key: string, defaultValue: any): [any, (value: any) => Promise<void>] => {
	const [value, setValue] = useState<any>(defaultValue)

	useEffect(() => {
		db.get(key)
			.then(value => {
				if (typeof value !== "undefined" && value !== null) {
					setValue(value)
				}
			})
			.catch(console.error)

		const setListener = eventListener.on("dbSet", (data: { key: string; value: string }) => {
			if (data.key !== key) {
				return false
			}

			setValue(data.value)
		})

		const removeListener = eventListener.on("dbRemove", (data: { key: string }) => {
			if (data.key !== key) {
				return false
			}

			setValue(null)
		})

		const clearListener = eventListener.on("dbClear", () => {
			setValue(null)
		})

		return () => {
			setListener.remove()
			removeListener.remove()
			clearListener.remove()
		}
	}, [key])

	return [value, (value: any): Promise<void> => db.set(key, value)]
}

export default useDb
