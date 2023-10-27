import React from "react"
import ReactDOM from "react-dom/client"
import "./styles/globals.css"
import App from "./App"
import { ChakraProvider, extendTheme, theme, ToastId } from "@chakra-ui/react"
import { HelmetProvider } from "react-helmet-async"
import { toastActiveCount } from "./components/Toast/Toast"
import "./lib/services/socket/socket"
import { ItemProps } from "./types"

declare global {
	interface Window {
		currentReceiverId: number
		doingSetup: boolean
		transfersToastId: ToastId | undefined
		visibleItems: ItemProps[]
		swFsRegistered: boolean
	}
}

window.doingSetup = false
window.transfersToastId = undefined
window.visibleItems = []
window.currentReceiverId = 0
window.swFsRegistered = false

if (navigator && navigator.serviceWorker) {
	navigator.serviceWorker
		.register("/swfs.js")
		.then(() => {
			window.swFsRegistered = true

			console.log("native-file-system-adapter service-worker registered")
		})
		.catch(console.error)
}

const extendedTheme = extendTheme({
	...theme,
	shadows: {
		...theme.shadows,
		outline: "none"
	}
})

window.onpopstate = () => {
	if (document.querySelectorAll(".chakra-modal__overlay").length > 0) {
		window.history.go(1)

		return
	}
}

window.onbeforeunload = () => {
	if (toastActiveCount() > 2 || document.querySelectorAll(".chakra-modal__overlay").length > 0) {
		return "Are you sure you want to leave?"
	}

	return null
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<ChakraProvider theme={extendedTheme}>
			<HelmetProvider>
				<App />
			</HelmetProvider>
		</ChakraProvider>
	</React.StrictMode>
)
