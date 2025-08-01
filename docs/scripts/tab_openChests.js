const voc=1.024;
const hoc = `scHideOpenChests`
const ocsf = `scOpenChestsSliderFidelity`;
var brivPatronChests=['152','153','311'];

async function pullOpenChestsData() {
	if (isBadUserData())
		return;
	disablePullButtons();
	let wrapper = document.getElementById(`openChestsWrapper`);
	setFormsWrapperFormat(wrapper,0);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		wrapper.innerHTML = `Waiting for user data...`;
		let details = (await getUserDetails()).details;
		let chestsHave = details.chests;
		let chestPacks = details.chest_packs;
		wrapper.innerHTML = `Waiting for definitions...`;
		let chestsDefs = (await getDefinitions("chest_type_defines")).chest_type_defines;
		await displayOpenChestsData(wrapper,chestsHave,chestPacks,chestsDefs);
		codeEnablePullButtons();
	} catch (error) {
		setFormsWrapperFormat(wrapper,0);
		handleError(wrapper,error);
	}
}

async function displayOpenChestsData(wrapper,chestsHave,chestPacks,chestsDefs) {
	let openChestsOpener = document.getElementById(`openChestsOpener`);
	let chestIds = chestsHave!=undefined ? Object.keys(chestsHave) : [];
	let chestPacksById = {};
	for (let chestPack of chestPacks) {
		let id = chestPack.chest_type_id;
		chestPacksById[id] = {total:chestPack.total_chests,opened:chestPack.opened_chests,id:chestPack.pack_id,have:0};
		if (chestsHave[id]!=undefined)
			chestPacksById[id].have = chestsHave[id];
	}
	let chestPackIds = Object.keys(chestPacksById);
	for (let chestId of chestPackIds)
		if (!chestIds.includes(chestId))
			chestIds.push(chestId);
	wrapper.innerHTML = `&nbsp;`;
	if (chestIds.length==0) {
		openChestsOpener.innerHTML = `<span class="f w100 p5" style="padding-left:10%">You don't have any chests to open.</span>`;
		return;
	}
	let hiddenChestIds = getHiddenChestIds();
	for (let i=chestIds.length-1; i>=0; i--)
		if (hiddenChestIds.includes(chestIds[i]))
			chestIds.splice(chestIds.indexOf(chestIds[i]),1);
	if (chestIds.length==0) {
		openChestsOpener.innerHTML = `<span class="f w100 p5" style="padding-left:10%">You don't have any unhidden chests to open.</span>`;
		return;
	}
	let chestNames = {};
	for (let chest of chestsDefs)
		if (chestIds.includes(`${chest.id}`))
			chestNames[chest.id] = [chest.name, chest.name_plural, chest.hc_name, chest.hc_name_plural, (chest.hero_ids==undefined?[]:chest.hero_ids)];
	if (hiddenChestIds.includes(174)||hiddenChestIds.includes(175)) {
		for (let i=chestIds.length-1; i>=0; i--)
			if (chestNames[`${chestIds[i]}`][4].includes(58))
				chestIds.splice(chestIds.indexOf(chestIds[i]),1);
		chestIds = chestIds.filter((e)=>!brivPatronChests.includes(e));
	}
	if (chestIds.length==0) {
		openChestsOpener.innerHTML = `<span class="f w100 p5" style="padding-left:10%">You don't have any unhidden chests to open.</span>`;
		return;
	}
	
	let txt = ``;
	for (let id of chestIds) {
		if (hiddenChestIds.includes(Number(id)))
			continue;
		let name = chestNames[id][0];
		let plural = chestNames[id][1];
		let amount = chestsHave[id];
		if (amount!=undefined&&chestPacksById[id]!=undefined)
			amount -= chestPacksById[id].total - chestPacksById[id].opened;
		if (amount <= 0)
			continue;
		let fidelity = getOpenChestsSliderFidelity();
		if (fidelity > amount)
			fidelity = 1;
		txt += `<span style="display:flex;flex-direction:column"><span class="formsCampaignTitle">${plural} (ID:${id})</span><span class="formsCampaign" id="${id}"><span class="featsChampionList" style="margin-bottom:5px">Owned:<span style="margin-left:5px" id="openChests${id}LabelMax">${nf(amount)}</span></span><span class="featsChampionList"><input type="range" min="0" max="${amount}" step="${fidelity}" value="0" name="openChests${id}Slider" id="openChests${id}Slider" oninput="updateOpenChestsSliderValue(${id},this.value);"><label class="cblabel" for="openChests${id}Slider" id="openChests${id}Label" style="width:20%;text-align:center">0</label></span><span class="formsCampaignSelect greenButton" id="openChests${id}ButtonHolder"><input type="button" id="openChests${id}Button" onClick="openChests('${id}')" value="Open 0 ${plural}" data-name="${name}" data-plural="${plural}" style="visibility:hidden;width:80%"></span></span></span>`;
	}
	for (let id of chestPackIds) {
		if (hiddenChestIds.includes(Number(id)))
			continue;
		let chestPack = chestPacksById[id];
		let name = chestNames[id][2];
		let plural = chestNames[id][3];
		let max = chestPacksById[id].total - chestPacksById[id].opened;
		let min = Math.min(chestPacksById[id].have,max);
		let canOpen = min >= max;
		txt += `<span style="display:flex;flex-direction:column"><span class="formsCampaignTitle">${name} Pack (ID:${id})</span><span class="formsCampaign" id="${id}Pack"><span class="featsChampionList" style="margin-bottom:5px">Contains ${max} Chests</span><span class="formsCampaignSelect greenButton" id="openChests${id}ButtonHolder">`;
		if (canOpen)
			txt += `<input type="button" id="openChests${id}Button" onClick="openChestPack('${id}','${chestPack.id}','${max}')" value="Open Chest Pack" data-name="${name} Pack" data-plural="${plural} Pack" style="width:80%">`;
		else
			txt += `You don't have enough to open this pack.`;
		txt += `</span></span></span>`;
	}
	
	setFormsWrapperFormat(wrapper,1);
	if (txt!=``)
		wrapper.innerHTML = txt;
	else
		wrapper.innerHTML = `&nbsp;`;
}

