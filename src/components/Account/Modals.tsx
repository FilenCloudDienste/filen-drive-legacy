import { memo, useEffect, useState } from "react"
import { Flex, Modal, ModalOverlay, ModalContent, ModalBody, ModalFooter, ModalHeader, Spinner, FormLabel, ModalCloseButton, Button } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import eventListener from "../../lib/eventListener"
import AppText from "../AppText"
import Input from "../Input"
import { authInfo, changeEmail, updatePersonal, deleteAccount, deleteAll, deleteVersioned, changePassword, enable2FA, disable2FA } from "../../lib/api"
import { generatePasswordAndMasterKeysBasedOnAuthVersion, encryptMetadata } from "../../lib/worker/worker.com"
import db from "../../lib/db"
import { show as showToast } from "../Toast/Toast"
import { fetchUserAccount, fetchUserSettings } from "../../lib/services/user"
import { generateRandomString } from "../../lib/helpers"
import QRCode from "react-qr-code"
import type { UserGetSettingsV1 } from "../../types"
import { i18n } from "../../i18n"
import cookies from "../../lib/cookies"
import useDb from "../../lib/hooks/useDb"
import { Base64 } from "js-base64"

export const LanguageModal = memo(({ darkMode, isMobile, lang }: { darkMode: boolean, isMobile: boolean, lang: string }) => {
    const [open, setOpen] = useState<boolean>(false)

    useEffect(() => {
        const openListener = eventListener.on("openLanguageModal", () => setOpen(true))

        return () => {
            openListener.remove()
        }
    }, [])
    
    return (
        <Modal
            onClose={() => setOpen(false)}
            isOpen={open}
            isCentered={true}
            size={isMobile ? "full" : "md"}
            blockScrollOnMount={false}
        >
            <ModalOverlay 
                backgroundColor="rgba(0, 0, 0, 0.4)"
            />
            <ModalContent
                backgroundColor={getColor(darkMode, "backgroundSecondary")}
                color={getColor(darkMode, "textSecondary")}
                borderRadius={isMobile ? "0px" : "5px"}
            >
                <ModalHeader
                    color={getColor(darkMode, "textPrimary")}
                >
                    {i18n(lang, "language")}
                </ModalHeader>
                <ModalCloseButton
                    color={getColor(darkMode, "textSecondary")}
                    backgroundColor={getColor(darkMode, "backgroundTertiary")}
                    _hover={{
                        color: getColor(darkMode, "textPrimary"),
                        backgroundColor: getColor(darkMode, "backgroundPrimary")
                    }}
                    autoFocus={false}
                    tabIndex={-1}
                    borderRadius="full"
                />
                <ModalBody
                    height="100%"
                    width="100%"
                >
                    <Flex
                        height="100%"
                        width="100%"
                        flexDirection="row"
                    >
                        {
                            [
                                {
                                    code: "en",
                                    name: "English"
                                },
                                {
                                    code: "de",
                                    name: "Deutsch"
                                }
                            ].map((language) => {
                                return (
                                    <AppText
                                        key={language.code}
                                        darkMode={darkMode}
                                        isMobile={isMobile}
                                        noOfLines={1}
                                        wordBreak="break-all"
                                        color={getColor(darkMode, "linkPrimary")}
                                        cursor="pointer"
                                        _hover={{
                                            textDecoration: "underline"
                                        }}
                                        marginRight="15px"
                                        onClick={() => {
                                            try{
                                                cookies.set("lang", language.code, {
                                                    domain: process.env.NODE_ENV == "development" ? undefined : "filen.io"
                                                })

                                                setOpen(false)
                                            }
                                            catch(e){
                                                console.error(e)
                                            }
                                        }}
                                    >
                                        {language.name}
                                    </AppText>
                                )
                            })
                        }
                    </Flex>
                </ModalBody>
                <ModalFooter />
            </ModalContent>
        </Modal>
    )
})

