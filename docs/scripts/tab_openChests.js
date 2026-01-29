const voc = 1.032; // prettier-ignore
const oc_LSKey_hide = `scHideOpenChests`;
const oc_LSKey_fidelity = `scOpenChestsSliderFidelity`;
const oc_brivPatronChests = ["152", "153", "311"];
const oc_amountUndefined = `<span class="f w100 p5" style="padding-left:10%">Unknown error. Amount to open is undefined.</span>`;

async function oc_pullOpenChestsData() {
	if (isBadUserData()) return;
	disablePullButtons();
	const wrapper = document.getElementById(`openChestsWrapper`);
	setFormsWrapperFormat(wrapper, 0);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		wrapper.innerHTML = `Waiting for user data...`;
		const details = (await getUserDetails()).details;
		const chestsHave = details.chests;
		const chestPacks = details.chest_packs;
		wrapper.innerHTML = `Waiting for definitions...`;
		const chestsDefs = (await getDefinitions("chest_type_defines"))
			.chest_type_defines;
		await oc_displayOpenChestsData(
			wrapper,
			chestsHave,
			chestPacks,
			chestsDefs,
		);
		codeEnablePullButtons();
	} catch (error) {
		setFormsWrapperFormat(wrapper, 0);
		handleError(wrapper, error);
	}
}

