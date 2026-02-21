vcf = 1.003; // prettier-ignore
const cf_LSKEY_savedFormations = `scSavedFormations`;
const cf_MAX_LS_SAVES = 100;
const cf_builderStateTemplate = Object.freeze({
	formationId: -1,
	campaignId: 0,
	baseCampaignId: 0,
	patronId: 0,

	name: `New Formation Save`,
	favorite: 0,

	formation: [],

	specializations: null,
	feats: null,
	familiars: null,

	usedHeroIds: null,
	patronDisabled: null,
	importMode: null,
	includeFeats: null,
	familiarMode: null,
	usedFamiliarIds: null,
	familiarPlacementGrid: null,
	exportMode: null,

	dirty: false,
});
const cf_UI = Object.freeze({
	IMPORT: 1 << 0,
	FORMATION: 1 << 1,
	FAMILIARS: 1 << 2,
	SPECS: 1 << 3,
	FEATS: 1 << 4,
	EXPORT: 1 << 5,
	EXPORT_STRING: 1 << 6,
	ALL: (1 << 7) - 1,
});
const cf_dragState = {
	type: null,
	id: -1,
	sourceType: null,
	sourceKey: null,
	dropHandled: false,
};
const cf_dragHandlers = {
	champion: null,
	familiar: null,
	feat: null,
};

const cf_blockedSVG =
	`<svg viewBox="4 4 16 16" xmlns="http://www.w3.org/2000/svg">` +
	`<rect width="16" height="16" x="4" y="4" fill="var(--Boulder)"></rect>` +
	`<path stroke="var(--CarminePink)" style="opacity:0.8" fill="none" d="M19 5 5 19M5 5l14 14">` +
	`</path></svg>`;
const cf_emptySVG =
	`<svg viewBox="0 0 10 10" fill="var(--Boulder)" xmlns="http://www.w3.org/2000/svg">` +
	`<rect width="10" height="10" x="0" y="0"></rect></svg>`;
const cf_specSVGs = {
	left: `<svg viewBox="0 0 5 10"><path d="M5 10 0 5l5-5z"/></svg>`,
	middle: `<svg viewBox="0 0 10 5"><path d="m0 5 5-5 5 5z"/></svg>`,
	right: `<svg viewBox="0 0 5 10"><path d="m0 0 5 5-5 5z"/></svg>`,
};
const cf_champGridSizes = {w: "50px", h: "47px", sh: "20px"};
const cf_famGridSizes = {w: "50px", h: "50px"};
let cf_data;
let cf_builderState;
let cf_activeFeatHeroId = -1;

// TODO:
//  [x] Make it so that swapping accounts deletes the contents of cf_importsSection.
//  [ ] Make it so that when importing a formation that contains any unowned champions feats or familiars
//      that they are dealt with somehow. Either ban the formation from being saved to the game (but allow
//      saving to local storage) or simply filter out anything unowned.

// Wishlist:
//   - Mark champions in the champion grid as unavailable based on patron availability.
//     - Will require pulling patron defines.

async function cf_pullFormationSaves() {
	if (isBadUserData()) return;
	disablePullButtons();
	const wrapper = document.getElementById(`createFormsWrapper`);
	cleanupExtras.add(`cf_importsSection`);
	const imports = document.getElementById(`cf_importsSection`);
	if (imports) imports.innerHTML = ``;
	setWrapperFormat(wrapper, 0);
	try {
		wrapper.innerHTML = `Waiting for user data...`;
		const details = (await getUserDetails())?.details;
		wrapper.innerHTML = `Waiting for formation saves data...`;
		const forms = await getFormationSaves();
		wrapper.innerHTML = `Waiting for definitions...`;
		const defs = await getDefinitions(
			`adventure_defines,hero_defines,familiar_defines,hero_feat_defines,upgrade_defines`,
		);
		cf_data = cf_buildMaps(details, forms, defs);
		if (!cf_data) {
			wrapper.innerHTML = cf_addElements([
				{
					text: `Pulled data is somehow invalid. Cannot continue without it.`,
					classes: `f fr w100 p5`,
				},
			]);
			codeEnablePullButtons();
			return;
		}
		cf_displayFormationCreator(wrapper);
		codeEnablePullButtons();
	} catch (error) {
		setWrapperFormat(wrapper, 0);
		handleError(wrapper, error);
	}
}

function cf_buildMaps(details, forms, defs) {
	const heroDetails = details?.heroes;
	const famDetails = details?.familiars;

	const allSaves = forms?.all_saves;
	const formObjs = forms?.formation_objects;

	const advDefs = defs?.adventure_defines;
	const heroDefs = defs?.hero_defines;
	const famDefs = defs?.familiar_defines;
	const featDefs = defs?.hero_feat_defines;
	const upgDefs = defs?.upgrade_defines;

	if (
		!Array.isArray(heroDetails) ||
		!Array.isArray(famDetails) ||
		!allSaves ||
		!formObjs ||
		!Array.isArray(advDefs) ||
		!Array.isArray(heroDefs) ||
		!Array.isArray(famDefs) ||
		!Array.isArray(featDefs) ||
		!Array.isArray(upgDefs)
	)
		return null;

	const data = cf_createEmptyCfData();

	cf_buildCampaigns(data, formObjs);
	cf_buildChampions(data, heroDefs, heroDetails, advDefs);
	cf_buildFeats(data, featDefs, heroDetails);
	cf_buildSpecialisations(data, upgDefs);
	cf_buildFamiliars(data, famDefs, famDetails);
	cf_buildFormationSaves(data, allSaves);

	cf_applyCampaignVisibility(data);

	return data;
}

function cf_displayFormationCreator(wrapper) {
	setWrapperFormat(wrapper, 0);

	cf_builderState = cf_newFormationForCampaign(1);

	let txt = ``;
	txt += cf_renderChampionGridSection();
	txt += cf_renderFamiliarsGridSection();
	txt += cf_renderExportsSection();

	wrapper.innerHTML = txt;

	cf_renderImportsSection();
	cf_renderFormationGrid();
	cf_renderFamiliarsPlacementGrids();
	cf_renderExportMode();
	cf_renderExportShareString();
}

// =======================
// ===== UI Builders =====
// =======================

function cf_renderImportsSection() {
	const container = document.getElementById(`cf_importsSection`);
	if (!container) return;

	let txt = ``;

	const importModeLabel = `<label for="cf_importModeSelect">Create From:</label>`;
	const importModeSelect =
		`<select id="cf_importModeSelect" oninput="cf_onImportModeChange(this.value)" style="width:100%">` +
		`<option value="-">-</option>` +
		`<option value="new">Empty</option>` +
		`<option value="game">Game</option>` +
		`<option value="local">Browser Storage</option>` +
		`<option value="string">Share String</option>` +
		`</select>`;

	txt += `<span class="cf_importsImporter">`;
	txt += cf_addElements([
		{text: importModeLabel, classes: `f fr falc fje`},
		{text: importModeSelect, classes: `f fr falc fjs`},
	]);
	txt += `</span>`;

	txt += `<span id="cf_importContainer" class="f fr falc fje w100">&nbsp;</span>`;

	txt += `<span class="f fc fals fjc posAbs cf_importPopup" id="cf_importConfPopup" style="display:none;">&nbsp;</span>`;
	txt +=
		`<span class="f fc fals fjc posAbs cf_importPopup" id="cf_importWarnPopup"` +
		` style="background-color:var(--ChineseBlack);border:1px solid ` +
		`var(--Carrot);z-index:2;display:none;">&nbsp;</span>`;

	container.innerHTML = txt;
}

function cf_renderImportMode() {
	const container = document.getElementById(`cf_importContainer`);
	if (!container) return;

	const type = cf_builderState.importMode ?? `-`;

	let txt = `<span class="f fc fale fje p5 w100" style="margin-top:10px;width:100%;">`;
	const dirty = cf_builderState.dirty;

	if (type === `new`) {
		const click =
			dirty ?
				`cf_renderImportConfirmationPopup(this, 'cf_importFormationFromEmpty()')`
			:	`cf_importFormationFromEmpty()`;
		txt +=
			`<input id="cf_importEmptyButton" type="button" style="width:72%;margin-top:10px;" ` +
			`value="Create a Fresh Formation" onclick="${click}">`;
	} else if (type === `game`) {
		const click =
			dirty ?
				`cf_renderImportConfirmationPopup(this, 'cf_importFormationFromGame()')`
			:	`cf_importFormationFromGame()`;
		txt += cf_renderImportGameSelector();
		txt +=
			`<input id="cf_importGameButton" type="button" style="width:72%;margin-top:10px;" ` +
			`value="Modify Existing Game Formation" onclick="${click}">`;
	} else if (type === `local`) {
		const click =
			dirty ?
				`cf_renderImportConfirmationPopup(this, 'cf_importFormationFromBrowser()')`
			:	`cf_importFormationFromBrowser()`;
		txt += cf_renderImportLocalSelector();
		txt +=
			`<input id="cf_importLocalButton" type="button" style="width:72%;margin-top:10px;" ` +
			`value="Create from Browser Formation" onclick="${click}">`;
	} else if (type === `string`) {
		const click =
			dirty ?
				`cf_renderImportConfirmationPopup(this, 'cf_importFormationFromString()')`
			:	`cf_importFormationFromString()`;
		txt += `<textarea id="cf_importShareString" rows="8" style="width:100%;resize:none"></textarea>`;
		txt +=
			`<input id="cf_importStringButton" type="button" style="width:72%;margin-top:10px;" ` +
			`value="Create from Share String" onclick="${click}">`;
	} else txt += `&nbsp;`;

	txt += `</span>`;

	container.innerHTML = txt;
}

function cf_renderImportGameSelector() {
	const byCampaign = cf_data.formationSaves.byActualCampaignId;
	const campaigns = cf_data.campaigns.byActualId;

	const campaignIds = [...byCampaign.keys()]
		.filter((id) => campaigns.get(id)?.visible)
		.sort((a, b) => {
			const ca = campaigns.get(a);
			const cb = campaigns.get(b);
			if (ca.isEvent !== cb.isEvent) return ca.isEvent - cb.isEvent;
			if (ca.baseId !== cb.baseId) return ca.baseId - cb.baseId;
			return (ca.patronId ?? 0) - (cb.patronId ?? 0);
		});

	let txt = `<select id="cf_importGameSelect" style="width:100%">`;
	txt += `<option value="-">-</option>`;

	let currentGroup = null;

	for (const campaignId of campaignIds) {
		const campaign = campaigns.get(campaignId);
		const forms = byCampaign.get(campaignId);
		if (!campaign.visible) continue;

		const groupLabel = campaign.name;
		if (groupLabel !== currentGroup) {
			if (currentGroup !== null) txt += `</optgroup>`;
			txt += `<optgroup label="${cf_escapeHtml(groupLabel)}">`;
			currentGroup = groupLabel;
		}

		for (const form of forms) {
			const formCamp = campaigns.get(form.campaignId);
			let patronSuffix = ``;
			if (formCamp.patronId ?? 0 > 0) {
				const patronName = c_patronById.get(formCamp.patronId);
				if (patronName)
					patronSuffix = ` (${cf_escapeHtml(patronName)})`;
			}
			txt +=
				`<option value="${form.id}">` +
				`${cf_escapeHtml(form.name)}${patronSuffix}` +
				`</option>`;
		}
	}

	if (currentGroup !== null) txt += `</optgroup>`;

	txt += `</select>`;

	return txt;
}

function cf_renderImportLocalSelector() {
	const saves = cf_ls_getSavedFormations();
	if (!Array.isArray(saves) || saves.length === 0)
		return `<select style="width:100%"><option>No saved formations</option></select>`;

	const campaigns = cf_data.campaigns.byActualId;

	const sorted = saves
		.map((save, index) => ({save, index}))
		.sort((a, b) => {
			const ca = campaigns.get(a.save.campaignId);
			const cb = campaigns.get(b.save.campaignId);
			if (ca.isEvent !== cb.isEvent) return ca.isEvent - cb.isEvent;
			if (ca.baseId !== cb.baseId) return ca.baseId - cb.baseId;
			return ca.patronId - cb.patronId;
		});

	let txt = `<select id="cf_importLocalSelect" style="width:100%">`;
	txt += `<option value="-">-</option>`;

	let currentGroup = null;

	for (const {save, index} of sorted) {
		const campaign = campaigns.get(save.campaignId);
		if (!campaign) continue;

		const groupLabel = campaign.name;
		if (groupLabel !== currentGroup) {
			if (currentGroup !== null) txt += `</optgroup>`;

			txt += `<optgroup label="${cf_escapeHtml(groupLabel)}">`;
			currentGroup = groupLabel;
		}
		let patronSuffix = ``;
		if (campaign.patronId ?? 0 > 0) {
			const patronName = c_patronById.get(campaign.patronId);
			if (patronName) patronSuffix = ` (${cf_escapeHtml(patronName)})`;
		}
		txt +=
			`<option value="${index}">` +
			`${cf_escapeHtml(save.name)}${patronSuffix}` +
			`</option>`;
	}

	if (currentGroup !== null) txt += `</optgroup>`;

	txt += `</select>`;

	return txt;
}

function cf_renderImportConfirmationPopup(importButtonEle, onclick) {
	if (!onclick || onclick === ``) return;

	const container = document.getElementById(`cf_importConfPopup`);
	if (!importButtonEle || !container) return;

	let txt = ``;

	onclick += `;cf_closeImportConfirmationPopup();`;

	txt += `<span class="f fr falc fjs p5">Changes:</span>`;
	txt += `<span class="f fr falc fjs p5">The current build has unsaved changes. Do you really want to overwrite them?</span>`;

	txt += `<span style="display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%;">`;
	txt += `<span class="f falc fjc w100"><input type="button" value="Yes" style="width:50%;" onclick="${onclick}"></span>`;
	txt += `<span class="f falc fjc w100"><input type="button" value="No" style="width:50%;" onclick="cf_closeImportConfirmationPopup()"></span>`;
	txt += `</span>`;

	container.innerHTML = txt;
	container.style.display = ``;

	const contRect = container.getBoundingClientRect();
	const impoRect = importButtonEle.getBoundingClientRect();

	let left = impoRect.left + impoRect.width / 2 - contRect.width / 2;
	let top = impoRect.top + impoRect.height / 2 - contRect.height / 2;

	const margin = 20;
	const maxLeft = window.innerWidth - contRect.width - margin;
	const maxTop = window.innerHeight - contRect.height - margin;

	container.style.left = Math.max(margin, Math.min(left, maxLeft)) + `px`;
	container.style.top = Math.max(margin, Math.min(top, maxTop)) + `px`;

	setTimeout(() => {
		document.removeEventListener(
			"mousedown",
			cf_handleImportPopupOutsideClick,
		);
		document.addEventListener(
			"mousedown",
			cf_handleImportPopupOutsideClick,
		);
	}, 0);
}