export const EmailModal = memo(({ darkMode, isMobile, lang }: { darkMode: boolean, isMobile: boolean, lang: string }) => {
    const [open, setOpen] = useState<boolean>(false)
    const [email, setEmail] = useState<string>("")
    const [confirmEmail, setConfirmEmail] = useState<string>("")
    const [password, setPassword] = useState<string>("")
    const [loading, setLoading] = useState<boolean>(false)

    const save = async (): Promise<void> => {
        if(loading){
            return
        }

        if(!email.trim()){
            showToast("error", i18n(lang, "invalidEmail"), "bottom", 5000)

            return
        }

        if(!confirmEmail.trim()){
            showToast("error", i18n(lang, "invalidEmail"), "bottom", 5000)

            return
        }

        if(!password.trim()){
            showToast("error", i18n(lang, "invalidPassword"), "bottom", 5000)

            return
        }

        if(email !== confirmEmail){
            showToast("error", i18n(lang, "emailsDoNotMatch"), "bottom", 5000)

            return
        }

        setLoading(true)

        try{
            const userEmail: string = await db.get("userEmail")
            const { authVersion, salt } = await authInfo({ email: userEmail })
            const { derivedPassword } = await generatePasswordAndMasterKeysBasedOnAuthVersion(password.trim(), authVersion, salt)

            await changeEmail(email.trim(), confirmEmail.trim(), derivedPassword, authVersion)

            showToast("success", i18n(lang, "changeEmailPleaseConfirm"), "bottom", 10000)
        }
        catch(e: any){
            console.error(e)

            showToast("error", e.toString(), "bottom", 5000)
        }

        setEmail("")
        setConfirmEmail("")
        setPassword("")
        setLoading(false)
    }

    const inputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if(e.which == 13){
            save()
        }
    }

    useEffect(() => {
        const openListener = eventListener.on("openEmailModal", () => setOpen(true))

        return () => {
            openListener.remove()
        }
    }, [])
    
    return (
        <Modal
            onClose={() => setOpen(false)}
            isOpen={open}
            isCentered={true}
            size={isMobile ? "full" : "md"}
            blockScrollOnMount={false}
        >
            <ModalOverlay 
                backgroundColor="rgba(0, 0, 0, 0.4)"
            />
            <ModalContent
                backgroundColor={getColor(darkMode, "backgroundSecondary")}
                color={getColor(darkMode, "textSecondary")}
                borderRadius={isMobile ? "0px" : "5px"}
            >
                <ModalHeader
                    color={getColor(darkMode, "textPrimary")}
                >
                    {i18n(lang, "changeEmail")}
                </ModalHeader>
                <ModalCloseButton
                    color={getColor(darkMode, "textSecondary")}
                    backgroundColor={getColor(darkMode, "backgroundTertiary")}
                    _hover={{
                        color: getColor(darkMode, "textPrimary"),
                        backgroundColor: getColor(darkMode, "backgroundPrimary")
                    }}
                    autoFocus={false}
                    tabIndex={-1}
                    borderRadius="full"
                />
                <ModalBody
                    height="100%"
                    width="100%"
                >
                    <Flex
                        height="100%"
                        width="100%"
                        flexDirection="column"
                    >
                        <Input
                            darkMode={darkMode}
                            isMobile={isMobile}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={i18n(lang, "newEmail")}
                            type="email"
                            isDisabled={loading}
                            onKeyDown={inputKeyDown}
                            maxLength={255}
                            color={getColor(darkMode, "textSecondary")}
                            _placeholder={{
                                color: getColor(darkMode, "textSecondary")
                            }}
                        />
                        <Input
                            darkMode={darkMode}
                            isMobile={isMobile}
                            value={confirmEmail}
                            onChange={(e) => setConfirmEmail(e.target.value)}
                            marginTop="10px"
                            placeholder={i18n(lang, "confirmNewEmail")}
                            type="email"
                            isDisabled={loading}
                            onKeyDown={inputKeyDown}
                            maxLength={255}
                            color={getColor(darkMode, "textSecondary")}
                            _placeholder={{
                                color: getColor(darkMode, "textSecondary")
                            }}
                        />
                        <Input
                            darkMode={darkMode}
                            isMobile={isMobile}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            marginTop="10px"
                            placeholder={i18n(lang, "password")}
                            type="password"
                            isDisabled={loading}
                            onKeyDown={inputKeyDown}
                            color={getColor(darkMode, "textSecondary")}
                            _placeholder={{
                                color: getColor(darkMode, "textSecondary")
                            }}
                        />
                    </Flex>
                </ModalBody>
                <ModalFooter>
                    {
                        loading ? (
                            <Spinner
                                width="16px"
                                height="16px"
                                color={getColor(darkMode, "textPrimary")}
                            />
                        ) : (
                            <AppText
                                darkMode={darkMode}
                                isMobile={isMobile}
                                noOfLines={1}
                                wordBreak="break-all"
                                color={getColor(darkMode, "linkPrimary")}
                                cursor="pointer"
                                onClick={() => save()}
                            >
                                {i18n(lang, "save")}
                            </AppText>
                        )
                    }
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
})

