const vcd = 1.006; // prettier-ignore
let cd_chestDataBefore = ``;

async function cd_pullChestCollectData() {
	if (isBadUserData()) return;
	disablePullButtons();
	const wrapper = document.getElementById(`chestCollectWrapper`);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		wrapper.innerHTML = `Waiting for user data...`;
		const details = await getUserDetails();
		if (cd_chestDataBefore === ``)
			await cd_displayChestCollectDataPhase1(wrapper, details);
		else await cd_displayChestCollectDataPhase2(wrapper, details);
		codeEnablePullButtons();
	} catch (error) {
		handleError(wrapper, error);
	}
}

async function cd_displayChestCollectDataPhase1(wrapper, details) {
	document.getElementById(
		`chestCollectPullButton`
	).value = `Snapshot the 'After' Chest Data`;
	const chests = details.details.chests;
	//let loot = details.details.loot;
	const buffs = [];
	for (let buff of details.details.buffs) {
		if (!Object.keys(b_buffValues).includes("" + buff.buff_id)) continue;
		buffs[buff.buff_id] = buff.inventory_amount;
	}
	cd_chestDataBefore = {chests: chests, buffs: buffs}; //,'loot':loot};
	let txt = ``;
	txt += `<span class="f fr w100 p5" style="font-size:1.2em">Chest Data Before:</span>`;
	for (let id in cd_chestDataBefore.buffs) {
		let name = b_buffValues["" + id];
		let value = cd_chestDataBefore.buffs[id];
		txt += addShiniesRow(`${name}`, `${nf(value)}`);
	}
	wrapper.innerHTML = txt;
	txt = `<span class="f falc fje mr2" style="width:50%;">
			<input type="button" onClick="cd_pullChestCollectData()" name="chestCollectPullButton2" id="chestCollectPullButton2" value="Snapshot the 'After' Chest Data" style="min-width:175px">
		</span>`;
	document.getElementById(`chestCollectData2`).innerHTML = txt;
}

async function cd_displayChestCollectDataPhase2(wrapper, details) {
	document.getElementById(
		`chestCollectPullButton`
	).value = `Snapshot the 'Before' Chest Data`;
	const chests = details.details.chests;
	//let loot = details.details.loot;
	const buffs = [];
	for (let buff of details.details.buffs) {
		if (!Object.keys(b_buffValues).includes("" + buff.buff_id)) continue;
		buffs[buff.buff_id] = buff.inventory_amount;
	}
	const chestDataAfter = {chests: chests, buffs: buffs}; //,'loot':loot};

	let txt = ``;
	let comma = ``;

	let chestsReduced = {};
	for (let key in cd_chestDataBefore.chests) {
		let before =
			cd_chestDataBefore.chests[key] == null
				? 0
				: Number(cd_chestDataBefore.chests[key]);
		let after =
			chestDataAfter.chests[key] == null
				? 0
				: Number(chestDataAfter.chests[key]);
		if (after < before) chestsReduced[key] = before - after;
	}
	for (let key in chestDataAfter.chests) {
		let before =
			cd_chestDataBefore.chests[key] == null
				? 0
				: Number(cd_chestDataBefore.chests[key]);
		let after =
			chestDataAfter.chests[key] == null
				? 0
				: Number(chestDataAfter.chests[key]);
		if (after < before) chestsReduced[key] = before - after;
	}
	let chestTypesOpened = Object.keys(chestsReduced).length;
	if (chestTypesOpened > 1) {
		txt += `<span class="f fr w100 p5" style="font-size:1.2em">Error:</span>`;
		txt += `<span class="f fr w100 p5">You've invalidated the dataset by opening multiple chest types.</span>`;
		wrapper.innerHTML = txt;
		cd_chestDataBefore = ``;
		return;
	} else if (chestTypesOpened === 0) {
		document.getElementById(
			`chestCollectPullButton`
		).value = `Snapshot the 'After' Chest Data`;
		txt += `<span class="f fr w100 p5" style="font-size:1.2em">Error:</span>`;
		txt += `<span class="f fr w100 p5">No chests have been opened since the 'Before' snapshot. Open a chest type and try again.</span>`;
		wrapper.innerHTML = txt;
		return;
	}
	txt += `<span class="f fr w100 p5" style="font-size:1.2em">Chest Data Difference:</span>`;
	let chestOpenedId = Object.keys(chestsReduced)[0];
	let chestOpenedName = ``;
	switch (Number(chestOpenedId)) {
		case 1:
			chestOpenedName = `Silver`;
			break;
		case 2:
			chestOpenedName = `Gold`;
			break;
		default:
			chestOpenedName = `???: ${chestOpenedId}`;
	}
	txt += addShiniesRow(`Chest Type Opened`, `${chestOpenedName}`);
	txt += addShiniesRow(
		`Amount Opened`,
		`${nf(chestsReduced[chestOpenedId])}`
	);
	comma += `${chestOpenedId},${chestsReduced[chestOpenedId]}`;
	for (let id in cd_chestDataBefore.buffs) {
		let name = b_buffValues["" + id];
		let valueBefore = cd_chestDataBefore.buffs[id];
		let valueAfter = chestDataAfter.buffs[id];
		let diff = valueAfter - valueBefore;
		txt += addShiniesRow(`${name}`, `${nf(diff)}`);
		comma += `,${id},${diff}`;
	}
	txt += addShiniesRow(`&nbsp;`, `&nbsp;`);
	txt += `<span class="f fr w100 p5"><code style="max-width:100%;color:var(--light3);overflow-wrap:break-word">${comma}</code></span>`;
	wrapper.innerHTML = txt;
	document.getElementById(`chestCollectData2`).innerHTML = `&nbsp;`;
}
