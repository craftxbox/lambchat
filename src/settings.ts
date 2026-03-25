declare const document: HTMLDocument;

export const params = new URL(document.location.toString()).searchParams;

export const corsProxy = params.get("corsProxy") || "https://corsproxy.io/?";
export const ircUri = params.get("ircUri") || null;
export const bridgeOn = params.get("bridgeOn") == "true" || false;
export const secure = window.location.protocol == "https:";
export const showLinks = params.get("showLinks") == "true";
export const overlay = params.get("overlay") == "true";
if (overlay) {
    document.body.classList.add("overlay");
}

export let htmlOn = true;
export let noImages = false;
export let panic = false;

export function setHtmlOn(on: boolean) {
    htmlOn = on;
}

export function setNoImages(on: boolean) {
    noImages = on;
}

export function setPanic(on: boolean) {
    panic = on;
}
