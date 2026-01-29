const vet = 1.017; // prettier-ignore
const et_idMult = 10000;
const et_LSKey_hideTier4 = `scEventTiersHideTier4`;

async function et_pullEventTiersData() {
	if (isBadUserData()) return;
	disablePullButtons();
	const wrapper = document.getElementById(`eventTiersWrapper`);
	et_hideEventSort(true);
	setFormsWrapperFormat(wrapper, 0);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		wrapper.innerHTML = `Waiting for user data...`;
		const details = (await getUserDetails()).details;
		wrapper.innerHTML = `Waiting for collections data...`;
		const collections = (await getCompletionData()).data.event;
		wrapper.innerHTML = `Waiting for definitions...`;
		const heroDefs = (await getDefinitions("hero_defines")).hero_defines;
		await et_displayEventTiersData(wrapper, heroDefs, collections, details);
		codeEnablePullButtons();
	} catch (error) {
		et_hideEventSort(true);
		setFormsWrapperFormat(wrapper, 0);
		handleError(wrapper, error);
	}
}

async function et_displayEventTiersData(
	wrapper,
	heroDefs,
	collections,
	details,
) {
	const owned = et_parseOwnedChamps(heroDefs, details.heroes);
	const ownedById = owned[0];
	const ownedIds = Object.keys(ownedById);
	if (ownedIds.length === 0) {
		setFormsWrapperFormat(wrapper, 0);
		wrapper.innerHTML = `<span class="f fr w100 p5">You have not unlocked any event champions.</span>`;
		return;
	}
	const ownedNames = owned[1];
	ownedNames.sort();
	const ownedEventById = owned[2];
	const eventNameByEventId = {};
	let numNotTier4 = 0;
	let numTotal = 0;
	const ownedChampIdTiers = {};
	for (let hero of heroDefs) {
		const heroId = `${hero.id}`;
		if (!ownedIds.includes(heroId)) continue;
		const eventName = hero.event_name;
		const event2Id = et_getEvent2IdFromEventName(eventName);
		if (event2Id != null) eventNameByEventId[event2Id] = eventName;
		const tiersCompleted = [0, 0, 0];
		if (
			Object.prototype.hasOwnProperty.call(collections, heroId) &&
			Object.prototype.hasOwnProperty.call(collections[heroId], "v")
		) {
			const heroCollection = collections[heroId].v;
			for (let tier = 0; tier < heroCollection.length; tier++) {
				const heroVariants = heroCollection[tier];
				for (let variant = 0; variant < heroVariants.length; variant++)
					if (heroVariants[variant] === 1)
						tiersCompleted[variant] = tier + 1;
			}
		}
		if (tiersCompleted.length === 3) {
			const tier = tiersCompleted.reduce((a, b) => Math.min(a, b));
			if (tier !== 4) numNotTier4++;
			numTotal++;
			ownedChampIdTiers[heroId] = {
				tier: tier,
				nameOrder: ownedNames.indexOf(ownedById[heroId]),
				tiers: tiersCompleted,
			};
			if (ownedEventById[heroId] != null)
				ownedChampIdTiers[heroId].event2Id =
					`${ownedEventById[heroId]}`;
		}
	}

	let event2Ids = Object.keys(eventNameByEventId);
	let currEvent2Id = et_getCurrentOrNextEventId(details.events_details);
	if (currEvent2Id != null) {
		let index = event2Ids.indexOf(`${currEvent2Id}`);
		event2Ids = event2Ids.slice(index).concat(event2Ids.slice(0, index));
	}

	const date = new Date();
	const month = date.getMonth() + 1;
	const day = date.getDate();
	let txt = ``;
	txt += `<span class="eventGridHeader" data-sort="0" data-eventidorder="0" data-nameorder="0" data-id="0" style="display:none"><strong>Champion Event Tiers Completed:</strong></span>`;
	for (let event2Id of event2Ids)
		txt += `<span class="eventGridHeader" data-sort="1" data-eventidorder="${event2Ids.indexOf(
			event2Id,
		)}" data-nameorder="0" data-id="0"><strong>${
			eventNameByEventId[event2Id]
		} - ${et_getEventMonthByEvent2Id(
			event2Id,
			month,
			day,
		)}:</strong></span>`;
	for (let heroId in ownedChampIdTiers) {
		let heroData = ownedChampIdTiers[heroId];
		if (heroData.tier >= 0)
			txt += et_addEventTierGridElements(
				ownedById[heroId],
				heroId,
				event2Ids,
				heroData,
				month,
				day,
			);
	}
	setFormsWrapperFormat(wrapper, 3);
	wrapper.innerHTML = txt;
	document.getElementById("eventTiersHideTier4Amount").innerHTML =
		`Displaying: ${numNotTier4} / ${numTotal}`;
	et_hideEventSort(false);
	if (et_getHideTier4()) et_toggleHideTier4(true);
	et_changeOrder("event");
}