export const PersonalModal = memo(({ darkMode, isMobile, lang }: { darkMode: boolean, isMobile: boolean, lang: string }) => {
    const [open, setOpen] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [personal, setPersonal] = useState<{
        city?: string,
        companyName?: string,
        country?: string,
        firstName?: string,
        lastName?: string,
        postalCode?: string,
        street?: string,
        streetNumber?: string,
        vatId?: string
    } | undefined>(undefined)

    const fetchAccount = async (): Promise<boolean> => {
        setPersonal(undefined)

        try{
            const account = await fetchUserAccount()

            setPersonal({
                city: typeof account.personal.city == "string" && account.personal.city.length > 0 ? account.personal.city : "",
                companyName: typeof account.personal.companyName == "string" && account.personal.companyName.length > 0 ? account.personal.companyName : "",
                country: typeof account.personal.country == "string" && account.personal.country.length > 0 ? account.personal.country : "",
                firstName: typeof account.personal.firstName == "string" && account.personal.firstName.length > 0 ? account.personal.firstName : "",
                lastName: typeof account.personal.lastName == "string" && account.personal.lastName.length > 0 ? account.personal.lastName : "",
                postalCode: typeof account.personal.postalCode == "string" && account.personal.postalCode.length > 0 ? account.personal.postalCode : "",
                street: typeof account.personal.street == "string" && account.personal.street.length > 0 ? account.personal.street : "",
                streetNumber: typeof account.personal.streetNumber == "string" && account.personal.streetNumber.length > 0 ? account.personal.streetNumber : "",
                vatId: typeof account.personal.vatId == "string" && account.personal.vatId.length > 0 ? account.personal.vatId : ""
            })
        }
        catch(e: any){
            console.error(e)

            showToast("error", e.toString(), "bottom", 5000)
        }

        return true
    }

    const save = async (): Promise<void> => {
        if(loading || typeof personal == "undefined"){
            return
        }

        setLoading(true)

        try{
            await updatePersonal(personal)
            await fetchAccount()
        }
        catch(e: any){
            console.error(e)

            fetchAccount().catch(console.error)

            showToast("error", e.toString(), "bottom", 5000)
        }

        setLoading(false)
    }

    const inputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if(e.which == 13){
            save()
        }
    }

    useEffect(() => {
        const openListener = eventListener.on("openPersonalModal", () => {
            fetchAccount().catch(console.error)
            setOpen(true)
        })

        return () => {
            openListener.remove()
        }
    }, [])
    
    return (
        <Modal
            onClose={() => setOpen(false)}
            isOpen={open}
            isCentered={true}
            size={isMobile ? "full" : "xl"}
            blockScrollOnMount={false}
        >
            <ModalOverlay 
                backgroundColor="rgba(0, 0, 0, 0.4)"
            />
            <ModalContent
                backgroundColor={getColor(darkMode, "backgroundSecondary")}
                color={getColor(darkMode, "textSecondary")}
                borderRadius={isMobile ? "0px" : "5px"}
            >
                <ModalHeader
                    color={getColor(darkMode, "textPrimary")}
                >
                    {i18n(lang, "personalInformation")}
                </ModalHeader>
                <ModalCloseButton
                    color={getColor(darkMode, "textSecondary")}
                    backgroundColor={getColor(darkMode, "backgroundTertiary")}
                    _hover={{
                        color: getColor(darkMode, "textPrimary"),
                        backgroundColor: getColor(darkMode, "backgroundPrimary")
                    }}
                    autoFocus={false}
                    tabIndex={-1}
                    borderRadius="full"
                />
                <ModalBody
                    height="100%"
                    width="100%"
                >
                    <Flex
                        height="100%"
                        width="100%"
                        flexDirection="column"
                    >
                        {
                            typeof personal == "undefined" ? (
                                <Spinner
                                    width="32px"
                                    height="32px"
                                    color={getColor(darkMode, "textPrimary")}
                                />
                            ) : (
                                <>
                                    <Flex
                                        width="100%"
                                        height="auto"
                                        flexDirection="row"
                                        alignItems="center"
                                        justifyContent="space-between"
                                    >
                                        <Flex
                                            width="49%"
                                            flexDirection="column"
                                        >
                                            <FormLabel color={getColor(darkMode, "textSecondary")}>
                                                {i18n(lang, "firstName")}
                                            </FormLabel>
                                            <Input
                                                darkMode={darkMode}
                                                isMobile={isMobile}
                                                value={personal.firstName}
                                                onChange={(e) => setPersonal(prev => ({ ...prev, firstName: e.target.value }))}
                                                placeholder={i18n(lang, "firstName")}
                                                type="text"
                                                isDisabled={loading}
                                                onKeyDown={inputKeyDown}
                                                maxLength={255}
                                                color={getColor(darkMode, "textSecondary")}
                                                _placeholder={{
                                                    color: getColor(darkMode, "textSecondary")
                                                }}
                                            />
                                        </Flex>
                                        <Flex
                                            width="49%"
                                            flexDirection="column"
                                        >
                                            <FormLabel color={getColor(darkMode, "textSecondary")}>
                                                {i18n(lang, "lastName")}
                                            </FormLabel>
                                            <Input
                                                darkMode={darkMode}
                                                isMobile={isMobile}
                                                value={personal.lastName}
                                                onChange={(e) => setPersonal(prev => ({ ...prev, lastName: e.target.value }))}
                                                placeholder={i18n(lang, "lastName")}
                                                type="text"
                                                isDisabled={loading}
                                                onKeyDown={inputKeyDown}
                                                maxLength={255}
                                                color={getColor(darkMode, "textSecondary")}
                                                _placeholder={{
                                                    color: getColor(darkMode, "textSecondary")
                                                }}
                                            />
                                        </Flex>
                                    </Flex>
                                    <Flex
                                        width="100%"
                                        height="auto"
                                        flexDirection="row"
                                        alignItems="center"
                                        justifyContent="space-between"
                                        marginTop="15px"
                                    >
                                        <Flex
                                            width="64%"
                                            flexDirection="column"
                                        >
                                            <FormLabel color={getColor(darkMode, "textSecondary")}>
                                                {i18n(lang, "companyName")}
                                            </FormLabel>
                                            <Input
                                                darkMode={darkMode}
                                                isMobile={isMobile}
                                                value={personal.companyName}
                                                onChange={(e) => setPersonal(prev => ({ ...prev, companyName: e.target.value }))}
                                                placeholder={i18n(lang, "companyName")}
                                                type="text"
                                                isDisabled={loading}
                                                onKeyDown={inputKeyDown}
                                                maxLength={255}
                                                color={getColor(darkMode, "textSecondary")}
                                                _placeholder={{
                                                    color: getColor(darkMode, "textSecondary")
                                                }}
                                            />
                                        </Flex>
                                        <Flex
                                            width="34%"
                                            flexDirection="column"
                                        >
                                            <FormLabel color={getColor(darkMode, "textSecondary")}>
                                                {i18n(lang, "vatId")}
                                            </FormLabel>
                                            <Input
                                                darkMode={darkMode}
                                                isMobile={isMobile}
                                                value={personal.vatId}
                                                onChange={(e) => setPersonal(prev => ({ ...prev, vatId: e.target.value }))}
                                                placeholder={i18n(lang, "vatId")}
                                                type="text"
                                                isDisabled={loading}
                                                onKeyDown={inputKeyDown}
                                                maxLength={255}
                                                color={getColor(darkMode, "textSecondary")}
                                                _placeholder={{
                                                    color: getColor(darkMode, "textSecondary")
                                                }}
                                            />
                                        </Flex>
                                    </Flex>
                                    <Flex
                                        width="100%"
                                        height="auto"
                                        flexDirection="row"
                                        alignItems="center"
                                        justifyContent="space-between"
                                        marginTop="15px"
                                    >
                                        <Flex
                                            width="64%"
                                            flexDirection="column"
                                        >
                                            <FormLabel color={getColor(darkMode, "textSecondary")}>
                                                {i18n(lang, "street")}
                                            </FormLabel>
                                            <Input
                                                darkMode={darkMode}
                                                isMobile={isMobile}
                                                value={personal.street}
                                                onChange={(e) => setPersonal(prev => ({ ...prev, street: e.target.value }))}
                                                placeholder={i18n(lang, "street")}
                                                type="text"
                                                isDisabled={loading}
                                                onKeyDown={inputKeyDown}
                                                maxLength={255}
                                                color={getColor(darkMode, "textSecondary")}
                                                _placeholder={{
                                                    color: getColor(darkMode, "textSecondary")
                                                }}
                                            />
                                        </Flex>
                                        <Flex
                                            width="34%"
                                            flexDirection="column"
                                        >
                                            <FormLabel color={getColor(darkMode, "textSecondary")}>
                                                {i18n(lang, "streetNumber")}
                                            </FormLabel>
                                            <Input
                                                darkMode={darkMode}
                                                isMobile={isMobile}
                                                value={personal.streetNumber}
                                                onChange={(e) => setPersonal(prev => ({ ...prev, streetNumber: e.target.value }))}
                                                placeholder={i18n(lang, "streetNumber")}
                                                type="text"
                                                isDisabled={loading}
                                                onKeyDown={inputKeyDown}
                                                maxLength={16}
                                                color={getColor(darkMode, "textSecondary")}
                                                _placeholder={{
                                                    color: getColor(darkMode, "textSecondary")
                                                }}
                                            />
                                        </Flex>
                                    </Flex>
                                    <Flex
                                        width="100%"
                                        height="auto"
                                        flexDirection="row"
                                        alignItems="center"
                                        justifyContent="space-between"
                                        marginTop="15px"
                                    >
                                        <Flex
                                            width="64%"
                                            flexDirection="column"
                                        >
                                            <FormLabel color={getColor(darkMode, "textSecondary")}>
                                                {i18n(lang, "city")}
                                            </FormLabel>
                                            <Input
                                                darkMode={darkMode}
                                                isMobile={isMobile}
                                                value={personal.city}
                                                onChange={(e) => setPersonal(prev => ({ ...prev, city: e.target.value }))}
                                                placeholder={i18n(lang, "city")}
                                                type="text"
                                                isDisabled={loading}
                                                onKeyDown={inputKeyDown}
                                                maxLength={255}
                                                color={getColor(darkMode, "textSecondary")}
                                                _placeholder={{
                                                    color: getColor(darkMode, "textSecondary")
                                                }}
                                            />
                                        </Flex>
                                        <Flex
                                            width="34%"
                                            flexDirection="column"
                                        >
                                            <FormLabel color={getColor(darkMode, "textSecondary")}>
                                                {i18n(lang, "postalCode")}
                                            </FormLabel>
                                            <Input
                                                darkMode={darkMode}
                                                isMobile={isMobile}
                                                value={personal.postalCode}
                                                onChange={(e) => setPersonal(prev => ({ ...prev, postalCode: e.target.value }))}
                                                placeholder={i18n(lang, "postalCode")}
                                                type="text"
                                                isDisabled={loading}
                                                onKeyDown={inputKeyDown}
                                                maxLength={255}
                                                color={getColor(darkMode, "textSecondary")}
                                                _placeholder={{
                                                    color: getColor(darkMode, "textSecondary")
                                                }}
                                            />
                                        </Flex>
                                    </Flex>
                                    <Flex
                                        width="100%"
                                        height="auto"
                                        flexDirection="column"
                                        marginTop="15px"
                                    >
                                        <FormLabel color={getColor(darkMode, "textSecondary")}>
                                            {i18n(lang, "country")}
                                        </FormLabel>
                                        <Input
                                            darkMode={darkMode}
                                            isMobile={isMobile}
                                            value={personal.country}
                                            onChange={(e) => setPersonal(prev => ({ ...prev, country: e.target.value }))}
                                            placeholder={i18n(lang, "country")}
                                            type="text"
                                            isDisabled={loading}
                                            onKeyDown={inputKeyDown}
                                            maxLength={255}
                                            color={getColor(darkMode, "textSecondary")}
                                            _placeholder={{
                                                color: getColor(darkMode, "textSecondary")
                                            }}
                                        />
                                    </Flex>
                                </>
                            )
                        }
                    </Flex>
                </ModalBody>
                <ModalFooter>
                    {
                        typeof personal !== "undefined" && loading ? (
                            <Spinner
                                width="16px"
                                height="16px"
                                color={getColor(darkMode, "textPrimary")}
                            />
                        ) : (
                            <AppText
                                darkMode={darkMode}
                                isMobile={isMobile}
                                noOfLines={1}
                                wordBreak="break-all"
                                color={getColor(darkMode, "linkPrimary")}
                                cursor="pointer"
                                onClick={() => save()}
                            >
                                {i18n(lang, "save")}
                            </AppText>
                        )
                    }
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
})

