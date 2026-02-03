const vlf = 1.002; // prettier-ignore
const lf_LSKEY_maintainScales = `scLegendariesMaintain`;
const lf_forgeState = {atMost: -1, maintainScales: -1};
const lf_forgeOpts = [1, 2, 3, 4, 5, 6];
const lf_DEFAULT_maintainScales = 1111;
let lf_itemsByChampId = null;
let lf_scales = null;

async function lf_pullData() {
	clearTimers(`lf_`);
	if (isBadUserData()) return;
	disablePullButtons();
	const wrapper = document.getElementById(`legendariesWrapper`);
	try {
		wrapper.innerHTML = `Waiting for user data...`;
		const details = (await getUserDetails()).details;
		wrapper.innerHTML = `Waiting for definitions...`;
		const defs = await getDefinitions("hero_defines");
		const champDefs = defs.hero_defines;
		await lf_displayData(wrapper, details, champDefs);
		codeEnablePullButtons();
	} catch (error) {
		handleError(wrapper, error);
	}
}

async function lf_displayData(wrapper, details, champDefs) {
	const legInfo = document.getElementById(`legendariesInfo`);

	lf_scales = Number(details.stats?.multiplayer_points ?? 0);
	lf_champNamesById = getDefsNames(champDefs);
	lf_buildMap(details);

	const champ = lf_getNextForgeTarget(Infinity);
	if (!champ) {
		legInfo.innerHTML = `<span class="f w100 p5" style="padding-left:10%">All of your champions have the most amount of legendaries they can at present.</span>`;
		wrapper.innerHTML = `&nbsp;`;
		return;
	}

	let txt = lf_addRow(`&nbsp;`);
	txt += lf_addRowHeader(`Forge Legendaries:`);
	txt += lf_addRow(`&nbsp;`);
	txt += lf_addRow(
		`Forge until at most ${lf_buildLegsAtMostSelect()} ${lf_buildPluralLabel()} on every champion.`,
	);
	txt += lf_addRow(
		`Maintain ${lf_buildMaintainScalesInput()} Scales of Tiamat.`,
	);
	txt += lf_addRow(`&nbsp;`);
	txt += lf_addRow(
		`Current Scales:`,
		`<label id="lf_currScales">${nf(lf_scales)}</label>`,
	);
	txt += lf_addRow(`&nbsp;`);

	wrapper.innerHTML = txt;

	legInfo.innerHTML =
		`<span class="f fc falc fje mr2 redButton" style="width:50%">` +
		lf_buildForgeButton() +
		`</span>`;

	lf_maintainScalesChanged(lf_getMaintainScalesAmount());
	lf_checkCanForge();
}

function lf_buildMap(details) {
	const champs = new Map();

	// initialise owned champions
	for (const hero of details.heroes) {
		if (hero?.owned !== "1") continue;
		const id = Number(hero.hero_id);
		if (!id) continue;

		champs.set(id, {
			id,
			name: lf_champNamesById[id] ?? "Unknown",
			epicSlots: new Set(),
			legendarySlots: new Set(),
			numLegs: 0,
			canForge: 0,
			currentCost: 0,
		});
	}

	// epics
	for (const loot of details.loot) {
		if (Number(loot?.rarity ?? 0) < 4) continue;
		const champ = champs.get(Number(loot.hero_id));
		if (!champ) continue;

		champ.epicSlots.add(Number(loot.slot_id));
	}

	// legendaries
	const legItems = details.legendary_details.legendary_items;
	for (const heroId in legItems) {
		const champ = champs.get(Number(heroId));
		if (!champ) continue;

		for (const slot in legItems[heroId])
			champ.legendarySlots.add(Number(slot));
	}

	// costs
	const costs = details.legendary_details.costs_by_hero;
	for (const heroId in costs) {
		const champ = champs.get(Number(heroId));
		if (!champ) continue;

		champ.currentCost = Number(costs[heroId]) || 0;
	}

	// derived counts
	for (const champ of champs.values()) {
		champ.numLegs = champ.legendarySlots.size;
		champ.canForge = champ.epicSlots.size - champ.legendarySlots.size;
	}

	lf_itemsByChampId = champs;
}