function et_parseOwnedChamps(defsHeroes, detailsHeroes) {
	const ownedIds = [];
	for (let ownedHero of detailsHeroes)
		if (Number(ownedHero.owned) === 1)
			ownedIds.push(Number(ownedHero.hero_id));
	const ownedById = {};
	const ownedNames = [];
	const ownedEventById = {};
	for (let hero of defsHeroes) {
		if (hero.tags.includes("evergreen")) continue;
		if (ownedIds.includes(hero.id)) {
			ownedById[hero.id] = hero.name;
			ownedNames.push(hero.name);
			const event2Id = et_getEvent2IdFromEventName(hero.event_name);
			if (event2Id != null) ownedEventById[hero.id] = event2Id;
		}
	}
	return [ownedById, ownedNames, ownedEventById];
}

function et_changeOrder(type) {
	const wrapper = document.getElementById("eventTiersWrapper");
	for (let ele of wrapper.childNodes) {
		const eventId = Number(ele.dataset.eventidorder) + 1;
		const heroId = Number(ele.dataset.id);
		const nameId = Number(ele.dataset.nameorder);
		const sort = ele.dataset.sort;
		if (sort != null) {
			if (sort === "1")
				ele.style.display =
					type === "name" || type === "id" ? "none" : "flex";
			else if (sort === "0")
				ele.style.display =
					type === "name" || type === "id" ? "flex" : "none";
		}
		if (type === "name") ele.style.order = nameId;
		else if (type === "id") ele.style.order = heroId;
		else ele.style.order = eventId * et_idMult + nameId;
	}
}

function et_hideEventSort(hide) {
	document.getElementById("eventTiersSortHolder").style.display =
		hide ? "none" : "";
}

function et_getEvent2IdFromEvent1Id(event1Id) {
	// prettier-ignore
	return {1:1,2:2,3:3,4:4,5:5,10:6,12:7,16:8,26:9,30:10,37:11,39:12}[Number(event1Id)];
}

function et_getEvent2IdFromEventName(eventName) {
	switch (eventName) {
		case "Highharvestide":
			return 1;
		case "Liars' Night":
		case "Liar's Night":
			return 2;
		case "Feast of the Moon":
			return 3;
		case "Simril":
			return 4;
		case "Wintershield":
			return 5;
		case "Grand Revel":
			return 6;
		case "Fleetswake":
			return 7;
		case "Festival of Fools":
			return 8;
		case "The Great Modron March":
			return 9;
		case "Dragondown":
			return 10;
		case "Founders' Day":
		case "Founder's Day":
			return 11;
		case "Ahghairon's Day":
		case "Aghairon's Day":
			return 12;
	}
}

function et_getEventMonthByEvent2Id(event2Id, month, day) {
	let code = "en-GB";
	if (month === 9 && day === 26) code = et_getRandomLocale();
	return Intl.DateTimeFormat(code, {month: "long"}).format(
		new Date(`${((Number(event2Id) + 7) % 12) + 1}`),
	);
}

function et_getCurrentOrNextEventId(details) {
	if (
		Object.prototype.hasOwnProperty.call(details, "active_events") &&
		details.active_events.length === 1
	)
		return details.active_events[0].event_id;
	if (
		Object.prototype.hasOwnProperty.call(details, "next_event") &&
		Object.prototype.hasOwnProperty.call(details.next_event, "event_id")
	)
		return details.next_event.event_id;
}

function et_addEventTierGridElements(
	name,
	id,
	event2Ids,
	heroData,
	month,
	day,
) {
	let tierString = ``;
	for (let i = 1; i <= 4; i++)
		tierString += et_buildSVG(
			i <= heroData.tier ? heroData.tier : 0,
			month,
			day,
		);
	let txt = `<span class="eventGridName" style="margin-top:4px" data-eventidorder="${event2Ids.indexOf(
		heroData.event2Id,
	)}" data-id="${id}" data-nameorder="${heroData.nameOrder}" data-tier="${
		heroData.tier
	}">${name}</span><span class="eventGridTier" data-eventidorder="${event2Ids.indexOf(
		heroData.event2Id,
	)}" data-id="${id}" data-nameorder="${heroData.nameOrder}" data-tier="${
		heroData.tier
	}"><span class="eventTiersTooltipsHolder">${tierString}<span class="eventTiersTooltips"><h3 style="grid-column:1/-1;">${name}</h3>`;
	for (let i = 0; i < heroData.tiers.length; i++) {
		const varTier = heroData.tiers[i];
		txt += `<span class="f falc">Variant ${
			i + 1
		}:</span><span class="f falc fje">Tier ${varTier}</span>`;
	}
	txt += `</span></span></span>`;
	return txt;
}