function cf_renderImportWarningPopup(warnings) {
	const container = document.getElementById(`cf_importWarnPopup`);
	if (!container) return;

	if (
		warnings.champions.length === 0 &&
		warnings.feats.length === 0 &&
		warnings.familiars.length === 0
	)
		return;

	let txt = ``;

	txt += `<span class="f fr falc fjs"><h3>Warning:</h3></span>`;
	txt += `<span class="f fc fals fjc p5">`;
	txt += `<span class="p5 w100">Some items were removed from the imported<br>formation because you do not own them:</span>`;
	txt += `<ul style="margin:10px;">`;
	if (warnings.champions.length)
		txt += `<li>Champions: ${warnings.champions.length}</li>`;
	if (warnings.feats.length)
		txt += `<li>Feats: ${warnings.feats.length}</li>`;
	if (warnings.familiars.length)
		txt += `<li>Familiars: ${warnings.familiars.length}</li>`;
	txt += `</ul>`;
	txt += `</span>`;
	txt += `<span class="f falc fjc w100"><input type="button" value="Okie" style="width:40%;height:40px;" onclick="cf_closeImportWarningPopup()"></span>`;

	container.innerHTML = txt;
	container.style.display = ``;

	const contRect = container.getBoundingClientRect();

	let left = window.innerWidth / 2 - contRect.width / 2;
	let top = window.innerHeight / 2 - contRect.height / 2;

	const margin = 20;
	const maxLeft = window.innerWidth - contRect.width - margin;
	const maxTop = window.innerHeight - contRect.height - margin;

	container.style.left = Math.max(margin, Math.min(left, maxLeft)) + `px`;
	container.style.top = Math.max(margin, Math.min(top, maxTop)) + `px`;

	setTimeout(() => {
		document.removeEventListener(
			"mousedown",
			cf_handleImportWarningPopupOutsideClick,
		);
		document.addEventListener(
			"mousedown",
			cf_handleImportWarningPopupOutsideClick,
		);
	}, 0);
}

function cf_renderChampionGridSection() {
	let txt = `<span class="f fr falst fjc w100" id="cf_championsSection">`;

	txt += cf_addElements([
		{text: cf_renderChampionsGrid(), classes: `f fr fals fjc`},
		{
			text: cf_renderCampaignSection(),
			classes: `f fc falc fjs fgr`,
			styles: `padding-left:10px;`,
		},
	]);

	txt += `</span>`;
	return txt;
}

function cf_renderChampionsGrid() {
	let txt = ``;

	const seats = [...cf_data.champions.bySeat.keys()];

	const boxClass = `class="f fc falc fjs cf_champBox"`;
	const nameClass = `class="f fc flac fjc w100 cf_champBoxName"`;

	for (const seat of seats) {
		txt += `<span class="f fc fals fjc">`;

		// Header:
		txt +=
			`<span ${boxClass} style="width:${cf_champGridSizes.w};height:${cf_champGridSizes.sh};"` +
			` id="cf_champBox_seat${seat}">`;
		txt += `<span ${nameClass} style="height:100%;background-color:var(--Black);font-size:0.7em;">Seat ${seat}</span>`;
		txt += `</span>`;

		// Champions:
		for (const champ of cf_data.champions.bySeat.get(seat)) {
			const style =
				`style="background-image:url(images/${champ.owned ? `portraits` : `greyscale`}/${champ.id}.png);` +
				`width:${cf_champGridSizes.w};height:${cf_champGridSizes.h};${champ.owned ? `` : `cursor:default;opacity:0.55;`}"`;
			const drag =
				champ.owned ?
					` draggable="true" ondragstart="cf_onDragStart(event, 'champion', ${champ.id}, 'championGrid', -1)"`
				:	``;
			txt += `<span id="cf_champBox_${champ.id}" ${boxClass} data-id="${champ.id}" ${style}${drag}>`;
			txt += `<span ${nameClass}>${cf_escapeHtml(champ.name)}</span>`;
			txt += `</span>`;
		}
		txt += `</span>`;
	}

	return txt;
}

function cf_renderCampaignSection() {
	let txt = `<span class="f fc fgr w100">`;

	const nameLabel = `<label for="cf_nameInput">Name:</label>`;
	const campaignLabel = `<label for="cf_campaignSelect">Formation:</label>`;
	const patronLabel = `<label for="cf_patronSelect">Patron:</label>`;

	const fEnd = `f fr falc fje`;
	const fStart = `f fr falc fjs`;

	txt += `<span class="cf_campaignGrid">`;
	txt += cf_addElements([
		{text: nameLabel, classes: fEnd},
		{text: cf_renderNameInput(), classes: fStart},
		{text: campaignLabel, classes: fEnd},
		{text: cf_renderCampaignSelector(), classes: fStart},
		{text: patronLabel, classes: fEnd},
		{text: cf_renderPatronSelector(), classes: fStart},
		{
			text: `To place a champion - click and drag from the grid.`,
			classes: `f fr falc fjc`,
			styles: `font-size:0.9em;`,
			gridCol: `span 2`,
		},
	]);
	txt += `</span>`;

	txt += `<span class="f falc fjc fgr posRel" id="cf_formGridContainer">&nbsp;</span>`;
	txt += `<span class="f falc fjs" style="flex-direction:column-reverse;height:30%">&nbsp;</span>`;

	txt += `</span>`;
	return txt;
}

function cf_renderNameInput() {
	return (
		`<input type="input" id="cf_nameInput" style="background-color:var(--ChineseBlack);` +
		`color:currentColor;border:1px solid var(--Boulder);width:100%;" ` +
		`value="New Formation Save" oninput="cf_onNameChange(this)">`
	);
}

function cf_renderCampaignSelector() {
	let txt = `<select class="w100" id="cf_campaignSelect" oninput="cf_onCampaignChange(this.value)">`;

	txt += `<optgroup label="Campaigns">`;
	for (const id of cf_data.campaigns.campaignIds) {
		const campaign = cf_data.campaigns.byActualId.get(id);
		if (!campaign) continue;
		txt += `<option value="${id}">${cf_escapeHtml(campaign.name)}</option>`;
	}
	txt += `</optgroup>`;
	txt += `<optgroup label="Events">`;
	for (const id of cf_data.campaigns.eventIds) {
		const event = cf_data.campaigns.byActualId.get(id);
		if (!event.visible) continue;

		txt += `<option value="${id}">${cf_escapeHtml(event.name)}</option>`;
	}
	txt += `</optgroup>`;

	txt += `</select>`;

	return txt;
}

function cf_renderPatronSelector() {
	let txt = `<select class="w100" id="cf_patronSelect" oninput="cf_onPatronChange(this.value)">`;

	txt += `<option value="0">None</option>`;
	const patronIds = [...c_patronById.keys()];
	patronIds.sort((a, b) => a - b);
	for (const patronId of patronIds)
		txt += `<option value="${patronId}">${cf_escapeHtml(c_patronById.get(patronId))}</option>`;

	txt += `</select>`;
	return txt;
}

function cf_renderFormationGrid() {
	const container = document.getElementById("cf_formGridContainer");

	const campaign = cf_data.campaigns.byActualId.get(
		cf_builderState.campaignId,
	);
	if (!campaign) return;

	const slots = campaign.formation.slots;

	const radius = 30;
	const coordMult = 4;
	var {width, height, minX, minY} = cf_calcFormGridCoords(
		slots,
		coordMult,
		radius,
	);

	let txt = cf_renderFavouriteSelector();
	txt += cf_renderIncludeFeatsCheckbox();

	txt += `<span id="cf_formationGrid" class="posRel" style="width:${width}px;height:${height}px">`;

	for (const slot of slots) {
		const heroId = cf_builderState.formation?.[slot.index] ?? -1;

		const champion = heroId > 0 ? cf_data.champions.byId.get(heroId) : null;

		const left = radius + (slot.x - minX) * coordMult;
		const top = radius + (slot.y - minY) * coordMult;

		const blocked = campaign.formation.blockedSlots.has(slot.index);
		const img =
			blocked ? cf_blockedSVG
			: champion ?
				`<img src="images/portraits/${heroId}.png" alt="${champion.name}">`
			:	cf_emptySVG;

		const drag =
			`draggable="${heroId > 0}" ` +
			`ondragstart="cf_onDragStart(event,'champion',${heroId},'formationSlot',${slot.index})" ` +
			`ondragover="cf_onDragOver(event)" ` +
			`ondrop="cf_onDrop(event, 'formationSlot', ${slot.index})" ` +
			`ondragend="cf_onDragEnd(event)" `;
		txt +=
			`<span ` +
			`class="cf_slotCircle" ` +
			`data-slot="${slot.index}" ` +
			`style="left:${left}px;top:${top}px;${blocked ? `cursor:unset;` : ``}" ` +
			drag +
			`>${img || `&nbsp;`}</span>`;
		if (!blocked) {
			txt +=
				`<span id="cf_slotSpecInd${slot.index}" class="cf_slotSpec" data-slot="${slot.index}" ` +
				`style="left:${left}px;bottom:${height - top}px;" ` +
				drag +
				`onclick="cf_renderSpecialisationChoicePopup(${slot.index})">` +
				cf_renderSpecialisationIndicators(slot.index) +
				`</span>`;
			if (cf_builderState.includeFeats)
				txt +=
					`<span id="cf_slotFeatInd${slot.index}" class="cf_slotFeat" data-slot="${slot.index}" ` +
					`style = "left:${left}px;bottom:${height - top}px;" ` +
					drag +
					`onclick="cf_renderFeatChoicePopup(${slot.index})">` +
					cf_renderFeatIndicators(slot.index) +
					`</span>`;
		}
	}
	txt += `<span class="f fc fals fjc cf_specChoicePopup" id="cf_specChoicePopup" style="display:none;">&nbsp;</span>`;
	txt += `<span class="f fc fals fjc cf_featChoicePopup" id="cf_featChoicePopup" style="display:none;">&nbsp;</span>`;
	txt += `</span>`;

	container.innerHTML = txt;
}

function cf_renderFavouriteSelector() {
	const favourite = cf_builderState.favorite ?? 0;
	const starColour = favourite === 0 ? `Wolfram` : `Saffron`;
	const highlight = favourite === 0 ? `White` : `Flavescent`;
	const value = favourite > 0 ? favourite : ``;
	let txt =
		`<svg id="cf_favouriteStar" width="50px" height="40px" viewBox="0 0 24 24" ` +
		`class="cf_favouriteStar" xmlns="http://www.w3.org/2000/svg"` +
		` onclick="cf_renderFavouriteChoicePopup()"` +
		` onmouseenter="this.children[0].style.fill='var(--${highlight})'"` +
		` onmouseleave="this.children[0].style.fill='var(--${starColour})'">` +
		`<path fill="var(--${starColour})" stroke="none" d="M9.153 5.408C10.42 3.136 11.053 2 12 2s1.58 ` +
		`1.136 2.847 3.408l.328.588c.36.646.54.969.82 1.182s.63.292 1.33.45l.636.144c2.46.557 ` +
		`3.689.835 3.982 1.776.292.94-.546 1.921-2.223 3.882l-.434.507c-.476.557-.715.836-.822 ` +
		`1.18-.107.345-.071.717.001 1.46l.066.677c.253 2.617.38 3.925-.386 4.506s-1.918.051-` +
		`4.22-1.009l-.597-.274c-.654-.302-.981-.452-1.328-.452s-.674.15-1.328.452l-.596.274c-2.303 ` +
		`1.06-3.455 1.59-4.22 1.01-.767-.582-.64-1.89-.387-4.507l.066-.676c.072-.744.108-1.116 ` +
		`0-1.46-.106-.345-.345-.624-.821-1.18l-.434-.508c-1.677-1.96-2.515-2.941-2.223-3.882S3.58 ` +
		`8.328 6.04 7.772l.636-.144c.699-.158 1.048-.237 1.329-.45s.46-.536.82-1.182z" ` +
		`style="transition:0.15s"></path>` +
		`<text fill="var(--Black)" x="50%" y="55%" dominant-baseline="central" text-anchor="middle">${value}</text></svg>`;
	txt += `<span class="f fc fals fjc cf_favouriteChoicePopup" id="cf_favouriteChoicePopup" style="display:none;">&nbsp;</span>`;
	return txt;
}

function cf_renderIncludeFeatsCheckbox() {
	let txt = `<span class="cf_includeFeatsContainer">`;

	const checked = cf_builderState.includeFeats ? ` checked` : ``;

	txt += `<label for="cf_featsIncludeCheckbox">Include Feats:</label>`;
	txt += `<input type="checkbox" id="cf_featsIncludeCheckbox" onclick="cf_onIncludeFeatsChange(this.checked)"${checked}>`;

	txt += `</span>`;
	return txt;
}

function cf_renderSpecialisationIndicators(slotIndex) {
	const heroId = cf_builderState.formation?.[slotIndex] ?? -1;
	if (heroId <= 0) return "";

	const specSets = cf_data.specialisations.byChampionId.get(heroId);
	if (!specSets) return "";

	const selected = cf_builderState.specializations.get(heroId) ?? [];

	let txt = "";

	for (let i = 0; i < specSets.length; i++) {
		const validOptions = cf_getValidSpecOptions(heroId, i);

		const selectedUpgradeId = selected.find((id) =>
			validOptions.some((o) => o.upgradeId === id),
		);

		let display = "?";

		if (selectedUpgradeId) {
			const count = validOptions.length;
			const index = validOptions.findIndex(
				(o) => o.upgradeId === selectedUpgradeId,
			);
			if (count <= 3)
				display =
					index === 0 ? cf_specSVGs.left
					: index === count - 1 ? cf_specSVGs.right
					: cf_specSVGs.middle;
			else display = index + 1;
		}

		txt += `<span class="cf_slotSpecChoice">${display}</span>`;
	}

	return txt;
}

