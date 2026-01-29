const vcc = 1.006; // prettier-ignore

async function cc_pullCelebrationsData() {
	if (isBadUserData()) return;
	disablePullButtons();
	const wrapper = document.getElementById(`celebrationsWrapper`);
	setFormsWrapperFormat(wrapper, 0);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		wrapper.innerHTML = `Waiting for user data...`;
		const customNotes = (await getUserDetails()).details
			.custom_notifications;
		await cc_displayCelebrationsData(wrapper, customNotes);
		codeEnablePullButtons();
	} catch (error) {
		setFormsWrapperFormat(wrapper, 0);
		handleError(wrapper, error);
	}
}

async function cc_displayCelebrationsData(wrapper, customNotes) {
	if (customNotes == null) {
		wrapper.innerHTML = `Error.`;
		return;
	}
	const idents = {};
	for (let customNote of customNotes) idents[customNote.identifier] = {};
	const identKeys = Object.keys(idents);

	const celebrationsClaimer = document.getElementById(`celebrationsClaimer`);
	if (identKeys.length === 0) {
		wrapper.innerHTML = `&nbsp;`;
		celebrationsClaimer.innerHTML = `<span class="f w100 p5" style="padding-left:10%">There are no celebrations running at the moment.</span>`;
		return;
	}
	let timer = -1;
	wrapper.innerHTML = `Waiting for celebration dialogs...`;
	for (let ident of identKeys) {
		const codes = [];
		const dynamicDialog = await getDynamicDialog(ident);
		if (
			!dynamicDialog.success ||
			dynamicDialog == null ||
			dynamicDialog.dialog_data == null ||
			dynamicDialog.dialog_data.title == null ||
			dynamicDialog.dialog_data.elements == null
		)
			continue;
		for (let ele of dynamicDialog.dialog_data.elements) {
			if (
				ele.type != null &&
				ele.type === `text` &&
				ele.timer != null &&
				ele.timer_resolution != null &&
				ele.timer_resolution === `seconds` &&
				(timer === -1 || ele.timer < timer)
			)
				timer = ele.timer;
			if (
				ele.type !== `button` ||
				(!ele.text.includes(`Claim`) &&
					!ele.text.includes(`1 to go`)) ||
				ele.actions == null ||
				ele.actions.length === 0
			)
				continue;
			for (let action of ele.actions) {
				if (
					action.action == null ||
					action.action !== `redeem_code` ||
					action.params == null ||
					action.params.code == null
				)
					continue;
				codes.push(action.params.code);
			}
		}
		idents[ident].codes = codes;
		idents[ident].name = dynamicDialog.dialog_data.title;
		idents[ident].next = timer;
	}

	let txt = ``;
	for (let ident of identKeys) {
		const codes = idents[ident].codes;
		if (codes.length === 0) continue;
		const name = idents[ident].name;
		txt += `<span style="display:flex;flex-direction:column"><span class="formsCampaignTitle">${name}</span><span class="formsCampaign" id="${ident}">`;
		for (let i = 0; i < codes.length; i++) {
			const code = codes[i];
			txt += `<span class="featsChampionList"><input type="checkbox" id="celeb_${ident}_${i}" name="celeb_${ident}_${i}" data-name="${name}" data-ident="${ident}" data-code="${code}"><label class="cblabel" for="celeb_${ident}_${i}" style="font-family:monospace;font-size:1.1em">${cc_displayCode(
				code,
			)}</label></span>`;
		}
		txt += `<span class="formsCampaignSelect"><input id="celeb_selectAll_${ident}" type="button" onClick="cc_celebrationsSelectAll('${ident}',true)" value="Select All"><input id="celeb_selectNone_${ident}" type="button" onClick="cc_celebrationsSelectAll('${ident}',false)" value="Deselect All"></span></span></span>`;
	}
	setFormsWrapperFormat(wrapper, 1);
	if (txt !== ``) {
		wrapper.innerHTML = txt;
		celebrationsClaimer.innerHTML = `<span class="f fc w100 p5"><span class="f fc falc fje mr2" style="width:50%;padding-bottom:20px" id="celebrationsSelectAllTheCelebrationsRow"><input type="button" onClick="cc_celebrationsSelectAllTheCelebrations()" name="celebrationsSelectAllTheCelebrationsButton" id="celebrationsSelectAllTheCelebrationsButton" style="font-size:0.9em;min-width:180px" value="Select All Codes"></span><span class="f fc falc fje mr2 greenButton" style="width:50%" id="celebrationsBuyRow"><input type="button" onClick="cc_claimCelebrations()" name="celebrationsBuyButton" id="celebrationsBuyButton" style="font-size:0.9em;min-width:180px" value="Claim Selected Codes"></span></span>`;
	} else {
		wrapper.innerHTML = `&nbsp;`;
		const timerMS = timer * 1000;
		const timerText = timer === -1 ? `` : getDisplayTime(timerMS);
		const prefix = `No celebration codes to claim at this time. Check again in `;
		celebrationsClaimer.innerHTML = `<span class="f w100 p5" style="padding-left:10%"><span id="celebrationCooldown">${prefix}${timerText}.</span></span>`;
		createTimer(
			timerMS,
			`cc_celebration`,
			`celebrationCooldown`,
			`New Day Started. Check for Celebrations again.`,
			`${prefix}`,
			`.`,
		);
	}
}

