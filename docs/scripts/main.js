const v=2.06;
const tabsContainer=document.getElementById(`tabsContainer`);
const disabledUntilData=document.getElementById(`disabledUntilData`);
const settingsMenu=document.getElementById(`settingsMenu`);
const settingsUserId=document.getElementById(`userId`);
const settingsUserHash=document.getElementById(`userHash`);
const settingsSave=document.getElementById(`settingsMenuButtonSave`);
const settingsClose=document.getElementById(`settingsMenuButtonClose`);
const supportUrl=document.getElementById(`supportUrl`);
const supportUrlButton=document.getElementById(`supportUrlMenuButton`);
const M=`https://master.idlechampions.com/~idledragons/`;
const SPS=`switch_play_server`;
const FR=`failure_reason`;
const OII=`Outdated instance id`;
const PARAM_CALL=`call`;
const PARAM_INSTANCEID=`instance_id`;
const PARAM_USERID=`user_id`;
const PARAM_USERHASH=`hash`;
const RETRIES=4;
const BADDATA = `Response: Your user data is incorrect. Server call failed.`;
const NUMFORM = new Intl.NumberFormat("en",{useGrouping:true,maximumFractionDigits:2});
var SERVER=``;
var userIdent=[``,``];
var instanceId=``;
var chestDataBefore=``;

function init() {
	if (localStorage.scUserIdent!=undefined&&localStorage.scUserIdent!=``) {
		settingsClose.hidden = false;
		userIdent = JSON.parse(localStorage.scUserIdent);
	} else {
		disabledUntilData.hidden = false;
		tabsContainer.hidden = true;
		settingsClose.hidden = true;
		settingsToggle();
	}
	window.addEventListener('hashchange',() =>{
		swapTab();
	});
	swapTab();
}

async function pullFormationSaves() {
	if (userIdent[0]==``||userIdent[1]==``) {
		init();
		return;
	}
	let button = document.getElementById(`formationsPullButton`);
	let message = document.getElementById(`formationsPullButtonDisabled`);
	button.hidden = true;
	message.hidden = false;
	setTimeout (function(){message.hidden = true;button.hidden = false;},20000);
	let wrapper = document.getElementById(`formsWrapper`);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		let forms = await getFormationSaves();
		await displayFormationSaves(wrapper,forms);
	} catch {
		wrapper.innerHTML = BADDATA;
	}
}

async function displayFormationSaves(wrapper,saves) {
	if (saves==undefined||saves.all_saves==undefined) {
		wrapper.innerHTML = `Error.`;
		return;
	}
	let all = saves.all_saves;
	let formObjs = saves.formation_objects;
	let c = ``;
	for (let key of Object.keys(all)) {
		if (key=="-1") continue;
		let id = Number(key);
		let camp = id % 1000;
		let patron = id - camp;
		let formObj = formObjs[`${id}`];
		let campName = campaignIds[`${camp}`];
		if (id > 1000 && id < 1000000)
			campName = formObj.campaign_name;
		if (campName==undefined) campName = `Unknown Campaign ID: ${camp}`;
		let patronName = patron==0?``:patronIds[`${patron}`];
		if (patronName==undefined) patronName=``;
		let patronDisplay = patronName==``?`No Patron`:patronName;
		let temp = `<span style="display:flex;flex-direction:column"><span class="formsCampaignTitle">${campName}<br>${patronDisplay}</span><span class="formsCampaign" id="${key}">`;
		let added = 0;
		for (let formation of all[key]) {
			let formId = formation.formation_save_id;
			let formName = formation.name;
			if (formName == `___AUTO___SAVE___`)
				continue
			let formFav = Number(formation.favorite||0);
			let formLet = (formFav==1?`Q`:(formFav==2?`W`:(formFav==3?`E`:``)));
			let formFeats = Object.prototype.toString.call(formation.feats||[]) != `[object Array]`;
			let extras = ``;
			if (formLet!=``) extras += `Fav: ${formLet}`;
			if (formFeats) {
				if (extras!=``) extras += " / ";
				extras += "Has Feats";
			}
			if (extras!=``) extras = ` (${extras})`;
			let tt=createFormationTooltip(formName+extras,formation.formation,formObjs[`${id}`])
			temp += `<span class="formsCampaignFormation"><input type="checkbox" id="form_${formId}" name="${formName}" data-camp="${campName}" data-extras="${extras}"><label class="cblabel" for="form_${formId}">${formName}${extras}</label>${tt}</span>`;
			added++;
		}
		if (added == 0)
			continue
		temp += `<span class="formsCampaignSelect"><input type="button" onClick="formsSelectAll('${key}',true)" value="Select All"><input type="button" onClick="formsSelectAll('${key}',false)" value="Deselect All"></span></span></span>`;
		c += temp;
	}
	wrapper.innerHTML = c;
	let formsDeleter = document.getElementById(`formsDeleter`);
	formsDeleter.innerHTML = `<span class="f fr w100 p5"><span class="f falc fje mr2 redButton" style="width:50%" id="formationsDeleteRow"><input type="button" onClick="deleteFormationSaves()" name="formationsDeleteButton" id="formationsDeleteButton" style="font-size:0.9em;min-width:180px" value="Delete Selected Formations"></span></span>`;
}

