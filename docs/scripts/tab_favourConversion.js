const vfc = 1.001; // prettier-ignore
const fc_FAVOURS = new Map([
	[ 1, fc_createFavour(1, "Torm's Favor", "Torm", "Grand Tour of the Sword Coast", true, true, 1)],
	[ 2, fc_createFavour(2, "Chauntea's Favor", "Chauntea", "Highharvestide", false, false, Infinity)],
	[ 3, fc_createFavour(3, "Kelemvor's Favor", "Kelemvor", "Tomb of Annihilation", true, true, 2)],
	[ 4, fc_createFavour(4, "Leira's Favor", "Leira", "Liar's Night", false, false, Infinity)],
	[ 5, fc_createFavour(5, "Jergal's Favor", "Jergal", "Feast of the Moon", false, false, Infinity)],
	[ 6, fc_createFavour(6, "Shar's Favor", "Shar", "Simril", false, false, Infinity)],
	[ 7, fc_createFavour(7, "Oghma's Favor", "Oghma", "Wintershield", false, false, Infinity)],
	[ 8, fc_createFavour(8, "Eldath's Favor", "Eldath", "Midwinter", false, false, Infinity)],
	[ 9, fc_createFavour(9, "Sune's Favor", "Sune", "Grand Revel", false, false, Infinity)],
	[10, fc_createFavour(10, "Umberlee's Favor", "Umberlee", "Fleetswake", false, false, Infinity)],
	[11, fc_createFavour(11, "Lliira's Favor", "Lliira", "Festival of Fools", false, false, Infinity)],
	[12, fc_createFavour(12, "Lathander's Favor", "Lathander", "Greengrass", false, false, Infinity)],
	[13, fc_createFavour(13, "Rillifane's Favor", "Rillifane", "The Running", false, false, Infinity)],
	[14, fc_createFavour(14, "Gond's Favor", "Gond", "The Great Modron March", false, false, Infinity)],
	[15, fc_createFavour(15, "Helm's Favor", "Helm", "Waterdeep: Dragon Heist", true, true, Infinity)],
	[16, fc_createFavour(16, "Waukeen's Favor", "Waukeen", "Dragondown", false, false, Infinity)],
	[17, fc_createFavour(17, "Mystra's Favor", "Mystra", "Time Gates", false, false, Infinity)],
	[18, fc_createFavour(18, "Asmodeus's Favor", "Asmodeus", "Founders' Day", false, false, Infinity)],
	[19, fc_createFavour(19, "Savras' Favor", "Savras", "Midsummer", false, false, Infinity)],
	[20, fc_createFavour(20, "Azuth's Favor", "Azuth", "Ahghairon's Day", false, false, Infinity)],
	[21, fc_createFavour(21, "Tempus's Favor", "Tempus", "Brightswords", false, false, Infinity)],
	[22, fc_createFavour(22, "Tiamat's Favor", "Tiamat", "Descent into Avernus", true, true, Infinity)],
	[23, fc_createFavour(23, "Auril's Favor", "Auril", "Icewind Dale: Rime of the Frostmaiden", true, true, Infinity)],
	[24, fc_createFavour(24, "Bahamut's Favor", "Bahamut", "Trials of Mount Tiamat", false, false, Infinity)],
	[25, fc_createFavour(25, "Corellon's Favor", "Corellon", "Wild Beyond the Witchlight", true, true, Infinity)],
	[30, fc_createFavour(30, "Celestian's Favor", "Celestian", "Light of Xaryxis", true, true, Infinity)],
	[31, fc_createFavour(31, "Fortune's Favor", "Fortune", "Turn of Fortune's Wheel", true, true, Infinity)],
	[35, fc_createFavour(35, "The Wizards Three Favor", "The Wizards Three", "Vecna: Eve of Ruin", true, true, Infinity)],
	[36, fc_createFavour(36, "The Red Knight Favor", "The Red Knight", "Tales of the Champions", true, true, 3)],
]); // prettier-ignore
let fc_favourDefs = null;
let fc_convertibles = null;
let fc_convertiblesSorted = null;
let fc_currentFavours = null;
let fc_convSource = -1;
let fc_convTarget = -1;
let fc_stage1 = null;
let fc_stage2 = null;
let fc_stage3 = null;

