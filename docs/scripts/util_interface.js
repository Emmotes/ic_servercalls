const vi = 1.000; // prettier-ignore

const i_create = (tag, attr = {}, ...children) => {
	const ele = document.createElement(tag ?? `span`);

	const {style, dataset, ...rest} = attr;

	for (const [key, value] of Object.entries(rest)) {
		if (key.startsWith(`data-`) || key.startsWith(`aria-`))
			ele.setAttribute(key, value);
		else if (key in ele) ele[key] = value;
		else ele.setAttribute(key, value);
	}

	if (style) Object.assign(ele.style, style);
	if (dataset) Object.assign(ele.dataset, dataset);

	const validChildren = children
		.flat()
		.filter((c) => c != null && c !== undefined && c !== false);
	i_addChildren(ele, ...validChildren);
	return ele;
};

const i_createNS = (root, name, attrs) => {
	const rootStr = typeof root === `string`;
	const ns = rootStr ? root : root.getAttribute(`xmlns`);
	const ele = document.createElementNS(ns, name);
	if (rootStr) ele.setAttribute(`xmlns`, root);
	for (const attr in attrs)
		if (Object.prototype.hasOwnProperty.call(attrs, attr))
			ele.setAttribute(attr, attrs[attr]);
	return rootStr ? ele : i_addChild(root, ele);
};

const i_clear = (ele) => ele.replaceChildren();

const i_setChild = (ele, child) => ele.replaceChildren(child);

const i_setChildren = (ele, ...children) => ele.replaceChildren(...children);

const i_addChild = (ele, child) => ele.appendChild(child);

const i_addChildren = (ele, ...children) => ele.append(...children);

const i_removeChild = (ele, child) => ele.removeChild(child);

const i_replace = (ele, replacement) => ele.replaceWith(replacement);

const i_removeSelf = (ele) => i_removeChild(ele.parentNode, ele);

const i_breaks = (n = 1) => {
	const brs = [];
	for (let i = 0; i < n; i++) brs.push(document.createElement(`br`));
	return brs;
};
