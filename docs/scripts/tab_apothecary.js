const vap = 1.000; // prettier-ignore
const ap_LSKey_includeDistills = `scIncludeDistills`;
const ap_LSKey_distillMaintains = `scDistillMaintains`;
let ap_ownedById = null;
let ap_reagents = null;
let ap_vessels = null;

async function ap_pullApothecaryData() {
	if (isBadUserData()) return;
	disablePullButtons();
	const wrapper = document.getElementById(`apothecaryWrapper`);
	const inventory = document.getElementById(`apothecaryInventory`);
	inventory.innerHTML = `&nbsp;`;
	setFormsWrapperFormat(wrapper, 0);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		wrapper.innerHTML = `Waiting for user data...`;
		const details = (await getUserDetails()).details;
		wrapper.innerHTML = `Waiting for definitions...`;
		const gameRules = (await getDefinitions("game_rule_defines"))
			.game_rule_defines;
		await ap_displayApothecaryData(wrapper, details, gameRules);
		codeEnablePullButtons();
	} catch (error) {
		setFormsWrapperFormat(wrapper, 0);
		handleError(wrapper, error);
	}
}

async function ap_displayApothecaryData(wrapper, details, gameRules) {
	if (details == null || gameRules == null) {
		wrapper.innerHTML = `Error.`;
		return;
	}

	const incSpecs = document.getElementById(`apothecaryIncludeSpec`).checked;
	const incPoPs = document.getElementById(`apothecaryIncludePoP`).checked;
	const inc7Days = document.getElementById(`apothecaryInclude7Days`).checked;

	ap_ownedById = ap_parseOwnedPotions(details);
	ap_reagents = Number(details?.stats?.potion_reagents || 0);
	ap_vessels = Number(details?.stats?.legendary_vessels || 0);

	const inventoryWrapper = document.getElementById(`apothecaryInventory`);
	if (inventoryWrapper != null)
		inventoryWrapper.innerHTML = ap_buildInventoryDisplay(
			incSpecs,
			incPoPs,
			inc7Days,
		);

	let txt = ap_buildDistillDisplay(incSpecs, incPoPs, inc7Days);

	setFormsWrapperFormat(wrapper, 5);
	wrapper.innerHTML = txt;
}

function ap_buildInventoryDisplay(incSpecs, incPoPs, inc7Days) {
	let txt = ``;
	txt += ap_addSingleApothecaryRow(`Current Potion Inventory`, true);
	txt += ap_addSingleApothecaryRow(`&nbsp;`);

	const buffTypes = [...b_potionsByBuff.keys()];
	const sizeTypes = [...b_potionsBySize.keys()];

	const flex = `f fr falc fje`;

	let firstRow = [];
	firstRow.push({text: `&nbsp;`, classes: flex});
	for (let size of sizeTypes)
		firstRow.push({text: capitalise(size), classes: flex});
	txt += ap_addApothecaryRow(firstRow);

	for (let buff of buffTypes) {
		const row = [];

		row.push({
			text: buff,
			classes: flex,
		});

		for (let size of sizeTypes) {
			const pot = b_potionsByBuffAndSize.get(buff)?.get(size);
			if (pot == null) {
				row.push({text: `???`, classes: flex, small: true});
				continue;
			}

			const amount = ap_ownedById[pot.id] || 0;
			row.push({
				text: nf(amount),
				classes: flex,
				small: true,
				id: `ap_inv_${pot.id}`,
				data: {id: pot.id, value: amount},
			});
		}
		txt += ap_addApothecaryRow(row);
	}
	txt += ap_addSingleApothecaryRow(`&nbsp;`, false, `ap_distill_includeGap`);

	const categories = ["spec", "pop", "7days"];
	for (let category of categories) {
		const row = [];
		for (let potion of b_potionsByCategory.get(category)) {
			if (potion.distillBanned) continue;
			const hide =
				(category === "spec" && !incSpecs) ||
				(category === "pop" && !incPoPs) ||
				(category === "7days" && !inc7Days);
			const id = `ap_inv_${potion.id}`;
			row.push({
				text: potion.name,
				classes: flex,
				gridCol: `span 2`,
				hide: hide,
				id: id + `1`,
				data: {hidecat: category},
			});
			const amount = ap_ownedById[potion.id] || 0;
			row.push({
				text: nf(amount),
				classes: flex,
				small: true,
				gridCol: `span 1`,
				hide: hide,
				id: id,
				data: {id: potion.id, value: amount, hidecat: category},
			});
			row.push({
				text: `&nbsp;`,
				gridCol: `4 / -1`,
				hide: hide,
				id: id + `2`,
				data: {hidecat: category},
			});
		}
		txt += ap_addApothecaryRow(row);
	}
	txt += ap_addSingleApothecaryRow(`&nbsp;`);
	txt += ap_addApothecaryRow([
		{text: "Potion Reagents", classes: flex, gridCol: `span 2`},
		{
			text: nf(ap_reagents || 0),
			classes: flex,
			small: true,
			gridCol: `span 1`,
			id: `ap_inv_reagents`,
			data: {reagents: ap_reagents || 0},
		},
		{text: `&nbsp;`, gridCol: `4 / -1`},
	]);
	txt += ap_addApothecaryRow([
		{text: "Legendary Vessels", classes: flex, gridCol: `span 2`},
		{
			text: nf(ap_vessels || 0),
			classes: flex,
			small: true,
			gridCol: `span 1`,
			id: `ap_inv_vessels`,
			data: {vessels: ap_vessels || 0},
		},
		{text: `&nbsp;`, gridCol: `4 / -1`},
	]);

	return txt;
}

