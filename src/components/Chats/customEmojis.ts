export const customEmojis: {
	id: string
	name: string
	keywords: string[]
	skins: {
		src: string
	}[]
}[] = require("./customEmojis.json")

export const custom = [
	{
		id: "filen",
		name: "Filen",
		emojis: customEmojis
	}
]

export default custom