async function lf_forgeLegendaries() {
	lf_disableAllForgeInputs(true);
	const legInfo = document.getElementById(`legendariesInfo`);

	let header = lf_buildResultHeader(`Forging Legendaries:`);
	legInfo.innerHTML = header;

	let txt = ``;
	const fin = lf_buildResultHeader(`Finished Forging.`);
	const stop = `Stopped`;
	while (true) {
		const champ = lf_getNextForgeTarget();
		if (!champ) {
			header = fin;
			txt += lf_buildResultLine(
				stop,
				`No more champions left to forge on.`,
			);
			break;
		}

		if (champ.currentCost <= 0 || !isFinite(champ.currentCost)) {
			header = fin;
			txt += lf_buildResultLine(
				stop,
				`Invalid forge cost of ${champ.currentCost} for ${champ.name}.`,
			);
		}

		if (lf_scales - champ.currentCost < lf_forgeState.maintainScales) {
			header = fin;
			txt += lf_buildResultLine(stop, `Can't spend any more scales.`);
			break;
		}

		const slotId = [...champ.epicSlots]
			.sort((a, b) => a - b)
			.find((s) => !champ.legendarySlots.has(s));
		if (!slotId) {
			// This should be impossible to reach - but who knows. It's CNE.
			header = lf_buildResultHeader(`Stopped due to data error.`);
			txt += lf_buildResultLine(
				stop,
				`Could not find an epic item to forge on ${champ.name}.`,
			);
			break;
		}

		const resultLine = `Slot ${nf(slotId)} on ${champ.name}`;

		const response = await forgeLegendary(champ.id, slotId);
		if (!response?.success || !response?.okay) {
			header = lf_buildResultHeader(`Stopped due to Failure.`);
			txt += lf_buildResultLine(`Failed to Forge`, resultLine);
			break;
		}

		lf_scales = Number(response.points ?? 0);
		const scalesEle = document.getElementById(`lf_currScales`);
		if (scalesEle) scalesEle.innerHTML = nf(lf_scales);

		champ.legendarySlots.add(slotId);
		champ.numLegs += 1;
		champ.canForge -= 1;
		champ.currentCost =
			response.legendary_details.costs_by_hero[champ.id] ||
			champ.currentCost;

		txt += lf_buildResultLine(`Successfully Forged`, resultLine);
		legInfo.innerHTML = header + txt;
		await sleep(200);
	}

	legInfo.innerHTML = header + txt;
	lf_disableAllForgeInputs(false);
}

function lf_buildLegsAtMostSelect() {
	let style = `width:70px;margin:0 7px;transform:translate(0,-3px);`;
	let sel = `<select id="lf_legsAtMost" style="${style}" oninput="lf_legsAtMostChanged(this.value)">`;
	sel += `<option value="-1">-</option>`;
	for (let opt of lf_forgeOpts)
		sel += `<option value="${opt}">${opt}</option>`;
	sel += `</select>`;
	return sel;
}

function lf_buildPluralLabel() {
	return `<label id="lf_pluralAtMostLabel" style="margin-right:6px">legendaries are</label>`;
}

function lf_buildMaintainScalesInput() {
	let style = `width:85px;margin:0 7px;transform:translate(0,-4px);`;
	const maint = lf_getMaintainScalesAmount();
	return `<input id="lf_forgeMaintain" type="number" min="0" value="${maint}" style="${style}" oninput="lf_maintainScalesChanged(this.value)">`;
}

function lf_buildForgeButton() {
	return (
		`<input type="button" id="lf_forgeLegendariesButton" value="Forge Legendaries" onclick="lf_forgeLegendaries()" style="display:none">` +
		`<span class="f fr falc fjc" id="lf_forgeLegendariesHideButton">&nbsp;</span>`
	);
}

function lf_legsAtMostChanged(value) {
	const v = Number(value ?? -1);
	lf_forgeState.atMost = v;

	const pluralEle = document.getElementById(`lf_pluralAtMostLabel`);
	if (pluralEle)
		pluralEle.innerHTML = v === 1 ? `legendary is` : `legendaries are`;

	lf_checkCanForge();
}