function ap_buildDistillDisplay(incSpecs, incPoPs, inc7Days) {
	let txt = ``;
	txt += ap_addSingleApothecaryRow(`Distill Potions`, true);
	txt += ap_addSingleApothecaryRow(`&nbsp;`);
	txt += ap_addSingleApothecaryRow(
		`Here you can distill all non-speed potions down to a chosen maintain amount. ` +
			`Any potions above that amount will be distilled. ` +
			`Only small, medium, large, and huge potions are included unless you enable additional options in the top-right.`,
	);
	txt += ap_addSingleApothecaryRow(`&nbsp;`);
	txt += ap_addApothecaryRow([
		{text: `Potion Type`, classes: `f fr falc fje`, header: true},
		{text: `Maintain Amount`, classes: `f fr falc fjc`, header: true},
		{text: `&nbsp;`, classes: `f fr falc fjs`, header: true},
	]);

	const savedDistillMaintains = ap_getDistillMaintains();
	const categories = {
		small: "Small Potions",
		medium: "Medium Potions",
		large: "Large Potions",
		huge: "Huge Potions",
		spec: "Specialisation Potions",
		pop: "Potions of Polish",
		"7days": "7 Day Potions",
	};
	for (let category in categories) {
		let hide = false;
		if (category === "spec" && !incSpecs) hide = true;
		if (category === "pop" && !incPoPs) hide = true;
		if (category === "7days" && !inc7Days) hide = true;
		const id = `ap_distill_maintain_${category}`;
		let maintain = Number(savedDistillMaintains[category]);
		if (isNaN(maintain)) maintain = 1000;
		const inp = `<input type="number" id="${id}" data-category="${category}" min="0" value="${maintain}" style="width:70px" oninput="ap_saveDistillMaintains(ap_buildMaintains())">`;
		txt += ap_addApothecaryRow([
			{
				text: categories[category],
				classes: `f fr falc fje`,
				id: `${id}grid1`,
				hide: hide,
				data: {hidecat:category}
			},
			{text: inp, classes: `f fr falc fjc`, id: `${id}grid2`, hide: hide, data: {hidecat:category}},
			{
				text: `&nbsp;`,
				classes: `f fr falc fjs`,
				id: `${id}grid3`,
				hide: hide,
				data: {hidecat:category}
			},
		]);
	}
	txt += ap_addSingleApothecaryRow(`&nbsp;`);
	txt += ap_addApothecaryRow([
		{
			text: `<input type="button" id="ap_distillPotionsButton" value="Distill Potions" onclick="ap_distillPotions()">`,
			gridCol: `span 2`,
			classes: `f fc falc fjc redButton`,
			id: `apothecaryDistillDetails`,
		},
		{text: `&nbsp;`},
	]);
	return txt;
}

function ap_parseOwnedPotions(details) {
	const ownedById = {};
	for (let buff of details.buffs) {
		const id = Number(buff.buff_id);
		if (!b_potionsById.has(id)) continue;
		ownedById[id] = buff.inventory_amount;
	}
	return ownedById;
}

