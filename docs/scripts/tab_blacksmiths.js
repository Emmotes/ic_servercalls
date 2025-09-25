const vbs=1.014;
var ownedChamps={};
var ownedChampsByName={};
var champLoot={};
var blacksmiths={};
var lootDefs={};

async function bs_pullBSCData() {
	if (isBadUserData())
		return;
	disablePullButtons();
	let wrapper = document.getElementById(`bscWrapper`);
	wrapper.innerHTML = `Waiting for response...`;
	let bscSpender = document.getElementById(`bscSpender`);
	bscSpender.innerHTML = `&nbsp;`;
	let wrapperType = document.getElementById(`bscWrapperType`);
	wrapperType.style.visibility = `hidden`;
	wrapperType.innerHTML = `&nbsp;`;
	try {
		wrapper.innerHTML = `Waiting for user data...`;
		let details = (await getUserDetails()).details;
		wrapper.innerHTML = `Waiting for definitions...`;
		let defs = (await getDefinitions("hero_defines,buff_defines,loot_defines"));
		await bs_displayBSCData(wrapper,details,defs);
		codeEnablePullButtons();
	} catch (error) {
		handleError(wrapper,error);
	}
}

async function bs_displayBSCData(wrapper,details,defs) {
	let bscSpender = document.getElementById(`bscSpender`);
	
	bs_parseOwnedChamps(defs.hero_defines,details.heroes);
	bs_parseLoot(details.loot);
	bs_parseBlacksmiths(details.buffs,defs.buff_defines);
	bs_parseLootDefs(defs.loot_defines);
	
	wrapper.innerHTML = `&nbsp;`;
	if (Object.keys(ownedChamps).length == 0) {
		bscSpender.innerHTML = `<span class="f w100 p5" style="padding-left:10%">You don't have any champions you can apply blacksmith contracts to.</span>`
		return;
	}
	let totalAmountOfiLvls = bs_calculateTotaliLvlsCanSpend();
	if (totalAmountOfiLvls == 0) {
		bscSpender.innerHTML = `<span class="f w100 p5" style="padding-left:10%">You don't have any blacksmiths available to spend.</span>`
		return;
	}
	
	let txt = ``;
	txt+=bs_addBlacksmithsRow(`Available Blacksmiths:`);
	for (let key of Object.keys(blacksmiths)) {
		let bs = blacksmiths[key];
		txt+=bs_addBlacksmithsRowShort(`${bs.sname}`,nf(bs.amount),`bscAmounts${key}`,bs.amount);
	}
	txt+=bs_addBlacksmithsRowShort(`Available iLvls:`,nf(totalAmountOfiLvls),`bscTotaliLvls`,totalAmountOfiLvls);
	txt+=bs_addBlacksmithsRow(`&nbsp;`,`&nbsp;`);
	let s=`<select name="bscMethodList" id="bscMethodList" oninput="bs_displayBSCType(this.value);"><option value="-1" selected>-</option><option value="general">General</option><option value="average">Average</option><option value="specific">Specific</option></select>`;
	txt+=bs_addBlacksmithsRow(`Method:`,s);
	wrapper.innerHTML = txt;
	bs_displayBSCType();
}

function bs_displayBSCType(val) {
	let wrapper = document.getElementById(`bscWrapperType`);
	let bscSpender = document.getElementById(`bscSpender`);
	let txt=`&nbsp;`;
	if (val == `general`)
		txt=bs_displayBSCGeneral(wrapper);
	else if (val == `average`)
		txt=bs_displayBSCAverage(wrapper);
	else if (val == `specific`)
		txt=bs_displayBSCSpecific(wrapper);
	else {
		wrapper.innerHTML = txt;
		bscSpender.innerHTML = txt;
	}
	wrapper.style.visibility = ``;
}

function bs_displayBSCGeneral(wrapper) {
	type=`General`;
	let txt=``;
	let s=`<select name="bscContractList" id="bscContractList" oninput="bs_updateBSCSlider(this.value);bs_displayBSCSpend${type}Button();"><option value="-1">-</option>`;
	let ids = Object.keys(blacksmiths);
	numSort(ids);
	for (let id of ids)
		s+=`<option value="${id}">${blacksmiths[id].sname}</option>`;
	s+=`</select>`;
	let a=`<input type="range" min="0" max="0" step="1" value="0" name="bscContractSlider" id="bscContractSlider" oninput="bs_updateBSCSliderValue(this.value,this.dataset.type);bs_displayBSCSpendGeneralButton();" data-type="-1" style="min-width:80%"><label style="padding-left:10px;text-wrap:nowrap" for="bscContractSlider" id="bscContractSliderLabel">0</label>`;
	txt+=bs_addBlacksmithsRow(`Champion:`,bs_bscGenerateChampionSelect(type));
	txt+=bs_addBlacksmithsRow(`Contract:`,s);
	txt+=bs_addBlacksmithsRow(`Amount:`,a);
	wrapper.innerHTML = txt;
	bs_displayBSCSpendGeneralButton();
	return txt;
}

function bs_displayBSCSpendGeneralButton() {
	let bscSpender = document.getElementById(`bscSpender`);
	let bscChampionList = document.getElementById(`bscChampionList`);
	let bscContractList = document.getElementById(`bscContractList`);
	let bscContractSlider = document.getElementById(`bscContractSlider`);
	let txt=``;
	if (bscChampionList.value=="-1"||bscContractList.value=="-1"||bscContractSlider.value==0) {
		txt+=`<span class="f w100 p5" style="padding-left:10%">Cannot spend blacksmiths until a valid Champion / Contract / Amount has been selected.</span>`;
	} else {
		txt+=`<span class="f fr w100 p5"><span class="f falc fje mr2 redButton" style="width:50%" id="bscSpenderRow"><input type="button" onClick="bs_bscSpendGeneral()" name="bscSpendGeneralButton" id="bscSpendGeneralButton" style="font-size:0.9em;min-width:180px" value="Spend ${nf(bscContractSlider.value)} ${blacksmiths[bscContractList.value].sname} BSC on ${ownedChamps[bscChampionList.value]}"></span></span>`;
	}
	bscSpender.innerHTML = txt;
}