function createFormationTooltip(name,champs,formation) {
	let formObj = ``;
	for (let currForm of formation.game_change_data) {
		if (currForm.type!=undefined&&currForm.type==`formation`) {
			if (currForm.formation == undefined)
				return ``;
			formObj = currForm.formation;
			break;
		}
	}
	if (formObj == ``) {
		for (let currForm of formation.campaign_changes) {
			if (currForm.type!=undefined&&currForm.type==`formation`) {
				if (currForm.formation == undefined)
					return ``;
				formObj = currForm.formation;
				break;
			}
		}
	}
	if (formObj == ``) return ``;
	
	let circleDiameter = 50;
	let colMult = 60;
	let rowMult = 30;
	
	let maxCol = 0;
	let minY = 99999999;
	let maxY = 0;
	for (let currObj of formObj) {
		if (currObj.col > maxCol) maxCol = currObj.col;
		let y = Math.floor(currObj.y / 10);
		if (y < minY) minY = y;
		if (y > maxY) maxY = y;
	}
		
	let formWidth = circleDiameter + (colMult * maxCol);
	let formHeight = circleDiameter + (rowMult * (maxY - minY));
	
	let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${formWidth}" height="${formHeight}">`;
	for (let i=0; i<formObj.length; i++) {
		let currObj = formObj[i];
		let champ = Number(champs[i]);
		if (isNaN(champ) || champ < 0) champ = 0;
		let yPos = Math.floor(currObj.y / 10);
		let x = (maxCol - currObj.col) * colMult;
		let y = (yPos - minY) * rowMult;
		svg += `<image x="${x}" y="${y}" width="${circleDiameter}" height="${circleDiameter}" href="images/portraits/${champ}.png" />`;
	}
	svg += `</svg>`;
	return `<span class="tooltipContents">${name}${svg}</span>`;
}

function formsSelectAll(id,check) {
	var container = document.getElementById(id);
	var cbs = container.querySelectorAll('input[type="checkbox"]');
	for (let cb of cbs)
		cb.checked = check;
}

async function deleteFormationSaves() {
	let formsDeleter = document.getElementById(`formsDeleter`);
	let c = `<span class="f fr w100 p5">Deleting Formation Saves:</span>`;
	formsDeleter.innerHTML = c;
	let list = document.querySelectorAll('[id^="form_"]');
	let count = 0;
	for (let form of list) {
		if (!form.checked) continue;
		count++;
		let id = Number(form.id.replaceAll("form_",""));
		let result = await deleteFormationSave(id);
		sleep(200);
		let extras = form.dataset.extras;
		let successType = ``;
		if (result['success']&&result['okay'])
			successType = `Successfully deleted`;
		else
			successType = `Failed to delete`;
		c += `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:175px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">- ${successType}:</span><span class="f falc fjs ml2" style="flex-grow:1;margin-left:5px;flex-wrap:wrap">${form.name} in ${form.dataset.camp}${extras}</span></span>`;
		form.parentNode.style.display=`none`;
		form.checked = false;
		formsDeleter.innerHTML = c;
	}
	if (count==0) {
		c += `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:175px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">- None</span></span>`;
		formsDeleter.innerHTML = c;
	}
}