function cc_celebrationsSelectAll(ident, check) {
	for (let ele of document
		.getElementById(ident)
		.querySelectorAll(`input[type="checkbox"]`))
		ele.checked = check;
}

function cc_celebrationsSelectAllTheCelebrations() {
	const check = !document
		.getElementById(`celebrationsSelectAllTheCelebrationsButton`)
		.value.includes(`Deselect`);
	for (let ele of document.querySelectorAll(
		`[type="checkbox"][id^="celeb_"]`,
	))
		ele.checked = check;
	document.getElementById(
		`celebrationsSelectAllTheCelebrationsButton`,
	).value = `${check ? "Deselect" : "Select"} All Codes`;
}

async function cc_claimCelebrations() {
	cc_disableAllCelebrationButtonsAndCheckboxes(true);
	const celebrationsClaimer = document.getElementById(`celebrationsClaimer`);
	let txt = `<span class="f fr w100 p5">Claiming Celebrations Codes:</span>`;
	celebrationsClaimer.innerHTML = txt;
	let count = 0;
	for (let ele of document.querySelectorAll(
		`input[type="checkbox"][id^="celeb_"]`,
	)) {
		if (!ele.checked) continue;
		count++;
		const code = ele.dataset.code;
		const name = ele.dataset.name;
		const result = await redeemCombination(code);
		let successType = ``;
		if (result.success && result.okay) successType = `Successfully claimed`;
		else {
			if (result.failure_reason != null)
				console.log(
					`Code ${cc_displayCode(
						code,
					)} failed to claim. Server gave reason: ${
						result.failure_reason
					}`,
				);
			successType = `Failed to claim`;
		}
		txt += `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:175px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">- ${successType}:</span><span class="f falc fjs ml2" style="flex-grow:1;margin-left:5px;flex-wrap:wrap">${cc_displayCode(
			code,
		)} in ${name}</span></span>`;
		ele.parentNode.style.display = `none`;
		ele.checked = false;
		celebrationsClaimer.innerHTML = txt;
	}
	if (count === 0) {
		txt += `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:175px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">- None</span></span>`;
		celebrationsClaimer.innerHTML = txt;
	}
	cc_disableAllCelebrationButtonsAndCheckboxes(false);
}

function cc_disableAllCelebrationButtonsAndCheckboxes(disable) {
	if (disable) {
		disablePullButtons();
		for (let ele of document.querySelectorAll(
			`input[type="checkbox"][id^="celeb"]`,
		)) {
			ele.disabled = disable;
			ele.style =
				disable ?
					`color:#555555;background-color:hsl(calc(240*0.95),15%,calc(16%*0.8))`
				:	``;
		}
		for (let ele of document.querySelectorAll(
			`input[type="button"][id^="celeb_select"]`,
		)) {
			ele.disabled = disable;
			ele.style =
				disable ? `color:#555555;background-color:var(--good2)` : ``;
		}
	} else codeEnablePullButtons();
}

function cc_displayCode(code) {
	let ret = code;
	for (let i = 4; i < code.length; i += 5)
		ret = ret.slice(0, i) + `-` + ret.slice(i);
	return ret;
}
