const vdf = 2.001; // prettier-ignore
const df_serverCalls = new Set(["getFormationSaves"]);
let df_formsState = null;

function df_registerData() {
	df_serverCalls.forEach((c) => t_tabsServerCalls.add(c));
}

function df_tab() {
	return `
					<span class="f fr w100 p5">
						<span class="f falc fjs ml2" style="width:100%">
							<h1>Delete Formation Saves</h1>
						</span>
					</span>
					<span class="f fr w100 p5">
						<span class="f fc fals fjs ml2" style="width:100%">
							<p>This page will let you pick and choose any formation saves you have and delete them. The aim of this is to lower the amount of data you need to download every time the game restarts or the modron resets - since the server pulls ALL of your formation saves every time.</p>
						</span>
					</span>
					<span class="f fr w100 p5">
						&nbsp;
					</span>
					<span class="f fr w100 p5" style="height:34px;">
						<span class="f falc fje mr2" style="width:50%;">
							<input type="button" onClick="df_pullFormationSaves()" name="deleteFormationsPullButton" id="deleteFormationsPullButton" value="Pull Formation Save Data" style="min-width:175px">
							<span id="deleteFormationsPullButtonDisabled" style="font-size:0.9em" hidden>&nbsp;</span>
						</span>
					</span>
					<span class="f fr w100 p5">
						&nbsp;
					</span>
					<span class="f falc fje mr2" style="flex-direction:column" id="deleteFormsWrapper">
						&nbsp;
					</span>
					<span class="f fr w100 p5">
						&nbsp;
					</span>
					<span class="f falc fje mr2" style="width:100%;flex-direction:column" id="deleteFormsDeleter">
						&nbsp;
					</span>
					<span class="f fr w100 p5">
						&nbsp;
					</span>
					<span class="f falc fje mr2" style="width:100%;flex-direction:column" id="deleteFormsSummary">
						&nbsp;
					</span>
					<span class="f fr w100 p5">
						&nbsp;
					</span>
				`;
}

async function df_pullFormationSaves(formationSaves) {
	if (!formationSaves) {
		if (isBadUserData()) return;
		disablePullButtons();
	}
	const wrapper = document.getElementById(`deleteFormsWrapper`);
	setWrapperFormat(wrapper, 0);
	try {
		const summary = document.getElementById(`deleteFormsSummary`);
		if (summary) summary.innerHTML = `&nbsp;`;
		if (!formationSaves) {
			wrapper.innerHTML = `Waiting for formation saves data...`;
			formationSaves = await getFormationSaves();
		}
		df_buildMaps(formationSaves);
		if (df_formsState == null) {
			handleInvalidData(wrapper);
			return;
		}
		await df_displayFormationSaves(wrapper);
		codeEnablePullButtons();
	} catch (error) {
		setWrapperFormat(wrapper, 0);
		handleError(wrapper, error);
	}
}

function df_buildMaps(saves) {
	if (!saves || !saves.all_saves || !saves.formation_objects) {
		df_formsState = null;
		return;
	}

	const map = new Map();
	for (const key in saves.all_saves) {
		const campaignId = Number(key);
		if (campaignId === -1) continue;

		const formObj = saves.formation_objects?.[key];
		if (!formObj) continue;

		const patronId = Number(formObj?.patron_id ?? 0);
		const campaignName =
			c_campaignIds.get(campaignId) ?? formObj?.campaign_name;
		if (!campaignName) continue;

		const patronName =
			patronId === 0 ? `No Patron` : c_patronById?.get(patronId);
		if (!patronName) continue;

		if (!map.has(campaignId)) map.set(campaignId, new Map());
		if (!map.get(campaignId).has(patronId))
			map.get(campaignId).set(patronId, []);

		for (const form of saves.all_saves[key]) {
			const id = Number(form.formation_save_id ?? -1);
			if (id < 0) continue;

			const name = form?.name;
			if (!name) continue;

			const fav = Number(form.favorite ?? 0);
			const formation = form.formation;
			const hasFeats = !Array.isArray(formation?.feats ?? []);
			const tooltip = df_createFormationTooltip(name, formation, formObj);

			map.get(campaignId).get(patronId).push({
				id,
				name,
				fav,
				formation,
				hasFeats,
				tooltip,
				campaignId,
				campaignName,
				patronId,
				patronName,
				markedForDelete: false,
			});
		}
	}

	df_formsState = map;
}

