const vdf = 1.017; // prettier-ignore

async function df_pullFormationSaves() {
	if (isBadUserData()) return;
	disablePullButtons();
	const wrapper = document.getElementById(`formsWrapper`);
	setFormsWrapperFormat(wrapper, 0);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		wrapper.innerHTML = `Waiting for formation saves data...`;
		const forms = await getFormationSaves();
		await df_displayFormationSaves(wrapper, forms);
		codeEnablePullButtons();
	} catch (error) {
		setFormsWrapperFormat(wrapper, 0);
		handleError(wrapper, error);
	}
}

async function df_displayFormationSaves(wrapper, saves) {
	if (saves == null || saves.all_saves == null) {
		wrapper.innerHTML = `Error.`;
		return;
	}
	const all = saves.all_saves;
	const formObjs = saves.formation_objects;
	let c = ``;
	let added = 0;
	for (let key in all) {
		if (key === "-1") continue;
		const id = Number(key);
		const camp = id % 1000;
		const patron = id - camp;
		const formObj = formObjs[`${id}`];
		let campName = c_campaignIds[`${camp}`];
		if (id > 1000 && id < 1000000) campName = formObj.campaign_name;
		if (campName == null) campName = `Unknown Campaign ID: ${camp}`;
		let patronName = patron === 0 ? `` : c_patronAdvIds[`${patron}`];
		if (patronName == null) patronName = ``;
		const patronDisplay = patronName === `` ? `No Patron` : patronName;
		c += `<span style="display:flex;flex-direction:column"><span class="formsCampaignTitle">${campName}<br>${patronDisplay}</span><span class="formsCampaign" id="formsCamp_${key}">`;
		for (let formation of all[key]) {
			const formId = formation.formation_save_id;
			const campId = Number(formation.campaign_id);
			const formName = formation.name;
			const formFav = Number(formation.favorite || 0);
			const formLet =
				formFav === 1 ? `Q`
				: formFav === 2 ? `W`
				: formFav === 3 ? `E`
				: ``;
			const formFeats =
				Object.prototype.toString.call(formation.feats || []) !==
				`[object Array]`;
			let extras = ``;
			if (formLet !== ``) extras += `Fav: ${formLet}`;
			if (formFeats) {
				if (extras !== ``) extras += " / ";
				extras += "Has Feats";
			}
			if (extras !== ``) extras = ` (${extras})`;
			const tt = df_createFormationTooltip(
				formName + extras,
				formation.formation,
				formObj,
			);
			c += `<span class="formsCampaignFormation"><input type="checkbox" id="form_${formId}" name="${formName}" data-camp="${campName}" data-campid="${campId}" data-extras="${extras}"><label class="cblabel" for="form_${formId}">${formName}${extras}</label>${tt}</span>`;
			added++;
		}
		c += `<span class="formsCampaignSelect"><input id="forms_selectAll_${key}" type="button" onClick="df_formsSelectAll('${key}',true)" value="Select All"><input id="forms_selectNone_${key}" type="button" onClick="df_formsSelectAll('${key}',false)" value="Deselect All"></span></span></span>`;
	}
	setFormsWrapperFormat(wrapper, 1);
	wrapper.innerHTML = c;
	const formsDeleter = document.getElementById(`formsDeleter`);
	let fd = ``;
	if (document.querySelectorAll('input[name="___AUTO___SAVE___"]').length > 0)
		fd += `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:50%"><input type="button" onClick="df_toggleSelectAutosaveForms()" id="toggleSelectAutosaveFormsButton" value="Select All Autosaved Formations"></span></span><br>`;
	if (added > 0)
		fd += `<span class="f fr w100 p5"><span class="f falc fje mr2 redButton" style="width:50%" id="formationsDeleteRow"><input type="button" onClick="df_deleteFormationSaves()" name="formationsDeleteButton" id="formationsDeleteButton" style="font-size:0.9em;min-width:180px" value="Delete Selected Formations"></span></span>`;
	else
		fd += `<span class="f fr w100 p5"><span class="f falc fje mr2 redButton" style="width:50%" id="formationsDeleteRow">You have no formations to delete.</span></span>`;
	formsDeleter.innerHTML = fd;
}

