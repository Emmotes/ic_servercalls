const vap = 2.003; // prettier-ignore
const ap_LSKEY_includeDistills = `scIncludeDistills`;
const ap_LSKEY_distillMaintains = `scDistillMaintains`;
const ap_METHOD_SELECTID = "ap_method";
const ap_MODES = [`-`, `Distill`, `Brew`, `Enhance`];
const ap_enhanceState = {sourceId: null, resultId: null, amount: 0};
let ap_ownedById = null;
let ap_reagents = null;
let ap_vessels = null;
let ap_brewCosts = null;
let ap_enhanceGraph = null;
let ap_enhanceChains = null;

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
		if (gameRuleCosts.enhanceGraph != null)
			ap_enhanceGraph = gameRuleCosts.enhanceGraph;
		if (gameRuleCosts.enhanceChains != null)
			ap_enhanceChains = gameRuleCosts.enhanceChains;
	}

	const incs = ap_getInclusions();

	ap_ownedById = ap_parseOwnedPotions(details);
	ap_reagents = Number(details?.stats?.potion_reagents ?? 0);
	ap_vessels = Number(details?.stats?.legendary_vessels ?? 0);

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

			const amount = ap_ownedById[pot.id] ?? 0;
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
			const amount = ap_ownedById[potion.id] ?? 0;
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
			text: nf(ap_reagents ?? 0),
			classes: flex,
			small: true,
			id: `ap_inv_reagents`,
			data: {reagents: ap_reagents ?? 0},
		},
		{text: `&nbsp;`, gridCol: `4 / -1`},
	]);
	txt += ap_addApothecaryRow([
		{text: "Legendary Vessels", classes: flex, gridCol: `span 2`},
		{
			text: nf(ap_vessels ?? 0),
			classes: flex,
			small: true,
			id: `ap_inv_vessels`,
			data: {vessels: ap_vessels ?? 0},
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
		setFormsWrapperFormat(wrapper, 7);
	} else {
		txt = `&nbsp;`;
		setFormsWrapperFormat(wrapper, 0);
	}

	wrapper.innerHTML = txt;
	if (value === `Distill`) ap_recalculateDistillValues();
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

	const eFlex = `f fr falc fje`;
	const cFlex = `f fr falc fjc`;

	txt += ap_addSingleApothecaryRow(`&nbsp;`);
	txt += ap_addApothecaryRow([
		{text: `Potion Type`, classes: eFlex, header: true},
		{text: `Maintain Amount`, classes: cFlex, header: true},
		{text: `&nbsp;`, classes: cFlex, header: true},
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
		const inp = `<input type="number" id="${id}" data-category="${category}" min="0" value="${maintain}" style="width:60%" oninput="ap_recalculateDistillValues(true)">`;
		txt += ap_addApothecaryRow([
			{
				text: categories[category],
				classes: eFlex,
				id: `${id}grid1`,
				hide: hide,
				data: {hidecat: category},
			},
			{
				text: inp,
				classes: cFlex,
				id: `${id}grid2`,
				hide: hide,
				data: {hidecat: category},
			},
			{
				text: `&nbsp;`,
				classes: cFlex,
				id: `${id}grid3`,
				hide: hide,
				data: {hidecat: category},
			},
		]);
	}
	txt += ap_addSingleApothecaryRow(`&nbsp;`);
	txt += ap_addApothecaryRow([
		{
			text:
				`<input type="button" id="ap_distillPotionsButton" value="Distill Potions" onclick="ap_distillPotions()">` +
				`<span class="f fr falc fjc" id="ap_distillPotionsHideButton">&nbsp;</span>`,
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

		let reagents = Number(ap_reagents ?? 0);
		reagents += Number(response.converstion_result?.reagents ?? 0);
		if (isNaN(reagents)) reagents = 0;
		ap_reagents = reagents;
		const reagentsEle = document.getElementById(`ap_inv_reagents`);
		if (reagentsEle) {
			reagentsEle.dataset.reagents = ap_reagents;
			reagentsEle.innerHTML = nf(ap_reagents);
		}

		let vessels = Number(ap_vessels ?? 0);
		vessels += Number(response.converstion_result?.vessels ?? 0);
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
			const id = Number(action?.buff_id ?? -1);
			const newAmount = Number(action?.amount ?? -1);
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

function ap_recalculateDistillValues(save) {
	const maintain = ap_buildDistillMaintains();
	if (!maintain) return;
	if (save) ap_saveDistillMaintains(maintain);

	const canDistill = ap_calculateAtLeastOneDistillPossible(maintain);
	ap_hideDistillButton(!canDistill);
}

function ap_hideDistillButton(hide) {
	const button = document.getElementById(`ap_distillPotionsButton`);
	const message = document.getElementById(`ap_distillPotionsHideButton`);
	if (!button || !message) return;

	button.style.display = hide ? `none` : ``;
	message.style.display = hide ? `` : `none`;
	message.innerHTML = hide ? `No Potions to Distill` : `&nbsp;`;
}

function ap_calculateAtLeastOneDistillPossible(maintain) {
	const incs = ap_getInclusions();

	const allowedCats = new Set(["small", "medium", "large", "huge"]);
	if (incs.incSpecs) allowedCats.add("spec");
	if (incs.incPoPs) allowedCats.add("pop");
	if (incs.inc7Days) allowedCats.add("7days");

	for (let type in maintain) {
		if (!allowedCats.has(type)) continue;
		const amount = maintain[type] ?? 0;
		let potions = null;
		if (b_potionSizes.includes(type))
			potions = [...(b_potionsBySize.get(type) || [])];
		else potions = [...(b_potionsByCategory.get(type) || [])];
		if (potions.length === 0) continue;
		const potIds = potions.map((e) => e.id);
		for (let potId of potIds) {
			if (b_potionsById.get(potId).distillBanned) continue;
			const owned = ap_ownedById[potId] ?? 0;
			if (owned > amount) return true;
		}
	}
	return false;
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

	const potions = [...b_speedPotionsSortedBySize];
	for (let potion of potions) {
		const id = potion.id;
		const curr = nf(ap_ownedById[id] ?? 0);
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
			classes: `f fc falc fjc redButton`,
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
		const id = Number(ele.dataset?.potid ?? -1);
		const value = Number(ele.value ?? -1);
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
		const id = potToBrew?.id ?? -1;
		const count = potToBrew?.value ?? -1;
		if (id < 0 || count <= 0) continue;

		const potion = b_potionsById.get(id ?? 0);
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

			let reagents = Number(ap_reagents ?? 0);
			reagents -= Number(response.brew_result?.reagents_spent ?? 0);
			if (isNaN(reagents) || reagents < 0) reagents = 0;
			ap_reagents = reagents;
			const reagentsEle = document.getElementById(`ap_inv_reagents`);
			if (reagentsEle) {
				reagentsEle.dataset.reagents = ap_reagents;
				reagentsEle.innerHTML = nf(ap_reagents);
			}

			let vessels = Number(ap_vessels ?? 0);
			vessels -= Number(response.brew_result?.vessels_spent ?? 0);
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
				const id = Number(action?.buff_id ?? -1);
				const newAmount = Number(action?.amount ?? -1);
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
	id = Number(id);
	const ele = document.getElementById(`ap_brew_${id}`);
	if (!ele) return;

	const brewCost = ap_brewCosts?.[id] ?? ap_brewCosts?.[String(id)];
	const reagentsPer = Number(brewCost?.r ?? 0);
	const vesselsPer = Number(brewCost?.v ?? 0);
	if (reagentsPer === 0 && vesselsPer === 0) return;

	const plan = ap_getCurrentBrewPlan();
	const spent = ap_computeBrewCosts(plan, id);

	const remainingReagents = Math.max(
		0,
		Number(ap_reagents ?? 0) - spent.reagents,
	);
	const remainingVessels = Math.max(
		0,
		Number(ap_vessels ?? 0) - spent.vessels,
	);

	const maxFromReagents =
		reagentsPer > 0 ?
			Math.floor(remainingReagents / reagentsPer)
		:	Infinity;
	const maxFromVessels =
		vesselsPer > 0 ? Math.floor(remainingVessels / vesselsPer) : Infinity;

	const max = Math.min(maxFromReagents, maxFromVessels);

	ele.value = Number.isFinite(max) ? max : 0;

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
		const id = Number(ele.dataset?.potid ?? -1);
		if (id < 1) continue;
		let value = Number(ele.value ?? 0);
		if (!Number.isFinite(value) || value < 0) value = 0;
		if (!atLeastOneNotZero && value > 0) atLeastOneNotZero = true;
		const brewCost = ap_brewCosts?.[id] ?? ap_brewCosts?.[String(id)];
		reagentCost += value * Number(brewCost?.r ?? 0);
		vesselCost += value * Number(brewCost?.v ?? 0);
		const eleAfter = document.getElementById(`ap_brew_after${id}`);
		if (eleAfter) eleAfter.innerHTML = nf((ap_ownedById[id] ?? 0) + value);
	}
	const haveEnoughReagents = (ap_reagents ?? 0) >= reagentCost;
	const haveEnoughVessels = (ap_vessels ?? 0) >= vesselCost;

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

function ap_getCurrentBrewPlan() {
	const plan = new Map();
	for (const ele of document.querySelectorAll(
		`#apothecaryWrapper input[type="number"][data-potid]`,
	)) {
		const id = Number(ele.dataset?.potid ?? -1);
		if (id < 1) continue;
		const count = Math.max(0, Number(ele.value ?? 0));
		if (!Number.isFinite(count)) continue;
		plan.set(id, count);
	}
	return plan;
}

function ap_computeBrewCosts(plan, excludeId) {
	let reagents = 0;
	let vessels = 0;

	for (const [id, count] of plan.entries()) {
		if (id === excludeId) continue;
		if (count <= 0) continue;

		const brewCost = ap_brewCosts?.[id] ?? ap_brewCosts?.[String(id)];
		const r = Number(brewCost?.r ?? 0);
		const v = Number(brewCost?.v ?? 0);

		reagents += count * r;
		vessels += count * v;
	}

	return {reagents, vessels};
}

// =============================
// ===== ENHANCE FUNCTIONS =====
// =============================

function ap_buildEnhanceDisplay() {
	if (ap_enhanceGraph == null || ap_enhanceChains == null)
		return ap_addSingleApothecaryRow(
			`Apologies but enhancing definitions failed to pull properly. Enhancing is disabled.`,
		);

	const eFlex = `f fr falc fje`;
	const cFlex = `f fr falc fjc`;
	const eleMargin = `margin:0 12px;`;

	let txt = ``;
	txt += ap_addSingleApothecaryRow(`Enhance Potions`, true);
	txt += ap_addSingleApothecaryRow(`&nbsp;`);
	txt += ap_addSingleApothecaryRow(
		`Here you can enhance specific amounts of Speed potions into larger potions - provided you have the resources to do so.`,
	);
	txt += ap_addSingleApothecaryRow(`&nbsp;`);
	txt += ap_addApothecaryRow([
		{text: `&nbsp;`},
		{text: `Potion Type`, classes: cFlex, header: true},
		{text: `Current`, classes: eFlex, header: true},
		{text: `&nbsp;`},
		{text: `After`, classes: eFlex, header: true},
	]);

	const sourceIds = ap_getSpeedEnhanceSources();
	const selSource = ap_buildEnhanceSelectElement(
		`ap_enhance_source`,
		`ap_onEnhanceSourceChange(this.value)`,
		sourceIds,
	);
	const selResult = ap_buildEnhanceSelectElement(
		`ap_enhance_result`,
		`ap_onEnhanceResultChange(this.value)`,
	);
	const inp =
		`<input type="number" id="ap_enhance_amount" style="width:80%" value="0" min="0" oninput="ap_onEnhanceAmountChange(this.value)">` +
		`<span style="width:2%">&nbsp;</span>` +
		`<input type="button" id="ap_enhance_max" onclick="ap_setMaxEnhance()" value="Max" style="width:18%">`;
	txt += ap_addApothecaryRow([
		{text: `Source Potion:`, classes: eFlex},
		{text: selSource, classes: cFlex, styles: eleMargin},
		{text: `&nbsp;`, classes: eFlex, id: `ap_enhance_sourceCurr`},
		{text: `&nbsp;`, classes: cFlex, id: `ap_enhance_sourceArrow`},
		{text: `&nbsp;`, classes: eFlex, id: `ap_enhance_sourceAfter`},
		{text: `Resulting Potion:`, classes: eFlex},
		{text: selResult, classes: cFlex, styles: eleMargin},
		{text: `&nbsp;`, classes: eFlex, id: `ap_enhance_resultCurr`},
		{text: `&nbsp;`, classes: cFlex, id: `ap_enhance_resultArrow`},
		{text: `&nbsp;`, classes: eFlex, id: `ap_enhance_resultAfter`},
		{text: `Amount:`, classes: eFlex},
		{text: inp, classes: cFlex, styles: eleMargin},
		{text: `&nbsp;`, classes: eFlex, gridCol: `3 / -1`},
	]);
	txt += ap_addSingleApothecaryRow(`&nbsp;`);
	txt += ap_addApothecaryRow([
		{text: `Reagent Cost:`, classes: eFlex},
		{text: `0`, classes: eFlex, id: `ap_enhance_reagentCost`},
		{text: `&nbsp;`, gridCol: `3 / -1`},
		{text: `Vessel Cost:`, classes: eFlex},
		{text: `0`, classes: eFlex, id: `ap_enhance_vesselCost`},
		{text: `&nbsp;`, gridCol: `3 / -1`},
	]);
	txt += ap_addSingleApothecaryRow(`&nbsp;`);
	txt += ap_addApothecaryRow([
		{
			text:
				`<input type="button" id="ap_enhancePotionsButton" value="Enhance Potions" onclick="ap_enhancePotions()" style="display:none">` +
				`<span class="f fr falc fjc" id="ap_enhancePotionsHideButton">&nbsp;</span>`,
			gridCol: `span 2`,
			classes: `f fc falc fjc redButton`,
			id: `apothecaryEnhanceDetails`,
		},
		{text: `&nbsp;`, gridCol: `3 / -1`},
	]);
	return txt;
}

async function ap_enhancePotions() {
	ap_disableAllApothecaryInputs(true);
	const enhanceDetails = document.getElementById(`apothecaryEnhanceDetails`);
	enhanceDetails.style.gridColumn = `1 / -1`;

	let txt = `<span class="f fr w100 p5">Enhancing Potions:</span>`;
	enhanceDetails.innerHTML = txt;

	const {sourceId, resultId, amount} = ap_enhanceState;
	if (
		!sourceId ||
		!resultId ||
		!amount ||
		sourceId <= 0 ||
		resultId <= 0 ||
		amount < 0
	) {
		txt = `<span class="f fr w100 p5">Invalid Enhance Parameters</span>`;
		enhanceDetails.innerHTML = txt;
		ap_disableAllApothecaryInputs(false);
		return;
	}

	const sourcePotion = b_potionsById.get(sourceId);
	const resultPotion = b_potionsById.get(resultId);
	const sourceName = sourcePotion?.name ?? `Unknown (${id})`;
	const resultName = resultPotion?.name ?? `Unknown (${id})`;

	const response = await enhancePotions(sourceId, resultId, amount);
	let successType = ``;
	if (
		response.success &&
		Array.isArray(response.actions) &&
		response.actions.length > 0 &&
		response.enhance_result
	) {
		successType = `Successfully enhanced`;

		let reagents = Number(ap_reagents ?? 0);
		reagents -= Number(response.enhance_result?.reagents_spent ?? 0);
		if (isNaN(reagents) || reagents < 0) reagents = 0;
		ap_reagents = reagents;
		const reagentsEle = document.getElementById(`ap_inv_reagents`);
		if (reagentsEle) {
			reagentsEle.dataset.reagents = ap_reagents;
			reagentsEle.innerHTML = nf(ap_reagents);
		}

		let vessels = Number(ap_vessels ?? 0);
		vessels -= Number(response.enhance_result?.vessels_spent ?? 0);
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
			const id = Number(action?.buff_id ?? -1);
			const newAmount = Number(action?.amount ?? -1);
			ap_updateCurrentPotionCountAndDiff(id, newAmount);
		}
	} else {
		successType = `Failed to enhance`;
		console.log("Reponse:", response);
	}
	txt += ap_buildEnhanceResultLine(
		successType,
		`${nf(-amount)} ${sourceName}`,
	);
	txt += ap_buildEnhanceResultLine(
		successType,
		`${nf(amount)} ${resultName}`,
	);

	enhanceDetails.innerHTML = txt;

	ap_disableAllApothecaryInputs(false);
}

function ap_buildEnhanceSelectElement(eleId, func, potIds) {
	let sel =
		`<select id="${eleId}" style="width:100%;font-size:0.9em" oninput="${func}">` +
		ap_buildDefaultEnhanceSelectOption();
	if (potIds != null)
		for (let id of potIds) {
			const potion = b_potionsById.get(id);
			const name = potion?.name ?? `Unknown (${id})`;
			sel += `<option value="${id}">${name}</option>`;
		}
	sel += `</select>`;
	return sel;
}

function ap_buildDefaultEnhanceSelectOption() {
	return `<option value="-1">-</option>`;
}

function ap_buildEnhanceResultLine(successType, line) {
	return (
		`<span class="f fr w100 p5">` +
		`<span class="f falc fje mr2" style="width:180px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">${successType}:</span>` +
		`<span class="f falc fjs ml2" style="flex-grow:1;margin-left:5px;flex-wrap:wrap">${line}</span>` +
		`</span>`
	);
}

function ap_onEnhanceSourceChange(value) {
	const id = Number(value);
	ap_enhanceState.sourceId = id > 0 ? id : null;
	ap_enhanceState.resultId = null;
	ap_enhanceState.amount = 0;

	ap_resetEnhanceResult();
	ap_resetEnhanceAmount();
	ap_resetEnhanceCosts();

	if (!ap_enhanceState.sourceId) return;

	const targets = ap_getSpeedEnhanceTargets(ap_enhanceState.sourceId);
	ap_populateEnhanceResultSelect(targets);

	ap_updateEnhanceUI();
}

function ap_onEnhanceResultChange(value) {
	const id = Number(value);
	ap_enhanceState.resultId = id > 0 ? id : null;
	ap_enhanceState.amount = 0;

	ap_resetEnhanceAmount();
	ap_resetEnhanceCosts();
	ap_updateEnhanceUI();
}

function ap_onEnhanceAmountChange(value) {
	const v = Math.max(0, Number(value));
	ap_enhanceState.amount = Number.isFinite(v) ? v : 0;

	ap_updateEnhanceUI();
}

function ap_updateEnhanceUI() {
	const {sourceId, resultId, amount} = ap_enhanceState;

	if (!sourceId) return;

	ap_updateSourceCounts(sourceId);

	if (!resultId) return;

	ap_updateResultCounts(resultId, sourceId, amount);

	if (amount < 0) return;

	ap_updateEnhanceCosts(sourceId, resultId, amount);
	ap_updateEnhanceButtonState(sourceId, resultId, amount);
}

function ap_resetEnhanceResult() {
	const sel = document.getElementById("ap_enhance_result");
	if (sel) sel.innerHTML = ap_buildDefaultEnhanceSelectOption();

	document.getElementById(`ap_enhance_resultCurr`).innerHTML = `&nbsp;`;
	document.getElementById(`ap_enhance_resultArrow`).innerHTML = `&nbsp;`;
	document.getElementById(`ap_enhance_resultAfter`).innerHTML = `&nbsp;`;
}

function ap_resetEnhanceAmount() {
	const amt = document.getElementById(`ap_enhance_amount`);
	if (amt) amt.value = 0;
}

function ap_resetEnhanceCosts() {
	document.getElementById(`ap_enhance_reagentCost`).innerHTML = `0`;
	document.getElementById(`ap_enhance_vesselCost`).innerHTML = `0`;
	ap_toggleEnhanceButton(true, `Choose valid options.`);
}

function ap_populateEnhanceResultSelect(targetIds) {
	const sel = document.getElementById(`ap_enhance_result`);
	if (!sel) return;

	sel.innerHTML = ap_buildDefaultEnhanceSelectOption();

	for (const id of targetIds) {
		const potion = b_potionsById.get(id);
		if (!potion) continue;
		sel.innerHTML += `<option value="${id}">${potion.name}</option>`;
	}
}

function ap_updateSourceCounts(sourceId) {
	const curr = ap_ownedById[sourceId] ?? 0;

	document.getElementById(`ap_enhance_sourceCurr`).innerHTML = nf(curr);
	document.getElementById(`ap_enhance_sourceArrow`).innerHTML = `→`;
	document.getElementById(`ap_enhance_sourceAfter`).innerHTML = nf(curr);
}

function ap_updateResultCounts(resultId, sourceId, amount) {
	const curr = ap_ownedById[resultId] ?? 0;
	const after = curr + amount;

	const resultCurr = document.getElementById(`ap_enhance_resultCurr`);
	resultCurr.innerHTML = nf(curr);
	resultCurr.style.color = curr >= 0 ? `` : `var(--RedOrange)`;
	document.getElementById(`ap_enhance_resultArrow`).innerHTML = `→`;
	const resultAfter = document.getElementById(`ap_enhance_resultAfter`);
	resultAfter.innerHTML = nf(after);
	resultAfter.style.color = after >= 0 ? `` : `var(--RedOrange)`;

	const sourceCurr = ap_ownedById[sourceId] ?? 0;
	const sourceDiff = sourceCurr - amount;
	const sourceAfter = document.getElementById(`ap_enhance_sourceAfter`);
	sourceAfter.innerHTML = nf(sourceDiff);
	sourceAfter.style.color = sourceDiff >= 0 ? `` : `var(--RedOrange)`;
}

function ap_updateEnhanceCosts(fromId, toId, amount) {
	const cost = ap_getEnhanceCost(fromId, toId);
	if (!cost) return;

	const r = amount * cost.r;
	const v = amount * cost.v;

	const reagentEle = document.getElementById(`ap_enhance_reagentCost`);
	reagentEle.innerHTML = nf(r);
	reagentEle.style.color =
		r >= 0 && r <= ap_reagents ? `` : `var(--RedOrange)`;

	const vesselEle = document.getElementById(`ap_enhance_vesselCost`);
	vesselEle.innerHTML = nf(v);
	vesselEle.style.color = v >= 0 && v <= ap_vessels ? `` : `var(--RedOrange)`;
}

function ap_updateEnhanceButtonState(fromId, toId, amount) {
	if (amount === 0) {
		ap_toggleEnhanceButton(
			true,
			`Can't enhance until an amount has been chosen.`,
		);
		return;
	}

	const cost = ap_getEnhanceCost(fromId, toId);
	if (!cost) {
		ap_toggleEnhanceButton(true, `Invalid enhancement.`);
		return;
	}

	const haveReagents = ap_reagents >= amount * cost.r;
	const haveVessels = ap_vessels >= amount * cost.v;
	const haveSource = (ap_ownedById[fromId] ?? 0) >= amount;

	if (!haveSource) {
		ap_toggleEnhanceButton(true, `Not enough source potions.`);
		return;
	}
	if (!haveReagents || !haveVessels) {
		ap_toggleEnhanceButton(true, `You cannot afford this enhancement.`);
		return;
	}

	ap_toggleEnhanceButton(false);
}

function ap_toggleEnhanceButton(hide, hideMessage) {
	let button = document.getElementById(`ap_enhancePotionsButton`);
	if (!button) return;
	let message = document.getElementById(`ap_enhancePotionsHideButton`);
	if (!message) return;

	button.style.display = hide ? `none` : ``;
	message.style.display = hide ? `` : `none`;
	message.innerHTML = hideMessage || `&nbsp;`;
}

function ap_setMaxEnhance() {
	const amountEle = document.getElementById(`ap_enhance_amount`);
	if (!amountEle) return;

	const {sourceId, resultId} = ap_enhanceState;

	const cost = ap_getEnhanceCost(sourceId, resultId) ?? 0;
	const amountSource = ap_ownedById[sourceId] ?? 0;
	const reagents = ap_reagents ?? 0;
	const vessels = ap_vessels ?? 0;
	if (!cost || amountSource <= 0 || cost.r > reagents || cost.v > vessels) {
		amountEle.value = 0;
		ap_onEnhanceAmountChange(0);
		return;
	}

	const maxFromReagents =
		cost.r > 0 ? Math.floor(reagents / cost.r) : Infinity;
	const maxFromVessels = cost.v > 0 ? Math.floor(vessels / cost.v) : Infinity;

	const max = Math.min(amountSource, maxFromReagents, maxFromVessels);
	amountEle.value = max;
	ap_onEnhanceAmountChange(max);
}

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
		const enhanceGraph = buildEnhanceGraph(enhanceCosts);
		const enhanceChains = buildEnhanceChains(enhanceGraph);
		return {brewCosts, enhanceGraph, enhanceChains};
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
	const oldAmount = ap_ownedById[id] ?? 0;
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
		if (column.styles != null) style += column.styles;
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

	ap_recalculateDistillValues();
}

function ap_getIncludedDistills() {
	return ls_getPerAccount(ap_LSKEY_includeDistills, []);
}

function ap_saveIncludedDistills(eleIds) {
	ls_setPerAccount_arr(ap_LSKEY_includeDistills, eleIds);
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
	return ls_getPerAccount(ap_LSKEY_distillMaintains, {});
}

function ap_saveDistillMaintains(categories) {
	ls_setPerAccount_obj(ap_LSKEY_distillMaintains, categories);
}

function buildEnhanceGraph(enhanceCosts) {
	const graph = new Map(); // sourceId -> { to, r, v }

	for (const [fromStr, data] of Object.entries(enhanceCosts)) {
		const from = Number(fromStr);
		if (!Number.isFinite(from)) continue;

		graph.set(from, {
			to: data.result,
			r: Number(data.r ?? 0),
			v: Number(data.v ?? 0),
		});
	}

	return graph;
}

function buildEnhanceChains(graph) {
	const chains = new Map();
	// sourceId -> Map(targetId -> { r, v })

	for (const start of graph.keys()) {
		let current = start;
		let totalR = 0;
		let totalV = 0;

		const targets = new Map();

		while (graph.has(current)) {
			const step = graph.get(current);
			totalR += step.r;
			totalV += step.v;

			const next = step.to;
			targets.set(next, {r: totalR, v: totalV});

			current = next;
		}

		if (targets.size > 0) chains.set(start, targets);
	}

	return chains;
}

function ap_getEnhanceSources() {
	return [...ap_enhanceChains.keys()];
}

function ap_getSpeedEnhanceSources() {
	const speedIds = new Set(
		(b_potionsByBuff.get("Speed") ?? []).map((p) => p.id),
	);
	return ap_getEnhanceSources().filter((id) => speedIds.has(id));
}

function ap_getEnhanceTargets(sourceId) {
	return [...(ap_enhanceChains.get(sourceId)?.keys() ?? [])];
}

function ap_getSpeedEnhanceTargets(sourceId) {
	const speedIds = new Set(
		(b_potionsByBuff.get("Speed") ?? []).map((p) => p.id),
	);
	return ap_getEnhanceTargets(sourceId).filter((id) => speedIds.has(id));
}

function ap_getEnhanceCost(fromId, toId) {
	return ap_enhanceChains.get(fromId)?.get(toId) ?? null;
}
