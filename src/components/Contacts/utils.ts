import { Contact, ContactRequest, BlockedContact, contacts, contactsBlocked, contactsRequestsIn, contactsRequestsOut } from "../../lib/api"
import db from "../../lib/db"

export const getTabIndex = (tab: string): number => {
	switch (tab) {
		case "contacts":
		case "contacts/online":
			return 0
		case "contacts/all":
			return 1
		case "contacts/offline":
			return 2
		case "contacts/pending":
			return 3
		case "contacts/requests":
			return 3
		case "contacts/blocked":
			return 4
		default:
			return 0
	}
}

export interface FetchContactsResult {
	cache: boolean
	contacts: Contact[]
	requestsOut: ContactRequest[]
	requestsIn: ContactRequest[]
	blocked: BlockedContact[]
}

export const fetchContacts = async (skipCache: boolean = false): Promise<FetchContactsResult> => {
	const refresh = async (): Promise<FetchContactsResult> => {
		const result = await Promise.all([contacts(), contactsRequestsOut(), contactsRequestsIn(), contactsBlocked()])
		const obj = {
			contacts: result[0],
			requestsOut: result[1],
			requestsIn: result[2],
			blocked: result[3]
		}

		await db.set("contacts", obj, "contacts")

		return {
			...obj,
			cache: false
		}
	}

	if (skipCache) {
		return await refresh()
	}

	const cache = await db.get("contacts", "contacts")

	if (cache) {
		return {
			cache: true,
			...cache
		}
	}

	return await refresh()
}
