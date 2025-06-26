const vtm=1.000;
const trialsStatus=`Trials Status:`;
const trialsInact=`Inactive`;
const trialsSil=`Sitting in Lobby`;
const trialsRun=`Running`;
const trialsRew=`Rewards:`;
var roles;
var champsById;
var champsByName;
var diffs;
var trialsTimer;
var trialsTimerAim = 0;

async function tm_pullData() {
	if (isBadUserData())
		return;
	disablePullButtons();
	let wrapper = document.getElementById(`trialsWrapper`);
	wrapper.innerHTML = `Waiting for response...`;
	//try {
		wrapper.innerHTML = `Waiting for trials data...`;
		let trialsData = (await trialsRefreshData()).trials_data;
		wrapper.innerHTML = `Waiting for definitions...`;
		let defs = await getDefinitions("hero_defines,trials_role_defines,trials_difficulty_defines");
		let trialsRoles = defs.trials_role_defines;
		let trialsDiffs = defs.trials_difficulty_defines;
		let champDefs = defs.hero_defines;
		await tm_displayData(wrapper,trialsData,trialsRoles,trialsDiffs,champDefs);
		codeEnablePullButtons();
	//} catch (error) {
	//	handleError(wrapper,error);
	//}
}

async function tm_displayData(wrapper,trialsData,trialsRoles,trialsDiffs,champDefs) {
	let trialsInfo = document.getElementById(`trialsInfo`);
	champsById = getDefsNames(champDefs);
	roles = tm_parseRoles(trialsRoles);
	diffs = tm_parseDiffs(trialsDiffs);
	let campaigns = trialsData.campaigns;
	let campaign = campaigns==undefined||campaigns.length==0?undefined:campaigns[0];
	
	let txt = ``;
	
	// Check if ToMT has been unlocked if highest difficulty is 1.
	if (trialsData!=undefined&&trialsData.highest_available_difficulty!=undefined&&trialsData.highest_available_difficulty==1) {
		wrapper.innerHTML = `Waiting for user data...`;
		let userDetails = (await getUserDetails()).details;
		wrapper.innerHTML = `&nbsp;`;
		if (userDetails.trials_system_unlocked==undefined||userDetails.trials_system_unlocked==0) {
			trialsInfo.innerHTML = `<span class="f w100 p5" style="padding-left:10%">You have not unlocked the Trials of Mount Tiamat system yet.</span>`
			return;
		}
	}
	
	if (trialsData.pending_unclaimed_campaign!=undefined) {
		// Trials reward is claimable.
		
		tm_displayClaimRewards(wrapper,trialsInfo,trialsData,campaign);	
		
	} else if ((trialsData!=undefined&&trialsData.active_campaign_id==0)||campaigns==undefined||campaigns.length!=1||campaigns[0]==undefined) {
		// Trials aren't running and the reward has already been claimed.
		
		let timeUntilNext = Number(trialsData.seconds_until_can_join_campaign || 0);
		tm_displayJoinCreateCampaign(wrapper,trialsInfo,trialsData,timeUntilNext);
		
	} else if (campaign!=undefined&&!campaign.started) {
		// Sitting in lobby.
		
		wrapper.innerHTML = `Waiting for user data...`;
		let detailsHeroes = (await getUserDetails()).details.heroes;
		wrapper.innerHTML = `&nbsp;`;
		champsByName = tm_parseOwnedChampsByName(champsById,detailsHeroes)
		
		tm_displayLobby(wrapper,trialsInfo,campaign,trialsData);
		
	} else if (campaign!=undefined) {
		// Trial is running.
		
		tm_displayRunningTrial(wrapper,trialsInfo,campaign);
		
	} else {
		// No idea what's going on.
		
		wrapper.innerHTML = `&nbsp;`;
		trialsInfo.innerHTML = `<span class="f w100 p5" style="padding-left:10%;text-wrap-style:balance">Congratulations. You shouldn't be able to see this message - but you are. Do me a favour and DM me (Emmote) on Discord please.</span>`
		return;
	}
}