async function pullFeatsData() {
	if (userIdent[0]==``||userIdent[1]==``) {
		init();
		return;
	}
	let button = document.getElementById(`featsPullButton`);
	let message = document.getElementById(`featsPullButtonDisabled`);
	button.hidden = true;
	message.hidden = false;
	setTimeout (function(){message.hidden = true;button.hidden = false;},20000);
	let wrapper = document.getElementById(`featsWrapper`);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		let defs = await getDefinitions("hero_defines,hero_feat_defines");
		let details = await getUserDetails();
		await displayFeatsData(wrapper,details,defs);
	} catch {
		wrapper.innerHTML = BADDATA;
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
		let avail = feat.properties.is_available;
		if (avail!=undefined&&!avail)
			continue;
		avail = feat.properties.available_at_time;
		if (avail!=undefined&&avail>now)
			continue;
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
			txt += `<span class="featsChampionList"><input type="checkbox" id="feat_${feat.id}" name="${feat.name}" data-cost="${feat.cost}" onClick="featsRecalcCost()"><label class="cblabel" for="feat_${feat.id}">${feat.name} ${nf(feat.cost)}</label></span>`;
		}
		txt += `<span class="formsCampaignSelect"><input type="button" onClick="featsSelectAll('${id}',true)" value="Select All"><input type="button" onClick="featsSelectAll('${id}',false)" value="Deselect All"></span></span></span>`;
	}
	let featsBuyer = document.getElementById(`featsBuyer`);
	if (txt!=``) {
		wrapper.innerHTML = txt;
		featsBuyer.innerHTML = `<span class="f fc w100 p5"><span class="f falc fjs mr2 p5" style="width:50%;padding-left:15%" id="featsBuyCost">&nbsp;</span><span class="f falc fjs mr2 p5" style="width:50%;padding-left:15%" id="featsBuyAvailable">&nbsp;</span><span class="f falc fje mr2 greenButton" style="width:50%" id="featsBuyRow">&nbsp;</span></span>`;
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
	let featsBuyRow = document.getElementById("featsBuyRow");
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
	var container = document.getElementById(id);
	var cbs = container.querySelectorAll('input[type="checkbox"]');
	for (let cb of cbs)
		cb.checked = check;
	featsRecalcCost();
}

async function buyFeats() {
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
		sleep(200);
		let cost = feat.dataset.cost;
		let successType = ``;
		if (result['success']&&result['okay'])
			successType = `Successfully bought`;
		else
			successType = `Failed to buy`;
		txt += `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:175px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">- ${successType}:</span><span class="f falc fjs ml2" style="flex-grow:1;margin-left:5px;flex-wrap:wrap">${feat.name} (${nf(Number(cost))} gems)</span></span>`;
		feat.parentNode.style.display=`none`;
		feat.checked = false;
		featsBuyer.innerHTML = txt;
	}
	if (count==0) {
		txt += `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:175px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">- None</span></span>`;
		featsBuyer.innerHTML = txt;
	}
}

async function pullShiniesData() {
	if (userIdent[0]==``||userIdent[1]==``) {
		init();
		return;
	}
	let button = document.getElementById(`shiniesPullButton`);
	let message = document.getElementById(`shiniesPullButtonDisabled`);
	button.hidden = true;
	message.hidden = false;
	setTimeout (function(){message.hidden = true;button.hidden = false;},20000);
	let wrapper = document.getElementById(`shiniesWrapper`);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		let userData = await getUserDetails();
		await displayShiniesData(wrapper,userData.details);
	} catch {
		wrapper.innerHTML = BADDATA;
	}
}

