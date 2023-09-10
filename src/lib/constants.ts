export const DB_VERSION = 1
export const USE_MEMORY_CACHE = true
export const GRID_CELL_HEIGHT = 200
export const GRID_CELL_WIDTH = 200
export const LIST_ITEM_HEIGHT = 36
export const MAX_CONCURRENT_UPLOADS = 8
export const MAX_CONCURRENT_DOWNLOADS = 32
export const MAX_UPLOAD_THREADS = 16
export const MAX_DOWNLOAD_THREADS = 64
export const MAX_DOWNLOAD_WRITERS = 1024
export const MAX_DOWNLOAD_RETRIES = 128
export const MAX_UPLOAD_RETRIES = Number.MAX_SAFE_INTEGER
export const DOWNLOAD_RETRY_TIMEOUT = 1000
export const UPLOAD_RETRY_TIMEOUT = 1000
export const API_RETRY_TIMEOUT = 1000
export const MAX_API_RETRIES = Number.MAX_SAFE_INTEGER
export const UPLOAD_VERSION = 2
export const METADATA_ENCRYPT_VERSION = 2
export const DATA_ENCRYPT_VERSION = 2
export const NAME_HASH_VERSION = 1
export const MAX_THUMBNAIL_TRIES = 1
export const MAX_CONCURRENT_THUMBNAIL_GENERATIONS = 5
export const THUMBNAIL_DIMENSIONS = { width: 512, height: 512, quality: 0.5 }
export const THUMBNAIL_VERSION = 1
export const WORKER_THREADS = 4
export const CHAKRA_COLOR_SCHEME = "purple"
export const THEME_COLOR = "#805AD5" // Chakra UI purple accent color
export const DROP_NAVIGATION_TIMEOUT = 1000
export const ONE_YEAR = 86400000 * 365
export const AUTH_VERSION = 2
export const PREVIEW_MAX_SIZE = 1024 * 1024 * 128
export const ONLINE_TIMEOUT = 900000

export const API_V3_DOMAINS =
	process.env.NODE_ENV === "development"
		? ["http://localhost:1337"]
		: [
				"https://gateway.filen.io",
				"https://gateway.filen.net",
				"https://gateway.filen-1.net",
				"https://gateway.filen-2.net",
				"https://gateway.filen-3.net",
				"https://gateway.filen-4.net",
				"https://gateway.filen-5.net",
				"https://gateway.filen-6.net"
		  ]

export const DOWNLOAD_DOMAINS =
	process.env.NODE_ENV === "development"
		? ["http://localhost:1339"]
		: [
				"https://down.filen.io",
				"https://down.filen.net",
				"https://down.filen-1.net",
				"https://down.filen-2.net",
				"https://down.filen-3.net",
				"https://down.filen-4.net",
				"https://down.filen-5.net",
				"https://down.filen-6.net"
		  ]

export const UPLOAD_V3_DOMAINS =
	process.env.NODE_ENV === "development"
		? ["http://localhost:1338"]
		: [
				"https://ingest.filen.io",
				"https://ingest.filen.net",
				"https://ingest.filen-1.net",
				"https://ingest.filen-2.net",
				"https://ingest.filen-3.net",
				"https://ingest.filen-4.net",
				"https://ingest.filen-5.net",
				"https://ingest.filen-6.net"
		  ]

export const SOCKET = "https://socket.filen.io"

export const REPORT_API_URL =
	process.env.NODE_ENV === "development" ? "http://localhost:3000/api/v1/ticket/submit" : "https://filen.io/api/v1/ticket/submit"