function cf_renderSpecialisationChoicePopup(slotIndex) {
	const formation = cf_builderState.formation;
	const selectedSpecs = cf_builderState.specializations;
	const allSpecs = cf_data.specialisations.byChampionId;

	const heroId = formation[slotIndex];
	const name = cf_data.champions.byId.get(heroId)?.name;
	const specSets = allSpecs.get(heroId);
	if (heroId <= 0 || !name || !specSets || specSets.length === 0) return;

	const slotSpecIndEle = document.getElementById(
		`cf_slotSpecInd${slotIndex}`,
	);
	const container = document.getElementById(`cf_specChoicePopup`);
	if (!slotSpecIndEle || !container) return;

	const selected = new Set(selectedSpecs.get(heroId) ?? []);
	const selectedStyle = ` style="color:var(--Saffron);"`;

	let txt = ``;

	txt += `<span class="f fr falc fjs p5">${name}'${!name.endsWith("s") ? `s` : ``} Specialisations:</span>`;
	for (let i = 0; i < specSets.length; i++) {
		const validOptions = cf_getValidSpecOptions(heroId, i);
		if (validOptions.length === 0) {
			txt += `<span class="f fr fals fjc" style="height:80px;padding:5px;width:100%;">`;
			txt +=
				`<span class="f fr falc fjc" style="cursor:default;margin:5px;background-color:var(--ChineseBlack);` +
				`color:var(--Boulder);border:1px solid var(--Boulder);border-radius:5px;width:100%;height:60px;">`;
			txt += `This set requires a choice from a previous set.`;
			txt += `</span>`;
			txt += `</span>`;
			continue;
		}

		const noneSelected =
			validOptions.map((e) => e.upgradeId).filter((e) => selected.has(e))
				.length === 0;

		txt += `<span class="f fr fals fjs" style="height:80px;padding:5px;">`;

		txt +=
			`<input type="button"${noneSelected ? selectedStyle : ``} ` +
			`value="None" onclick="cf_setSpecialisationChoice(${heroId},${i},-1)">`;
		txt += `<span style="width:10px;height:100%;margin:5px;"></span>`;

		for (const option of validOptions) {
			const isSelected = selected.has(option.upgradeId);
			txt +=
				`<input type="button" data-set="${i}" data-id="${option.upgradeId}" value="${cf_escapeHtml(option.name)}" ` +
				(isSelected ? selectedStyle : ``) +
				`onclick="cf_setSpecialisationChoice(${heroId},${i},${option.upgradeId})">`;
		}

		txt += `</span>`;
	}

	container.innerHTML = txt;
	container.style.display = ``;

	const contRect = container.getBoundingClientRect();
	const specRect = slotSpecIndEle.getBoundingClientRect();

	let left = specRect.left + specRect.width / 2 - contRect.width / 2;
	let top = specRect.bottom + 4;

	const margin = 20;
	const maxLeft = window.innerWidth - contRect.width - margin;
	const maxTop = window.innerHeight - contRect.height - margin;

	container.style.left = Math.max(margin, Math.min(left, maxLeft)) + `px`;
	container.style.top = Math.max(margin, Math.min(top, maxTop)) + `px`;

	setTimeout(() => {
		document.removeEventListener(
			"mousedown",
			cf_handleSpecPopupOutsideClick,
		);
		document.addEventListener("mousedown", cf_handleSpecPopupOutsideClick);
	}, 0);
}

function cf_renderFavouriteChoicePopup() {
	const container = document.getElementById(`cf_favouriteChoicePopup`);
	const favStarEle = document.getElementById(`cf_favouriteStar`);
	if (!container || !favStarEle) return;

	const selected = cf_builderState.favorite;
	const selectedStyle = ` style="color:var(--Saffron);"`;

	let txt = ``;

	txt += `<span class="f fr falc fjs p5">Favourite:</span>`;
	txt += `<span class="f fr fals fjs" style="height:60px;padding:5px;">`;
	txt +=
		`<input type="button"${selected === 0 ? selectedStyle : ``} ` +
		`value="None" onclick="cf_setFavouriteChoice(0)">`;
	txt += `<span style="width:10px;height:100%;margin:5px;"></span>`;

	for (let i = 1; i <= 3; i++)
		txt +=
			`<input type="button" value="${i} (${
				i === 1 ? `Q`
				: i === 2 ? `W`
				: `E`
			})" ` +
			`${selected === i ? selectedStyle : ``} onclick="cf_setFavouriteChoice(${i})">`;

	txt += `</span>`;

	container.innerHTML = txt;
	container.style.display = ``;

	const contRect = container.getBoundingClientRect();
	const favRect = favStarEle.getBoundingClientRect();

	let left = favRect.left + favRect.width / 2 - contRect.width / 2;
	let top = favRect.bottom + 4;

	const margin = 20;
	const maxLeft = window.innerWidth - contRect.width - margin;
	const maxTop = window.innerHeight - contRect.height - margin;

	container.style.left = Math.max(margin, Math.min(left, maxLeft)) + `px`;
	container.style.top = Math.max(margin, Math.min(top, maxTop)) + `px`;

	setTimeout(() => {
		document.removeEventListener(
			"mousedown",
			cf_handleFavouritePopupOutsideClick,
		);
		document.addEventListener(
			"mousedown",
			cf_handleFavouritePopupOutsideClick,
		);
	}, 0);
}

function cf_renderFeatIndicators(slotIndex) {
	const heroId = cf_builderState.formation?.[slotIndex] ?? -1;
	if (heroId <= 0) return ``;

	const feats = cf_data.feats.byChampionId.get(heroId);
	if (!feats) return ``;

	const maxSlots = cf_data.champions.byId.get(heroId)?.featSlots ?? 0;
	const selected = cf_builderState.feats.get(heroId) ?? [];
	if (maxSlots === 0) return ``;

	let txt =
		`<span class="cf_slotFeatChoice" style="grid-column:span 2;grid-row:span 2;">` +
		`<img src="images/feats/6073.png" alt="Choose Feats" style="width:16px">` +
		`</span>`;

	for (let i = 0; i < maxSlots; i++) {
		const stroke =
			selected[i] != null ?
				``
			:	` stroke-width="3px" stroke="var(--White)"`;
		const fill = ` fill="${selected[i] != null ? `var(--White)` : `none`}"`;
		let display = `<svg${fill} viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path${stroke} d="M0 0h20v20H0z"/></svg>`;
		txt += `<span class="cf_slotFeatChoice">${display}</span>`;
	}

	return txt;
}

function cf_renderFeatChoicePopup(slotIndex) {
	const heroId = cf_builderState.formation[slotIndex];
	const champion = cf_data.champions.byId.get(heroId);
	const feats = cf_data.feats.byChampionId.get(heroId);
	const maxSlots = champion?.featSlots ?? 0;
	if (
		heroId <= 0 ||
		!champion ||
		!feats ||
		feats.length === 0 ||
		maxSlots === 0
	)
		return;

	cf_activeFeatHeroId = heroId;

	const slotFeatIndEle = document.getElementById(
		`cf_slotFeatInd${slotIndex}`,
	);
	const container = document.getElementById(`cf_featChoicePopup`);
	if (!slotFeatIndEle || !container) return;

	const name = champion.name;
	const selected = cf_builderState.feats.get(heroId) ?? [];

	let txt = ``;

	txt += `<span class="f fr falc fjs p5">${name}'${!name.endsWith("s") ? `s` : ``} Feats:</span>`;

	txt += `<span class="f fr fals fjc p5">`;

	// Feat Slots
	txt += `<span class="f fc fals fjs p5">`;
	txt += `<span style="padding-bottom:5px;">Equipped:</span>`;

	for (let i = 0; i < maxSlots; i++) {
		if (selected[i] != null) {
			// Selected: Show feat icon and name.
			const feat = cf_data.feats.byId.get(selected[i]);
			const border = cf_getRarityColour(feat.rarity);
			const drag =
				`draggable="true" ` +
				`ondragstart="cf_onDragStart(event, 'feat', ${feat.id}, 'featEquipped', ${i})" ` +
				`ondragover="cf_onDragOver(event)" ` +
				`ondrop="cf_onDrop(event, 'featSlot', ${i})" ` +
				`ondragend="cf_onDragEnd(event)"`;
			txt +=
				`<span ${drag}class="cf_featChoicePopupSlot" style="border:1px solid var(--${border})">` +
				`<span class="f fr falc fjc"><img src="images/feats/${feat.graphicId}.png" alt="${feat.name} Icon"></span>` +
				`<span class="f fr falc fjs" style="margin-right:4px;">${feat.name}</span>` +
				`</span>`;
		} else {
			// Not Selected: Show blank feat slot.
			const drag = `ondragover="cf_onDragOver(event)" ondrop="cf_onDrop(event, 'featSlot', ${i})"`;
			txt +=
				`<span ${drag}class="cf_featChoicePopupSlot">` +
				`<span>&nbsp;</span>` +
				`<span class="f fr falc fjs" style="color:var(--Boulder);">Empty</span>` +
				`</span>`;
		}
	}
	txt += `<span style="width:100%;padding-top:5px;text-align:center;font-size:0.9em;">Drag and drop to equip.</span>`;
	txt += `</span>`;

	// Available Feats
	txt += `<span class="f fc fals fjs p5">`;
	txt += `<span style="padding-bottom:5px;">Available:</span>`;
	txt += `<span style="display:grid;grid-template-columns:1fr 1fr;column-gap:10px;">`;
	for (const feat of feats) {
		const isSelected = selected.includes(feat.id);
		const border = isSelected ? `Boulder` : cf_getRarityColour(feat.rarity);
		const drag =
			isSelected ? `` : (
				`draggable="true" ` +
				`ondragstart="cf_onDragStart(event, 'feat', ${feat.id}, 'featAvailable', -1)"`
			);

		txt +=
			`<span data-id="${feat.id}" ${drag}class="cf_featChoicePopupSlot" ` +
			`style="border:1px solid var(--${border});${isSelected ? `opacity:0.65;cursor:default;` : ``}">` +
			`<span class="f fr falc fjc"><img src="images/feats/${feat.graphicId}.png" alt="${feat.name} Icon"></span>` +
			`<span class="f fr falc fjs" style="margin-right:4px;">${feat.name}</span>` +
			`</span>`;
	}
	txt += `</span></span>`;

	txt += `</span>`;

	container.innerHTML = txt;
	container.style.display = ``;

	const contRect = container.getBoundingClientRect();
	const featRect = slotFeatIndEle.getBoundingClientRect();

	let left = featRect.left + featRect.width / 2 - contRect.width / 2;
	let top = featRect.bottom + 4;

	const margin = 20;
	const maxLeft = window.innerWidth - contRect.width - margin;
	const maxTop = window.innerHeight - contRect.height - margin;

	container.style.left = Math.max(margin, Math.min(left, maxLeft)) + `px`;
	container.style.top = Math.max(margin, Math.min(top, maxTop)) + `px`;

	setTimeout(() => {
		document.removeEventListener(
			"mousedown",
			cf_handleFeatPopupOutsideClick,
		);
		document.addEventListener("mousedown", cf_handleFeatPopupOutsideClick);
	}, 0);
}

function cf_renderFamiliarModeSelector() {
	let txt = `<select class="w100" id="cf_familiarModeSelect" oninput="cf_onFamiliarModeChange(this.value)">`;

	txt += `<option value="rng">Random</option>`;
	txt += `<option value="seq">Sequential</option>`;

	txt += `</select>`;
	return txt;
}

function cf_renderFamiliarsGridSection() {
	if (cf_data.familiars.byId.size === 0) return ``;

	let txt = `<span class="f fr falst fjc w100" style="margin-top:10px;" id="cf_familiarsSection">`;

	txt += cf_addElements([
		{
			text: cf_renderFamiliarsGrid(),
			classes: `f fr fals fjc`,
			styles: `max-width:550px`,
		},
		{
			text: cf_renderFamiliarsControlSections(),
			classes: `f fc falc fjs fgr`,
			styles: `padding-left:10px;`,
		},
	]);

	txt += `</span>`;
	return txt;
}

function cf_renderFamiliarsGrid() {
	const familiarIds = [...cf_data.familiars.byId.keys()];
	const boxClass = `class="f fc falc fjs cf_famBox"`;

	let txt = `<span class="f fr fals fjs" style="flex-wrap:wrap;">`;
	for (const familiarId of familiarIds) {
		const familiar = cf_data.familiars.byId.get(familiarId);

		const style =
			`style="background-image:url(images/familiars/${familiar.id}.png);` +
			`width:${cf_famGridSizes.w};height:${cf_famGridSizes.h};"`;
		const drag = ` draggable="${familiar.id > 0}" ondragstart="cf_onDragStart(event, 'familiar', ${familiar.id}, 'familiarGrid', -1)"`;

		txt += `<span id="cf_famBox_${familiar.id}" ${boxClass} data-id="${familiar.id}" ${style}${drag}>&nbsp;</span>`;
	}
	txt += `</span>`;

	return txt;
}

function cf_renderFamiliarsControlSections() {
	let txt = `<span class="f fc fgr w100">`;

	const familiarModeLabel = `<label for="cf_familiarModeSelect">Familiar Placement Mode:</label>`;
	const familiarGridLabel = `<label for="cf_familiarGridSelect">Familiar Grid:</label>`;

	const fEnd = `f fr falc fje`;
	const fStart = `f fr falc fjs`;

	txt += `<span class="cf_familiarControlGrid">`;
	txt += cf_addElements([
		{text: familiarModeLabel, classes: fEnd},
		{text: cf_renderFamiliarModeSelector(), classes: fStart},
		{text: familiarGridLabel, classes: fEnd},
		{text: cf_renderFamiliarPlacementGridsSelector(), classes: fStart},
		{
			text: `To place a familiar - click on an available slot or click and drag from the grid.`,
			classes: `f fr falc fjc`,
			styles: `font-size:0.9em;`,
			gridCol: `span 2`,
		},
	]);
	txt += `</span>`;

	txt += `<span class="f falc fjc fgr posRel" id="cf_familiarGridContainer">&nbsp;</span>`;
	txt += `<span class="f falc fjs" style="flex-direction:column-reverse;height:30%">&nbsp;</span>`;

	txt += `</span>`;

	return txt;
}

function cf_renderFamiliarPlacementGridsSelector() {
	let txt = `<select class="w100" id="cf_familiarsPlacementSelect" oninput="cf_onFamiliarsPlacementGridsChange(this.value)">`;

	txt += `<option value="field">Field</option>`;
	txt += `<option value="seats">Seats</option>`;
	txt += `<option value="ults">Ultimates</option>`;
	txt += `<option value="pots">Potions</option>`;
	txt += `<option value="misc">Miscellaneous</option>`;

	txt += `</select>`;
	return txt;
}

function cf_renderFamiliarsPlacementGrids() {
	const container = document.getElementById("cf_familiarGridContainer");

	const type = cf_builderState.familiarPlacementGrid ?? `field`;

	let txt = ``;

	if (type === `field`) txt = cf_renderFamiliarsFieldGrid();
	else if (type === `seats`) txt = cf_renderFamiliarsBenchGrid();
	else if (type === `ults`) txt = cf_renderFamiliarsUltimatesGrid();
	else if (type === `pots`) txt = cf_renderFamiliarsPotionsGrid();
	else if (type === `misc`) txt = cf_renderFamiliarsMiscGrid();
	else return;

	container.innerHTML = txt;
}

function cf_renderFamiliarsFieldGrid() {
	const cols = `grid-template-columns:repeat(3, 50px);`;
	const rows = `grid-template-rows:30px repeat(4, 50px);`;
	const fieldArr = [
		{c: 2, r: 2},
		{c: 1, r: 3},
		{c: 1, r: 4},
		{c: 2, r: 5},
		{c: 3, r: 3},
		{c: 3, r: 4},
	];
	const famsInClicks = cf_builderState?.familiars?.Clicks ?? [];

	let txt = `<span class="posRel" style="display:grid;${cols}${rows}gap:10px;">`;
	for (let i = 0; i < fieldArr.length; i++) {
		const famId = famsInClicks[i] ?? -1;
		const img = cf_getFamiliarImageAndStyleById(famId);
		txt +=
			`<span data-type="Clicks" data-slot="${i}" class="cf_famPlaceSpot" style="` +
			`grid-column:${fieldArr[i].c};` +
			`grid-row:${fieldArr[i].r};` +
			`${img.style}" ` +
			`onclick="cf_onFamiliarSlotClick('Clicks', ${i})" ` +
			`draggable="${famId > 0}" ` +
			`ondragstart="cf_onDragStart(event, 'familiar', ${famId}, 'Clicks', ${i})" ` +
			`ondragover="cf_onDragOver(event)" ` +
			`ondrop="cf_onDrop(event, 'familiarSlot', ${i})" ` +
			`ondragend="cf_onDragEnd(event)"` +
			`>${img.img}</span>`;
	}
	txt += `</span>`;
	return txt;
}