async function fc_pullFavourData() {
	if (isBadUserData()) return;
	disablePullButtons();
	const wrapper = document.getElementById(`favourWrapper`);
	setWrapperFormat(wrapper, 0);
	try {
		wrapper.innerHTML = `Waiting for user data...`;
		const userData = await getUserDetails();
		await fc_displayFavourData(wrapper, userData);
		codeEnablePullButtons();
	} catch (error) {
		setWrapperFormat(wrapper, 0);
		handleError(wrapper, error);
	}
}

async function fc_displayFavourData(wrapper, userData) {
	const deets = userData?.details?.reset_currencies ?? null;
	const defs = userData?.defines?.reset_currency_defines ?? null;
	const favourConvert = document.getElementById(`favourConvert`);
	if (!Array.isArray(deets) || !Array.isArray(defs)) {
		wrapper.innerHTML = `&nbsp;`;
		favourConvert.innerHTML =
			`<span class="f w100 p5" style="padding-left:10%">The data ` +
			`from the server was somehow invalid. Cannot proceed.</span>`;
		return;
	}
	fc_parseResetCurrencyDefs(defs);

	fc_parseResetCurrencyDeets(deets);

	const eFlex = `f fr falc fje`;
	const cFlex = `f fr falc fjc`;
	const sFlex = `f fr falc fjs`;

	const sourceLabel = `<label for="fc_convertSourceSelect">Convert Source:</label>`;
	const targetLabel = `<label for="fc_convertTargetSelect">Convert Target:</label>`;
	const hideStage1 = {fcstage1: 1};
	const hideStage2 = {fcstage2: 1};
	const hideStage3 = {fcstage3: 1};

	let txt = ``;

	const extraColWidth = 140;

	const titleCol = `<span style="width:${extraColWidth}px">Current Favour</span><span>Campaign</span>`;
	txt += addHTMLElements([
		{text: `Favour Type`, classes: eFlex, header: true},
		{text: titleCol, classes: sFlex, header: true},
	]);
	const ids = [...fc_currentFavours.keys()].filter(
		(e) => fc_favourDefs.has(e) && fc_favourDefs.get(e).canConvertTo,
	);
	ids.sort(fc_favourSort);
	for (const id of ids) {
		const amount = fc_currentFavours.get(id);
		const favour = fc_favourDefs?.get(id) ?? null;
		if (!favour || !favour.canConvertTo || favour.campaignName === "")
			continue;
		const col = `<span style="width:${extraColWidth}px">${sciNote(amount)}</span><span>${favour.campaignName}</span>`;
		txt += addHTMLElements([
			{
				text: favour.name.replace("Favor", "").trim() + `:`,
				classes: eFlex,
			},
			{text: col, classes: sFlex},
		]);
	}

	if (fc_convertiblesSorted.length === 0) {
		setWrapperFormat(wrapper, 8);
		wrapper.innerHTML = txt;
		favourConvert.innerHTML =
			`<span class="f w100 p5" style="padding-left:10%">You ` +
			`don't have any convertible favours at the moment.</span>`;
		return;
	}

	txt += addHTMLElement({text: `&nbsp;`, gridCol: `1 / -1`});

	txt += addHTMLElements([
		{text: sourceLabel, classes: eFlex},
		{text: fc_buildConvertSourceSelect(), classes: sFlex},
		{text: `Favour Earned:`, classes: eFlex, hide: true, data: hideStage1},
		{
			text: `&nbsp;`,
			classes: sFlex,
			hide: true,
			data: hideStage1,
			id: `fc_sourceFavour`,
		},
		{text: targetLabel, classes: eFlex, hide: true, data: hideStage2},
		{
			text: `&nbsp;`,
			classes: sFlex,
			hide: true,
			data: hideStage2,
			id: `fc_targetSelectContainer`,
		},
		{text: `Current Favour:`, classes: eFlex, hide: true, data: hideStage3},
		{
			text: `&nbsp;`,
			classes: sFlex,
			hide: true,
			data: hideStage3,
			id: `fc_targetFavour`,
		},
		{
			text: `Conversion Gain:`,
			classes: eFlex,
			hide: true,
			data: hideStage3,
		},
		{
			text: `&nbsp;`,
			classes: sFlex,
			hide: true,
			data: hideStage3,
			id: `fc_targetConversion`,
		},
		{
			text: `Resulting Favour:`,
			classes: eFlex,
			hide: true,
			data: hideStage3,
		},
		{
			text: `&nbsp;`,
			classes: sFlex,
			hide: true,
			data: hideStage3,
			id: `fc_targetResult`,
		},
		{
			text: fc_buildConvertButton(),
			classes: cFlex + ` greenButton`,
			hide: true,
			data: hideStage3,
			gridCol: `1 / -1`,
		},
	]);

	setWrapperFormat(wrapper, 8);
	wrapper.innerHTML = txt;

	fc_stage1 = document.querySelectorAll(`[data-fcstage1="1"]`);
	fc_stage2 = document.querySelectorAll(`[data-fcstage2="1"]`);
	fc_stage3 = document.querySelectorAll(`[data-fcstage3="1"]`);
}

