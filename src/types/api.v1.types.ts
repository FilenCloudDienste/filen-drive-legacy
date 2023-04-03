import type { FolderColors } from "./types"

export interface UserInfoV1 {
	id: number
	email: string
	isPremium: number
	maxStorage: number
	storageUsed: number
	avatarURL: string
}

export interface FileVersionsV1 {
	bucket: string
	chunks: number
	metadata: string
	region: string
	rm: string
	timestamp: number
	uuid: string
	version: number
}

export interface UserGetSettingsV1 {
	email: string
	storageUsed: number
	twoFactorEnabled: 0 | 1
	twoFactorKey: string
	unfinishedFiles: number
	unfinishedStorage: number
	versionedFiles: number
	versionedStorage: number
}

export interface UserGetAccountPlanV1 {
	cost: number
	endTimestamp: number
	id: number
	lengthType: string
	name: string
	storage: number
}

export interface UserGetSubsInvoicesV1 {
	gateway: string
	id: string
	planCost: number
	planName: string
	subId: string
	timestamp: number
}

export interface UserGetAccountSubsV1 {
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

export interface UserGetAccountV1 {
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
	plans: UserGetAccountPlanV1[]
	refId: string
	refLimit: number
	refStorage: number
	referCount: number
	referStorage: number
	storage: number
	subs: UserGetAccountSubsV1[]
	subsInvoices: UserGetSubsInvoicesV1[]
}

export interface LinkGetInfoV1 {
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

export interface LinkHasPasswordV1 {
	hasPassword: boolean
	salt: string
}

export interface LinkDirInfoV1 {
	parent: string
	metadata: string
	hasPassword: boolean
	salt: string
	timestamp: number
}

export interface LinkDirContentV1 {
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