async function bs_bscSpendGeneral() {
	let bscSpender = document.getElementById(`bscSpender`);
	let bscMethodList = document.getElementById(`bscMethodList`);
	let bscChampionList = document.getElementById(`bscChampionList`);
	let bscContractList = document.getElementById(`bscContractList`);
	let bscContractSlider = document.getElementById(`bscContractSlider`);
	let spending=``;
	let txt=``;
	if (bscChampionList==undefined||bscChampionList.value=="-1"||bscContractList==undefined||bscContractList.value=="-1"||bscContractSlider==undefined||bscContractSlider.value==0) {
		txt+=`<span class="f w100 p5" style="padding-left:10%">Unknown error. Didn't spend any blacksmiths.</span>`;
		bscSpender.innerHTML = txt;
		return;
	}
	bscMethodList.disabled = true;
	bscChampionList.disabled = true;
	bscContractList.disabled = true;
	bscContractSlider.disabled = true;
	disablePullButtons(true);
	
	let champId = bscChampionList.value;
	let champName = ownedChamps[champId];
	let bscId = bscContractList.value;
	let bsc=blacksmiths[bscId];
	let bscName = bsc.name;
	let bscMainLabel = document.getElementById(`bscAmounts${bscId}`);
	let bscTotaliLvls = document.getElementById(`bscTotaliLvls`);
	
	let amount = bscContractSlider.value;
	let initAmount = amount;
	
	let lootTxt=bs_addChampioniLvlsRows(champId,champName,-1);
	spending=bs_makeSpendingRow(amount,bscName,champName,initAmount);
	if (amount==0) {
		txt += bs_addBlacksmithsResultRow(`- None`);
		bscSpender.innerHTML = lootTxt + spending + txt;
		return;
	}
	let numFails=0;
	bscSpender.innerHTML = lootTxt + spending + txt;
	while (amount > 0 && numFails < RETRIES) {
		let toSpend = Math.min(1000,amount);
		let result = await useServerBuff(bscId,champId,0,toSpend);
		let successType = `Failed to spend`;
		if (JSON.stringify(result).includes(`You do not have enough`)) {
			txt += bs_addBlacksmithsResultRow(`- ${successType}:`,`Not enough contracts.`);
			spending=bs_makeSpendingRow(0,bscName,champName,initAmount);
			bscSpender.innerHTML = lootTxt + spending + txt;
			codeEnablePullButtons();
			return;
		}
		if (result['success']&&result['okay']) {
			successType = `Successfully spent`;
			let remaining = result.buffs_remaining;
			amount -= toSpend;
			bscMainLabel.innerHTML = nf(remaining);
			bscMainLabel.dataset.value = remaining;
			bscContractSlider.max = remaining;
			bscContractSlider.value = amount;
			bs_updateBSCSliderValue(amount,bscId);
			blacksmiths[bscId].amount = remaining;
			let totalAmountOfiLvls = bs_calculateTotaliLvlsCanSpend();
			bscTotaliLvls.innerHTML = nf(totalAmountOfiLvls);
			bscTotaliLvls.dataset.value = totalAmountOfiLvls;
			let newLoot = bs_parseActions(result.actions,champId);
			lootTxt = bs_addChampioniLvlsRows(champId,champName,-1,newLoot);
		} else
			numFails++;
		spending=bs_makeSpendingRow(amount,bscName,champName,initAmount);
		let plural=toSpend==1?``:`s`;
		txt += bs_addBlacksmithsResultRow(`- ${successType}:`,`${toSpend} ${bscName}${plural} on ${champName}`);
		bscSpender.innerHTML = lootTxt + spending + txt;
	}
	spending=bs_makeSpendingRow(amount,bscName,champName,initAmount);
	txt += bs_addBlacksmithsResultRow(`Finished.`);
	bscSpender.innerHTML = lootTxt + spending + txt;
	
	bscMethodList.disabled = false;
	bscChampionList.disabled = false;
	bscContractList.disabled = false;
	bscContractSlider.disabled = false;
	codeEnablePullButtons();
	
	if (numFails >= RETRIES) {
		txt += bs_addBlacksmithsResultRow(`- Stopping:`,`Got too many failures.`);
		spending=bs_makeSpendingRow(0,bscName,champName,initAmount);
		txt += bs_addBlacksmithsResultRow(`Finished.`);
		bscSpender.innerHTML = lootTxt + spending + txt;
		return;
	}
	
	let oldChampLoot = champLoot;
	let details = (await getUserDetails()).details;
	bs_parseLoot(details.loot);
	let newChampLoot = champLoot;
	let newLoot = [0,0,0,0,0,0];
	for (let slot of Object.keys(champLoot[champId]))
		newLoot[Number(slot)-1] = champLoot[champId][slot].ilvl;
	champLoot = oldChampLoot;
	lootTxt = bs_addChampioniLvlsRows(champId,champName,-1,newLoot,true);
	bscSpender.innerHTML = lootTxt + spending + txt;
	champLoot = newChampLoot;
}

