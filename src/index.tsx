import React from "react"
import ReactDOM from "react-dom/client"
import "./styles/globals.css"
import App from "./App"
import reportWebVitals from "./reportWebVitals"
import { ChakraProvider, extendTheme, theme } from "@chakra-ui/react"
import { HelmetProvider } from "react-helmet-async"
import { toastActiveCount } from "./components/Toast/Toast"
import "./lib/services/socket/socket"

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

reportWebVitals()
