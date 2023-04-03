import type { ItemProps } from "../../../types"
import { restoreItem } from "../../api"
import { show as showToast, dismiss as dismissToast } from "../../../components/Toast/Toast"
import eventListener from "../../eventListener"
import { ONE_YEAR } from "../../constants"
import { i18n } from "../../../i18n"
import { getLang } from "../../helpers"
import { addItemsToStore, removeItemsFromStore } from "../metadata"

export const restoreFromTrash = async (items: ItemProps[]): Promise<void> => {
	const lang: string = getLang()

	const toastId = showToast(
		"loading",
		i18n(lang, "restoringItems", true, ["__COUNT__"], [items.length.toString()]),
		"bottom",
		ONE_YEAR
	)

	const promises = []
	const restored: ItemProps[] = []
	const restoredUUIDs: string[] = []

	for (let i = 0; i < items.length; i++) {
		promises.push(
			new Promise((resolve, reject) => {
				restoreItem(items[i])
					.then(() => {
						restored.push(items[i])
						restoredUUIDs.push(items[i].uuid)

						return resolve(items[i])
					})
					.catch(err => {
						return reject({
							err,
							item: items[i]
						})
					})
			})
		)
	}

	const results = await Promise.allSettled(promises)
	const error = results.filter(result => result.status == "rejected") as {
		status: string
		reason: { err: Error; item: ItemProps }
	}[]

	if (error.length > 0) {
		for (let i = 0; i < error.length; i++) {
			showToast(
				"error",
				i18n(
					lang,
					"couldNotRestoreItem",
					true,
					["__NAME__", "__ERR__"],
					[error[i].reason.item.name, error[i].reason.err.toString()]
				),
				"bottom",
				5000
			)
		}
	}

	if (restored.length > 0) {
		for (let i = 0; i < restored.length; i++) {
			eventListener.emit("itemRestored", {
				item: restored[i]
			})
		}

		for (let i = 0; i < restored.length; i++) {
			removeItemsFromStore([restored[i]], "trash").catch(console.error)
			addItemsToStore([restored[i]], restored[i].parent).catch(console.error)
		}
	}

	dismissToast(toastId)
}