/* ===============================
 * ===== Claim Rewards Stuff =====
 * ===============================
 */

function tm_displayClaimRewards(wrapper,trialsInfo,trialsData,campaign) {
	let campaignId = trialsData.pending_unclaimed_campaign;
	
	let scales = 0;
	let chests = 0;
	let dataset = ` data-campaignid="${campaignId}"`;
	for (let reward of campaign.rewards) {
		if (reward.reward == `chest` && reward.chest_type_id == 323) {
			chests = Number(reward.count || 0);
			dataset+=` data-chests="${chests}"`;
		} else if (reward.reward == `increment_user_stat` && reward.stat == `multiplayer_points`) {
			scales = Number(reward.amount || 0);
			scales = +(Math.round(scales + "e+2")  + "e-2");
			dataset+=` data-scales="${scales}"`;
		}
	}
	
	let txt = tm_addRowHeader(`Claim Rewards`);
	txt+=tm_addRow(`Rewards:`,`${nf(scales)} Scales of Tiamat`);
	txt+=tm_addRow(`&nbsp;`,`${nf(chests)} Glory of Bahamut Chest${chests==1?'':'s'}`);
	wrapper.innerHTML = txt;
	trialsInfo.innerHTML = tm_addGenericButton(`green`,`tm_claimRewards(this)`,`trialsClaimRewardsButton`,`Claim Trials Rewards`,dataset);
}

async function tm_claimRewards(trialsClaimRewardsButton) {
	let trialsInfo = document.getElementById(`trialsInfo`);
	
	trialsClaimRewardsButton.disabled = true;
	disablePullButtons(true);
	let txt = ``;
	
	let campaignId = trialsClaimRewardsButton.dataset.campaignid || 0;
	let scales = trialsClaimRewardsButton.dataset.scales || 0;
	let chests = trialsClaimRewardsButton.dataset.chests || 0;
	if (campaignId == 0) {
		txt+=`<span class="f w100 p5" style="padding-left:10%">Unknown error. Campaign ID is invalid.</span>`;
		trialsInfo.innerHTML = txt;
		return;
	}
	
	txt+=tm_addInfoHeader(`Claiming Rewards`);
	let response = await trialsClaimRewards(campaignId);
	let successType = `Failed to claim`;
	let skinCount = 0;
	if (response.success&&response.okay) {
		successType = `Successfully claimed`;
		for (let reward of response.rewards) {
			if (reward.reward == `increment_user_stat`) {
				let stat = reward.stat;
				if (stat != `multiplayer_points`)
					continue;
				let scales = reward.amount;
				scales = +(Math.round(scales + "e+2")  + "e-2");
			} else if (reward.reward == `chest`) {
				let chestId = reward.chest_type_id;
				if (Number(chestId) != 323)
					continue;
				chests = reward.count;
			} else if (reward.reward == `champion_skin`) {
				skinCount++;
			}
		}
	}
	if (scales > 0)
		txt += tm_addInfoRow(`- ${successType}:`,`${nf(scales)} Scale${scales==1?'':'s'} of Tiamat`);
	if (chests > 0)
		txt += tm_addInfoRow(`- ${successType}:`,`${nf(chests)} Glory of Bahamut Chest${chests==1?'':'s'}`);
	if (skinCount > 0)
		txt += tm_addInfoRow(`- ${successType}:`,`${skinCount==1?'A':skinCount} Champion Skin${skinCount==1?'':'s'}`);
	trialsInfo.innerHTML = txt;
	
	codeEnablePullButtons();
}

/* =============================
 * ===== Join Trials Stuff =====
 * =============================
 */