function lf_maintainScalesChanged(value) {
	const m = Number(value ?? lf_DEFAULT_maintainScales);
	lf_forgeState.maintainScales = m;

	lf_setMaintainScalesAmount(m);

	lf_checkCanForge();
}

function lf_checkCanForge() {
	const anyForgeable = lf_getForgeableChampions(Infinity);
	if (anyForgeable.length > 0) {
		const cheapestEver = Math.min(
			...anyForgeable.map((c) => c.currentCost),
		);
		const maintain = lf_scales - lf_forgeState.maintainScales;

		if (cheapestEver > maintain) {
			lf_toggleForgeButton(
				true,
				`You do not have enough scales to forge anything.`,
			);
			return;
		}
	}

	const forgeable = lf_getForgeableChampions();
	if (forgeable.length === 0) {
		const msg =
			lf_forgeState.atMost === -1 ?
				`Can't forge until you have selected valid settings.`
			:	`Your champions already have at most ${nf(lf_forgeState.atMost)} legendaries.`;
		lf_toggleForgeButton(true, msg);
		return;
	}

	lf_toggleForgeButton(false);
}

function lf_getForgeableChampions(definedNumLegsMax) {
	const max =
		definedNumLegsMax ??
		(lf_forgeState.atMost > 0 ? lf_forgeState.atMost : Infinity);

	return [...lf_itemsByChampId.values()].filter(
		(ch) => ch.canForge > 0 && ch.numLegs < max,
	);
}

function lf_getNextForgeTarget(definedNumLegsMax) {
	const forgeable = lf_getForgeableChampions(definedNumLegsMax);
	if (forgeable.length === 0) return null;

	forgeable.sort((a, b) => a.currentCost - b.currentCost || a.id - b.id);

	return forgeable[0];
}

function lf_disableAllForgeInputs(disable) {
	if (disable) {
		disablePullButtons();
		for (let ele of document.querySelectorAll(
			`input[id^="lf_"],select[id^="lf_"]`,
		)) {
			if (ele.id.includes("PullButton")) continue;
			ele.disabled = true;
			ele.style.color = `#555`;
			ele.style.backgroundColor = `hsl(calc(240*0.95),15%,calc(16%*0.8))`;
		}
	} else codeEnablePullButtons();
}

function lf_toggleForgeButton(hide, text) {
	const button = document.getElementById(`lf_forgeLegendariesButton`);
	const message = document.getElementById(`lf_forgeLegendariesHideButton`);
	if (!button || !message) return;

	button.style.display = hide ? `none` : ``;
	message.style.display = hide ? `` : `none`;
	message.innerHTML = text ?? `&nbsp;`;
}

function lf_addRowHeader(text) {
	return lf_addRow(text, null, true);
}

function lf_addRow(left, right, header) {
	if (left == null) return ``;

	let style = ``;
	if (header) style += `font-size:1.2em;`;
	if (style !== ``) style = ` style="${style}"`;

	if (right != null) {
		left = `<span class="f falc fje mr2" style="width:175px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">${left}</span>`;
		right = `<span class="f falc fjs ml2" style="flex-grow:1;margin-left:5px;flex-wrap:wrap">${right}</span>`;
	} else right = ``;

	return `<span class="f fr w100 p5"${style}>${left}${right}</span>`;
}

function lf_buildResultHeader(txt) {
	return `<span class="f fr w100 p5">${txt}</span>`;
}

function lf_buildResultLine(successType, txt) {
	return (
		`<span class="f fr w100 p5">` +
		`<span class="f falc fje mr2" style="width:160px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">${successType}:</span>` +
		`<span class="f falc fjs ml2" style="flex-grow:1;margin-left:5px;flex-wrap:wrap">${txt}</span>` +
		`</span>`
	);
}

function lf_getMaintainScalesAmount() {
	return ls_getPerAccount(lf_LSKEY_maintainScales, lf_DEFAULT_maintainScales);
}

function lf_setMaintainScalesAmount(value) {
	ls_setPerAccount_num(
		lf_LSKEY_maintainScales,
		value,
		lf_DEFAULT_maintainScales,
	);
}
