const vcd=1.004;
var chestDataBefore=``;

async function pullChestCollectData() {
	if (isBadUserData())
		return;
	disablePullButtons();
	let wrapper = document.getElementById(`chestCollectWrapper`);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		wrapper.innerHTML = `Waiting for user data...`;
		let details = await getUserDetails();
		if (chestDataBefore==``)
			await displayChestCollectDataPhase1(wrapper,details);
		else
			await displayChestCollectDataPhase2(wrapper,details);
		codeEnablePullButtons();
	} catch (error) {
		handleError(wrapper,error);
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