function cf_renderFamiliarsBenchGrid() {
	const cols = `grid-template-columns:repeat(7, 50px);`;
	const rows = `grid-template-rows:30px 50px 10px 30px 50px;`;
	const famsInSeats = cf_builderState?.familiars?.Seat ?? [];

	let txt = `<span class="posRel" style="display:grid;${cols}${rows}gap:10px;grid-auto-flow:column;">`;
	for (let i = 0; i < 13; i++) {
		const famId = famsInSeats[i] ?? -1;
		const img = cf_getFamiliarImageAndStyleById(famId);
		const row = Math.floor(i / 7) * 3 + 1;
		const col = (i % 7) + 1 + (i >= 7 ? 1 : 0);
		txt +=
			`<span class="f fr fale fjc w100 h100" style="grid-column:${col};` +
			`grid-row:${row};text-wrap-style:pretty;text-align:center;` +
			`font-size:0.8em;">${i === 0 ? "Click Damage" : `Seat ${i}`}</span>`;
		txt +=
			`<span data-type="Seat" data-slot="${i}" class="cf_famPlaceSpot" ` +
			`onclick="cf_onFamiliarSlotClick('Seat', ${i})" ` +
			`draggable="${famId > 0}" ` +
			`ondragstart="cf_onDragStart(event, 'familiar', ${famId}, 'Seat', ${i})" ` +
			`ondragover="cf_onDragOver(event)" ` +
			`ondrop="cf_onDrop(event, 'familiarSlot', ${i})" ` +
			`ondragend="cf_onDragEnd(event)" ` +
			`style="grid-column:${col};grid-row:${row + 1};${img.style}">${img.img}</span>`;
	}
	txt += `</span>`;
	return txt;
}

function cf_renderFamiliarsUltimatesGrid() {
	const cols = `grid-template-columns:10px repeat(6, 50px);`;
	const rows = `grid-template-rows:30px 50px 50px 30px 50px 10px 30px 50px;`;
	const famsInRoamingUltimates = cf_builderState?.familiars?.Ultimates ?? [];
	const famsInSpecificUltimates =
		cf_builderState?.familiars?.UltimateSpecific ?? [];

	let txt = `<span class="posRel" style="display:grid;${cols}${rows}gap:10px;grid-auto-flow:column;">`;

	// Roaming Ultimates
	txt +=
		`<span class="f fr falc fje w100 h100" style="grid-column:1 / span 3;` +
		`grid-row:2;text-wrap-style:pretty;font-size:0.8em;">Roaming Ultimates</span>`;
	for (let i = 0; i < 4; i++) {
		const famId = famsInRoamingUltimates[i] ?? -1;
		const img = cf_getFamiliarImageAndStyleById(famId);
		txt +=
			`<span data-type="Ultimates" data-slot="${i}" class="cf_famPlaceSpot" ` +
			`onclick="cf_onFamiliarSlotClick('Ultimates', ${i})" ` +
			`draggable="${famId > 0}" ` +
			`ondragstart="cf_onDragStart(event, 'familiar', ${famId}, 'Ultimates', ${i})" ` +
			`ondragover="cf_onDragOver(event)" ` +
			`ondrop="cf_onDrop(event, 'familiarSlot', ${i})" ` +
			`ondragend="cf_onDragEnd(event)" ` +
			`style="grid-column:${i + 4};grid-row:2;${img.style}">${img.img}</span>`;
	}

	// Specific Ultimates
	txt +=
		`<span class="f fr fale fje w100 h100" style="grid-column:1 / span 3;` +
		`grid-row:3;text-wrap-style:pretty;font-size:0.8em;">Specific Ultimates</span>`;
	for (let i = 0; i < 12; i++) {
		const famId = famsInSpecificUltimates[i] ?? -1;
		const img = cf_getFamiliarImageAndStyleById(famId);
		const row = Math.floor(i / 6) * 3 + 4;
		const col = (i % 6) + 2;
		txt +=
			`<span class="f fr fale fjc w100 h100" style="grid-column:${col};` +
			`grid-row:${row};text-wrap-style:pretty;text-align:center;` +
			`font-size:0.8em;">Seat ${i + 1}</span>`;
		txt +=
			`<span data-type="UltimateSpecific" data-slot="${i}" class="cf_famPlaceSpot" ` +
			`onclick="cf_onFamiliarSlotClick('UltimateSpecific', ${i})" ` +
			`draggable="${famId > 0}" ` +
			`ondragstart="cf_onDragStart(event, 'familiar', ${famId}, 'UltimateSpecific', ${i})" ` +
			`ondragover="cf_onDragOver(event)" ` +
			`ondrop="cf_onDrop(event, 'familiarSlot', ${i})" ` +
			`ondragend="cf_onDragEnd(event)" ` +
			`style="grid-column:${col};grid-row:${row + 1};${img.style}">${img.img}</span>`;
	}
	txt += `</span>`;
	return txt;
}

function cf_renderFamiliarsPotionsGrid() {
	const cols = `grid-template-columns:repeat(8, 50px);`;
	const rows = `grid-template-rows:30px repeat(8, 50px);`;
	const infosArr = [
		{c: 1, r: 1, t: `Roaming`, a: `e`},
		{c: 4, r: 1, t: `Small`, a: `e`},
		{c: 5, r: 1, t: `Medium`, a: `e`},
		{c: 6, r: 1, t: `Large`, a: `e`},
		{c: 7, r: 1, t: `Huge`, a: `e`},
		{c: 8, r: 1, t: `Legendary`, a: `e`},
		{c: `2 / span 2`, r: 2, t: `Champion Damage`},
		{c: `2 / span 2`, r: 3, t: `Gold Find`},
		{c: `2 / span 2`, r: 4, t: `Champion Health`},
		{c: `2 / span 2`, r: 5, t: `Click Damage`},
		{c: `2 / span 2`, r: 6, t: `Speed Bonus`},
		{c: `1 / span 3`, r: 8, t: `Potion of the Hunter`, j: `e`},
		{c: `1 / span 3`, r: 9, t: `Potion of Psychomorphic Energy`, j: `e`},
		{c: `5 / span 3`, r: 8, t: `Potion of the Gold Hunter`, j: `e`},
		{c: `5 / span 3`, r: 9, t: `Potion of the Gem Hunter`, j: `e`},
	];
	const potsArr = [
		// Roaming
		{c: 1, r: 2, t: 0, i: 0},
		{c: 1, r: 3, t: 0, i: 1},
		{c: 1, r: 4, t: 0, i: 2},
		{c: 1, r: 5, t: 0, i: 3},
		{c: 1, r: 6, t: 0, i: 4},
		// Champion Damage
		{c: 4, r: 2, t: 1, i: 1},
		{c: 5, r: 2, t: 1, i: 2},
		{c: 6, r: 2, t: 1, i: 3},
		{c: 7, r: 2, t: 1, i: 4},
		{c: 8, r: 2, t: 1, i: 2164},
		// Gold Find
		{c: 4, r: 3, t: 1, i: 5},
		{c: 5, r: 3, t: 1, i: 6},
		{c: 6, r: 3, t: 1, i: 7},
		{c: 7, r: 3, t: 1, i: 8},
		{c: 8, r: 3, t: 1, i: 2165},
		// Champion Health
		{c: 4, r: 4, t: 1, i: 13},
		{c: 5, r: 4, t: 1, i: 14},
		{c: 6, r: 4, t: 1, i: 15},
		{c: 7, r: 4, t: 1, i: 16},
		{c: 8, r: 4, t: 1, i: 2166},
		// Click Damage
		{c: 4, r: 5, t: 1, i: 37},
		{c: 5, r: 5, t: 1, i: 38},
		{c: 6, r: 5, t: 1, i: 39},
		{c: 7, r: 5, t: 1, i: 40},
		{c: 8, r: 5, t: 1, i: 2167},
		// Speed Bonus
		{c: 4, r: 6, t: 1, i: 74},
		{c: 5, r: 6, t: 1, i: 75},
		{c: 6, r: 6, t: 1, i: 76},
		{c: 7, r: 6, t: 1, i: 77},
		{c: 8, r: 6, t: 1, i: 2168},
		// 7 Days
		{c: 4, r: 8, t: 1, i: 1712},
		{c: 4, r: 9, t: 1, i: 1722},
		{c: 8, r: 8, t: 1, i: 1721},
		{c: 8, r: 9, t: 1, i: 1723},
	];
	const type = [`BuffType`, `BuffSpecific`];
	const famsInRoamingPots = cf_builderState?.familiars?.BuffType ?? [];
	const famsInSpecificPots =
		cf_builderState?.familiars?.BuffSpecific ?? new Map();

	let txt = `<span class="posRel" style="display:grid;${cols}${rows}gap:10px;grid-auto-flow:column;">`;

	for (const info of infosArr)
		txt +=
			`<span class="f fr fal${info.a ?? `c`} fj${info.j ?? `c`} w100 h100" style="grid-column:${info.c};` +
			`grid-row:${info.r};text-wrap-style:pretty;text-align:${info.j === `e` ? `right` : `center`};` +
			`font-size:0.8em;">${info.t}</span>`;

	for (const pot of potsArr) {
		const famId =
			(pot.t === 0 ?
				famsInRoamingPots[pot.i]
			:	famsInSpecificPots.get(pot.i)) ?? -1;
		const img = cf_getFamiliarImageAndStyleById(famId);
		txt +=
			`<span data-type="${type[pot.t]}" data-slot="${pot.i}" class="cf_famPlaceSpot" ` +
			`onclick="cf_onFamiliarSlotClick('${type[pot.t]}', ${pot.i})" ` +
			`draggable="${famId > 0}" ` +
			`ondragstart="cf_onDragStart(event, 'familiar', ${famId}, '${type[pot.t]}', ${pot.i})" ` +
			`ondragover="cf_onDragOver(event)" ` +
			`ondrop="cf_onDrop(event, 'familiarSlot', ${pot.i})" ` +
			`ondragend="cf_onDragEnd(event)" ` +
			`style="grid-column:${pot.c};grid-row:${pot.r};${img.style}">${img.img}</span>`;
	}

	return txt;
}

function cf_renderFamiliarsMiscGrid() {
	const cols = `grid-template-columns:repeat(4, 50px);`;
	const rows = `grid-template-rows:30px repeat(5, 50px);`;
	const famsInAutoProgress = cf_builderState?.familiars?.AutoProgress ?? [];
	const famsInUmberto =
		cf_builderState?.familiars?.UmbertoInvestigation ?? [];

	let txt = `<span class="posRel" style="display:grid;${cols}${rows}gap:10px;grid-auto-flow:column;">`;

	// Auto Progress
	const famIdInAuto = famsInAutoProgress[0] ?? -1;
	const imgInAuto = cf_getFamiliarImageAndStyleById(famIdInAuto);
	txt +=
		`<span class="f fr falc fje w100 h100" style="grid-column:1 / span 3;` +
		`grid-row:2;text-wrap-style:pretty;font-size:0.8em;">Auto-Progress</span>`;
	txt +=
		`<span data-type="AutoProgress" data-slot="0" class="cf_famPlaceSpot" ` +
		`onclick="cf_onFamiliarSlotClick('AutoProgress', 0)" ` +
		`draggable="${famIdInAuto > 0}" ` +
		`ondragstart="cf_onDragStart(event, 'familiar', ${famIdInAuto}, 'AutoProgress', 0)" ` +
		`ondragover="cf_onDragOver(event)" ` +
		`ondrop="cf_onDrop(event, 'familiarSlot', 0)" ` +
		`ondragend="cf_onDragEnd(event)" ` +
		`style="grid-column:4;grid-row:2;${imgInAuto.style}">${imgInAuto.img}</span>`;

	// Umberto Investigations
	txt +=
		`<span class="f fr fale fje w100 h100" style="grid-column:1 / span 4;` +
		`grid-row:3;text-wrap-style:pretty;font-size:0.8em;">Umberto's Investigations (Max 1)</span>`;
	const ui = [`Rapid Reconnaissance`, `Steadfast Search`, `Thorough Inquiry`];
	for (let i = 0; i < ui.length; i++) {
		const famId = famsInUmberto[i] ?? -1;
		const img = cf_getFamiliarImageAndStyleById(famId);
		const row = i + 4;
		txt +=
			`<span class="f fr falc fje w100 h100" style="grid-column:1 / span 3;` +
			`grid-row:${row};text-wrap-style:pretty;text-align:center;` +
			`font-size:0.8em;">${ui[i]}</span>`;
		txt +=
			`<span data-type="UmbertoInvestigation" data-slot="${i}" class="cf_famPlaceSpot" ` +
			`onclick="cf_onFamiliarSlotClick('UmbertoInvestigation', ${i})" ` +
			`draggable="${famId > 0}" ` +
			`ondragstart="cf_onDragStart(event, 'familiar', ${famId}, 'UmbertoInvestigation', ${i})" ` +
			`ondragover="cf_onDragOver(event)" ` +
			`ondrop="cf_onDrop(event, 'familiarSlot', ${i})" ` +
			`ondragend="cf_onDragEnd(event)" ` +
			`style="grid-column:4;grid-row:${row};${img.style}">${img.img}</span>`;
	}

	return txt;
}

function cf_addElements(eles) {
	let txt = ``;
	for (let ele of eles) {
		let style =
			ele.header ? `font-size:1.45em;`
			: ele.large ? `font-size:1.15em;`
			: ``;
		if (ele.styles != null) style += ele.styles;
		if (ele.hide) style += `display:none;`;
		if (ele.gridCol != null) style += `grid-column:${ele.gridCol};`;
		if (style !== ``) style = ` style="${style}"`;
		let id = ele.id != null ? ` id="${ele.id}"` : ``;
		let data = ``;
		if (ele.data != null && typeof ele.data === "object")
			for (let key in ele.data) data += ` data-${key}="${ele.data[key]}"`;
		const clazz = ele.classes ? ` class="${ele.classes}"` : ``;
		txt += `<span${clazz}${id}${data}${style}>${ele.text || `&nbsp;`}</span>`;
	}
	return txt;
}