function fc_buildConvertSourceSelect() {
	let sel = `<select id="fc_convertSourceSelect" oninput="fc_onConvertSourceChange(this.value)" style="width:100%">`;
	sel += `<option value="-1">-</option>`;
	for (const conv of fc_convertiblesSorted) {
		if (fc_favourDefs.has(conv.id)) {
			const favour = fc_favourDefs?.get(conv.id);
			sel += `<option value="${conv.id}">${favour.name}`;
			if (favour.campaignName !== "") sel += ` (${favour.campaignName})`;
			sel += `</option>`;
		} else sel += `<option value="${conv.id}">??? id:${conv.id}</option>`;
	}
	sel += `</select>`;
	return sel;
}

function fc_onConvertSourceChange(value) {
	const id = Number(value ?? -1);
	const hide = isNaN(id) || id < 1 || !fc_convertibles.has(id);

	fc_convSource = hide ? -1 : id;
	fc_convTarget = -1;

	if (!hide) {
		const sourceFav = document.getElementById(`fc_sourceFavour`);
		if (sourceFav) {
			const favAmount = fc_convertibles.get(fc_convSource)?.amount ?? -1;
			sourceFav.innerHTML = favAmount > 0 ? fc_numForm(favAmount) : `-`;
		}
		fc_buildConvertTargetSelect();
	}

	for (const ele of fc_stage1) ele.style.display = hide ? `none` : ``;
	for (const ele of fc_stage2) ele.style.display = hide ? `none` : ``;
	if (hide) for (const ele of fc_stage3) ele.style.display = `none`;
}

function fc_buildConvertTargetSelect() {
	fc_convTarget = -1; // Reset conv target.

	const container = document.getElementById(`fc_targetSelectContainer`);
	if (!container) return;
	let sel = `<select id="fc_convertTargetSelect" oninput="fc_onConvertTargetChange(this.value)" style="width:100%">`;
	sel += `<option value="-1">-</option>`;
	const convTos = fc_convertibles?.get(fc_convSource)?.convertTo;
	if (!Array.isArray(convTos)) return;
	for (const conv of convTos) {
		if (fc_favourDefs.has(conv.id)) {
			const favour = fc_favourDefs?.get(conv.id);
			sel += `<option value="${conv.id}">${favour.name}`;
			if (favour.campaignName !== "") sel += ` (${favour.campaignName})`;
			sel += `</option>`;
		} else sel += `<option value="${conv.id}">??? id:${conv.id}</option>`;
	}
	sel += `</select>`;
	container.innerHTML = sel;
}