async function oc_displayOpenChestsData(
	wrapper,
	chestsHave,
	chestPacks,
	chestsDefs,
) {
	const openChestsOpener = document.getElementById(`openChestsOpener`);
	let chestIds = !chestsHave ? [] : Object.keys(chestsHave);
	const chestPacksById = {};
	for (let chestPack of chestPacks) {
		const id = chestPack.chest_type_id;
		if (chestPacksById[id] == null) {
			chestPacksById[id] = {have: 0, packs: []};
			if (chestsHave[id] != null)
				chestPacksById[id]["have"] = chestsHave[id];
		}
		chestPacksById[id].packs.push({
			total: chestPack.total_chests,
			opened: chestPack.opened_chests,
			id: chestPack.pack_id,
		});
	}
	let chestPackIds = Object.keys(chestPacksById);
	for (let chestId of chestPackIds)
		if (!chestIds.includes(chestId)) chestIds.push(chestId);
	wrapper.innerHTML = `&nbsp;`;
	if (chestIds.length === 0) {
		openChestsOpener.innerHTML = `<span class="f w100 p5" style="padding-left:10%">You don't have any chests to open.</span>`;
		return;
	}
	const hiddenChestIds = oc_getHiddenChestIds();
	for (let i = chestIds.length - 1; i >= 0; i--)
		if (hiddenChestIds.includes(chestIds[i]))
			chestIds.splice(chestIds.indexOf(chestIds[i]), 1);
	if (chestIds.length === 0) {
		openChestsOpener.innerHTML = `<span class="f w100 p5" style="padding-left:10%">You don't have any unhidden chests to open.</span>`;
		return;
	}
	const chestNames = {};
	for (let chest of chestsDefs)
		if (chestIds.includes(`${chest.id}`))
			chestNames[chest.id] = [
				chest.name,
				chest.name_plural,
				chest.hc_name,
				chest.hc_name_plural,
				chest.hero_ids == null ? [] : chest.hero_ids,
			];
	if (hiddenChestIds.includes(174) || hiddenChestIds.includes(175)) {
		for (let i = chestIds.length - 1; i >= 0; i--)
			if (chestNames[`${chestIds[i]}`][4].includes(58))
				chestIds.splice(chestIds.indexOf(chestIds[i]), 1);
		chestIds = chestIds.filter((e) => !oc_brivPatronChests.includes(e));
		for (let i = chestPackIds.length - 1; i >= 0; i--)
			if (chestNames[`${chestPackIds[i]}`][4].includes(58))
				chestPackIds.splice(chestPackIds.indexOf(chestPackIds[i]), 1);
		chestPackIds = chestPackIds.filter(
			(e) => !oc_brivPatronChests.includes(e),
		);
	}
	if (chestIds.length === 0) {
		openChestsOpener.innerHTML = `<span class="f w100 p5" style="padding-left:10%">You don't have any unhidden chests to open.</span>`;
		return;
	}

	let txt = ``;
	for (let id of chestIds) {
		if (hiddenChestIds.includes(Number(id))) continue;
		const name = chestNames[id][0];
		const plural = chestNames[id][1];
		let amount = chestsHave[id];
		if (amount != null && chestPacksById[id] != null)
			for (let currPack of chestPacksById[id].packs)
				amount -= currPack.total - currPack.opened;
		if (amount <= 0) continue;
		let fidelity = oc_getOpenChestsSliderFidelity();
		if (fidelity > amount) fidelity = 1;
		txt += `<span style="display:flex;flex-direction:column"><span class="formsCampaignTitle">${plural} (ID:${id})</span><span class="formsCampaign" id="${id}"><span class="featsChampionList" style="margin-bottom:5px">Owned:<span style="margin-left:5px" id="openChests${id}LabelMax">${nf(
			amount,
		)}</span></span><span class="featsChampionList"><input type="range" min="0" max="${amount}" step="${fidelity}" value="0" name="openChests${id}Slider" id="openChests${id}Slider" oninput="oc_updateOpenChestsSliderValue(${id},this.value);" data-chestid="${id}"><label class="cblabel" for="openChests${id}Slider" id="openChests${id}Label" style="width:20%;text-align:center">0</label></span><span class="formsCampaignSelect greenButton" id="openChests${id}ButtonHolder"><input type="button" id="openChests${id}Button" onClick="oc_openChests('${id}')" value="Open 0 ${plural}" data-name="${name}" data-plural="${plural}" style="visibility:hidden;width:80%"></span></span></span>`;
	}
	if (!hiddenChestIds.includes("PP")) {
		for (let id of chestPackIds) {
			if (hiddenChestIds.includes(Number(id))) continue;
			const currChestPacks = chestPacksById[id];
			const name = chestNames[id][2];
			const plural = chestNames[id][3];
			let have = chestPacksById[id].have;
			for (let chestPack of currChestPacks.packs) {
				const max = chestPack.total - chestPack.opened;
				const min = Math.min(have, max);
				const canOpen = min >= max;
				const packId = chestPack.id;
				if (canOpen) have -= max;
				txt += `<span style="display:flex;flex-direction:column"><span class="formsCampaignTitle">${name} Pack (ID:${id})</span><span class="formsCampaign" id="${packId}Pack"><span class="featsChampionList" style="margin-bottom:5px">Contains ${max} Chests</span>`;
				if (canOpen)
					txt += `<span class="featsChampionList"><input type="range" min="0" max="${max}" step="${max}" value="0" name="openChestPacks${packId}Slider" id="openChestPacks${packId}Slider" oninput="oc_updateOpenChestsSliderValue(${packId},this.value,true);" data-chestid="${id}"><label class="cblabel" for="openChestPacks${packId}Slider" id="openChestPacks${packId}Label" style="width:20%;text-align:center">0</label></span>`;
				txt += `<span class="formsCampaignSelect greenButton" id="openChestPacks${packId}ButtonHolder">`;
				if (canOpen)
					txt += `<input type="button" id="openChestPacks${packId}Button" onClick="oc_openChestPack('${id}','${packId}','${max}')" value="Open Chest Pack" data-name="${name} Pack" data-plural="${plural} Pack" style="visibility:hidden;width:80%">`;
				else txt += `You don't have enough to open this pack.`;
				txt += `</span></span></span>`;
			}
		}
	}

	setFormsWrapperFormat(wrapper, 1);
	if (txt !== ``) wrapper.innerHTML = txt;
	else wrapper.innerHTML = `&nbsp;`;
}

