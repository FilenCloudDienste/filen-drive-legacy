import { ChatMessage, ChatConversationParticipant, chatConversations, ChatConversation, chatMessages } from "../../lib/api"
import { UserGetAccount } from "../../types"
import db from "../../lib/db"
import { decryptChatMessage } from "../../lib/worker/worker.com"

export const getUserNameFromMessage = (message: ChatMessage): string => {
	return message.senderNickName.length > 0 ? message.senderNickName : message.senderEmail
}

export const getUserNameFromParticipant = (participant: ChatConversationParticipant): string => {
	return participant.nickName.length > 0 ? participant.nickName : participant.email
}

export const getUserNameFromAccount = (account: UserGetAccount): string => {
	return account.nickName.length > 0 ? account.nickName : account.email
}

export const formatDate = (date: Date): string => {
	return date.toLocaleDateString(window.navigator.language, { year: "numeric", month: "2-digit", day: "2-digit" })
}

export const formatTime = (date: Date): string => {
	return date.toLocaleTimeString(window.navigator.language, { hour: "2-digit", minute: "2-digit" })
}

export const formatMessageDate = (timestamp: number, lang: string = "en"): string => {
	const now = Date.now()
	const diff = now - timestamp
	const seconds = Math.floor(diff / 1000)

	if (seconds <= 0) {
		return "now"
	} else if (seconds < 60) {
		return `${seconds} seconds ago`
	} else if (seconds < 3600) {
		const minutes = Math.floor(seconds / 60)

		return `${minutes} minute${minutes > 1 ? "s" : ""} ago`
	} else if (seconds < 86400 / 2) {
		const hours = Math.floor(seconds / 3600)

		return `${hours} hour${hours > 1 ? "s" : ""} ago`
	} else if (seconds < 86400) {
		const date = new Date(timestamp)

		return `Today at ${formatTime(date)}`
	} else if (seconds > 86400 && seconds < 86400 * 2) {
		const date = new Date(timestamp)

		return `Yesterday at ${formatTime(date)}`
	} else {
		const date = new Date(timestamp)

		return `${formatDate(date)} ${formatTime(date)}`
	}
}

export const isTimestampSameDay = (timestamp1: number, timestamp2: number) => {
	const dayInMilliseconds = 24 * 60 * 60 * 1000

	const startOfDay1 = Math.floor(timestamp1 / dayInMilliseconds)
	const startOfDay2 = Math.floor(timestamp2 / dayInMilliseconds)

	return startOfDay1 === startOfDay2
}

export interface FetchChatConversationsResult {
	cache: boolean
	conversations: ChatConversation[]
}

export const fetchChatConversations = async (
	timestamp: number = Date.now() + 3600000,
	skipCache: boolean = false
): Promise<FetchChatConversationsResult> => {
	const refresh = async (): Promise<FetchChatConversationsResult> => {
		const result = await chatConversations(timestamp)

		await db.set("chatConversations", result, "chats")

		return {
			conversations: result,
			cache: false
		}
	}

	if (skipCache) {
		return await refresh()
	}

	const cache = await db.get("chatConversations", "chats")

	if (cache) {
		return {
			cache: true,
			conversations: cache
		}
	}

	return await refresh()
}

export interface FetchChatMessagesResult {
	cache: boolean
	messages: ChatMessage[]
}

export const fetchChatMessages = async (
	conversationUUID: string,
	metadata: string,
	timestamp: number = Date.now() + 3600000,
	skipCache: boolean = false
): Promise<FetchChatMessagesResult> => {
	const refresh = async (): Promise<FetchChatMessagesResult> => {
		const messagesDecrypted: ChatMessage[] = []
		const [result, privateKey] = await Promise.all([chatMessages(conversationUUID, timestamp), db.get("privateKey")])

		for (const message of result) {
			const messageDecrypted = await decryptChatMessage(message.message, metadata, privateKey)

			if (messageDecrypted.length === 0) {
				continue
			}

			messagesDecrypted.push({
				...message,
				message: messageDecrypted
			})
		}

		if (timestamp >= Date.now()) {
			await db.set("chatMessages:" + conversationUUID, messagesDecrypted.slice(-100), "chats")
		}

		return {
			messages: messagesDecrypted,
			cache: false
		}
	}

	if (skipCache) {
		return await refresh()
	}

	if (timestamp >= Date.now()) {
		const cache = await db.get("chatMessages:" + conversationUUID, "chats")

		if (cache) {
			return {
				cache: true,
				messages: cache
			}
		}
	}

	return await refresh()
}
