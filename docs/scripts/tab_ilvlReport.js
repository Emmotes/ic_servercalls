const vir=1.001;

async function ir_pulliLvlReportData() {
	if (isBadUserData())
		return;
	disablePullButtons();
	let wrapper = document.getElementById(`ilvlreportWrapper`);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		wrapper.innerHTML = `Waiting for user data...`;
		let details = (await getUserDetails()).details;
		wrapper.innerHTML = `Waiting for definitions...`;
		let heroDefs = (await getDefinitions("hero_defines")).hero_defines;
		await ir_displayiLvlReportData(wrapper,details,heroDefs);
		codeEnablePullButtons();
	} catch (error) {
		handleError(wrapper,error);
	}
}

async function ir_displayiLvlReportData(wrapper,details,heroDefs) {
	let ownedChampions = ir_parseOwnedChamps(heroDefs,details);
	
	let totalItems = 0;
	let totalEvergreenItems = 0;
	
	let averageiLvl = 0;
	
	let averageEvergreeniLvl = 0;
	let highestAverageEvergreen,highestAverageEvergreenName,lowestAverageEvergreen,lowestAverageEvergreenName;
	let evergreenShinies = 0;
	
	let averageEventiLvl = 0;
	let highestAverageEvent,highestAverageEventName,lowestAverageEvent,lowestAverageEventName;
	let eventShinies = 0;
	
	for (let champId of Object.keys(ownedChampions)) {
		let champ = ownedChampions[champId];
		let name = champ.name;
		let event = champ.event;
		let totaliLvls = 0;
		let shinies = 0;
		let slotIds = Object.keys(champ.loot);
		for (let slotId of slotIds) {
			let item = champ.loot[slotId];
			totaliLvls += item.enchant + 1;
			if (item.gild >= 1)
				shinies++;
		}
		let numItems = slotIds.length;
		totalItems += numItems;
		averageiLvl += totaliLvls;
		let avgiLvl = totaliLvls / numItems;
		if (event) {
			averageEventiLvl += totaliLvls;
			if (highestAverageEvent == undefined || avgiLvl > highestAverageEvent) {
				highestAverageEvent = avgiLvl;
				highestAverageEventName = name;
			}
			if (lowestAverageEvent == undefined || avgiLvl < lowestAverageEvent) {
				lowestAverageEvent = avgiLvl;
				lowestAverageEventName = name;
			}
			eventShinies += shinies;
		} else {
			totalEvergreenItems += numItems;
			averageEvergreeniLvl += totaliLvls;
			if (highestAverageEvergreen == undefined || avgiLvl > highestAverageEvergreen) {
				highestAverageEvergreen = avgiLvl;
				highestAverageEvergreenName = name;
			}
			if (lowestAverageEvergreen == undefined || avgiLvl < lowestAverageEvergreen) {
				lowestAverageEvergreen = avgiLvl;
				lowestAverageEvergreenName = name;
			}
			evergreenShinies += shinies;
		}
	}
	averageiLvl /= totalItems;
	averageEvergreeniLvl /= totalEvergreenItems;
	averageEventiLvl /= (totalItems - totalEvergreenItems)
	
	let txt = ``;
	txt+=ir_addiLvlReportRow(`Average All iLvl:`,nf(averageiLvl));
	txt+=`<span class="f fr w100 p5">&nbsp;</span>`;
	txt+=ir_addiLvlReportRow(`Average Evergreen iLvl:`,nf(averageEvergreeniLvl));
	txt+=ir_addiLvlReportRow(`Highest Average Evergreen:`,nf(highestAverageEvergreen),highestAverageEvergreenName);
	txt+=ir_addiLvlReportRow(`Lowest Average Evergreen:`,nf(lowestAverageEvergreen),lowestAverageEvergreenName);
	txt+=ir_addiLvlReportRow(`Evergreen Shinies:`,`${nf(evergreenShinies)} / ${nf(totalEvergreenItems)}`);
	txt+=`<span class="f fr w100 p5">&nbsp;</span>`;
	txt+=ir_addiLvlReportRow(`Average Event iLvl:`,nf(averageEventiLvl));
	txt+=ir_addiLvlReportRow(`Highest Average Event:`,nf(highestAverageEvent),highestAverageEventName);
	txt+=ir_addiLvlReportRow(`Lowest Average Event:`,nf(lowestAverageEvent),lowestAverageEventName);
	txt+=ir_addiLvlReportRow(`Event Shinies:`,`${nf(eventShinies)} / ${nf(totalItems-totalEvergreenItems)}`);
	wrapper.innerHTML = txt;
}

function ir_parseOwnedChamps(defsHeroes,details) {
	let owned = {};
	for (let ownedHero of details.heroes)
		if (ownedHero.owned == 1)
			owned[ownedHero.hero_id] = {event:"",name:"",loot:{}};
	let ownedIds = Object.keys(owned);
	let ownedEvergreens = {};
	let ownedEvents = [];
	for (let hero of defsHeroes) {
		let heroId = `${hero.id}`;
		if (ownedIds.includes(heroId)) {
			owned[heroId].event = !hero.tags.includes("evergreen");
			owned[heroId].name = hero.name;
		}
	}
	for (let item of details.loot) {
		if (!item.hasOwnProperty('hero_id') || !item.hasOwnProperty('slot_id') || !item.hasOwnProperty('enchant') || !item.hasOwnProperty('gild'))
			continue;
		owned[item.hero_id].loot[item.slot_id] = {enchant:Number(item.enchant),gild:Number(item.gild)};
	}
	return owned;
}

function ir_addiLvlReportRow(title,content,name) {
	let txt = `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:25%;min-width:200px;">${title}</span><span class="f falc fje mr2" style="min-width:120px;max-width:140px;">${content}</span>`;
	if (name!=undefined)
		txt += `<span class="f falc fjs ml2" style="min-width:90px;max-width:110px;padding-left:8px">(${name})</span>`;
	txt += `</span>`;
	return txt;
}