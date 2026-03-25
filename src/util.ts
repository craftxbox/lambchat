// (c) folo 2018 CC-BY-SA 4.0 https://stackoverflow.com/a/51121566/3934270
export function isElementXPercentInViewport (el: Element, percentVisible: number) {
    let rect = el.getBoundingClientRect(),
        windowHeight = window.innerHeight || document.documentElement.clientHeight;

    return !(
        Math.floor(100 - ((rect.top >= 0 ? 0 : rect.top) / +-rect.height) * 100) < percentVisible ||
        Math.floor(100 - ((rect.bottom - windowHeight) / rect.height) * 100) < percentVisible
    );
};
//end copynotice

// (c) jpfx1342 2022 CC-BY-SA 4.0 https://stackoverflow.com/a/70990824/3934270
// Easing function takes an number in range [0...1]
// and returns an eased number in that same range.
// See https://easings.net/ for more.
export function easeInOutSine(x: number): number {
    return -(Math.cos(Math.PI * x) - 1) / 2;
}

// Simply scrolls the element from the top to the bottom.
// `elem` is the element to scroll
// `time` is the time in milliseconds to take.
// `easing` is an optional easing function.
export function scrollToBottom(elem:Element, time:number, easing: typeof easeInOutSine, img = false): void {
    var startTime: number | null = null;
    var startScroll = elem.scrollTop;
    // You can change the following to scroll to a different position.
    var targetScroll = elem.scrollHeight - elem.clientHeight + 200 * (img ? 1 : 0);
    var scrollDist = targetScroll - startScroll;

    easing = easing || ((x) => x);
    function scrollFunc(t: number) {
        if (startTime === null) startTime = t;

        var frac = (t - startTime) / time;
        if (frac > 1) frac = 1;

        elem.scrollTop = startScroll + Math.ceil(scrollDist * easing(frac));

        if (frac < 0.99999) requestAnimationFrame(scrollFunc);
    }
    requestAnimationFrame(scrollFunc);
}
//end copynotice