function tm_displayJoinCreateCampaign(wrapper,trialsInfo,trialsData,timeUntilNext) {
	let timeMS = timeUntilNext*1000;
		
	let txt = tm_addRowHeader(`Join a Lobby`);
	txt += tm_addRow(`Join Key:`,`<input type="text" id="trialsJoinKey" name="trialsJoinKey">`);
	if (timeUntilNext > 0)
		txt += tm_addRow(`&nbsp;`,`<span id="trialsJoinCannotJoinSpan">Available in ${getDisplayTime(timeMS)}</span>`);
	else
		txt += tm_addRow(`&nbsp;`,tm_createJoinButton());
	txt += tm_addRow(`&nbsp;`,`&nbsp;`);
	txt += tm_addRowHeader(`Create a Lobby`);
	txt += tm_addRow(`Difficulty:`,tm_buildDifficultySelect(trialsData.highest_available_difficulty));
	txt += tm_addRow(`Private:`,`<input type="checkbox" id="trialsPrivateCheckbox" checked>`);
	txt += tm_addRow(`Auto Start:`,`<input type="checkbox" id="trialsAutostartCheckbox" checked>`);
	if (timeUntilNext > 0)
		txt += tm_addRow(`&nbsp;`,`<span id="trialsCreateCannotCreateSpan">Available in ${getDisplayTime(timeMS)}</span>`);
	else
		txt += tm_addRow(`&nbsp;`,tm_createCreateButton());
	wrapper.innerHTML = txt;
	
	if (timeUntilNext > 0) {
		trialsTimerAim = new Date().getTime() + timeMS;
		trialsTimer = setInterval(() => {
			let eleJoin = document.getElementById('trialsJoinCannotJoinSpan');
			let eleCreate = document.getElementById('trialsCreateCannotCreateSpan');
			if (eleJoin == null || eleCreate == null) {
				clearInterval(trialsTimer);
				trialsTimerAim = 0;
				return;
			}
			let remaining = trialsTimerAim - new Date().getTime();
			let displayTime = `Available in ${getDisplayTime(remaining)}`;
			eleJoin.innerHTML = displayTime;
			eleCreate.innerHTML = displayTime;
			
			if (remaining < 0) {
				clearInterval(trialsTimer);
				trialsTimerAim = 0;
				eleJoin.outerHTML = tm_createJoinButton();
				eleCreate.outerHTML = tm_createCreateButton();
			}
		}, 1000);
	}
	
	trialsInfo.innerHTML = `&nbsp;`;
}

function tm_createJoinButton() {
	return tm_addGenericButton(`green`,`tm_joinTrial()`,`trialsJoinButton`,`Join Trials Lobby`);
}

function tm_createCreateButton() {
	return tm_addGenericButton(`green`,`tm_createTrial()`,`trialsCreateButton`,`Create Trials Lobby`);
}

function tm_buildDifficultySelect(highestDifficulty) {
	let txt = `<select id="trialsDifficultySelect" name="trialsDifficultySelect">`;
	let diffIds = Object.keys(diffs);
	numSort(diffIds,true);
	for (let diffId of diffIds) {
		if (Number(diffId) > Number(highestDifficulty))
			continue;
		let diffName = diffs[diffId].name;
		let selected = Number(diffId) == Number(highestDifficulty) ? ` selected` : ``;
		txt += `<option value="${diffId}"${selected}>${diffId} - ${diffName}</option>`;
	}
	txt += `</select>`;
	return txt;
}

async function tm_joinTrial() {
	let trialsInfo = document.getElementById(`trialsInfo`);
	let trialsJoinKey = document.getElementById(`trialsJoinKey`);
	
	trialsJoinKey.disabled = true;
	document.getElementById(`trialsJoinButton`).disabled = true;
	disablePullButtons(true);
	
	let txt = trialsInfo.innerHTML;
	if (!txt.includes("Joining a Trial"))
		txt += `<br><br>` + tm_addInfoHeader(`Joining a Trial`);
	
	let joinKey = trialsJoinKey.value;
	let response = await trialsJoinCampaign(joinKey);
	let successType = `Failed to join`;
	if (response.success&response.okay) {
		successType = `Successfully joined`;
		txt = txt.replace(/^.*?(\<br\>){2}/gm,'');
		txt += tm_addInfoRow(`- ${successType}:`,joinKey);
	} else if (response.success && response.fail_message!=undefined) {
		let msg = `${response.fail_message}`;
		if (response.fail_message==`Invalid Join Key`)
			msg += ` ${joinKey}`;
		txt += tm_addInfoRow(`- ${successType}:`,`${msg}.`);
	} else
		txt += tm_addInfoRow(`- ${successType}:`,`&nbsp;`);
	trialsInfo.innerHTML = txt;
	trialsJoinKey.disabled = false;
	try {
		document.getElementById(`trialsJoinButton`).disabled = false;
	} catch (error) {
		// Do nothing
	}
	codeEnablePullButtons();
	
	if (response.success&response.okay)
		tm_pullData();
}