function oc_updateOpenChestsSliderValue(id, val, pack) {
	if (pack == null) pack = false;
	document.getElementById(
		`openChest${pack ? "Pack" : ""}s${id}Label`,
	).innerHTML = nf(val);
	const button = document.getElementById(
		`openChest${pack ? "Pack" : ""}s${id}Button`,
	);
	if (val > 0) {
		if (button.value !== `Open Chest Pack`)
			button.value = `Open ${nf(val)} ${
				val === 1 ? button.dataset.name : button.dataset.plural
			}`;
		button.style.visibility = ``;
	} else {
		button.style.visibility = `hidden`;
	}
}

async function oc_openChests(id) {
	const openChestsOpener = document.getElementById(`openChestsOpener`);
	const openChestsSlider = document.getElementById(`openChests${id}Slider`);
	const openChestsLabel = document.getElementById(`openChests${id}Label`);
	const openChestsLabelMax = document.getElementById(
		`openChests${id}LabelMax`,
	);
	const openChestsButton = document.getElementById(`openChests${id}Button`);
	oc_disableSlidersButtonsAndHolders(true);

	const name = openChestsButton.dataset.name;
	const plural = openChestsButton.dataset.plural;

	const amount = openChestsSlider.value;
	if (amount == null) {
		txt += oc_amountUndefined;
		openChestsOpener.innerHTML = txt;
		return;
	}

	let result;
	let currAmount = amount;
	let numFails = 0;
	let opening = ``;
	let txt = ``;
	opening = oc_makeOpeningRow(
		currAmount,
		currAmount === 1 ? name : plural,
		amount,
	);
	openChestsOpener.innerHTML = opening + txt;
	if (currAmount === 0) {
		txt += bc_addChestResultRow(`- None`);
		openChestsOpener.innerHTML = opening + txt;
		return;
	}
	while (currAmount > 0 && numFails < RETRIES) {
		const open = Math.min(1000, currAmount);
		let successType = `Failed to open`;
		try {
			result = await openGenericChest(id, open);
		} catch (error) {
			txt += bc_addChestResultRow(
				`- ${successType}:`,
				`${error}`,
			).replace("Error: ", "");
			opening = oc_makeOpeningRow(0, plural, amount);
			openChestsOpener.innerHTML = opening + txt;
			openChestsButton.value = `Open 0 ${plural}`;
			numFails++;
			continue;
		}
		let initMsg = `${open} ${open === 1 ? name : plural}`;
		if (result.success) {
			const remaining = result.chests_remaining;
			if (remaining === 0 && currAmount > open) {
				txt += bc_addChestResultRow(
					`- Stopping:`,
					`Server Said 0 ${plural} Remaining.`,
				);
				opening = oc_makeOpeningRow(0, plural, amount);
				openChestsOpener.innerHTML = opening + txt;
				openChestsSlider.min = 0;
				openChestsSlider.max = 0;
				openChestsLabelMax.innerHTML = nf(0);
				openChestsSlider.value = 0;
				openChestsLabel.innerHTML = nf(openChestsSlider.value);
				openChestsButton.value = `Open 0 ${plural}`;
				openChestsButton.style.visibility = `hidden`;
				return;
			}
			if (result.loot_details) {
				successType = `Successfully opened`;
				txt += bc_addChestResultRow(
					`- ${successType}:`,
					`${initMsg} (${remaining} Remaining)`,
				);
				currAmount -= open;
				openChestsSlider.max = remaining;
				openChestsLabelMax.innerHTML = nf(remaining);
				openChestsSlider.value -= open;
				openChestsLabel.innerHTML = nf(openChestsSlider.value);
				opening = oc_makeOpeningRow(
					currAmount,
					open === 1 ? name : plural,
					amount,
				);
				openChestsButton.value = `Open ${nf(openChestsSlider.value)} ${
					openChestsSlider.value === 1 ? name : plural
				}`;
			} else {
				txt += bc_addChestResultRow(
					`- ${successType}:`,
					`${initMsg} (${remaining} Remaining)`,
				);
				opening = oc_makeOpeningRow(0, plural, amount);
				openChestsButton.value = `Open 0 ${plural}`;
				numFails++;
			}
			openChestsOpener.innerHTML = opening + txt;
		} else {
			txt += bc_addChestResultRow(`- ${successType}:`, `${initMsg}`);
			opening = oc_makeOpeningRow(0, plural, amount);
			openChestsOpener.innerHTML = opening + txt;
			openChestsButton.value = `Open 0 ${plural}`;
			numFails++;
		}
	}
	opening = oc_makeOpeningRow(
		currAmount,
		amount === 1 ? name : plural,
		amount,
	);
	txt += bc_addChestResultRow(`Finished.`);
	openChestsOpener.innerHTML = opening + txt;
	openChestsButton.value = `Open ${openChestsSlider.value} ${plural}`;
	oc_disableSlidersButtonsAndHolders(false);
	if (numFails >= RETRIES) {
		txt += bc_addChestResultRow(`- Stopping:`, `Got too many failures.`);
		opening = oc_makeOpeningRow(0, plural, amount);
		openChestsOpener.innerHTML = opening + txt;
		openChestsButton.value = `Open 0 ${plural}`;
		return;
	}
	opening = oc_makeOpeningRow(0, plural, amount);
	openChestsOpener.innerHTML = opening + txt;
	oc_toggleOpenChestsSliderFidelity();
	if (openChestsSlider.value === 0)
		openChestsButton.style.visibility = `hidden`;
}

