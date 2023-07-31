import { getColor } from "./colors"

export const baseStyle = () => {
	return `
        .full-viewport {
            height: 100%;
            height: 100vh;
            height: 100dvh;
            width: 100%;
            width: 100vw;
            width: 100dvw;
        }
        
        .full-viewport-height {
            height: 100%;
            height: 100vh;
            height: 100dvh;
        }
        
        .full-viewport-width {
            width: 100%;
            width: 100vw;
            width: 100dvw;
        }

        aside.EmojiPickerReact.epr-main {
            border-width: 0px;
            z-index: 100001;
        }
    `
}

export const lightModeStyle = () => {
	return `
        * {
            scrollbar-width: auto;
            scrollbar-color: ${getColor(false, "backgroundTertiary")} transparent;
        }

        *::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }

        *::-webkit-scrollbar-track {
            background: transparent;
        }

        *::-webkit-scrollbar-thumb {
            background-color: ${getColor(false, "backgroundTertiary")};
            border-radius: 5px;
            border: 3px solid transparent;
        }

        
    `
}

export const darkModeStyle = () => {
	return `
        * {
            scrollbar-width: auto;
            scrollbar-color: ${getColor(true, "backgroundTertiary")} transparent;
        }

        *::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }

        *::-webkit-scrollbar-track {
            background: transparent;
        }

        *::-webkit-scrollbar-thumb {
            background-color: ${getColor(true, "backgroundTertiary")};
            border-radius: 5px;
            border: 3px solid transparent;
        }
    `
}

export const contexifyStyle = () => {
	return `
        .react-contexify {
            padding: 0px;
            padding-top: 4px;
            padding-bottom: 4px;
            z-index: 10000001;
            border-radius: 5px;
        }
        
        .react-contexify__item__content {
            padding: 0px;
            padding-left: 10px;
            padding-right: 10px;
            padding-top: 5px;
            padding-bottom: 5px;
            text-overflow: ellipsis;
            font-size: 11pt;
        }
        
        .react-contexify .react-contexify__submenu {
            margin-left: -6px;
        }

        /* DARK */
        
        .react-contexify__theme--filendark {
            background-color: ${getColor(true, "backgroundSecondary")};
            border: 1px solid ${getColor(true, "borderPrimary")};
        }
        
        .react-contexify__theme--filendark .react-contexify__submenu {
            background-color: ${getColor(true, "backgroundSecondary")};
            border: 1px solid ${getColor(true, "borderPrimary")};
        }
        
        .react-contexify__theme--filendark .react-contexify__separator {
            background-color: ${getColor(true, "borderPrimary")};
        }
        
        .react-contexify__theme--filendark .react-contexify__item:not(.react-contexify__item--disabled):focus {
            background-color: ${getColor(true, "backgroundSecondary")};
            color: ${getColor(true, "textPrimary")};
        }
        
        .react-contexify__theme--filendark .react-contexify__item:not(.react-contexify__item--disabled):hover > .react-contexify__item__content,
        .react-contexify__theme--filendark .react-contexify__item:not(.react-contexify__item--disabled):focus > .react-contexify__item__content {
            background-color: ${getColor(true, "backgroundTertiary")};
            color: ${getColor(true, "textPrimary")};
        }
        
        .react-contexify__theme--filendark .react-contexify__item:not(.react-contexify__item--disabled):hover > .react-contexify__submenu {
            background-color: ${getColor(true, "backgroundSecondary")};
            color: ${getColor(true, "textPrimary")};
            border: 1px solid ${getColor(true, "borderPrimary")};
        }
        
        .react-contexify__theme--filendark .react-contexify__item__content {
            color: ${getColor(true, "textSecondary")};
        }

        /* LIGHT */
        
        .react-contexify__theme--filenlight {
            background-color: ${getColor(false, "backgroundSecondary")};
            border: 1px solid ${getColor(false, "borderPrimary")};
        }
        
        .react-contexify__theme--filenlight .react-contexify__submenu {
            background-color: ${getColor(false, "backgroundSecondary")};
            border: 1px solid ${getColor(false, "borderPrimary")};
        }
        
        .react-contexify__theme--filenlight .react-contexify__separator {
            background-color: ${getColor(false, "borderPrimary")};
        }
        
        .react-contexify__theme--filenlight .react-contexify__item:not(.react-contexify__item--disabled):focus {
            background-color: ${getColor(false, "backgroundSecondary")};
            color: ${getColor(false, "textPrimary")};
        }
        
        .react-contexify__theme--filenlight .react-contexify__item:not(.react-contexify__item--disabled):hover > .react-contexify__item__content,
        .react-contexify__theme--filenlight .react-contexify__item:not(.react-contexify__item--disabled):focus > .react-contexify__item__content {
            background-color: ${getColor(false, "backgroundTertiary")};
            color: ${getColor(false, "textPrimary")};
        }
        
        .react-contexify__theme--filenlight .react-contexify__item:not(.react-contexify__item--disabled):hover > .react-contexify__submenu {
            background-color: ${getColor(false, "backgroundSecondary")};
            color: ${getColor(false, "textPrimary")};
            border: 1px solid ${getColor(false, "borderPrimary")};
        }
        
        .react-contexify__theme--filenlight .react-contexify__item__content {
            color: ${getColor(false, "textSecondary")};
        } 
    `
}

