const vbf = 1.013; // prettier-ignore

async function bf_pullFeatsData() {
	if (isBadUserData()) return;
	disablePullButtons();
	const wrapper = document.getElementById(`featsWrapper`);
	setFormsWrapperFormat(wrapper, 0);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		wrapper.innerHTML = `Waiting for user data...`;
		const details = await getUserDetails();
		wrapper.innerHTML = `Waiting for definitions...`;
		const defs = await getDefinitions("hero_defines,hero_feat_defines");
		await bf_displayFeatsData(wrapper, details, defs);
		codeEnablePullButtons();
	} catch (error) {
		setFormsWrapperFormat(wrapper, 0);
		handleError(wrapper, error);
	}
}

async function bf_displayFeatsData(wrapper, details, defs) {
	if (details == null || defs == null) {
		wrapper.innerHTML = `Error.`;
		return;
	}
	const now = Date.now() / 1000;
	wrapper.dataset.gems =
		!details.details.red_rubies ? 0 : details.details.red_rubies;
	const unlockedChampIDs = [];
	const unlockedFeats = [];
	for (let hero of details.details.heroes) {
		if (
			hero.owned != null &&
			Number(hero.owned) === 1 &&
			hero.hero_id != null
		) {
			unlockedChampIDs.push(Number(hero.hero_id));
			for (let id of hero.unlocked_feats)
				if (!unlockedFeats.includes(id)) unlockedFeats.push(id);
		}
	}
	const champs = {};
	for (let champ of defs.hero_defines) {
		if (unlockedChampIDs.includes(champ.id))
			champs[champ.id] = {name: champ.name, feats: []};
	}
	for (let feat of defs.hero_feat_defines) {
		if (unlockedFeats.includes(feat.id)) continue;
		if (!unlockedChampIDs.includes(feat.hero_id)) continue;
		if (findWord(`TBD`, feat.name) || findWord(`Test`, feat.name)) continue;
		let avail = feat.properties.is_available;
		if (avail != null && !avail) continue;
		avail = feat.properties.available_at_time;
		if (avail != null && avail > now) continue;
		avail = feat.properties.available_for_gems_at_time;
		if (avail != null && avail > now) continue;
		for (let source of feat.sources) {
			if (source.source === "gems") {
				if (source.cost <= 50000)
					champs[feat.hero_id].feats.push({
						id: feat.id,
						name: feat.name,
						cost: source.cost,
					});
				break;
			}
		}
	}
	let txt = ``;
	for (let id of unlockedChampIDs) {
		const feats = champs["" + id].feats;
		if (feats.length === 0) continue;
		const name = champs[id].name;
		txt += `<span style="display:flex;flex-direction:column"><span class="formsCampaignTitle">${name}</span><span class="formsCampaign" id="champFeats_${id}">`;
		for (let feat of champs[id].feats) {
			txt += `<span class="featsChampionList"><input type="checkbox" id="feat_${
				feat.id
			}" name="${feat.name}" data-champ="${name}" data-cost="${
				feat.cost
			}" data-featid="${
				feat.id
			}" onClick="bf_featsRecalcCost()"><label class="cblabel" for="feat_${
				feat.id
			}">${feat.name} ${nf(feat.cost)}</label></span>`;
		}
		txt += `<span class="formsCampaignSelect"><input id="feat_selectAll_${id}" type="button" onClick="bf_featsSelectAll('${id}',true)" value="Select All"><input id="feat_selectNone_${id}" type="button" onClick="bf_featsSelectAll('${id}',false)" value="Deselect All"></span></span></span>`;
	}
	const featsBuyer = document.getElementById(`featsBuyer`);
	setFormsWrapperFormat(wrapper, 1);
	if (txt !== ``) {
		wrapper.innerHTML = txt;
		featsBuyer.innerHTML = `<span class="f fc w100 p5"><span class="f falc fjs mr2 p5" style="width:50%;padding-left:15%" id="featsBuyCost">&nbsp;</span><span class="f falc fjs mr2 p5" style="width:50%;padding-left:15%" id="featsBuyAvailable">&nbsp;</span><span class="f fc falc fje mr2" style="width:50%;padding-bottom:20px" id="featsSelectAllTheFeatsRow">&nbsp;</span><span class="f fc falc fje mr2 greenButton" style="width:50%" id="featsBuyRow">&nbsp;</span></span>`;
		bf_featsRecalcCost();
	} else {
		wrapper.innerHTML = `&nbsp;`;
		featsBuyer.innerHTML = `<span class="f w100 p5" style="padding-left:10%">Congratulations. You have every available feat.</span>`;
	}
}

