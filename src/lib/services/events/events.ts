import { i18n } from "../../../i18n"
import { decryptFileMetadata, decryptFolderName } from "../../worker/worker.com"
import striptags from "striptags"

export const eventTypes = (lang: string | undefined = "en"): { [key: string]: string } => {
    return {
        fileUploaded: i18n(lang, "eventFileUploaded"),
        fileVersioned: i18n(lang, "eventFileVersioned"),
        versionedFileRestored: i18n(lang, "eventVersionedFileRestored"),
        fileMoved: i18n(lang, "eventFileMoved"),
        fileRenamed: i18n(lang, "eventFileRenamed"),
        fileTrash: i18n(lang, "eventFileTrash"),
        fileRm: i18n(lang, "eventFileRm"),
        fileRestored: i18n(lang, "eventFileRestored"),
        fileShared: i18n(lang, "eventFileShared"),
        fileLinkEdited: i18n(lang, "eventFileLinkEdited"),
        folderTrash: i18n(lang, "eventFolderTrash"),
        folderShared: i18n(lang, "eventFolderShared"),
        folderMoved: i18n(lang, "eventFolderMoved"),
        folderRenamed: i18n(lang, "eventFolderRenamed"),
        subFolderCreated: i18n(lang, "eventFolderCreated"),
        baseFolderCreated: i18n(lang, "eventFolderCreated"),
        folderRestored: i18n(lang, "eventFolderRestored"),
        folderColorChanged: i18n(lang, "eventFolderColorChanged"),
        login: i18n(lang, "eventLogin"),
        deleteVersioned: i18n(lang, "eventDeleteVersioned"),
        deleteAll: i18n(lang, "eventDeleteAll"),
        deleteUnfinished: i18n(lang, "eventDeleteUnfinished"),
        trashEmptied: i18n(lang, "eventTrashEmptied"),
        requestAccountDeletion: i18n(lang, "eventRequestAccountDeletion"),
        "2faEnabled": i18n(lang, "event2FAEnabled"),
        "2faDisabled": i18n(lang, "event2FADisabled"),
        codeRedeem: i18n(lang, "eventCodeRedeem"),
        emailChanged: i18n(lang, "eventEmailChanged"),
        passwordChanged: i18n(lang, "eventPasswordChanged"),
        removedSharedInItems: i18n(lang, "eventRemovedSharedInItems"),
        removedSharedOutItems: i18n(lang, "eventRemovedSharedOutItems")
    }
}

export interface GetEventText {
    item: any,
    masterKeys: string[],
    lang: string | undefined
}

