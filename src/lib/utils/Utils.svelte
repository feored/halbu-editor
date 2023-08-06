<script context="module">
    export function enforceMinMax(el) {
        if (el.value != "") {
            if (parseFloat(el.value) < parseFloat(el.min)) {
            el.value = el.min;
            }
            if (parseFloat(el.value) > parseFloat(el.max)) {
            el.value = el.max;
            }
        }
    }
</script>