const vet=1.003;
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
	let ownedByName = owned[1];
	let ownedIds = Object.keys(ownedById);
	if (ownedIds.length==0) {
		setFormsWrapperFormat(wrapper,0);
		wrapper.innerHTML = `<span class="f fr w100 p5">You have not unlocked any event champions.</span>`;
		return;
	}
	let ownedChampIdTiers = {};
	
	let names = Object.keys(ownedByName);
	names.sort();
	
	for (let id of ownedIds)
		ownedChampIdTiers[id] = ownedIds.includes(id) ? 0 : -1;
	
	let eventIds = Object.keys(collections);
	numSort(eventIds);
	for (let eventId of eventIds) {
		let event = collections[eventId].y;
		for (let i=0; i<event.length; i++) {
			let heroId = event[i].h;
			let completedVars = event[i].c;
			let tiersCompleted = [];
			for (let k=1; k<completedVars.length; k++) {
				let statKey = `highest_area_completed_ever_c${completedVars[k]}`;
				if (details.stats.hasOwnProperty(statKey)) {
					let statValue = Number(details.stats[statKey]);
					let tier = 0;
					for (let t=1; t<eventGoals[k-1].length; t++)
						if (statValue >= eventGoals[k-1][t])
							tier++;
					tiersCompleted.push(tier);
				} else
					tiersCompleted.push(0);
			}
			if (tiersCompleted.length>0)
				ownedChampIdTiers[heroId] = {tier:tiersCompleted.reduce((a,b)=>Math.min(a,b)),eventId:eventId,nameOrder:names.indexOf(ownedById[heroId])};
		}
	}
	
	let currEventId = et_getCurrentOrNextEventId(details.events_details);
	if (currEventId!=undefined) {
		eventIds.sort((a,b)=>{
			if (a>=10)
				return b>=currEventId ? 1 : -1;
			else
				return b>=currEventId ? -1 : 1;
		});
	}
	
	setFormsWrapperFormat(wrapper,3);
	let txt = ``;
	txt+=`<span class="eventGridHeader" data-sort="1" style="order:0;display:none"><strong>Champion Event Tiers Completed:</strong></span>`;
	for (let eventId of eventIds)
		txt+=`<span class="eventGridHeader" data-sort="0" style="order:${Number(eventId)*eventIdMult}"><strong>${collections[eventId].n}:</strong></span>`;
	for (let name of names) {
		let id = ownedByName[name];
		if (ownedChampIdTiers[id].tier >= 0)
			txt+=et_addEventTierGridElements(name, id, ownedChampIdTiers[id]);
	}
	wrapper.innerHTML = txt;
	et_hideEventSort(false);
}

function et_parseOwnedChamps(defsHeroes,detailsHeroes) {
	let ownedIds = [];
	for (let ownedHero of detailsHeroes)
		if (ownedHero.owned == 1)
			ownedIds.push(Number(ownedHero.hero_id));
	let ownedById = {};
	let ownedByName = {};
	for (let hero of defsHeroes) {
		if (hero.tags.includes("evergreen"))
			continue;
		if (ownedIds.includes(hero.id)) {
			ownedById[hero.id] = hero.name;
			ownedByName[hero.name] = Number(hero.id);
		}
	}
	return [ownedById, ownedByName];
}

function et_addEventTierGridElements(name,id,tier) {
	let tierString = ``;
	for (let i=1; i<=4; i++)
		tierString+=`<svg width="30" height="30" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m13.73 3.51 1.76 3.52c.24.49.88.96 1.42 1.05l3.19.53c2.04.34 2.52 1.82 1.05 3.28l-2.48 2.48c-.42.42-.65 1.23-.52 1.81l.71 3.07c.56 2.43-.73 3.37-2.88 2.1l-2.99-1.77c-.54-.32-1.43-.32-1.98 0l-2.99 1.77c-2.14 1.27-3.44.32-2.88-2.1l.71-3.07c.13-.58-.1-1.39-.52-1.81l-2.48-2.48c-1.46-1.46-.99-2.94 1.05-3.28l3.19-.53c.53-.09 1.17-.56 1.41-1.05l1.76-3.52c.96-1.91 2.52-1.91 3.47 0" stroke="#000" stroke-width=".5" stroke-linecap="round" stroke-linejoin="round" class="svgEventTier${i<=tier.tier?tier.tier:0}"/></svg>`;
	let txt = `<span class="eventGridName" style="margin-top:4px;order:${Number(tier.eventId)*eventIdMult+Number(tier.nameOrder)}" data-eventid="${tier.eventId}" data-id="${id}" data-nameorder="${tier.nameOrder}">${name}</span><span class="eventGridTier" style="order:${Number(tier.eventId)*eventIdMult+Number(tier.nameOrder)}" data-eventid="${tier.eventId}" data-id="${id}" data-nameorder="${tier.nameOrder}">${tierString}</span>`;
	return txt;
}

function et_changeOrder(type) {
	let wrapper = document.getElementById('eventTiersWrapper');
	for (let ele of wrapper.childNodes) {
		let eventId = Number(ele.dataset.eventid);
		let heroId = Number(ele.dataset.id);
		let nameId = Number(ele.dataset.nameorder);
		if (ele.dataset.sort != undefined) {
			if (ele.dataset.sort == '1')
				ele.style.display = type=='name' || type=='id' ? 'flex' : 'none';
			else if (ele.dataset.sort == '0')
				ele.style.display = type=='name' || type=='id' ? 'none' : 'flex';
		} else {
			if (type=='name')
				ele.style.order = nameId;
			else if (type=='id')
				ele.style.order = heroId;
			else
				ele.style.order = eventId*eventIdMult + nameId;
		}
	}
}

function et_hideEventSort(hide) {
	document.getElementById('eventTiersSortHolder').style.display = hide ? 'none' : '';
}

function et_getEvent1IdFromEvent2Id(event2Id) {
	switch(event2Id) {
		case  1: return 1;
		case  2: return 2;
		case  3: return 3;
		case  4: return 4;
		case  5: return 5;
		case  6: return 10;
		case  7: return 12;
		case  8: return 16;
		case  9: return 26;
		case 10: return 30;
		case 11: return 37;
		case 12: return 39;
	}
}

function et_getCurrentOrNextEventId(details) {
	if (details.hasOwnProperty('active_events')&&details.active_events.length==1)
		return et_getEvent1IdFromEvent2Id(details.active_events[0].event_id);
	if (details.hasOwnProperty('next_event')&&details.next_event.hasOwnProperty('event_id'))
		return et_getEvent1IdFromEvent2Id(details.next_event.event_id);
}