async function tm_createTrial() {
	let trialsInfo = document.getElementById(`trialsInfo`);
	let trialsDifficultySelect = document.getElementById(`trialsDifficultySelect`);
	let trialsPrivateCheckbox = document.getElementById(`trialsPrivateCheckbox`);
	let trialsAutostartCheckbox = document.getElementById(`trialsAutostartCheckbox`);
	
	trialsDifficultySelect.disabled = true;
	trialsPrivateCheckbox.disabled = true;
	trialsAutostartCheckbox.disabled = true;
	document.getElementById(`trialsCreateButton`).disabled = true;
	disablePullButtons(true);
	
	let txt = trialsInfo.innerHTML;
	if (!txt.includes("Creating a Trial"))
		txt += `<br><br>` + tm_addInfoHeader(`Creating a Trial`);
	
	let diffId = trialsDifficultySelect.value;
	let isPrivate = trialsPrivateCheckbox.checked;
	let isAutostart = trialsAutostartCheckbox.checked;
	let response = await trialsCreateCampaign(diffId,isPrivate,0,isAutostart);
	let successType = `Failed to create`;
	if (response.success&response.okay) {
		successType = `Successfully created`;
		txt = txt.replace(/^.*?(\<br\>){2}/gm,'');
		txt += tm_addInfoRow(`- ${successType}:`,`Tier ${diffId} - ${diffs[diffId].name}`);
	} else if (response.success && response.fail_message!=undefined)
		txt += tm_addInfoRow(`- ${successType}:`,`${response.fail_message}.`);
	else
		txt += tm_addInfoRow(`- ${successType}:`,`&nbsp;`);
	trialsInfo.innerHTML = txt;
	trialsDifficultySelect.disabled = false;
	trialsPrivateCheckbox.disabled = false;
	trialsAutostartCheckbox.disabled = false;
	try {
		document.getElementById(`trialsCreateButton`).disabled = false;
	} catch (error) {
		// Do nothing
	}
	codeEnablePullButtons();
	
	if (response.success&response.okay)
		tm_pullData();
}

/* =======================
 * ===== Lobby Stuff =====
 * =======================
 */

