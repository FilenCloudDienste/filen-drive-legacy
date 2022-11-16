export interface Colors {
    [key: string]: {
        textPrimary: string,
        textSecondary: string
    }
}

const colors: any = {
    light: {
        textPrimary: "#000000",
        textSecondary: "#6f6f6f",
        backgroundPrimary: "#FFFFFF",
        backgroundSecondary: "#f0f0f0",
        backgroundTertiary: "#FAFAFA",
        borderPrimary: "rgba(0, 0, 0, 0.08)",
        borderSecondary: "rgba(0, 0, 0, 0.08)",
        borderActive: "rgba(0, 0, 0, 0.3)",
        linkPrimary: "#2997ff",
        dragSelect: "rgb(21, 21, 21, 0.15)"
    },
    dark: {
        textPrimary: "#ffffff",
        textSecondary: "#959595",
        backgroundPrimary: "#050505",
        backgroundSecondary: "#141414",
        backgroundTertiary: "#1d1d1d",
        borderPrimary: "rgba(255, 255, 255, 0.06)",
        borderSecondary: "rgba(255, 255, 255, 0.06)",
        borderActive: "rgba(255, 255, 255, 0.28)",
        linkPrimary: "#2997ff",
        dragSelect: "rgb(21, 21, 21, 0.5)"
    }
}

export const mainGradient = {
    a: "#7928CA",
    b: "#FF0080"
}

export const getColor = (darkMode: boolean, type: string): string => {
    if(!colors[darkMode ? "dark" : "light"][type]){
        return darkMode ? "white" : "black"
    }

    return colors[darkMode ? "dark" : "light"][type]
}

export default colors