async function oc_openChestPack(id, packId, amount) {
	if (amount == null) {
		txt += oc_amountUndefined;
		openChestsOpener.innerHTML = txt;
		return;
	}
	const openChestsOpener = document.getElementById(`openChestsOpener`);
	const openChestsButton = document.getElementById(
		`openChestPacks${packId}Button`,
	);
	oc_disableSlidersButtonsAndHolders(true);

	const name = openChestsButton.dataset.name;
	const plural = openChestsButton.dataset.plural;

	amount = Number(amount);
	let currAmount = amount;
	let numFails = 0;
	let opening = ``;
	let result;
	let txt = ``;
	opening = oc_makeOpeningRow(
		currAmount,
		currAmount === 1 ? name : plural,
		amount,
	);
	openChestsOpener.innerHTML = opening + txt;
	if (currAmount === 0) {
		txt += bc_addChestResultRow(`- None`);
		openChestsOpener.innerHTML = opening + txt;
		return;
	}
	while (currAmount > 0 && numFails < RETRIES) {
		const open = Math.min(1000, currAmount);
		let successType = `Failed to open`;
		try {
			result = await openGenericChest(id, open, packId);
		} catch (error) {
			txt += bc_addChestResultRow(
				`- ${successType}:`,
				`${error.replace("Error: ", "")}`,
			);
			opening = oc_makeOpeningRow(0, plural, amount);
			openChestsOpener.innerHTML = opening + txt;
			openChestsButton.value = `Open 0 ${plural}`;
			numFails++;
			continue;
		}
		const initMsg = `${open} ${open === 1 ? name : plural}`;
		if (result.success && result.loot_details) {
			successType = `Successfully opened`;
			currAmount -= open;
			txt += bc_addChestResultRow(`- ${successType}:`, `${initMsg}`);
			openChestsOpener.innerHTML = opening + txt;
		} else {
			txt += bc_addChestResultRow(`- ${successType}:`, `${initMsg}`);
			opening = oc_makeOpeningRow(0, plural, amount);
			openChestsOpener.innerHTML = opening + txt;
			numFails++;
		}
	}
	opening = oc_makeOpeningRow(
		currAmount,
		amount === 1 ? name : plural,
		amount,
	);
	txt += bc_addChestResultRow(`Finished.`);
	document.getElementById(`${packId}Pack`).innerHTML = `&nbsp;`;
	openChestsOpener.innerHTML = opening + txt;
	oc_disableSlidersButtonsAndHolders(false);
	if (numFails >= RETRIES) {
		txt += bc_addChestResultRow(`- Stopping:`, `Got too many failures.`);
		opening = oc_makeOpeningRow(0, plural, amount);
		openChestsOpener.innerHTML = opening + txt;
		return;
	}
	opening = oc_makeOpeningRow(0, plural, amount);
	openChestsOpener.innerHTML = opening + txt;
	oc_toggleOpenChestsSliderFidelity();
}