async function ap_distillPotions() {
	ap_disableAllApothecaryInputs(true);
	const distillDetails = document.getElementById(`apothecaryDistillDetails`);
	let txt = `<span class="f fr w100 p5">Distilling Potions:</span>`;
	distillDetails.innerHTML = txt;

	const incSpecs = document.getElementById(`apothecaryIncludeSpec`).checked;
	const incPoPs = document.getElementById(`apothecaryIncludePoP`).checked;
	const inc7Days = document.getElementById(`apothecaryInclude7Days`).checked;

	const allowedCats = new Set(["small", "medium", "large", "huge"]);
	if (incSpecs) allowedCats.add("spec");
	if (incPoPs) allowedCats.add("pop");
	if (inc7Days) allowedCats.add("7days");

	let potsToDistill = {};

	const maintain = ap_buildMaintains();

	for (const idStr in ap_ownedById) {
		const id = Number(idStr);
		const value = ap_ownedById[idStr];
		if (isNaN(id) || isNaN(value)) continue;
		const buff = b_potionsById.get(id);
		if (buff == null || buff.distillBanned) continue;
		if (!allowedCats.has(buff.size ?? buff.category)) continue;
		if (buff?.buff === "Speed") continue;
		const maintainAmount = maintain[buff.size ?? buff.category];
		if (maintainAmount == null || isNaN(maintainAmount)) continue;
		const distillAmount = value - maintainAmount;
		if (distillAmount <= 0) continue;
		potsToDistill[id] = distillAmount;
	}
	if (Object.keys(potsToDistill).length === 0) {
		txt = `<span class="f fr w100 p5">No Potions to Distill</span>`;
		distillDetails.innerHTML = txt;
		ap_disableAllApothecaryInputs(false);
		return;
	}

	const response = await distillPotions(potsToDistill);
	if (
		response.success &&
		Array.isArray(response.actions) &&
		response.actions.length > 0 &&
		response.converstion_result
	) {
		txt = `<span class="f fr w100 p5">Successfully Distilled Potions:</span>`;

		let reagents = Number(ap_reagents || 0);
		reagents += Number(response.converstion_result?.reagents || 0);
		if (isNaN(reagents)) reagents = 0;
		ap_reagents = reagents;
		const reagentsEle = document.getElementById(`ap_inv_reagents`);
		if (reagentsEle) {
			reagentsEle.dataset.reagents = ap_reagents;
			reagentsEle.innerHTML = nf(ap_reagents);
		}

		let vessels = Number(ap_vessels || 0);
		vessels += Number(response.converstion_result?.vessels || 0);
		if (isNaN(vessels)) vessels = 0;
		ap_vessels = vessels;
		const vesselsEle = document.getElementById(`ap_inv_vessels`);
		if (vesselsEle) {
			vesselsEle.dataset.vessels = vessels;
			vesselsEle.innerHTML = nf(vessels);
		}
		for (let action of response.actions) {
			if (action == null) continue;
			const type = action.action || ``;
			if (type !== "set_buff_amount") continue;
			const id = Number(action?.buff_id || -1);
			const newAmount = Number(action?.amount || -1);
			if (id < 0 || newAmount < 0) continue;
			const oldAmount = ap_ownedById[id] || 0;
			ap_ownedById[id] = newAmount;
			const ele = document.getElementById(`ap_inv_${id}`);
			if (ele && ele.dataset.id === `${id}`) {
				ele.dataset.value = newAmount;
				ele.innerHTML = nf(newAmount);
			}
			const diff = oldAmount - newAmount;
			const potion = b_potionsById.get(id);
			const name = potion?.name ?? `Unknown (${id})`;
			txt += `<span class="f fr w100 p5" style="padding-left:20px">${name}: ${nf(diff)}</span>`;
		}
	} else {
		txt = `<span class="f fr w100 p5">Failed to Distill Potions</span>`;
		console.log("Reponse:", response);
	}
	distillDetails.innerHTML = txt;

	ap_disableAllApothecaryInputs(false);
}

function ap_disableAllApothecaryInputs(disable) {
	if (disable) {
		disablePullButtons();
		for (let ele of document.querySelectorAll(`input[id^="ap_"]`)) {
			if (ele.type !== "number" && ele.type !== "button") continue;
			ele.disabled = true;
			ele.style.color = `#555`;
			ele.style.backgroundColor = `hsl(calc(240*0.95),15%,calc(16%*0.8))`;
		}
	} else codeEnablePullButtons();
}