async function displayShiniesData(wrapper,details) {
	let tokens = Number(details.stats.event_v2_tokens);
	let chestPacks = tokens / 7500;
	let chests = tokens / 2500;
	let shinies = chests / 1000;
	let bcC = 0;
	let bcU = 0;
	let bcR = 0;
	let bcE = 0;
	for (let buff of details.buffs) {
		let id = Number(buff.buff_id);
		if (id==undefined||id==""||id<17||id>20)
			continue;
		let amount = Number(buff.inventory_amount);
		if (amount==undefined||amount=="")
			continue;
		switch (Number(id)) {
			case 17: bcC = amount; break;
			case 18: bcU = amount; break;
			case 19: bcR = amount; break;
			case 20: bcE = amount; break;
		}
	}
	let bcCT = bcC * 12;
	let bcUT = bcU * 72;
	let bcRT = bcR * 576;
	let bcET = bcE * 1152;
	let tokensB = tokens + bcCT + bcUT + bcRT + bcET;
	let chestPacksB = tokensB / 7500;
	let chestsB = tokensB / 2500;
	let shiniesB = chestsB / 1000;
	let txt = ``;
	txt+=`<span class="f fr w100 p5" style="font-size:1.2em">Without Bounties:</span>`;
	txt+=addShiniesRow(`Tokens:`,nf(tokens));
	txt+=addShiniesRow(`Chest Packs:`,nf(chestPacks));
	txt+=addShiniesRow(`Total Chests:`,nf(chests));
	txt+=addShiniesRow(`Avg Shinies:`,nf(shinies));
	txt+=`<span class="f fr w100 p5">&nbsp;</span>`;
	txt+=`<span class="f fr w100 p5" style="font-size:1.2em">With Bounties:</span>`;
	txt+=addShiniesRow(`Tiny Bounty Contracts:`,nf(bcC),`Tokens:`,nf(bcCT));
	txt+=addShiniesRow(`Small Bounty Contracts:`,nf(bcU),`Tokens:`,nf(bcUT));
	txt+=addShiniesRow(`Medium Bounty Contracts:`,nf(bcR),`Tokens:`,nf(bcRT));
	txt+=addShiniesRow(`Large Bounty Contracts:`,nf(bcE),`Tokens:`,nf(bcET));
	txt+=`<span class="f fr w100 p5">&nbsp;</span>`;
	txt+=addShiniesRow(`Tokens:`,nf(tokensB));
	txt+=addShiniesRow(`Chest Packs:`,nf(chestPacksB));
	txt+=addShiniesRow(`Total Chests:`,nf(chestsB));
	txt+=addShiniesRow(`Avg Shinies:`,nf(shiniesB));
	wrapper.innerHTML = txt;
}

function addShiniesRow(left,right,left2,right2) {
	let txt = `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:25%;min-width:200px;">${left}</span><span class="f falc fje mr2" style="min-width:120px;max-width:140px;">${right}</span>`;
	if (left2!=undefined&&right2!=undefined)
		txt += `<span class="f falc fje mr2" style="min-width:90px;max-width:110px;">${left2}</span><span class="f falc fje mr2" style="min-width:120px;max-width:140px;">${right2}</span>`;
	txt += `</span>`;
	return txt;
}

async function pullAeonData() {
	if (userIdent[0]==``||userIdent[1]==``) {
		init();
		return;
	}
	let button = document.getElementById(`aeonPullButton`);
	let message = document.getElementById(`aeonPullButtonDisabled`);
	button.hidden = true;
	message.hidden = false;
	setTimeout (function(){message.hidden = true;button.hidden = false;},20000);
	let wrapper = document.getElementById(`aeonWrapper`);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		let details = await getPatronDetails();
		await displayAeonData(wrapper,details);
	} catch {
		wrapper.innerHTML = BADDATA;
	}
}

async function displayAeonData(wrapper,details) {
	let aeonData = details.aeon_data;
	let millisecondsTilRollover = Number(aeonData.seconds_until_patron_rollover) * 1000;
	let currPatronId = Number(aeonData.current_patron_id);
	let nextPatronId = Number(aeonData.next_patron_id);
	let currPatron = getPatronNameById(currPatronId);
	let nextPatron = getPatronNameById(nextPatronId);
	let count = 0;
	let goal = 0;
	outerLoop:
	for (let patron of details.patrons) {
		if (patron.patron_id!=currPatronId||patron.unlocked==false||patron.progress_bars==undefined)
			continue;
		for (let prog of patron.progress_bars) {
			if (prog.label != "weekly_challenges_progress")
				continue;
			count = Number(prog.count);
			goal = Number(prog.goal);
			break outerLoop;
		}
	}
	let percent = 0;
	let choreInfo=`Patron Not Unlocked`;
	if (goal>0) {
		percent = ((count / goal) * 100).toFixed(2);
		choreInfo=`${count} / ${goal} (${percent}%)`;
	}

	let col1 = `width:25%;min-width:200px;`;
	let col2 = `width:35%;min-width:250px;`;
	let txt = ``;
	txt+=`<span class="f fr w100 p5" style="font-size:1.2em">Aeon Patron Data:</span>`;
	txt+=addAeonRow(`Current Patron:`,currPatron);
	txt+=addAeonRow(`${currPatron} Weekly Chores:`,choreInfo);
	txt+=addAeonRow(`&nbsp;`,`&nbsp;`);
	txt+=addAeonRow(`Next Patron:`,nextPatron);
	txt+=addAeonRow(`Time 'til Switch:`,getDisplayTime(millisecondsTilRollover));
	wrapper.innerHTML = txt;
}

