import { ChatMessage, ChatConversationParticipant, chatConversations, ChatConversation, chatMessages } from "../../lib/api"
import { UserGetAccount } from "../../types"
import db from "../../lib/db"
import { decryptChatMessage } from "../../lib/worker/worker.com"
import { validate } from "uuid"
import { MessageDisplayType } from "./Container"
import regexifyString from "regexify-string"
import EMOJI_REGEX from "emojibase-regex"
import { Emoji } from "emoji-mart"
import { useEffect, createElement, memo, useRef } from "react"
import { getColor } from "../../styles/colors"
import { Link } from "@chakra-ui/react"
import { customEmojis } from "./customEmojis"

const customEmojisList = customEmojis.map(emoji => emoji.id)

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

		await db.set("chatMessages:" + conversationUUID, messagesDecrypted.slice(-100), "chats")

		return {
			messages: messagesDecrypted,
			cache: false
		}
	}

	if (skipCache) {
		return await refresh()
	}

	const cache = await db.get("chatMessages:" + conversationUUID, "chats")

	if (cache) {
		return {
			cache: true,
			messages: cache
		}
	}

	return await refresh()
}

export const parseYouTubeVideoId = (url: string): string | null => {
	const regExp = /(?:\?v=|\/embed\/|\/watch\?v=|\/\w+\/\w+\/|youtu.be\/)([\w-]{11})/
	const match = url.match(regExp)

	if (match && match.length === 2) {
		return match[1]
	}

	return null
}

export const parseFilenPublicLink = (url: string) => {
	const ex = url.split("/")
	const uuid = ex.map(part => part.split("#")[0].trim()).filter(part => validate(part))
	const keyEx = url.split("#")

	return {
		uuid: uuid.length > 0 ? uuid[0] : "",
		key: url.indexOf("#") !== -1 ? keyEx[1].trim() : ""
	}
}

