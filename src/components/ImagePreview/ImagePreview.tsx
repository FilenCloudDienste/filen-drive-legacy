import { memo, useState, useRef } from "react"
import { Flex, Image } from "@chakra-ui/react"

const ZOOM_SPEED = 0.1

const ImagePreview = memo(
	({ image, maxWidth, maxHeight, draggable }: { image: string; maxWidth?: number; maxHeight?: number; draggable?: boolean }) => {
		const [imageZoom, setImageZoom] = useState<number>(1)
		const [imagePosition, setImagePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
		const ref = useRef<HTMLImageElement>(null)
		const [pressed, setPressed] = useState<boolean>(false)

		return (
			<Flex
				width={maxWidth ? maxWidth + "px" : "100%"}
				height={maxHeight ? maxHeight + "px" : "100%"}
				overflow="hidden"
				alignItems="center"
				justifyContent="center"
			>
				<Image
					ref={ref}
					src={image}
					maxWidth={maxWidth ? maxWidth + "px" : "100%"}
					maxHeight={maxHeight ? maxHeight + "px" : "100%"}
					objectFit="contain"
					position="relative"
					transform={"scale(" + imageZoom + ") translate(" + imagePosition.x + "px, " + imagePosition.y + "px)"}
					draggable={false}
					cursor={window.location.href.indexOf("?embed") !== -1 ? "auto" : "zoom-in"}
					onMouseDown={() => setPressed(true)}
					onMouseUp={() => setPressed(false)}
					onMouseLeave={() => setPressed(false)}
					onMouseMove={e => {
						if (pressed && draggable) {
							setImagePosition(prev => ({
								x: prev.x + e.movementX,
								y: prev.y + e.movementY
							}))
						}
					}}
					onWheel={e => {
						if (window.location.href.indexOf("?embed") !== -1) {
							return
						}

						if (e.deltaY > 0) {
							setImageZoom(prev => {
								const newZoom = prev + ZOOM_SPEED

								return newZoom
							})
						} else {
							setImageZoom(prev => {
								let newZoom = prev - ZOOM_SPEED

								if (newZoom <= 0.1) {
									newZoom = 0.1
								}

								return newZoom
							})
						}
					}}
					onDoubleClick={() => {
						setImagePosition({
							x: 0,
							y: 0
						})

						if (imageZoom <= 1) {
							setImageZoom(2)
						} else {
							setImageZoom(1)
						}
					}}
				/>
			</Flex>
		)
	}
)

export default ImagePreview
