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
