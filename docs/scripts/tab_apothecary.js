const vap = 2.000; // prettier-ignore
const ap_LSKey_includeDistills = `scIncludeDistills`;
const ap_LSKey_distillMaintains = `scDistillMaintains`;
const ap_METHOD_SELECTID = "ap_method";
const ap_MODES = [`-`, `Distill`, `Brew`];
let ap_ownedById = null;
let ap_reagents = null;
let ap_vessels = null;
let ap_brewCosts = null;
let ap_enhanceCosts = null;

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

	const gameRuleCosts = ap_getGameRuleCosts(gameRules);
	if (gameRuleCosts) {
		if (gameRuleCosts.brewCosts != null)
			ap_brewCosts = gameRuleCosts.brewCosts;
		if (gameRuleCosts.enhanceCosts != null)
			ap_enhanceCosts = gameRuleCosts.enhanceCosts;
	}

	const incs = ap_getInclusions();

	ap_ownedById = ap_parseOwnedPotions(details);
	ap_reagents = Number(details?.stats?.potion_reagents || 0);
	ap_vessels = Number(details?.stats?.legendary_vessels || 0);

	const inventoryWrapper = document.getElementById(`apothecaryInventory`);
	if (inventoryWrapper != null)
		inventoryWrapper.innerHTML = ap_buildInventoryDisplay(
			incs.incSpecs,
			incs.incPoPs,
			incs.inc7Days,
		);

	wrapper.innerHTML = `&nbsp;`;
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
			id: `ap_inv_vessels`,
			data: {vessels: ap_vessels || 0},
		},
		{text: `&nbsp;`, gridCol: `4 / -1`},
	]);
	txt += ap_addSingleApothecaryRow(`&nbsp;`);
	txt += ap_addApothecaryRow([
		{
			text: `<label for="${ap_METHOD_SELECTID}">Method:</label>`,
			classes: flex,
		},
		{
			text: ap_buildMethodSelect(),
			classes: flex,
			gridCol: `span 2`,
		},
		{text: `&nbsp;`, gridCol: `4 / -1`},
	]);

	return txt;
}

function ap_buildMethodSelect() {
	let txt = `<select id="${ap_METHOD_SELECTID}" name="${ap_METHOD_SELECTID}" oninput="ap_changeMethod(this.value);">`;
	for (let mode of ap_MODES)
		txt += `<option value="${mode}"${mode === `-` ? " selected" : ""}>${mode}</option>`;
	txt += `</select>`;
	return txt;
}

function ap_changeMethod(value) {
	const wrapper = document.getElementById(`apothecaryWrapper`);
	let txt;

	if (value === `Distill`) {
		txt = ap_buildDistillDisplay();
		setFormsWrapperFormat(wrapper, 5);
	} else if (value === `Brew`) {
		txt = ap_buildBrewDisplay();
		setFormsWrapperFormat(wrapper, 6);
	} else if (value === `Enhance`) {
		txt = ap_buildEnhanceDisplay();
		setFormsWrapperFormat(wrapper, 6);
	} else {
		txt = `&nbsp;`;
		setFormsWrapperFormat(wrapper, 0);
	}

	wrapper.innerHTML = txt;
	if (value === `Brew`) ap_recalculateBrewValues();
}

// =============================
// ===== DISTILL FUNCTIONS =====
// =============================

