// lib/translate.ts

export const LANGUAGES = [
    { code: "hi", label: "हिन्दी" },
    { code: "es", label: "Español" },
    { code: "fr", label: "Français" },
    { code: "de", label: "Deutsch" },
    { code: "zh-CN", label: "中文" },
    { code: "ar", label: "العربية" },
    { code: "ja", label: "日本語" },
];

// Open translated version of any page in a new tab
export function translatePage(targetLang: string, url = window.location.href) {
    const translateUrl = `https://translate.google.com/translate?sl=en&tl=${targetLang}&u=${encodeURIComponent(url)}`;
    window.open(translateUrl, "_blank");
}

// Or redirect current tab instead of opening new one
export function translatePageInPlace(targetLang: string, url = window.location.href) {
    window.location.href = `https://translate.google.com/translate?sl=en&tl=${targetLang}&u=${encodeURIComponent(url)}`;
}