export const DeleteVersionedModal = memo(({ darkMode, isMobile, lang }: { darkMode: boolean, isMobile: boolean, lang: string }) => {
    const [open, setOpen] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)

    const deleteVersionedFiles = async (): Promise<void> => {
        if(!window.confirm(i18n(lang, "areYouSure"))){
            return
        }

        setLoading(true)

        try{
            await deleteVersioned()
        }
        catch(e: any){
            console.error(e)

            showToast("error", e.toString(), "bottom", 5000)
        }

        setLoading(false)
    }

    useEffect(() => {
        const openListener = eventListener.on("openDeleteVersionedModal", () => setOpen(true))

        return () => {
            openListener.remove()
        }
    }, [])
    
    return (
        <Modal
            onClose={() => setOpen(false)}
            isOpen={open}
            isCentered={true}
            size={isMobile ? "full" : "md"}
            blockScrollOnMount={false}
        >
            <ModalOverlay 
                backgroundColor="rgba(0, 0, 0, 0.4)"
            />
            <ModalContent
                backgroundColor={getColor(darkMode, "backgroundSecondary")}
                color={getColor(darkMode, "textSecondary")}
                borderRadius={isMobile ? "0px" : "5px"}
            >
                <ModalHeader
                    color={getColor(darkMode, "textPrimary")}
                >
                    {i18n(lang, "delete")}
                </ModalHeader>
                <ModalCloseButton
                    color={getColor(darkMode, "textSecondary")}
                    backgroundColor={getColor(darkMode, "backgroundTertiary")}
                    _hover={{
                        color: getColor(darkMode, "textPrimary"),
                        backgroundColor: getColor(darkMode, "backgroundPrimary")
                    }}
                    autoFocus={false}
                    tabIndex={-1}
                    borderRadius="full"
                />
                <ModalBody
                    height="100%"
                    width="100%"
                    alignItems="center"
                    justifyContent="center"
                >
                    {
                        loading ? (
                            <Spinner
                                width="32px"
                                height="32px"
                                color={getColor(darkMode, "textPrimary")}
                            />
                        ) : (
                            <AppText
                                darkMode={darkMode}
                                isMobile={isMobile}
                                color={getColor(darkMode, "textPrimary")}
                            >
                                {i18n(lang, "areYouSureDeleteAllVersioned")}
                            </AppText>
                        )
                    }
                </ModalBody>
                {
                    !loading && (
                        <ModalFooter>
                            <AppText
                                darkMode={darkMode}
                                isMobile={isMobile}
                                noOfLines={1}
                                wordBreak="break-all"
                                color="red"
                                cursor="pointer"
                                onClick={() => deleteVersionedFiles()}
                            >
                                {i18n(lang, "delete")}
                            </AppText>
                        </ModalFooter>
                    )
                }
            </ModalContent>
        </Modal>
    )
})