function bs_displayBSCAverage(wrapper) {
	type=`Average`;
	let txt=``;
	let a=`<input type="number" value="0" name="bscContractAverage" id="bscContractAverage" oninput="bs_displayBSCSpendAverageButton();">`;
	txt+=bs_addBlacksmithsRow(`Champion:`,bs_bscGenerateChampionSelect(type));
	txt+=bs_addBlacksmithsRow(`Current Average iLvl:`,`-`,`bscCurrentAverage`,-1);
	txt+=bs_addBlacksmithsRow(`Average iLvl Goal:`,a);
	txt+=bs_addBlacksmithsRow(`It is recommended that you have a bunch of Tiny and Small Blacksmithing Contracts available when using this method.`).replace(`width:60%;min-width:250px;font-size:1.2em`,`min-width:250px;color:var(--TangerineYellow)`);
	wrapper.innerHTML = txt;
	bs_displayBSCSpendAverageButton();
	return txt;
}

function bs_displayCurrentAverage(champId) {
	let bscCurrentAverage = document.getElementById(`bscCurrentAverage`);
	let bscContractAverage = document.getElementById(`bscContractAverage`);
	if (champId=="-1") {
		bscCurrentAverage.innerHTML = `-`;
		bscCurrentAverage.dataset.value = -1;
		bscContractAverage.value = 0;
	} else {
		let currAvg = bs_parseCurrentTotal(champId) / 6;
		bscCurrentAverage.innerHTML = nf(currAvg);
		bscCurrentAverage.dataset.value = currAvg;
		bscContractAverage.value = Math.floor(currAvg);
	}
}

function bs_displayBSCSpendAverageButton() {
	let bscSpender = document.getElementById(`bscSpender`);
	let bscChampionList = document.getElementById(`bscChampionList`);
	let bscCurrentAverage = document.getElementById(`bscCurrentAverage`);
	let bscContractAverage = document.getElementById(`bscContractAverage`);
	let txt=``;
	
	if (bscChampionList.value=="-1"||bscContractAverage.value<=0) {
		txt+=`<span class="f w100 p5" style="padding-left:10%">Cannot spend blacksmiths until a valid Champion / Average iLvl Goal has been chosen.</span>`;
	} else {
		let currTotal = bs_parseCurrentTotal(bscChampionList.value);
		let currAvg = currTotal / 6;
		let needed = (bscContractAverage.value*6) - currTotal;
		let canSpend = bs_calculateTotaliLvlsCanSpend();
		bscCurrentAverage.innerHTML = nf(currAvg);
		bscCurrentAverage.dataset.value = currAvg;
		if (needed <= 0) {
			txt+=`<span class="f w100 p5" style="padding-left:10%">You already have more than that (${nf(currAvg)}).</span>`;
		} else {
			if (needed > canSpend)
				txt+=`<span class="f w100 p5" style="padding-left:10%;color:var(--TangerineYellow)">Not enough contracts to reach this goal. ${nf(needed)} ilvl${needed==1?' is':'s are'} required.</span>`;
			txt+=`<span class="f fr w100 p5"><span class="f falc fje mr2 redButton" style="width:50%" id="bscSpenderRow"><input type="button" onClick="bs_bscSpendAverage(${needed})" name="bscSpendAverageButton" id="bscSpendAverageButton" style="font-size:0.9em;min-width:180px" value="Spend ${nf(needed)} iLvls on ${ownedChamps[bscChampionList.value]} to Reach Goal"></span></span>`;
		}
	}
	bscSpender.innerHTML = txt;
}

