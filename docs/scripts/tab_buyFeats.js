const vbf=1.008;

async function pullFeatsData() {
	if (isBadUserData())
		return;
	disablePullButtons();
	let wrapper = document.getElementById(`featsWrapper`);
	setFormsWrapperFormat(wrapper,0);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		wrapper.innerHTML = `Waiting for user data...`;
		let details = await getUserDetails();
		wrapper.innerHTML = `Waiting for definitions...`;
		let defs = await getDefinitions("hero_defines,hero_feat_defines");
		await displayFeatsData(wrapper,details,defs);
		codeEnablePullButtons();
	} catch (error) {
		setFormsWrapperFormat(wrapper,0);
		handleError(wrapper,error);
	}
}

async function displayFeatsData(wrapper,details,defs) {
	if (details==undefined||defs==undefined) {
		wrapper.innerHTML = `Error.`;
		return;
	}
	let now = Date.now() / 1000;
	let availableGems = details.details.red_rubies;
	if (availableGems == undefined)
		availableGems = 0;
	wrapper.dataset.gems = availableGems;
	let unlockedChampIDs = [];
	let unlockedFeats = [];
	for (let hero of details.details.heroes) {
		if (hero.owned!=undefined&&hero.owned==1&&hero.hero_id!=undefined) {
			unlockedChampIDs.push(Number(hero.hero_id));
			for (let id of hero.unlocked_feats)
				if (!unlockedFeats.includes(id))
					unlockedFeats.push(id);
		}
	}
	let champs = {};
	for (let champ of defs.hero_defines) {
		if (unlockedChampIDs.includes(champ.id))
			champs[champ.id]={name:champ.name,feats:[]};
	}
	for (let feat of defs.hero_feat_defines) {
		if (unlockedFeats.includes(feat.id))
			continue;
		if (!unlockedChampIDs.includes(feat.hero_id))
			continue;
		if (findWord(`TBD`, feat.name) || findWord(`Test`, feat.name))
			continue;
		let test = localStorage.scTestDontFilterFeatsByDate;
		if (test==undefined||test==0) {
			let avail = feat.properties.is_available;
			if (avail!=undefined&&!avail)
				continue;
			avail = feat.properties.available_at_time;
			if (avail!=undefined&&avail>now)
				continue;
			avail = feat.properties.available_for_gems_at_time;
			if (avail!=undefined&&avail>now)
				continue;
		}
		for (let source of feat.sources) {
			if (source.source=="gems") {
				if (source.cost <= 50000)
					champs[feat.hero_id].feats.push({id:feat.id,name:feat.name,cost:source.cost});
				break;
			}
		}
	}
	let txt=``;
	for (let id of unlockedChampIDs) {
		let feats = champs[""+id].feats;
		if (feats.length == 0)
			continue;
		let name = champs[id].name;
		txt += `<span style="display:flex;flex-direction:column"><span class="formsCampaignTitle">${name}</span><span class="formsCampaign" id="${id}">`;
		for (let feat of champs[id].feats) {
			txt += `<span class="featsChampionList"><input type="checkbox" id="feat_${feat.id}" name="${feat.name}" data-champ="${name}" data-cost="${feat.cost}" onClick="featsRecalcCost()"><label class="cblabel" for="feat_${feat.id}">${feat.name} ${nf(feat.cost)}</label></span>`;
		}
		txt += `<span class="formsCampaignSelect"><input id="feat_selectAll_${id}" type="button" onClick="featsSelectAll('${id}',true)" value="Select All"><input id="feat_selectNone_${id}" type="button" onClick="featsSelectAll('${id}',false)" value="Deselect All"></span></span></span>`;
	}
	let featsBuyer = document.getElementById(`featsBuyer`);
	setFormsWrapperFormat(wrapper,1);
	if (txt!=``) {
		wrapper.innerHTML = txt;
		featsBuyer.innerHTML = `<span class="f fc w100 p5"><span class="f falc fjs mr2 p5" style="width:50%;padding-left:15%" id="featsBuyCost">&nbsp;</span><span class="f falc fjs mr2 p5" style="width:50%;padding-left:15%" id="featsBuyAvailable">&nbsp;</span><span class="f fc falc fje mr2" style="width:50%;padding-bottom:20px" id="featsSelectAllTheFeatsRow">&nbsp;</span><span class="f fc falc fje mr2 greenButton" style="width:50%" id="featsBuyRow">&nbsp;</span></span>`;
		featsRecalcCost();
	} else {
		wrapper.innerHTML = `&nbsp;`;
		featsBuyer.innerHTML = `<span class="f w100 p5" style="padding-left:10%">Congratulations. You have every available feat.</span>`
	}
}

