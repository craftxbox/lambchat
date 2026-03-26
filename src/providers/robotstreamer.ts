import he from "he";
import { append, dispatch, subscribe, unsubscribe } from "../main";
import { htmlOn } from "../settings";

const robotId = "8776";
const ownerId = "27";

let buffer: string[] = [];
let reconnectBackoff = 0;
let reconnectTimeout: NodeJS.Timeout = null as unknown as NodeJS.Timeout;
let bufferLoopInterval: NodeJS.Timeout = null as unknown as NodeJS.Timeout;

let ws: WebSocket = null as unknown as WebSocket;
let uname = "";

function subscriber(source: string, content: string) {
    if (source == "robotstreamer") return;
    buffer.push(`[${source}] ${content}`);
}

function eventHandler(e: MessageEvent) {
    let data = JSON.parse(e.data);
    
    if (data.type === "your_info") {
        uname = JSON.parse(data.message).user_name;
        return;
    }
    
    if (data.robot_id !== robotId) return;
    if (data.owner_id !== ownerId) return;

    if (data.username === uname) return;
    if (data.username === "[RS BOT]") return;

    let nickColor = (data.username as string).split("").reduce((a, b) => a + b.charCodeAt(0), 0) % 8;

    append(
        `<i class="robotstreamer"></i> <span class="display-color-${nickColor}">&lt${data.username}&gt</span> ${htmlOn ? data.message : he.encode(data.message)}\n`,
        "robotstreamer-" + data.user_id,
    );
    dispatch("robotstreamer", `<${data.username}> ${data.message}`);
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

        ws.send(JSON.stringify({ message: msg, robot_id: robotId, owner_id: ownerId, tts_price: 0 }));
    }
}

function connectRS() {
    ws = new WebSocket("wss://208-113-134-124.robotstreamer.com:8765");
    ws.onopen = function (_) {
        reconnectBackoff = 0;

        document.getElementById("robotstreamer-lost")?.remove();
        append(`<i class="robotstreamer"></i> <span>Connection established.</span>`, "robotstreamer-connected");
        setTimeout(() => {
            document.getElementById("robotstreamer-connected")?.remove();
        }, 2000);

        bufferLoopInterval = setInterval(bufferLoop, 125);
        subscribe("robotstreamer", subscriber);
        ws.onmessage = eventHandler;
    };

    ws.onclose = closeHandler;
}

function closeHandler(event: Event) {
    unsubscribe("robotstreamer");
    clearInterval(bufferLoopInterval);
    document.getElementById("robotstreamer-lost")?.remove();
    if (event instanceof CloseEvent) {
        append(
            `<i class="robotstreamer"></i> <span>Socket closed (${event.code}), reconnecting in ${reconnectBackoff}s</span>`,
            "robotstreamer-lost",
        );
    } else {
        append(`<i class="robotstreamer"></i> <span>Socket lost, reconnecting in ${reconnectBackoff}s</span>`, "robotstreamer-lost");
        console.log(event);
    }

    clearInterval(reconnectTimeout);
    reconnectTimeout = setTimeout(function () {
        if (reconnectBackoff == 0) reconnectBackoff++;
        else reconnectBackoff *= 2;
        if (reconnectBackoff > 60) reconnectBackoff = 60;
        connectRS();
    }, reconnectBackoff * 1000);
}

connectRS();