function addAeonRow(left,right) {
	let txt = `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:25%;min-width:200px;">${left}</span><span class="f falc fjs ml2" style="padding-left:10px;width:35%;min-width:250px;">${right}</span>`;
	txt += `</span>`;
	return txt;
}

async function pullChestCollectData() {
	if (userIdent[0]==``||userIdent[1]==``) {
		init();
		return;
	}
	let button = document.getElementById(`chestCollectPullButton`);
	let message = document.getElementById(`chestCollectPullButtonDisabled`);
	if (chestDataBefore!=``)
		document.getElementById(`chestCollectData2`).innerHTML = `&nbsp;`;
	button.hidden = true;
	message.hidden = false;
	setTimeout (function(){message.hidden = true;button.hidden = false;},20000);
	let wrapper = document.getElementById(`chestCollectWrapper`);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		let details = await getUserDetails();
		if (chestDataBefore==``)
			await displayChestCollectDataPhase1(wrapper,details);
		else
			await displayChestCollectDataPhase2(wrapper,details);
	} catch {
		wrapper.innerHTML = BADDATA;
	}
}

async function displayChestCollectDataPhase1(wrapper,details) {
	document.getElementById(`chestCollectPullButton`).value = `Snapshot the 'After' Chest Data`;
	let chests = details.details.chests;
	//let loot = details.details.loot;
	let buffs = [];
	for (let buff of details.details.buffs) {
		if (!Object.keys(buffValues).includes(""+buff.buff_id))
			continue;
        buffs[buff.buff_id] = buff.inventory_amount;
	}
	chestDataBefore = {'chests':chests,'buffs':buffs};//,'loot':loot};
	let txt=``;
	txt+=`<span class="f fr w100 p5" style="font-size:1.2em">Chest Data Before:</span>`;
	for (let id of Object.keys(chestDataBefore.buffs)) {
		let name=buffValues[""+id];
		let value=chestDataBefore.buffs[id];
		txt+=addShiniesRow(`${name}`,`${nf(value)}`);
	}
	wrapper.innerHTML = txt;
	txt=`<span class="f falc fje mr2" style="width:50%;">
			<input type="button" onClick="pullChestCollectData()" name="chestCollectPullButton2" id="chestCollectPullButton2" value="Snapshot the 'After' Chest Data" style="min-width:175px">
		</span>`;
	document.getElementById(`chestCollectData2`).innerHTML = txt;
}