function cf_renderExportsSection() {
	if (cf_data.familiars.byId.size === 0) return ``;

	let txt = `<span class="cf_exportsSection" id="cf_exportsSection">`;

	// Left column.
	txt += `<span>`;

	const exportModeLabel = `<label for="cf_exportModeSelect">Export To:</label>`;
	const exportModeSelect =
		`<select id="cf_exportModeSelect" oninput="cf_onExportModeChange(this.value)" style="width:100%">` +
		`<option value="-">-</option>` +
		`<option value="game">Game</option>` +
		`<option value="local">Browser Storage</option>` +
		`</select>`;

	txt += `<span class="cf_exportsExporter">`;
	txt += cf_addElements([
		{text: exportModeLabel, classes: `f fr falc fje`},
		{text: exportModeSelect, classes: `f fr falc fjs`},
	]);
	txt += `</span>`;

	txt += `<span id="cf_exportContainer" class="f fr falc fje w100">&nbsp;</span>`;

	txt += `</span>`;

	// Right column
	txt +=
		`<span class="f fc fals fjs p5 w100">` +
		`<span class="p5 w100" style="margin-bottom:5px">Share String:</span>` +
		`<textarea id="cf_exportShareString" rows="8" style="width:100%;resize:none"></textarea>` +
		`</span>`;

	txt += `</span>`;

	return txt;
}

function cf_renderExportMode() {
	const container = document.getElementById(`cf_exportContainer`);
	if (!container) return;

	const type = cf_builderState.exportMode ?? `-`;

	let txt = `<span class="f fr falc fje p5 greenButton" style="margin-top:10px;width:80%;">`;

	if (type === `game`) {
		txt +=
			`<input id="cf_exportGameButton" type="button" style="width:100%;" ` +
			`value="Save to Game" onclick="cf_saveFormationToGame()">`;
	} else if (type === `local`) {
		const saved = cf_ls_getSavedFormations().length;
		txt += `<span class="f fc falc fjs w100">`;
		txt += `<span class="f fr falc fjc p5 w100">Currently storing ${nf(saved)} of ${nf(cf_MAX_LS_SAVES)}.</span>`;
		txt +=
			`<input id="cf_exportLocalButton" type="button" style="width:100%;" ` +
			`value="Save to Browser" onclick="cf_saveFormationToBrowser()">`;
		txt += `</span>`;
	} else txt += `&nbsp;`;

	txt += `</span>`;

	container.innerHTML = txt;
}

function cf_renderExportShareString() {
	const share = document.getElementById(`cf_exportShareString`);
	if (!share) return;

	const state = structuredClone(cf_builderState);
	state.formationId = -1;
	const json = JSON.stringify(state, stringifyReplacer);
	const comp = LZString.compressToBase64(json);

	share.value = comp;
}

function cf_showImportWarning(warnings) {
	if (
		warnings.champions.length === 0 &&
		warnings.feats.length === 0 &&
		warnings.familiars.length === 0
	)
		return;

	let txt = "Some items were removed because you do not own them:";

	if (warnings.champions.length)
		txt += `Champions: ${warnings.champions.length}\n`;

	if (warnings.feats.length) txt += `Feats: ${warnings.feats.length}\n`;

	if (warnings.familiars.length)
		txt += `Familiars: ${warnings.familiars.length}\n`;

	alert(txt);
}

// ========================
// ===== UI Modifiers =====
// ========================

function cf_updateUI(flags = cf_UI.ALL, context) {
	if (flags & cf_UI.IMPORT) {
		const selEle = document.getElementById(`cf_importModeSelect`);
		if (selEle && selEle.value !== (cf_builderState.importMode ?? `-`))
			selEle.value = cf_builderState.importMode;
		cf_renderImportMode();
	}

	if (flags & cf_UI.FORMATION) {
		const selEle = document.getElementById(`cf_campaignSelect`);
		if (selEle) {
			const campaign = cf_data.campaigns.byActualId.get(
				cf_builderState.baseCampaignId,
			);
			if (campaign) {
				const compVal =
					campaign.isEvent ?
						cf_builderState.campaignId
					:	cf_builderState.baseCampaignId;
				if (selEle.value !== compVal) selEle.value = compVal;
			}
		}
		cf_renderFormationGrid();
	}

	if (flags & cf_UI.FEATS && (context?.heroId ?? 0) > 0)
		cf_renderFeatChoicePopup(cf_getFormationSlotByHeroId(context.heroId));

	if (flags & cf_UI.SPECS && (context?.heroId ?? 0) > 0)
		cf_renderSpecialisationChoicePopup(
			cf_builderState.formation.indexOf(context.heroId),
		);

	if (flags & cf_UI.FAMILIARS) cf_renderFamiliarsPlacementGrids();

	if (flags & cf_UI.EXPORT) {
		const selEle = document.getElementById(`cf_exportModeSelect`);
		if (selEle && selEle.value !== cf_builderState.exportMode)
			selEle.value = cf_builderState.exportMode;
		cf_renderExportMode();
	}

	if (flags & cf_UI.EXPORT_STRING) cf_renderExportShareString();

	const nameEle = document.getElementById(`cf_nameInput`);
	if (nameEle) nameEle.value = cf_builderState.name;
	const patronEle = document.getElementById(`cf_patronSelect`);
	if (patronEle) {
		patronEle.value = cf_builderState.patronId;
		patronEle.disabled = cf_builderState.patronDisabled;
	}
	const incFeatsEle = document.getElementById(`cf_featsIncludeCheckbox`);
	if (incFeatsEle) incFeatsEle.checked = cf_builderState.includeFeats;

	const famPlaceEle = document.getElementById(`cf_familiarsPlacementSelect`);
	if (famPlaceEle) famPlaceEle.value = cf_builderState.familiarPlacementGrid;
}

function cf_onNameChange(ele) {
	if (!ele) return;

	let name = ele.value;
	if (!name || name.trim() === ``) name = `New Formation Save`;
	cf_builderState.name = name;

	cf_markDirtyAndUpdate();
}

function cf_onCampaignChange(value) {
	const newCampaignId = Number(value);

	const newCampaign = cf_data.campaigns.byActualId.get(newCampaignId);
	if (!newCampaign) return;

	const oldFormation = cf_builderState.formation;
	const oldLength = oldFormation.length;

	const newLength = newCampaign.formation.slots.length;
	const blocked = newCampaign.formation.blockedSlots;

	const newFormation = new Array(newLength).fill(-1);

	// migrate champions safely
	for (let i = 0; i < oldLength && i < newLength; i++) {
		const heroId = oldFormation[i];
		if (heroId <= 0 || blocked.has(i)) continue;

		newFormation[i] = heroId;
	}

	cf_syncPatronState(newCampaign.baseId);

	cf_builderState.campaignId = cf_resolveCampaignId(
		newCampaignId,
		cf_builderState.patronDisabled,
		cf_builderState.patronId,
	);
	cf_builderState.baseCampaignId = newCampaign.baseId;
	cf_builderState.formation = newFormation;

	cf_rebuildUsedHeroIds();
	cf_syncSpecialisations();
	cf_syncFeats();

	cf_markDirtyAndUpdate(cf_UI.FORMATION);
}

function cf_onPatronChange(value) {
	const patronId = Number(value ?? 0);

	cf_builderState.patronId = patronId;

	if (!cf_builderState.patronDisabled)
		cf_builderState.campaignId = cf_resolveCampaignId(
			cf_builderState.baseCampaignId,
			cf_builderState.patronDisabled,
			patronId,
		);

	cf_markDirtyAndUpdate();
}

function cf_onFavouriteChange(value) {
	const favourite = Number(value ?? 0);
	cf_builderState.favorite = favourite;

	cf_markDirtyAndUpdate();
}

function cf_onIncludeFeatsChange(checked) {
	cf_builderState.includeFeats = checked ?? false;

	cf_markDirtyAndUpdate(cf_UI.FORMATION);
}

function cf_onFamiliarModeChange(value) {
	const type = value ?? `rng`;
	cf_builderState.familiarMode = type;
}

function cf_onFamiliarsPlacementGridsChange(value) {
	const type = value ?? `field`;

	cf_builderState.familiarPlacementGrid = type;

	cf_updateUI(cf_UI.FAMILIARS | cf_UI.EXPORT | cf_UI.EXPORT_STRING);
}

function cf_styleSelectedChampion(heroId, selected) {
	if (heroId <= 0) return;

	const champion = cf_data.champions.byId.get(heroId);
	if (!champion) return;

	cf_setElementsSelected(
		[`cf_champBox_seat${champion.seat}`, `cf_champBox_${heroId}`],
		selected,
	);
}

function cf_styleSelectedFamiliar(famId, selected) {
	if (famId <= 0) return;

	const familiar = cf_data.familiars.byId.get(famId);
	if (!familiar) return;

	cf_setElementsSelected([`cf_famBox_${famId}`], selected);
}

function cf_setElementsSelected(eleIds, selected) {
	if (!eleIds || !Array.isArray(eleIds)) return;

	for (const eleId of eleIds) {
		const ele = document.getElementById(eleId);
		if (!ele) continue;
		if (selected) ele.classList.add(`cf_selected`);
		else ele.classList.remove(`cf_selected`);
	}
}

function cf_onImportModeChange(value) {
	if (!value) return;

	cf_builderState.importMode = value;

	cf_updateUI(cf_UI.IMPORT);
}

function cf_onExportModeChange(value) {
	if (!value) return;

	cf_builderState.exportMode = value;

	cf_updateUI(cf_UI.EXPORT);
}

// ====================
// ===== Draggers =====
// ====================

cf_dragHandlers.champion = {
	drop(event, drag, targetType, targetKey) {
		if (targetType !== "formationSlot") return;
		if (drag.sourceType === "formationSlot")
			cf_swapChampions(drag.sourceKey, targetKey);
		else cf_placeChampion(drag.id, targetKey);
	},
	end(drag) {
		if (drag.sourceType === "formationSlot" && !drag.dropHandled) {
			cf_removeChampion(drag.sourceKey);
		}
	},
};

cf_dragHandlers.familiar = {
	drop(event, drag, targetType, targetKey) {
		if (targetType !== "familiarSlot") return;
		const destType = event.currentTarget.dataset.type;
		if (!destType) return;
		if (drag.sourceType === `familiarGrid`)
			cf_placeFamiliarValidated(destType, targetKey, drag.id);
		else
			cf_swapFamiliarValidated(
				drag.sourceType,
				drag.sourceKey,
				destType,
				targetKey,
			);
	},
	end(drag) {
		if (!drag.dropHandled && drag.sourceType !== `familiarGrid`)
			cf_removeFamiliar(drag.sourceType, drag.sourceKey);
	},
};

cf_dragHandlers.feat = {
	drop(event, drag, targetType, targetKey) {
		if (targetType !== "featSlot") return;
		const heroId = cf_activeFeatHeroId;
		if (heroId <= 0) return;
		if (drag.sourceType === `featEquipped`)
			cf_swapFeat(heroId, drag.sourceKey, targetKey);
		else cf_placeFeat(cf_activeFeatHeroId, targetKey, drag.id);
	},
	end(drag) {
		if (drag.sourceType === "featEquipped" && !drag.dropHandled)
			cf_removeFeat(cf_activeFeatHeroId, drag.sourceKey);
	},
};

function cf_onDragStart(event, type, id, sourceType, sourceKey) {
	cf_dragState.type = type;
	cf_dragState.id = id;
	cf_dragState.sourceType = sourceType;
	cf_dragState.sourceKey = sourceKey;
	cf_dragState.dropHandled = false;

	event.dataTransfer.effectAllowed = "move";
}

function cf_onDragOver(event) {
	event.preventDefault();
}

function cf_onDrop(event, targetType, targetKey) {
	event.preventDefault();

	const drag = cf_dragState;

	const handler = cf_dragHandlers[drag.type];
	if (!handler) return;

	handler.drop(event, drag, targetType, targetKey);

	drag.dropHandled = true;
}

function cf_onDragEnd(event) {
	const drag = cf_dragState;
	if (!drag.type) return;

	const handler = cf_dragHandlers[drag.type];
	if (handler.end) handler.end(drag);

	cf_clearDragState();
}

function cf_clearDragState() {
	cf_dragState.type = null;
	cf_dragState.id = -1;
	cf_dragState.source = null;
	cf_dragState.slotIndex = -1;
}

// ========================
// ===== Map Builders =====
// ========================

function cf_createEmptyCfData() {
	return {
		campaigns: {
			byActualId: new Map(), // actualCampaignId -> Campaign
			byBaseId: new Map(), // baseCampaignId -> Campaign[]
			eventIds: [], // actualCampaignIds (non-patron)
			campaignIds: [], // actualCampaignIds (non-event, non-patron)
			withPatronIds: new Set([]), // baseCampaignIds that can have patrons.
		},

		champions: {
			byId: new Map(), // heroId -> Champion
			bySeat: new Map(), // seatId -> Champion[]
		},

		feats: {
			byId: new Map(), // featId -> Feat
			byChampionId: new Map(), // heroId -> Feat[]
		},

		specialisations: {
			byChampionId: new Map(), // heroId -> SpecialisationSet[]
		},

		familiars: {
			byId: new Map(), // familiarId -> Familiar
		},

		formationSaves: {
			byActualCampaignId: new Map(),
			byBaseCampaignId: new Map(),
			byFormationId: new Map(),
		},
	};
}

function cf_buildCampaigns(data, formationObjects) {
	const campaigns = data.campaigns;

	campaigns.byBaseAndPatron = new Map();

	for (const key of Object.keys(formationObjects)) {
		const actualId = Number(key ?? 0);
		if (actualId <= 0) continue;

		const obj = formationObjects[key];

		const baseId = Number(obj?.campaign_id ?? 0);
		if (baseId <= 0) continue;

		let name = obj?.campaign_name;
		if (!name) continue;

		if (actualId === 23) name = "Split the Party";
		else if (actualId === 26) name = "Mad God";

		// Skip tutorials
		const gameChangeData = obj?.game_change_data;
		if (Array.isArray(gameChangeData))
			if (gameChangeData.some((gc) => gc?.type === "is_tutorial"))
				continue;

		// Extract formation layout
		const formation = cf_extractFormationLayout(
			obj?.campaign_changes,
			gameChangeData,
		);
		if (!formation) continue;

		const blockedSlots = cf_extractBlockedSlots(gameChangeData);
		const patronId = Number(obj?.patron_id ?? 0);

		const campaign = {
			id: actualId,
			baseId,
			name,
			patronId,
			isEvent: Boolean(obj?.is_event_campaign),
			formation: {
				slots: formation,
				blockedSlots,
			},
		};

		// byActualId
		campaigns.byActualId.set(actualId, campaign);

		// byBaseId
		if (!campaigns.byBaseId.has(baseId)) campaigns.byBaseId.set(baseId, []);
		campaigns.byBaseId.get(baseId).push(campaign);

		// byBaseAndPatron
		const bapKey = `${baseId}:${patronId}`;
		campaigns.byBaseAndPatron.set(bapKey, actualId);

		// Categorisation (non-patron only)
		if (campaign.patronId === 0) {
			if (campaign.isEvent) campaigns.eventIds.push(actualId);
			else campaigns.campaignIds.push(actualId);
		} else campaigns.withPatronIds.add(baseId); // For patron only.
	}

	campaigns.eventIds.sort((a, b) => a - b);
	campaigns.campaignIds.sort((a, b) => a - b);
}

