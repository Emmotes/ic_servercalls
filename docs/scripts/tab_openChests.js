const voc=1.002;

async function pullOpenChestsData() {
	if (userIdent[0]==``||userIdent[1]==``) {
		init();
		return;
	}
	temporarilyDisableAllPullButtons();
	let wrapper = document.getElementById(`openChestsWrapper`);
	setFormsWrapperFormat(wrapper,0);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		wrapper.innerHTML = `Waiting for user data...`;
		let chestsHave = (await getUserDetails()).details.chests;
		wrapper.innerHTML = `Waiting for definitions...`;
		let chestsDefs = (await getDefinitions("chest_type_defines")).chest_type_defines;
		await displayOpenChestsData(wrapper,chestsHave,chestsDefs);
	} catch {
		setFormsWrapperFormat(wrapper,0);
		wrapper.innerHTML = BADDATA;
	}
}

async function displayOpenChestsData(wrapper,chestsHave,chestsDefs) {
	let openChestsOpener = document.getElementById(`openChestsOpener`);
	let chestIds = chestsHave!=undefined ? Object.keys(chestsHave) : [];
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
			chestNames[chest.id] = [chest.name, chest.name_plural, (chest.hero_ids==undefined?[]:chest.hero_ids)];
	if (hiddenChestIds.includes(174)||hiddenChestIds.includes(175))
		for (let i=chestIds.length-1; i>=0; i--)
			if (chestNames[`${chestIds[i]}`][2].includes(58))
				chestIds.splice(chestIds.indexOf(chestIds[i]),1);
	if (chestIds.length==0) {
		openChestsOpener.innerHTML = `<span class="f w100 p5" style="padding-left:10%">You don't have any unhidden chests to open.</span>`;
		return;
	}
	
	let txt = ``;
	for (let id of chestIds) {
		if (hiddenChestIds.includes(Number(id))) {
			continue;
		}
		let name = chestNames[id][0];
		let plural = chestNames[id][1];
		let amount = chestsHave[id];
		txt += `<span style="display:flex;flex-direction:column"><span class="formsCampaignTitle">${plural} (ID:${id})</span><span class="formsCampaign" id="${id}"><span class="featsChampionList" style="margin-bottom:5px">Owned:<label style="margin-left:5px" id="openChests${id}LabelMax">${nf(amount)}</label></span><span class="featsChampionList"><input type="range" min="0" max="${amount}" step="1" value="0" name="openChests${id}Slider" id="openChests${id}Slider" oninput="updateOpenChestsSliderValue(${id},this.value);"><label class="cblabel" for="openChest${id}Slider" id="openChests${id}Label" style="width:20%;text-align:center">0</label></span><span class="formsCampaignSelect greenButton" id="openChests${id}ButtonHolder"><input type="button" id="openChests${id}Button" onClick="openChests('${id}')" value="Open 0 ${plural}" data-name="${name}" data-plural="${plural}" style="visibility:hidden;width:80%"></span></span></span>`;
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
	openChestsSlider.disabled = true;
	openChestsButton.disabled = true;
	openChestsButtonHolder.className = `formsCampaignSelect`;
	
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
		result = await openGenericChest(Number(id),open);
		let successType = `Failed to open`;
		let initMsg = `${open} ${open==1?name:plural}`;
		if (result.success) {
			let remaining = result.chests_remaining;
			if (remaining==0) {
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
				openChestsButton.value = `Open ${openChestsSlider.value} ${openChestsSlider.value==1?name:plural}`;
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
	openChestsSlider.disabled = false;
	openChestsButton.disabled = false;
	openChestsButtonHolder.className = `formsCampaignSelect greenButton`;
	if (openChestsSlider.value==0)
		openChestsButton.style.visibility = `hidden`;
}

function makeOpeningRow(amount,name,initAmount) {
	return `<span class="f fr w100 p5">${amount==0?`Finished `:``}Opening ${nf(amount==0?initAmount:amount)} ${name}:</span>`;
}

function initOpenChestsHideChests() {
	if (localStorage.scHideOpenChests==undefined)
		return;
	let hideChests = getHiddenChestIds();
	if (hideChests.length==0)
		return;
	for (let ele of document.querySelectorAll('[id^="openChestsHide"]')) {
		let eleIds = JSON.parse(ele.dataset.ids);
		if (eleIds.some(v => hideChests.includes(v)))
			ele.checked = true;
	}
}

function toggleHideOpenChests(ele) {
	let chestIds = JSON.parse(ele.dataset.ids);
	if (localStorage.scHideOpenChests==undefined) {
		saveHiddenChestIds(chestIds);
		return;
	}
	let checked = ele.checked;
	let hideChests = getHiddenChestIds();
	for (let chestId of chestIds) {
		if (checked&&!hideChests.includes(chestId))
			hideChests.push(chestId);
		else if (!checked&&hideChests.includes(chestId))
			hideChests.splice(hideChests.indexOf(chestId),1);
	}
	if (hideChests.length==0)
		localStorage.removeItem(`scHideOpenChests`);
	else
		saveHiddenChestIds(hideChests);
}

function getHiddenChestIds() {
	if (localStorage.scHideOpenChests!=undefined)
		return JSON.parse(localStorage.scHideOpenChests);
	return [];
}

function saveHiddenChestIds(chestIds) {
	localStorage.scHideOpenChests = JSON.stringify(chestIds);
}