function oc_makeOpeningRow(amount, name, initAmount) {
	return `<span class="f fr w100 p5">${
		amount === 0 ? `Finished ` : ``
	}Opening ${nf(amount === 0 ? initAmount : amount)} ${name}:</span>`;
}

function oc_initOpenChestsHideChests() {
	if (localStorage.getItem(oc_LSKey_hide) == null) return;
	const hideChests = oc_getHiddenChestIds();
	for (let ele of document.querySelectorAll('[id^="openChestsHide"]')) {
		const eleIds = JSON.parse(ele.dataset.ids);
		if (eleIds.some((v) => hideChests.includes(v))) ele.checked = true;
		else ele.checked = false;
	}
}

function oc_toggleHideOpenChests() {
	const chestIds = [];
	for (let ele of document.querySelectorAll(
		"input[type='checkbox'][id^='openChestsHide'",
	))
		if (ele.checked) chestIds.push(...JSON.parse(ele.dataset.ids));
	oc_saveHiddenChestIds(chestIds);
}

function oc_getHiddenChestIds() {
	let strg = localStorage.getItem(oc_LSKey_hide);
	if (!strg) return [];
	strg = JSON.parse(strg);
	// Detect migration required.
	if (Array.isArray(strg)) {
		oc_saveHiddenChestIds(strg);
		return strg;
	}
	if (!strg[currAccount.name]) return [];
	return strg[currAccount.name];
}

function oc_saveHiddenChestIds(chestIds) {
	let strg = localStorage.getItem(oc_LSKey_hide);
	if (!strg) strg = {};
	else strg = JSON.parse(strg);
	if (Array.isArray(strg)) strg = {};
	if (chestIds.length === 0) delete strg[currAccount.name];
	else strg[currAccount.name] = chestIds;
	localStorage.setItem(oc_LSKey_hide, JSON.stringify(strg));
}

function oc_initOpenChestsSliderFidelity() {
	let fidelity = oc_getOpenChestsSliderFidelity();
	if (![1, 10, 25, 50, 100, 250, 1000].includes(fidelity)) {
		oc_toggleOpenChestsSliderFidelity(1);
		fidelity = 1;
	}
	document.getElementById(`openChestsSliderFidelity`).value = fidelity;
}

function oc_toggleOpenChestsSliderFidelity(fidelity) {
	if (!fidelity) fidelity = oc_getOpenChestsSliderFidelity();
	if (fidelity === 1 && localStorage.getItem(oc_LSKey_fidelity))
		localStorage.removeItem(oc_LSKey_fidelity);
	else if (fidelity !== 1) oc_saveOpenChestsSliderFidelity(fidelity);
	for (let ele of document.querySelectorAll(
		'input[id^="openChests"][id$="Slider"]',
	)) {
		const id = ele.dataset.chestid;
		if (
			document.getElementById(`openChests${id}Button`).value !==
			`Open Chest Pack`
		) {
			const max = Number(ele.max);
			ele.step = fidelity > max ? 1 : fidelity;
		}
		ele.value = 0;
		oc_updateOpenChestsSliderValue(id, ele.value);
	}
}

function oc_disableSlidersButtonsAndHolders(disable) {
	if (disable == null) disable = true;
	for (let ele of document.querySelectorAll(
		'input[id^="openChests"][id$="Slider"]',
	)) {
		const id = ele.dataset.chestid;
		ele.disabled = disable;
		document.getElementById(`openChests${id}Button`).disabled = disable;
		document.getElementById(`openChests${id}ButtonHolder`).className =
			disable ?
				`formsCampaignSelect greyButton`
			:	`formsCampaignSelect greenButton`;
	}
	if (disable) disablePullButtons();
	else codeEnablePullButtons();
}

function oc_getOpenChestsSliderFidelity() {
	const strg = localStorage.getItem(oc_LSKey_fidelity);
	if (!strg) return 1;
	return Number(strg);
}

function oc_saveOpenChestsSliderFidelity(fidelity) {
	localStorage.setItem(oc_LSKey_fidelity, fidelity);
}
