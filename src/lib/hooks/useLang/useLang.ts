import { useEffect, useState } from "react"
import useCookie from "../useCookie"
import Cookies from "../../cookies"

const useLang = (): string => {
    const [lang, setLang] = useState<string>(typeof Cookies.get("lang") == "string" ? Cookies.get("lang") as string : "en")
    const [cookie, _] = useCookie("lang")

    useEffect(() => {
        if(typeof cookie == "string"){
            setLang(cookie)
        }
    }, [cookie])

    return lang
}

export default useLang