function cf_buildChampions(data, heroDefs, heroDetails, adventureDefs) {
	const champions = data.champions;

	const ownership = new Map();
	for (const hero of heroDetails) {
		const id = Number(hero?.hero_id ?? 0);
		if (id <= 0) continue;

		ownership.set(id, {
			owned: Number(hero?.owned ?? 0) === 1,
			featSlots: Number(hero?.feat_slots ?? 0),
		});
	}

	const neededAdventureIds = new Set();
	for (const hero of heroDefs) {
		const adventures = hero?.adventure_ids;
		if (!Array.isArray(adventures)) continue;

		for (const adv of adventures) {
			if (adv?.type !== "base") continue;

			const advId = Number(adv?.adventure_id ?? 0);
			if (advId > 0) neededAdventureIds.add(advId);
		}
	}

	const adventureCampaignMap = new Map();
	if (neededAdventureIds.size > 0) {
		for (const adv of adventureDefs) {
			const advId = Number(adv?.id ?? 0);
			if (!neededAdventureIds.has(advId)) continue;

			let campaignId = Number(adv?.campaign_id ?? 0);

			const changes = adv?.game_changes;
			if (Array.isArray(changes)) {
				for (const change of changes) {
					if (change?.type !== "formation_saves_campaign_id")
						continue;

					const overrideId = Number(change?.id ?? 0);
					if (overrideId > 0) campaignId = overrideId;
					break;
				}
			}

			if (campaignId > 0) adventureCampaignMap.set(advId, campaignId);
		}
	}

	for (const hero of heroDefs) {
		const id = Number(hero?.id ?? 0);
		const seat = Number(hero?.seat_id ?? 0);
		const name = hero?.english_name;

		if (id <= 0 || seat <= 0 || !name) continue;

		const featUnlocks = hero?.default_feat_slot_unlocks ?? [];
		const maxFeatSlots = featUnlocks.length ?? 0;

		const ownedInfo = ownership.get(id);

		const champion = {
			id,
			name,
			seat,
			owned: ownedInfo?.owned ?? false,
			featSlots: ownedInfo?.featSlots ?? 0,
			maxFeatSlots,
			eventFormCampaignId: null,
		};

		const adventures = hero?.adventure_ids;
		if (Array.isArray(adventures)) {
			for (const adv of adventures) {
				if (adv?.type !== "base") continue;

				const advId = Number(adv?.adventure_id ?? 0);
				if (adventureCampaignMap.has(advId))
					champion.eventFormCampaignId =
						adventureCampaignMap.get(advId);
				break;
			}
		}

		champions.byId.set(id, champion);

		if (!champions.bySeat.has(seat)) champions.bySeat.set(seat, []);
		champions.bySeat.get(seat).push(champion);
	}

	for (const list of data.champions.bySeat.values())
		list.sort((a, b) => a.id - b.id);
}

function cf_buildFeats(data, featDefs, heroDetails) {
	const feats = data.feats;

	const ownedFeatIds = new Set();

	for (const hero of heroDetails) {
		const unlocked = hero?.unlocked_feats;
		if (!Array.isArray(unlocked)) continue;

		for (const featId of unlocked) {
			const id = Number(featId ?? 0);
			if (id > 0) ownedFeatIds.add(id);
		}
	}

	for (const feat of featDefs) {
		const id = Number(feat?.id ?? 0);
		if (id <= 0 || !ownedFeatIds.has(id)) continue;

		const name = feat?.name;
		const heroId = Number(feat?.hero_id ?? 0);
		const rarity = Number(feat?.rarity ?? 0);
		const graphicId = Number(feat?.graphic_id ?? 0);
		const order = Number(feat?.order ?? 0);
		if (!name || heroId <= 0 || rarity <= 0 || graphicId <= 0) continue;

		const featObj = {
			id,
			name,
			heroId,
			order,
			rarity,
			graphicId,
		};

		feats.byId.set(id, featObj);

		if (!feats.byChampionId.has(heroId)) feats.byChampionId.set(heroId, []);
		feats.byChampionId.get(heroId).push(featObj);
	}

	for (const list of feats.byChampionId.values())
		list.sort((a, b) => a.order - b.order);
}

function cf_buildSpecialisations(data, upgradeDefs) {
	const specRoot = new Map();

	for (const upg of upgradeDefs) {
		const heroId = Number(upg?.hero_id ?? 0);
		const requiredLevel = Number(upg?.required_level ?? 0);
		const upgradeId = Number(upg?.id ?? 0);

		const name = cf_cleanSpecName(upg?.specialization_name);

		if (heroId <= 0 || requiredLevel <= 0 || upgradeId <= 0 || !name)
			continue;

		const requiredUpgradeId = Number(upg?.required_upgrade_id ?? 0);

		if (!specRoot.has(heroId)) specRoot.set(heroId, new Map());

		const levelMap = specRoot.get(heroId);

		if (!levelMap.has(requiredLevel))
			levelMap.set(requiredLevel, {
				requiredLevel,
				options: [],
			});

		levelMap.get(requiredLevel).options.push({
			upgradeId,
			name,
			requiredUpgradeId,
		});
	}

	for (const [heroId, levelMap] of specRoot.entries()) {
		const sets = Array.from(levelMap.values()).sort(
			(a, b) => a.requiredLevel - b.requiredLevel,
		);
		data.specialisations.byChampionId.set(heroId, sets);
	}
}

function cf_buildFamiliars(data, famDefs, famDetails) {
	const familiars = data.familiars;

	const ownedIds = new Set();

	for (const fam of famDetails) {
		const id = Number(fam?.familiar_id ?? 0);
		if (id > 0) ownedIds.add(id);
	}

	for (const def of famDefs) {
		const id = Number(def?.id ?? 0);
		const name = def?.name;
		const available = ownedIds.has(id) || (def?.is_available ?? false);

		if (id <= 0 || !ownedIds.has(id) || !name || !available) continue;

		familiars.byId.set(id, {
			id,
			name,
		});
	}
}

function cf_buildFormationSaves(data, allSaves) {
	const root = data.formationSaves;
	const campaigns = data.campaigns.byActualId;

	for (const key of Object.keys(allSaves)) {
		const actualCampaignId = Number(key ?? 0);
		if (actualCampaignId <= 0) continue;

		const saves = allSaves[key];
		if (!Array.isArray(saves)) continue;

		const campaign = campaigns.get(actualCampaignId);
		const baseCampaignId = campaign?.baseId ?? 0;

		for (const raw of saves) {
			const save = cf_normaliseFormationSave(raw, baseCampaignId);

			if (!root.byActualCampaignId.has(actualCampaignId))
				root.byActualCampaignId.set(actualCampaignId, []);
			root.byActualCampaignId.get(actualCampaignId).push(save);

			if (baseCampaignId > 0) {
				if (!root.byBaseCampaignId.has(baseCampaignId))
					root.byBaseCampaignId.set(baseCampaignId, []);
				root.byBaseCampaignId.get(baseCampaignId).push(save);
			}

			if (save.id > 0) root.byFormationId.set(save.id, save);
		}
	}

	for (const list of root.byActualCampaignId.values())
		list.sort(cf_formationSaveComparator);

	for (const list of root.byBaseCampaignId.values())
		list.sort(cf_formationSaveComparator);
}

function cf_applyCampaignVisibility(data) {
	for (const campaign of data.campaigns.byActualId.values())
		campaign.visible = false;

	// base campaigns are always visible
	for (const id of data.campaigns.campaignIds) {
		const campaign = data.campaigns.byActualId.get(id);
		campaign.visible = true;
	}

	// event formations become visible if a champion is tied to them
	for (const champion of data.champions.byId.values()) {
		const eventCampaignId = champion.eventFormCampaignId;
		if (!eventCampaignId) continue;

		const campaign = data.campaigns.byActualId.get(eventCampaignId);
		if (campaign) campaign.visible = true;
	}
}

// ===================
// ===== Utility =====
// ===================

function cf_extractFormationLayout(campaignChanges, gameChanges) {
	// if gameChanges has a type key value of "formation" - use it.
	if (Array.isArray(gameChanges)) {
		for (const change of gameChanges) {
			if (change?.type !== "formation") continue;

			const formation = change?.formation;
			if (!Array.isArray(formation) || formation.length === 0) break;

			return cf_buildExtractedFormation(formation);
		}
	}

	// Otherwise fall back on campaignChanges.
	if (!Array.isArray(campaignChanges)) return null;

	for (const change of campaignChanges) {
		if (change?.type !== "formation") continue;

		const formation = change?.formation;
		if (!Array.isArray(formation) || formation.length === 0) return null;

		return cf_buildExtractedFormation(formation);
	}

	return null;
}

function cf_buildExtractedFormation(formation) {
	return formation.map((slot, index) => ({
		index,
		x: Number(slot?.x ?? 0),
		y: Number(slot?.y ?? 0),
		col: Number(slot?.col ?? 0),
		adj: Array.isArray(slot?.adj) ? slot.adj.map(Number) : [],
	}));
}

function cf_extractBlockedSlots(gameChanges) {
	const blocked = new Set();

	if (!Array.isArray(gameChanges)) return blocked;

	for (const change of gameChanges) {
		if (change?.type !== "slot_escort") continue;

		const slotId = Number(change?.slot_id ?? -1);
		if (slotId >= 0) blocked.add(slotId);
	}

	return blocked;
}

function cf_formationSaveComparator(a, b) {
	if (a.campaignId !== b.campaignId) return a.campaignId - b.campaignId;
	if (a.favorite !== b.favorite) {
		if (a.favorite === 0) return 1;
		if (b.favorite === 0) return -1;
		return a.favorite - b.favorite;
	}
	return a.id - b.id;
}

function cf_normaliseFormationSave(raw, baseCampaignId = 0) {
	const id = Number(raw?.formation_save_id ?? 0);
	const campaignId = Number(raw?.campaign_id ?? 0);
	const name = raw?.name ?? "";
	const favorite = Number(raw?.favorite ?? 0);

	const formation =
		Array.isArray(raw?.formation) ?
			raw.formation.map((n) => Number(n ?? -1))
		:	[];

	const familiars = cf_normaliseFamiliars(raw?.familiars);

	const specializations = cf_normaliseHeroMap(raw?.specializations);
	const feats = cf_normaliseHeroMap(raw?.feats);

	return {
		id,
		campaignId,
		baseCampaignId,
		name,
		favorite,
		formation,
		familiars,
		specializations,
		feats,
	};
}

function cf_normaliseFamiliars(raw) {
	if (!raw || typeof raw !== "object") {
		return {
			Ultimates: [],
			Clicks: [],
			Seat: [],
			UltimateSpecific: [],
			BuffType: [],
			BuffSpecific: new Map(),
			AutoProgress: [],
			UmbertoInvestigation: [],
		};
	}

	const result = {};

	for (const key of Object.keys(raw)) {
		const arr = raw[key];
		result[key] = Array.isArray(arr) ? arr.map((n) => Number(n ?? -1)) : [];
	}

	return result;
}

function cf_normaliseHeroMap(obj) {
	const map = new Map();

	if (!obj || typeof obj !== "object") return map;

	for (const key of Object.keys(obj)) {
		const heroId = Number(key ?? 0);
		if (heroId <= 0) continue;

		const arr = obj[key];
		if (!Array.isArray(arr)) continue;

		map.set(
			heroId,
			arr.map((n) => Number(n ?? -1)),
		);
	}

	return map;
}

function cf_createBuilderState() {
	return {
		...cf_builderStateTemplate,

		formation: [],

		specializations: new Map(),
		feats: new Map(),

		familiars: {
			Ultimates: [],
			Clicks: [],
			Seat: [],
			UltimateSpecific: [],
			BuffType: [],
			BuffSpecific: new Map(),
			AutoProgress: [],
			UmbertoInvestigation: [],
		},

		usedHeroIds: new Set(),
		patronDisabled: false,
		importMode: `-`,
		includeFeats: false,
		familiarMode: `rng`,
		usedFamiliarIds: new Set(),
		familiarPlacementGrid: `field`,
		exportMode: `-`,

		dirty: false,
	};
}

function cf_newFormationForCampaign(campaignId) {
	const campaign = cf_data.campaigns.byActualId.get(campaignId);
	if (!campaign) return null;

	const state = cf_createBuilderState();

	state.campaignId = campaignId;
	state.baseCampaignId = campaign.baseId;
	state.patronId = campaign.patronId;

	state.formation = new Array(campaign.formation.slots.length).fill(-1);

	return state;
}

function cf_loadFormationSave(save) {
	cf_builderState.formationId = save.id;
	cf_builderState.campaignId = save.campaignId;
	cf_builderState.baseCampaignId = save.baseCampaignId;

	cf_builderState.name = save.name;
	cf_builderState.favorite = save.favorite;

	cf_builderState.formation = [...save.formation];

	cf_builderState.specializations = new Map(save.specializations);

	cf_builderState.feats = new Map(save.feats);

	cf_builderState.familiars = structuredClone(save.familiars);

	cf_rebuildUsedHeroIds();
	cf_syncSpecialisations();
	cf_syncFeats();

	cf_builderState.dirty = false;
}

function cf_closeImportConfirmationPopup() {
	const popup = document.getElementById(`cf_importConfPopup`);
	if (!popup) return;

	popup.style.display = `none`;
	popup.innerHTML = `&nbsp;`;
	document.removeEventListener("mousedown", cf_handleImportPopupOutsideClick);
}

function cf_handleImportPopupOutsideClick(event) {
	const popup = document.getElementById(`cf_importConfPopup`);
	if (!popup) return;

	if (!popup.contains(event.target)) {
		cf_closeImportConfirmationPopup();
		document.removeEventListener(
			"mousedown",
			cf_handleImportPopupOutsideClick,
		);
	}
}

function cf_closeImportWarningPopup() {
	const popup = document.getElementById(`cf_importWarnPopup`);
	if (!popup) return;

	popup.style.display = `none`;
	popup.innerHTML = `&nbsp;`;
	document.removeEventListener(
		"mousedown",
		cf_handleImportWarningPopupOutsideClick,
	);
}

function cf_handleImportWarningPopupOutsideClick(event) {
	const popup = document.getElementById(`cf_importWarnPopup`);
	if (!popup) return;

	if (!popup.contains(event.target)) {
		cf_closeImportWarningPopup();
		document.removeEventListener(
			"mousedown",
			cf_handleImportWarningPopupOutsideClick,
		);
	}
}

function cf_rebuildUsedHeroIds() {
	const inForm = new Set(cf_builderState?.formation ?? []);
	for (const used of cf_builderState.usedHeroIds)
		if (!inForm.has(used)) cf_styleSelectedChampion(used, false);
	for (const form of inForm)
		if (!cf_builderState.usedHeroIds.has(form))
			cf_styleSelectedChampion(form, true);

	cf_builderState.usedHeroIds.clear();

	for (const heroId of cf_builderState.formation)
		if (heroId > 0) cf_builderState.usedHeroIds.add(heroId);
}

function cf_canPlaceChampion(heroId, slotIndex) {
	if (heroId <= 0) return false;

	const formation = cf_builderState.formation;
	const campaign = cf_data.campaigns.byActualId.get(
		cf_builderState.campaignId,
	);
	if (!campaign) return false;

	if (slotIndex < 0 || slotIndex >= formation.length) return false;

	// blocked slot check
	if (campaign.formation.blockedSlots.has(slotIndex)) return false;

	return true;
}

