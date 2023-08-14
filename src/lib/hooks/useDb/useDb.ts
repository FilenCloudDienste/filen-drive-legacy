import { useEffect, useState } from "react"
import db from "../../db"
import eventListener from "../../eventListener"
import { StoreTypes } from "../../db/db"

const useDb = (key: string, defaultValue: any, storeType: StoreTypes = "normal"): [any, (value: any) => Promise<void>] => {
	const [value, setValue] = useState<any>(defaultValue)

	useEffect(() => {
		db.get(key, storeType)
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
	}, [])

	return [value, (value: any): Promise<void> => db.set(key, value, storeType).catch(console.error)]
}

export default useDb
