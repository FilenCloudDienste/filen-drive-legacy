import { memo, useState, useEffect, useMemo } from "react"
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalCloseButton, Spinner, ModalFooter, ModalHeader, Flex } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import eventListener from "../../lib/eventListener"
import AppText from "../AppText"
import { show as showToast } from "../Toast/Toast"
import { buySub } from "../../lib/api"
import type { PaymentMethods } from "../../types"
import Button from "../Button"
import { i18n } from "../../i18n"

export interface PlanProps {
    id: number,
    name: string,
    cost: number,
    term: string,
    lifetime: boolean
}

const BuyModal = memo(({ darkMode, isMobile, lang }: { darkMode: boolean, isMobile: boolean, lang: string }) => {
    const [open, setOpen] = useState<boolean>(false)
    const [plan, setPlan] = useState<PlanProps | undefined>(undefined)
    const [activePaymentMethod, setActivePaymentMethod] = useState<PaymentMethods>("stripe")
    const [loadingPayURL, setLoadingPayURL] = useState<boolean>(false)

    const PAYMENT_METHODS: { [key: string]: string } = useMemo(() => {
        return {
            "stripe": i18n(lang, "stripe"),
            "paypal": i18n(lang, "paypal"),
            "crypto": i18n(lang, "crypto")
        }
    }, [lang])

    const buy = async () => {
        if(typeof plan == "undefined"){
            return
        }

        if(loadingPayURL){
            return
        }

        setLoadingPayURL(true)

        try{
            const url = await buySub(plan.id, activePaymentMethod, plan.lifetime)

            window.open(url, "_blank")

            setOpen(false)
        }
        catch(e: any){
            console.error(e)

            showToast("error", e.toString(), "bottom", 5000)
        }

        setLoadingPayURL(false)
    }

    useEffect(() => {
        const openBuyModalListener = eventListener.on("openBuyModal", (plan: PlanProps) => {
            setPlan(plan)
            setOpen(true)
            setActivePaymentMethod("stripe")
        })
        
        return () => {
            openBuyModalListener.remove()
        }
    }, [])

    if(typeof plan == "undefined"){
        return null
    }

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
                    {plan.name}
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
                    <AppText
                        darkMode={darkMode}
                        fontWeight="bold"
                        fontSize={18}
                        color={getColor(darkMode, "textPrimary")}
                        isMobile={isMobile}
                    >
                        {plan.cost}€ {plan.term == "monthly" ? i18n(lang, "monthlyRecurring", false) : plan.term == "annually" ? i18n(lang, "annuallyRecurring", false) : i18n(lang, "oneTimePayment", false)}
                    </AppText>
                    <AppText
                        darkMode={darkMode}
                        fontWeight="bold"
                        fontSize={14}
                        color={getColor(darkMode, "textSecondary")}
                        isMobile={isMobile}
                        marginTop="8px"
                    >
                        {
                            plan.term !== "lifetime"
                                ? i18n(lang, "buyRecurringInfo")
                                :  i18n(lang, "buyLifetimeInfo")
                        }
                    </AppText>
                    <Flex
                        maxWidth="100%"
                        justifyContent="center"
                        alignItems="center"
                        marginTop="40px"
                    >
                        <Flex
                            minWidth="200px"
                            height="auto"
                            backgroundColor={getColor(darkMode, "backgroundPrimary")}
                            flexDirection="row"
                            justifyContent="space-between"
                            alignItems="center"
                            padding="3px"
                            gap="5px"
                            borderRadius="10px"
                        >
                            {
                                Object.keys(PAYMENT_METHODS).map(method => {
                                    if(!plan.lifetime && method == "crypto"){
                                        return null
                                    }

                                    return (
                                        <Flex
                                            key={method}
                                            width="100%"
                                            height="100%"
                                            backgroundColor={activePaymentMethod == method ? getColor(darkMode, "backgroundSecondary") : "transparent"}
                                            padding="10px"
                                            paddingTop="5px"
                                            paddingBottom="5px"
                                            borderRadius="10px"
                                            transition="200ms"
                                            cursor="pointer"
                                            onClick={() => setActivePaymentMethod(method as PaymentMethods)}
                                            justifyContent="center"
                                        >
                                            <AppText
                                                darkMode={darkMode}
                                                fontWeight={activePaymentMethod == method ? "bold" : "normal"}
                                                fontSize={15}
                                                color={activePaymentMethod == method ? getColor(darkMode, "textPrimary") : getColor(darkMode, "textSecondary")}
                                                isMobile={isMobile}
                                            >
                                                {PAYMENT_METHODS[method]}
                                            </AppText>
                                        </Flex>
                                    )
                                })
                            }
                        </Flex>
                    </Flex>
                    <AppText
                        darkMode={darkMode}
                        fontWeight="bold"
                        fontSize={14}
                        color={getColor(darkMode, "textSecondary")}
                        isMobile={isMobile}
                        marginTop="40px"
                    >
                        {
                            activePaymentMethod == "paypal" && i18n(lang, "paypal")
                        }
                        {
                            activePaymentMethod == "stripe" && i18n(lang, "creditDebit")
                        }
                        {
                            activePaymentMethod == "crypto" && "Bitcoin, Ethereum, Litecoin, Bitcoin Cash, Dogecoin"
                        }
                    </AppText>
                </ModalBody>
                <ModalFooter>
                    <Button
                        darkMode={darkMode}
                        isMobile={isMobile}
                        height="45px"
                        width="100%"
                        onClick={() => buy()}
                        backgroundColor={darkMode ? "white" : "gray"}
                        color={darkMode ? "black" : "white"}
                        border={"1px solid " + (darkMode ? "white" : "gray")}
                        _hover={{
                            backgroundColor: getColor(darkMode, "backgroundSecondary"),
                            border: "1px solid " + (darkMode ? "white" : "gray"),
                            color: darkMode ? "white" : "gray"
                        }}
                        autoFocus={false}
                    >
                        {
                            loadingPayURL ? (
                                <Spinner
                                    width="16px"
                                    height="16px"
                                />
                            ) : i18n(lang, "buyNow")
                        }
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
})

export default BuyModal