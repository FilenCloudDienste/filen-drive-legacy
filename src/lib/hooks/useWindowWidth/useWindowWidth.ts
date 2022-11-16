import { useEffect, useState } from "react"
import Cookies from "../../cookies"

const useWindowWidth = (): number => {
    const [width, setWidth] = useState<number>(typeof Cookies.get("windowWidth") == "string" ? parseInt(Cookies.get("windowWidth") as string) : 1920)

    useEffect(() => {
        setWidth(window.innerWidth)

        const listener = (): void => {
            setWidth(window.innerWidth)
            
            Cookies.set("windowWidth", window.innerWidth.toString(), {
                domain: process.env.NODE_ENV == "development" ? undefined : "filen.io"
            })
        }

        window.addEventListener("resize", listener)

        return () => {
            window.removeEventListener("resize", listener)
        }
    }, [])

    return width
}

export default useWindowWidth