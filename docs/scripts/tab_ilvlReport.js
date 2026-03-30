const vir = 1.100; // prettier-ignore
const ir_serverCalls = new Set(["getUserDetails", "getDefinitions"]);
const ir_definitionsFilters = new Set(["hero_defines"]);

function ir_registerData() {
	ir_serverCalls.forEach((c) => t_tabsServerCalls.add(c));
	ir_definitionsFilters.forEach((f) => t_tabsDefinitionsFilters.add(f));
}

function ir_tab() {
	return `
					<span class="f fr w100 p5">
						<span class="f falc fjs ml2" style="width:100%">
							<h1>iLvl Report</h1>
						</span>
					</span>
					<span class="f fr w100 p5">
						<span class="f falc fjs ml2" style="width:100%">
							This page is a replication of IdleCombos item level report feature.
						</span>
					</span>
					<span class="f fr w100 p5">
						&nbsp;
					</span>
					<span class="f fr w100 p5" style="height:34px;">
						<span class="f falc fje mr2" style="width:50%;">
							<input type="button" onClick="ir_pulliLvlReportData()" name="ilvlreportPullButton" id="ilvlreportPullButton" value="Pull iLvl Report Data" style="min-width:175px">
							<span id="ilvlreportPullButtonDisabled" style="font-size:0.9em" hidden>&nbsp;</span>
						</span>
					</span>
					<span class="f fr w100 p5">
						&nbsp;
					</span>
					<span class="f falc fje mr2" style="flex-direction:column" id="ilvlreportWrapper">
						&nbsp;
					</span>
					<span class="f fr w100 p5">
						&nbsp;
					</span>
					<span class="f fr w100 p5">
						&nbsp;
					</span>
				`;
}

async function ir_pulliLvlReportData(userDetails, definitions) {
	if (!userDetails || !definitions) {
		if (isBadUserData()) return;
		disablePullButtons();
	}
	const wrapper = document.getElementById(`ilvlreportWrapper`);
	try {
		if (!userDetails) {
			wrapper.innerHTML = `Waiting for user data...`;
			userDetails = await getUserDetails();
		}
		const details = userDetails.details;
		if (!definitions) {
			wrapper.innerHTML = `Waiting for definitions...`;
			definitions = await getDefinitions(
				filtersFromSet(ir_definitionsFilters),
			);
		}
		const heroDefs = definitions.hero_defines;
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