function featsRecalcCost() {
	let wrapper = document.getElementById("featsWrapper");
	let availableGems = Number(wrapper.dataset.gems);
	let checked = wrapper.querySelectorAll('input[type="checkbox"]:checked');
	let cost = 0;
	checked.forEach(cb => {cost += Number(cb.dataset.cost);});
	let wrapAvailableGems = document.getElementById("featsBuyAvailable");
	if (wrapAvailableGems != undefined)
		wrapAvailableGems.innerHTML = `Gems Available: ${nf(availableGems)}`;
	let wrapGemsCost = document.getElementById("featsBuyCost");
	if (wrapGemsCost != undefined)
		wrapGemsCost.innerHTML = `Total Gems Cost: ${nf(cost)}`;
	let featsSelectAllTheFeatsRow = document.getElementById("featsSelectAllTheFeatsRow");
	let featsBuyRow = document.getElementById("featsBuyRow");
	featsSelectAllTheFeatsRow.innerHTML = `<input type="button" onClick="featsSelectAllTheFeats()" name="featsSelectAllTheFeatsButton" id="featsSelectAllTheFeatsButton" style="font-size:0.9em;min-width:180px" value="Select All Unowned Feats">`;
	if (featsBuyRow != undefined) {
		if (cost > availableGems) {
			featsBuyRow.style.color = `var(--warning1)`;
			featsBuyRow.innerHTML = `You don't have enough gems to buy the selected feats.`;
		} else {
			featsBuyRow.style.color = ``;
			featsBuyRow.innerHTML = `<input type="button" onClick="buyFeats()" name="featsBuyButton" id="featsBuyButton" style="font-size:0.9em;min-width:180px" value="Buy Selected Feats">`;
		}
	}
}

function featsSelectAll(id,check) {
	for (let ele of document.getElementById(id).querySelectorAll(`input[type="checkbox"]`))
		ele.checked = check;
	featsRecalcCost();
}

function featsSelectAllTheFeats() {
	let check = !document.getElementById(`featsSelectAllTheFeatsButton`).value.includes(`Deselect`);
	for (let ele of document.querySelectorAll(`[type="checkbox"][id^="feat_"]`))
		ele.checked = check;
	featsRecalcCost();
	document.getElementById(`featsSelectAllTheFeatsButton`).value = `${check?"Deselect":"Select"} All Unowned Feats`;
}

async function buyFeats() {
	disableAllFeatButtonsAndCheckboxes(true);
	let featsBuyer = document.getElementById(`featsBuyer`);
	let txt = `<span class="f fr w100 p5">Buying Feats:</span>`;
	featsBuyer.innerHTML = txt;
	let list = document.querySelectorAll('[id^="feat_"]');
	let count = 0;
	for (let feat of list) {
		if (!feat.checked)
			continue;
		count++;
		let id = Number(feat.id.replaceAll("feat_",""));
		let result = await purchaseFeat(id);
		let cost = feat.dataset.cost;
		let successType = ``;
		if (result['success']&&result['okay'])
			successType = `Successfully bought`;
		else
			successType = `Failed to buy`;
		txt += `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:175px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">- ${successType}:</span><span class="f falc fjs ml2" style="flex-grow:1;margin-left:5px;flex-wrap:wrap">${feat.name} (${feat.dataset.champ} / ${nf(Number(cost))} gems)</span></span>`;
		feat.parentNode.style.display=`none`;
		feat.checked = false;
		featsBuyer.innerHTML = txt;
	}
	if (count==0) {
		txt += `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:175px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">- None</span></span>`;
		featsBuyer.innerHTML = txt;
	}
	disableAllFeatButtonsAndCheckboxes(false);
}

function disableAllFeatButtonsAndCheckboxes(disable) {
	if (disable) {
		disablePullButtons(true);
		for (let ele of document.querySelectorAll(`input[type="checkbox"][id^="feat"]`)) {
			ele.disabled = disable;
			ele.style = disable ? `color:#555555;background-color:hsl(calc(240*0.95),15%,calc(16%*0.8))` : ``;
		}
		for (let ele of document.querySelectorAll(`input[type="button"][id^="feat_select"]`)) {
			ele.disabled = disable;
			ele.style = disable ? `color:#555555;background-color:var(--good2)` : ``;
		}
	} else
		codeEnablePullButtons();
}