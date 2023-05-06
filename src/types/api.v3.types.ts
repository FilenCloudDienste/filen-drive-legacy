export interface UserGetSettingsV3 {
	email: string
	storageUsed: number
	twoFactorEnabled: 0 | 1
	twoFactorKey: string
	unfinishedFiles: number
	unfinishedStorage: number
	versionedFiles: number
	versionedStorage: number
	versioningEnabled: boolean
	loginAlertsEnabled: boolean
}
