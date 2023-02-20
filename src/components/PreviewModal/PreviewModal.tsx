import { memo, useState, useEffect, useRef, useCallback } from "react"
import type { PreviewModalProps, ItemProps } from "../../types"
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalCloseButton, Flex } from "@chakra-ui/react"
import { getColor } from "../../styles/colors"
import eventListener from "../../lib/eventListener"
import { getFilePreviewType, getFileExt } from "../../lib/helpers"
import { downloadFile } from "../../lib/services/download"
import memoryCache from "../../lib/memoryCache"
import { BsArrowRight, BsArrowLeft } from "react-icons/bs"
import { convertHeic } from "../../lib/worker/worker.com"
import TextEditor from "./TextEditor"
import PDFViewer from "./PDFViewer"
import ImageViewer from "./ImageViewer"
import ErrorContainer from "./Error"
import VideoViewer from "./VideoViewer"
import AudioViewer from "./AudioViewer"
import { useMountedState } from "react-use"
import DocViewer from "./DocViewer"

const previewCache = new Map()
let blobURLs: string[] = []

const PreviewModal = memo(({ darkMode, isMobile, windowHeight, windowWidth, setItems, items, lang }: PreviewModalProps) => {
    const [open, setOpen] = useState<boolean>(false)
    const [type, setType] = useState<string>("")
    const [image, setImage] = useState<string>("")
    const uuid = useRef<string>("")
    const [next, setNext] = useState<ItemProps | null>(null)
    const [previous, setPrevious] = useState<ItemProps | null>(null)
    const currentItems = useRef<ItemProps[]>(items)
    const [text, setText] = useState<string>("")
    const [pdf, setPDF] = useState<string>("")
    const [currentItem, setCurrentItem] = useState<ItemProps>()
    const [error, setError] = useState<string>("")
    const [video, setVideo] = useState<string>("")
    const [audio, setAudio] = useState<string>("")
    const mounted = useMountedState()
    const isMounted = useRef<boolean>(false)
    const [doc, setDoc] = useState<string>("")

    const reset = useCallback((): void => {
        setImage("")
        setText("")
        setPDF("")
        setVideo("")
        setError("")
    }, [])

    const close = useCallback((): void => {
        reset()

        setOpen(false)
        setNext(null)
        setPrevious(null)
        setType("")
        setCurrentItem(undefined)

        previewCache.clear()
        memoryCache.remove("previewModalOpen")

        for(let i = 0; i < blobURLs.length; i++){
            window.URL.revokeObjectURL(blobURLs[i])
        }

        blobURLs = []
    }, [])

    const getFileBuffer = useCallback((item: ItemProps): Promise<Uint8Array> => {
        return new Promise((resolve, reject) => {
            if(previewCache.has("buffer:" + item.uuid)){
                if(!isMounted.current){
                    return reject(new Error("Not mounted"))
                }
                
                return resolve(previewCache.get("buffer:" + item.uuid))
            }

            const hideProgress = item.size < ((1024 * 1024) * 16)

            if(hideProgress){
                memoryCache.set("hideTransferProgress:" + item.uuid, true)
            }

            downloadFile(item, false).then((buffer) => {
                if(buffer instanceof Uint8Array){
                    if(hideProgress){
                        memoryCache.remove("hideTransferProgress:" + item.uuid)
                    }
                    
                    if(buffer.byteLength < (1024 * 1024 * 32)){
                        previewCache.set("buffer:" + item.uuid, buffer)
                    }

                    if(!isMounted.current){
                        return reject(new Error("Not mounted"))
                    }

                    return resolve(buffer)
                }
                else{
                    return reject(new Error("buffer !== Uint8Array"))
                }
            }).catch(reject)
        })
    }, [])

    const getNextItem = useCallback((uuid: string, type: string) => {
        for(let i = 0; i < currentItems.current.length; i++){
            if(currentItems.current[i].uuid == uuid){
                const next = currentItems.current[i + 1]

                if(typeof next == "object"){
                    if(typeof next.uuid == "string"){
                        if(getFilePreviewType(getFileExt(next.name)) == type){
                            return next
                        }
    
                        uuid = next.uuid
                    }
                }
            }
        }

        return null
    }, [])

    const getPreviousItem = useCallback((uuid: string, type: string) => {
        for(let i = (currentItems.current.length - 1); i >= 0; i--){
            if(currentItems.current[i].uuid == uuid){
                const previous = currentItems.current[i - 1]

                if(typeof previous == "object"){
                    if(typeof previous.uuid == "string"){
                        if(getFilePreviewType(getFileExt(previous.name)) == type){
                            return previous
                        }
    
                        uuid = previous.uuid
                    }
                }
            }
        }

        return null
    }, [])

    const loadPreview = useCallback((item: ItemProps) => {
        const previewType: string = getFilePreviewType(getFileExt(item.name))

        if(previewType == "none"){
            setError("No preview available for this file type")

            return
        }

        setOpen(true)

        memoryCache.set("previewModalOpen", true)

        uuid.current = item.uuid

        setNext(getNextItem(item.uuid, previewType))
        setPrevious(getPreviousItem(item.uuid, previewType))
        setItems(prev => prev.map(mapItem => mapItem.uuid == item.uuid ? { ...mapItem, seleted: true } : { ...mapItem, seleted: false }))
        setType(previewType)
        setCurrentItem(item)

        if(previewType == "image"){
            getFileBuffer(item).then(async (buffer) => {
                if(previewCache.has("url:" + item.uuid)){
                    setImage(previewCache.get("url:" + item.uuid))
                }

                try{
                    if(getFileExt(item.name) == "heic" || getFileExt(item.name) == "heif"){
                        const converted = await convertHeic(buffer, "JPEG")
                        const blob = new Blob([converted], {
                            type: "image/jpeg"
                        })
                        const url = window.URL.createObjectURL(blob)

                        blobURLs.push(url)

                        previewCache.set("url:" + item.uuid, url)

                        setImage(url)
                    }
                    else{
                        const blob = new Blob([buffer], {
                            type: item.mime
                        })
                        const url = window.URL.createObjectURL(blob)

                        blobURLs.push(url)

                        previewCache.set("url:" + item.uuid, url)

                        setImage(url)
                    }
                }
                catch(e: any){
                    console.error(e)

                    setError(e.toString())
                }
            }).catch((err) => {
                console.error(err)

                setError(err.toString())
            })
        }
        else if(previewType == "video"){
            getFileBuffer(item).then((buffer) => {
                try{
                    const blob = new Blob([buffer], {
                        type: item.mime
                    })
                    const url = window.URL.createObjectURL(blob)

                    blobURLs.push(url)

                    previewCache.set("url:" + item.uuid, url)

                    setVideo(url)
                }
                catch(e: any){
                    console.error(e)

                    setError(e.toString())
                }
            }).catch((err) => {
                console.error(err)

                setError(err.toString())
            })
        }
        else if(previewType == "audio"){
            getFileBuffer(item).then((buffer) => {
                try{
                    const blob = new Blob([buffer], {
                        type: item.mime
                    })
                    const url = window.URL.createObjectURL(blob)

                    blobURLs.push(url)

                    previewCache.set("url:" + item.uuid, url)

                    setAudio(url)
                }
                catch(e: any){
                    console.error(e)

                    setError(e.toString())
                }
            }).catch((err) => {
                console.error(err)

                setError(err.toString())
            })
        }
        else if(previewType == "text"){
            getFileBuffer(item).then((buffer) => {
                try{
                    memoryCache.set("textEditorChanged", false)

                    setText(new TextDecoder().decode(buffer))
                }
                catch(e: any){
                    console.error(e)

                    setError(e.toString())
                }
            }).catch((err) => {
                console.error(err)

                setError(err.toString())
            })
        }
        else if(previewType == "pdf"){
            getFileBuffer(item).then((buffer) => {
                if(previewCache.has("url:" + item.uuid)){
                    setPDF(previewCache.get("url:" + item.uuid))
                }

                try{
                    const blob = new Blob([buffer], {
                        type: item.mime
                    })
                    const url = window.URL.createObjectURL(blob)

                    blobURLs.push(url)

                    previewCache.set("url:" + item.uuid, url)

                    setPDF(url)
                }
                catch(e: any){
                    console.error(e)

                    setError(e.toString())
                }
            }).catch((err) => {
                console.error(err)

                setError(err.toString())
            })
        }
        else if(previewType == "doc"){
            getFileBuffer(item).then((buffer) => {
                if(previewCache.has("url:" + item.uuid)){
                    setDoc(previewCache.get("url:" + item.uuid))
                }

                try{
                    const blob = new Blob([buffer], {
                        type: item.mime
                    })
                    const url = window.URL.createObjectURL(blob)

                    blobURLs.push(url)

                    previewCache.set("url:" + item.uuid, url)

                    setDoc(url)
                }
                catch(e: any){
                    console.error(e)

                    setError(e.toString())
                }
            }).catch((err) => {
                console.error(err)

                setError(err.toString())
            })
        }
        else{
            setError("No preview available for this file type")
        }
    }, [])

    const windowOnKeyDown = useCallback((e: KeyboardEvent) => {
        if(e.which == 37){
            if(document.getElementById("preview-previous")){
                document.getElementById("preview-previous")?.click()
            }
        }

        if(e.which == 39){
            if(document.getElementById("preview-next")){
                document.getElementById("preview-next")?.click()
            }
        }
    }, [])

    useEffect(() => {
        isMounted.current = (mounted() || open)
    }, [mounted(), open])

    useEffect(() => {
        currentItems.current = items
    }, [items])

    useEffect(() => {
        const openPreviewModalListener = eventListener.on("openPreviewModal", ({ item, items: passedItems }: { item: ItemProps, items: ItemProps[] }) => {
            loadPreview(item)
        })

        const closePreviewModalListener = eventListener.on("closePreviewModal", () => close())

        window.addEventListener("keydown", windowOnKeyDown)
        
        return () => {
            openPreviewModalListener.remove()
            closePreviewModalListener.remove()

            window.removeEventListener("keydown", windowOnKeyDown)
        }
    }, [])

    return (
        <Modal
            onClose={() => {
                if(type == "text" && memoryCache.get("textEditorChanged")){
                    eventListener.emit("previewModalBeforeClose")

                    return
                }

                memoryCache.set("textEditorChanged", false)
                
                close()
            }}
            isOpen={open}
            size="full"
        >
            <ModalOverlay 
                backgroundColor="rgba(0, 0, 0, 0.4)"
            />
            <ModalContent
                backgroundColor={getColor(darkMode, "backgroundPrimary")}
                color={getColor(darkMode, "textSecondary")}
                borderRadius="0px"
                padding="0px"
                overflow="hidden"
            >
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
                    zIndex={1000001}
                />
                <ModalBody
                    padding="0px"
                >
                    <Flex
                        height={windowHeight + "px"}
                        width={windowWidth + "px"}
                        alignItems="center"
                        justifyContent="center"
                        overflow="hidden"
                    >
                        {
                            error.length == 0 ? (
                                <>
                                    {
                                        previous !== null && !["text", "pdf"].includes(type) && (
                                            <Flex
                                                position="absolute"
                                                top="50%"
                                                left="1%"
                                                cursor="pointer"
                                                padding="12px"
                                                borderRadius="50%"
                                                color={getColor(darkMode, "textSecondary")}
                                                backgroundColor={getColor(darkMode, "backgroundSecondary")}
                                                transition="200ms"
                                                zIndex={1000001}
                                                id="preview-previous"
                                                onClick={() => {
                                                    const previous = getPreviousItem(uuid.current, type)

                                                    if(previous !== null){
                                                        reset()
                                                        loadPreview(previous)
                                                    }
                                                }}
                                                _hover={{
                                                    color: getColor(darkMode, "textPrimary"),
                                                    backgroundColor: getColor(darkMode, "backgroundTertiary")
                                                }}
                                            >
                                                <BsArrowLeft
                                                    fontSize={18}
                                                    color={getColor(darkMode, "textPrimary")}
                                                />
                                            </Flex>
                                        )
                                    }
                                    {
                                        next !== null && !["text", "pdf"].includes(type) && (
                                            <Flex
                                                position="absolute"
                                                top="50%"
                                                right="1%"
                                                cursor="pointer"
                                                padding="12px"
                                                borderRadius="50%"
                                                color={getColor(darkMode, "textSecondary")}
                                                backgroundColor={getColor(darkMode, "backgroundSecondary")}
                                                transition="200ms"
                                                zIndex={1000001}
                                                id="preview-next"
                                                onClick={() => {
                                                    const next = getNextItem(uuid.current, type)

                                                    if(next !== null){
                                                        reset()
                                                        loadPreview(next)
                                                    }
                                                }}
                                                _hover={{
                                                    color: getColor(darkMode, "textPrimary"),
                                                    backgroundColor: getColor(darkMode, "backgroundTertiary")
                                                }}
                                            >
                                                <BsArrowRight
                                                    fontSize={18}
                                                    color={getColor(darkMode, "textPrimary")}
                                                />
                                            </Flex>
                                        )
                                    }
                                    {
                                        (type == "image" && typeof currentItem !== "undefined") && (
                                            <ImageViewer
                                                darkMode={darkMode}
                                                isMobile={isMobile}
                                                windowWidth={windowWidth}
                                                windowHeight={windowHeight}
                                                currentItem={currentItem}
                                                image={image}
                                            />
                                        )
                                    }
                                    {
                                        (type == "video" && typeof currentItem !== "undefined") && (
                                            <VideoViewer
                                                darkMode={darkMode}
                                                isMobile={isMobile}
                                                windowWidth={windowWidth}
                                                windowHeight={windowHeight}
                                                currentItem={currentItem}
                                                video={video}
                                            />
                                        )
                                    }
                                    {
                                        (type == "text" && typeof currentItem !== "undefined") && (
                                            <TextEditor
                                                darkMode={darkMode}
                                                isMobile={isMobile}
                                                windowWidth={windowWidth}
                                                windowHeight={windowHeight}
                                                currentItem={currentItem}
                                                text={text}
                                                lang={lang}
                                            />
                                        )
                                    }
                                    {
                                        (type == "pdf" && typeof currentItem !== "undefined") && (
                                            <PDFViewer
                                                darkMode={darkMode}
                                                isMobile={isMobile}
                                                windowWidth={windowWidth}
                                                windowHeight={windowHeight}
                                                currentItem={currentItem}
                                                pdf={pdf}
                                            />
                                        )
                                    }
                                    {
                                        (type == "audio" && typeof currentItem !== "undefined") && (
                                            <AudioViewer
                                                darkMode={darkMode}
                                                isMobile={isMobile}
                                                windowWidth={windowWidth}
                                                windowHeight={windowHeight}
                                                currentItem={currentItem}
                                                audio={audio}
                                            />
                                        )
                                    }
                                    {
                                        (type == "doc" && typeof currentItem !== "undefined") && (
                                            <DocViewer
                                                darkMode={darkMode}
                                                isMobile={isMobile}
                                                windowWidth={windowWidth}
                                                windowHeight={windowHeight}
                                                currentItem={currentItem}
                                                doc={doc}
                                            />
                                        )
                                    }
                                </>
                            ) : (
                                <ErrorContainer
                                    darkMode={darkMode}
                                    isMobile={isMobile}
                                    windowWidth={windowWidth}
                                    windowHeight={windowHeight}
                                    currentItem={currentItem}
                                    error={error}
                                    lang={lang}
                                />
                            )
                        }
                    </Flex>
                </ModalBody>
            </ModalContent>
        </Modal>
    )
})

export default PreviewModal