async function displayChestCollectDataPhase2(wrapper,details) {
	document.getElementById(`chestCollectPullButton`).value = `Snapshot the 'Before' Chest Data`;
	let chests = details.details.chests;
	//let loot = details.details.loot;
	let buffs = [];
	for (let buff of details.details.buffs) {
		if (!Object.keys(buffValues).includes(""+buff.buff_id))
			continue;
        buffs[buff.buff_id] = buff.inventory_amount;
	}
	let chestDataAfter = {'chests':chests,'buffs':buffs};//,'loot':loot};
	
	let txt=``;
	let comma=``;
	
	let chestsReduced = {};
	for (let key in chestDataBefore.chests) {
		let before = chestDataBefore.chests[key] == undefined ? 0 : Number(chestDataBefore.chests[key]);
		let after = chestDataAfter.chests[key] == undefined ? 0 : Number(chestDataAfter.chests[key]);
		if (after < before)
			chestsReduced[key]=(before-after);
	}
	for (let key in chestDataAfter.chests) {
		let before = chestDataBefore.chests[key] == undefined ? 0 : Number(chestDataBefore.chests[key]);
		let after = chestDataAfter.chests[key] == undefined ? 0 : Number(chestDataAfter.chests[key]);
		if (after < before)
			chestsReduced[key]=(before-after);
	}
	let chestTypesOpened = Object.keys(chestsReduced).length;
	if (chestTypesOpened > 1) {
		txt+=`<span class="f fr w100 p5" style="font-size:1.2em">Error:</span>`;
		txt+=`<span class="f fr w100 p5">You've invalidated the dataset by opening multiple chest types.</span>`;
		wrapper.innerHTML = txt;
		chestDataBefore=``;
		return;
	} else if (chestTypesOpened == 0) {
		document.getElementById(`chestCollectPullButton`).value = `Snapshot the 'After' Chest Data`;
		txt+=`<span class="f fr w100 p5" style="font-size:1.2em">Error:</span>`;
		txt+=`<span class="f fr w100 p5">No chests have been opened since the 'Before' snapshot. Open a chest type and try again.</span>`;
		wrapper.innerHTML = txt;
		return;
	}
	txt+=`<span class="f fr w100 p5" style="font-size:1.2em">Chest Data Difference:</span>`;
	let chestOpenedId = Object.keys(chestsReduced)[0];
	let chestOpenedName = ``;
	switch (Number(chestOpenedId)) {
		case 1: chestOpenedName = `Silver`; break;
		case 2: chestOpenedName = `Gold`; break;
		default: chestOpenedName = `???: ${chestOpenedId}`;
	}
	txt+=addShiniesRow(`Chest Type Opened`,`${chestOpenedName}`);
	txt+=addShiniesRow(`Amount Opened`,`${nf(chestsReduced[chestOpenedId])}`);
	comma+=`${chestOpenedId},${chestsReduced[chestOpenedId]}`;
	for (let id of Object.keys(chestDataBefore.buffs)) {
		let name=buffValues[""+id];
		let valueBefore=chestDataBefore.buffs[id];
		let valueAfter=chestDataAfter.buffs[id];
		let diff=valueAfter-valueBefore;
		txt+=addShiniesRow(`${name}`,`${nf(diff)}`);
		comma+=`,${id},${diff}`;
	}
	txt+=addShiniesRow(`&nbsp;`,`&nbsp;`);
	txt+=`<span class="f fr w100 p5"><code style="max-width:100%;color:var(--light3);overflow-wrap:break-word">${comma}</code></span>`;
	wrapper.innerHTML = txt;
	document.getElementById(`chestCollectData2`).innerHTML = `&nbsp;`;
}

function getPatronNameById(id) {
	switch (id) {
		case 1: return `Mirt`;
		case 2: return `Vajra`;
		case 3: return `Strahd`;
		case 4: return `Zariel`
		case 5: return `Elminster`
		default: return `??? (id: ${id})`;
	}
}

function settingsToggle() {
	if (localStorage.scUserIdent==undefined||localStorage.scUserIdent==``) {
		settingsMenu.style.display = `flex`;
		return;
	}
	if (settingsMenu.style.display==`none`||settingsMenu.style.display==``) {
		userId.value = userIdent[0];
		userHash.value = userIdent[1];
		settingsMenu.style.display = `flex`;
	} else {
		settingsMenu.style.display = `none`;
	}
}

async function saveUserData() {
	let userId = settingsUserId.value || ``;
	let userHash = settingsUserHash.value || ``;
	if (userId!=``&&userHash!=``) {
		userIdent[0] = userId;
		userIdent[1] = userHash;
		localStorage.scUserIdent = JSON.stringify(userIdent);
		settingsSave.value = `SAVED`;
		if (settingsClose.hidden)
			settingsClose.hidden = false;
		if (tabsContainer.hidden)
			tabsContainer.hidden = false;
		if (!disabledUntilData.hidden)
			disabledUntilData.hidden = true;
		await new Promise(r => setTimeout(r, 2000));
		settingsSave.value = `Save`;
	} else {
		settingsSave.value = `ERROR`;
		await new Promise(r => setTimeout(r, 2000));
		settingsSave.value = `Save`;
	}
}

async function supportUrlSaveData() {
	let url = supportUrl.value || ``;
	if (url==``)
		return;
	try {
		let userId = Number(url.match(/&user_id=[0-9]+/g)[0].replace("&user_id=",""));
		let userHash = url.match(/&device_hash=[A-Za-z0-9]+/g)[0].replace("&device_hash=","");
		settingsUserId.value = userId;
		settingsUserHash.value = userHash;
		supportUrl.value = ``;
		await saveUserData();
	} catch {
		supportUrl.value = `Couldn't find user data in url.`;
	}
}

function swapTab() {
	var hash = window.location.hash.substring(1);
	if (hash != "" && document.getElementById(hash) != undefined)
		document.getElementById(hash).click();
}