async function df_displayFormationSaves(wrapper) {
	if (!(df_formsState instanceof Map)) {
		wrapper.innerHTML = `Error.`;
		return;
	}
	let c = ``;
	let added = 0;
	for (const [campaignId, patrons] of df_formsState) {
		for (const [patronId, formations] of patrons) {
			const groupId = `${campaignId}_${patronId}`;
			const group = formations[0];
			if (!group) continue;
			c += `<span style="display:flex;flex-direction:column"><span class="formsCampaignTitle">${group.campaignName}<br>${group.patronName}</span><span class="formsCampaign" id="formsCamp_${groupId}">`;
			for (const formation of formations) {
				const formId = formation.id;
				const formName = formation.name;
				const formFav = formation.fav;
				const formLet =
					formFav === 1 ? `Q`
					: formFav === 2 ? `W`
					: formFav === 3 ? `E`
					: ``;
				const formFeats = formation.hasFeats;
				let extras = ``;
				if (formLet !== ``) extras += `Fav: ${formLet}`;
				if (formFeats) {
					if (extras !== ``) extras += " / ";
					extras += "Has Feats";
				}
				if (extras !== ``) extras = ` (${extras})`;
				const tt = formation.tooltip;
				c += `<span class="formsCampaignFormation"><input type="checkbox" id="form_${formId}"${formation.markedForDelete ? ` checked` : ``} onchange="df_markFormationForDelete(${campaignId},${patronId},${formId},this.checked)"><label class="cblabel" for="form_${formId}">${formName}${extras}</label>${tt}</span>`;
				added++;
			}
			c += `<span class="formsCampaignSelect"><input id="forms_selectAll_${groupId}" type="button" onClick="df_formsSelectAll(${campaignId},${patronId},true)" value="Select All"><input id="forms_selectNone_${groupId}" type="button" onClick="df_formsSelectAll(${campaignId},${patronId},false)" value="Deselect All"></span></span></span>`;
		}
	}
	setWrapperFormat(wrapper, 1);
	wrapper.innerHTML = c;
	const deleteFormsDeleter = document.getElementById(`deleteFormsDeleter`);
	let fd = ``;
	if (
		[...df_formsState.values()].some((patrons) =>
			[...patrons.values()].some((formations) =>
				formations.some(
					(formation) => formation.name === `___AUTO___SAVE___`,
				),
			),
		)
	)
		fd += `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:50%"><input type="button" onClick="df_toggleSelectAutosaveForms()" id="toggleSelectAutosaveFormsButton" value="Select All Autosaved Formations"></span></span><br>`;
	if (added > 0)
		fd += `<span class="f fr w100 p5"><span class="f falc fje mr2 redButton" style="width:50%" id="formationsDeleteRow"><input type="button" onClick="df_deleteFormationSaves()" name="formationsDeleteButton" id="formationsDeleteButton" style="font-size:0.9em;min-width:180px" value="Delete Selected Formations"></span></span>`;
	else
		fd += `<span class="f fr w100 p5"><span class="f falc fje mr2 redButton" style="width:50%" id="formationsDeleteRow">You have no formations to delete.</span></span>`;
	deleteFormsDeleter.innerHTML = fd;
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
		svg += `<image x="${x}" y="${y}" width="${circleDiameter}" height="${circleDiameter}" href="images/circularised/${champ}.png" />`;
	}
	svg += `</svg>`;
	return `<span class="tooltipContents">${name}${svg}</span>`;
}

function df_markFormationForDelete(campaignId, patronId, formationId, check) {
	const formations = df_formsState?.get(campaignId)?.get(patronId) ?? [];
	const formation = formations.find((form) => form.id === formationId);
	if (formation) formation.markedForDelete = check;
}

function df_refreshFormationCheckboxes() {
	for (const patrons of df_formsState?.values() ?? [])
		for (const formations of patrons.values())
			for (const formation of formations) {
				const checkbox = document.getElementById(
					`form_${formation.id}`,
				);
				if (checkbox) checkbox.checked = formation.markedForDelete;
			}
}

function df_formsSelectAll(campaignId, patronId, check) {
	const formations = df_formsState?.get(campaignId)?.get(patronId) ?? [];
	for (const formation of formations) formation.markedForDelete = check;
	df_refreshFormationCheckboxes();
}

