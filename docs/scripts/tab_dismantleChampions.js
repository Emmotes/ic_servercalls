const vdc = 1.007; // prettier-ignore
const dc_LSKey_hideDismantleOpts = `scHideDismantleOptions`;

async function dc_pullData() {
	clearTimers(`dc_`);
	if (isBadUserData()) return;
	disablePullButtons();
	const wrapper = document.getElementById(`dismantleWrapper`);
	setFormsWrapperFormat(wrapper, 0);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		wrapper.innerHTML = `Waiting for dismantle data...`;
		let dismantleData = await getDismantleData();
		if (
			dismantleData == null ||
			dismantleData.redistribute_hero == null ||
			Object.keys(dismantleData.redistribute_hero).length === 0
		) {
			setFormsWrapperFormat(wrapper, 1);
			wrapper.innerHTML = `&nbsp;`;
			document.getElementById(`dismantleDismantler`).innerHTML =
				`<span class="f w100 p5" style="padding-left:10%">There is no dismantle running at the moment.</span>`;
			codeEnablePullButtons();
			return;
		}
		dismantleData = dismantleData.redistribute_hero;
		wrapper.innerHTML = `Waiting for user data...`;
		const details = (await getUserDetails()).details;
		wrapper.innerHTML = `Waiting for definitions...`;
		const defs = await getDefinitions("hero_defines,buff_defines");
		const heroDefs = defs.hero_defines;
		const buffDefs = defs.buff_defines;
		await dc_displayData(
			wrapper,
			dismantleData,
			details,
			heroDefs,
			buffDefs,
		);
		codeEnablePullButtons();
	} catch (error) {
		setFormsWrapperFormat(wrapper, 0);
		handleError(wrapper, error);
	}
}