function setHash(hash) {
	hash = "#" + hash;
	if (history.replaceState)
		history.replaceState(null, null, hash);
	else
		window.location.hash = hash;
}

async function getPlayServerFromMaster() {
	let call = `${PARAM_CALL}=getPlayServerForDefinitions`;
	let response = await sendServerCall(M,call);
	SERVER = response['play_server'];
}

async function getUserDetails() {
	let call = `${PARAM_CALL}=getuserdetails`;
	return await sendServerCall(SERVER,call,true);
}

async function getDefinitions(filter) {
	let call = `${PARAM_CALL}=getdefinitions`;
	if (filter!=undefined&&filter!="")
		call += `&filter=${filter}`;
	return await sendServerCall(SERVER,call);
}

async function getPatronDetails() {
	let call = `${PARAM_CALL}=getpatrondetails`;
	return await sendServerCall(SERVER,call,true,true);
}

async function getUpdatedInstanceId(deets) {
	if (deets==undefined)
		deets = await getUserDetails();
	instanceId = deets.details.instance_id;
}

async function getFormationSaves() {
	let call = `${PARAM_CALL}=getallformationsaves`;
	return await sendServerCall(SERVER,call,true,true);
}

async function deleteFormationSave(id) {
	if (id==undefined) return;
	let call = `${PARAM_CALL}=DeleteFormationSave`;
	call += `&formation_save_id=${id}`;
	return await sendServerCall(SERVER,call,true,true);
}

async function purchaseFeat(id) {
    let call = `${PARAM_CALL}=purchasefeat`;
    call += `&feat_id=${id}`;
    return await sendServerCall(SERVER,call,true,true);
}

async function upgradeLegendary(heroId,slotId) {
	let call = `${PARAM_CALL}=upgradelegendaryitem`;
	call += `&hero_id=${heroId}`;
	call += `&slot_id=${slotId}`;
    return await sendServerCall(SERVER,call,true,true);
}

async function trialsRefreshData() {
	let call = `${PARAM_CALL}=trialsrefreshdata`;
	return await sendServerCall(SERVER,call,true,true);
}

async function trialsCreateCampaign(difficultyId,isPrivate,costChoice,autoStart) {
	let call = `${PARAM_CALL}=trialsopencampaign`;
	call += `&difficulty_id=${difficultyId}`;
	call += `&private=${isPrivate}`;
	call += `&cost_choice=${costChoice}`;
	call += `&auto_start=${autoStart}`;
	return await sendServerCall(SERVER,call,true,true);
}

async function trialsJoinCampaign(joinKey,playerIndex) {
	let call = `${PARAM_CALL}=trialsjoincampaign`;
	call += `&join_key=${joinKey}`;
	call += `&player_index=${playerIndex}`;
	return await sendServerCall(SERVER,call,true,true);
}

async function trialsPickRoleHero(roleId,heroId,costChoice) {
	let call = `${PARAM_CALL}=trialspickrolehero`;
	call += `&role_id=${roleId}`;
	call += `&hero_id=${heroId}`;
	call += `&cost_choice=${cost_choice}`;
	return await sendServerCall(SERVER,call,true,true);
}

async function saveFormation(id,name,fav,form,fams,specs,feats) {
    let call = `${PARAM_CALL}=saveformation`;
    call += `&campaign_id=${id}`;
    call += `&name=${name}`;
    call += `&favorite=${fav}`;
    call += `&formation=${form}`;
    call += `&familiars=${fams}`;
    call += `&specializations=${specs}`;
    call += `&feats=${feats}`;
    return await sendServerCall(SERVER,call,true,true);
}

async function purchasePatronShopItem(patronId,shopItemId,count) {
    let call = `${PARAM_CALL}=purchasepatronshopitem`;
    call += `&patron_id=${patronId}`;
    call += `&shop_item_id=${shopItemId}`;
    call += `&count=${count}`;
    return await sendServerCall(SERVER,call,true,true);
}