export const DeleteAllModal = memo(({ darkMode, isMobile, lang }: { darkMode: boolean, isMobile: boolean, lang: string }) => {
    const [open, setOpen] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)

    const deleteAllFiles = async (): Promise<void> => {
        if(!window.confirm(i18n(lang, "areYouSure"))){
            return
        }

        setLoading(true)

        try{
            await deleteAll()
        }
        catch(e: any){
            console.error(e)

            showToast("error", e.toString(), "bottom", 5000)
        }

        setLoading(false)
    }

    useEffect(() => {
        const openListener = eventListener.on("openDeleteAllModal", () => setOpen(true))

        return () => {
            openListener.remove()
        }
    }, [])
    
    return (
        <Modal
            onClose={() => setOpen(false)}
            isOpen={open}
            isCentered={true}
            size={isMobile ? "full" : "md"}
            blockScrollOnMount={false}
        >
            <ModalOverlay 
                backgroundColor="rgba(0, 0, 0, 0.4)"
            />
            <ModalContent
                backgroundColor={getColor(darkMode, "backgroundSecondary")}
                color={getColor(darkMode, "textSecondary")}
                borderRadius={isMobile ? "0px" : "5px"}
            >
                <ModalHeader
                    color={getColor(darkMode, "textPrimary")}
                >
                    {i18n(lang, "delete")}
                </ModalHeader>
                <ModalCloseButton
                    color={getColor(darkMode, "textSecondary")}
                    backgroundColor={getColor(darkMode, "backgroundTertiary")}
                    _hover={{
                        color: getColor(darkMode, "textPrimary"),
                        backgroundColor: getColor(darkMode, "backgroundPrimary")
                    }}
                    autoFocus={false}
                    tabIndex={-1}
                    borderRadius="full"
                />
                <ModalBody
                    height="100%"
                    width="100%"
                    alignItems="center"
                    justifyContent="center"
                >
                    {
                        loading ? (
                            <Spinner
                                width="32px"
                                height="32px"
                                color={getColor(darkMode, "textPrimary")}
                            />
                        ) : (
                            <AppText
                                darkMode={darkMode}
                                isMobile={isMobile}
                                color={getColor(darkMode, "textPrimary")}
                            >
                                {i18n(lang, "areYouSureDeleteAll")}
                            </AppText>
                        )
                    }
                </ModalBody>
                {
                    !loading && (
                        <ModalFooter>
                            <AppText
                                darkMode={darkMode}
                                isMobile={isMobile}
                                noOfLines={1}
                                wordBreak="break-all"
                                color="red"
                                cursor="pointer"
                                onClick={() => deleteAllFiles()}
                            >
                                {i18n(lang, "delete")}
                            </AppText>
                        </ModalFooter>
                    )
                }
            </ModalContent>
        </Modal>
    )
})

export const PasswordModal = memo(({ darkMode, isMobile, lang }: { darkMode: boolean, isMobile: boolean, lang: string }) => {
    const [open, setOpen] = useState<boolean>(false)
    const [newPassword, setNewPassword] = useState<string>("")
    const [confirmNewPassword, setConfirmNewPassword] = useState<string>("")
    const [password, setPassword] = useState<string>("")
    const [loading, setLoading] = useState<boolean>(false)

    const save = async (): Promise<void> => {
        if(loading){
            return
        }

        if(!newPassword.trim()){
            showToast("error", i18n(lang, "invalidNewPassword"), "bottom", 5000)

            return
        }

        if(!confirmNewPassword.trim()){
            showToast("error", i18n(lang, "invalidNewPassword"), "bottom", 5000)

            return
        }

        if(!password.trim()){
            showToast("error", i18n(lang, "invalidCurrentPassword"), "bottom", 5000)

            return
        }

        if(newPassword !== confirmNewPassword){
            showToast("error", i18n(lang, "newPasswordsDontMatch"), "bottom", 5000)

            return
        }

        setLoading(true)

        try{
            const [userEmail, masterKeys] = await Promise.all([db.get("userEmail"), db.get("masterKeys")])

            if(!Array.isArray(masterKeys)){
                showToast("error", i18n(lang, "invalidMasterKeys"), "bottom", 5000)

                return
            }

            if(masterKeys.length == 0){
                showToast("error", i18n(lang, "invalidMasterKeys"), "bottom", 5000)

                return
            }

            const { authVersion, salt } = await authInfo({ email: userEmail })
            const { derivedPassword: currentPasswordHash } = await generatePasswordAndMasterKeysBasedOnAuthVersion(password.trim(), authVersion, salt)
            const newSalt: string = generateRandomString(256)
            const { derivedPassword: newPasswordHash, derivedMasterKeys } = await generatePasswordAndMasterKeysBasedOnAuthVersion(newPassword.trim(), authVersion, newSalt)

            masterKeys.push(derivedMasterKeys)

            const newMasterKeys = await encryptMetadata(masterKeys.join("|"), masterKeys[masterKeys.length - 1])
            const response = await changePassword({ password: newPasswordHash, passwordRepeat: newPasswordHash, currentPassword: currentPasswordHash, authVersion, salt: newSalt, masterKeys: newMasterKeys })

            await Promise.all([
                db.set("apiKey", response.apiKey),
                db.set("masterKeys", masterKeys)
            ])

            showToast("success", i18n(lang, "passwordChanged"), "bottom", 5000)
        }
        catch(e: any){
            console.error(e)

            showToast("error", e.toString(), "bottom", 5000)
        }

        setNewPassword("")
        setConfirmNewPassword("")
        setPassword("")
        setLoading(false)
    }

    const inputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if(e.which == 13){
            save()
        }
    }

    useEffect(() => {
        const openListener = eventListener.on("openPasswordModal", () => setOpen(true))

        return () => {
            openListener.remove()
        }
    }, [])
    
    return (
        <Modal
            onClose={() => setOpen(false)}
            isOpen={open}
            isCentered={true}
            size={isMobile ? "full" : "md"}
            blockScrollOnMount={false}
        >
            <ModalOverlay 
                backgroundColor="rgba(0, 0, 0, 0.4)"
            />
            <ModalContent
                backgroundColor={getColor(darkMode, "backgroundSecondary")}
                color={getColor(darkMode, "textSecondary")}
                borderRadius={isMobile ? "0px" : "5px"}
            >
                <ModalHeader
                    color={getColor(darkMode, "textPrimary")}
                >
                    {i18n(lang, "changePassword")}
                </ModalHeader>
                <ModalCloseButton
                    color={getColor(darkMode, "textSecondary")}
                    backgroundColor={getColor(darkMode, "backgroundTertiary")}
                    _hover={{
                        color: getColor(darkMode, "textPrimary"),
                        backgroundColor: getColor(darkMode, "backgroundPrimary")
                    }}
                    autoFocus={false}
                    tabIndex={-1}
                    borderRadius="full"
                />
                <ModalBody
                    height="100%"
                    width="100%"
                >
                    <Flex
                        height="100%"
                        width="100%"
                        flexDirection="column"
                    >
                        <Input
                            darkMode={darkMode}
                            isMobile={isMobile}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder={i18n(lang, "newPassword")}
                            type="password"
                            isDisabled={loading}
                            onKeyDown={inputKeyDown}
                            maxLength={255}
                            color={getColor(darkMode, "textSecondary")}
                            _placeholder={{
                                color: getColor(darkMode, "textSecondary")
                            }}
                        />
                        <Input
                            darkMode={darkMode}
                            isMobile={isMobile}
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            marginTop="10px"
                            placeholder={i18n(lang, "confirmNewPassword")}
                            type="password"
                            isDisabled={loading}
                            onKeyDown={inputKeyDown}
                            maxLength={255}
                            color={getColor(darkMode, "textSecondary")}
                            _placeholder={{
                                color: getColor(darkMode, "textSecondary")
                            }}
                        />
                        <Input
                            darkMode={darkMode}
                            isMobile={isMobile}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            marginTop="10px"
                            placeholder={i18n(lang, "currentPassword")}
                            type="password"
                            isDisabled={loading}
                            onKeyDown={inputKeyDown}
                            color={getColor(darkMode, "textSecondary")}
                            _placeholder={{
                                color: getColor(darkMode, "textSecondary")
                            }}
                        />
                    </Flex>
                </ModalBody>
                <ModalFooter>
                    {
                        loading ? (
                            <Spinner
                                width="16px"
                                height="16px"
                                color={getColor(darkMode, "textPrimary")}
                            />
                        ) : (
                            <AppText
                                darkMode={darkMode}
                                isMobile={isMobile}
                                noOfLines={1}
                                wordBreak="break-all"
                                color={getColor(darkMode, "linkPrimary")}
                                cursor="pointer"
                                onClick={() => save()}
                            >
                                {i18n(lang, "save")}
                            </AppText>
                        )
                    }
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
})

