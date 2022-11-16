import type { ItemProps, FolderColors } from "../../../types"
import { show as showToast, dismiss as dismissToast } from "../../../components/Toast/Toast"
import eventListener from "../../eventListener"
import { changeFolderColor } from "../../api"
import { ONE_YEAR } from "../../constants"
import { getLang } from "../../helpers"
import { i18n } from "../../../i18n"
import { changeItemsInStore } from "../metadata"

export const changeColor = async (items: ItemProps[], color: FolderColors) => {
    const lang: string = getLang()

    const toastId = showToast("loading", i18n(lang, "changingColor", true, ["__COUNT__"], [items.length.toString()]), "bottom", ONE_YEAR)

    const promises = []
    const changed: ItemProps[] = []

    for(let i = 0; i < items.length; i++){
        promises.push(new Promise((resolve, reject) => {
            changeFolderColor(items[i], color).then(() => {
                changed.push(items[i])

                return resolve(items[i])
            }).catch((err) => {
                return reject({
                    err,
                    item: items[i]
                })
            })
        }))
    }

    const results = await Promise.allSettled(promises)
    const error = results.filter(result => result.status == "rejected") as { status: string, reason: { err: Error, item: ItemProps } }[]

    if(error.length > 0){
        for(let i = 0; i < error.length; i++){
            showToast("error", i18n(lang, "couldNotChangeColor", true, ["__NAME__", "__ERR__"], [error[i].reason.item.name, error[i].reason.err.toString()]), "bottom", 5000)
        }
    }

    if(changed.length > 0){
        for(let i = 0; i < changed.length; i++){
            eventListener.emit("itemColorChanged", {
                item: changed[i],
                color
            })

            changeItemsInStore([{
                ...changed[i],
                color,
                selected: false
            }], changed[i].parent).catch(console.error)
        }
    }

    dismissToast(toastId)
}