async function saveModron(coreId,gameInstanceId,buffs) {
    let userDetails = await getUserDetails();
    let modronSave = userDetails.details.modron_saves[coreId];
    let grid = JSON.stringify(modronSave.grid);
    let formationSaves = JSON.stringify(modronSave.formation_saves);
    let areaGoal = modronSave.area_goal;
    let buffsStr = JSON.stringify(buffs);
    let checkinTimestamp = (Date.now() / 1000) + 604800;
    let properties = JSON.stringify(modronSave.properties);
    
    let call = `${PARAM_CALL}=saveModron`;
    call += `&core_id=${coreId}`;
    call += `&grid=${grid}`;
    call += `&game_instance_id=${gameInstanceId}`;
    call += `&formation_saves=${formationSaves}`;
    call += `&area_goal=${areaGoal}`;
    call += `&buffs=${buffsStr}`;
    call += `&checkin_timestamp=${checkinTimestamp}`;
    call += `&properties=${properties}`;
    return await sendServerCall(SERVER,call,true,true);
}

function appendUserData() {
	return `&${PARAM_USERID}=${userIdent[0]}&${PARAM_USERHASH}=${userIdent[1]}`;
}

async function appendInstanceId() {
	if (instanceId==``)
		await getUpdatedInstanceId()
	return `&${PARAM_INSTANCEID}=${instanceId}`;
}

function appendBoilerplate() {
	return `&language_id=1&timestamp=0&request_id=0&mobile_client_version=99999&include_free_play_objectives=true&instance_key=1&offline_v2_build=1&localization_aware=true`;
}

async function sendServerCall(server,call,addUserData,addInstanceId) {
	if (addUserData)
		call += appendUserData();
	if (addInstanceId)
		call += await appendInstanceId();
	call += appendBoilerplate();
	if (server==``) {
		if (SERVER==``)
			await getPlayServerFromMaster();
		server = SERVER;
	}
	let response = await sendOutgoingCall(server,call);
	let limit = 0;
	while ((response[SPS]!=undefined||!response['success'])&&limit<RETRIES) {
		if (response[SPS]) {
			SERVER = response[SPS];
			response = await sendOutgoingCall(SERVER,call);
		} else if (!response['success']) {
			if (response[FR]==OII) {
				console.log(`Got outdated instance id.`);
				let oldII = instanceId;
				await getUpdatedInstanceId();
				console.log(`Old: ${call}`)
				call = call.replace(oldII,instanceId);
				console.log(`New: ${call}`)
				response = await sendOutgoingCall(server,call);
			} else {
				// Unknown error.
				console.log(`Unknown Error: ${response[FR]}`);
				return response;
			}
		}
		limit++;
	}
	return response;
}

async function sendOutgoingCall(server,call) {
	let url = `${server}post.php?${call}`;
	var response = await fetch(url)
		.then(response => response.text())
		.catch(err => console.log(err));
	return await JSON.parse(response);
}

function nf(number) {
	return NUMFORM.format(number);
}

async function monitorElectrums(minSleep,maxSleep) {
    let first = true;
    while (true) {
        if (!first)
            getPlayServerFromMaster();
        let current = (await getUserDetails()).details.chests[282];
        let time = new Date();
        let output = `${dateFormat(time)} -> Electrums: ${current}`;
        let sleep = randInt(minSleep*60, maxSleep*60);
        time.setSeconds(time.getSeconds() + sleep);
        output += `    (Sleeping until: ${dateFormat(time)})`;
        console.log(output);
        if (first)
            first = false;
        await new Promise(r => setTimeout(r, sleep*1000));
    }
}

function randInt(min, max) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled);
}

function dateFormat(input) {
    return Intl.DateTimeFormat("en-GB", {"hour":"2-digit","minute":"2-digit","second":"2-digit"}).format(input);
}

function getDisplayTime(time) {
	let days = Math.floor(time/(1000*60*60*24));
	let hours = Math.floor((time/(1000*60*60)) % 24);
	let minutes = Math.floor((time/1000/60) % 60);
	let seconds = Math.floor((time/1000) % 60);
	let display = ``;
	if (days>0) display += `${days} days `;
	if (days>0||hours>0) display += `${hours} hours `;
	if (days>0||hours>0||minutes>0) display += `${padZeros(minutes,2)} mins `;
	display+= `${padZeros(seconds,2)} secs`;
	return display;
}

function padZeros(num,places) {
	return String(num).padStart(places, '0');
}

function compress(input) {
	return LZString.compress(input);
}

function decompress(input) {
	return LZString.decompress(input);
}

async function sleep(ms) {
	await new Promise(r => setTimeout(r, ms));
}