function ap_addApothecaryRow(columns) {
	let txt = ``;
	for (let column of columns) {
		let style =
			column.header ? `font-size:1.2em;`
			: column.large ? `font-size:1.1em;`
			: column.small ? `font-size:0.9em;`
			: ``;
		if (column.hide) style += `display:none;`;
		if (column.gridCol != null) style += `grid-column:${column.gridCol};`;
		if (style !== ``) style = ` style="${style}"`;
		let id = column.id != null ? ` id="${column.id}"` : ``;
		let data = ``;
		if (column.data != null && typeof column.data === "object")
			for (let key in column.data)
				data += ` data-${key}="${column.data[key]}"`;
		txt += `<span class="${column.classes || `f fr falc fjs`}"${id}${data}${style}>${column.text || `&nbsp;`}</span>`;
	}
	return txt;
}

function ap_addSingleApothecaryRow(msg, header, id) {
	if (id) id = ` id="${id}"`;
	return `<span class="f falc fjs"${id} style="grid-column:1 / -1${header ? `;font-size:1.2em` : ``}">${msg}</span>`;
}

function ap_initApothecaryHideOptions() {
	const includedDistills = ap_getIncludedDistills();
	if (includedDistills.length === 0) return;
	for (let ele of document.querySelectorAll(
		'input[id^="apothecaryInclude"]',
	)) {
		const eleId = ele.id.replace(`apothecaryInclude`, ``).toLowerCase();
		ele.checked = includedDistills.includes(eleId);
	}
}

function ap_toggleIncludePotions(checkbox) {
	const category = checkbox.id.replace(`apothecaryInclude`, ``).toLowerCase();
	document
		.querySelectorAll(`[data-hidecat="${category}"]`)
		.forEach((distillHidden) => {
			distillHidden.style.display = checkbox.checked ? `` : `none`;
		});

	const incSpecs = document.getElementById(`apothecaryIncludeSpec`)?.checked;
	const incPoPs = document.getElementById(`apothecaryIncludePoP`)?.checked;
	const inc7Days = document.getElementById(`apothecaryInclude7Days`)?.checked;

	const incGap = document.getElementById(`ap_distill_includeGap`);
	if (incGap != null)
		incGap.style.display = !incSpecs && !incPoPs && !inc7Days ? `none` : ``;

	let strg = ap_getIncludedDistills();
	if (checkbox.checked && !strg.includes(category)) strg.push(category);
	else if (!checkbox.checked && strg.includes(category))
		strg = strg.filter((x) => x !== category);
	ap_saveIncludedDistills(strg);
}

function ap_getIncludedDistills() {
	let strg = localStorage.getItem(ap_LSKey_includeDistills);
	if (!strg) return [];
	strg = JSON.parse(strg);
	if (!strg[currAccount.name]) return [];
	return strg[currAccount.name];
}

function ap_saveIncludedDistills(eleIds) {
	let strg = localStorage.getItem(ap_LSKey_includeDistills);
	if (!strg) strg = {};
	else strg = JSON.parse(strg);
	if (eleIds.length === 0) delete strg[currAccount.name];
	else strg[currAccount.name] = eleIds;
	localStorage.setItem(ap_LSKey_includeDistills, JSON.stringify(strg));
}

function ap_buildMaintains() {
	const maintain = {};
	for (const ele of document.querySelectorAll(
		`input[id^="ap_distill_maintain_"]`,
	)) {
		const category = ele.dataset.category;
		const value = Math.max(0, Number(ele.value));
		if (category == null || value == null) continue;
		maintain[category] = value;
	}
	return maintain;
}

function ap_getDistillMaintains() {
	let strg = localStorage.getItem(ap_LSKey_distillMaintains);
	if (!strg) return {};
	strg = JSON.parse(strg);
	if (!strg[currAccount.name]) return {};
	return strg[currAccount.name];
}

function ap_saveDistillMaintains(categories) {
	let strg = localStorage.getItem(ap_LSKey_distillMaintains);
	if (!strg) strg = {};
	else strg = JSON.parse(strg);
	if (Object.keys(categories).length === 0) delete strg[currAccount.name];
	else strg[currAccount.name] = categories;
	localStorage.setItem(ap_LSKey_distillMaintains, JSON.stringify(strg));
}