function tm_displayLobby(wrapper,trialsInfo,campaign,trialsData) {
	let playersByRole = tm_parsePlayers(campaign);
	let playersByRoleKeys = Object.keys(playersByRole);
	let campaignId = campaign.campaign_id;
	let tier = campaign.difficulty_id;
	let diff = diffs[tier];
	let tierName = diff.name;
	let joinKey = campaign.join_key;
	let priv = campaign.is_private;
	let autoStart = trialsData.auto_start;
	let tiamatHP = diff.hp
	let vialCost = diff.cost;
	let vialInv = [Number(trialsData.difficulty_token_inventory.normal||0),Number(trialsData.difficulty_token_inventory.any||0)];
	let playerName = trialsData.player_name;
	let hasPlayerPicked = false;
	for (let roleId of playersByRoleKeys) {
		if (playersByRole[roleId].name==playerName) {
			hasPlayerPicked = true;
			break;
		}
	}
	
	let txt = tm_addRowHeader(`Trials Data`);
	txt += tm_addRow(`Tier:`,`${tier} (${tierName})`);
	txt += tm_addRow(`Private:`,`${priv?'Yes':'No'}`);
	txt += tm_addRow(`Auto Start:`,`${autoStart?'Yes':'No'}`);
	txt += tm_addRow(`Join Key:`,`<span style="color:var(--AlienArmpit)">${joinKey}</span>`);
	txt += tm_addRow(`Tiamat HP:`,nf(tiamatHP));
	if (!hasPlayerPicked)
		txt += tm_addRow(`Blood Vial Cost:`,nf(vialCost));
	txt += tm_addRow(`&nbsp;`,`&nbsp;`);
	txt += `<span class="f fr w100 p5" style="font-size:1.2em">Players:</span>`;
	for (let roleId of playersByRoleKeys) {
		let roleName = roles[roleId];
		let player = playersByRole[roleId];
		if (player.empty)
			txt += tm_addRow(`${roleName}:`,`-`);
		else
			txt += tm_addRow(`${roleName}:`,player.name,`Champion:`,champsById[player.hero]);
	}
	txt += tm_addRow(`&nbsp;`,`&nbsp;`);
	if (!hasPlayerPicked) {
		txt += `<span class="f fr w100 p5" style="font-size:1.2em">Pick Role and Champion:</span>`;
		txt += tm_addRow(`Choose Role:`,tm_buildRoleChoiceSelect(playersByRoleKeys));
		txt += tm_addRow(`Choose Champion:`,tm_buildChampionChoiceSelect());
		txt += tm_addRow(`Currency:`,tm_buildCostChoiceSelect(vialCost,vialInv));
		txt += tm_addRow(`&nbsp;`,`<span id="trialsPickChampionButtonHolder">&nbsp;</span>`);
	} else {
		let playerIndex = -1;
		for (let index in campaign.players) {
			if (campaign.players[index].name == playerName) {
				playerIndex = index;
				break;
			}
		}
		txt += `<span class="f fr w100 p5" style="font-size:1.2em">Actions:</span>`;
		if (playerIndex == 0)
			txt += tm_addRow(`Start Trial:`,tm_addGenericButton(`red`,`tm_trialsStartTrial(${campaignId})`,`trialsStartTrialButton`,`Start Trial Now`));
		txt += tm_addRow(`Change Role/Champion:`,tm_addGenericButton(`red`,`tm_trialsPickRoleHero(0,0,false)`,`trialsChangeRoleHeroButton`,`Change Role or Champion`));
		if (playerIndex >= 0)
			txt += tm_addRow(`Leave Lobby:`,tm_addGenericButton(`red`,`tm_trialsLeaveLobby(${playerIndex},'${joinKey}')`,`trialsLeaveLobbyButton`,`Leave This Lobby`));
	}
	wrapper.innerHTML = txt;
}

function tm_buildRoleChoiceSelect(playersByRoleKeys) {
	let txt = `<select id="trialsRoleSelect" name="trialsRoleSelect" oninput="tm_updateTrialsPick()"><option value="-1" selected>-</option>`;
	for (let roleId of playersByRoleKeys) {
		let roleName = roles[roleId];
		txt += `<option value="${roleId}">${roleName}</option>`;
	}
	txt += `</select>`;
	return txt;
}

function tm_buildChampionChoiceSelect() {
	let txt = `<select id="trialsChampionSelect" name="trialsChampionSelect" oninput="tm_updateTrialsPick()"><option value="-1" selected>-</option>`;
	let names = Object.keys(champsByName);
	names.sort();
	for (let name of names) {
		let champId = champsByName[name];
		txt += `<option value="${champId}">${name}</option>`;
	}
	txt += `</select>`;
	return txt;
}