function ap_buildDistillDisplay() {
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
	const incs = ap_getInclusions();
	for (let category in categories) {
		let hide = false;
		if (category === "spec" && !incs.incSpecs) hide = true;
		if (category === "pop" && !incs.incPoPs) hide = true;
		if (category === "7days" && !incs.inc7Days) hide = true;
		const id = `ap_distill_maintain_${category}`;
		let maintain = Number(savedDistillMaintains[category]);
		if (isNaN(maintain)) maintain = 1000;
		const inp = `<input type="number" id="${id}" data-category="${category}" min="0" value="${maintain}" style="width:70px" oninput="ap_saveDistillMaintains(ap_buildDistillMaintains())">`;
		txt += ap_addApothecaryRow([
			{
				text: categories[category],
				classes: `f fr falc fje`,
				id: `${id}grid1`,
				hide: hide,
				data: {hidecat: category},
			},
			{
				text: inp,
				classes: `f fr falc fjc`,
				id: `${id}grid2`,
				hide: hide,
				data: {hidecat: category},
			},
			{
				text: `&nbsp;`,
				classes: `f fr falc fjs`,
				id: `${id}grid3`,
				hide: hide,
				data: {hidecat: category},
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

async function ap_distillPotions() {
	ap_disableAllApothecaryInputs(true);
	const distillDetails = document.getElementById(`apothecaryDistillDetails`);
	let txt = `<span class="f fr w100 p5">Distilling Potions:</span>`;
	distillDetails.innerHTML = txt;

	const incs = ap_getInclusions();

	const allowedCats = new Set(["small", "medium", "large", "huge"]);
	if (incs.incSpecs) allowedCats.add("spec");
	if (incs.incPoPs) allowedCats.add("pop");
	if (incs.inc7Days) allowedCats.add("7days");

	let potsToDistill = {};

	const maintain = ap_buildDistillMaintains();

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
			const diff = ap_updateCurrentPotionCountAndDiff(id, newAmount);
			if (diff == null) continue;
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

// ==========================
// ===== BREW FUNCTIONS =====
// ==========================

function ap_buildBrewDisplay() {
	if (ap_brewCosts == null)
		return ap_addSingleApothecaryRow(
			`Apologies but brewing definitions failed to pull properly. Brewing is disabled.`,
		);

	const eFlex = `f fr falc fje`;
	const cFlex = `f fr falc fjc`;

	let txt = ``;
	txt += ap_addSingleApothecaryRow(`Brew Potions`, true);
	txt += ap_addSingleApothecaryRow(`&nbsp;`);
	txt += ap_addSingleApothecaryRow(
		`Here you can brew specific amounts of any Speed potion - provided you have the resources to do so.`,
	);
	txt += ap_addSingleApothecaryRow(`&nbsp;`);
	txt += ap_addApothecaryRow([
		{text: `Potion Type`, classes: eFlex, header: true},
		{text: `Brew Amount`, classes: cFlex, header: true},
		{text: `Current`, classes: eFlex, header: true},
		{text: `&nbsp;`, classes: cFlex, header: true},
		{text: `After`, classes: eFlex, header: true},
	]);

	const potions = [...(b_potionsByBuff.get("Speed") ?? [])];
	potions.sort((a, b) => {
		const order = ["small", "medium", "large", "huge", "legendary"];
		return order.indexOf(a.size) - order.indexOf(b.size);
	});
	for (let potion of potions) {
		const id = potion.id;
		const curr = nf(ap_ownedById[id] || 0);
		const inp =
			`<input type="number" id="ap_brew_${id}" data-potid="${id}" value="0" min="0" style="width:70%" oninput="ap_recalculateBrewValues()">` +
			`<span style="width:5px">&nbsp;</span>` +
			`<input type="button" id="ap_brew_max${id}" onclick="ap_maxBrewType(${id});" value="Max" style="width:20%">`;
		txt += ap_addApothecaryRow([
			{text: potion.name, classes: eFlex},
			{text: inp, classes: cFlex},
			{text: curr, classes: eFlex, id: `ap_brew_curr${id}`},
			{text: `→`, classes: cFlex},
			{text: curr, classes: eFlex, id: `ap_brew_after${id}`},
		]);
	}
	txt += ap_addSingleApothecaryRow(`&nbsp;`);
	txt += ap_addApothecaryRow([
		{text: `Reagent Cost:`, classes: eFlex},
		{text: `0`, classes: eFlex, id: `ap_brew_reagentCost`},
		{text: `&nbsp;`, gridCol: `3 / -1`},
		{text: `Vessel Cost:`, classes: eFlex},
		{text: `0`, classes: eFlex, id: `ap_brew_vesselCost`},
		{text: `&nbsp;`, gridCol: `3 / -1`},
	]);
	txt += ap_addSingleApothecaryRow(`&nbsp;`);
	txt += ap_addApothecaryRow([
		{
			text:
				`<input type="button" id="ap_brewPotionsButton" value="Brew Potions" onclick="ap_brewPotions()" style="display:none">` +
				`<span class="f fr falc fjc" id="ap_brewPotionsHideButton">&nbsp;</span>`,
			gridCol: `span 2`,
			classes: `f fc falc fjc greenButton`,
			id: `apothecaryBrewDetails`,
		},
		{text: `&nbsp;`, gridCol: `3 / -1`},
	]);
	return txt;
}

async function ap_brewPotions() {
	ap_disableAllApothecaryInputs(true);
	const brewDetails = document.getElementById(`apothecaryBrewDetails`);
	brewDetails.style.gridColumn = `1 / -1`;

	let txt = `<span class="f fr w100 p5">Brewing Potions:</span>`;
	brewDetails.innerHTML = txt;

	let potsToBrew = [];
	const eles = document.querySelectorAll(
		`#apothecaryWrapper input[type="number"][data-potid]`,
	);
	for (let ele of eles) {
		if (ele == null) continue;
		const id = Number(ele.dataset?.potid || -1);
		const value = Number(ele.value || -1);
		if (id < 1 || value <= 0) continue;
		potsToBrew.push({id, value});
	}

	if (potsToBrew.length === 0) {
		txt = `<span class="f fr w100 p5">No Potions to Brew</span>`;
		brewDetails.innerHTML = txt;
		ap_disableAllApothecaryInputs(false);
		return;
	}

	for (let potToBrew of potsToBrew) {
		const id = potToBrew?.id || -1;
		const count = potToBrew?.value || -1;
		if (id < 0 || count <= 0) continue;

		const potion = b_potionsById.get(id || 0);
		const name = potion?.name ?? `Unknown (${id})`;

		const response = await brewPotions(id, count);
		let successType = ``;
		if (
			response.success &&
			Array.isArray(response.actions) &&
			response.actions.length > 0 &&
			response.brew_result
		) {
			successType = `Successfully brewed`;

			let reagents = Number(ap_reagents || 0);
			reagents -= Number(response.brew_result?.reagents_spent || 0);
			if (isNaN(reagents) || reagents < 0) reagents = 0;
			ap_reagents = reagents;
			const reagentsEle = document.getElementById(`ap_inv_reagents`);
			if (reagentsEle) {
				reagentsEle.dataset.reagents = ap_reagents;
				reagentsEle.innerHTML = nf(ap_reagents);
			}

			let vessels = Number(ap_vessels || 0);
			vessels -= Number(response.brew_result?.vessels_spent || 0);
			if (isNaN(vessels) || vessels < 0) vessels = 0;
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
				ap_updateCurrentPotionCountAndDiff(id, newAmount);
			}
		} else {
			successType = `Failed to brew`;
			console.log("Reponse:", response);
		}
		txt +=
			`<span class="f fr w100 p5">` +
			`<span class="f falc fje mr2" style="width:160px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">${successType}:</span>` +
			`<span class="f falc fjs ml2" style="flex-grow:1;margin-left:5px;flex-wrap:wrap">${nf(count)} ${name}</span>` +
			`</span>`;
		brewDetails.innerHTML = txt;
		await sleep(200);
	}

	ap_disableAllApothecaryInputs(false);
}

function ap_maxBrewType(id) {
	const ele = document.getElementById(`ap_brew_${id}`);
	if (!ele) return;

	const brewCost = ap_brewCosts[id];
	const reagentsPer = Number(brewCost?.r || 0);
	const vesselsPer = Number(brewCost?.v || 0);
	if (reagentsPer === 0 && vesselsPer === 0) return;

	const maxFromReagents =
		reagentsPer > 0 ? Math.floor((ap_reagents || 0) / reagentsPer) : 0;
	const maxFromVessels =
		vesselsPer > 0 ? Math.floor((ap_vessels || 0) / vesselsPer) : 0;

	const max =
		vesselsPer === 0 ? maxFromReagents
		: reagentsPer === 0 ? maxFromVessels
		: Math.min(maxFromReagents, maxFromVessels);

	ele.value = max;

	ap_recalculateBrewValues();
}

function ap_recalculateBrewValues() {
	let reagentCost = 0;
	let vesselCost = 0;

	const eles = document.querySelectorAll(
		`#apothecaryWrapper input[type="number"][data-potid]`,
	);
	let atLeastOneNotZero = false;
	for (let ele of eles) {
		if (ele == null) continue;
		const id = Number(ele.dataset?.potid || -1);
		if (id < 1) continue;
		let value = Number(ele.value || 0);
		if (!Number.isFinite(value) || value < 0) value = 0;
		if (!atLeastOneNotZero && value > 0) atLeastOneNotZero = true;
		const brewCost = ap_brewCosts?.[id] ?? ap_brewCosts?.[String(id)];
		reagentCost += value * Number(brewCost?.r || 0);
		vesselCost += value * Number(brewCost?.v || 0);
		const eleAfter = document.getElementById(`ap_brew_after${id}`);
		if (eleAfter) eleAfter.innerHTML = nf((ap_ownedById[id] || 0) + value);
	}
	const haveEnoughReagents = (ap_reagents || 0) >= reagentCost;
	const haveEnoughVessels = (ap_vessels || 0) >= vesselCost;

	const eleReagentCost = document.getElementById(`ap_brew_reagentCost`);
	if (eleReagentCost) {
		eleReagentCost.innerHTML = nf(reagentCost);
		eleReagentCost.style.color =
			haveEnoughReagents ? `` : `var(--RedOrange)`;
	}
	const eleVesselCost = document.getElementById(`ap_brew_vesselCost`);
	if (eleVesselCost) {
		eleVesselCost.innerHTML = nf(vesselCost);
		eleVesselCost.style.color = haveEnoughVessels ? `` : `var(--RedOrange)`;
	}

	const button = document.getElementById("ap_brewPotionsButton");
	const message = document.getElementById("ap_brewPotionsHideButton");
	if (button == null || message == null) return;

	if (!atLeastOneNotZero) {
		message.innerHTML = `Can't brew until you have set a valid brew amount.`;
		message.style.display = ``;
		button.style.display = `none`;
	} else if (!haveEnoughReagents || !haveEnoughVessels) {
		message.innerHTML = `You can't afford to brew the amounts you have chosen.`;
		message.style.display = ``;
		button.style.display = `none`;
	} else {
		message.innerHTML = `&nbsp;`;
		message.style.display = `none`;
		button.style.display = ``;
	}
}

// =============================
// ===== ENHANCE FUNCTIONS =====
// =============================

// None yet.

// =============================
// ===== UTILITY FUNCTIONS =====
// =============================

function ap_getGameRuleCosts(gameRules) {
	for (let gameRule of gameRules) {
		if (gameRule?.rule_name !== `apothecary_conversions`) continue;
		const rule = gameRule?.rule;
		if (rule == null) return null;
		const brewCosts = rule?.brew_costs;
		const enhanceCosts = rule?.enhance_costs;
		return {brewCosts, enhanceCosts};
	}
	return null;
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

function ap_updateCurrentPotionCountAndDiff(id, newAmount) {
	if (id == null || newAmount == null || id < 1 || newAmount < 0) return null;
	const oldAmount = ap_ownedById[id] || 0;
	ap_ownedById[id] = newAmount;
	const ele = document.getElementById(`ap_inv_${id}`);
	if (ele && ele.dataset.id === `${id}`) {
		ele.dataset.value = newAmount;
		ele.innerHTML = nf(newAmount);
	}
	return oldAmount - newAmount;
}

function ap_disableAllApothecaryInputs(disable) {
	const methodEle = document.getElementById(ap_METHOD_SELECTID);
	if (methodEle) {
		methodEle.disabled = disable;
		methodEle.style.color = disable ? `#555` : ``;
		methodEle.style.backgroundColor =
			disable ? `hsl(calc(240*0.95),15%,calc(16%*0.8))` : ``;
	}
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

function ap_getInclusions() {
	const incSpecs = document.getElementById(`apothecaryIncludeSpec`).checked;
	const incPoPs = document.getElementById(`apothecaryIncludePoP`).checked;
	const inc7Days = document.getElementById(`apothecaryInclude7Days`).checked;
	return {incSpecs, incPoPs, inc7Days};
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

	const incs = ap_getInclusions();

	const incGap = document.getElementById(`ap_distill_includeGap`);
	if (incGap != null)
		incGap.style.display =
			!incs.incSpecs && !incs.incPoPs && !incs.inc7Days ? `none` : ``;

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

function ap_buildDistillMaintains() {
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