function df_createFormationTooltip(name, champs, formation) {
	if (name == null || champs == null || formation == null) return ``;
	let formObj = ``;
	for (let currForm of formation.game_change_data) {
		if (currForm.type != null && currForm.type === `formation`) {
			if (currForm.formation == null) return ``;
			formObj = currForm.formation;
			break;
		}
	}
	if (formObj === ``) {
		for (let currForm of formation.campaign_changes) {
			if (currForm.type != null && currForm.type === `formation`) {
				if (currForm.formation == null) return ``;
				formObj = currForm.formation;
				break;
			}
		}
	}
	if (formObj === ``) return ``;

	const circleDiameter = 50;
	const colMult = 60;
	const rowMult = 30;

	let maxCol = 0;
	let minY = 99999999;
	let maxY = 0;
	for (let currObj of formObj) {
		if (currObj.col > maxCol) maxCol = currObj.col;
		const y = Math.floor(currObj.y / 10);
		if (y < minY) minY = y;
		if (y > maxY) maxY = y;
	}

	const formWidth = circleDiameter + colMult * maxCol;
	const formHeight = circleDiameter + rowMult * (maxY - minY);

	let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${formWidth}" height="${formHeight}">`;
	for (let i = 0; i < formObj.length; i++) {
		const currObj = formObj[i];
		let champ = Number(champs[i]);
		if (isNaN(champ) || champ < 0) champ = 0;
		const yPos = Math.floor(currObj.y / 10);
		const x = (maxCol - currObj.col) * colMult;
		const y = (yPos - minY) * rowMult;
		svg += `<image x="${x}" y="${y}" width="${circleDiameter}" height="${circleDiameter}" href="images/portraits/${champ}.png" />`;
	}
	svg += `</svg>`;
	return `<span class="tooltipContents">${name}${svg}</span>`;
}

function df_formsSelectAll(id, check) {
	for (let ele of document
		.getElementById(`formsCamp_${id}`)
		.querySelectorAll('input[type="checkbox"]'))
		ele.checked = check;
}

function df_toggleSelectAutosaveForms() {
	const button = document.getElementById(`toggleSelectAutosaveFormsButton`);
	const check = !button.value.includes(`Deselect`);
	for (let ele of document.querySelectorAll(
		'input[name="___AUTO___SAVE___"]',
	))
		ele.checked = check;
	button.value = `${check ? `Deselect` : `Select`} All Autosaved Formations`;
}

async function df_deleteFormationSaves() {
	df_disableAllFormationsButtonsAndCheckboxes(true);
	const formsDeleter = document.getElementById(`formsDeleter`);
	let c = `<span class="f fr w100 p5">Deleting Formation Saves:</span>`;
	formsDeleter.innerHTML = c;
	let count = 0;
	for (let form of document.querySelectorAll('[id^="form_"]')) {
		if (!form.checked) continue;
		count++;
		const id = Number(form.id.replaceAll("form_", ""));
		let autosaveError = false;
		if (form.name === `___AUTO___SAVE___`) {
			if (autosaveError) {
				form.parentNode.style.display = `none`;
				form.checked = false;
				continue;
			}
			// Can't delete the autosaves atm. So have to rename them first.
			const campId = form.dataset.campid;
			const result = await saveFormation(
				id,
				campId,
				`renameAutoSaveToDeleteIt`,
			);
			if (result[FR] === `Invalid or incomplete parameters`) {
				c += `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:175px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">- Failed to delete:</span><span class="f falc fjs ml2" style="flex-grow:1;margin-left:5px;flex-wrap:wrap">Your browser is modifying parameters required for the deletion of autosave formations. Ignoring further autosaves.</span></span>`;
				autosaveError = true;
				form.parentNode.style.display = `none`;
				form.checked = false;
				formsDeleter.innerHTML = c;
				continue;
			}
		}
		const result = await deleteFormationSave(id);
		const extras = form.dataset.extras;
		let successType = ``;
		if (result["success"] && result["okay"])
			successType = `Successfully deleted`;
		else successType = `Failed to delete`;
		c += `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:175px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">- ${successType}:</span><span class="f falc fjs ml2" style="flex-grow:1;margin-left:5px;flex-wrap:wrap">${form.name} in ${form.dataset.camp}${extras}</span></span>`;
		form.parentNode.style.display = `none`;
		form.checked = false;
		formsDeleter.innerHTML = c;
	}
	if (count === 0) {
		c += `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:175px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">- None</span></span>`;
		formsDeleter.innerHTML = c;
	}
	df_disableAllFormationsButtonsAndCheckboxes(false);
}

function df_disableAllFormationsButtonsAndCheckboxes(disable) {
	if (disable) {
		disablePullButtons();
		for (let ele of document.querySelectorAll(
			`input[type="checkbox"][id^="form"]`,
		)) {
			ele.disabled = disable;
			ele.style =
				disable ?
					`color:#555555;background-color:hsl(calc(240*0.95),15%,calc(16%*0.8))`
				:	``;
		}
		for (let ele of document.querySelectorAll(
			`input[type="button"][id^="forms_select"]`,
		)) {
			ele.disabled = disable;
			ele.style =
				disable ? `color:#555555;background-color:var(--good2)` : ``;
		}
	} else codeEnablePullButtons();
}