function tm_buildCostChoiceSelect(vialCost,vialInv) {
	let txt = `<select id="trialsCostSelect" name="trialsCostSelect" oninput="tm_updateTrialsPick()">`;
	txt += `<option value="${vialInv[0]>=vialCost?0:-1}"${vialInv[0]>=vialCost?' selected':''}>${nf(vialCost)} Lesser Blood Vial${vialCost==1?'':'s'} (Have: ${vialInv[0]})</option>`;
	if (vialCost > 0)
		txt += `<option value="${vialInv[1]>0?1:-1}"${vialInv[0]<vialCost&&vialInv[1]>0?' selected':''}>1 Prismatic Blood Vial (Have: ${vialInv[1]})</option>`;
	txt += `</select>`;
	return txt;
}

function tm_updateTrialsPick() {
	let trialsRoleSelect = document.getElementById(`trialsRoleSelect`);
	let trialsChampionSelect = document.getElementById(`trialsChampionSelect`);
	let trialsCostSelect = document.getElementById(`trialsCostSelect`);
	let trialsPickChampionButtonHolder = document.getElementById(`trialsPickChampionButtonHolder`);
	
	let txt = ``;
	if (trialsRoleSelect.value==-1||trialsChampionSelect.value==-1) {
		// Haven't picked a role or champion.
		txt = `You need to pick a role and champion.`;
	} else if (trialsCostSelect.value==-1) {
		// Not enough vials.
		txt = `You do not have enough of the chosen vial to start a Trial.`;
	} else {
		// Can pick.
		let roleId = trialsRoleSelect.value;
		let heroId = trialsChampionSelect.value;
		let prismatic = trialsCostSelect.value == 1 ? true : false;
		txt = tm_addGenericButton(`green`,`tm_trialsPickRoleHero(${roleId},${heroId},${prismatic})`,`trialsPickRoleHeroButton`,`Pick Role and Champion`);
	}
	trialsPickChampionButtonHolder.innerHTML = txt;
}

async function tm_trialsPickRoleHero(roleId,heroId,prismatic) {
	let trialsInfo = document.getElementById(`trialsInfo`);
	let trialsRoleSelect = document.getElementById(`trialsRoleSelect`);
	let trialsChampionSelect = document.getElementById(`trialsChampionSelect`);
	let trialsCostSelect = document.getElementById(`trialsCostSelect`);
	let trialsPickRoleHeroButton = document.getElementById(`trialsPickRoleHeroButton`);
	let trialsStartTrialButton = document.getElementById(`trialsStartTrialButton`);
	let trialsChangeRoleHeroButton = document.getElementById(`trialsChangeRoleHeroButton`);
	let trialsLeaveLobbyButton = document.getElementById(`trialsLeaveLobbyButton`);
	
	let type = `pick`;
	if (roleId == 0 && heroId == 0 && !prismatic) {
		if (trialsStartTrialButton!=null)
			trialsStartTrialButton.disabled = true;
		trialsChangeRoleHeroButton.disabled = true;
		trialsLeaveLobbyButton.disabled = true;
		type = `unpick`;
	} else {
		trialsRoleSelect.disabled = true;
		trialsChampionSelect.disabled = true;
		trialsCostSelect.disabled = true;
		trialsPickRoleHeroButton.disabled = true;
	}
	disablePullButtons(true);
	
	let txt = trialsInfo.innerHTML;
	if (!txt.includes("Picking Role and Hero"))
		txt += `<br><br>` + tm_addInfoHeader(`Picking Role and Hero`);
	
	let response = await trialsPickRoleHero(roleId,heroId,prismatic);
	let successType = `Failed to ${type}`;
	if (response.success&response.okay) {
		successType = `Successfully ${type}ed`;
		txt = txt.replace(/^.*?(\<br\>){2}/gm,'');
		txt += tm_addInfoRow(`- ${successType}:`,type==`pick`?`${champsById[heroId]} to assault the ${roles[roleId]}`:`Assault location and champion`);
	} else if (response.success && response.fail_message!=undefined) {
		let msg = response.fail_message;
		if (response.fail_message==`Unable to choose Trial or Champion`)
			msg = `Role or Champion already chosen`;
		txt += tm_addInfoRow(`- ${successType}:`,`${msg}.`);
	} else
		txt += tm_addInfoRow(`- ${successType}`,`&nbsp;`);
	trialsInfo.innerHTML = txt;
	if (roleId == 0 && heroId == 0 && !prismatic) {
		trialsChangeRoleHeroButton.disabled = false;
		trialsLeaveLobbyButton.disabled = false;
	} else {
		trialsRoleSelect.disabled = false;
		trialsChampionSelect.disabled = false;
		trialsCostSelect.disabled = false;
		trialsPickRoleHeroButton.disabled = false;
	}
	codeEnablePullButtons();
	
	if (response.success&response.okay)
		tm_pullData();
}

