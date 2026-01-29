const vsc = 1.007; // prettier-ignore

async function sc_pullShiniesData() {
	if (isBadUserData()) return;
	disablePullButtons();
	const wrapper = document.getElementById(`shiniesWrapper`);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		wrapper.innerHTML = `Waiting for user data...`;
		const userData = await getUserDetails();
		await sc_displayShiniesData(wrapper, userData.details);
		codeEnablePullButtons();
	} catch (error) {
		handleError(wrapper, error);
	}
}

async function sc_displayShiniesData(wrapper, details) {
	const tokens = Number(details.stats.event_v2_tokens);
	const chestPacks = tokens / 7500;
	const chests = tokens / 2500;
	const shinies = chests / 1000;
	let bcC = 0;
	let bcU = 0;
	let bcR = 0;
	let bcE = 0;
	for (let buff of details.buffs) {
		const id = Number(buff.buff_id);
		if (id == null || id === "" || id < 17 || id > 20) continue;
		const amount = Number(buff.inventory_amount);
		if (amount == null || amount === "") continue;
		switch (Number(id)) {
			case 17:
				bcC = amount;
				break;
			case 18:
				bcU = amount;
				break;
			case 19:
				bcR = amount;
				break;
			case 20:
				bcE = amount;
				break;
		}
	}
	const bcCT = bcC * 12;
	const bcUT = bcU * 72;
	const bcRT = bcR * 576;
	const bcET = bcE * 1152;
	const tokensB = tokens + bcCT + bcUT + bcRT + bcET;
	const chestPacksB = tokensB / 7500;
	const chestsB = tokensB / 2500;
	const shiniesB = chestsB / 1000;
	let txt = ``;
	txt += `<span class="f fr w100 p5" style="font-size:1.2em">Without Bounties:</span>`;
	txt += sc_addShiniesRow(`Tokens:`, nf(tokens));
	txt += sc_addShiniesRow(`Chest Packs:`, nf(chestPacks));
	txt += sc_addShiniesRow(`Total Chests:`, nf(chests));
	txt += sc_addShiniesRow(`Avg Shinies:`, nf(shinies));
	txt += `<span class="f fr w100 p5">&nbsp;</span>`;
	txt += `<span class="f fr w100 p5" style="font-size:1.2em">With Bounties:</span>`;
	txt += sc_addShiniesRow(
		`Tiny Bounty Contracts:`,
		nf(bcC),
		`Tokens:`,
		nf(bcCT),
	);
	txt += sc_addShiniesRow(
		`Small Bounty Contracts:`,
		nf(bcU),
		`Tokens:`,
		nf(bcUT),
	);
	txt += sc_addShiniesRow(
		`Medium Bounty Contracts:`,
		nf(bcR),
		`Tokens:`,
		nf(bcRT),
	);
	txt += sc_addShiniesRow(
		`Large Bounty Contracts:`,
		nf(bcE),
		`Tokens:`,
		nf(bcET),
	);
	txt += `<span class="f fr w100 p5">&nbsp;</span>`;
	txt += sc_addShiniesRow(`Tokens:`, nf(tokensB));
	txt += sc_addShiniesRow(`Chest Packs:`, nf(chestPacksB));
	txt += sc_addShiniesRow(`Total Chests:`, nf(chestsB));
	txt += sc_addShiniesRow(`Avg Shinies:`, nf(shiniesB));
	wrapper.innerHTML = txt;
}

function sc_addShiniesRow(left, right, left2, right2) {
	let txt = `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:25%;min-width:200px;">${left}</span><span class="f falc fje mr2" style="min-width:120px;max-width:140px;">${right}</span>`;
	if (left2 != null && right2 != null)
		txt += `<span class="f falc fje mr2" style="min-width:90px;max-width:110px;">${left2}</span><span class="f falc fje mr2" style="min-width:120px;max-width:140px;">${right2}</span>`;
	txt += `</span>`;
	return txt;
}
