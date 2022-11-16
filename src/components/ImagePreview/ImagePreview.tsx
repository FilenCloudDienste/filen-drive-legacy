import { memo, useState } from "react"
import { Flex, Image } from "@chakra-ui/react"

const ZOOM_SPEED = 0.1

const ImagePreview = memo(({ image, maxWidth, maxHeight }: { image: string, maxWidth?: number, maxHeight?: number }) => {
    const [imageZoom, setImageZoom] = useState<number>(1)
    const [imagePressed, setImagePressed] = useState<boolean>(false)
    const [imagePosition, setImagePosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 })

    return (
        <Flex
            width={maxWidth ? maxWidth + "px" : "100%"}
            height={maxHeight ? maxHeight + "px" : "100%"}
            overflow="hidden"
            alignItems="center"
            justifyContent="center"
            onWheel={(e) => {
                if(e.deltaY > 0){    
                    setImageZoom(prev => prev + ZOOM_SPEED)
                }
                else{    
                    setImageZoom(prev => prev - ZOOM_SPEED)
                }
            }}
        >
            <Image
                src={image}
                maxWidth={maxWidth ? maxWidth + "px" : "100%"}
                maxHeight={maxHeight ? maxHeight + "px" : "100%"}
                objectFit="contain"
                position="relative"
                transform={"scale(" + imageZoom + ") translate(" + imagePosition.x + "px, " + imagePosition.y + "px)"}
                onMouseDown={() => setImagePressed(true)}
                onMouseUp={() => setImagePressed(false)}
                draggable={false}
                cursor="move"
                onDoubleClick={() => {
                    if(imageZoom <= 1){
                        setImagePressed(false)
                        setImagePosition({
                            x: 0,
                            y: 0
                        })
                        setImageZoom(2)
                    }
                    else{
                        setImagePressed(false)
                        setImagePosition({
                            x: 0,
                            y: 0
                        })
                        setImageZoom(1)
                    }
                }}
                onMouseMove={(e) => {
                    if(imagePressed){
                        setImagePosition({
                            x: imagePosition.x + e.movementX,
                            y: imagePosition.y + e.movementY
                        })
                    }
                }}
            />
        </Flex>
    )
})

export default ImagePreview