export const DeleteAccountModal = memo(({ darkMode, isMobile, lang }: { darkMode: boolean, isMobile: boolean, lang: string }) => {
    const [open, setOpen] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)

    const deleteIt = async (): Promise<void> => {
        if(!window.confirm(i18n(lang, "areYouSure"))){
            return
        }

        setLoading(true)

        try{
            await deleteAccount()

            showToast("success", i18n(lang, "deleteAccountConfirm"), "bottom", 10000)
        }
        catch(e: any){
            console.error(e)

            showToast("error", e.toString(), "bottom", 5000)
        }

        setLoading(false)
    }

    useEffect(() => {
        const openListener = eventListener.on("openDeleteAccountModal", () => setOpen(true))

        return () => {
            openListener.remove()
        }
    }, [])
    
    return (
        <Modal
            onClose={() => setOpen(false)}
            isOpen={open}
            isCentered={true}
            size={isMobile ? "full" : "md"}
            blockScrollOnMount={false}
        >
            <ModalOverlay 
                backgroundColor="rgba(0, 0, 0, 0.4)"
            />
            <ModalContent
                backgroundColor={getColor(darkMode, "backgroundSecondary")}
                color={getColor(darkMode, "textSecondary")}
                borderRadius={isMobile ? "0px" : "5px"}
            >
                <ModalHeader
                    color={getColor(darkMode, "textPrimary")}
                >
                    {i18n(lang, "deleteAccount")}
                </ModalHeader>
                <ModalCloseButton
                    color={getColor(darkMode, "textSecondary")}
                    backgroundColor={getColor(darkMode, "backgroundTertiary")}
                    _hover={{
                        color: getColor(darkMode, "textPrimary"),
                        backgroundColor: getColor(darkMode, "backgroundPrimary")
                    }}
                    autoFocus={false}
                    tabIndex={-1}
                    borderRadius="full"
                />
                <ModalBody
                    height="100%"
                    width="100%"
                    alignItems="center"
                    justifyContent="center"
                >
                    {
                        loading ? (
                            <Spinner
                                width="32px"
                                height="32px"
                                color={getColor(darkMode, "textPrimary")}
                            />
                        ) : (
                            <AppText
                                darkMode={darkMode}
                                isMobile={isMobile}
                                color={getColor(darkMode, "textPrimary")}
                            >
                                {i18n(lang, "areYouSureDeleteAccount")}
                            </AppText>
                        )
                    }
                </ModalBody>
                {
                    !loading && (
                        <ModalFooter>
                            <AppText
                                darkMode={darkMode}
                                isMobile={isMobile}
                                noOfLines={1}
                                wordBreak="break-all"
                                color="red"
                                cursor="pointer"
                                onClick={() => deleteIt()}
                            >
                                {i18n(lang, "delete")}
                            </AppText>
                        </ModalFooter>
                    )
                }
            </ModalContent>
        </Modal>
    )
})

