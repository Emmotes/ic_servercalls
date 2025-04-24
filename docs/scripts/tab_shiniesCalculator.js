const vsc=1.001;

async function pullShiniesData() {
	if (userIdent[0]==``||userIdent[1]==``) {
		init();
		return;
	}
	temporarilyDisableAllPullButtons();
	let wrapper = document.getElementById(`shiniesWrapper`);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		wrapper.innerHTML = `Waiting for user data...`;
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