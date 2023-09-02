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

    export async function error(string) {
        await attachIfNecessary();
        log_error(string);
    }

    export async function warn(string) {
        await attachIfNecessary();
        log_warn(string);
    }

    export async function info(string) {
        await attachIfNecessary();
        log_info(string);
    }

    export async function debug(string) {
        await attachIfNecessary();
        log_debug(string);
    }

    export async function trace(string) {
        await attachIfNecessary();
        log_trace(string);
    }
</script>