export const quillStyle = (darkMode: boolean) => {
	return `
        .ql-container {
            font-size: 16px;
            font-family: "Inconsolata";
            font-weight: 400;
        }

        .ql-editor {
            user-select: text;
            font-family: "Inter", sans-serif;
        }

        .ql-toolbar.ql-snow {
            border: none;
            border-bottom: 1px solid ${getColor(darkMode, "borderPrimary")};
            font-size: 16px;
            font-family: "Inter", sans-serif;
            font-weight: 400;
        }

        .ql-snow .ql-picker {
            color: ${getColor(darkMode, "textSecondary")};
        }

        .ql-snow .ql-picker-options {
            background-color: ${getColor(darkMode, "backgroundSecondary")};
            border-radius: 5px;
            padding: 10px;
            padding-top: 0px;
            padding-bottom: 5px;
        }

        .ql-toolbar.ql-snow .ql-picker.ql-expanded .ql-picker-options {
            margin-top: 5px;
        }

        .ql-toolbar.ql-snow .ql-picker.ql-expanded .ql-picker-options {
            border-color: ${getColor(darkMode, "borderPrimary")};
        }

        .ql-formats > button:hover {
            color: ${getColor(darkMode, "purple")};
        }

        .ql-container.ql-snow {
            border: none;
        }

        .ql-snow .ql-tooltip {
            background-color: ${getColor(darkMode, "backgroundSecondary")};
            border-radius: 5px;
            border: 1px solid ${getColor(darkMode, "borderPrimary")};
            color: ${getColor(darkMode, "textSecondary")};
            box-shadow: none;
            padding: 5px 12px;
            white-space: nowrap;
            font-size: 16px;
            font-family: "Inter", sans-serif;
        }

        .ql-snow .ql-editor blockquote {
            border-left: 4px solid ${getColor(darkMode, "backgroundTertiary")};
        }

        .ql-snow .ql-tooltip input[type=text] {
            color: ${getColor(darkMode, "textSecondary")};
            background-color: ${getColor(darkMode, "backgroundSecondary")};
            border-radius: 3px;
            border: 1px solid ${getColor(darkMode, "borderPrimary")};
            font-size: 16px;
        }

        .ql-snow .ql-tooltip input[type=text]:focus, .ql-snow .ql-tooltip input[type=text]:active {
            outline: none;
            border: 1px solid ${getColor(darkMode, "backgroundTertiary")};
        }

        .ql-snow.ql-toolbar button:hover, .ql-snow .ql-toolbar button:hover, .ql-snow.ql-toolbar button:focus, .ql-snow .ql-toolbar button:focus, .ql-snow.ql-toolbar button.ql-active, .ql-snow .ql-toolbar button.ql-active, .ql-snow.ql-toolbar .ql-picker-label:hover, .ql-snow .ql-toolbar .ql-picker-label:hover, .ql-snow.ql-toolbar .ql-picker-label.ql-active, .ql-snow .ql-toolbar .ql-picker-label.ql-active, .ql-snow.ql-toolbar .ql-picker-item:hover, .ql-snow .ql-toolbar .ql-picker-item:hover, .ql-snow.ql-toolbar .ql-picker-item.ql-selected, .ql-snow .ql-toolbar .ql-picker-item.ql-selected {
            color: ${getColor(darkMode, "purple")};
        }

        .ql-snow.ql-toolbar button:hover,
        .ql-snow .ql-toolbar button:hover,
        .ql-snow.ql-toolbar button:focus,
        .ql-snow .ql-toolbar button:focus,
        .ql-snow.ql-toolbar button.ql-active,
        .ql-snow .ql-toolbar button.ql-active,
        .ql-snow.ql-toolbar .ql-picker-label:hover,
        .ql-snow .ql-toolbar .ql-picker-label:hover,
        .ql-snow.ql-toolbar .ql-picker-label.ql-active,
        .ql-snow .ql-toolbar .ql-picker-label.ql-active,
        .ql-snow.ql-toolbar .ql-picker-item:hover,
        .ql-snow .ql-toolbar .ql-picker-item:hover,
        .ql-snow.ql-toolbar .ql-picker-item.ql-selected,
        .ql-snow .ql-toolbar .ql-picker-item.ql-selected {
            color: ${getColor(darkMode, "purple")};
        }

        .ql-snow.ql-toolbar button:hover .ql-fill,
        .ql-snow .ql-toolbar button:hover .ql-fill,
        .ql-snow.ql-toolbar button:focus .ql-fill,
        .ql-snow .ql-toolbar button:focus .ql-fill,
        .ql-snow.ql-toolbar button.ql-active .ql-fill,
        .ql-snow .ql-toolbar button.ql-active .ql-fill,
        .ql-snow.ql-toolbar .ql-picker-label:hover .ql-fill,
        .ql-snow .ql-toolbar .ql-picker-label:hover .ql-fill,
        .ql-snow.ql-toolbar .ql-picker-label.ql-active .ql-fill,
        .ql-snow .ql-toolbar .ql-picker-label.ql-active .ql-fill,
        .ql-snow.ql-toolbar .ql-picker-item:hover .ql-fill,
        .ql-snow .ql-toolbar .ql-picker-item:hover .ql-fill,
        .ql-snow.ql-toolbar .ql-picker-item.ql-selected .ql-fill,
        .ql-snow .ql-toolbar .ql-picker-item.ql-selected .ql-fill,
        .ql-snow.ql-toolbar button:hover .ql-stroke.ql-fill,
        .ql-snow .ql-toolbar button:hover .ql-stroke.ql-fill,
        .ql-snow.ql-toolbar button:focus .ql-stroke.ql-fill,
        .ql-snow .ql-toolbar button:focus .ql-stroke.ql-fill,
        .ql-snow.ql-toolbar button.ql-active .ql-stroke.ql-fill,
        .ql-snow .ql-toolbar button.ql-active .ql-stroke.ql-fill,
        .ql-snow.ql-toolbar .ql-picker-label:hover .ql-stroke.ql-fill,
        .ql-snow .ql-toolbar .ql-picker-label:hover .ql-stroke.ql-fill,
        .ql-snow.ql-toolbar .ql-picker-label.ql-active .ql-stroke.ql-fill,
        .ql-snow .ql-toolbar .ql-picker-label.ql-active .ql-stroke.ql-fill,
        .ql-snow.ql-toolbar .ql-picker-item:hover .ql-stroke.ql-fill,
        .ql-snow .ql-toolbar .ql-picker-item:hover .ql-stroke.ql-fill,
        .ql-snow.ql-toolbar .ql-picker-item.ql-selected .ql-stroke.ql-fill,
        .ql-snow .ql-toolbar .ql-picker-item.ql-selected .ql-stroke.ql-fill {
            fill: ${getColor(darkMode, "purple")};
        }

        .ql-snow.ql-toolbar button:hover .ql-stroke,
        .ql-snow .ql-toolbar button:hover .ql-stroke,
        .ql-snow.ql-toolbar button:focus .ql-stroke,
        .ql-snow .ql-toolbar button:focus .ql-stroke,
        .ql-snow.ql-toolbar button.ql-active .ql-stroke,
        .ql-snow .ql-toolbar button.ql-active .ql-stroke,
        .ql-snow.ql-toolbar .ql-picker-label:hover .ql-stroke,
        .ql-snow .ql-toolbar .ql-picker-label:hover .ql-stroke,
        .ql-snow.ql-toolbar .ql-picker-label.ql-active .ql-stroke,
        .ql-snow .ql-toolbar .ql-picker-label.ql-active .ql-stroke,
        .ql-snow.ql-toolbar .ql-picker-item:hover .ql-stroke,
        .ql-snow .ql-toolbar .ql-picker-item:hover .ql-stroke,
        .ql-snow.ql-toolbar .ql-picker-item.ql-selected .ql-stroke,
        .ql-snow .ql-toolbar .ql-picker-item.ql-selected .ql-stroke,
        .ql-snow.ql-toolbar button:hover .ql-stroke-miter,
        .ql-snow .ql-toolbar button:hover .ql-stroke-miter,
        .ql-snow.ql-toolbar button:focus .ql-stroke-miter,
        .ql-snow .ql-toolbar button:focus .ql-stroke-miter,
        .ql-snow.ql-toolbar button.ql-active .ql-stroke-miter,
        .ql-snow .ql-toolbar button.ql-active .ql-stroke-miter,
        .ql-snow.ql-toolbar .ql-picker-label:hover .ql-stroke-miter,
        .ql-snow .ql-toolbar .ql-picker-label:hover .ql-stroke-miter,
        .ql-snow.ql-toolbar .ql-picker-label.ql-active .ql-stroke-miter,
        .ql-snow .ql-toolbar .ql-picker-label.ql-active .ql-stroke-miter,
        .ql-snow.ql-toolbar .ql-picker-item:hover .ql-stroke-miter,
        .ql-snow .ql-toolbar .ql-picker-item:hover .ql-stroke-miter,
        .ql-snow.ql-toolbar .ql-picker-item.ql-selected .ql-stroke-miter,
        .ql-snow .ql-toolbar .ql-picker-item.ql-selected .ql-stroke-miter {
            stroke: ${getColor(darkMode, "purple")};
        }

        .ql-toolbar.ql-snow .ql-picker-label {
            border-color: ${getColor(darkMode, "borderPrimary")};
            border-radius: 5px;
            font-size: 15px;
        }

        .ql-toolbar.ql-snow .ql-picker.ql-expanded .ql-picker-label {
            border-color: ${getColor(darkMode, "borderPrimary")};
            border-radius: 5px;
        }

        .ql-snow .ql-tooltip[data-mode=link]::before {
            content: "Link";
        }

        .ql-snow a {
            color: ${getColor(darkMode, "linkPrimary")};
        }

        .ql-snow a:hover {
            text-decoration: underline;
        }

        .ql-editor ul[data-checked=true] > li::before, .ql-editor ul[data-checked=false] > li::before {
            color: ${getColor(darkMode, "textPrimary")};
        }

        .ql-editor ul[data-checked=false] > li::before {
            content: '\\2713';
            color: transparent;
            display: inline-block;
            width: 18px;
            height: 18px;
            border: 1px solid ${getColor(darkMode, "textPrimary")};
            border-radius: 50%;
            margin-right: 0.5em;
            text-align: center;
            line-height: 17px;
            background-color: transparent;
        }

        .ql-editor ul[data-checked=true] > li::before {
            content: '\\2714';
            color: white;
            display: inline-block;
            width: 18px;
            height: 18px;
            border: 1px solid ${getColor(darkMode, "purple")};
            border-radius: 50%;
            margin-right: 0.5em;
            text-align: center;
            line-height: 17px;
            background-color: ${getColor(darkMode, "purple")};
        }

        .ql-editor ul[data-checked=false] > li {
            margin-top: 8px;
        }

        .ql-editor ul[data-checked=true] > li {
            margin-top: 8px;
        }

        .ql-snow .ql-editor pre.ql-syntax {
            background-color: ${getColor(darkMode, "backgroundSecondary")};
            color: ${getColor(darkMode, "textPrimary")};
            overflow: visible;
            border-radius: 5px;
        }

        .ql-snow.ql-toolbar button, .ql-snow .ql-toolbar button {
            height: 28px;
            width: 28px;
        }
    `
}

export const helmetStyle = (darkMode: boolean) => {
	return `
        ${baseStyle()}
        ${darkMode ? darkModeStyle() : lightModeStyle()}
        ${contexifyStyle()}
        ${quillStyle(darkMode)}
    `
}
