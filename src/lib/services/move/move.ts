import type { ItemProps } from "../../../types"
import { moveFile, moveFolder, folderExists } from "../../api"
import { show as showToast, dismiss as dismissToast } from "../../../components/Toast/Toast"
import eventListener from "../../eventListener"
import { ONE_YEAR } from "../../constants"
import { getLang } from "../../helpers"
import { i18n } from "../../../i18n"
import { addItemsToStore, removeItemsFromStore } from "../metadata"

export const moveToParent = async (items: ItemProps[], parent: string): Promise<void> => {
    const lang: string = getLang()

    if(items.filter(item => item.uuid == parent || item.parent == parent).length > 0){
        //showToast("error", i18n(lang, "pleaseChooseDiffDest"), "bottom", 5000)

        return
    }

    const toastId = showToast("loading", i18n(lang, "movingItems", true, ["__COUNT__"], [items.length.toString()]), "bottom", ONE_YEAR)

    for(let i = 0; i < items.length; i++){
        if(items[i].type == "folder"){
            const exists = await folderExists({ name: items[i].name, parent })

            if(exists.exists){
                showToast("error", i18n(lang, "folderExistsAtDest", true, ["__NAME__"], [items[i].name]), "bottom", 5000)

                dismissToast(toastId)

                return
            }
        }
    }

    const promises = []
    const moved: { item: ItemProps, from: string, to: string }[] = []

    for(let i = 0; i < items.length; i++){
        promises.push(new Promise((resolve, reject) => {
            const promise = items[i].type == "file" ? moveFile({ file: items[i], parent, emitEvents: false }) : moveFolder({ folder: items[i], parent, emitEvents: false })

            promise.then(() => {
                moved.push({
                    item: items[i],
                    from: items[i].parent,
                    to: parent
                })

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
            showToast("error", i18n(lang, "couldNotMoveItem", true, ["__NAME__", "__ERR__"], [error[i].reason.item.name, error[i].reason.err.toString()]), "bottom", 5000)
        }
    }

    if(moved.length > 0){
        for(let i = 0; i < moved.length; i++){
            eventListener.emit("itemMoved", {
                item: moved[i].item,
                from: moved[i].from,
                to: parent
            })
        }

        for(let i = 0; i < moved.length; i++){
            removeItemsFromStore([moved[i].item], moved[i].from).catch(console.error)
            addItemsToStore([moved[i].item], moved[i].to).catch(console.error)
        }
    }

    dismissToast(toastId)
}