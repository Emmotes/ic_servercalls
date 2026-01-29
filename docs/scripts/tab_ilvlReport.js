const vir = 1.005; // prettier-ignore

async function ir_pulliLvlReportData() {
	if (isBadUserData()) return;
	disablePullButtons();
	const wrapper = document.getElementById(`ilvlreportWrapper`);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		wrapper.innerHTML = `Waiting for user data...`;
		const details = (await getUserDetails()).details;
		wrapper.innerHTML = `Waiting for definitions...`;
		const heroDefs = (await getDefinitions("hero_defines")).hero_defines;
		await ir_displayiLvlReportData(wrapper, details, heroDefs);
		codeEnablePullButtons();
	} catch (error) {
		handleError(wrapper, error);
	}
}

async function ir_displayiLvlReportData(wrapper, details, heroDefs) {
	const ownedChampions = ir_parseOwnedChamps(heroDefs, details);

	let totalItems = 0;
	let totalEvergreenItems = 0;

	let averageiLvl = 0;

	let averageEvergreeniLvl = 0;
	let highestAverageEvergreen,
		highestAverageEvergreenName,
		lowestAverageEvergreen,
		lowestAverageEvergreenName;
	let evergreenShinies = 0;

	let averageEventiLvl = 0;
	let highestAverageEvent,
		highestAverageEventName,
		lowestAverageEvent,
		lowestAverageEventName;
	let eventShinies = 0;

	for (let champId in ownedChampions) {
		const champ = ownedChampions[champId];
		const name = champ.name;
		let totaliLvls = 0;
		let shinies = 0;
		let slotIds = Object.keys(champ.loot);
		const numItems = slotIds.length;
		if (numItems === 0) continue;
		for (let slotId of slotIds) {
			const item = champ.loot[slotId];
			totaliLvls += (item.enchant ?? 0) + 1;
			if (item.gild >= 1) shinies++;
		}
		totalItems += numItems;
		averageiLvl += totaliLvls;
		const avgiLvl = totaliLvls / numItems;
		if (champ.event) {
			averageEventiLvl += totaliLvls;
			if (highestAverageEvent == null || avgiLvl > highestAverageEvent) {
				highestAverageEvent = avgiLvl;
				highestAverageEventName = name;
			}
			if (lowestAverageEvent == null || avgiLvl < lowestAverageEvent) {
				lowestAverageEvent = avgiLvl;
				lowestAverageEventName = name;
			}
			eventShinies += shinies;
		} else {
			totalEvergreenItems += numItems;
			averageEvergreeniLvl += totaliLvls;
			if (
				highestAverageEvergreen == null ||
				avgiLvl > highestAverageEvergreen
			) {
				highestAverageEvergreen = avgiLvl;
				highestAverageEvergreenName = name;
			}
			if (
				lowestAverageEvergreen == null ||
				avgiLvl < lowestAverageEvergreen
			) {
				lowestAverageEvergreen = avgiLvl;
				lowestAverageEvergreenName = name;
			}
			evergreenShinies += shinies;
		}
	}

	if (totalItems === 0) {
		wrapper.innerHTML = `<span class="f w100 p5" style="padding-left:10%">You have a gearless account. Why are you trying to use this tab?</span>`;
		return;
	}

	const totalEventItems = totalItems - totalEvergreenItems;

	const safeAvg = (sum, count) => (count ? sum / count : 0);
	averageiLvl = safeAvg(averageiLvl, totalItems);
	averageEvergreeniLvl = safeAvg(averageEvergreeniLvl, totalEvergreenItems);
	averageEventiLvl = safeAvg(averageEventiLvl, totalEventItems);

	let txt = ``;
	txt += ir_addiLvlReportRow(`Average All iLvl:`, nf(averageiLvl));
	txt += `<span class="f fr w100 p5">&nbsp;</span>`;
	if (totalEvergreenItems > 0) {
		txt += ir_addiLvlReportRow(
			`Average Evergreen iLvl:`,
			nf(averageEvergreeniLvl),
		);
		txt += ir_addiLvlReportRow(
			`Highest Average Evergreen:`,
			nf(highestAverageEvergreen),
			highestAverageEvergreenName,
		);
		txt += ir_addiLvlReportRow(
			`Lowest Average Evergreen:`,
			nf(lowestAverageEvergreen),
			lowestAverageEvergreenName,
		);
		txt += ir_addiLvlReportRow(
			`Evergreen Shinies:`,
			`${nf(evergreenShinies)} / ${nf(totalEvergreenItems)}`,
		);
	} else
		txt += `<span class="f fr w100 p5">You do not have any evergreen items.</span>`;
	txt += `<span class="f fr w100 p5">&nbsp;</span>`;
	if (totalEventItems > 0) {
		txt += ir_addiLvlReportRow(`Average Event iLvl:`, nf(averageEventiLvl));
		txt += ir_addiLvlReportRow(
			`Highest Average Event:`,
			nf(highestAverageEvent),
			highestAverageEventName,
		);
		txt += ir_addiLvlReportRow(
			`Lowest Average Event:`,
			nf(lowestAverageEvent),
			lowestAverageEventName,
		);
		txt += ir_addiLvlReportRow(
			`Event Shinies:`,
			`${nf(eventShinies)} / ${nf(totalItems - totalEvergreenItems)}`,
		);
	} else
		txt += `<span class="f fr w100 p5">You do not have any event items.</span>`;
	wrapper.innerHTML = txt;
}

function ir_parseOwnedChamps(defsHeroes, details) {
	const owned = {};
	for (let ownedHero of details.heroes)
		if (Number(ownedHero.owned) === 1)
			owned[ownedHero.hero_id] = {event: "", name: "", loot: {}};
	const ownedIds = Object.keys(owned);
	for (let hero of defsHeroes) {
		const heroId = `${hero.id}`;
		if (ownedIds.includes(heroId)) {
			owned[heroId].event = !hero.tags.includes("evergreen");
			owned[heroId].name = hero.name;
		}
	}
	for (let item of details.loot) {
		if (
			!Object.prototype.hasOwnProperty.call(item, "hero_id") ||
			!Object.prototype.hasOwnProperty.call(item, "slot_id") ||
			!Object.prototype.hasOwnProperty.call(item, "enchant") ||
			!Object.prototype.hasOwnProperty.call(item, "gild")
		)
			continue;
		const heroId = `${item.hero_id}`;
		if (ownedIds.includes(heroId))
			owned[heroId].loot[item.slot_id] = {
				enchant: Number(item.enchant),
				gild: Number(item.gild),
			};
	}
	return owned;
}

function ir_addiLvlReportRow(title, content, name) {
	let txt = `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:25%;min-width:200px;">${title}</span><span class="f falc fje mr2" style="min-width:120px;max-width:140px;">${content}</span>`;
	if (name != null)
		txt += `<span class="f falc fjs ml2" style="min-width:90px;max-width:110px;padding-left:8px">(${name})</span>`;
	txt += `</span>`;
	return txt;
}
