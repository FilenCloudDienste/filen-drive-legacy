import { UserInfo, UserGetSettings, UserGetAccount } from "../../../types"
import { userInfo, userSettings, userAccount } from "../../api"
import memoryCache from "../../memoryCache"

export const fetchUserInfo = async (): Promise<UserInfo> => {
	const info = await userInfo()

	return info
}

export const fetchUserInfoCached = (): UserInfo | undefined => {
	if (memoryCache.has("fetchUserInfo")) {
		return memoryCache.get("fetchUserInfo") as UserInfo
	}

	return undefined
}

export const fetchUserSettings = async (): Promise<UserGetSettings> => {
	const settings = await userSettings()

	return settings
}

export const fetchUserAccount = async (): Promise<UserGetAccount> => {
	const account = await userAccount()

	return account
}
