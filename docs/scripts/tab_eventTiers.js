const vet=1.004;
const eventGoals = [[0,75,250,600,1200],[0,125,350,800,1400],[0,175,450,1000,1600]];
const eventIdMult = 10000;

async function et_pullEventTiersData() {
	if (isBadUserData())
		return;
	disablePullButtons();
	let wrapper = document.getElementById(`eventTiersWrapper`);
	et_hideEventSort(true);
	setFormsWrapperFormat(wrapper,0);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		wrapper.innerHTML = `Waiting for user data...`;
		let details = (await getUserDetails()).details;
		wrapper.innerHTML = `Waiting for collections data...`;
		let collections = (await getCompletionData()).data.event;
		wrapper.innerHTML = `Waiting for definitions...`;
		let heroDefs = (await getDefinitions("hero_defines")).hero_defines;
		await et_displayEventTiersData(wrapper,heroDefs,details,collections);
		codeEnablePullButtons();
	} catch (error) {
		et_hideEventSort(true);
		setFormsWrapperFormat(wrapper,0);
		handleError(wrapper,error);
	}
}

async function et_displayEventTiersData(wrapper,heroDefs,details,collections) {
	let owned = et_parseOwnedChamps(heroDefs,details.heroes);
	let ownedById = owned[0];
	let ownedIds = Object.keys(ownedById);
	if (ownedIds.length==0) {
		setFormsWrapperFormat(wrapper,0);
		wrapper.innerHTML = `<span class="f fr w100 p5">You have not unlocked any event champions.</span>`;
		return;
	}
	let ownedNames = owned[1];
	ownedNames.sort();
	let ownedEventById = owned[2];
	
	let ownedChampIdTiers = {};
	for (let id of ownedIds)
		ownedChampIdTiers[id] = ownedIds.includes(id) ? 0 : -1;
	
	let eventNameByEventId = {};
	for (let event1Id of Object.keys(collections)) {
		let event = collections[event1Id].y;
		let event2Id = et_getEvent2IdFromEvent1Id(event1Id);
		if (event2Id!=undefined)
			eventNameByEventId[event2Id] = collections[event1Id].n;
		for (let i=0; i<event.length; i++) {
			let heroId = event[i].h;
			let completedVars = event[i].c;
			let tiersCompleted = [];
			for (let k=1; k<completedVars.length; k++) {
				let statKey = `highest_area_completed_ever_c${completedVars[k]}`;
				if (details.stats.hasOwnProperty(statKey)) {
					let tier = 0;
					for (let t=1; t<eventGoals[k-1].length; t++)
						if (Number(details.stats[statKey]) >= eventGoals[k-1][t])
							tier++;
					tiersCompleted.push(tier);
				} else
					tiersCompleted.push(0);
			}
			if (tiersCompleted.length>0) {
				ownedChampIdTiers[heroId] = {tier:tiersCompleted.reduce((a,b)=>Math.min(a,b)),nameOrder:ownedNames.indexOf(ownedById[heroId])};
				if (ownedEventById[heroId]!=undefined)
					ownedChampIdTiers[heroId].event2Id = `${ownedEventById[heroId]}`;
			}
		}
	}
	
	let event2Ids = Object.keys(eventNameByEventId);
	let currEvent2Id = et_getCurrentOrNextEventId(details.events_details);
	if (currEvent2Id!=undefined) {
		let index = event2Ids.indexOf(`${currEvent2Id}`);
		event2Ids = event2Ids.slice(index).concat(event2Ids.slice(0,index));
	}
	
	let txt = ``;
	txt+=`<span class="eventGridHeader" data-sort="0" data-eventidorder="0" data-nameorder="0" data-id="0" style="display:none"><strong>Champion Event Tiers Completed:</strong></span>`;
	for (let event2Id of event2Ids)
		txt+=`<span class="eventGridHeader" data-sort="1" data-eventidorder="${event2Ids.indexOf(event2Id)}" data-nameorder="0" data-id="0"><strong>${eventNameByEventId[event2Id]} - ${et_getEventMonthByEvent2Id(event2Id)}:</strong></span>`;
	for (let heroId of Object.keys(ownedChampIdTiers)) {
		let heroData = ownedChampIdTiers[heroId];
		if (heroData.tier >= 0)
			txt+=et_addEventTierGridElements(ownedById[heroId], heroId, event2Ids, heroData);
	}
	setFormsWrapperFormat(wrapper,3);
	wrapper.innerHTML = txt;
	et_hideEventSort(false);
	et_changeOrder('event');
}

