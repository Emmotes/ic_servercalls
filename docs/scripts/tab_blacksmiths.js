const vbs = 1.016; // prettier-ignore
let bs_ownedChamps = {};
let bs_ownedChampsByName = {};
let bs_champLoot = {};
let bs_blacksmiths = {};
let bs_lootDefs = {};

async function bs_pullBSCData() {
	if (isBadUserData()) return;
	disablePullButtons();
	const wrapper = document.getElementById(`bscWrapper`);
	wrapper.innerHTML = `Waiting for response...`;
	const bscSpender = document.getElementById(`bscSpender`);
	bscSpender.innerHTML = `&nbsp;`;
	const wrapperType = document.getElementById(`bscWrapperType`);
	wrapperType.style.visibility = `hidden`;
	wrapperType.innerHTML = `&nbsp;`;
	try {
		wrapper.innerHTML = `Waiting for user data...`;
		const details = (await getUserDetails()).details;
		wrapper.innerHTML = `Waiting for definitions...`;
		const defs = await getDefinitions(
			"hero_defines,buff_defines,loot_defines",
		);
		await bs_displayBSCData(wrapper, details, defs);
		codeEnablePullButtons();
	} catch (error) {
		handleError(wrapper, error);
	}
}

async function bs_displayBSCData(wrapper, details, defs) {
	const bscSpender = document.getElementById(`bscSpender`);

	bs_parseOwnedChamps(defs.hero_defines, details.heroes);
	bs_parseLoot(details.loot);
	bs_parseBlacksmiths(details.buffs, defs.buff_defines);
	bs_parseLootDefs(defs.loot_defines);

	wrapper.innerHTML = `&nbsp;`;
	if (Object.keys(bs_ownedChamps).length === 0) {
		bscSpender.innerHTML = `<span class="f w100 p5" style="padding-left:10%">You don't have any champions you can apply blacksmith contracts to.</span>`;
		return;
	}
	const totalAmountOfiLvls = bs_calculateTotaliLvlsCanSpend();
	if (totalAmountOfiLvls === 0) {
		bscSpender.innerHTML = `<span class="f w100 p5" style="padding-left:10%">You don't have any blacksmiths available to spend.</span>`;
		return;
	}

	let txt = ``;
	txt += bs_addBlacksmithsRow(`Available Blacksmiths:`);
	for (let key in bs_blacksmiths) {
		const bs = bs_blacksmiths[key];
		txt += bs_addBlacksmithsRowShort(
			`${bs.sname}`,
			nf(bs.amount),
			`bscAmounts${key}`,
			bs.amount,
		);
	}
	txt += bs_addBlacksmithsRowShort(
		`Available iLvls:`,
		nf(totalAmountOfiLvls),
		`bscTotaliLvls`,
		totalAmountOfiLvls,
	);
	txt += bs_addBlacksmithsRow(`&nbsp;`, `&nbsp;`);
	const s = `<select name="bscMethodList" id="bscMethodList" oninput="bs_displayBSCType(this.value);"><option value="-1" selected>-</option><option value="general">General</option><option value="average">Average</option><option value="specific">Specific</option></select>`;
	txt += bs_addBlacksmithsRow(`Method:`, s);
	wrapper.innerHTML = txt;
	bs_displayBSCType();
}

function bs_displayBSCType(val) {
	const wrapper = document.getElementById(`bscWrapperType`);
	const bscSpender = document.getElementById(`bscSpender`);
	let txt = `&nbsp;`;
	if (val === `general`) txt = bs_displayBSCGeneral(wrapper);
	else if (val === `average`) txt = bs_displayBSCAverage(wrapper);
	else if (val === `specific`) txt = bs_displayBSCSpecific(wrapper);
	else {
		wrapper.innerHTML = txt;
		bscSpender.innerHTML = txt;
	}
	wrapper.style.visibility = ``;
}

function bs_displayBSCGeneral(wrapper) {
	const type = `General`;
	let txt = ``;
	let s = `<select name="bscContractList" id="bscContractList" oninput="bs_updateBSCSlider(this.value);bs_displayBSCSpend${type}Button();"><option value="-1">-</option>`;
	const ids = Object.keys(bs_blacksmiths);
	numSort(ids);
	for (let id of ids)
		s += `<option value="${id}">${bs_blacksmiths[id].sname}</option>`;
	s += `</select>`;
	const a = `<input type="range" min="0" max="0" step="1" value="0" name="bscContractSlider" id="bscContractSlider" oninput="bs_updateBSCSliderValue(this.value,this.dataset.type);bs_displayBSCSpendGeneralButton();" data-type="-1" style="min-width:80%"><label style="padding-left:10px;text-wrap:nowrap" for="bscContractSlider" id="bscContractSliderLabel">0</label>`;
	txt += bs_addBlacksmithsRow(
		`Champion:`,
		bs_bscGenerateChampionSelect(type),
	);
	txt += bs_addBlacksmithsRow(`Contract:`, s);
	txt += bs_addBlacksmithsRow(`Amount:`, a);
	wrapper.innerHTML = txt;
	bs_displayBSCSpendGeneralButton();
	return txt;
}

function bs_displayBSCSpendGeneralButton() {
	const bscSpender = document.getElementById(`bscSpender`);
	const bscChampionList = document.getElementById(`bscChampionList`);
	const bscContractList = document.getElementById(`bscContractList`);
	const bscContractSlider = document.getElementById(`bscContractSlider`);
	let txt = ``;
	if (
		bscChampionList.value === "-1" ||
		bscContractList.value === "-1" ||
		bscContractSlider.value === 0
	) {
		txt += `<span class="f w100 p5" style="padding-left:10%">Cannot spend blacksmiths until a valid Champion / Contract / Amount has been selected.</span>`;
	} else {
		txt += `<span class="f fr w100 p5"><span class="f falc fje mr2 redButton" style="width:50%" id="bscSpenderRow"><input type="button" onClick="bs_bscSpendGeneral()" name="bscSpendGeneralButton" id="bscSpendGeneralButton" style="font-size:0.9em;min-width:180px" value="Spend ${nf(
			bscContractSlider.value,
		)} ${bs_blacksmiths[bscContractList.value].sname} BSC on ${
			bs_ownedChamps[bscChampionList.value]
		}"></span></span>`;
	}
	bscSpender.innerHTML = txt;
}