function updateOpenChestsSliderValue(id,val) {
	document.getElementById(`openChests${id}Label`).innerHTML=nf(val);
	let button = document.getElementById(`openChests${id}Button`);
	if (val > 0) {
		button.value = `Open ${nf(val)} ${val==1?button.dataset.name:button.dataset.plural}`;
		button.style.visibility = ``;
	} else {
		button.style.visibility = `hidden`;
	}
}

async function openChests(id) {
	let openChestsOpener = document.getElementById(`openChestsOpener`);
	let openChestsSlider = document.getElementById(`openChests${id}Slider`);
	let openChestsLabel = document.getElementById(`openChests${id}Label`);
	let openChestsLabelMax = document.getElementById(`openChests${id}LabelMax`);
	let openChestsButton = document.getElementById(`openChests${id}Button`);
	let openChestsButtonHolder = document.getElementById(`openChests${id}ButtonHolder`);
	let slidersButtonsAndHoldersIds = [];
	disableSlidersButtonsAndHolders(true);
	
	let name = openChestsButton.dataset.name;
	let plural = openChestsButton.dataset.plural;
	
	let amount = openChestsSlider.value;
	if (amount == undefined) {
		txt+=`<span class="f w100 p5" style="padding-left:10%">Unknown error. Amount to open is undefined.</span>`;
		openChestsOpener.innerHTML = txt;
		return;
	}
	
	let result;
	let currAmount = amount;
	let numFails=0;
	let opening=``;
	let txt=``;
	opening=makeOpeningRow(currAmount,(currAmount==1?name:plural),amount);
	openChestsOpener.innerHTML = opening + txt;
	if (currAmount==0) {
		txt += addChestResultRow(`- None`);
		openChestsOpener.innerHTML = opening + txt;
		return;
	}
	while (currAmount > 0 && numFails < RETRIES) {
		let open = Math.min(1000,currAmount);
		let successType = `Failed to open`;
		try {
			result = await openGenericChest(id,open);
		} catch (error) {
			txt += addChestResultRow(`- ${successType}:`,`${error}`).replace("Error: ","");
			opening=makeOpeningRow(0,plural,amount);
			openChestsOpener.innerHTML = opening + txt;
			openChestsButton.value = `Open 0 ${plural}`;
			numFails++;
			continue;
		}
		let initMsg = `${open} ${open==1?name:plural}`;
		if (result.success) {
			let remaining = result.chests_remaining;
			if (remaining==0&&currAmount>open) {
				txt += addChestResultRow(`- Stopping:`,`Server Said 0 ${plural} Remaining.`);
				opening=makeOpeningRow(0,plural,amount);
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
				txt += addChestResultRow(`- ${successType}:`,`${initMsg} (${remaining} Remaining)`);
				currAmount -= open;
				openChestsSlider.max = remaining;
				openChestsLabelMax.innerHTML = nf(remaining);
				openChestsSlider.value -= open;
				openChestsLabel.innerHTML = nf(openChestsSlider.value);
				opening=makeOpeningRow(currAmount,(open==1?name:plural),amount);
				openChestsButton.value = `Open ${nf(openChestsSlider.value)} ${openChestsSlider.value==1?name:plural}`;
			} else {
				txt += addChestResultRow(`- ${successType}:`,`${initMsg} (${remaining} Remaining)`);
				opening=makeOpeningRow(0,plural,amount);
				openChestsButton.value = `Open 0 ${plural}`;
				numFails++;
			}
			openChestsOpener.innerHTML = opening + txt;
		} else {
			txt += addChestResultRow(`- ${successType}:`,`${initMsg}`);
			opening=makeOpeningRow(0,plural,amount);
			openChestsOpener.innerHTML = opening + txt;
			openChestsButton.value = `Open 0 ${plural}`;
			numFails++;
		}
	}
	opening=makeOpeningRow(currAmount,(amount==1?name:plural),amount);
	txt += addChestResultRow(`Finished.`);
	openChestsOpener.innerHTML = opening + txt;
	openChestsButton.value = `Open ${openChestsSlider.value} ${plural}`;
	if (numFails >= RETRIES) {
		txt += addChestResultRow(`- Stopping:`,`Got too many failures.`);
		opening=makeOpeningRow(0,plural,amount);
		openChestsOpener.innerHTML = opening + txt;
		openChestsButton.value = `Open 0 ${plural}`;
		return;
	}
	opening=makeOpeningRow(0,plural,amount);
	openChestsOpener.innerHTML = opening + txt;
	disableSlidersButtonsAndHolders(false);
	toggleOpenChestsSliderFidelity();
	if (openChestsSlider.value==0)
		openChestsButton.style.visibility = `hidden`;
}