function fc_onConvertTargetChange(value) {
	const id = Number(value ?? -1);
	const source = fc_convertibles.get(fc_convSource);
	const validTarget = source?.convertTo?.some((e) => e.id === id);

	const hide = isNaN(id) || id < 1 || !validTarget;

	fc_convTarget = hide ? -1 : id;

	if (!hide) {
		const currFavour = fc_currentFavours?.get(fc_convTarget) ?? -1;
		const convTos = (
			fc_convertibles.get(fc_convSource)?.convertTo ?? []
		).filter((e) => e.id === fc_convTarget);
		const convGain = convTos.length === 1 ? (convTos[0]?.amount ?? -1) : -1;
		const convResult =
			currFavour >= 0 && convGain >= 0 ? currFavour + convGain : -1;

		const targetFav = document.getElementById(`fc_targetFavour`);
		if (targetFav)
			targetFav.innerHTML =
				currFavour >= 0 ? fc_numForm(currFavour) : `-`;
		const targetConv = document.getElementById(`fc_targetConversion`);
		if (targetConv)
			targetConv.innerHTML = convGain > 0 ? fc_numForm(convGain) : `-`;
		const targetRes = document.getElementById(`fc_targetResult`);
		if (targetRes)
			targetRes.innerHTML = convResult > 0 ? fc_numForm(convResult) : `-`;
	}

	if (!hide) for (const ele of fc_stage2) ele.style.display = ``;
	for (const ele of fc_stage3) ele.style.display = hide ? `none` : ``;
}

function fc_buildConvertButton() {
	return `<input type="button" id="fc_convertButton" onclick="fc_convertFavour()" value="Convert Favour">`;
}

async function fc_convertFavour() {
	if (
		!fc_convSource ||
		!fc_convTarget ||
		fc_convSource < 1 ||
		fc_convTarget < 1
	)
		return;
	const favourConvert = document.getElementById(`favourConvert`);
	if (!favourConvert) return;

	fc_toggleElements(true);

	const source = fc_favourDefs.get(fc_convSource).name;
	const target = fc_favourDefs.get(fc_convTarget).name;

	const response = await convertFavour(fc_convSource, fc_convTarget);
	if (response.success && response.okay) {
		favourConvert.innerHTML =
			`<span class="f w100 p5" style="padding-left:10%">` +
			`Successfully converted ${source} favour to ${target} favour.</span>`;

		fc_convertibles.delete(fc_convSource);
		if (fc_convertibles.size === 0) {
			const wrapper = document.getElementById("favourWrapper");
			wrapper.innerHTML = "&nbsp;";
			favourConvert.innerHTML +=
				`<span class="f w100 p5" style="padding-left:10%">` +
				`You don't have any more convertible favours at the moment.` +
				`</span>`;
			return;
		}
		fc_convertiblesSorted = fc_convertiblesSorted.filter(
			(e) => e.id !== fc_convSource,
		);

		const sourceSel = document.getElementById(`fc_convertSourceSelect`);
		if (sourceSel) sourceSel.outerHTML = fc_buildConvertSourceSelect();

		fc_onConvertSourceChange(`-1`);
		fc_toggleElements(false);
	} else
		// On a fail - leave everything locked. It forces a user to re-pull data.
		favourConvert.innerHTML =
			`<span class="f w100 p5" style="padding-left:10%">- ` +
			`Failed to convert ${source} favour to ${target} favour.</span>`;
}

function fc_toggleElements(disable) {
	const source = document.getElementById(`fc_convertSourceSelect`);
	if (source) source.disabled = disable;
	const target = document.getElementById(`fc_convertTargetSelect`);
	if (target) target.disabled = disable;
	const button = document.getElementById(`fc_convertButton`);
	if (button) button.disabled = disable;
}

