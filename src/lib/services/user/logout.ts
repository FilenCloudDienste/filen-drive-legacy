import db from "../../db"
import cookies from "../../cookies"
import { NavigateFunction } from "react-router-dom"

export const logout = async (navigate?: NavigateFunction) => {
	try {
		await Promise.all([db.clear("metadata"), db.clear("normal")])

		cookies.remove("loggedIn")

		if (typeof navigate == "function") {
			navigate("/login", { replace: true })
		} else {
			window.location.href = "/login"
		}
	} catch (e) {
		console.error(e)
	}
}