async function bs_bscSpendAverage(amountToSpend) {
	let bscSpender = document.getElementById(`bscSpender`);
	let bscTotaliLvls = document.getElementById(`bscTotaliLvls`);
	let bscMethodList = document.getElementById(`bscMethodList`);
	let bscChampionList = document.getElementById(`bscChampionList`);
	let bscCurrentAverage = document.getElementById(`bscCurrentAverage`);
	let bscContractAverage = document.getElementById(`bscContractAverage`);
	let spending=``;
	let txt=``;
	if (bscChampionList==undefined||bscChampionList.value=="-1"||bscContractAverage==undefined||bscContractAverage.value<=0) {
		txt+=`<span class="f w100 p5" style="padding-left:10%">Unknown error. Didn't spend any blacksmiths.</span>`;
		bscSpender.innerHTML = txt;
		codeEnablePullButtons();
		return;
	}
	bscMethodList.disabled = true;
	bscChampionList.disabled = true;
	bscContractAverage.disabled = true;
	disablePullButtons(true);
	
	let champId = bscChampionList.value;
	let champName = ownedChamps[champId];
	let totalAmountOfiLvls = bs_calculateTotaliLvlsCanSpend();
	bscTotaliLvls.innerHTML = nf(totalAmountOfiLvls);
	bscTotaliLvls.dataset.value = totalAmountOfiLvls;
	
	amountToSpend = Math.min(totalAmountOfiLvls,amountToSpend);
	let bscsToUse = bs_parseBlacksmithsToUse(amountToSpend);
	
	if (bscsToUse==undefined) {
		txt+=`<span class="f w100 p5" style="padding-left:10%">Couldn't calculate a combination of blacksmiths to use to reach the average perfectly. Please make sure you have some of the smaller blacksmith contracts available.</span>`;
		bscSpender.innerHTML = txt;
		codeEnablePullButtons();
		return;
	}
	
	let currSpend = amountToSpend;
	let bscIds = Object.keys(bscsToUse);
	numSort(bscIds,true);
		
	
	let lootTxt=bs_addChampioniLvlsRows(champId,champName,-1);
	let numFails=0;
	for (let bscId of bscIds) {
		let amount = bscsToUse[bscId];
		let initAmount = amount;
		
		let bsc=blacksmiths[bscId];
		let bscName = bsc.name;
		let bscMainLabel = document.getElementById(`bscAmounts${bscId}`);
		
		lootTxt=bs_addChampioniLvlsRows(champId,champName,-1);
		spending=bs_makeSpendingRow(amount,bscName,champName,initAmount);
		if (amount==0)
			continue;
		
		bscSpender.innerHTML = lootTxt + spending + txt;
		while (amount > 0 && numFails < RETRIES) {
			let toSpend = Math.min(1000,amount);
			let result = await useServerBuff(bscId,champId,0,toSpend);
			let successType = `Failed to spend`;
			if (JSON.stringify(result).includes(`You do not have enough`)) {
				txt += bs_addBlacksmithsResultRow(`- ${successType}:`,`Not enough contracts.`);
				spending=bs_makeSpendingRow(0,bscName,champName,initAmount);
				bscSpender.innerHTML = lootTxt + spending + txt;
				codeEnablePullButtons();
				return;
			}
			if (result['success']&&result['okay']) {
				successType = `Successfully spent`;
				let remaining = result.buffs_remaining;
				amount -= toSpend;
				bscMainLabel.innerHTML = nf(remaining);
				bscMainLabel.dataset.value = remaining;
				let spendValue = toSpend * blacksmiths[bscId].iLvls;
				currSpend -= spendValue;
				let newAvg = Number(bscCurrentAverage.dataset.value) + (spendValue / 6);
				bscCurrentAverage.innerHTML = nf(newAvg);
				bscCurrentAverage.dataset.value = newAvg;
				blacksmiths[bscId].amount = remaining;
				totalAmountOfiLvls = bs_calculateTotaliLvlsCanSpend();
				bscTotaliLvls.innerHTML = nf(totalAmountOfiLvls);
				bscTotaliLvls.dataset.value = totalAmountOfiLvls;
				let newLoot = bs_parseActions(result.actions,champId);
				lootTxt = bs_addChampioniLvlsRows(champId,champName,-1,newLoot);
			} else
				numFails++;
			spending=bs_makeSpendingRow(amount,bscName,champName,initAmount);
			let plural=toSpend==1?``:`s`;
			txt += bs_addBlacksmithsResultRow(`- ${successType}:`,`${toSpend} ${bscName}${plural} on ${champName}`);
			bscSpender.innerHTML = lootTxt + spending + txt;
			if (totalAmountOfiLvls==0) {
				txt += bs_addBlacksmithsResultRow(`- Failed to spend:`,`Ran out of contracts.`);
				txt=`<span class="f w100 p5" style="padding-left:10%">You have no more blacksmith ilvls left to spend.</span>`+txt;
				bscSpender.innerHTML = lootTxt + txt;
				codeEnablePullButtons();
				return;
			}
		}
	}
	
	spending=bs_makeSpendingRow(currSpend,`iLvls worth of Blacksmithing Contract`,champName,amountToSpend);
	txt += bs_addBlacksmithsResultRow(`Finished.`);
	bscSpender.innerHTML = lootTxt + spending + txt;
	
	bscMethodList.disabled = false;
	bscChampionList.disabled = false;
	bscContractAverage.disabled = false;
	codeEnablePullButtons();
	
	if (numFails >= RETRIES) {
		txt += bs_addBlacksmithsResultRow(`- Stopping:`,`Got too many failures.`);
		spending=bs_makeSpendingRow(0,bscName,champName,initAmount);
		txt += bs_addBlacksmithsResultRow(`Finished.`);
		bscSpender.innerHTML = lootTxt + spending + txt;
		return;
	}
	
	let oldChampLoot = champLoot;
	let details = (await getUserDetails()).details;
	bs_parseLoot(details.loot);
	let newChampLoot = champLoot;
	let newLoot = [0,0,0,0,0,0];
	for (let slot of Object.keys(champLoot[champId]))
		newLoot[Number(slot)-1] = champLoot[champId][slot].ilvl;
	champLoot = oldChampLoot;
	lootTxt = bs_addChampioniLvlsRows(champId,champName,-1,newLoot,true);
	bscSpender.innerHTML = lootTxt + spending + txt;
	champLoot = newChampLoot;
}

function bs_displayBSCSpecific(wrapper) {
	type=`Specific`;
	let txt=``;
	let a=`<input type="number" value="0" name="bscContractSpecific" id="bscContractSpecific" oninput="bs_displayBSCSpendSpecificButton();">`;
	txt+=bs_addBlacksmithsRow(`Champion:`,bs_bscGenerateChampionSelect(type));
	txt+=bs_addBlacksmithsRow(`Item:`,bs_bscGenerateSpecificSlotList());
	txt+=bs_addBlacksmithsRow(`Current Specific iLvl:`,`-`,`bscCurrentSpecific`,-1);
	txt+=bs_addBlacksmithsRow(`Specific iLvl Goal:`,a);
	txt+=bs_addBlacksmithsRow(`It is recommended that you have a bunch of Tiny and Small Blacksmithing Contracts available when using this method.`).replace(`width:60%;min-width:250px;font-size:1.2em`,`min-width:250px;color:var(--TangerineYellow)`);
	txt+=bs_addBlacksmithsRow(`This method is slow because I don't trust the accuracy of the responses from the blacksmiths server calls and so will regularly require a fresh pull of user data to confirm iLvls. To avoid spamming the server this has a 10 second wait attached to it.<br>Also - in order to not risk going over the iLvl goal - this method never spends more in iLvls than the item would need to get to the goal.<br>It will repeat this cycle of getting user data and spending as many times as it needs to to reach the iLvl goal.`).replace(`width:60%;min-width:250px;font-size:1.2em`,`min-width:250px;color:var(--Cascara)`);
	wrapper.innerHTML = txt;
	bs_displayBSCSpendSpecificButton();
	return txt;
}

