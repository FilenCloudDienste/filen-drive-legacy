import en from "./lang/en"
import de from "./lang/de"
import ja from "./lang/ja"

const translations: {
    [key: string]: any
} = {
    en,
    de,
    ja
}

export const i18n = (lang: string = "en", text: string, firstUpperCase: boolean = true, replaceFrom: string[] = [], replaceTo: string[] = []) => {
    if(typeof lang !== "string"){
        lang = "en"
    }
    
    let gotText = translations[lang][text]

    if(!gotText){
        if(translations['en'][text]){
            gotText = translations['en'][text]
        }
        else{
            console.warn("NO_TRANSLATION_FOUND_" + lang.toString() + "_" + text.toString())
            
            return "NO_TRANSLATION_FOUND_" + lang.toString() + "_" + text.toString()
        }
    }

    if(firstUpperCase){
        gotText = gotText.charAt(0).toUpperCase() + gotText.slice(1)
    }
    else{
        gotText = gotText.charAt(0).toLowerCase() + gotText.slice(1)
    }

    if(replaceFrom.length > 0 && replaceTo.length > 0){
        for(let i = 0; i < replaceFrom.length; i++){
            gotText = gotText.split(replaceFrom[i]).join(replaceTo[i])
        }
    }

    return gotText
}

export const isLanguageAvailable = (lang = "en") => {
    return typeof translations[lang] == "undefined" ? false : true
}