function et_parseOwnedChamps(defsHeroes,detailsHeroes) {
	let ownedIds = [];
	for (let ownedHero of detailsHeroes)
		if (ownedHero.owned == 1)
			ownedIds.push(Number(ownedHero.hero_id));
	let ownedById = {};
	let ownedNames = [];
	let ownedEventById = {};
	for (let hero of defsHeroes) {
		if (hero.tags.includes("evergreen"))
			continue;
		if (ownedIds.includes(hero.id)) {
			ownedById[hero.id] = hero.name;
			ownedNames.push(hero.name);
			let event2Id = et_getEvent2IdFromEventName(hero.event_name);
			if (event2Id!=undefined)
				ownedEventById[hero.id] = event2Id;
		}
	}
	return [ownedById, ownedNames, ownedEventById];
}

function et_addEventTierGridElements(name,id,event2Ids,heroData) {
	let tierString = ``;
	for (let i=1; i<=4; i++)
		tierString+=`<svg width="30" height="30" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m13.73 3.51 1.76 3.52c.24.49.88.96 1.42 1.05l3.19.53c2.04.34 2.52 1.82 1.05 3.28l-2.48 2.48c-.42.42-.65 1.23-.52 1.81l.71 3.07c.56 2.43-.73 3.37-2.88 2.1l-2.99-1.77c-.54-.32-1.43-.32-1.98 0l-2.99 1.77c-2.14 1.27-3.44.32-2.88-2.1l.71-3.07c.13-.58-.1-1.39-.52-1.81l-2.48-2.48c-1.46-1.46-.99-2.94 1.05-3.28l3.19-.53c.53-.09 1.17-.56 1.41-1.05l1.76-3.52c.96-1.91 2.52-1.91 3.47 0" stroke="#000" stroke-width=".5" stroke-linecap="round" stroke-linejoin="round" class="svgEventTier${i<=heroData.tier?heroData.tier:0}"/></svg>`;
	let txt = `<span class="eventGridName" style="margin-top:4px" data-eventidorder="${event2Ids.indexOf(heroData.event2Id)}" data-id="${id}" data-nameorder="${heroData.nameOrder}">${name}</span><span class="eventGridTier" data-eventidorder="${event2Ids.indexOf(heroData.event2Id)}" data-id="${id}" data-nameorder="${heroData.nameOrder}">${tierString}</span>`;
	return txt;
}

function et_changeOrder(type) {
	let wrapper = document.getElementById('eventTiersWrapper');
	for (let ele of wrapper.childNodes) {
		let eventId = Number(ele.dataset.eventidorder) + 1;
		let heroId = Number(ele.dataset.id);
		let nameId = Number(ele.dataset.nameorder);
		let sort = ele.dataset.sort;
		if (sort!=undefined) {
			if (sort=='1')
				ele.style.display = type=='name'||type=='id' ? 'none' : 'flex';
			else if (sort=='0')
				ele.style.display = type=='name'||type=='id' ? 'flex' : 'none';
		}
		if (type=='name')
			ele.style.order = nameId;
		else if (type=='id')
			ele.style.order = heroId;
		else
			ele.style.order = eventId*eventIdMult + nameId;
	}
}

function et_hideEventSort(hide) {
	document.getElementById('eventTiersSortHolder').style.display = hide ? 'none' : '';
}

function et_getEvent2IdFromEvent1Id(event1Id) {
	switch(Number(event1Id)) {
		case  1: return  1;
		case  2: return  2;
		case  3: return  3;
		case  4: return  4;
		case  5: return  5;
		case 10: return  6;
		case 12: return  7;
		case 16: return  8;
		case 26: return  9;
		case 30: return 10;
		case 37: return 11;
		case 39: return 12;
	}
}

function et_getEvent2IdFromEventName(eventName) {
	switch(eventName) {
		case "Highharvestide": return 1;
		case "Liars' Night":
		case "Liar's Night": return 2;
		case "Feast of the Moon": return 3;
		case "Simril": return 4;
		case "Wintershield": return 5;
		case "Grand Revel": return 6;
		case "Fleetswake": return 7;
		case "Festival of Fools": return 8;
		case "The Great Modron March": return 9;
		case "Dragondown": return 10;
		case "Founders' Day":
		case "Founder's Day": return 11;
		case "Ahghairon's Day":
		case "Aghairon's Day": return 12;
	}
}

function et_getEventMonthByEvent2Id(event2Id) {
	return Intl.DateTimeFormat(undefined, { month: 'long' }).format(new Date(`${((Number(event2Id)+7)%12)+1}`));
}

function et_getCurrentOrNextEventId(details) {
	if (details.hasOwnProperty('active_events')&&details.active_events.length==1)
		return details.active_events[0].event_id;
	if (details.hasOwnProperty('next_event')&&details.next_event.hasOwnProperty('event_id'))
		return details.next_event.event_id;
}