async function openChestPack(id,packId,amount) {
	if (amount == undefined) {
		txt+=`<span class="f w100 p5" style="padding-left:10%">Unknown error. Amount to open is undefined.</span>`;
		openChestsOpener.innerHTML = txt;
		return;
	}
	let openChestsOpener = document.getElementById(`openChestsOpener`);
	let openChestsButton = document.getElementById(`openChests${id}Button`);
	let openChestsButtonHolder = document.getElementById(`openChests${id}ButtonHolder`);
	disableSlidersButtonsAndHolders(true);
	
	let name = openChestsButton.dataset.name;
	let plural = openChestsButton.dataset.plural;
	
	amount = Number(amount);
	let currAmount = amount;
	let numFails=0;
	let opening=``;
	let result;
	let txt=``;
	opening=makeOpeningRow(currAmount,(currAmount==1?name:plural),amount);
	openChestsOpener.innerHTML = opening + txt;
	if (currAmount==0) {
		txt += addChestResultRow(`- None`);
		openChestsOpener.innerHTML = opening + txt;
		return;
	}
	while (currAmount > 0 && numFails < RETRIES) {
		let open = Math.min(1000,currAmount);
		let successType = `Failed to open`;
		try {
			result = await openGenericChest(id,open,packId);
		} catch (error) {
			txt += addChestResultRow(`- ${successType}:`,`${error.replace("Error: ","")}`);
			opening=makeOpeningRow(0,plural,amount);
			openChestsOpener.innerHTML = opening + txt;
			openChestsButton.value = `Open 0 ${plural}`;
			numFails++;
			continue;
		}
		let initMsg = `${open} ${open==1?name:plural}`;
		if (result.success&&result.loot_details) {
			successType = `Successfully opened`;
			currAmount -= open;
			txt += addChestResultRow(`- ${successType}:`,`${initMsg}`);
			openChestsOpener.innerHTML = opening + txt;
		} else {
			txt += addChestResultRow(`- ${successType}:`,`${initMsg}`);
			opening=makeOpeningRow(0,plural,amount);
			openChestsOpener.innerHTML = opening + txt;
			numFails++;
		}
	}
	opening=makeOpeningRow(currAmount,(amount==1?name:plural),amount);
	txt += addChestResultRow(`Finished.`);
	document.getElementById(`${id}Pack`).innerHTML = `&nbsp;`;
	openChestsOpener.innerHTML = opening + txt;
	if (numFails >= RETRIES) {
		txt += addChestResultRow(`- Stopping:`,`Got too many failures.`);
		opening=makeOpeningRow(0,plural,amount);
		openChestsOpener.innerHTML = opening + txt;
		return;
	}
	opening=makeOpeningRow(0,plural,amount);
	openChestsOpener.innerHTML = opening + txt;
	disableSlidersButtonsAndHolders(false);
	toggleOpenChestsSliderFidelity();
}

