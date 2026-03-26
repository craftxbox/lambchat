import he from "he";
import { subscribe, unsubscribe, append, dispatch } from "../main";
import { params, htmlOn } from "../settings";
import { client, xml, type Client } from "@xmpp/client";
import type { Element as XElement } from "ltx";

export const ircUri = params.get("ircUri") || null;

let buffer: string[] = [];
let bufferLoopInterval: NodeJS.Timeout = null as unknown as NodeJS.Timeout;

let xmpp: Client = null as unknown as Client;

let muc = "stream@xmpp.crxb.cc";

function bufferLoop() {
    if (buffer.length > 0 && xmpp.status == "online") {
        let msg = buffer.shift();

        if (!msg) return;

        msg = msg.trim();
        msg = msg.replaceAll(/ ?(https?:\/\/static-cdn.jtvnw.net\S+) ?/gi, `[x]`);
        msg = msg.replaceAll(/ ?(https?:\/\/cdn.betterttv.net\S+) ?/gi, `[x]`);
        msg = msg.replaceAll(/ ?(https?:\/\/cdn.frankerfacez.com\S+) ?/gi, `[x]`);
        msg = msg.replaceAll(/ ?(https?:\/\/www.youtube.com\/s\/\S+) ?/gi, `[x]`);
        msg = msg.replaceAll(/> (\[x] ?)+$/gi, `> [Message contained only Emoji]`);

        sendMessage(msg);
    }
}

function subscriber(source: string, content: string) {
    if (source == "xmpp") return;
    buffer.push(`[${source}] ${content}`);
}

async function onStanza(stanza: XElement) {
    if (stanza.is("message")) {
        if (stanza.attrs.type === "groupchat" && stanza.attrs.from.startsWith(muc)) {
            let nick: string = stanza.attrs.from.split("/")[1];

            if (nick == "chatview") return;

            let id = stanza.getChild("stanza-id")?.getAttr("id") || null;

            let body = stanza.getChildText("body");
            if (!nick || !body) return;
            let nickColor = nick.split("").reduce((a, b) => a + b.charCodeAt(0), 0) % 8;
            let message = body
                .replace(/<em>(.+)<\/em>/gi, "_$1_")
                .replace(/<strong>(.+)<\/strong>/gi, "*$1*")
                .replace(/<code>(.+)<\/code>/gi, "`$1`");

            if (message.startsWith("/me")) {
                message = message.substring(4);
                append(
                    `<i class="openwebicons-xmpp"></i> <span class="display-color-${nickColor}"><strong>${nick}</strong> ${htmlOn ? body : he.encode(message)}</span>\n`,
                    id,
                );
                dispatch("xmpp", `* ${nick} ${message}`);
            } else {
                append(
                    `<i class="openwebicons-xmpp"></i> <span class="display-color-${nickColor}">&lt${nick}&gt;</span> ${htmlOn ? body : he.encode(message)}\n`,
                    id,
                );
                dispatch("xmpp", `<${nick}> ${message}`);
            }
        }
    }
}

async function sendMessage(message: string) {
    let msg = xml("message", { type: "groupchat", to: muc }, xml("body", {}, message));
    await xmpp.send(msg);
}

function connectXmpp() {
    xmpp = client({
        service: "wss://crxb.cc/prosody/xmpp-websocket", //todo settingsify this
        domain: "crxb.cc",
        resource: "chatview-" + Math.random().toString(36).substring(2),
        username: params.get("xmppUsername") || "",
        password: params.get("xmppPassword") || "",
    });

    xmpp.on("stanza", onStanza);
    xmpp.on("online", async (_) => {
        let joinreq = xml(
            "presence",
            {
                to: muc + "/chatview",
            },
            xml("x", { xmlns: "http://jabber.org/protocol/muc" }, xml("history", { maxchars: 0 })),
        );
        await xmpp.send(joinreq);
        document.getElementById("xmpp-lost")?.remove();
        append(`<i class="openwebicons-xmpp"></i> <span>Connection established.</span>`, "xmpp-connected");
        setTimeout(() => {
            document.getElementById("xmpp-connected")?.remove();
        }, 2000);
        bufferLoopInterval = setInterval(bufferLoop, 125);
        subscribe("xmpp", subscriber);
    });
    xmpp.on("error", (err) => {
        document.getElementById("owncast-lost")?.remove();
        append(`<i class="openwebicons-xmpp"></i> <span>Connection lost (client error).</span>`, "xmpp-lost");
        console.error(err);
        unsubscribe("xmpp");
        if (bufferLoopInterval) clearInterval(bufferLoopInterval);
    });

    xmpp.start();
}

connectXmpp();