function et_buildSVG(tier, month, day) {
	if ((month === 10 && day >= 24) || (month === 11 && day === 1))
		return `<svg width="30" height="30" viewBox="0 0 14 14" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M8.038 2.786c-.305-.084-.18-.516.319-1.023l-.002-.001c.078-.097-.1-.307-.437-.498-.371-.211-.79-.317-.935-.237q-.009.007-.015.014l-.003-.001c-.749.63-.886 1.544-.909 1.767C3.39 2.393 1 4.407 1 8.113 1 11.328 5.187 13 7 13s6-1.672 6-4.887c0-3.647-2.121-5.785-4.962-5.327m1.059 3.728c.226-.072 2.448-1.089 2.448-.79 0 .35-1.217 2.173-2.124 2.455-.287.09-1.377-.78-1.163-1.838.055-.267.53.273.839.173M7.675 1.69c.13.053.256.09.365.11-.262.36-.444.874-.293 1.013.186.17.575.388.692.478s-.548.113-.82.396c.001 0-.67-1.117.056-1.997M7 7.246c.234 0 1.143.41 1.143 1.087S7.63 8.4 7 8.4s-1.142.61-1.142-.068S6.766 7.246 7 7.246m-.948-4.32c.06.417-.352.773-.352.773-.007-.273-.272-.437-.272-.437.185-.196.624-.336.624-.336M4.904 6.514c.31.1.784-.44.838-.173C5.956 7.4 4.866 8.27 4.579 8.18c-.906-.282-2.123-2.104-2.123-2.455 0-.299 2.222.718 2.448.79m6.166 3.878-.698-.395-.445 1.137-.73-.717-.571 1.36-1.492-1.063-.762.915-.825-.964-1.27.47-.738-1.303-.953.422-.625-2.556.958 1.6.933-.495.584 1.12 1.05-.609.857 1.154.807-1.104.988.742.603-.867.929.498.55-1.032.651.676 1.469-1.683z" stroke="#000" stroke-width=".5" stroke-linecap="round" stroke-linejoin="round" class="svgEventTier${tier}" style="filter:drop-shadow(0px 0px 1px)"/></svg>`;
	if (month === 2 && (day >= 13 || day <= 15))
		return `<svg width="30" height="30" viewBox="-3 -4 38 38" xmlns="http://www.w3.org/2000/svg"><path d="M24 0c-3.333 0-6.018 1.842-8.031 4.235C14.013 1.76 11.333 0 8 0 3.306 0 0 4.036 0 8.438c0 2.361.967 4.061 2.026 5.659l12.433 14.906c1.395 1.309 1.659 1.309 3.054 0l12.461-14.906C31.22 12.499 32 10.799 32 8.438 32 4.036 28.694 0 24 0" stroke="#000" stroke-width=".5" stroke-linecap="round" stroke-linejoin="round" class="svgEventTier${tier}" style="filter:drop-shadow(0px 0px 3px)"/></svg>`;
	return `<svg width="30" height="30" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m13.73 3.51 1.76 3.52c.24.49.88.96 1.42 1.05l3.19.53c2.04.34 2.52 1.82 1.05 3.28l-2.48 2.48c-.42.42-.65 1.23-.52 1.81l.71 3.07c.56 2.43-.73 3.37-2.88 2.1l-2.99-1.77c-.54-.32-1.43-.32-1.98 0l-2.99 1.77c-2.14 1.27-3.44.32-2.88-2.1l.71-3.07c.13-.58-.1-1.39-.52-1.81l-2.48-2.48c-1.46-1.46-.99-2.94 1.05-3.28l3.19-.53c.53-.09 1.17-.56 1.41-1.05l1.76-3.52c.96-1.91 2.52-1.91 3.47 0" stroke="#000" stroke-width=".5" stroke-linecap="round" stroke-linejoin="round" class="svgEventTier${tier}"/></svg>`;
}

function et_initEventTiersHideTier4() {
	document.getElementById("eventTiersHideTier4").checked = et_getHideTier4();
}

function et_toggleHideTier4(force) {
	const hide =
		force || document.getElementById("eventTiersHideTier4").checked;
	et_setHideTier4(hide);
	for (let ele of document.querySelectorAll(
		"span[class='eventGridName'],span[class='eventGridTier']",
	)) {
		if (Number(ele.dataset.tier) === 4)
			ele.style.display = hide ? `none` : ``;
		else ele.style.display = ``;
	}
	document.getElementById("eventTiersHideTier4Amount").style.display =
		hide ? `` : `none`;
}

function et_getHideTier4() {
	const strg = localStorage.getItem(et_LSKey_hideTier4);
	if (!strg) return false;
	return strg !== "0";
}

function et_setHideTier4(hide) {
	localStorage.setItem(et_LSKey_hideTier4, hide ? "1" : "0");
}

function et_getRandomLocale() {
	const locales = [
		"zh-Hans",
		"es-ES",
		"en-GB",
		"hi-IN",
		"pt-BR",
		"bn-BD",
		"ru-UA",
		"ja-JP",
		"tr-TR",
		"ar-EG",
		"ko-KR",
		"de-DE",
		"fr-FR",
		"it-IT",
		"sv-SE",
		"nl-NL",
		"el-GR",
		"uk-UA",
	];
	return locales[randInt(0, locales.length - 1)];
}