async function bs_bscSpendGeneral() {
	const bscSpender = document.getElementById(`bscSpender`);
	const bscMethodList = document.getElementById(`bscMethodList`);
	const bscChampionList = document.getElementById(`bscChampionList`);
	const bscContractList = document.getElementById(`bscContractList`);
	const bscContractSlider = document.getElementById(`bscContractSlider`);
	let spending = ``;
	let txt = ``;
	if (
		bscChampionList == null ||
		bscChampionList.value === "-1" ||
		bscContractList == null ||
		bscContractList.value === "-1" ||
		bscContractSlider == null ||
		bscContractSlider.value === 0
	) {
		txt += `<span class="f w100 p5" style="padding-left:10%">Unknown error. Didn't spend any blacksmiths.</span>`;
		bscSpender.innerHTML = txt;
		return;
	}
	bscMethodList.disabled = true;
	bscChampionList.disabled = true;
	bscContractList.disabled = true;
	bscContractSlider.disabled = true;
	disablePullButtons();

	const champId = bscChampionList.value;
	const champName = bs_ownedChamps[champId];
	const bscId = bscContractList.value;
	const bsc = bs_blacksmiths[bscId];
	const bscName = bsc.name;
	const bscMainLabel = document.getElementById(`bscAmounts${bscId}`);
	const bscTotaliLvls = document.getElementById(`bscTotaliLvls`);

	let amount = bscContractSlider.value;
	const initAmount = amount;

	let lootTxt = bs_addChampioniLvlsRows(champId, champName, -1);
	spending = bs_makeSpendingRow(amount, bscName, champName, initAmount);
	if (amount === 0) {
		txt += bs_addBlacksmithsResultRow(`- None`);
		bscSpender.innerHTML = lootTxt + spending + txt;
		return;
	}
	let numFails = 0;
	bscSpender.innerHTML = lootTxt + spending + txt;
	while (amount > 0 && numFails < RETRIES) {
		const toSpend = Math.min(1000, amount);
		const result = await useServerBuff(bscId, champId, 0, toSpend);
		let successType = `Failed to spend`;
		if (JSON.stringify(result).includes(`You do not have enough`)) {
			txt += bs_addBlacksmithsResultRow(
				`- ${successType}:`,
				`Not enough contracts.`,
			);
			spending = bs_makeSpendingRow(0, bscName, champName, initAmount);
			bscSpender.innerHTML = lootTxt + spending + txt;
			codeEnablePullButtons();
			return;
		}
		if (result["success"] && result["okay"]) {
			successType = `Successfully spent`;
			const remaining = result.buffs_remaining;
			amount -= toSpend;
			bscMainLabel.innerHTML = nf(remaining);
			bscMainLabel.dataset.value = remaining;
			bscContractSlider.max = remaining;
			bscContractSlider.value = amount;
			bs_updateBSCSliderValue(amount, bscId);
			bs_blacksmiths[bscId].amount = remaining;
			const totalAmountOfiLvls = bs_calculateTotaliLvlsCanSpend();
			bscTotaliLvls.innerHTML = nf(totalAmountOfiLvls);
			bscTotaliLvls.dataset.value = totalAmountOfiLvls;
			const newLoot = bs_parseActions(result.actions, champId);
			lootTxt = bs_addChampioniLvlsRows(champId, champName, -1, newLoot);
		} else numFails++;
		spending = bs_makeSpendingRow(amount, bscName, champName, initAmount);
		const plural = toSpend === 1 ? `` : `s`;
		txt += bs_addBlacksmithsResultRow(
			`- ${successType}:`,
			`${toSpend} ${bscName}${plural} on ${champName}`,
		);
		bscSpender.innerHTML = lootTxt + spending + txt;
	}
	spending = bs_makeSpendingRow(amount, bscName, champName, initAmount);
	txt += bs_addBlacksmithsResultRow(`Finished.`);
	bscSpender.innerHTML = lootTxt + spending + txt;

	bscMethodList.disabled = false;
	bscChampionList.disabled = false;
	bscContractList.disabled = false;
	bscContractSlider.disabled = false;
	codeEnablePullButtons();

	if (numFails >= RETRIES) {
		txt += bs_addBlacksmithsResultRow(
			`- Stopping:`,
			`Got too many failures.`,
		);
		spending = bs_makeSpendingRow(0, bscName, champName, initAmount);
		txt += bs_addBlacksmithsResultRow(`Finished.`);
		bscSpender.innerHTML = lootTxt + spending + txt;
		return;
	}

	const oldChampLoot = bs_champLoot;
	const details = (await getUserDetails()).details;
	bs_parseLoot(details.loot);
	const newChampLoot = bs_champLoot;
	const newLoot = [0, 0, 0, 0, 0, 0];
	for (let slot in bs_champLoot[champId])
		newLoot[Number(slot) - 1] = bs_champLoot[champId][slot].ilvl;
	bs_champLoot = oldChampLoot;
	lootTxt = bs_addChampioniLvlsRows(champId, champName, -1, newLoot, true);
	bscSpender.innerHTML = lootTxt + spending + txt;
	bs_champLoot = newChampLoot;
}