export const getEventText = async ({ item, masterKeys, lang }: GetEventText) => {
    let eventText = ""
    let decrypted: any = undefined
    let decryptedOld: any = undefined

    switch(item.type){
        case "fileUploaded":
            decrypted = await decryptFileMetadata(item.info.metadata, masterKeys)
            eventText = i18n(lang, "eventFileUploadedInfo", true, ["__NAME__"], [striptags(decrypted.name)])
        break
        case "fileVersioned":
            decrypted = await decryptFileMetadata(item.info.metadata, masterKeys)
            eventText = i18n(lang, "eventFileVersionedInfo", true, ["__NAME__"], [striptags(decrypted.name)])
        break
        case "versionedFileRestored":
            decrypted = await decryptFileMetadata(item.info.metadata, masterKeys)
            eventText = i18n(lang, "eventVersionedFileRestoredInfo", true, ["__NAME__"], [striptags(decrypted.name)])
        break
        case "fileMoved":
            decrypted = await decryptFileMetadata(item.info.metadata, masterKeys)
            eventText = i18n(lang, "eventFileMovedInfo", true, ["__NAME__"], [striptags(decrypted.name)])
        break
        case "fileRenamed":
            decrypted = await decryptFileMetadata(item.info.metadata, masterKeys)
            decryptedOld = await decryptFileMetadata(item.info.oldMetadata, masterKeys)
            eventText = i18n(lang, "eventFileRenamedInfo", true, ["__NAME__", "__NEW__"], [striptags(decryptedOld.name), striptags(decrypted.name)])
        break
        case "fileTrash":
            decrypted = await decryptFileMetadata(item.info.metadata, masterKeys)
            eventText = i18n(lang, "eventFileTrashInfo", true, ["__NAME__"], [striptags(decrypted.name)])
        break
        case "fileRm":
            decrypted = await decryptFileMetadata(item.info.metadata, masterKeys)
            eventText = i18n(lang, "eventFileRmInfo", true, ["__NAME__"], [striptags(decrypted.name)])
        break
        case "fileRestored":
            decrypted = await decryptFileMetadata(item.info.metadata, masterKeys)
            eventText = i18n(lang, "eventFileRestoredInfo", true, ["__NAME__"], [striptags(decrypted.name)])
        break
        case "fileShared":
            decrypted = decrypted = await decryptFileMetadata(item.info.metadata, masterKeys)
            eventText = i18n(lang, "eventFileSharedInfo", true, ["__NAME__", "__EMAIL__"], [striptags(decrypted.name), item.info.receiverEmail])
        break
        case "fileLinkEdited":
            decrypted = decrypted = await decryptFileMetadata(item.info.metadata, masterKeys)
            eventText = i18n(lang, "eventFileLinkEditedInfo", true, ["__NAME__"], [striptags(decrypted.name)])
        break
        case "folderTrash":
            decrypted = await decryptFolderName(item.info.name, masterKeys)
            eventText = i18n(lang, "eventFolderTrashInfo", true, ["__NAME__"], [striptags(decrypted)])
        break
        case "folderShared":
            decrypted = await decryptFolderName(item.info.name, masterKeys)
            eventText = i18n(lang, "eventFolderSharedInfo", true, ["__NAME__", "__EMAIL__"], [striptags(decrypted), item.info.receiverEmail])
        break
        case "folderMoved":
            decrypted = await decryptFolderName(item.info.name, masterKeys)
            eventText = i18n(lang, "eventFolderMovedInfo", true, ["__NAME__"], [striptags(decrypted)])
        break
        case "folderRenamed":
            decrypted = await decryptFolderName(item.info.name, masterKeys)
            decryptedOld = await decryptFolderName(item.info.oldName, masterKeys)
            eventText = i18n(lang, "eventFolderRenamedInfo", true, ["__NAME__", "__NEW__"], [striptags(decryptedOld), striptags(decrypted)])
        break
        case "subFolderCreated":
        case "baseFolderCreated":
            decrypted = await decryptFolderName(item.info.name, masterKeys)
            eventText = i18n(lang, "eventFolderCreatedInfo", true, ["__NAME__"], [striptags(decrypted)])
        break
        case "folderRestored":
            decrypted = await decryptFolderName(item.info.name, masterKeys)
            eventText = i18n(lang, "eventFolderRestoredInfo", true, ["__NAME__"], [striptags(decrypted)])
        break
        case "folderColorChanged":
            decrypted = await decryptFolderName(item.info.name, masterKeys)
            eventText = i18n(lang, "eventFolderColorChangedInfo", true, ["__NAME__"], [striptags(decrypted)])
        break
        case "login":
            eventText = i18n(lang, "eventLoginInfo")
        break
        case "deleteVersioned":
            eventText = i18n(lang, "eventDeleteVersionedInfo")
        break
        case "deleteAll":
            eventText = i18n(lang, "eventDeleteAllInfo")
        break
        case "deleteUnfinished":
            eventText = i18n(lang, "eventDeleteUnfinishedInfo")
        break
        case "trashEmptied":
            eventText = i18n(lang, "eventTrashEmptiedInfo")
        break
        case "requestAccountDeletion":
            eventText = i18n(lang, "eventRequestAccountDeletionInfo")
        break
        case "2faEnabled":
            eventText = i18n(lang, "event2FAEnabledInfo")
        break
        case "2faDisabled":
            eventText = i18n(lang, "event2FADisabledInfo")
        break
        case "codeRedeemed":
            eventText = i18n(lang, "eventCodeRedeemInfo", true, ["__CODE__"], [item.info.code])
        break
        case "emailChanged":
            eventText = i18n(lang, "eventEmailChangedInfo", true, ["__CODE__"], [item.info.email])
        break
        case "passwordChanged":
            eventText = i18n(lang, "eventPasswordChangedInfo")
        break
        case "removedSharedInItems":
            eventText = i18n(lang, "eventRemovedSharedInItemsInfo", true, ["__COUNT__", "__EMAIL__"], [item.info.count, item.info.sharerEmail])
        break
        case "removedSharedOutItems":
            eventText = i18n(lang, "eventRemovedSharedOutItemsInfo", true, ["__COUNT__", "__EMAIL__"], [item.info.count, item.info.receiverEmail])
        break
        default:
            eventText = item.type
        break
    }

    return eventText
}