async function dc_displayData(
	wrapper,
	dismantleData,
	details,
	heroDefs,
	buffDefs,
) {
	if (details == null || heroDefs == null) {
		wrapper.innerHTML = `Error.`;
		return;
	}
	const champNames = getDefsNames(heroDefs);
	const buffNames = getDefsNames(buffDefs);
	const redists = {};
	for (let champId in dismantleData) {
		const champ = dismantleData[champId];
		if (
			champ.redistribute_id == null ||
			champ.time_remaining == null ||
			champ.reward_breakdown == null
		)
			continue;
		let type = champ.legendaries_only ? "Legendary" : "Full";
		if (redists[type] == null) redists[type] = {champs: {}};
		if (
			redists[type].time == null ||
			redists[type].time > champ.time_remaining
		)
			redists[type].time = champ.time_remaining;
		const rewards = {};
		const seenKeys = [];
		for (let rewardKey in champ.reward_breakdown) {
			let rewardObj = champ.reward_breakdown[rewardKey];
			if (rewardObj == null) continue;
			for (let reward of rewardObj) {
				if (reward.buff_id == null || reward.amount == null) continue;
				let buffId = Number(reward.buff_id);
				let amount = Number(reward.amount);
				if (seenKeys.includes(buffId))
					rewards[buffId] = rewards[buffId] + amount;
				else {
					rewards[buffId] = amount;
					seenKeys.push(buffId);
				}
			}
		}
		const feats =
			champ.feat_ids_to_remove != null &&
			champ.feat_ids_to_remove.length > 0;
		redists[type].champs[champId] = {
			id: champ.redistribute_id,
			rewards: rewards,
			feats: feats,
		};
		redists[type].champs[champId].legs = dc_dismantleParseLegendaries(
			details,
			Number(champId),
		);
	}
	const hideOptions = dc_getDismantleHideOptions();
	const types = Object.keys(redists);
	types.sort();
	let txt = ``;
	const dismantleTimers = {};
	for (let type of types) {
		const dismantle = redists[type];
		const time = Number(dismantle.time) * 1000;
		const champs = dismantle.champs;
		let addedHeader = false;
		for (let champId in champs) {
			const champ = dismantle.champs[champId];
			const name = champNames[champId];
			const hasBeenReforged = champ.legs.reforged;
			const numLegs = champ.legs.amount;
			const onlyHasOnes = Object.keys(champ.legs.levels).join() === "1";
			if (type === `Legendary`) {
				if (hasBeenReforged && hideOptions.includes(`reforges`))
					continue;
				if (numLegs === 6 && hideOptions.includes(`6legs`)) continue;
				if (onlyHasOnes && hideOptions.includes(`1sonly`)) continue;
			}
			const rewardKeys = Object.keys(champ.rewards);
			if (rewardKeys.length === 0) continue;
			if (!addedHeader) {
				txt += `<p style="grid-column:1/-1;font-size:1.3em"><span id="dismantle${type}Ends">${type} Dismantle - Ends in ${getDisplayTime(
					time,
				)}</span></p>`;
				dismantleTimers[type] = time;
				addedHeader = true;
			}
			txt += `<span style="display:flex;flex-direction:column"><span class="formsCampaignTitle" style="font-size:1.2em">${name}</span><span class="formsCampaign">`;
			txt += dc_addRow(
				`${numLegs}`,
				`Legendar${numLegs === 1 ? "y" : "ies"}`,
			);
			txt += dc_addRow(
				`&nbsp;`,
				hasBeenReforged ? `HAS BEEN REFORGED` : `&nbsp;`,
			);
			txt += dc_addRow(`&nbsp;`);
			txt += dc_addRow(`<u>Rewards</u>:`);
			for (let buffId of rewardKeys) {
				const buffName = buffNames[buffId];
				const amount = champ.rewards[buffId];
				txt += dc_addRow(`${amount}`, dc_simplifyBuffName(buffName));
			}
			if (champ.feats) txt += dc_addRow(`&nbsp;`, `Some Feats`);
			txt += dc_addRow(`&nbsp;`);
			txt += `<span class="formsCampaignSelect"><span class="f fr falc" style="flex-grow:1"><input type="checkbox" id="dismantle_${champId}" name="dismantle_${champId}" data-reforged="${hasBeenReforged}" data-heroid="${champId}" data-redistid="${champ.id}" data-name="${name}" onclick="dc_recalculate()"><label class="cblabel" for="dismantle_${champId}">Dismantle ${name}</label></span></span></span></span>`;
		}
	}
	const dismantleDismantler = document.getElementById(`dismantleDismantler`);
	setFormsWrapperFormat(wrapper, 1);
	if (txt !== ``) {
		wrapper.innerHTML = txt;
		dismantleDismantler.innerHTML = `<span class="f fc w100 p5"><span class="f fc falc fje mr2" style="width:50%;padding-bottom:10px" id="dc_selectAllRow"><input type="button" onClick="dc_selectAll()" name="dc_selectAll" id="dc_selectAll" style="font-size:0.9em;min-width:180px" value="Select All Champions"></span><span class="f fc falc fje mr2" style="width:50%;padding-bottom:15px;color:var(--TangerineYellow)" id="dismantleDismantleWarningRow">&nbsp;</span><span class="f fc falc fje mr2 redButton" style="width:50%" id="dismantleDismantleRow">&nbsp;</span></span>`;
		dc_recalculate();

		for (let timerType in dismantleTimers)
			createTimer(
				dismantleTimers[timerType],
				`dc_${timerType}`,
				`dismantle${timerType}Ends`,
				`${timerType} Dismantle - Ended`,
				`${timerType} Dismantle - Ends in `,
			);
	} else {
		wrapper.innerHTML = `&nbsp;`;
		dismantleDismantler.innerHTML = `<span class="f w100 p5" style="padding-left:10%">You don't have any non-hidden champions that can be dismantled.</span>`;
	}
}

function dc_addRow(str1, str2) {
	let style = ``;
	if (str2 === `HAS BEEN REFORGED`) style += `color:var(--TangerineYellow);`;
	if (str1 === `<u>Rewards</u>:`)
		style += `font-size:1.2em;padding-bottom:5px;`;
	if (style !== ``) style = ` style="${style}"`;
	if (str2 == null)
		return `<span class="dismantleChampionList"${style}>${str1}</span>`;
	else {
		return `<span class="dismantleChampionList f"${style}><span style="width:15%;text-align:right;margin-right:10px">${str1}</span><span style="flex-grow:1">${str2}</span></span>`;
	}
}

function dc_recalculate() {
	let totalSelected = 0;
	let reforgedSelected = 0;
	for (let ele of document.querySelectorAll(
		`[type="checkbox"][id^="dismantle_"]`,
	)) {
		if (ele.checked) {
			totalSelected++;
			if (/^true$/i.test(ele.dataset.reforged)) reforgedSelected++;
		}
	}
	document.getElementById(`dismantleDismantleWarningRow`).innerHTML =
		reforgedSelected > 0 ?
			`${reforgedSelected} reforged champion${
				reforgedSelected === 1 ? " has" : "s have"
			} been selected.`
		:	`&nbsp;`;
	let txt = ``;
	if (totalSelected > 0)
		txt = `<input type="button" onClick="dc_dismantleDismantle()" name="dismantleDismantleButton" id="dismantleDismantleButton" style="font-size:0.9em;min-width:180px" value="Dismantle ${totalSelected} Champion${
			totalSelected === 1 ? "" : "s"
		}">`;
	else txt = `Can't dismantle until at least one champion is selected.`;
	document.getElementById(`dismantleDismantleRow`).innerHTML = txt;
}

