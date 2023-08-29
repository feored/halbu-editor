<script>
    import { SunMoonIcon, FolderIcon } from "lucide-svelte";
    import { open } from "@tauri-apps/api/dialog";

    let saveFolder = "";

    const setSaveFolder = async () => {
        try {
            const selectedPath = await open({
                multiple: false,
                directory: true,
                title: "Set D2R Save Folder",
            });
            saveFolder = Array.isArray(selectedPath) ? selectedPath[0] : selectedPath;
        } catch (err) {
            console.error(err);
        }
    };

    let theme;

    async function setTheme(event) {
        if (event.currentTarget.value === "auto") {
            document.querySelector("html").removeAttribute("data-theme");
        } else {
            document.querySelector("html").setAttribute("data-theme", event.currentTarget.value);
        }
    }
</script>

<article style="max-width:62.5rem; margin:auto;">
    <header><h5>Settings</h5></header>
    <div class="col vspaced">
        <div>
            <form>
                <legend><b>Set theme</b></legend>
                <input type="radio" id="auto" name="theme" value="auto" on:change={setTheme} />
                <label for="auto">Automatic</label>
                <input type="radio" id="light" name="theme" value="light" on:change={setTheme} />
                <label for="light">Light Theme</label>
                <input type="radio" id="dark " name="theme" value="dark" on:change={setTheme} />
                <label for="dark">Dark Theme</label>
            </form>
        </div>
        <div>
            <form role="group">
                <input type="text" value={saveFolder} readonly />
                <input type="button" on:click={setSaveFolder} value="Set Save Folder" />
            </form>
        </div>
    </div>
</article>
