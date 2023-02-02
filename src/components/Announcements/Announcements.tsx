import { memo, useState, useEffect } from "react"
import { Flex } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import AppText from "../AppText"
import Button from "../Button"
import eventListener from "../../lib/eventListener"
import type { ICFG, CFGAnnouncement } from "../../types"
import db from "../../lib/db"

export interface AnnouncementsProps {
    darkMode: boolean,
    isMobile: boolean,
    cfg: ICFG
}

const Announcement = memo(({ darkMode, isMobile, announcement, index }: { darkMode: boolean, isMobile: boolean, announcement: CFGAnnouncement, index: number }) => {
    const [acknowledged, setAcknowledged] = useState<boolean>(false)

    if(acknowledged){
        return null
    }

    return (
        <Flex
            backgroundColor={getColor(darkMode, "backgroundPrimary")}
            border={"2px solid " + getColor(darkMode, "borderPrimary")}
            height="auto"
            width="auto"
            flexDirection="column"
            padding="15px"
            borderRadius="10px"
            zIndex={99999 + index}
            position="fixed"
            bottom={15}
            left="50%"
            transform="translate(-50%, 0%)"
        >
            <AppText
                darkMode={darkMode}
                isMobile={isMobile}
                fontWeight="normal"
                fontSize={15}
                color={getColor(darkMode, "textPrimary")}
            >
                {announcement.title}
            </AppText>
            <AppText
                darkMode={darkMode}
                isMobile={isMobile}
                fontWeight="normal"
                fontSize={13}
                color={getColor(darkMode, "textSecondary")}
                marginTop="3px"
            >
                {announcement.message}
            </AppText>
            <Flex
                flexDirection="row"
                justifyContent="space-between"
                alignItems="center"
                gap="20px"
                marginTop="15px"
            >
                <Button
                    flex={2}
                    darkMode={darkMode}
                    isMobile={isMobile}
                    backgroundColor={getColor(darkMode, "backgroundSecondary")}
                    height="35px"
                    width="100%"
                    onClick={() => {
                        db.get("acknowledgedAnnouncements").then((acknowledgedAnnouncementsDb) => {
                            if(acknowledgedAnnouncementsDb == null){
                                db.set("acknowledgedAnnouncements", {
                                    [announcement.uuid]: true
                                }).then(() => {
                                    setAcknowledged(true)
                                }).catch(console.error)
                            }
                            else{
                                db.set("acknowledgedAnnouncements", {
                                    ...acknowledgedAnnouncementsDb,
                                    [announcement.uuid]: true
                                }).then(() => {
                                    setAcknowledged(true)
                                }).catch(console.error)
                            }
                        }).catch(console.error)
                    }}
                    _hover={{
                        backgroundColor: getColor(darkMode, "backgroundTertiary")
                    }}
                >
                    OK
                </Button>
            </Flex>
        </Flex>
    )
})

const Announcements = memo(({ darkMode, isMobile, cfg }: AnnouncementsProps) => {
    const [acknowledgedAnnouncements, setAcknowledgedAnnouncements] = useState<{ [key: string]: boolean } | undefined>(undefined)

    useEffect(() => {
        db.get("acknowledgedAnnouncements").then((acknowledgedAnnouncementsDb) => {
            if(acknowledgedAnnouncementsDb == null){
                setAcknowledgedAnnouncements({})
            
                return
            }

            setAcknowledgedAnnouncements(acknowledgedAnnouncementsDb)
        }).catch(console.error)
    }, [])

    if(typeof cfg == "undefined" || !Array.isArray(cfg.announcements) || cfg.announcements.length == 0 || typeof acknowledgedAnnouncements == "undefined"){
        return null
    }

    return (
        <>
            {
                cfg.announcements.filter(a => a.active && typeof acknowledgedAnnouncements[a.uuid] == "undefined").map((announcement, index) => {
                    return (
                        <Announcement
                            darkMode={darkMode}
                            isMobile={isMobile}
                            announcement={announcement}
                            index={index}
                        />
                    )
                })
            }
        </>
    )
})

export default Announcements