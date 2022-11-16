import { useEffect, useState } from "react"
import Cookies from "../../cookies"

const useWindowHeight = (): number => {
    const [height, setHeight] = useState<number>(typeof Cookies.get("windowHeight") == "string" ? parseInt(Cookies.get("windowHeight") as string) : 1080)

    useEffect(() => {
        setHeight(window.innerHeight)

        const listener = (): void => {
            setHeight(window.innerHeight)
            
            Cookies.set("windowHeight", window.innerHeight.toString(), {
                domain: process.env.NODE_ENV == "development" ? undefined : "filen.io"
            })
        }

        window.addEventListener("resize", listener)

        return () => {
            window.removeEventListener("resize", listener)
        }
    }, [])

    return height
}

export default useWindowHeight