export const TwoFactorModal = memo(({ darkMode, isMobile, lang }: { darkMode: boolean, isMobile: boolean, lang: string }) => {
    const [open, setOpen] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [settings, setSettings] = useState<UserGetSettingsV1 | undefined>(undefined)
    const [code, setCode] = useState<string>("")

    const fetchSettings = async (): Promise<boolean> => {
        setSettings(undefined)

        try{
            const settings = await fetchUserSettings()

            if(settings.twoFactorEnabled == 1){
                setSettings(undefined)
                setOpen(false)

                return true
            }

            setSettings(settings)
        }
        catch(e: any){
            console.error(e)

            showToast("error", e.toString(), "bottom", 5000)
        }

        return true
    }

    const enable = async (): Promise<void> => {
        if(typeof settings == "undefined"){
            return
        }

        if(!code.trim()){
            showToast("error", i18n(lang, "invalid2FACode"), "bottom", 5000)

            return
        }

        try{
            const recoveryKey = await enable2FA(code.trim())

            eventListener.emit("open2FARecoveryInfoModal", recoveryKey)
        }
        catch(e: any){
            console.error(e)

            showToast("error", e.toString(), "bottom", 5000)
        }

        setCode("")
        setLoading(false)
    }

    const inputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if(e.which == 13 && code.length >= 6){
            enable()
        }
    }

    useEffect(() => {
        const openListener = eventListener.on("open2FAModal", () => {
            fetchSettings()
            setOpen(true)
        })

        return () => {
            openListener.remove()
        }
    }, [])
    
    return (
        <Modal
            onClose={() => setOpen(false)}
            isOpen={open}
            isCentered={true}
            size={isMobile ? "full" : "md"}
            blockScrollOnMount={false}
        >
            <ModalOverlay 
                backgroundColor="rgba(0, 0, 0, 0.4)"
            />
            <ModalContent
                backgroundColor={getColor(darkMode, "backgroundSecondary")}
                color={getColor(darkMode, "textSecondary")}
                borderRadius={isMobile ? "0px" : "5px"}
            >
                <ModalHeader
                    color={getColor(darkMode, "textPrimary")}
                >
                    {i18n(lang, "enable2FA")}
                </ModalHeader>
                <ModalCloseButton
                    color={getColor(darkMode, "textSecondary")}
                    backgroundColor={getColor(darkMode, "backgroundTertiary")}
                    _hover={{
                        color: getColor(darkMode, "textPrimary"),
                        backgroundColor: getColor(darkMode, "backgroundPrimary")
                    }}
                    autoFocus={false}
                    tabIndex={-1}
                    borderRadius="full"
                />
                <ModalBody
                    height="100%"
                    width="100%"
                    alignItems="center"
                    justifyContent="center"
                >
                    {
                        (typeof settings == "undefined" || loading) ? (
                            <Spinner
                                width="32px"
                                height="32px"
                                color={getColor(darkMode, "textPrimary")}
                            />
                        ) : (
                            <>
                                <Flex
                                    width="auto"
                                    height="350px"
                                    alignItems="center"
                                    justifyContent="center"
                                    backgroundColor="white"
                                >
                                    <QRCode
                                        value={"otpauth://totp/" + encodeURIComponent("Filen") + ":" + encodeURIComponent(settings.email) + "?secret=" + encodeURIComponent(settings.twoFactorKey) + "&issuer=" + encodeURIComponent("Filen") + "&digits=6&period=30"}
                                        size={256}
                                    />
                                </Flex>
                                <Flex
                                    flexDirection="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    marginTop="10px"
                                >
                                    <Input
                                        darkMode={darkMode}
                                        isMobile={isMobile}
                                        value={settings.twoFactorKey}
                                        type="text"
                                        onChange={() => {}}
                                        color={getColor(darkMode, "textSecondary")}
                                        _placeholder={{
                                            color: getColor(darkMode, "textSecondary")
                                        }}
                                    />
                                    <Button
                                        onClick={() => {
                                            try{
                                                navigator.clipboard.writeText(settings.twoFactorKey)

                                                showToast("success", i18n(lang, "copied"), "bottom", 3000)
                                            }
                                            catch(e){
                                                console.error(e)
                                            }
                                        }}
                                        marginLeft="15px"
                                    >
                                        {i18n(lang, "copy")}
                                    </Button>
                                </Flex>
                                <Input
                                    darkMode={darkMode}
                                    isMobile={isMobile}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    type="number"
                                    isDisabled={loading}
                                    placeholder={i18n(lang, "enter2FA")}
                                    marginTop="25px"
                                    onKeyDown={inputKeyDown}
                                    maxLength={6}
                                    color={getColor(darkMode, "textSecondary")}
                                    _placeholder={{
                                        color: getColor(darkMode, "textSecondary")
                                    }}
                                />
                            </>
                        )
                    }
                </ModalBody>
                {
                    typeof settings !== "undefined" && !loading && (
                        <ModalFooter>
                            <AppText
                                darkMode={darkMode}
                                isMobile={isMobile}
                                noOfLines={1}
                                wordBreak="break-all"
                                color={getColor(darkMode, "linkPrimary")}
                                cursor="pointer"
                                onClick={() => enable()}
                            >
                                {i18n(lang, "enable")}
                            </AppText>
                        </ModalFooter>
                    )
                }
            </ModalContent>
        </Modal>
    )
})