function bf_featsRecalcCost() {
	const wrapper = document.getElementById("featsWrapper");
	const availableGems = Number(wrapper.dataset.gems);
	const checked = wrapper.querySelectorAll('input[type="checkbox"]:checked');
	let cost = 0;
	checked.forEach((cb) => {
		cost += Number(cb.dataset.cost);
	});
	const wrapAvailableGems = document.getElementById("featsBuyAvailable");
	if (wrapAvailableGems != null)
		wrapAvailableGems.innerHTML = `Gems Available: ${nf(availableGems)}`;
	const wrapGemsCost = document.getElementById("featsBuyCost");
	if (wrapGemsCost != null)
		wrapGemsCost.innerHTML = `Total Gems Cost: ${nf(cost)}`;
	const featsSelectAllTheFeatsRow = document.getElementById(
		"featsSelectAllTheFeatsRow",
	);
	const featsBuyRow = document.getElementById("featsBuyRow");
	featsSelectAllTheFeatsRow.innerHTML = `<input type="button" onClick="bf_featsSelectAllTheFeats()" name="featsSelectAllTheFeatsButton" id="featsSelectAllTheFeatsButton" style="font-size:0.9em;min-width:180px" value="Select All Unowned Feats">`;
	if (featsBuyRow != null) {
		if (cost > availableGems) {
			featsBuyRow.style.color = `var(--warning1)`;
			featsBuyRow.innerHTML = `You don't have enough gems to buy the selected feats.`;
		} else {
			featsBuyRow.style.color = ``;
			featsBuyRow.innerHTML = `<input type="button" onClick="bf_buyFeats()" name="featsBuyButton" id="featsBuyButton" style="font-size:0.9em;min-width:180px" value="Buy Selected Feats">`;
		}
	}
}

function bf_featsSelectAll(id, check) {
	for (let ele of document
		.getElementById(`champFeats_${id}`)
		.querySelectorAll(`input[type="checkbox"]`))
		ele.checked = check;
	bf_featsRecalcCost();
}

function bf_featsSelectAllTheFeats() {
	const check = !document
		.getElementById(`featsSelectAllTheFeatsButton`)
		.value.includes(`Deselect`);
	for (let ele of document.querySelectorAll(`[type="checkbox"][id^="feat_"]`))
		ele.checked = check;
	bf_featsRecalcCost();
	document.getElementById(`featsSelectAllTheFeatsButton`).value = `${
		check ? "Deselect" : "Select"
	} All Unowned Feats`;
}

async function bf_buyFeats() {
	bf_disableAllFeatButtonsAndCheckboxes(true);
	const featsBuyer = document.getElementById(`featsBuyer`);
	let txt = `<span class="f fr w100 p5">Buying Feats:</span>`;
	featsBuyer.innerHTML = txt;
	let count = 0;
	for (let feat of document.querySelectorAll('[id^="feat_"]')) {
		if (!feat.checked) continue;
		count++;
		const id = Number(feat.dataset.featid);
		const result = await purchaseFeat(id);
		const cost = feat.dataset.cost;
		let successType = ``;
		if (result["success"] && result["okay"])
			successType = `Successfully bought`;
		else successType = `Failed to buy`;
		txt += `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:175px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">- ${successType}:</span><span class="f falc fjs ml2" style="flex-grow:1;margin-left:5px;flex-wrap:wrap">${
			feat.name
		} for ${feat.dataset.champ} (${nf(Number(cost))} gems)</span></span>`;
		feat.parentNode.style.display = `none`;
		feat.checked = false;
		featsBuyer.innerHTML = txt;
	}
	if (count === 0) {
		txt += `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:175px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">- None</span></span>`;
		featsBuyer.innerHTML = txt;
	}
	bf_disableAllFeatButtonsAndCheckboxes(false);
}

function bf_disableAllFeatButtonsAndCheckboxes(disable) {
	if (disable) {
		disablePullButtons();
		for (let ele of document.querySelectorAll(
			`input[type="checkbox"][id^="feat"]`,
		)) {
			ele.disabled = disable;
			ele.style =
				disable ?
					`color:#555555;background-color:hsl(calc(240*0.95),15%,calc(16%*0.8))`
				:	``;
		}
		for (let ele of document.querySelectorAll(
			`input[type="button"][id^="feat_select"]`,
		)) {
			ele.disabled = disable;
			ele.style =
				disable ? `color:#555555;background-color:var(--good2)` : ``;
		}
	} else codeEnablePullButtons();
}
