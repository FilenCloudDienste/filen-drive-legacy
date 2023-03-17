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
export const MAX_DOWNLOAD_RETRIES = 512
export const MAX_UPLOAD_RETRIES = 64
export const DOWNLOAD_RETRY_TIMEOUT = 1000
export const UPLOAD_RETRY_TIMEOUT = 1000
export const API_RETRY_TIMEOUT = 1000
export const MAX_API_RETRIES = 256
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
export const ONE_YEAR = (86400000 * 365)
export const AUTH_VERSION = 2
export const PREVIEW_MAX_SIZE = (1024 * 1024 * 128)
export const API_DOMAINS = [
    "https://api.filen.io",
    "https://api.filen.net",
    "https://api.filen-1.net",
    "https://api.filen-2.net",
    "https://api.filen-3.net",
    "https://api.filen-4.net",
    "https://api.filen-5.net",
    "https://api.filen-6.net"
]
export const API_V3_DOMAINS = [
    "https://api.gateway.filen.io",
    "https://api.gateway.filen.net",
    "https://api.gateway.filen-1.net",
    "https://api.gateway.filen-2.net",
    "https://api.gateway.filen-3.net",
    "https://api.gateway.filen-4.net",
    "https://api.gateway.filen-5.net",
    "https://api.gateway.filen-6.net"
]
export const DOWNLOAD_DOMAINS = [
    "https://down.filen.io",
    "https://down.filen.net",
    "https://down.filen-1.net",
    "https://down.filen-2.net",
    "https://down.filen-3.net",
    "https://down.filen-4.net",
    "https://down.filen-5.net",
    "https://down.filen-6.net"
]
export const UPLOAD_DOMAINS = [
    "https://up.filen.io",
    "https://up.filen.net",
    "https://up.filen-1.net",
    "https://up.filen-2.net",
    "https://up.filen-3.net",
    "https://up.filen-4.net",
    "https://up.filen-5.net",
    "https://up.filen-6.net"
]
export const UPLOAD_V3_DOMAINS = [
    "https://upload.gateway.filen.io",
    "https://upload.gateway.filen.net",
    "https://upload.gateway.filen-1.net",
    "https://upload.gateway.filen-2.net",
    "https://upload.gateway.filen-3.net",
    "https://upload.gateway.filen-4.net",
    "https://upload.gateway.filen-5.net",
    "https://upload.gateway.filen-6.net"
]
export const SOCKET = "https://socket.filen.io"
export const REPORT_API_URL = process.env.NODE_ENV == "development" ? "http://localhost:3000/api/v1/ticket/submit" : "https://filen.io/api/v1/ticket/submit"