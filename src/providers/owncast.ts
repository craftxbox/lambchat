import he from "he";
import { append, chat, dispatch, subscribe, unsubscribe } from "../main";
import { processCommand } from "../moderator";
import { htmlOn, params, secure } from "../settings";

export const owncastUri = params.get("owncastUri") || "crxb.cc/stream";
const owncastToken = params.get("owncastToken") || null;

let buffer: string[] = [];
let reconnectBackoff = 0;
let reconnectTimeout: NodeJS.Timeout = null as unknown as NodeJS.Timeout;
let bufferLoopInterval: NodeJS.Timeout = null as unknown as NodeJS.Timeout;

let ws: WebSocket = null as unknown as WebSocket;

function subscriber(source: string, content: string) {
    if (source == "owncast") return;
    buffer.push(`[${source}] ${content}`);
}

function eventHandler(e: MessageEvent) {
    let data = JSON.parse(e.data);
    if (data.user && data.user.displayName == "ChatReaderBot") return;
    switch (data.type) {
        case "CHAT":
            if (data.user.scopes.includes("MODERATOR") && data.body.startsWith("<p>!")) {
                let result = processCommand(data.body.replace(/<p>(.*)<\/p>/, "$1"));
                if (result) {
                    ws.send(JSON.stringify({ type: "CHAT", body: result }));
                }
            }

            let content = data.body.replace(/<p>(.*)<\/p>/, "$1").replaceAll('src="/', `src="${secure ? "https://" : "http://"}${owncastUri}"`);

            if (htmlOn) content = he.decode(content);

            append(
                `<i class="fa-solid fa-tower-broadcast"></i>
                    <span class="display-color-${data.user.displayColor}">&lt${data.user.displayName}&gt;</span> 
                    ${content}\n`,
                data.id,
            );

            let message = he.decode(data.body.replace(/<p>(.*)<\/p>/, "$1"));
            message = message.replaceAll(/<a \S+>(.+)<\/a>/gi, "[LINK: $1]");

            dispatch("owncast", `<${data.user.displayName}> ${message}`);

            // let ircMessage = message.replaceAll(/<em>(.+)<\/em>/gi, "$1").replaceAll(/<strong>(.+)<\/strong>/gi, "$1");
            // let xmppMessage = message
            //     .replaceAll(/<em>(.+)<\/em>/gi, "_$1_")
            //     .replaceAll(/<strong>(.+)<\/strong>/gi, "*$1*")
            //     .replaceAll(/<code>(.+)<\/code>/gi, "`$1`");
            break;

        case "NAME_CHANGE":
            append(
                `<i class="fa-solid fa-tower-broadcast"></i>
                    <span class="display-color-${data.user.displayColor}">${data.oldName}</span> is now known as <span class="display-color-${data.user.displayColor}">
                    ${data.user.displayName}</span>\n`,
                data.id,
            );
            dispatch("owncast", `${data.oldName} is now known as ${data.user.displayName}`);
            break;

        case "VISIBILITY-UPDATE":
            if (!data.visible) {
                for (let id of data.ids) {
                    try {
                        document.getElementById(id)?.remove();
                    } catch (e) {
                        //we don't actually care about this error
                    }
                }
                chat.scrollTo(0, chat.scrollHeight);
            }
            break;

        case "USER_JOINED":
            append(
                `<i class="fa-solid fa-tower-broadcast"></i> <span class="display-color-${data.user.displayColor}">${data.user.displayName}</span> joined the chat.\n`,
                data.id,
            );
            dispatch("owncast", `${data.user.displayName} joined the chat.`);
            break;
        case "USER_PARTED":
            append(
                `<i class="fa-solid fa-tower-broadcast"></i> <span class="display-color-${data.user.displayColor}">${data.user.displayName}</span> left the chat.\n`,
                data.id,
            );
            dispatch("owncast", `${data.user.displayName} left the chat.`);
            break;
        case "CHAT_ACTION":
            append(`<i class="fa-solid fa-tower-broadcast"></i> ${data.body.replace(/^<p>(.*)<\/p>\n$/, "$1")}\n`, data.id);
            dispatch("owncast", he.decode(data.body));
            break;
    }
}

function bufferLoop() {
    if (buffer.length > 0 && ws.readyState == WebSocket.OPEN) {
        let msg = buffer.shift();

        if (!msg) return;

        msg = msg.trim();
        msg = msg.replaceAll(/ ?(https?:\/\/static-cdn.jtvnw.net\S+) ?/gi, `[x]`);
        msg = msg.replaceAll(/ ?(https?:\/\/cdn.betterttv.net\S+) ?/gi, `[x]`);
        msg = msg.replaceAll(/ ?(https?:\/\/cdn.frankerfacez.com\S+) ?/gi, `[x]`);
        msg = msg.replaceAll(/ ?(https?:\/\/www.youtube.com\/s\/\S+) ?/gi, `[x]`);
        msg = msg.replaceAll(/&gt; (\[x] ?)+$/gi, `> [Message contained only Emoji]`);

        ws.send(JSON.stringify({ type: "CHAT", body: msg }));
    }
}

function connectOwncast() {
    ws = new WebSocket((secure ? "wss://" : "ws://") + owncastUri + "/ws?accessToken=" + owncastToken);
    ws.onopen = function (_) {
        reconnectBackoff = 0;

        document.getElementById("owncast-lost")?.remove();
        append(`<i class="fa-solid fa-tower-broadcast"></i> <span>Connection established.</span>`, "owncast-connected");
        setTimeout(() => {
            document.getElementById("owncast-connected")?.remove();
        }, 2000);

        bufferLoopInterval = setInterval(bufferLoop, 125);
        subscribe("owncast", subscriber);
        ws.onmessage = eventHandler;
    };

    ws.onclose = closeHandler;
}

function closeHandler(event: Event) {
    unsubscribe("owncast");
    clearInterval(bufferLoopInterval);
    if (event instanceof CloseEvent) {
        append(
            `<i class="fa-solid fa-tower-broadcast"></i> <span>Socket closed (${event.code}), reconnecting in ${reconnectBackoff}s</span>`,
            "owncast-lost",
        );
    } else {
        append(`<i class="fa-solid fa-tower-broadcast"></i> <span>Socket lost, reconnecting in ${reconnectBackoff}s</span>`, "owncast-lost");
        console.log(event);
    }

    clearInterval(reconnectTimeout);
    reconnectTimeout = setTimeout(function () {
        if (reconnectBackoff == 0) reconnectBackoff++;
        else reconnectBackoff *= 2;
        if (reconnectBackoff > 60) reconnectBackoff = 60;
        connectOwncast();
    }, reconnectBackoff * 1000);
}

connectOwncast();
