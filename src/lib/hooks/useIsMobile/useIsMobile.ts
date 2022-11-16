import { useEffect, useState } from "react"
import useWindowWidth from "../useWindowWidth"
import Cookies from "../../cookies"

const useIsMobile = (): boolean => {
    const [isMobile, setIsMobile] = useState<boolean>(typeof Cookies.get("windowWidth") == "string" ? (parseInt(Cookies.get("windowWidth") as string) <= 768 ? true : false) : false)
    const windowWidth: number = useWindowWidth()

    useEffect(() => {
        setIsMobile(windowWidth <= 768)
    }, [windowWidth])

    return isMobile
}

export default useIsMobile