function df_toggleSelectAutosaveForms() {
	const button = document.getElementById(`toggleSelectAutosaveFormsButton`);
	if (!button) return;

	const check = !button.value.includes(`Deselect`);
	for (const patrons of df_formsState?.values() ?? [])
		for (const formations of patrons.values())
			for (const formation of formations)
				if (formation.name === `___AUTO___SAVE___`)
					formation.markedForDelete = check;
	button.value = `${check ? `Deselect` : `Select`} All Autosaved Formations`;
	df_refreshFormationCheckboxes();
}

async function df_deleteFormationSaves() {
	df_disableAllFormationsButtonsAndCheckboxes(true);
	const deleteFormsSummary = document.getElementById(`deleteFormsSummary`);

	const deleteButton = document.getElementById(`formationsDeleteButton`);
	if (deleteButton) deleteButton.hidden = true;

	let c = `<span class="f fr w100 p5">Deleting Formation Saves:</span>`;
	deleteFormsSummary.innerHTML = c;
	let count = 0;
	let autosaveError = false;
	for (const [campaignId, patrons] of df_formsState ?? []) {
		for (const formations of patrons.values()) {
			for (const form of [...formations]) {
				if (!form || !form.markedForDelete) continue;
				count++;
				if (form.name === `___AUTO___SAVE___`) {
					if (autosaveError) continue;
					// Can't delete the autosaves atm. So have to rename them first.
					const result = await saveFormation(
						form.id,
						campaignId,
						`renameAutoSaveToDeleteIt`,
					);
					if (result[FR] === `Invalid or incomplete parameters`) {
						c += `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:175px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">- Failed to delete:</span><span class="f falc fjs ml2" style="flex-grow:1;margin-left:5px;flex-wrap:wrap">Your browser is modifying parameters required for the deletion of autosave formations. Ignoring further autosaves.</span></span>`;
						autosaveError = true;
						deleteFormsSummary.innerHTML = c;
						continue;
					}
				}
				const result = await deleteFormationSave(form.id);
				const extras = [];
				if (form.fav > 0 && form.fav < 4)
					extras.push(`Fav: ${[``, `Q`, `W`, `E`][form.fav]}`);
				if (form.hasFeats) extras.push(`Has Feats`);
				let successType = ``;
				if (result["success"] && result["okay"]) {
					successType = `Successfully deleted`;
					df_removeFormationFromStateAndUI(form);
				} else successType = `Failed to delete`;

				c += `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:175px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">- ${successType}:</span><span class="f falc fjs ml2" style="flex-grow:1;margin-left:5px;flex-wrap:wrap">${form.name} in ${form.campaignName}${extras.length > 0 ? ` (${extras.join(" / ")})` : ``}</span></span>`;
				deleteFormsSummary.innerHTML = c;
			}
		}
	}
	if (count === 0) {
		c += `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:175px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">- None</span></span>`;
		deleteFormsSummary.innerHTML = c;
	}
	await df_displayFormationSaves(
		document.getElementById(`deleteFormsWrapper`),
	);
	df_disableAllFormationsButtonsAndCheckboxes(false);
}

function df_removeFormationFromStateAndUI(form) {
	const campaignId = form.campaignId;
	const patronId = form.patronId;
	const index = df_formsState.get(campaignId).get(patronId).indexOf(form);
	if (campaignId < 1 || patronId < 0 || index < 0) return;

	// Delete the formation from the state.
	df_formsState.get(campaignId).get(patronId).splice(index, 1);

	// Delete the formation from the UI
	const formEle = document?.getElementById(`form_${form.id}`)?.parentElement;
	if (formEle && formEle.parentElement)
		formEle.parentElement.removeChild(formEle);

	// If there are no more formations for this campaign and patron
	if (df_formsState.get(campaignId).get(patronId).length === 0) {
		// Remove the patronId array from the campaignId map.
		df_formsState.get(campaignId).delete(patronId);

		// And remove the campaign/patron box from the UI
		const campPatEle = document?.getElementById(
			`formsCamp_${campaignId}_${patronId}`,
		)?.parentElement;
		if (campPatEle && campPatEle.parentElement)
			campPatEle.parentElement.removeChild(campPatEle);

		// Remove the campaignId map if it has no more patronId arrays.
		if (df_formsState.get(campaignId).size === 0)
			df_formsState.delete(campaignId);
	}
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
