const cacheMap = new Map()

export const has = (key: string): boolean => {
	return cacheMap.has(key)
}

export const get = (key: string): any => {
	if (cacheMap.has(key)) {
		return cacheMap.get(key)
	}

	return null
}

export const set = (key: string, value: any): void => {
	cacheMap.set(key, value)
}

export const remove = (key: string): void => {
	if (cacheMap.has(key)) {
		cacheMap.delete(key)
	}
}

export const cache = cacheMap

export default {
	has,
	get,
	set,
	remove,
	cache
}