function bs_displayCurrentSpecific(champId,slotId) {
	let bscCurrentSpecific = document.getElementById(`bscCurrentSpecific`);
	if (champId==undefined||slotId==undefined||champId=="-1"||slotId=="-1") {
		bscCurrentSpecific.innerHTML = `-`;
		bscCurrentSpecific.dataset.value = -1;
	} else {
		let currSpec = champLoot[champId][slotId].ilvl;
		let capVal = bs_getCapValue(champId,slotId);
		bscCurrentSpecific.innerHTML = bs_makeCurrSpecValue(currSpec,capVal);
		bscCurrentSpecific.dataset.value = currSpec;
	}
}

function bs_displayBSCSpendSpecificButton() {
	let bscSpender = document.getElementById(`bscSpender`);
	let bscChampionList = document.getElementById(`bscChampionList`);
	let bscSlotList = document.getElementById(`bscSlotList`);
	let bscContractSpecific = document.getElementById(`bscContractSpecific`);
	let txt=``;
	
	let champId = bscChampionList.value;
	let slotId = bscSlotList.value;
	let iLvlGoal = bscContractSpecific.value;
	
	if (champId=="-1"||slotId=="-1"||iLvlGoal<=0) {
		txt+=`<span class="f w100 p5" style="padding-left:10%">Cannot spend blacksmiths until a valid Champion / Item / Specific iLvl Goal has been chosen.</span>`;
	} else {
		let curriLvl = champLoot[champId][slotId].ilvl;
		let capped = lootDefs[champId][slotId].capped;
		let cappedValue = bs_getCapValue(champId,slotId);
		let numCapped = bs_countCappedItems(champId);
		if (capped&&cappedValue>curriLvl)
			numCapped--;
		let needed = (iLvlGoal - curriLvl);
		let expected = needed * (6 - numCapped);
		let canSpend = bs_calculateTotaliLvlsCanSpend();
		if (needed <= 0)
			txt+=`<span class="f w100 p5" style="padding-left:10%">You already have more than that (${nf(curriLvl)}).</span>`;
		else if (capped && iLvlGoal > cappedValue)
			txt+=`<span class="f w100 p5" style="padding-left:10%">This item caps at ${nf(cappedValue)} ilvls for your current gilding.</span>`;
		else {
			if (expected > canSpend)
				txt+=`<span class="f w100 p5" style="padding-left:10%;color:var(--TangerineYellow)">Not enough contracts to reach this goal. Expected cost is roughly ${nf(expected)} ilvl${expected==1?'':'s'}.</span>`;
			txt+=`<span class="f fr w100 p5"><span class="f falc fje mr2 redButton" style="width:50%" id="bscSpenderRow"><input type="button" onClick="bs_bscSpendSpecific(${needed})" name="bscSpendSpecificButton" id="bscSpendSpecificButton" style="font-size:0.9em;min-width:180px" value="Spend Roughly ${nf(expected)} iLvls on ${ownedChamps[champId]} to Reach Goal"></span></span>`;
		}
	}
	bscSpender.innerHTML = txt;
}

