import db from "../../db"
import type { ItemProps } from "../../../types"
import { Semaphore } from "../../helpers"

const addSemaphore = new Semaphore(1)
const addedToDb: { [key: string]: boolean } = {}
let inDb: ItemProps[] = []

export const addToSearchItems = async (items: ItemProps[]): Promise<boolean> => {
	return true

	await addSemaphore.acquire()

	const toAdd: ItemProps[] = []

	for (let i = 0; i < items.length; i++) {
		if (!addedToDb[items[i].uuid]) {
			toAdd.push(items[i])
		}
	}

	if (toAdd.length == 0) {
		addSemaphore.release()

		return true
	}

	try {
		let searchItems: ItemProps[] = inDb

		if (searchItems.length == 0) {
			searchItems = await db.get("searchItems", "metadata")

			if (!searchItems) {
				searchItems = []
			}

			inDb = searchItems
		}

		const includes: string[] = searchItems.map(item => item.uuid)
		const add: ItemProps[] = toAdd.filter(item => !includes.includes(item.uuid))

		if (add.length > 0) {
			inDb = [...searchItems, ...add]

			for (let i = 0; i < add.length; i++) {
				addedToDb[add[i].uuid] = true
			}

			await db.set("searchItems", inDb, "metadata")
		}
	} catch (e) {
		console.error(e)
	}

	addSemaphore.release()

	return true
}

export const searchByName = async (name: string): Promise<ItemProps[]> => {
	return []

	try {
		let searchItems: ItemProps[] = await db.get("searchItems", "metadata")

		if (!searchItems) {
			searchItems = []
		}

		return searchItems.filter(item => item.name.toLowerCase().trim().indexOf(name.toLowerCase().trim()) !== -1)
	} catch (e) {
		console.error(e)
	}

	return []
}