function fc_numForm(number) {
	if (number > 1e4) return sciNote(number);
	return nf(number);
}

function fc_parseResetCurrencyDeets(deets) {
	const convertibles = new Map();
	const convertiblesSorted = [];
	const currentFavours = new Map();
	for (const deet of deets) {
		const id = Number(deet?.currency_id ?? -1);
		if (id < 1) continue;
		const timeStart = Number(deet?.convert_start_time ?? -1);
		const timeEnd = Number(deet?.convert_end_time ?? -1);
		const amount = Number(deet?.current_amount ?? -1);
		if (amount >= 0) currentFavours.set(id, amount);
		if (timeStart === -1 || timeEnd === -1) continue;
		const force = deet?.force_convert ?? false;
		if (force || (timeStart === 0 && timeEnd > 0)) {
			const mult = deet?.convert_multiplier ?? -1;
			const convData = deet?.convert_data;
			if (mult === -1 || amount <= 0 || !Array.isArray(convData))
				continue;
			const convertTo = [];
			for (const conv of convData) {
				const convId = Number(conv?.currency_id ?? -1);
				const convTo = Number(conv?.amount ?? -1);
				if (convId < 1 || isNaN(convTo) || convTo < 1) continue;
				convertTo.push({id: convId, amount: convTo});
			}
			convertTo.sort(fc_favourSort);
			const obj = {
				id,
				amount,
				mult,
				force,
				timeStart,
				timeEnd,
				convertTo,
			};
			convertibles.set(id, obj);
			convertiblesSorted.push(obj);
		}
	}
	convertiblesSorted.sort(fc_favourSort);
	fc_convertibles = convertibles;
	fc_convertiblesSorted = convertiblesSorted;
	fc_currentFavours = currentFavours;
}

function fc_parseResetCurrencyDefs(defs) {
	const parsedDefs = new Map(fc_FAVOURS);
	for (const def of defs) {
		const id = Number(def?.id ?? -1);
		const name = def?.name ?? "";
		if (id < 1 || name === "") continue;
		const props = def?.properties;
		const season = props?.season_favor ?? false;
		if (season) continue; // Completely ignore seasonal favours.

		const base = parsedDefs.get(id) ?? {};
		const obj = {
			id,
			name: def?.name ?? base.name ?? "",
			shortName: def?.short_name ?? base.shortName ?? name,
			campaignName: props?.campaign_name ?? base.campaignName ?? "",
			canConvertTo: props?.can_convert_to ?? base.canConvertTo ?? false,
			canReset: props?.can_reset ?? base.canReset ?? false,
			order: Number(props?.sort_order ?? base.order ?? Infinity),
		};
		parsedDefs.set(id, obj);
	}
	fc_favourDefs = parsedDefs;
}

function fc_addFavourRow(left, right, left2, right2) {
	let txt = `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:25%;min-width:200px;">${left}</span><span class="f falc fje mr2" style="min-width:120px;max-width:140px;">${right}</span>`;
	if (left2 != null && right2 != null)
		txt += `<span class="f falc fje mr2" style="min-width:90px;max-width:110px;">${left2}</span><span class="f falc fje mr2" style="min-width:120px;max-width:140px;">${right2}</span>`;
	txt += `</span>`;
	return txt;
}

function fc_createFavour(id, name, shortName, campaignName, canConvertTo, canReset, order) {
	return {id, name, shortName, campaignName, canConvertTo, canReset, order};
} // prettier-ignore

const fc_favourSort = (a, b) => {
	const aid = a instanceof Object ? a.id : a;
	const bid = b instanceof Object ? b.id : b;
	const fa = fc_favourDefs?.get(aid);
	const fb = fc_favourDefs?.get(bid);
	if (fa && fb && fa.order !== fb.order) return fa.order - fb.order;
	return aid - bid;
};
