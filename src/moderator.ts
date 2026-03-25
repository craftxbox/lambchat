import { chat } from "./main";
import { setHtmlOn, setNoImages, overlay, setPanic } from "./settings";

export function processCommand(command: string): string | false {
    switch (true) {
        case command.startsWith("nomorefun"):
            setHtmlOn(false);
            return "Okay, no more fun! HTML parsing disabled.";

        case command.startsWith("morefun"):
            setHtmlOn(true);
            return "Okay, more fun! HTML parsing enabled.";

        case command.startsWith("clear"):
            chat.innerHTML = "";
            chat.scrollTo(0, chat.scrollHeight);
            return false;

        case command.startsWith("noimages"):
            setNoImages(true);
            return "Okay, no more images!";

        case command.startsWith("images"):
            setNoImages(false);
            return "Okay, images are back!";

        case command.startsWith("panic"):
            if (overlay) {
                setPanic(true);
                chat.innerHTML = '<p class="overlay">panic mode active</p>';
                return "panic mode active";
            }
            return false;

        case command.startsWith("calm"):
            if (overlay) {
                setPanic(false);
                chat.innerHTML = "";
                return "panic mode deactivated";
            }
            return false;
    }
    return false;
}