function cf_placeChampion(heroId, slotIndex) {
	if (!cf_canPlaceChampion(heroId, slotIndex)) return false;

	const formation = cf_builderState.formation;
	const champion = cf_data.champions.byId.get(heroId);
	if (!champion) return false;

	// remove same champion elsewhere
	for (let i = 0; i < formation.length; i++) {
		if (formation[i] === heroId) {
			formation[i] = -1;
			break;
		}
	}

	const targetSeat = champion.seat;

	// remove any champion from same seat
	for (let i = 0; i < formation.length; i++) {
		const existingHeroId = formation[i];
		if (existingHeroId <= 0) continue;

		const existingChampion = cf_data.champions.byId.get(existingHeroId);

		if (existingChampion.seat === targetSeat) {
			formation[i] = -1;
			cf_styleSelectedChampion(existingChampion.id, false);
			break;
		}
	}

	// place champion
	formation[slotIndex] = heroId;
	cf_styleSelectedChampion(heroId, true);

	cf_rebuildUsedHeroIds();
	cf_syncSpecialisations();
	cf_syncFeats();

	cf_markDirtyAndUpdate(cf_UI.FORMATION);

	return true;
}

function cf_swapChampions(slotA, slotB) {
	const formation = cf_builderState.formation;

	const campaign = cf_data.campaigns.byActualId.get(
		cf_builderState.campaignId,
	);
	if (!campaign) false;

	if (
		campaign.formation.blockedSlots.has(slotA) ||
		campaign.formation.blockedSlots.has(slotB)
	)
		return false;

	if (
		slotA < 0 ||
		slotA >= formation.length ||
		slotB < 0 ||
		slotB >= formation.length
	)
		return false;

	const heroA = formation[slotA];
	const heroB = formation[slotB];

	formation[slotA] = heroB;
	formation[slotB] = heroA;

	cf_markDirtyAndUpdate(cf_UI.FORMATION);

	return true;
}

function cf_removeChampion(slotIndex) {
	const formation = cf_builderState.formation;

	if (slotIndex < 0 || slotIndex >= formation.length) return false;

	const heroId = formation[slotIndex];
	formation[slotIndex] = -1;
	cf_styleSelectedChampion(heroId, false);

	cf_rebuildUsedHeroIds();
	cf_syncSpecialisations();
	cf_syncFeats();

	cf_markDirtyAndUpdate(cf_UI.FORMATION);

	return true;
}
function cf_placeFeat(heroId, slotIndex, featId) {
	if (heroId <= 0 || featId <= 0) return;

	let feats = cf_builderState.feats.get(heroId);
	if (!feats) {
		feats = [];
		cf_builderState.feats.set(heroId, feats);
	}

	feats[slotIndex] = featId;

	cf_markDirtyAndUpdate(cf_UI.FORMATION | cf_UI.FEATS, {heroId});
}

function cf_swapFeat(heroId, sourceSlot, targetSlot) {
	if (heroId <= 0) return;

	const feats = cf_builderState.feats.get(heroId);
	if (!feats) return;

	const sourceFeat = feats[sourceSlot] ?? null;
	const targetFeat = feats[targetSlot] ?? null;

	feats[targetSlot] = sourceFeat;
	feats[sourceSlot] = targetFeat ?? null;

	cf_markDirtyAndUpdate(cf_UI.FORMATION | cf_UI.FEATS, {heroId});
}

function cf_removeFeat(heroId, slotIndex) {
	const feats = cf_builderState.feats.get(heroId);
	if (!feats) return;

	feats[slotIndex] = null;

	cf_markDirtyAndUpdate(cf_UI.FORMATION | cf_UI.FEATS, {heroId});
}

function cf_swapFamiliarValidated(
	sourceType,
	sourceKey,
	targetType,
	targetKey,
) {
	const fams = cf_builderState.familiars;

	const sourceContainer = fams[sourceType];
	const targetContainer = fams[targetType];

	const sourceId =
		sourceContainer instanceof Map ?
			sourceContainer.get(sourceKey)
		:	sourceContainer[sourceKey];

	const targetId =
		targetContainer instanceof Map ?
			targetContainer.get(targetKey)
		:	targetContainer[targetKey];

	if (sourceId <= 0) return;

	// remove both first
	cf_removeFamiliarFromAllPlacements(sourceId);

	if (targetId > 0) cf_removeFamiliarFromAllPlacements(targetId);

	// place swapped
	cf_placeFamiliarValidated(targetType, targetKey, sourceId);

	if (targetId > 0)
		cf_placeFamiliarValidated(sourceType, sourceKey, targetId);

	cf_markDirtyAndUpdate(cf_UI.FAMILIARS);
}

function cf_removeFamiliar(type, slotKey) {
	const fams = cf_builderState.familiars;

	const container = fams[type];
	if (!container) return;

	let famId = -1;

	if (container instanceof Map) {
		famId = container.get(slotKey) ?? -1;
		container.delete(slotKey);
	} else {
		famId = container[slotKey] ?? -1;
		container[slotKey] = -1;
	}

	if (famId > 0) {
		cf_builderState.usedFamiliarIds.delete(famId);
		cf_styleSelectedFamiliar(famId, false);
	}

	cf_markDirtyAndUpdate(cf_UI.FAMILIARS);
}

function cf_onFamiliarSlotClick(type, slotKey) {
	const famsOfType =
		cf_builderState.familiars[type] ??
		(cf_builderState.familiars[type] =
			type === "BuffSpecific" ? new Map() : []);
	if (Array.isArray(famsOfType) && (famsOfType[slotKey] ?? -1) > 0) return;
	if (famsOfType instanceof Map && (famsOfType.get(slotKey) ?? -1) > 0)
		return;

	const famId = cf_getNextFamiliarId();
	if (famId <= 0) return;

	cf_placeFamiliarValidated(type, slotKey, famId);
}

function cf_getNextFamiliarId() {
	const used = cf_builderState.usedFamiliarIds;

	const all = [...cf_data.familiars.byId.keys()];

	const unused = all.filter((id) => !used.has(id));
	if (unused.length === 0) return -1;

	if (cf_builderState.familiarMode === `rng`) {
		const index = Math.floor(Math.random() * unused.length);
		return unused[index];
	}

	// sequential
	return unused[0];
}

function cf_removeFamiliarFromAllPlacements(familiarId) {
	const fams = cf_builderState.familiars;

	for (const type in fams) {
		const container = fams[type];

		if (Array.isArray(container)) {
			for (let i = 0; i < container.length; i++)
				if (container[i] === familiarId) container[i] = -1;
		} else if (container instanceof Map) {
			for (const [key, id] of container)
				if (id === familiarId) container.delete(key);
		}
	}

	cf_builderState.usedFamiliarIds.delete(familiarId);
	cf_styleSelectedFamiliar(familiarId, false);
}

function cf_placeFamiliarValidated(targetType, targetKey, famId) {
	if (famId <= 0) return;

	// enforce Umberto max 1
	if (targetType === "UmbertoInvestigation") {
		const ui = cf_builderState.familiars.UmbertoInvestigation;

		const alreadyPlaced = ui.some((id) => id > 0);

		// remove existing first
		if (alreadyPlaced) {
			for (let i = 0; i < ui.length; i++) {
				if (ui[i] > 0) {
					const placedFamId = ui[i];
					ui[i] = -1;
					cf_styleSelectedFamiliar(placedFamId, false);
					cf_builderState.usedFamiliarIds.delete(placedFamId);
				}
			}
		}
	}

	// remove familiar globally
	cf_removeFamiliarFromAllPlacements(famId);

	// place into container
	const container =
		cf_builderState.familiars[targetType] ??
		(cf_builderState.familiars[targetType] =
			targetType === "BuffSpecific" ? new Map() : []);

	if (container instanceof Map) container.set(targetKey, famId);
	else container[targetKey] = famId;

	cf_builderState.usedFamiliarIds.add(famId);
	cf_styleSelectedFamiliar(famId, true);

	cf_markDirtyAndUpdate(cf_UI.FAMILIARS);
}

function cf_calcFormGridCoords(slots, coordMult, radius) {
	let minX = Infinity,
		maxX = -Infinity,
		minY = Infinity,
		maxY = -Infinity;
	for (const s of slots) {
		const x = s.x,
			y = s.y;
		if (x < minX) minX = x;
		if (y < minY) minY = y;
		if (x > maxX) maxX = x;
		if (y > maxY) maxY = y;
	}

	const width = (maxX - minX) * coordMult + radius * 2;
	const height = (maxY - minY) * coordMult + radius * 2;
	return {width, height, minX, minY};
}

function cf_syncSpecialisations() {
	const specs = cf_builderState.specializations;
	const used = cf_builderState.usedHeroIds;

	// Remove specs for heroes no longer present
	for (const heroId of specs.keys())
		if (!used.has(heroId)) specs.delete(heroId);

	// Add empty spec arrays for heroes newly placed
	for (const heroId of used) if (!specs.has(heroId)) specs.set(heroId, []);
}

function cf_syncFeats() {
	const feats = cf_builderState.feats;
	const used = cf_builderState.usedHeroIds;

	// Remove feats for heroes no longer present
	for (const heroId of feats.keys())
		if (!used.has(heroId)) feats.delete(heroId);

	// Add empty feat arrays for heroes newly placed
	for (const heroId of used) if (!feats.has(heroId)) feats.set(heroId, []);
}

function cf_getValidSpecOptions(heroId, specSetIndex) {
	const specSets = cf_data.specialisations.byChampionId.get(heroId);
	if (!specSets) return [];

	const specSet = specSets[specSetIndex];
	if (!specSet) return [];

	const selected = cf_builderState.specializations.get(heroId) ?? [];

	return specSet.options.filter((option) => {
		if (option.requiredUpgradeId === 0) return true;
		return selected.includes(option.requiredUpgradeId);
	});
}

function cf_setSpecialisationChoice(heroId, specSetIndex, upgradeId) {
	const specs = cf_builderState.specializations.get(heroId);
	if (!specs) return;

	const specSets = cf_data.specialisations.byChampionId.get(heroId);
	if (!specSets) return;

	const targetSet = specSets[specSetIndex];

	// remove existing selection from this set
	for (let i = specs.length - 1; i >= 0; i--) {
		const selectedId = specs[i];
		if (targetSet.options.some((o) => o.upgradeId === selectedId))
			specs.splice(i, 1);
	}

	// add new selection
	if (upgradeId > 0) specs.push(upgradeId);

	// clean downstream invalid selections
	for (let i = specs.length - 1; i >= 0; i--) {
		const selectedId = specs[i];

		const valid = specSets.some((set) =>
			set.options.some(
				(opt) =>
					opt.upgradeId === selectedId &&
					(opt.requiredUpgradeId === 0 ||
						specs.includes(opt.requiredUpgradeId)),
			),
		);

		if (!valid) specs.splice(i, 1);
	}

	cf_markDirtyAndUpdate(cf_UI.FORMATION | cf_UI.SPECS, {heroId});
}

function cf_setFavouriteChoice(value) {
	const favourite = Number(value ?? 0);
	cf_builderState.favorite = favourite;

	cf_markDirtyAndUpdate(cf_UI.FORMATION);
	cf_renderFavouriteChoicePopup();
}

function cf_closeSpecPopup() {
	const popup = document.getElementById("cf_specChoicePopup");
	if (!popup) return;

	popup.style.display = "none";
	document.removeEventListener("mousedown", cf_handleSpecPopupOutsideClick);
}

function cf_handleSpecPopupOutsideClick(event) {
	const popup = document.getElementById("cf_specChoicePopup");
	if (!popup) return;

	if (!popup.contains(event.target)) {
		cf_closeSpecPopup();
		document.removeEventListener(
			"mousedown",
			cf_handleSpecPopupOutsideClick,
		);
	}
}

function cf_closeFavouritePopup() {
	const popup = document.getElementById(`cf_favouriteChoicePopup`);
	if (!popup) return;

	popup.style.display = "none";
	document.removeEventListener(
		"mousedown",
		cf_handleFavouritePopupOutsideClick,
	);
}

function cf_handleFavouritePopupOutsideClick(event) {
	const popup = document.getElementById(`cf_favouriteChoicePopup`);
	if (!popup) return;

	if (!popup.contains(event.target)) {
		cf_closeFavouritePopup();
		document.removeEventListener(
			"mousedown",
			cf_handleFavouritePopupOutsideClick,
		);
	}
}

function cf_closeFeatPopup() {
	const popup = document.getElementById(`cf_featChoicePopup`);
	if (!popup) return;

	popup.style.display = "none";
	document.removeEventListener("mousedown", cf_handleFeatPopupOutsideClick);
}

function cf_handleFeatPopupOutsideClick(event) {
	const popup = document.getElementById(`cf_featChoicePopup`);
	if (!popup) return;

	if (!popup.contains(event.target)) {
		cf_closeFeatPopup();
		document.removeEventListener(
			"mousedown",
			cf_handleFeatPopupOutsideClick,
		);
	}
}

function cf_syncPatronState(baseCampaignId) {
	const baseIdsWithPatrons = cf_data?.campaigns?.withPatronIds;
	if (!baseIdsWithPatrons) return;

	const patronEle = document.getElementById(`cf_patronSelect`);
	if (!patronEle) return;

	const disable = !cf_canCampaignHaveAPatron(baseCampaignId);

	cf_builderState.patronDisabled = disable;
	patronEle.disabled = disable;
}

function cf_canCampaignHaveAPatron(baseCampaignId) {
	const baseIdsWithPatrons = cf_data?.campaigns?.withPatronIds;
	if (!baseIdsWithPatrons) return false;

	return baseIdsWithPatrons.has(baseCampaignId);
}

function cf_getRarityColour(rarity) {
	switch (rarity) {
		case 2:
			return `AlienArmpit`;
		case 3:
			return `UltramarineBlue`;
		case 4:
			return `Violet`;
		case 5:
			return `Saffron`;
		default:
			return `WhitecapFoam`;
	}
}

function cf_getFamiliarImageAndStyleById(famId) {
	const familiar = cf_data.familiars.byId.get(famId);
	if (famId <= 0 || !familiar)
		return {
			img: `&nbsp;`,
			style: ``,
		};

	return {
		img: `<img src="images/familiars/${famId}.png" alt="${cf_escapeHtml(familiar.name)}">`,
		style: `background-color:var(--ChineseBlack);border:1px solid var(--Emperor);`,
	};
}

function cf_getFormationSlotByHeroId(heroId) {
	const formation = cf_builderState.formation;

	for (let i = 0; i < formation.length; i++)
		if (formation[i] === heroId) return i;

	return -1;
}

function cf_cleanSpecName(name) {
	if (!name) return "";

	return (
		name
			// replace {text}#HEX with text
			.replace(/\{([^}]+)\}#[0-9A-Fa-f]{3,6}/g, "$1")
			// collapse multiple spaces
			.replace(/\s+/g, " ")
			// trim leading/trailing spaces
			.trim()
	);
}