function bs_displayBSCAverage(wrapper) {
	const type = `Average`;
	let txt = ``;
	const a = `<input type="number" value="0" name="bscContractAverage" id="bscContractAverage" oninput="bs_displayBSCSpendAverageButton();">`;
	txt += bs_addBlacksmithsRow(
		`Champion:`,
		bs_bscGenerateChampionSelect(type),
	);
	txt += bs_addBlacksmithsRow(
		`Current Average iLvl:`,
		`-`,
		`bscCurrentAverage`,
		-1,
	);
	txt += bs_addBlacksmithsRow(`Average iLvl Goal:`, a);
	txt += bs_addBlacksmithsRow(
		`It is recommended that you have a bunch of Tiny and Small Blacksmithing Contracts available when using this method.`,
	).replace(
		`width:60%;min-width:250px;font-size:1.2em`,
		`min-width:250px;color:var(--TangerineYellow)`,
	);
	wrapper.innerHTML = txt;
	bs_displayBSCSpendAverageButton();
	return txt;
}

function bs_displayCurrentAverage(champId) {
	const bscCurrentAverage = document.getElementById(`bscCurrentAverage`);
	const bscContractAverage = document.getElementById(`bscContractAverage`);
	if (champId === "-1") {
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
	const bscSpender = document.getElementById(`bscSpender`);
	const bscChampionList = document.getElementById(`bscChampionList`);
	const bscCurrentAverage = document.getElementById(`bscCurrentAverage`);
	const bscContractAverage = document.getElementById(`bscContractAverage`);
	let txt = ``;

	if (bscChampionList.value === "-1" || bscContractAverage.value <= 0) {
		txt += `<span class="f w100 p5" style="padding-left:10%">Cannot spend blacksmiths until a valid Champion / Average iLvl Goal has been chosen.</span>`;
	} else {
		const currTotal = bs_parseCurrentTotal(bscChampionList.value);
		const currAvg = currTotal / 6;
		const needed = bscContractAverage.value * 6 - currTotal;
		const canSpend = bs_calculateTotaliLvlsCanSpend();
		bscCurrentAverage.innerHTML = nf(currAvg);
		bscCurrentAverage.dataset.value = currAvg;
		if (needed <= 0) {
			txt += `<span class="f w100 p5" style="padding-left:10%">You already have more than that (${nf(
				currAvg,
			)}).</span>`;
		} else {
			if (needed > canSpend)
				txt += `<span class="f w100 p5" style="padding-left:10%;color:var(--TangerineYellow)">Not enough contracts to reach this goal. ${nf(
					needed,
				)} ilvl${needed === 1 ? " is" : "s are"} required.</span>`;
			txt += `<span class="f fr w100 p5"><span class="f falc fje mr2 redButton" style="width:50%" id="bscSpenderRow"><input type="button" onClick="bs_bscSpendAverage(${needed})" name="bscSpendAverageButton" id="bscSpendAverageButton" style="font-size:0.9em;min-width:180px" value="Spend ${nf(
				needed,
			)} iLvls on ${
				bs_ownedChamps[bscChampionList.value]
			} to Reach Goal"></span></span>`;
		}
	}
	bscSpender.innerHTML = txt;
}

async function bs_bscSpendAverage(amountToSpend) {
	const bscSpender = document.getElementById(`bscSpender`);
	const bscTotaliLvls = document.getElementById(`bscTotaliLvls`);
	const bscMethodList = document.getElementById(`bscMethodList`);
	const bscChampionList = document.getElementById(`bscChampionList`);
	const bscCurrentAverage = document.getElementById(`bscCurrentAverage`);
	const bscContractAverage = document.getElementById(`bscContractAverage`);
	let spending = ``;
	let txt = ``;
	if (
		bscChampionList == null ||
		bscChampionList.value === "-1" ||
		bscContractAverage == null ||
		bscContractAverage.value <= 0
	) {
		txt += `<span class="f w100 p5" style="padding-left:10%">Unknown error. Didn't spend any blacksmiths.</span>`;
		bscSpender.innerHTML = txt;
		codeEnablePullButtons();
		return;
	}
	bscMethodList.disabled = true;
	bscChampionList.disabled = true;
	bscContractAverage.disabled = true;
	disablePullButtons();

	const champId = bscChampionList.value;
	const champName = bs_ownedChamps[champId];
	let totalAmountOfiLvls = bs_calculateTotaliLvlsCanSpend();
	bscTotaliLvls.innerHTML = nf(totalAmountOfiLvls);
	bscTotaliLvls.dataset.value = totalAmountOfiLvls;

	amountToSpend = Math.min(totalAmountOfiLvls, amountToSpend);
	const bscsToUse = bs_parseBlacksmithsToUse(amountToSpend);

	if (bscsToUse == null) {
		txt += `<span class="f w100 p5" style="padding-left:10%">Couldn't calculate a combination of blacksmiths to use to reach the average perfectly. Please make sure you have some of the smaller blacksmith contracts available.</span>`;
		bscSpender.innerHTML = txt;
		codeEnablePullButtons();
		return;
	}

	let currSpend = amountToSpend;
	const bscIds = Object.keys(bscsToUse);
	numSort(bscIds, true);

	let lootTxt = bs_addChampioniLvlsRows(champId, champName, -1);
	let numFails = 0;
	for (let bscId of bscIds) {
		let amount = bscsToUse[bscId];
		const initAmount = amount;

		const bsc = bs_blacksmiths[bscId];
		const bscName = bsc.name;
		const bscMainLabel = document.getElementById(`bscAmounts${bscId}`);

		lootTxt = bs_addChampioniLvlsRows(champId, champName, -1);
		spending = bs_makeSpendingRow(amount, bscName, champName, initAmount);
		if (amount === 0) continue;

		bscSpender.innerHTML = lootTxt + spending + txt;
		while (amount > 0 && numFails < RETRIES) {
			const toSpend = Math.min(1000, amount);
			const result = await useServerBuff(bscId, champId, 0, toSpend);
			let successType = `Failed to spend`;
			if (JSON.stringify(result).includes(`You do not have enough`)) {
				txt += bs_addBlacksmithsResultRow(
					`- ${successType}:`,
					`Not enough contracts.`,
				);
				spending = bs_makeSpendingRow(
					0,
					bscName,
					champName,
					initAmount,
				);
				bscSpender.innerHTML = lootTxt + spending + txt;
				codeEnablePullButtons();
				return;
			}
			if (result["success"] && result["okay"]) {
				successType = `Successfully spent`;
				const remaining = result.buffs_remaining;
				amount -= toSpend;
				bscMainLabel.innerHTML = nf(remaining);
				bscMainLabel.dataset.value = remaining;
				const spendValue = toSpend * bs_blacksmiths[bscId].iLvls;
				currSpend -= spendValue;
				const newAvg =
					Number(bscCurrentAverage.dataset.value) + spendValue / 6;
				bscCurrentAverage.innerHTML = nf(newAvg);
				bscCurrentAverage.dataset.value = newAvg;
				bs_blacksmiths[bscId].amount = remaining;
				totalAmountOfiLvls = bs_calculateTotaliLvlsCanSpend();
				bscTotaliLvls.innerHTML = nf(totalAmountOfiLvls);
				bscTotaliLvls.dataset.value = totalAmountOfiLvls;
				const newLoot = bs_parseActions(result.actions, champId);
				lootTxt = bs_addChampioniLvlsRows(
					champId,
					champName,
					-1,
					newLoot,
				);
			} else numFails++;
			spending = bs_makeSpendingRow(
				amount,
				bscName,
				champName,
				initAmount,
			);
			const plural = toSpend === 1 ? `` : `s`;
			txt += bs_addBlacksmithsResultRow(
				`- ${successType}:`,
				`${toSpend} ${bscName}${plural} on ${champName}`,
			);
			bscSpender.innerHTML = lootTxt + spending + txt;
			if (totalAmountOfiLvls === 0) {
				txt += bs_addBlacksmithsResultRow(
					`- Failed to spend:`,
					`Ran out of contracts.`,
				);
				txt =
					`<span class="f w100 p5" style="padding-left:10%">You have no more blacksmith ilvls left to spend.</span>` +
					txt;
				bscSpender.innerHTML = lootTxt + txt;
				codeEnablePullButtons();
				return;
			}
		}
	}

	spending = bs_makeSpendingRow(
		currSpend,
		`iLvls worth of Blacksmithing Contract`,
		champName,
		amountToSpend,
	);
	txt += bs_addBlacksmithsResultRow(`Finished.`);
	bscSpender.innerHTML = lootTxt + spending + txt;

	bscMethodList.disabled = false;
	bscChampionList.disabled = false;
	bscContractAverage.disabled = false;
	codeEnablePullButtons();

	if (numFails >= RETRIES) {
		txt += bs_addBlacksmithsResultRow(
			`- Stopping:`,
			`Got too many failures.`,
		);
		spending = bs_makeSpendingRow(0, bscName, champName, initAmount);
		txt += bs_addBlacksmithsResultRow(`Finished.`);
		bscSpender.innerHTML = lootTxt + spending + txt;
		return;
	}

	const oldChampLoot = bs_champLoot;
	const details = (await getUserDetails()).details;
	bs_parseLoot(details.loot);
	const newChampLoot = bs_champLoot;
	const newLoot = [0, 0, 0, 0, 0, 0];
	for (let slot in bs_champLoot[champId])
		newLoot[Number(slot) - 1] = bs_champLoot[champId][slot].ilvl;
	bs_champLoot = oldChampLoot;
	lootTxt = bs_addChampioniLvlsRows(champId, champName, -1, newLoot, true);
	bscSpender.innerHTML = lootTxt + spending + txt;
	bs_champLoot = newChampLoot;
}

function bs_displayBSCSpecific(wrapper) {
	type = `Specific`;
	let txt = ``;
	const a = `<input type="number" value="0" name="bscContractSpecific" id="bscContractSpecific" oninput="bs_displayBSCSpendSpecificButton();">`;
	txt += bs_addBlacksmithsRow(
		`Champion:`,
		bs_bscGenerateChampionSelect(type),
	);
	txt += bs_addBlacksmithsRow(`Item:`, bs_bscGenerateSpecificSlotList());
	txt += bs_addBlacksmithsRow(
		`Current Specific iLvl:`,
		`-`,
		`bscCurrentSpecific`,
		-1,
	);
	txt += bs_addBlacksmithsRow(`Specific iLvl Goal:`, a);
	txt += bs_addBlacksmithsRow(
		`It is recommended that you have a bunch of Tiny and Small Blacksmithing Contracts available when using this method.`,
	).replace(
		`width:60%;min-width:250px;font-size:1.2em`,
		`min-width:250px;color:var(--TangerineYellow)`,
	);
	txt += bs_addBlacksmithsRow(
		`This method is slow because I don't trust the accuracy of the responses from the blacksmiths server calls and so will regularly require a fresh pull of user data to confirm iLvls. To avoid spamming the server this has a 10 second wait attached to it.<br>Also - in order to not risk going over the iLvl goal - this method never spends more in iLvls than the item would need to get to the goal.<br>It will repeat this cycle of getting user data and spending as many times as it needs to to reach the iLvl goal.`,
	).replace(
		`width:60%;min-width:250px;font-size:1.2em`,
		`min-width:250px;color:var(--Cascara)`,
	);
	wrapper.innerHTML = txt;
	bs_displayBSCSpendSpecificButton();
	return txt;
}

function bs_displayCurrentSpecific(champId, slotId) {
	const bscCurrentSpecific = document.getElementById(`bscCurrentSpecific`);
	if (
		champId == null ||
		slotId == null ||
		champId === "-1" ||
		slotId === "-1"
	) {
		bscCurrentSpecific.innerHTML = `-`;
		bscCurrentSpecific.dataset.value = -1;
	} else {
		let currSpec = bs_champLoot[champId][slotId].ilvl;
		let capVal = bs_getCapValue(champId, slotId);
		bscCurrentSpecific.innerHTML = bs_makeCurrSpecValue(currSpec, capVal);
		bscCurrentSpecific.dataset.value = currSpec;
	}
}

function bs_displayBSCSpendSpecificButton() {
	const bscSpender = document.getElementById(`bscSpender`);
	const bscChampionList = document.getElementById(`bscChampionList`);
	const bscSlotList = document.getElementById(`bscSlotList`);
	const bscContractSpecific = document.getElementById(`bscContractSpecific`);
	let txt = ``;

	const champId = bscChampionList.value;
	const slotId = bscSlotList.value;
	const iLvlGoal = bscContractSpecific.value;

	if (champId === "-1" || slotId === "-1" || iLvlGoal <= 0) {
		txt += `<span class="f w100 p5" style="padding-left:10%">Cannot spend blacksmiths until a valid Champion / Item / Specific iLvl Goal has been chosen.</span>`;
	} else {
		const curriLvl = bs_champLoot[champId][slotId].ilvl;
		const capped = bs_lootDefs[champId][slotId].capped;
		const cappedValue = bs_getCapValue(champId, slotId);
		let numCapped = bs_countCappedItems(champId);
		if (capped && cappedValue > curriLvl) numCapped--;
		const needed = iLvlGoal - curriLvl;
		const expected = needed * (6 - numCapped);
		const canSpend = bs_calculateTotaliLvlsCanSpend();
		if (needed <= 0)
			txt += `<span class="f w100 p5" style="padding-left:10%">You already have more than that (${nf(
				curriLvl,
			)}).</span>`;
		else if (capped && iLvlGoal > cappedValue)
			txt += `<span class="f w100 p5" style="padding-left:10%">This item caps at ${nf(
				cappedValue,
			)} ilvls for your current gilding.</span>`;
		else {
			if (expected > canSpend)
				txt += `<span class="f w100 p5" style="padding-left:10%;color:var(--TangerineYellow)">Not enough contracts to reach this goal. Expected cost is roughly ${nf(
					expected,
				)} ilvl${expected === 1 ? "" : "s"}.</span>`;
			txt += `<span class="f fr w100 p5"><span class="f falc fje mr2 redButton" style="width:50%" id="bscSpenderRow"><input type="button" onClick="bs_bscSpendSpecific(${needed})" name="bscSpendSpecificButton" id="bscSpendSpecificButton" style="font-size:0.9em;min-width:180px" value="Spend Roughly ${nf(
				expected,
			)} iLvls on ${
				bs_ownedChamps[champId]
			} to Reach Goal"></span></span>`;
		}
	}
	bscSpender.innerHTML = txt;
}

async function bs_bscSpendSpecific(amountToSpend) {
	const bscSpender = document.getElementById(`bscSpender`);
	const bscTotaliLvls = document.getElementById(`bscTotaliLvls`);
	const bscMethodList = document.getElementById(`bscMethodList`);
	const bscChampionList = document.getElementById(`bscChampionList`);
	const bscSlotList = document.getElementById(`bscSlotList`);
	const bscCurrentSpecific = document.getElementById(`bscCurrentSpecific`);
	const bscContractSpecific = document.getElementById(`bscContractSpecific`);
	let spending = ``;
	let txt = ``;
	if (
		bscChampionList == null ||
		bscChampionList.value === "-1" ||
		bscSlotList == null ||
		bscSlotList.value <= 0 ||
		bscSlotList > 6 ||
		bscContractSpecific == null ||
		bscContractSpecific.value <= 0
	) {
		txt += `<span class="f w100 p5" style="padding-left:10%">Unknown error. Didn't spend any blacksmiths.</span>`;
		bscSpender.innerHTML = txt;
		return;
	}
	bscMethodList.disabled = true;
	bscChampionList.disabled = true;
	bscSlotList.disabled = true;
	bscContractSpecific.disabled = true;
	disablePullButtons();

	const champId = bscChampionList.value;
	const champName = bs_ownedChamps[champId];
	const slotId = bscSlotList.value;
	const capVal = bs_getCapValue(champId, slotId);

	let totalAmountOfiLvls = bs_calculateTotaliLvlsCanSpend();
	bscTotaliLvls.innerHTML = nf(totalAmountOfiLvls);
	bscTotaliLvls.dataset.value = totalAmountOfiLvls;

	const iLvlsGoal = bscContractSpecific.value;
	const iLvlsInit = bs_champLoot[champId][slotId].ilvl;
	let iLvlsCurr = iLvlsInit;
	let amountSpent = 0;
	let newLoot = [0, 0, 0, 0, 0, 0];

	let lootTxt = bs_addChampioniLvlsRows(champId, champName, slotId);
	let numFails = 0;
	let details = undefined;
	while (iLvlsCurr < iLvlsGoal) {
		amountToSpend = Math.min(totalAmountOfiLvls, iLvlsGoal - iLvlsCurr);

		let bscsToUse = bs_parseBlacksmithsToUse(amountToSpend);
		if (bscsToUse == null) {
			txt += `<span class="f w100 p5" style="padding-left:10%">Couldn't calculate a combination of blacksmiths to use to reach the average perfectly. Please make sure you have some of the smaller blacksmith contracts available.</span>`;
			bscSpender.innerHTML = txt;
			codeEnablePullButtons();
			return;
		}

		let currSpend = amountToSpend;
		let bscIds = Object.keys(bscsToUse);
		numSort(bscIds, true);

		for (let bscId of bscIds) {
			let amount = bscsToUse[bscId];
			const initAmount = amount;

			const bsc = bs_blacksmiths[bscId];
			const bscName = bsc.name;
			const bscMainLabel = document.getElementById(`bscAmounts${bscId}`);

			spending = bs_makeSpendingRow(
				amount,
				bscName,
				champName,
				initAmount,
			);
			if (amount === 0) continue;

			bscSpender.innerHTML = lootTxt + spending + txt;
			while (amount > 0 && numFails < RETRIES) {
				const toSpend = Math.min(1000, amount);
				const result = await useServerBuff(bscId, champId, 0, toSpend);
				let successType = `Failed to spend`;
				if (JSON.stringify(result).includes(`You do not have enough`)) {
					txt += bs_addBlacksmithsResultRow(
						`- ${successType}:`,
						`Not enough contracts.`,
					);
					spending = bs_makeSpendingRow(
						0,
						bscName,
						champName,
						initAmount,
					);
					bscSpender.innerHTML = lootTxt + spending + txt;
					return;
				}
				if (result["success"] && result["okay"]) {
					successType = `Successfully spent`;
					const remaining = result.buffs_remaining;
					amount -= toSpend;
					bscMainLabel.innerHTML = nf(remaining);
					bscMainLabel.dataset.value = remaining;
					const spendValue = toSpend * bs_blacksmiths[bscId].iLvls;
					currSpend -= spendValue;
					amountSpent += spendValue;
					bs_blacksmiths[bscId].amount = remaining;
					totalAmountOfiLvls = bs_calculateTotaliLvlsCanSpend();
					bscTotaliLvls.innerHTML = nf(totalAmountOfiLvls);
					bscTotaliLvls.dataset.value = totalAmountOfiLvls;
					newLoot = bs_parseActions(result.actions, champId, newLoot);
					const lootSpec = newLoot[Number(slotId) - 1];
					bscCurrentSpecific.dataset.value = lootSpec;
					bscCurrentSpecific.innerHTML = bs_makeCurrSpecValue(
						lootSpec,
						capVal,
					);
					lootTxt = bs_addChampioniLvlsRows(
						champId,
						champName,
						slotId,
						newLoot,
					);
				} else numFails++;
				spending = bs_makeSpendingRow(
					amount,
					bscName,
					champName,
					initAmount,
				);
				bscSpender.innerHTML = lootTxt + spending + txt;
			}
		}
		spending = `<span class="f fr w100 p5">Refreshing user data...</span>`;
		bscSpender.innerHTML = lootTxt + spending;

		const oldChampLoot = bs_champLoot;
		details = (await getUserDetails()).details;
		bs_parseLoot(details.loot);
		bs_parseBlacksmiths(details.buffs);
		for (let slot in bs_champLoot[champId])
			newLoot[Number(slot) - 1] = bs_champLoot[champId][slot].ilvl;
		iLvlsCurr = bs_champLoot[champId][slotId].ilvl;
		const lootSpec = bs_champLoot[champId][slotId].ilvl;
		bscCurrentSpecific.dataset.value = lootSpec;
		bscCurrentSpecific.innerHTML = bs_makeCurrSpecValue(lootSpec, capVal);
		bs_champLoot = oldChampLoot;
		lootTxt = bs_addChampioniLvlsRows(
			champId,
			champName,
			slotId,
			newLoot,
			true,
		);
		bscSpender.innerHTML = lootTxt + spending + txt;
		if (totalAmountOfiLvls === 0) {
			txt += `<span class="f w100 p5" style="padding-left:10%">You have no more blacksmith ilvls left to spend.</span>`;
			bscSpender.innerHTML = lootTxt + txt;
			codeEnablePullButtons();
			return;
		}
		if (iLvlsCurr < iLvlsGoal) {
			for (let i = 10; i > 0; i--) {
				spending = `<span class="f fr w100 p5">Sleeping for ${i} second${
					i === 1 ? "" : "s"
				} to avoid server spam.</span>`;
				bscSpender.innerHTML = lootTxt + spending + txt;
				await sleep(1000);
			}
		}
	}
	amountToSpend = iLvlsGoal - iLvlsCurr;

	spending = `<span class="f fr w100 p5">${
		amountToSpend === 0 ? `Finished. ` : ``
	}Spent ${nf(
		amountSpent,
	)} iLvls worth of Blacksmithing Contracts on ${champName}:</span>`;
	bscSpender.innerHTML = lootTxt + spending + txt;

	bscMethodList.disabled = false;
	bscChampionList.disabled = false;
	bscSlotList.disabled = false;
	bscContractSpecific.disabled = false;

	if (numFails >= RETRIES) {
		txt += bs_addBlacksmithsResultRow(
			`- Stopping:`,
			`Got too many failures.`,
		);
		spending = bs_makeSpendingRow(0, bscName, champName, initAmount);
		bscSpender.innerHTML = lootTxt + spending + txt;
		return;
	}

	codeEnablePullButtons();
	const oldChampLoot = bs_champLoot;
	details = (await getUserDetails()).details;
	bs_parseLoot(details.loot);
	const newChampLoot = bs_champLoot;
	for (let slot in bs_champLoot[champId])
		newLoot[Number(slot) - 1] = bs_champLoot[champId][slot].ilvl;
	bs_champLoot = oldChampLoot;
	lootTxt = bs_addChampioniLvlsRows(
		champId,
		champName,
		slotId,
		newLoot,
		true,
	);
	bscSpender.innerHTML = lootTxt + spending + txt;
	bs_champLoot = newChampLoot;
}

function bs_displayItemSlotSpecific(champId) {
	document.getElementById(`bscSlotList`).outerHTML =
		bs_bscGenerateSpecificSlotList(champId);
}

function bs_displayCurrentItemSpecific(champId) {
	const bscContractSpecific = document.getElementById(`bscContractSpecific`);
	const bscSlotList = document.getElementById(`bscSlotList`);
	if (bscSlotList == null || bscSlotList.value === "-1") {
		bs_displayCurrentSpecific();
		bscContractSpecific.value = ``;
	} else {
		bs_displayCurrentSpecific(champId, bscSlotList.value);
		bscContractSpecific.value =
			bs_champLoot[champId][bscSlotList.value].ilvl;
	}
}

function bs_bscGenerateChampionSelect(type) {
	let sel = `<select name="bscChampionList" id="bscChampionList" oninput="bs_displayBSCSpend${type}Button();"><option value="-1">-</option>`;
	if (type === "Average")
		sel = sel.replace(
			`oninput="bs_display`,
			`oninput="bs_displayCurrentAverage(this.value);bs_display`,
		);
	else if (type === "Specific")
		sel = sel.replace(
			`oninput="bs_display`,
			`oninput="bs_displayItemSlotSpecific(this.value);bs_displayCurrentItemSpecific(this.value);bs_display`,
		);
	const names = Object.keys(bs_ownedChampsByName);
	names.sort();
	for (let name of names) {
		let id = bs_ownedChampsByName[name];
		if (
			bs_champLoot[id] != null &&
			Object.keys(bs_champLoot[id]).length === 6
		)
			sel += `<option value="${bs_ownedChampsByName[name]}">${name}</option>`;
	}
	sel += `</select>`;
	return sel;
}

function bs_bscGenerateSpecificSlotList(champId) {
	let s = `<select name="bscSlotList" id="bscSlotList" oninput="bs_displayCurrentItemSpecific(${champId});bs_displayCurrentSpecific(${champId},this.value);bs_displayBSCSpend${type}Button();"><option value="-1">-</option>`;
	if (champId != null && champId !== "-1") {
		for (let i = 1; i <= 6; i++) {
			const loot = bs_lootDefs[champId][i];
			const capped = loot.capped;
			if (
				!capped ||
				(capped &&
					bs_champLoot[champId][i].ilvl < bs_getCapValue(champId, i))
			)
				s += `<option value="${i}">${i}: ${capped ? "**" : ""}${
					loot.name
				}</option>`;
		}
	}
	s += `</select>`;
	return s;
}

function bs_updateBSCSlider(val) {
	const slider = document.getElementById(`bscContractSlider`);
	const bs = bs_blacksmiths[val];
	slider.min = 0;
	slider.value = 0;
	bs_updateBSCSliderValue(slider.value, val);
	slider.dataset.type = val;
	if (val === "-1" || bs == null || bs.amount === 0) {
		slider.max = 0;
		return;
	}
	slider.max = bs.amount;
}

function bs_updateBSCSliderValue(val, bsType) {
	let extra = ``;
	if (bsType != null && bsType !== `-1`)
		extra = ` (${nf(val * bs_blacksmiths[bsType].iLvls)} iLvls)`;
	document.getElementById(`bscContractSliderLabel`).innerHTML =
		nf(val) + extra;
}

function bs_parseLoot(loots) {
	const ret = {};
	const ownedIds = Object.keys(bs_ownedChamps);
	for (let looti of loots) {
		const heroId = looti.hero_id;
		if (ownedIds != null && !ownedIds.includes(`${heroId}`)) continue;
		if (ret[heroId] == null) ret[heroId] = {};
		const ilvl = looti.enchant + 1;
		const gild = looti.gild;
		ret[heroId][looti.slot_id] = {ilvl: ilvl, gild: gild};
	}
	for (let heroId in ret) {
		if (Object.keys(ret[heroId]).length < 6) {
			delete ret[heroId];
			if (bs_ownedChamps != null) delete bs_ownedChamps[heroId];
		}
	}
	bs_champLoot = ret;
}

function bs_parseOwnedChamps(defsHeroes, detailsHeroes) {
	const ownedIds = [];
	for (let ownedHero of detailsHeroes)
		if (Number(ownedHero.owned) === 1)
			ownedIds.push(Number(ownedHero.hero_id));
	const owned = {};
	const ownedByName = {};
	for (let hero of defsHeroes) {
		if (ownedIds.includes(hero.id)) {
			owned[hero.id] = hero.name;
			ownedByName[hero.name] = Number(hero.id);
		}
	}
	bs_ownedChamps = owned;
	bs_ownedChampsByName = ownedByName;
}

function bs_parseBlacksmiths(userBuffs, defsBuffs) {
	if (defsBuffs != null) {
		let bs = {};
		for (let buff of defsBuffs) {
			if (buff.description.includes(`Contract a master blacksmith`)) {
				const value = Number(buff.effect.replace(`level_up_loot,`, ``));
				if (isNaN(value)) continue;
				bs[buff.id] = {
					iLvls: value,
					name: buff.name,
					sname: buff.name.replace(" Blacksmithing Contract", ""),
					amount: 0,
				};
			}
		}
		bs_blacksmiths = bs;
	}
	let keys = Object.keys(bs_blacksmiths);
	for (let buff of userBuffs)
		if (keys.includes(`${buff.buff_id}`))
			bs_blacksmiths[buff.buff_id][`amount`] = Number(
				buff.inventory_amount,
			);
}

function bs_parseLootDefs(defs) {
	const loots = {};
	const ownedIds = Object.keys(bs_ownedChamps);
	for (let loot of defs) {
		const heroId = loot.hero_id;
		if (!ownedIds.includes(`${heroId}`)) continue;
		const rarity = loot.rarity;
		if (rarity !== 4) continue;
		if (loots[heroId] == null) loots[heroId] = {};
		const slot = loot.slot_id;
		const name = loot.name;
		const capped = loot.max_level != null;
		loots[heroId][slot] = {name: name, capped: capped};
		if (capped) loots[heroId][slot].caps = loot.max_level;
	}
	bs_lootDefs = loots;
}

function bs_countCappedItems(champId) {
	let count = 0;
	for (let slotId in bs_lootDefs[champId])
		if (bs_lootDefs[champId][slotId].capped) count++;
	return count;
}

function bs_parseActions(actions, champId, oldNewLoot) {
	let newLoot = undefined;
	if (oldNewLoot == null) {
		newLoot = [0, 0, 0, 0, 0, 0];
		for (let slot in bs_champLoot[champId])
			newLoot[Number(slot) - 1] = bs_champLoot[champId][slot].ilvl;
	} else newLoot = oldNewLoot;
	for (let action of actions)
		newLoot[action.slot_id - 1] = action.enchant_level + 1;
	return newLoot;
}

function bs_parseCurrentTotal(champId) {
	let total = 0;
	if (bs_champLoot == null || bs_champLoot[champId] == null) return total;
	for (let slot in bs_champLoot[champId])
		total += bs_champLoot[champId][slot].ilvl;
	return total;
}

function bs_parseBlacksmithsToUse(toSpend) {
	const triedIds = [];
	const bsToUse = {};
	const bsIds = Object.keys(bs_blacksmiths);
	let remainingToSpend = toSpend;
	while (remainingToSpend > 0 && triedIds.length < bsIds.length) {
		let highestId = -1;
		let highestValue = -1;
		for (let bsId of bsIds) {
			if (
				!triedIds.includes(bsId) &&
				bs_blacksmiths[bsId].iLvls > highestValue
			) {
				highestValue = bs_blacksmiths[bsId].iLvls;
				highestId = bsId;
			}
		}
		const available = bs_blacksmiths[highestId].amount;
		const mostCanUse = Math.floor(remainingToSpend / highestValue);
		const use = Math.min(available, mostCanUse);
		if (use > 0) {
			bsToUse[highestId] = use;
			remainingToSpend -= use * bs_blacksmiths[highestId].iLvls;
		}
		triedIds.push(highestId);
	}
	if (remainingToSpend > 0) return undefined;
	return bsToUse;
}

function bs_calculateTotaliLvlsCanSpend() {
	let total = 0;
	for (let id in bs_blacksmiths)
		total += bs_blacksmiths[id].iLvls * bs_blacksmiths[id].amount;
	return total;
}

function bs_addBlacksmithsRow(left, right, rightId, rightValue) {
	const r = right == null;
	let txt = `<span class="f fr w100 p5">`;
	if (!r)
		txt += `<span class="f falc fje mr2" style="width:25%;min-width:200px">${left}</span>`;
	let data = ``;
	if (rightId != null && rightValue != null)
		data = ` id="${rightId}" data-value="${rightValue}"`;
	txt += `<span class="f falc fjs ml2" style="padding-left:10px;width:${
		r ? 60 : 35
	}%;min-width:250px${r ? ";font-size:1.2em" : ""}"${data}>${
		r ? left : right
	}</span>`;
	txt += `</span>`;
	return txt;
}

function bs_addBlacksmithsRowShort(left, right, rightId, rightValue) {
	return bs_addBlacksmithsRow(left, right, rightId, rightValue)
		.replace(`width:35%;min-width:250px`, `width:10%;min-width:100px`)
		.replace(`f falc fjs`, `f falc fje`);
}

function bs_addBlacksmithsResultRow(left, right) {
	let rightAdd = ``;
	if (right != null)
		rightAdd = `<span class="f falc fjs ml2" style="flex-grow:1;margin-left:5px;flex-wrap:wrap">${right}</span>`;
	return `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:175px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">${left}</span>${rightAdd}</span>`;
}

function bs_makeSpendingRow(amount, name, champName, initAmount) {
	return `<span class="f fr w100 p5">${
		amount === 0 ? `Finished ` : ``
	}Spending ${nf(
		amount === 0 ? initAmount : amount,
	)} ${name}s on ${champName}:</span>`;
}

function bs_addChampioniLvlsRows(
	champId,
	champName,
	highlightSlot,
	newLoot,
	viaUserData,
) {
	let txt = ``;
	txt += bs_addBlacksmithsRow(`${champName} Gear:`);
	const nlu = newLoot == null;
	for (let i = 0; i < (nlu ? 6 : newLoot.length); i++) {
		const b = bs_champLoot[champId][`${i + 1}`].ilvl;
		const a = nlu ? b : newLoot[i];
		const d = a - b;
		let row = bs_addBlacksmithsRow(
			`Slot ${i + 1}:`,
			`${nf(b)} → ${nf(a)}${
				d !== 0 ? " (" + (d > 0 ? "+" : "-") + nf(d) + ")" : ""
			}`,
		).replace(`width:250px`, `width:250px;text-wrap:nowrap`);
		if (highlightSlot === i + 1)
			row = row.replace(
				`f fr w100 p5"`,
				`f fr w100 p5" style="color:var(--AlienArmpit)"`,
			);
		txt += row;
	}
	if (!viaUserData)
		txt += bs_addBlacksmithsRow(
			`(These iLvl results are from the responses from the blacksmith calls. They could be inaccurate.)`,
		)
			.replace("1.2em", "0.9em")
			.replace(`width:60%;`, ``);
	else
		txt += bs_addBlacksmithsRow(
			`(These iLvl results are accurate based on a fresh check of user data.)`,
		)
			.replace("1.2em", "0.9em")
			.replace(`width:60%;`, ``);
	txt += bs_addBlacksmithsRow(`&nbsp;`, `&nbsp;`);
	return txt;
}

function bs_getCapValue(champId, slotId) {
	const loot = bs_lootDefs[champId][slotId];
	if (!loot.capped || loot.caps == null) return -1;
	return loot.caps[bs_champLoot[champId][slotId].gild] + 1;
}

function bs_makeCurrSpecValue(iLvls, capVal) {
	return nf(iLvls) + (capVal > 0 ? ` (**Caps at: ${nf(capVal)})` : ``);
}
