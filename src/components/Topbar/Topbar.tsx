import { memo, useEffect, useState, useMemo } from "react"
import { Flex, Image, Button, Avatar, Spinner } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import type { TopbarProps, UserInfoV1 } from "../../types"
import DarkLogo from "../../assets/images/dark_logo.svg"
import LightLogo from "../../assets/images/light_logo.svg"
import Input from "../../components/Input"
import eventListener from "../../lib/eventListener"
import db from "../../lib/db"
import { useNavigate, useLocation } from "react-router-dom"
import { fetchUserInfo } from "../../lib/services/user"
import UploadButton from "./UploadButton"

const Topbar = memo(({ darkMode, isMobile, windowWidth, lang, searchTerm, setSearchTerm }: TopbarProps) => {
    const navigate = useNavigate()
    const location = useLocation()
    const [userInfo, setUserInfo] = useState<UserInfoV1 | undefined>(undefined)

    const uploadButtonEnabled: boolean = useMemo(() => {
        return location.hash.indexOf("shared-in") == -1
            && location.hash.indexOf("trash") == -1
            && location.hash.indexOf("links") == -1
            && location.hash.indexOf("favorites") == -1
            && location.hash.indexOf("recent") == -1
            && location.hash.indexOf("account") == -1
    }, [location.hash])

    const fetchData = (): void => {
        fetchUserInfo().then((info) => setUserInfo(info)).catch(console.error)
    }

    useEffect(() => {
        fetchData()

        const avatarUploadedListener = eventListener.on("avatarUploaded", () => fetchData())

        return () => {
            avatarUploadedListener.remove()
        }
    }, [])

    return (
        <Flex
            width="100%"
            height="50px"
            borderBottom={"1px solid " + getColor(darkMode, "borderSecondary")}
            alignItems="center"
            paddingLeft="15px"
            paddingRight="15px"
            flexDirection="row"
            justifyContent="space-between"
        >
            <Flex>
                <Image
                    src={darkMode ? LightLogo : DarkLogo}
                    width="28px"
                    height="28px"
                    cursor="pointer"
                    onClick={() => {
                        db.get("defaultDriveUUID").then((defaultDriveUUID) => {
                            if(typeof defaultDriveUUID == "string" && defaultDriveUUID.length > 32){
                                navigate("/#/" + defaultDriveUUID)
                            }
                        }).catch(console.error)
                    }}
                />
            </Flex>
            {
                location.hash.indexOf("account") == -1 && (
                    <Flex>
                        <Input 
                            darkMode={darkMode}
                            isMobile={isMobile}
                            placeholder="Search in this folder.."
                            width={windowWidth / 3 + "px"}
                            maxWidth="450px"
                            height="26px"
                            backgroundColor={getColor(darkMode, "backgroundSecondary")}
                            borderRadius="3px"
                            fontSize={12.5}
                            paddingLeft="10px"
                            paddingRight="10px"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            color={getColor(darkMode, "textSecondary")}
                            _placeholder={{
                                color: getColor(darkMode, "textSecondary")
                            }}
                        />
                    </Flex>
                )
            }
            <Flex
                alignItems="center"
                width="auto"
                flexDirection="row"
                justifyContent="flex-start"
            >
                <UploadButton
                    darkMode={darkMode}
                    isMobile={isMobile}
                    lang={lang}
                    enabled={uploadButtonEnabled}
                />
                {
                    typeof userInfo == "undefined" ? (
                        <Spinner
                            width="20px"
                            height="20px"
                            color={getColor(darkMode, "textPrimary")}
                        />
                    ) : (
                        <Avatar
                            name={typeof userInfo.avatarURL == "string" && userInfo.avatarURL.length > 0 ? undefined : userInfo.email}
                            width="28px"
                            height="28px"
                            src={typeof userInfo.avatarURL == "string" && userInfo.avatarURL.length > 0 ? userInfo.avatarURL : undefined}
                            cursor="pointer"
                            onClick={() => navigate("/#/account/general")}
                        />
                    )
                }
            </Flex>
        </Flex>
    )
})

export default Topbar