export const TwoFactorRecoveryInfoModal = memo(({ darkMode, isMobile, lang }: { darkMode: boolean, isMobile: boolean, lang: string }) => {
    const [open, setOpen] = useState<boolean>(false)
    const [key, setKey] = useState<string>("")

    useEffect(() => {
        const openListener = eventListener.on("open2FARecoveryInfoModal", (key: string) => {
            setKey(key)
            setOpen(true)
        })

        return () => {
            openListener.remove()
        }
    }, [])
    
    return (
        <Modal
            onClose={() => setOpen(false)}
            isOpen={open}
            isCentered={true}
            size={isMobile ? "full" : "md"}
            blockScrollOnMount={false}
            closeOnEsc={false}
            closeOnOverlayClick={false}
        >
            <ModalOverlay 
                backgroundColor="rgba(0, 0, 0, 0.4)"
            />
            <ModalContent
                backgroundColor={getColor(darkMode, "backgroundSecondary")}
                color={getColor(darkMode, "textSecondary")}
                borderRadius={isMobile ? "0px" : "5px"}
            >
                <ModalHeader
                    color={getColor(darkMode, "textPrimary")}
                >
                    {i18n(lang, "recoveryKeys")}
                </ModalHeader>
                <ModalBody
                    height="100%"
                    width="100%"
                    alignItems="center"
                    justifyContent="center"
                >
                    <Flex
                        flexDirection="row"
                        justifyContent="space-between"
                        alignItems="center"
                    >
                        <Input
                            darkMode={darkMode}
                            isMobile={isMobile}
                            value={key}
                            type="text"
                            onChange={() => {}}
                            color={getColor(darkMode, "textSecondary")}
                            _placeholder={{
                                color: getColor(darkMode, "textSecondary")
                            }}
                        />
                        <Button
                            onClick={() => {
                                try{
                                    navigator.clipboard.writeText(key)

                                    showToast("success", i18n(lang, "copied"), "bottom", 3000)
                                }
                                catch(e){
                                    console.error(e)
                                }
                            }}
                            marginLeft="15px"
                        >
                            {i18n(lang, "copy")}
                        </Button>
                    </Flex>
                    <AppText
                        darkMode={darkMode}
                        isMobile={isMobile}
                        color={getColor(darkMode, "textSecondary")}
                        marginTop="15px"
                    >
                        {i18n(lang, "recoveryKeysInfo")}
                    </AppText>
                </ModalBody>
                <ModalFooter>
                    <AppText
                        darkMode={darkMode}
                        isMobile={isMobile}
                        noOfLines={1}
                        wordBreak="break-all"
                        color={getColor(darkMode, "linkPrimary")}
                        cursor="pointer"
                        onClick={() => {
                            if(window.confirm("I have savely stored my 2FA recovery key")){
                                setOpen(false)
                            }
                        }}
                    >
                        {i18n(lang, "close")}
                    </AppText>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
})

export const DisableTwoFactorModal = memo(({ darkMode, isMobile, lang }: { darkMode: boolean, isMobile: boolean, lang: string }) => {
    const [open, setOpen] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [code, setCode] = useState<string>("")

    const disable = async (): Promise<void> => {
        if(!window.confirm(i18n(lang, "areYouSure"))){
            return
        }

        if(!code.trim()){
            showToast("error", i18n(lang, "invalid2FACode"), "bottom", 5000)

            return
        }

        try{
            await disable2FA(code.trim())

            eventListener.emit("reloadAccountSecurity")
        }
        catch(e: any){
            console.error(e)

            showToast("error", e.toString(), "bottom", 5000)
        }

        setCode("")
        setLoading(false)
    }

    const inputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if(e.which == 13 && code.length >= 6){
            disable()
        }
    }

    useEffect(() => {
        const openListener = eventListener.on("openDisable2FAModal", () => setOpen(true))

        return () => {
            openListener.remove()
        }
    }, [])
    
    return (
        <Modal
            onClose={() => setOpen(false)}
            isOpen={open}
            isCentered={true}
            size={isMobile ? "full" : "md"}
            blockScrollOnMount={false}
        >
            <ModalOverlay 
                backgroundColor="rgba(0, 0, 0, 0.4)"
            />
            <ModalContent
                backgroundColor={getColor(darkMode, "backgroundSecondary")}
                color={getColor(darkMode, "textSecondary")}
                borderRadius={isMobile ? "0px" : "5px"}
            >
                <ModalHeader
                    color={getColor(darkMode, "textPrimary")}
                >
                    {i18n(lang, "disable2FA")}
                </ModalHeader>
                <ModalCloseButton
                    color={getColor(darkMode, "textSecondary")}
                    backgroundColor={getColor(darkMode, "backgroundTertiary")}
                    _hover={{
                        color: getColor(darkMode, "textPrimary"),
                        backgroundColor: getColor(darkMode, "backgroundPrimary")
                    }}
                    autoFocus={false}
                    tabIndex={-1}
                    borderRadius="full"
                />
                <ModalBody
                    height="100%"
                    width="100%"
                    alignItems="center"
                    justifyContent="center"
                >
                    {
                        loading ? (
                            <Spinner
                                width="32px"
                                height="32px"
                                color={getColor(darkMode, "textPrimary")}
                            />
                        ) : (
                            <>
                                <Input
                                    darkMode={darkMode}
                                    isMobile={isMobile}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    type="number"
                                    isDisabled={loading}
                                    placeholder={i18n(lang, "enter2FA")}
                                    onKeyDown={inputKeyDown}
                                    maxLength={6}
                                    color={getColor(darkMode, "textSecondary")}
                                    _placeholder={{
                                        color: getColor(darkMode, "textSecondary")
                                    }}
                                />
                            </>
                        )
                    }
                </ModalBody>
                {
                    !loading && (
                        <ModalFooter>
                            <AppText
                                darkMode={darkMode}
                                isMobile={isMobile}
                                noOfLines={1}
                                wordBreak="break-all"
                                color="red"
                                cursor="pointer"
                                onClick={() => disable()}
                            >
                                {i18n(lang, "disable")}
                            </AppText>
                        </ModalFooter>
                    )
                }
            </ModalContent>
        </Modal>
    )
})

export const ExportMasterKeysModal = memo(({ darkMode, isMobile, lang }: { darkMode: boolean, isMobile: boolean, lang: string }) => {
    const [open, setOpen] = useState<boolean>(false)
    const [masterKeys, setMasterKeys] = useDb("masterKeys", [])

    const copy = (text: string) => {
        try{
            navigator.clipboard.writeText(text)

            showToast("success", i18n(lang, "copied"), "bottom", 3000)
        }
        catch(e){
            console.error(e)
        }
    }

    useEffect(() => {
        const openExportMasterKeysModalListener = eventListener.on("openExportMasterKeysModal", () => {
            setOpen(true)
        })
        
        return () => {
            openExportMasterKeysModalListener.remove()
        }
    }, [])

    return (
        <Modal
            onClose={() => setOpen(false)}
            isOpen={open}
            isCentered={true}
            size={isMobile ? "full" : "md"}
            autoFocus={false}
        >
            <ModalOverlay 
                backgroundColor="rgba(0, 0, 0, 0.4)"
            />
            <ModalContent
                backgroundColor={getColor(darkMode, "backgroundSecondary")}
                color={getColor(darkMode, "textSecondary")}
                borderRadius={isMobile ? "0px" : "5px"}
            >
                <ModalHeader
                    color={getColor(darkMode, "textPrimary")}
                >
                    {i18n(lang, "exportMasterKeys")}
                </ModalHeader>
                <ModalCloseButton
                    color={getColor(darkMode, "textSecondary")}
                    backgroundColor={getColor(darkMode, "backgroundTertiary")}
                    _hover={{
                        color: getColor(darkMode, "textPrimary"),
                        backgroundColor: getColor(darkMode, "backgroundPrimary")
                    }}
                    autoFocus={false}
                    tabIndex={-1}
                    borderRadius="full"
                />
                <ModalBody
                    height="100%"
                    width="100%"
                >
                    <Flex
                        flexDirection="column"
                    >
                        <Flex
                            width="100%"
                            padding="10px"
                            paddingLeft="15px"
                            paddingRight="15px"
                            borderRadius="10px"
                            backgroundColor={getColor(darkMode, "backgroundTertiary")}
                            boxShadow="sm"
                            cursor="pointer"
                            onClick={() => copy(Base64.encode(masterKeys.join("|")))}
                        >
                            <AppText
                                darkMode={darkMode}
                                isMobile={isMobile}
                                color={getColor(darkMode, "textSecondary")}
                                wordBreak="break-all"
                            >
                                {Base64.encode(masterKeys.join("|"))}
                            </AppText>
                        </Flex>
                        <Button
                            onClick={() => copy(Base64.encode(masterKeys.join("|")))}
                            marginTop="15px"
                        >
                            {i18n(lang, "copy")}
                        </Button>
                    </Flex>
                </ModalBody>
                <ModalFooter>
                    <AppText
                        darkMode={darkMode}
                        isMobile={isMobile}
                        noOfLines={1}
                        wordBreak="break-all"
                        color={getColor(darkMode, "textSecondary")}
                        cursor="pointer"
                        onClick={() => setOpen(false)}
                        _hover={{
                            color: getColor(darkMode, "textPrimary")
                        }}
                    >
                        {i18n(lang, "close")}
                    </AppText>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
})