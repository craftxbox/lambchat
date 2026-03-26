import io from "socket.io-client";
import { params, htmlOn } from "../settings";
import { append } from "../main";
import he from "he";

const socket = io(params.get("sheepUri") || "ws://127.0.0.1:49135", {
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    secure: true,
    path: "/socket.io/",
    transports: ["websocket", "polling"],
    upgrade: true,
    query: {
        session_id: Date.now(),
        device_type: "listener",
        os: "none",
        pc_name: "none",
        room: params.get("sheepRoom"),
    },
});

socket.on("connect", () => {
    socket.emit("message", { event: "join", data: {} });
    document.querySelectorAll("#sheep-lost").forEach(el => el.remove());
    append(`<i class="fa-solid fa-cow"></i> <span>Connection established.</span>`, "sheep-connected");
    setTimeout(() => {
        document.querySelectorAll("#sheep-connected").forEach(el => el.remove());
    }, 2000);
});

socket.on("disconnect", () => {
    document.getElementById("owncast-lost")?.remove();
    append(`<i class="fa-solid fa-cow"></i> <span>Connection lost.</span>\n`, "sheep-lost");
});

socket.on("message", (data: any) => {
    let event = data.event;
    data = data.data;
    switch (event) {
        case "joined":
            if (data.sender) {
                //socket.emit("message", { event: "fetch", data: {}, socket_select: data.sender, method: "history" })
            }
            break;
        case "broadcast":
            if (data.broadcast_event != "message") return;
            append(
                `<i class="fa-brands fa-${data.type}"></i> <span style="color:${data.color}">&lt;${data.nick}&gt;</span> ${htmlOn ? he.decode(he.decode(data.text)) : he.decode(data.text)}\n`,
                data.id,
            );
            break;
    }
    console.log(data);
});

socket.connect();