async function bs_bscSpendSpecific(toSpend) {
	let bscSpender = document.getElementById(`bscSpender`);
	let bscTotaliLvls = document.getElementById(`bscTotaliLvls`);
	let bscMethodList = document.getElementById(`bscMethodList`);
	let bscChampionList = document.getElementById(`bscChampionList`);
	let bscSlotList = document.getElementById(`bscSlotList`);
	let bscCurrentSpecific = document.getElementById(`bscCurrentSpecific`);
	let bscContractSpecific = document.getElementById(`bscContractSpecific`);
	let spending=``;
	let txt=``;
	if (bscChampionList==undefined||bscChampionList.value=="-1"||bscSlotList==undefined||bscSlotList.value<=0||bscSlotList>6||bscContractSpecific==undefined||bscContractSpecific.value<=0) {
		txt+=`<span class="f w100 p5" style="padding-left:10%">Unknown error. Didn't spend any blacksmiths.</span>`;
		bscSpender.innerHTML = txt;
		return;
	}
	bscMethodList.disabled = true;
	bscChampionList.disabled = true;
	bscSlotList.disabled = true;
	bscContractSpecific.disabled = true;
	disablePullButtons(true);
	
	let champId = bscChampionList.value;
	let champName = ownedChamps[champId];
	let slotId = bscSlotList.value;
	let capVal = bs_getCapValue(champId,slotId);
	
	let totalAmountOfiLvls = bs_calculateTotaliLvlsCanSpend();
	bscTotaliLvls.innerHTML = nf(totalAmountOfiLvls);
	bscTotaliLvls.dataset.value = totalAmountOfiLvls;
	
	let iLvlsGoal = bscContractSpecific.value;
	let iLvlsInit = champLoot[champId][slotId].ilvl;
	let iLvlsCurr = iLvlsInit;
	let amountToSpend = iLvlsGoal - iLvlsCurr;
	let amountSpent = 0;
	let newLoot = [0,0,0,0,0,0];
	
	let lootTxt=bs_addChampioniLvlsRows(champId,champName,slotId);
	let numFails=0;
	let details = undefined;
	while (iLvlsCurr < iLvlsGoal) {
		amountToSpend = Math.min(totalAmountOfiLvls,iLvlsGoal - iLvlsCurr);
		
		let bscsToUse = bs_parseBlacksmithsToUse(amountToSpend);
		if (bscsToUse==undefined) {
			txt+=`<span class="f w100 p5" style="padding-left:10%">Couldn't calculate a combination of blacksmiths to use to reach the average perfectly. Please make sure you have some of the smaller blacksmith contracts available.</span>`;
			bscSpender.innerHTML = txt;
			codeEnablePullButtons();
			return;
		}
		
		let currSpend = amountToSpend;
		let bscIds = Object.keys(bscsToUse);
		numSort(bscIds,true);
		
		for (let bscId of bscIds) {
			let amount = bscsToUse[bscId];
			let initAmount = amount;
			
			let bsc=blacksmiths[bscId];
			let bscName = bsc.name;
			let bscMainLabel = document.getElementById(`bscAmounts${bscId}`);
			
			spending=bs_makeSpendingRow(amount,bscName,champName,initAmount);
			if (amount==0)
				continue;
			
			bscSpender.innerHTML = lootTxt + spending + txt;
			while (amount > 0 && numFails < RETRIES) {
				let toSpend = Math.min(1000,amount);
				let result = await useServerBuff(bscId,champId,0,toSpend);
				let successType = `Failed to spend`;
				if (JSON.stringify(result).includes(`You do not have enough`)) {
					txt += bs_addBlacksmithsResultRow(`- ${successType}:`,`Not enough contracts.`);
					spending=bs_makeSpendingRow(0,bscName,champName,initAmount);
					bscSpender.innerHTML = lootTxt + spending + txt;
					return;
				}
				if (result['success']&&result['okay']) {
					successType = `Successfully spent`;
					let remaining = result.buffs_remaining;
					amount -= toSpend;
					bscMainLabel.innerHTML = nf(remaining);
					bscMainLabel.dataset.value = remaining;
					let spendValue = toSpend * blacksmiths[bscId].iLvls;
					currSpend -= spendValue;
					amountSpent += spendValue;
					blacksmiths[bscId].amount = remaining;
					totalAmountOfiLvls = bs_calculateTotaliLvlsCanSpend();
					bscTotaliLvls.innerHTML = nf(totalAmountOfiLvls);
					bscTotaliLvls.dataset.value = totalAmountOfiLvls;
					newLoot = bs_parseActions(result.actions,champId,newLoot);
					let lootSpec = newLoot[Number(slotId)-1];
					bscCurrentSpecific.dataset.value = lootSpec;
					bscCurrentSpecific.innerHTML = bs_makeCurrSpecValue(lootSpec,capVal);
					lootTxt = bs_addChampioniLvlsRows(champId,champName,slotId,newLoot);
				} else
					numFails++;
				spending=bs_makeSpendingRow(amount,bscName,champName,initAmount);
				let plural=toSpend==1?``:`s`;
				bscSpender.innerHTML = lootTxt + spending + txt;
			}
		}
		spending=`<span class="f fr w100 p5">Refreshing user data...</span>`;
		bscSpender.innerHTML = lootTxt + spending;
		
		let oldChampLoot = champLoot;
		details = (await getUserDetails()).details;
		bs_parseLoot(details.loot);
		bs_parseBlacksmiths(details.buffs);
		for (let slot of Object.keys(champLoot[champId]))
			newLoot[Number(slot)-1] = champLoot[champId][slot].ilvl;
		iLvlsCurr = champLoot[champId][slotId].ilvl;
		let lootSpec = champLoot[champId][slotId].ilvl;
		bscCurrentSpecific.dataset.value = lootSpec;
		bscCurrentSpecific.innerHTML = bs_makeCurrSpecValue(lootSpec,capVal);
		champLoot = oldChampLoot;
		lootTxt = bs_addChampioniLvlsRows(champId,champName,slotId,newLoot,true);
		bscSpender.innerHTML = lootTxt + spending + txt;
		if (totalAmountOfiLvls==0) {
			txt+=`<span class="f w100 p5" style="padding-left:10%">You have no more blacksmith ilvls left to spend.</span>`;
			bscSpender.innerHTML = lootTxt + txt;
			codeEnablePullButtons();
			return;
		}
		if (iLvlsCurr < iLvlsGoal) {
			for (let i=10;i>0;i--) {
				spending=`<span class="f fr w100 p5">Sleeping for ${i} second${i==1?'':'s'} to avoid server spam.</span>`;
				bscSpender.innerHTML = lootTxt + spending + txt;
				await sleep(1000);
			}
		}
	}
	amountToSpend = iLvlsGoal - iLvlsCurr;
	
	spending=`<span class="f fr w100 p5">${amountToSpend==0?`Finished. `:``}Spent ${nf(amountSpent)} iLvls worth of Blacksmithing Contracts on ${champName}:</span>`;
	bscSpender.innerHTML = lootTxt + spending + txt;
	
	bscMethodList.disabled = false;
	bscChampionList.disabled = false;
	bscSlotList.disabled = false;
	bscContractSpecific.disabled = false;
	
	if (numFails >= RETRIES) {
		txt += bs_addBlacksmithsResultRow(`- Stopping:`,`Got too many failures.`);
		spending=bs_makeSpendingRow(0,bscName,champName,initAmount);
		bscSpender.innerHTML = lootTxt + spending + txt;
		return;
	}
	
	codeEnablePullButtons();
	let oldChampLoot = champLoot;
	details = (await getUserDetails()).details;
	bs_parseLoot(details.loot);
	let newChampLoot = champLoot;
	for (let slot of Object.keys(champLoot[champId]))
		newLoot[Number(slot)-1] = champLoot[champId][slot].ilvl;
	champLoot = oldChampLoot;
	lootTxt = bs_addChampioniLvlsRows(champId,champName,slotId,newLoot,true);
	bscSpender.innerHTML = lootTxt + spending + txt;
	champLoot = newChampLoot;
}

function bs_displayItemSlotSpecific(champId) {
	document.getElementById(`bscSlotList`).outerHTML = bs_bscGenerateSpecificSlotList(champId);
}

