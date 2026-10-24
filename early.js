if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
}

if (location.hash) {
    history.replaceState(
        null,
        "",
        location.pathname + location.search
    );
}

window.scrollTo(0, 0);