function dc_selectAll() {
	const check = !document
		.getElementById(`dc_selectAll`)
		.value.includes(`Deselect`);
	for (let ele of document.querySelectorAll(
		`[type="checkbox"][id^="dismantle_"]`,
	))
		ele.checked = check;
	document.getElementById(`dc_selectAll`).value = `${
		check ? "Deselect" : "Select"
	} All Champions`;
	dc_recalculate();
}

async function dc_dismantleDismantle() {
	dc_disableAllDismantleButtonsAndCheckboxes(true);
	const dismantleDismantler = document.getElementById(`dismantleDismantler`);
	let txt = `<span class="f fr w100 p5">Dismantling Champions:</span>`;
	dismantleDismantler.innerHTML = txt;
	let count = 0;
	for (let champ of document.querySelectorAll(
		`[type="checkbox"][id^="dismantle_"]`,
	)) {
		if (!champ.checked) continue;
		count++;
		const heroId = champ.dataset.heroid;
		const redistId = champ.dataset.redistid;
		const name = champ.dataset.name;
		const result = await dismantleHero(heroId, redistId);
		let successType = ``;
		if (result.success) successType = `Successfully dismantled`;
		else successType = `Failed to dismantle`;
		txt += `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:200px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">- ${successType}:</span><span class="f falc fjs ml2" style="flex-grow:1;margin-left:5px;flex-wrap:wrap">${name}</span></span>`;
		champ.parentNode.style.display = `none`;
		champ.checked = false;
		dismantleDismantler.innerHTML = txt;
	}
	if (count === 0) {
		txt += `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:175px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">- None</span></span>`;
		dismantleDismantler.innerHTML = txt;
	}
	dc_disableAllDismantleButtonsAndCheckboxes(false);
}

function dc_disableAllDismantleButtonsAndCheckboxes(disable) {
	if (disable) {
		disablePullButtons();
		for (let ele of document.querySelectorAll(
			`input[type="checkbox"][id^="dismantle_"]`,
		)) {
			ele.disabled = disable;
			ele.style =
				disable ?
					`color:#555555;background-color:hsl(calc(240*0.95),15%,calc(16%*0.8))`
				:	``;
		}
		let ele = document.getElementById(`dc_selectAll`);
		ele.disabled = disable;
		ele.style =
			disable ? `color:#555555;background-color:var(--good2)` : ``;
	} else codeEnablePullButtons();
}

function dc_dismantleParseLegendaries(details, champId) {
	const legs = details.legendary_details.legendary_items;
	let amount = 0;
	let reforged = false;
	let levels = {};
	if (Object.keys(legs).includes(`${champId}`)) {
		let curr = legs[champId];
		let keys = Object.keys(curr);
		amount = keys.length;
		for (let key of keys) {
			const level = curr[key].level;
			levels[level] = (levels[level] ?? 0) + 1;
			if (curr[key].effects_unlocked.length > 1) {
				reforged = true;
				break;
			}
		}
	}
	return {amount: amount, reforged: reforged, levels: levels};
}

function dc_simplifyBuffName(buffName) {
	let retName = buffName;
	retName = retName.replace("Legendary Equipment", "Legendary");
	return retName;
}

function dc_initDismantleHideOptions() {
	const hideOptions = dc_getDismantleHideOptions();
	if (hideOptions.length === 0) return;
	for (let ele of document.querySelectorAll('[id^="dismantleHide"]'))
		if (hideOptions.includes(ele.dataset.type)) ele.checked = true;
}

function dc_toggleDismantleHideOptions(ele) {
	const hideOption = ele.dataset.type;
	if (!localStorage.getItem(dc_LSKey_hideDismantleOpts)) {
		dc_setDismantleHideOptions([hideOption]);
		return;
	}
	const checked = ele.checked;
	const hideOptions = dc_getDismantleHideOptions();
	if (checked && !hideOptions.includes(hideOption))
		hideOptions.push(hideOption);
	else hideOptions.splice(hideOptions.indexOf(hideOption), 1);
	if (hideOptions.length === 0)
		localStorage.removeItem(dc_LSKey_hideDismantleOpts);
	else dc_setDismantleHideOptions(hideOptions);
}

function dc_getDismantleHideOptions() {
	const hideOptions = localStorage.getItem(dc_LSKey_hideDismantleOpts);
	if (!hideOptions) return [];
	return JSON.parse(hideOptions);
}

function dc_setDismantleHideOptions(opts) {
	localStorage.setItem(dc_LSKey_hideDismantleOpts, JSON.stringify(opts));
}
