import type { ItemProps } from "../../../types"
import { favoriteItem } from "../../api"
import { show as showToast, dismiss as dismissToast } from "../../../components/Toast/Toast"
import eventListener from "../../eventListener"
import { ONE_YEAR } from "../../constants"
import { getLang } from "../../helpers"
import { i18n } from "../../../i18n"
import { changeItemsInStore } from "../metadata"

export const markAsFavorite = async (items: ItemProps[], favorite: 0 | 1): Promise<void> => {
    const lang: string = getLang()

    const toastId = showToast("loading", i18n(lang, (favorite == 1 ? "favoritingItems" : "unfavoritingItems"), true, ["__COUNT__"], [items.length.toString()]), "bottom", ONE_YEAR)

    const promises = []
    const favorited: ItemProps[] = []

    for(let i = 0; i < items.length; i++){
        promises.push(new Promise((resolve, reject) => {
            favoriteItem({
                item: items[i],
                favorite,
                emitEvents: false
            }).then(() => {
                favorited.push(items[i])

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
            showToast("error", i18n(lang, "couldNotChangeFavStatus", true, ["__NAME__", "__ERR__"], [error[i].reason.item.name, error[i].reason.err.toString()]), "bottom", 5000)
        }
    }

    if(favorited.length > 0){
        for(let i = 0; i < favorited.length; i++){
            eventListener.emit("itemFavorited", {
                item: favorited[i],
                favorited: favorite
            })

            changeItemsInStore([{
                ...favorited[i],
                favorited: favorite,
                selected: false
            }], favorited[i].parent).catch(console.error)
        }
    }

    dismissToast(toastId)
}