async function tm_trialsLeaveLobby(playerIndex,joinKey) {
	let trialsInfo = document.getElementById(`trialsInfo`);
	let trialsStartTrialButton = document.getElementById(`trialsStartTrialButton`);
	let trialsChangeRoleHeroButton = document.getElementById(`trialsChangeRoleHeroButton`);
	let trialsLeaveLobbyButton = document.getElementById(`trialsLeaveLobbyButton`);
	
	if (trialsStartTrialButton!=null)
		trialsStartTrialButton.disabled = true;
	trialsChangeRoleHeroButton.disabled = true;
	trialsLeaveLobbyButton.disabled = true;
	disablePullButtons(true);
	
	let txt = tm_addInfoHeader(`Leaving the Lobby`);
	
	let response = await trialsKickPlayer(playerIndex);
	let successType = `Failed to leave`;
	if (response.success&response.okay) {
		successType = `Successfully left`;
	}
	txt += tm_addInfoRow(`- ${successType}:`,`${joinKey}`);
	trialsInfo.innerHTML = txt;
	codeEnablePullButtons();
	
	if (response.success&response.okay)
		tm_pullData();
}

async function tm_trialsStartTrial(campaignId) {
	let trialsInfo = document.getElementById(`trialsInfo`);
	let trialsStartTrialButton = document.getElementById(`trialsStartTrialButton`);
	let trialsChangeRoleHeroButton = document.getElementById(`trialsChangeRoleHeroButton`);
	let trialsLeaveLobbyButton = document.getElementById(`trialsLeaveLobbyButton`);
	
	let txt = tm_addInfoHeader(`Starting the Trial`);
	
	let response = await trialsStartCampaign(campaignId);
	let successType = `Failed to start`;
	if (response.success&response.okay) {
		successType = `Successfully started`;
	}
	txt += tm_addInfoRow(`- ${successType}`,`&nbsp;`);
	trialsInfo.innerHTML = txt;
	codeEnablePullButtons();
	
	if (response.success&response.okay)
		tm_pullData();
}

/* ================================
 * ===== Running Trials Stuff =====
 * ================================
 */

function tm_displayRunningTrial(wrapper,trialsInfo,campaign) {
	let playersByRole = tm_parsePlayers(campaign,roles);
	let playersByRoleKeys = Object.keys(playersByRole);
	let tier = campaign.difficulty_id;
	let diff = diffs[tier];
	let tierName = diff.name;
	let day = campaign.current_day;
	let dayEnds = getDisplayTime(campaign.day_ends_in*1000);
	let tiamatHP = diff.hp - campaign.total_damage_done
	let dps = 0;
	for (let roleId of playersByRoleKeys)
		dps += playersByRole[roleId].dps;
	
	let txt = tm_addRowHeader(`Trials Data`);
	txt += tm_addRow(`Tier:`,`${tier} (${tierName})`);
	txt += tm_addRow(`Day:`,`${day} (Ends in: ${dayEnds})`);
	txt += tm_addRow(`Tiamat HP:`,nf(tiamatHP));
	txt += tm_addRow(`Current DPS:`,nf(dps));
	txt += tm_addRow(`Estimated Time to Die:`,dps==0?`Never`:`${getDisplayTime((tiamatHP/dps)*1000)}`);
	txt += tm_addRow(`&nbsp;`,`&nbsp;`);
	txt += `<span class="f fr w100 p5" style="font-size:1.2em">Players:</span>`;
	for (let roleId of playersByRoleKeys) {
		let roleName = roles[roleId];
		let player = playersByRole[roleId];
		if (player.empty)
			txt += tm_addRow(`${roleName}:`,`-`);
		else
			txt += tm_addRow(`${roleName}:`,player.name,`DPS:`,nf(player.dps));
	}
	wrapper.innerHTML = txt;
}