function bs_displayCurrentItemSpecific(champId) {
	let bscCurrentSpecific = document.getElementById(`bscCurrentSpecific`)
	let bscContractSpecific = document.getElementById(`bscContractSpecific`);
	let bscSlotList = document.getElementById(`bscSlotList`);
	if (bscSlotList==undefined||bscSlotList.value=="-1") {
		bs_displayCurrentSpecific();
		bscContractSpecific.value = ``;
	} else {
		bs_displayCurrentSpecific(champId,bscSlotList.value);
		bscContractSpecific.value = champLoot[champId][bscSlotList.value].ilvl;
	}
}

function bs_bscGenerateChampionSelect(type) {
	let sel=`<select name="bscChampionList" id="bscChampionList" oninput="bs_displayBSCSpend${type}Button();"><option value="-1">-</option>`;
	if (type=="Average")
		sel = sel.replace(`oninput="bs_display`,`oninput="bs_displayCurrentAverage(this.value);bs_display`);
	else if (type=="Specific")
		sel = sel.replace(`oninput="bs_display`,`oninput="bs_displayItemSlotSpecific(this.value);bs_displayCurrentItemSpecific(this.value);bs_display`);
	let names = Object.keys(ownedChampsByName);
	names.sort();
	for (let name of names) {
		let id = ownedChampsByName[name];
		if (champLoot[id]!=undefined&&Object.keys(champLoot[id]).length==6)
			sel+=`<option value="${ownedChampsByName[name]}">${name}</option>`;
	}
	sel+=`</select>`;
	return sel;
}

function bs_bscGenerateSpecificSlotList(champId) {
	let s=`<select name="bscSlotList" id="bscSlotList" oninput="bs_displayCurrentItemSpecific(${champId});bs_displayCurrentSpecific(${champId},this.value);bs_displayBSCSpend${type}Button();"><option value="-1">-</option>`;
	if (champId!=undefined&&champId!="-1") {
		for (let i=1;i<=6;i++) {
			let loot = lootDefs[champId][i];
			let capped = loot.capped;
			if (!capped||(capped&&champLoot[champId][i].ilvl<bs_getCapValue(champId,i)))
				s+=`<option value="${i}">${i}: ${capped?'**':''}${loot.name}</option>`;
		}
	}
	s+=`</select>`;
	return s;
}

function bs_updateBSCSlider(val) {
	let slider = document.getElementById(`bscContractSlider`);
	let bs = blacksmiths[val];
	slider.min = 0;
	slider.value = 0;
	bs_updateBSCSliderValue(slider.value,val);
	slider.dataset.type = val;
	if (val=="-1"||bs==undefined||bs.amount==0) {
		slider.max = 0;
		return;
	}
	slider.max = bs.amount;
}

function bs_updateBSCSliderValue(val,bsType) {
	let extra=``;
	if (bsType!=undefined&&bsType!=`-1`)
		extra = ` (${nf(val*blacksmiths[bsType].iLvls)} iLvls)`;
	document.getElementById(`bscContractSliderLabel`).innerHTML = nf(val) + extra;
}

function bs_parseLoot(loots) {
	let ret = {};
	let ownedIds = Object.keys(ownedChamps);
	for (let looti of loots) {
		let heroId = looti.hero_id;
		if (ownedIds!=undefined&&!ownedIds.includes(`${heroId}`))
			continue;
		if (ret[heroId]==undefined)
			ret[heroId] = {};
		let ilvl = looti.enchant+1;
		let gild = looti.gild;
		ret[heroId][looti.slot_id] = {ilvl:ilvl,gild:gild};
	}
	for (let heroId of Object.keys(ret)) {
		if (Object.keys(ret[heroId]).length < 6) {
			delete ret[heroId];
			if (ownedChamps!=undefined)
				delete ownedChamps[heroId];
		}
	}
	champLoot = ret;
}

function bs_parseOwnedChamps(defsHeroes,detailsHeroes) {
	let ownedIds = [];
	for (let ownedHero of detailsHeroes)
		if (ownedHero.owned == 1)
			ownedIds.push(Number(ownedHero.hero_id));
	let owned = {};
	let ownedByName = {};
	for (let hero of defsHeroes) {
		if (ownedIds.includes(hero.id)) {
			owned[hero.id] = hero.name;
			ownedByName[hero.name] = Number(hero.id);
		}
	}
	ownedChamps = owned;
	ownedChampsByName = ownedByName;
}

function bs_parseBlacksmiths(userBuffs,defsBuffs) {
	if (defsBuffs!=undefined) {
		let bs = {};
		for (let buff of defsBuffs) {
			if (buff.description.includes(`Contract a master blacksmith`)) {
				let value = Number(buff.effect.replace(`level_up_loot,`,``));
				if (isNaN(value))
					continue;
				bs[buff.id] = {iLvls:value,name:buff.name,sname:buff.name.replace(" Blacksmithing Contract", ""),amount:0};
			}
		}
		blacksmiths = bs;
	}
	let keys = Object.keys(blacksmiths);
	for (let buff of userBuffs)
		if (keys.includes(`${buff.buff_id}`))
			blacksmiths[buff.buff_id][`amount`] = Number(buff.inventory_amount);
}

function bs_parseLootDefs(defs) {
	let loots = {};
	let ownedIds = Object.keys(ownedChamps);
	for (let loot of defs) {
		let heroId = loot.hero_id;
		if (!ownedIds.includes(`${heroId}`))
			continue;
		let rarity = loot.rarity;
		if (rarity != 4)
			continue;
		if (loots[heroId]==undefined)
			loots[heroId] = {};
		let slot = loot.slot_id;
		let name = loot.name;
		let capped = loot.max_level!=undefined;
		loots[heroId][slot] = {name:name,capped:capped};
		if (capped)
			loots[heroId][slot].caps = loot.max_level;
	}
	lootDefs = loots;
}

