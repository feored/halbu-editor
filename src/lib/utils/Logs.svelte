<script context="module">
    import {
        trace as log_trace,
        debug as log_debug,
        info as log_info,
        warn as log_warn,
        error as log_error,
        attachConsole,
    } from "tauri-plugin-log-api";

    let attached = false;
    let detachConsole;

    export function detach() {
        detachConsole();
    }

    async function attachIfNecessary() {
        if (!attached) {
            detachConsole = await attachConsole();
            attached = true;
        }
    }

    export async function error(elem) {
        await attachIfNecessary();
        log_error(JSON.stringify(elem));
    }

    export async function warn(elem) {
        await attachIfNecessary();
        log_warn(JSON.stringify(elem));
    }

    export async function info(elem) {
        await attachIfNecessary();
        log_info(JSON.stringify(elem));
    }

    export async function debug(elem) {
        await attachIfNecessary();
        log_debug(JSON.stringify(elem));
    }

    export async function trace(elem) {
        await attachIfNecessary();
        log_trace(JSON.stringify(elem));
    }
</script>