/* ======================
 * ===== Misc Stuff =====
 * ======================
 */
 
function tm_parseRoles(trialsRoles) {
	roles = {};
	for (let role of trialsRoles)
		roles[role.id] = role.name.replace(/ .*/,'');
	return roles;
}

function tm_parseDiffs(trialsDiffs) {
	diffs = {};
	for (let diff of trialsDiffs) {
		let cost = 0;
		for (let curr of diff.cost) {
			if (curr.cost==`trials_difficulty_token`&&curr.difficulty_token_id==`normal`&&curr.amount!=undefined) {
				cost = curr.amount;
				break;
			}
		}
		diffs[diff.id] = {name:diff.name,cost:cost,hp:Number(diff.tiamat_health),scales:Number(diff.points)};
	}
	return diffs;
}

function tm_parseOwnedChampsByName(champsById,detailsHeroes) {
	let ownedIds = [];
	for (let ownedHero of detailsHeroes)
		if (ownedHero.owned == 1)
			ownedIds.push(Number(ownedHero.hero_id));
	let ownedByName = {};
	for (let heroId of Object.keys(champsById))
		if (ownedIds.includes(Number(heroId)))
			ownedByName[champsById[heroId]] = Number(heroId);
	return ownedByName;
}

function tm_parsePlayers(campaign) {
	let players = {};
	let roleIds = Object.keys(roles);
	for (let roleId of roleIds)
		players[roleId] = {name:``,dps:0,empty:true,hero:0};
	for (let player of campaign.players) {
		if (player.role_id==0)
			continue;
		players[player.role_id] = {name:player.name,dps:Number(player.dps),empty:false,hero:Number(player.hero_id)};
	}
	return players;
}

function tm_addRowHeader(txt) {
	return `<span class="f fr w100 p5" style="font-size:1.2em">${txt}:</span>`;
}

function tm_addRow(left,right,left2,right2) {
	let hasLeftAndRight2 = left2!=undefined&&right2!=undefined;
	let txt = `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:25%;min-width:200px;">${left}</span><span class="f falc fjs mr2${right.includes('input type="checkbox')?' greenCheckbox':''}" style="width:${hasLeftAndRight2?200:400}px;padding-left:10px">${right}</span>`;
	if (hasLeftAndRight2) {
		txt += `<span class="f falc fje mr2" style="width:${left2.includes("Champion")?'85':'50'}px;">${left2}</span><span class="f falc fj${left2.includes("Champion")?'s':'e'} mr2" style="min-width:70px;max-width:100px;${left2.includes("Champion")?'padding-left:10px;':''}">${right2}</span>`;
	}
	txt += `</span>`;
	return txt;
}

function tm_addInfoHeader(txt) {
	return `<span class="f fr w100 p5">${txt}:</span>`;
}

function tm_addInfoRow(left,right) {
	let rightAdd = ``;
	if (right!=undefined)
		rightAdd = `<span class="f falc fjs ml2" style="flex-grow:1;margin-left:5px;flex-wrap:wrap">${right}</span>`;
	return `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:175px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">${left}</span>${rightAdd}</span>`;
}

function tm_addGenericButton(colour,clicky,name,val,extras) {
	return `<span class="f fr w100 p5"><span class="f falc fje mr2${colour!=""?" "+colour+"Button":""}" style="width:50%"><input type="button" onClick="${clicky}" name="${name}" id="${name}" style="font-size:0.9em;min-width:180px" value="${val}"${extras!=undefined?extras:''}></span></span>`;
}