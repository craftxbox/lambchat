import DOMPurify from "dompurify";
import he from "he";
import validator from "validator";
import { checkBlacklist } from "./blacklist";

import { panic, overlay, corsProxy, noImages, showLinks, bridgeOn } from "./settings";
import { easeInOutSine, isElementXPercentInViewport, scrollToBottom } from "./util";
import { owncastUri } from "./providers/owncast";

export const chat: HTMLElement = document.getElementById("chat") as HTMLElement;

const purifyopts = {
    CUSTOM_ELEMENT_HANDLING: {
        tagNameCheck: /./, // no custom elements are allowed
        attributeNameCheck: null, // default / standard attribute allow-list is used
        allowCustomizedBuiltInElements: false, // no customized built-ins allowed
    },
};

let subscribers: {[provider:string]: ((source: string, content: string) => void)} = { }

export function subscribe(provider: string, callback: (source:string, content:string) => void) {
    subscribers[provider] = callback;
}

export function unsubscribe(provider: string) {
    delete subscribers[provider];
}

export function dispatch(source: string, content: string, force = false) {
    if (!force && !bridgeOn) return;
    for (let callback of Object.values(subscribers)) {
        callback(source, content);
    }
}

export function append(html: string, id: string) {
    if (panic == true) return;
    let el = document.createElement("p");
    if (overlay) el.classList.add("overlay");
    if (id) el.id = id;

    html = html.replaceAll(/(https?:\/\/static-cdn.jtvnw.net\S+)/gi, `<img class="emoji" src="$1">`);
    html = html.replaceAll(/(https?:\/\/cdn.betterttv.net\S+)/gi, `<img class="emoji" src="$1">`);
    html = html.replaceAll(/(https?:\/\/cdn.frankerfacez.com\S+)/gi, `<img class="emoji" src="$1">`);
    html = html.replaceAll(/(https?:\/\/www.youtube.com\/s\/\S+)/gi, `<img class="emoji" src="$1">`);

    if (checkBlacklist(html)) {
        return;
    }

    if (showLinks) el.innerHTML = DOMPurify.sanitize(html, purifyopts);
    else {
        let outHtml = html.replaceAll(/<a .*<\/a>/gi, `<span style="font-size:14px;color:#999">[Link Removed]</span>`);
        outHtml = outHtml.replaceAll(/ https?:\/\/\S+ /gi, `<span style="font-size:14px;color:#999">[Link Removed]</span>`);
        el.innerHTML = DOMPurify.sanitize(outHtml, purifyopts);
    }

    let hasImg = false;
    for (let i of html.match(/https?:\/\/\S+/gi) || []) {
        try {
            if (noImages) break;
            i = he.decode(i);
            i = i.replace(/"$/, "");
            if (validator.isURL(i, { protocols: ["http", "https"], require_protocol: true })) {
                if (i.includes(owncastUri)) continue;
                const request = new XMLHttpRequest();
                request.open("GET", corsProxy + encodeURIComponent(i), false);
                request.send(null);

                if (request.status === 200) {
                    let contentType = request.getResponseHeader("Content-Type") || "";
                    if (contentType.startsWith("image")) {
                        hasImg = true;

                        let img = document.createElement("img");
                        img.onload = function () {
                            chat.scrollTo(0, chat.scrollHeight);
                        };
                        img.src = corsProxy + encodeURIComponent(i);
                        img.classList.add("preview");
                        el.appendChild(img);
                        break;
                    }
                }
            }
        } catch (e) {
            console.log(e); //but discard so it doesnt break processing
        }
    }

    chat.appendChild(el);
    el.classList.add("adding");
    scrollToBottom(chat, 250, easeInOutSine, hasImg);
    chat.scrollTo(0, chat.scrollHeight);
    for (let el of document.querySelectorAll("#chat p")) {
        if (!isElementXPercentInViewport(el, 50)) {
            el.classList.add("removing");
            setTimeout(() => {
                el.remove();
                chat.scrollTo(0, chat.scrollHeight);
            }, 250);
        }
    }
}
