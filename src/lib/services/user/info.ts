import { UserInfo, UserGetSettings, UserGetAccount } from "../../../types"
import { userInfo, userSettings, userAccount } from "../../api"
import memoryCache from "../../memoryCache"

export const fetchUserInfo = async (): Promise<UserInfo> => {
	if (memoryCache.has("fetchUserInfo") && memoryCache.has("fetchUserInfoTimeout")) {
		if (memoryCache.get("fetchUserInfoTimeout") > Date.now()) {
			return memoryCache.get("fetchUserInfo") as UserInfo
		}
	}

	const info = await userInfo()

	memoryCache.set("fetchUserInfo", info)
	memoryCache.set("fetchUserInfoTimeout", Date.now() + 1)

	return info
}

export const fetchUserInfoCached = (): UserInfo | undefined => {
	if (memoryCache.has("fetchUserInfo")) {
		return memoryCache.get("fetchUserInfo") as UserInfo
	}

	return undefined
}

export const fetchUserSettings = async (): Promise<UserGetSettings> => {
	if (memoryCache.has("fetchUserSettings") && memoryCache.has("fetchUserSettingsTimeout")) {
		if (memoryCache.get("fetchUserSettingsTimeout") > Date.now()) {
			return memoryCache.get("fetchUserSettings") as UserGetSettings
		}
	}

	const settings = await userSettings()

	memoryCache.set("fetchUserSettings", settings)
	memoryCache.set("fetchUserSettingsTimeout", Date.now() + 1)

	return settings
}

export const fetchUserAccount = async (): Promise<UserGetAccount> => {
	if (memoryCache.has("fetchUserAccount") && memoryCache.has("fetchUserAccountTimeout")) {
		if (memoryCache.get("fetchUserAccountTimeout") > Date.now()) {
			return memoryCache.get("fetchUserAccount") as UserGetAccount
		}
	}

	const account = await userAccount()

	memoryCache.set("fetchUserAccount", account)
	memoryCache.set("fetchUserAccountTimeout", Date.now() + 1)

	return account
}
