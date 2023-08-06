export function enforceMinMax(node) {

	function enforceMinMax() {
        if (node.value === "") {
            node.value = node.min;
        } else{
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
