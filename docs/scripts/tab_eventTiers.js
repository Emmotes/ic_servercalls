const vet=1.000;
const eventGoals = [[0,75,250,600,1200],[0,125,350,800,1400],[0,175,450,1000,1600]];

async function et_pullEventTiersData() {
	if (isBadUserData())
		return;
	disablePullButtons();
	let wrapper = document.getElementById(`eventTiersWrapper`);
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
		handleError(wrapper,error);
	}
}

async function et_displayEventTiersData(wrapper,heroDefs,details,collections) {
	let owned = et_parseOwnedChamps(heroDefs,details.heroes);
	let ownedById = owned[0];
	let ownedByName = owned[1];
	let ownedIds = Object.keys(ownedById);
	let ownedChampIdTiers = {};
	
	for (let id of ownedIds)
		ownedChampIdTiers[id] = ownedIds.includes(id) ? 0 : -1;
	
	for (let eventId of Object.keys(collections)) {
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
			ownedChampIdTiers[heroId] = tiersCompleted.reduce((a,b)=>Math.min(a,b));
		}
	}
	
	let names = Object.keys(ownedByName);
	names.sort();
	
	let txt = ``;
	txt+=`<span class="f fr w100 p5" style="font-size:1.2em">Champion Event Tiers Completed:</span>`;
	for (let name of names) {
		let id = ownedByName[name];
		if (ownedChampIdTiers[id] >= 0)
			txt+=et_addEventTierRow(name, ownedChampIdTiers[id]);
	}
	wrapper.innerHTML = txt;
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

function et_addEventTierRow(name,tier) {
	let svg=`<svg width="35" height="35" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m13.73 3.51 1.76 3.52c.24.49.88.96 1.42 1.05l3.19.53c2.04.34 2.52 1.82 1.05 3.28l-2.48 2.48c-.42.42-.65 1.23-.52 1.81l.71 3.07c.56 2.43-.73 3.37-2.88 2.1l-2.99-1.77c-.54-.32-1.43-.32-1.98 0l-2.99 1.77c-2.14 1.27-3.44.32-2.88-2.1l.71-3.07c.13-.58-.1-1.39-.52-1.81l-2.48-2.48c-1.46-1.46-.99-2.94 1.05-3.28l3.19-.53c.53-.09 1.17-.56 1.41-1.05l1.76-3.52c.96-1.91 2.52-1.91 3.47 0" stroke="#000" stroke-width=".5" stroke-linecap="round" stroke-linejoin="round" class="svgEventTier${tier}"/></svg>`;
	let tierString = svg;
	for (let i=1; i<tier; i++)
		tierString+=svg;
	let txt = `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:20%;min-width:150px;margin-top:4px">${name}</span><span class="f falc fjs ml2" style="min-width:120px;max-width:400px;">${tierString}</span>`;
	txt += `</span>`;
	return txt;
}