function cf_markDirtyAndUpdate(flags, context) {
	cf_builderState.dirty = true;

	cf_updateUI(flags | cf_UI.EXPORT | cf_UI.EXPORT_STRING, context);
}

function cf_convertFormationSaveToBuilderState(save) {
	let hasFeats = false;
	for (const key of save.feats.keys()) {
		if (save.feats.get(key).length > 0) {
			hasFeats = true;
			break;
		}
	}

	return {
		formationId: save.id,
		campaignId: save.campaignId,
		baseCampaignId:
			cf_data.campaigns.byActualId.get(save.campaignId)?.baseId ?? 0,
		patronId:
			cf_data.campaigns.byActualId.get(save.campaignId)?.patronId ?? 0,
		name: save.name ?? `New Formation Save`,
		favorite: Number(save.favorite ?? 0),
		formation: save.formation.slice(),
		familiars: cf_importFamiliars(save.familiars),
		specializations: cf_cloneHeroArrayMap(save.specializations),
		feats: cf_cloneHeroArrayMap(save.feats),

		includeFeats: hasFeats,
		familiarMode: `rng`,
		familiarPlacementGrid: `field`,
		exportMode: `-`,
		importMode: `-`,
	};
}

function cf_cloneHeroArrayMap(source) {
	if (!source) return new Map();

	if (source instanceof Map)
		return new Map(
			Array.from(source.entries()).map(([heroId, arr]) => [
				Number(heroId),
				arr.slice(),
			]),
		);

	return new Map(
		Object.entries(source).map(([heroId, arr]) => [
			Number(heroId),
			arr.slice(),
		]),
	);
}

function cf_importFamiliars(data) {
	return {
		Clicks: cf_importGapArray(data.Clicks),
		Seat: cf_importGapArray(data.Seat),
		Ultimates: cf_importGapArray(data.Ultimates),
		UltimateSpecific: cf_importGapArray(data.UltimateSpecific),
		BuffType: cf_importGapArray(data.BuffType),
		BuffSpecific: cf_importBuffSpecific(data.BuffSpecific),
		AutoProgress: data.AutoProgress?.slice() ?? [],
		UmbertoInvestigation: cf_importGapArray(data.UmbertoInvestigation),
	};
}

function cf_escapeHtml(str) {
	if (str == null) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

// =====================
// ===== Importing =====
// =====================

function cf_applyImportedBuilderState(newState) {
	if (!newState) return;

	const state = structuredClone(cf_builderStateTemplate);
	Object.assign(state, newState);

	// Copy fields from imported state
	for (const key in state)
		if (newState[key] !== undefined) state[key] = newState[key];

	// Ensure Maps exist
	state.specializations ??= new Map();
	state.feats ??= new Map();

	cf_normaliseBuilderState(state);

	state.usedHeroIds = new Set(state.formation.filter((id) => id > 0));

	state.usedFamiliarIds = cf_extractUsedFamiliars(state.familiars);

	state.patronDisabled = !cf_canCampaignHaveAPatron(state.baseCampaignId);
	if (state.patronDisabled) state.patronId = 0;

	state.familiarPlacementGrid = `field`;
	state.exportMode = "-";
	state.importMode = "-";
	state.dirty = false;

	const warnings = cf_validateImportedState(state);

	cf_builderState = state;

	cf_globalStyleChampions();
	cf_globalStyleFamiliars();
	cf_updateUI(cf_UI.ALL);

	cf_renderImportWarningPopup(warnings);
}

function cf_normaliseBuilderState(state) {
	// Clean formation
	state.formation = state.formation.map((id) => (id > 0 ? id : -1));

	// Clean specializations
	for (const [heroId, specs] of state.specializations) {
		const cleaned = specs.filter((id) => id > 0);
		if (cleaned.length > 0) state.specializations.set(heroId, cleaned);
		else state.specializations.delete(heroId);
	}

	// Clean feats
	for (const [heroId, feats] of state.feats) {
		const cleaned = feats.filter((id) => id > 0);
		if (cleaned.length > 0) state.feats.set(heroId, cleaned);
		else state.feats.delete(heroId);
	}

	// Clean familiars
	for (const [type, container] of Object.entries(state.familiars)) {
		if (container instanceof Map) {
			for (const [key, famId] of container)
				if (famId <= 0) container.delete(key);
		} else
			state.familiars[type] = container.map((id) => (id > 0 ? id : -1));
	}
}

function cf_globalStyleChampions() {
	for (const heroId of cf_data.champions.byId.keys())
		if (heroId > 0)
			cf_styleSelectedChampion(
				heroId,
				cf_builderState.usedHeroIds.has(heroId),
			);
	// Clean up seat headers
	for (const heroId of cf_builderState.usedHeroIds) {
		const champion = cf_data.champions.byId.get(heroId);
		cf_setElementsSelected([`cf_champBox_seat${champion.seat}`], true);
	}
}

function cf_globalStyleFamiliars() {
	for (const famId of cf_data.familiars.byId.keys())
		if (famId > 0)
			cf_styleSelectedFamiliar(
				famId,
				cf_builderState.usedFamiliarIds.has(famId),
			);
}

function cf_importFormationFromGame() {
	const select = document.getElementById("cf_importGameSelect");
	const formId = Number(select?.value);
	if (!formId || formId < 0) return;

	const save = cf_data.formationSaves.byFormationId.get(formId);
	if (!save) return;

	const state = cf_convertFormationSaveToBuilderState(save);

	cf_applyImportedBuilderState(state);
}

function cf_importFormationFromBrowser() {
	const select = document.getElementById("cf_importLocalSelect");
	if (!select) return;
	const index = Number(select?.value);
	if (isNaN(index) || index < 0) return;

	const saves = cf_ls_getSavedFormations();
	const state = saves[index];
	if (!state) return;
	state.formationId = -1;

	cf_applyImportedBuilderState(structuredClone(state));
}

function cf_importFormationFromString() {
	const textarea = document.getElementById("cf_importShareString");
	if (!textarea) return;

	let parsed;
	try {
		const decomp = LZString.decompressFromBase64(textarea.value.trim());
		parsed = JSON.parse(decomp, parseReviver);
	} catch {
		alert("Invalid share string.");
		return;
	}

	cf_applyImportedBuilderState(parsed);
}

function cf_importFormationFromEmpty() {
	const campaignId = cf_builderState.campaignId ?? 1;

	cf_builderState = cf_newFormationForCampaign(campaignId);

	cf_globalStyleFamiliars();
	cf_updateUI(cf_UI.ALL);
}

function cf_importGapArray(arr) {
	if (!arr || arr.length === 0) return [];

	const result = [];
	let index = 0;

	for (const val of arr) {
		if (val > 0) result[index++] = val;
		else index += Math.abs(val);
	}

	return result;
}

function cf_importBuffSpecific(arr) {
	const map = new Map();
	if (!arr || !Array.isArray(arr) || arr.length === 0) return map;

	for (let i = 0; i < arr.length; i += 2) map.set(arr[i], arr[i + 1]);

	return map;
}

function cf_extractUsedFamiliars(familiars) {
	const used = new Set();
	if (!familiars) return used;

	for (const container of Object.values(familiars)) {
		if (!container) continue;

		if (container instanceof Map) {
			for (const famId of container.values())
				if (famId > 0) used.add(famId);
		} else if (Array.isArray(container)) {
			for (const famId of container) if (famId > 0) used.add(famId);
		}
	}

	return used;
}

function cf_validateImportedState(state) {
	const warnings = {
		champions: [],
		feats: [],
		familiars: [],
	};

	const champions = cf_data.champions.byId;
	const feats = cf_data.feats.byId;
	const familiars = cf_data.familiars.byId;

	// Champions
	for (let i = 0; i < state.formation.length; i++) {
		const heroId = state.formation[i];
		if (heroId > 0 && !champions.get(heroId)?.owned) {
			warnings.champions.push(heroId);
			state.formation[i] = -1;
			state.specializations.delete(heroId);
			state.feats.delete(heroId);
		}
	}

	// Feats
	for (const [heroId, featList] of state.feats) {
		const filtered = featList.filter((id) => feats.has(id));
		if (filtered.length !== featList.length) {
			warnings.feats.push(heroId);
			state.feats.set(heroId, filtered);
		}
	}

	// Familiars
	for (const container of Object.values(state.familiars)) {
		if (container instanceof Map) {
			for (const [key, famId] of container) {
				if (!familiars.has(famId)) {
					warnings.familiars.push(famId);
					container.delete(key);
				}
			}
		} else if (Array.isArray(container)) {
			for (let i = 0; i < container.length; i++) {
				const famId = container[i];
				if (famId > 0 && !familiars.has(famId)) {
					warnings.familiars.push(famId);
					container[i] = -1;
				}
			}
		}
	}

	return warnings;
}

// =====================
// ===== Exporting =====
// =====================

function cf_exportFormation() {
	const state = cf_builderState;

	if (!state) return null;

	return {
		formId: state.formationId ?? -1,
		campId: state.campaignId,
		name: state.name ?? `New Formation Save`,
		fav: state.favorite ?? 0,
		formation: cf_exportFormationSlots(),
		familiars: cf_exportFamiliars(),
		specs: JSON.stringify(cf_exportSpecialisations()),
		feats: state.includeFeats ? JSON.stringify(cf_exportFeats()) : `[]`,
	};
}

function cf_resolveCampaignId(baseId, patronDisabled, patronId) {
	if (patronDisabled) return baseId;

	const key = `${baseId}:${patronId}`;
	const id = cf_data.campaigns.byBaseAndPatron.get(key);
	if (id !== undefined) return id;

	console.warn("Campaign resolution failed:", baseId, patronId);

	return baseId; // safe fallback
}

function cf_exportFormationSlots() {
	const unmapped = cf_builderState.formation.map((id) => (id > 0 ? id : -1));
	return JSON.stringify(unmapped);
}

function cf_exportSpecialisations() {
	const map = cf_builderState.specializations;
	if (!map || map.size === 0) return [];

	const obj = {};
	for (const [heroId, upgrades] of map) {
		const valid = upgrades.filter((id) => id > 0);
		if (valid.length > 0) obj[heroId] = valid;
	}

	const keys = Object.keys(obj);
	if (keys.length === 0) return [];

	for (const key of keys) obj[key].sort((a, b) => a - b);

	return obj;
}

function cf_exportFeats() {
	const map = cf_builderState.feats;
	if (!map || map.size === 0) return [];

	const obj = {};
	for (const [heroId, feats] of map) {
		const valid = feats.filter((id) => id > 0);
		if (valid.length > 0) obj[heroId] = valid;
	}

	const keys = Object.keys(obj);
	if (keys.length === 0) return [];

	return obj;
}
function cf_exportFamiliars() {
	const fams = cf_builderState.familiars;
	const remapped = {
		Ultimates: cf_exportUltimates(fams.Ultimates, 4),
		Clicks: cf_exportGapArray(fams.Clicks, 6),
		Seat: cf_exportGapArray(fams.Seat, 13),
		UltimateSpecific: cf_exportGapArray(fams.UltimateSpecific, 12),
		BuffType: cf_exportGapArray(fams.BuffType, 5),
		BuffSpecific: cf_exportBuffSpecific(fams.BuffSpecific),
		AutoProgress: cf_exportSingle(fams.AutoProgress),
		UmbertoInvestigation: cf_exportGapArray(fams.UmbertoInvestigation, 3),
	};
	return JSON.stringify(remapped);
}

function cf_exportUltimates(arr, maxSize) {
	if (!arr || arr.length === 0) return [];

	const result = [];
	let hasAny = false;

	for (let i = 0; i < maxSize; i++) {
		const id = i < arr.length ? arr[i] : -1;
		if (id > 0) {
			hasAny = true;
			result.push(id);
		}
	}

	const gap = maxSize - result.length;
	if (hasAny && gap > 0) result.push(-gap);

	return hasAny ? result : [];
}

function cf_exportBuffSpecific(map) {
	if (!map || map.size === 0) return [];

	const result = [];

	for (const [buffId, famId] of map) {
		if (buffId > 0 && famId > 0) {
			result.push(buffId);
			result.push(famId);
		}
	}

	return result;
}

function cf_exportSingle(arr) {
	if (!arr || arr.length === 0) return [];

	const id = arr[0];
	return id > 0 ? [id] : [];
}

function cf_exportGapArray(arr, maxSize) {
	if (!arr || arr.length === 0) return [];

	const result = [];
	let gap = 0;
	let hasAny = false;

	for (let i = 0; i < maxSize; i++) {
		const id = i < arr.length ? arr[i] : -1;
		if (id > 0) {
			hasAny = true;
			if (gap > 0) {
				result.push(-gap);
				gap = 0;
			}
			result.push(id);
		} else gap++;
	}

	// Only append trailing gap if we placed at least one familiar
	if (gap > 0 && hasAny) result.push(-gap);

	return hasAny ? result : [];
}

async function cf_saveFormationToGame() {
	const output = document.getElementById(`createFormsCreator`);
	if (!output) return;

	const f = cf_exportFormation();

	const response = await saveFormation(
		f.formId,
		f.campId,
		f.name,
		f.fav,
		f.formation,
		f.familiars,
		f.specs,
		f.feats,
	);

	let txt;
	if (
		response?.success &&
		response?.okay &&
		Number(response?.formation_save_id ?? 0) > 0
	)
		txt = `Successfully saved to the game.`;
	else {
		txt = `Failed to save to the game.`;
		console.log(response);
	}

	output.innerHTML = txt;

	cf_builderState.exportMode = `-`;
	cf_updateUI(cf_UI.EXPORT | cf_UI.EXPORT_STRING);
}

function cf_saveFormationToBrowser() {
	const output = document.getElementById(`createFormsCreator`);
	if (!output) return;

	let txt;

	const amountSaved = cf_ls_getSavedFormations().length;
	if (amountSaved >= cf_MAX_LS_SAVES) {
		txt = `Can't save to browser. You have too many saved already.`;
	} else {
		cf_ls_addSavedFormation();

		txt = `Successfully saved to the browser.`;
	}

	output.innerHTML = txt;

	cf_builderState.exportMode = `-`;
	cf_updateUI(cf_UI.EXPORT | cf_UI.EXPORT_STRING);
}

// =========================
// ===== Local Storage =====
// =========================

function cf_ls_addSavedFormation() {
	const saved = cf_ls_getSavedFormations();
	if (saved.length >= cf_MAX_LS_SAVES) return;

	const state = structuredClone(cf_builderState);
	state.formationId = -1;
	saved.push(state);

	ls_setGlobal_arr(cf_LSKEY_savedFormations, saved);
}

function cf_ls_getSavedFormations() {
	return ls_getGlobal(cf_LSKEY_savedFormations, []);
}

function cf_ls_deleteSavedFormation(formId) {
	if (!formId || formId <= 0) return;

	const saved = cf_ls_getSavedFormations();
	for (let i = saved.length - 1; i >= 0; i--) {
		if (saved[i].formationId === formId) {
			saved.splice(i, 1);
			break;
		}
	}

	ls_setGlobal_arr(cf_LSKEY_savedFormations, saved);
}