export const extractLinksFromString = (input: string): string[] => {
	const urlRegex =
		/(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi

	const matches = input.match(urlRegex)

	return matches || []
}

export const isMessageLink = (message: string) => {
	if (message.split(" ").length >= 2 || message.split("\n").length >= 2) {
		return false
	}

	const trimmed = message.trim()

	if (trimmed.indexOf("/localhost:") !== -1) {
		return true
	}

	const urlRegex =
		/(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi

	return urlRegex.test(trimmed)
}

export const getMessageDisplayType = (message: string): MessageDisplayType => {
	const isLink = isMessageLink(message)

	if (!isLink) {
		return "none"
	}

	if (
		message.indexOf("/youtube.com/watch") !== -1 ||
		message.indexOf("/youtube.com/embed") !== -1 ||
		message.indexOf("/www.youtube.com/watch") !== -1 ||
		message.indexOf("/www.youtube.com/embed") !== -1 ||
		message.indexOf("/youtu.be/") !== -1 ||
		message.indexOf("/www.youtu.be/") !== -1
	) {
		return "youtubeEmbed"
	} else if (
		(message.indexOf("/localhost:") !== -1 ||
			message.indexOf("/filen.io/") !== -1 ||
			message.indexOf("/drive.filen.io/") !== -1 ||
			message.indexOf("/www.filen.io/") !== -1) &&
		message.indexOf("/d/") !== -1
	) {
		return "filenEmbed"
	} else if (
		(message.indexOf("/www.twitter.com/") !== -1 || message.indexOf("/twitter.com/") !== -1) &&
		message.indexOf("/status/") !== -1
	) {
		return "twitterEmbed"
	}

	return "async"
}

// dirty because emoji-mart's Emoji component does not support react yet
export const EmojiElement = memo(
	(props: { shortcodes?: string; native?: string; fallback?: string; size: string; style?: React.CSSProperties }) => {
		const ref = useRef<HTMLSpanElement>(null)
		const instance = useRef<any>(null)

		if (instance.current) {
			instance.current.update(props)
		}

		useEffect(() => {
			instance.current = new Emoji({ ...props, ref })

			return () => {
				instance.current = null
			}
		}, [])

		return createElement("span", {
			ref,
			style: props.style
		})
	}
)

export const ReplaceMessageWithComponents = memo(({ content, darkMode }: { content: string; darkMode: boolean }) => {
	const lineBreakRegex = /\n/
	const codeRegex = /```([\s\S]*?)```/
	const linkRegex = /(https?:\/\/\S+)/
	const emojiRegexWithSkinTones = /:[\d+_a-z-]+(?:::skin-tone-\d+)?:/
	const emojiRegex = new RegExp(`${EMOJI_REGEX.source}|${emojiRegexWithSkinTones.source}`)
	const regex = new RegExp(
		`${EMOJI_REGEX.source}|${emojiRegexWithSkinTones.source}|${codeRegex.source}|${lineBreakRegex.source}|${linkRegex.source}`
	)
	const emojiCount = content.match(emojiRegex)

	let size: number | undefined = 34

	if (emojiCount) {
		const emojiCountJoined = emojiCount.join("")

		if (emojiCountJoined.length !== content.length) {
			size = 22
		}
	}

	const replaced = regexifyString({
		pattern: regex,
		decorator: (match, index) => {
			if (match.split("```").length >= 3) {
				const code = match.split("```").join("")

				return (
					<div
						key={index}
						style={{
							paddingTop: "5px",
							paddingBottom: "5px"
						}}
					>
						<pre
							style={{
								maxWidth: "100%",
								whiteSpace: "pre-wrap",
								overflow: "hidden",
								margin: "0px",
								textIndent: 0,
								backgroundColor: getColor(darkMode, "backgroundTertiary"),
								borderRadius: "5px",
								paddingLeft: "10px",
								paddingRight: "10px",
								paddingBottom: "10px",
								paddingTop: "10px",
								fontWeight: "bold",
								color: getColor(darkMode, "textSecondary"),
								border: "1px solid " + getColor(darkMode, "borderPrimary")
							}}
						>
							<code
								style={{
									maxWidth: "100%",
									whiteSpace: "pre-wrap",
									overflow: "hidden",
									margin: "0px"
								}}
							>
								{code.startsWith("\n") ? code.slice(1, code.length) : code}
							</code>
						</pre>
					</div>
				)
			}

			if (linkRegex.test(match) && (match.startsWith("https://") || match.startsWith("http://"))) {
				return (
					<Link
						key={index}
						color={getColor(darkMode, "linkPrimary")}
						cursor="pointer"
						href={match}
						target="_blank"
						rel="noreferrer"
						_hover={{
							textDecoration: "underline"
						}}
						className="user-select-text"
						userSelect="text"
						onContextMenu={e => e.stopPropagation()}
					>
						{match}
					</Link>
				)
			}

			if (match.indexOf("\n") !== -1) {
				return (
					<div
						key={index}
						style={{
							height: "8px"
						}}
					>
						<br />
					</div>
				)
			}

			if (customEmojisList.includes(match.split(":").join("").trim())) {
				return (
					<span
						key={index}
						title={match.indexOf(":") !== -1 ? match : undefined}
					>
						<EmojiElement
							fallback={match}
							shortcodes={match.indexOf(":") !== -1 ? match : undefined}
							size={size + "px"}
						/>
					</span>
				)
			}

			return (
				<span
					key={index}
					title={match.indexOf(":") !== -1 ? match : undefined}
				>
					<EmojiElement
						fallback={match}
						shortcodes={match.indexOf(":") !== -1 ? match : undefined}
						native={match.indexOf(":") === -1 ? match : undefined}
						size={size + "px"}
					/>
				</span>
			)
		},
		input: content
	})

	return <>{replaced}</>
})

export const parseTwitterStatusIdFromURL = (url: string) => {
	const ex = url.split("/")

	return ex[ex.length - 1].trim()
}
