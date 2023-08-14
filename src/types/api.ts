import { FolderColors } from "./types"

export interface UserInfo {
	id: number
	email: string
	isPremium: number
	maxStorage: number
	storageUsed: number
	avatarURL: string
}

export interface FileVersions {
	bucket: string
	chunks: number
	metadata: string
	region: string
	rm: string
	timestamp: number
	uuid: string
	version: number
}

export interface UserGetSettings {
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

export interface UserGetAccountPlan {
	cost: number
	endTimestamp: number
	id: number
	lengthType: string
	name: string
	storage: number
}

export interface UserGetSubsInvoices {
	gateway: string
	id: string
	planCost: number
	planName: string
	subId: string
	timestamp: number
}

export interface UserGetAccountSubs {
	id: string
	planId: number
	planName: string
	planCost: number
	gateway: string
	storage: number
	activated: number
	cancelled: number
	startTimestamp: number
	cancelTimestamp: number
}

export interface UserGetAccount {
	affBalance: number
	affCount: number
	affEarnings: number
	affId: string
	affRate: number
	avatarURL: string
	email: string
	invoices: any
	isPremium: 0 | 1
	maxStorage: number
	personal: {
		city: string | null
		companyName: string | null
		country: string | null
		firstName: string | null
		lastName: string | null
		postalCode: string | null
		street: string | null
		streetNumber: string | null
		vatId: string | null
	}
	plans: UserGetAccountPlan[]
	refId: string
	refLimit: number
	refStorage: number
	referCount: number
	referStorage: number
	storage: number
	nickName: string
	subs: UserGetAccountSubs[]
	subsInvoices: UserGetSubsInvoices[]
}

export interface LinkGetInfo {
	bucket: string
	chunks: number
	downloadBtn: boolean
	mime: string
	name: string
	password: string | null
	region: string
	size: string
	timestamp: number
	uuid: string
	version: number
}

export interface LinkHasPassword {
	hasPassword: boolean
	salt: string
}

export interface LinkDirInfo {
	parent: string
	metadata: string
	hasPassword: boolean
	salt: string
	timestamp: number
}

export interface LinkDirContent {
	folders: {
		color: FolderColors
		metadata: string
		parent: string
		timestamp: number
		uuid: string
	}[]
	files: {
		bucket: string
		chunks: number
		metadata: string
		parent: string
		region: string
		size: number
		timestamp: number
		uuid: string
		version: number
	}[]
}