function bs_countCappedItems(champId) {
	let count = 0;
	for (let slotId of Object.keys(lootDefs[champId]))
		if (lootDefs[champId][slotId].capped)
			count++;
	return count;
}

function bs_parseActions(actions,champId,oldNewLoot) {
	let newLoot = undefined;
	if (oldNewLoot==undefined) {
		newLoot = [0,0,0,0,0,0];
		for (let slot of Object.keys(champLoot[champId]))
			newLoot[Number(slot)-1] = champLoot[champId][slot].ilvl;
	} else
		newLoot = oldNewLoot;
	for (let action of actions)
		newLoot[action.slot_id-1] = action.enchant_level+1;
	return newLoot;
}

function bs_parseCurrentTotal(champId) {
	let total = 0;
	if (champLoot==undefined||champLoot[champId]==undefined)
		return total;
	let keys = Object.keys(champLoot[champId]);
	for (let slot of keys)
		total += champLoot[champId][slot].ilvl;
	return total;
}

function bs_parseBlacksmithsToUse(toSpend) {
	let triedIds = [];
	let bsToUse = {};
	let remainingToSpend = toSpend;
	let bsIds = Object.keys(blacksmiths);
	while (remainingToSpend > 0 && triedIds.length < bsIds.length) {
		let highestId=-1;
		let highestValue=-1;
		for (let bsId of bsIds) {
			if (!triedIds.includes(bsId) && blacksmiths[bsId].iLvls > highestValue) {
				highestValue = blacksmiths[bsId].iLvls;
				highestId = bsId;
			}
		}
		let available = blacksmiths[highestId].amount;
		let mostCanUse = Math.floor(remainingToSpend / highestValue);
		let use = Math.min(available,mostCanUse);
		if (use > 0) {
			bsToUse[highestId] = use;
			remainingToSpend -= use * blacksmiths[highestId].iLvls;
		}
		triedIds.push(highestId);
	}
	if (remainingToSpend > 0)
		return undefined;
	return bsToUse;
}

function bs_calculateTotaliLvlsCanSpend() {
	let total = 0;
	for (let id of Object.keys(blacksmiths))
		total += blacksmiths[id].iLvls * blacksmiths[id].amount;
	return total;
}

function bs_addBlacksmithsRow(left,right,rightId,rightValue) {
	let r = right == undefined;
	let txt = `<span class="f fr w100 p5">`;
	if (!r)
		txt += `<span class="f falc fje mr2" style="width:25%;min-width:200px">${left}</span>`;
	let data = ``;
	if (rightId!=undefined&&rightValue!=undefined)
		data = ` id="${rightId}" data-value="${rightValue}"`;
	txt += `<span class="f falc fjs ml2" style="padding-left:10px;width:${r?60:35}%;min-width:250px${r?';font-size:1.2em':''}"${data}>${r?left:right}</span>`;
	txt += `</span>`;
	return txt;
}

function bs_addBlacksmithsRowShort(left,right,rightId,rightValue) {
	return bs_addBlacksmithsRow(left,right,rightId,rightValue).replace(`width:35%;min-width:250px`,`width:10%;min-width:100px`).replace(`f falc fjs`,`f falc fje`);
}

function bs_addBlacksmithsResultRow(left,right) {
	let rightAdd = ``;
	if (right!=undefined)
		rightAdd = `<span class="f falc fjs ml2" style="flex-grow:1;margin-left:5px;flex-wrap:wrap">${right}</span>`;
	return `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:175px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">${left}</span>${rightAdd}</span>`;
}

function bs_makeSpendingRow(amount,name,champName,initAmount) {
	return `<span class="f fr w100 p5">${amount==0?`Finished `:``}Spending ${nf(amount==0?initAmount:amount)} ${name}s on ${champName}:</span>`;
}

function bs_addChampioniLvlsRows(champId,champName,highlightSlot,newLoot,viaUserData) {
	let txt=``;
	txt+=bs_addBlacksmithsRow(`${champName} Gear:`);
	let nlu = newLoot == undefined;
	for (let i=0;i<(nlu?6:newLoot.length);i++) {
		let b=champLoot[champId][`${i+1}`].ilvl;
		let a=nlu?b:newLoot[i];
		let d=a-b;
		let row=bs_addBlacksmithsRow(`Slot ${i+1}:`,`${nf(b)} → ${nf(a)}${d!=0?' ('+(d>0?'+':'-')+nf(d)+')':''}`).replace(`width:250px`,`width:250px;text-wrap:nowrap`);
		if (highlightSlot == i+1)
			row=row.replace(`f fr w100 p5"`,`f fr w100 p5" style="color:var(--AlienArmpit)"`);
		txt+=row;
	}
	if (!viaUserData)
		txt+=bs_addBlacksmithsRow(`(These iLvl results are from the responses from the blacksmith calls. They could be inaccurate.)`).replace("1.2em","0.9em").replace(`width:60%;`,``);
	else
		txt+=bs_addBlacksmithsRow(`(These iLvl results are accurate based on a fresh check of user data.)`).replace("1.2em","0.9em").replace(`width:60%;`,``);
	txt+=bs_addBlacksmithsRow(`&nbsp;`,`&nbsp;`);
	return txt;
}

function bs_getCapValue(champId,slotId) {
	let loot = lootDefs[champId][slotId];
	if (!loot.capped||loot.caps==undefined)
		return -1;
	return loot.caps[champLoot[champId][slotId].gild] + 1;
}

function bs_makeCurrSpecValue(iLvls,capVal) {
	return nf(iLvls) + (capVal>0 ? ` (**Caps at: ${nf(capVal)})` : ``)
}