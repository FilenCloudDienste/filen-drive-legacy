import type { UserInfoV1, UserGetSettingsV1, UserGetAccountV1 } from "../../../types"
import { userInfo, userSettings, userAccount } from "../../api"
import memoryCache from "../../memoryCache"

export const fetchUserInfo = async (): Promise<UserInfoV1> => {
	if (memoryCache.has("fetchUserInfo") && memoryCache.has("fetchUserInfoTimeout")) {
		if (memoryCache.get("fetchUserInfoTimeout") > new Date().getTime()) {
			return memoryCache.get("fetchUserInfo") as UserInfoV1
		}
	}

	const info = await userInfo()

	memoryCache.set("fetchUserInfo", info)
	memoryCache.set("fetchUserInfoTimeout", new Date().getTime() + 1)

	return info
}

export const fetchUserInfoCached = (): UserInfoV1 | undefined => {
	if (memoryCache.has("fetchUserInfo")) {
		return memoryCache.get("fetchUserInfo") as UserInfoV1
	}

	return undefined
}

export const fetchUserSettings = async (): Promise<UserGetSettingsV1> => {
	if (memoryCache.has("fetchUserSettings") && memoryCache.has("fetchUserSettingsTimeout")) {
		if (memoryCache.get("fetchUserSettingsTimeout") > new Date().getTime()) {
			return memoryCache.get("fetchUserSettings") as UserGetSettingsV1
		}
	}

	const settings = await userSettings()

	memoryCache.set("fetchUserSettings", settings)
	memoryCache.set("fetchUserSettingsTimeout", new Date().getTime() + 1)

	return settings
}

export const fetchUserAccount = async (): Promise<UserGetAccountV1> => {
	if (memoryCache.has("fetchUserAccount") && memoryCache.has("fetchUserAccountTimeout")) {
		if (memoryCache.get("fetchUserAccountTimeout") > new Date().getTime()) {
			return memoryCache.get("fetchUserAccount") as UserGetAccountV1
		}
	}

	const account = await userAccount()

	memoryCache.set("fetchUserAccount", account)
	memoryCache.set("fetchUserAccountTimeout", new Date().getTime() + 1)

	return account
}
