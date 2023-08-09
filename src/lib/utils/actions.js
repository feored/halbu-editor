import tippy from "tippy.js";

export function enforceMinMax(node) {

    function enforceMinMax() {
        if (node.value === "") {
            node.value = node.min;
        } else {
            if (parseFloat(node.value) < parseFloat(node.min)) {
                node.value = node.min;
            }
            if (parseFloat(node.value) > parseFloat(node.max)) {
                node.value = node.max;
            }
        }
    }

    node.addEventListener('input', enforceMinMax);
    node.addEventListener('change', enforceMinMax);

    return {
        destroy() {
            node.removeEventListener('input', enforceMinMax);
            node.removeEventListener('change', enforceMinMax);
        }
    };
}

export function tooltip(node, params = {}) {
    const content = params.content;

    const tip = tippy(node, { content, ...params });

    return {
        update: (newParams) => tip.setProps({ content, ...newParams }),
        destroy: () => tip.destroy(),
    };
};