function makeOpeningRow(amount,name,initAmount) {
	return `<span class="f fr w100 p5">${amount==0?`Finished `:``}Opening ${nf(amount==0?initAmount:amount)} ${name}:</span>`;
}

function initOpenChestsHideChests() {
	if (localStorage.getItem(hoc)==undefined)
		return;
	let hideChests = getHiddenChestIds();
	for (let ele of document.querySelectorAll('[id^="openChestsHide"]')) {
		let eleIds = JSON.parse(ele.dataset.ids);
		if (eleIds.some(v => hideChests.includes(v)))
			ele.checked = true;
		else
			ele.checked = false;
	}
}

function toggleHideOpenChests() {
	let chestIds = [];
	for (let ele of document.querySelectorAll("input[type='checkbox'][id^='openChestsHide'"))
		if (ele.checked)
			chestIds.push(...JSON.parse(ele.dataset.ids));
	saveHiddenChestIds(chestIds);
}

function getHiddenChestIds() {
	let strg = localStorage.getItem(hoc);
	if (strg!=undefined) {
		strg = JSON.parse(localStorage.getItem(hoc));
		// Detect migration required.
		if (Array.isArray(strg)) {
			saveHiddenChestIds(strg);
			return strg;
		}
		if (strg[currAccount.name] != undefined)
			return strg[currAccount.name];
	}
	return [];
}

function saveHiddenChestIds(chestIds) {
	let strg = localStorage.getItem(hoc);
	if (strg==undefined)
		strg = {};
	else
		strg = JSON.parse(strg);
	if (Array.isArray(strg))
		strg = {};
	if (chestIds.length == 0)
		delete strg[currAccount.name];
	else
		strg[currAccount.name] = chestIds;
	localStorage.setItem(hoc, JSON.stringify(strg));
}

function initOpenChestsSliderFidelity() {
	let fidelity = getOpenChestsSliderFidelity();
	if (![1,10,25,50,100,250,1000].includes(fidelity)) {
		toggleOpenChestsSliderFidelity(1);
		fidelity = 1;
	}
	document.getElementById(`openChestsSliderFidelity`).value = fidelity;
}

function toggleOpenChestsSliderFidelity(fidelity) {
	if (fidelity==undefined)
		fidelity = getOpenChestsSliderFidelity();
	if (fidelity==1&&localStorage.getItem(ocsf)!=undefined)
		localStorage.removeItem(ocsf);
	else if (fidelity!=1)
		saveOpenChestsSliderFidelity(fidelity);
	for (let ele of document.querySelectorAll('input[id^="openChests"][id$="Slider"]')) {
		let id = Number(ele.id.replace(/[^0-9]/g,``));
		let max = Number(ele.max);
		ele.value = 0;
		ele.step = fidelity > max ? 1 : fidelity;
		updateOpenChestsSliderValue(id,ele.value);
	}
}

function disableSlidersButtonsAndHolders(disable) {
	if (disable == undefined)
		disable = true;
	for (let ele of document.querySelectorAll('input[id^="openChests"][id$="Slider"]')) {
		let id = Number(ele.id.replace(/[^0-9]/g,``));
		ele.disabled = disable;
		document.getElementById(`openChests${id}Button`).disabled = disable;
		document.getElementById(`openChests${id}ButtonHolder`).className = disable ? `formsCampaignSelect greyButton` : `formsCampaignSelect greenButton`;
	}
	if (disable)
		disablePullButtons(true);
	else
		codeEnablePullButtons();
}

function getOpenChestsSliderFidelity() {
	let strg = localStorage.getItem(ocsf);
	if (strg!=undefined)
		return Number(strg);
	return 1
}

function saveOpenChestsSliderFidelity(fidelity) {
	localStorage.scOpenChestsSliderFidelity = fidelity;
}