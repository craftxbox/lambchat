import he from "he";
import { subscribe, unsubscribe, append, dispatch } from "../main";
import { secure, params, htmlOn } from "../settings";
import { processCommand } from "../moderator";

export const ircUri = params.get("ircUri") || null;

let buffer: string[] = [];
let reconnectBackoff = 0;
let reconnectTimeout: NodeJS.Timeout = null as unknown as NodeJS.Timeout;
let bufferLoopInterval: NodeJS.Timeout = null as unknown as NodeJS.Timeout;

let ws: WebSocket = null as unknown as WebSocket;
let ready = false;

function bufferLoop() {
    if (buffer.length > 0 && ready) {
        let msg = buffer.shift();

        if (!msg) return;

        msg = msg.trim();
        msg = msg.replaceAll(/ ?(https?:\/\/static-cdn.jtvnw.net\S+) ?/gi, `[x]`);
        msg = msg.replaceAll(/ ?(https?:\/\/cdn.betterttv.net\S+) ?/gi, `[x]`);
        msg = msg.replaceAll(/ ?(https?:\/\/cdn.frankerfacez.com\S+) ?/gi, `[x]`);
        msg = msg.replaceAll(/ ?(https?:\/\/www.youtube.com\/s\/\S+) ?/gi, `[x]`);
        msg = msg.replaceAll(/> (\[x] ?)+$/gi, `> [Message contained only Emoji]`);

        ws.send("PRIVMSG " + params.get("ircChannel") + " :" + msg + "\r\n");
    }
}

function subscriber(source: string, content: string) {
    if (source == "irc") return;
    buffer.push(`[${source}] ${content}`);
}

function eventHandler(e: MessageEvent) {
    let data = e.data;
    let uid: string = e.data.split(" ")[0];
    if (uid == "PING") {
        ws.send("PONG " + data.split(" ")[1] + "\r\n");
        if (!ready) {
            ws.send("USER chatview 0 * :chatview\r\n");
            ws.send("JOIN " + params.get("ircChannel") + "\r\n");
        }
        ready = true;
    }


    let nickColor: number;
    if (uid.includes("!")) {
        nickColor =
            uid
                .split("!")[1]
                .split("")
                .reduce((a, b) => a + b.charCodeAt(0), 0) % 8;
    } else nickColor = 1;

    if (uid.startsWith(":chatview-")) return;

    let command = data.split(" ")[1];
    switch (command) {
        case "PRIVMSG":
            let nick = uid.split("!")[0].substring(1);
            if (nick.startsWith("chatview-")) return;
            console.log(data, data.split(":"));
            let channel = data.split(" ")[2];
            if (channel != params.get("ircChannel")) return;

            let chanstringlen = ("PRIVMSG " + channel + " :").length;
            let message = data.substring(data.indexOf("PRIVMSG " + channel + " :") + chanstringlen);

            if (message.startsWith("!") && uid == params.get("ircAdmin")) {
                let result = processCommand(message.substring(1));
                if (result) {
                    ws.send("PRIVMSG " + channel + " :" + result + "\r\n");
                }
            }

            if (message.startsWith("ACTION")) {
                message = message.replace("ACTION ", "").replace("", "");
                append(
                    `<i class="fa-solid fa-computer"></i> <span class="display-color-${nickColor}"><strong>${nick}</strong>&nbsp; ${htmlOn ? message : he.encode(message)}</span>\n`,
                    "irc-" + uid.split("!")[1].split("@")[0],
                );
                dispatch("irc", `* ${nick} ${message}`);
            } else {
                append(
                    `<i class="fa-solid fa-computer"></i> <span class="display-color-${nickColor}">&lt${nick}&gt;</span> ${htmlOn ? message : he.encode(message)}\n`,
                    "irc-" + uid.split("!")[1].split("@")[0],
                );
                dispatch("irc", `<${nick}> ${message}`);
            }
            break;
        case "NICK":
            let oldNick = uid.split("!")[0].substring(1);
            let newNick = data.split("NICK :")[1];
            append(
                `<i class="fa-solid fa-computer"></i> <span class="display-color-${nickColor}">${oldNick}</span> is now known as <span class="display-color-${nickColor}">${newNick}</span>\n`,
                uid.split("!")[1].split("@")[0],
            );
            dispatch("irc", `${oldNick} is now known as ${newNick}`);
            break;
        case "JOIN":
            let joinNick = uid.split("!")[0].substring(1);
            append(
                `<i class="fa-solid fa-computer"></i> <span class="display-color-${nickColor}">${joinNick}</span> joined the chat.\n`,
                uid.split("!")[1].split("@")[0],
            );
            dispatch("irc", `${joinNick} joined the chat.`);
            break;
        case "PART":
        case "QUIT":
            let partNick = uid.split("!")[0].substring(1);
            append(
                `<i class="fa-solid fa-computer"></i> <span class="display-color-${nickColor}">${partNick}</span> left the chat.\n`,
                uid.split("!")[1].split("@")[0],
            );
            dispatch("irc", `${partNick} left the chat.`);
            break;
    }
}

function connectIrc() {
    ws = new WebSocket((secure ? "wss://" : "ws://") + ircUri, ["text.ircv3.net"]);
    ws.onopen = function (_) {
        reconnectBackoff = 0;

        ws.send("NICK chatview-" + Math.random().toString(36).substring(2) + "\r\n");

        document.querySelectorAll("#irc-lost").forEach(el => el.remove());
        append(`<i class="fa-solid fa-computer"></i> <span>Connection established.</span>`, "irc-connected");
        setTimeout(() => {
            document.querySelectorAll("#irc-connected").forEach(el => el.remove());
        }, 2000);

        bufferLoopInterval = setInterval(bufferLoop, 125);
        subscribe("irc", subscriber);
        ws.onmessage = eventHandler;
    };

    ws.onclose = closeHandler;
}

function closeHandler(event: Event) {
    unsubscribe("irc");
    clearInterval(bufferLoopInterval);
    if (event instanceof CloseEvent) {
        append(`<i class="fa-solid fa-computer"></i> <span>Socket closed (${event.code}), reconnecting in ${reconnectBackoff}s</span>`, "irc-lost");
    } else {
        append(`<i class="fa-solid fa-computer"></i> <span>Socket lost, reconnecting in ${reconnectBackoff}s</span>`, "irc-lost");
        console.log(event);
    }

    clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(function () {
        if (reconnectBackoff == 0) reconnectBackoff++;
        else reconnectBackoff *= 4;
        if (reconnectBackoff > 60) reconnectBackoff = 60;
        connectIrc();
    }, reconnectBackoff * 1000);
}

connectIrc();