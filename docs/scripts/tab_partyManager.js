const vpm=1.005;

async function pullPartyData() {
	if (userIdent[0]==``||userIdent[1]==``) {
		init();
		return;
	}
	temporarilyDisableAllPullButtons();
	let wrapper = document.getElementById(`partyWrapper`);
	setFormsWrapperFormat(wrapper,0);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		wrapper.innerHTML = `Waiting for user data...`;
		let gameInstances = (await getUserDetails()).details.game_instances;
		wrapper.innerHTML = `Waiting for definitions...`;
		let adventures = (await getDefinitions("adventure_defines")).adventure_defines;
		await displayPartyData(wrapper,gameInstances,adventures);
	} catch (error) {
		setFormsWrapperFormat(wrapper,0);
		handleError(wrapper,error);
	}
}

async function displayPartyData(wrapper,gameInstances,adventures) {
	let txt = ``;
	for (let gameInstance of gameInstances) {
		let id = gameInstance.game_instance_id;
		let adventureId = gameInstance.current_adventure_id;
		if (adventureId == undefined)
			continue;
		let adventure = adventureId > 0 ? getAdventure(adventureId,adventures) : undefined;
		let customName = gameInstance.custom_name;
		if (customName!=``)
			customName = `: ${customName}`;
		txt+=`<span style="display:flex;flex-direction:column"><span class="formsCampaignTitle">Party ${id}${customName}</span><span class="formsCampaign" id="${id}">`
		if (adventureId == -1 || adventure == undefined) {
			txt+=addPartyRow(`Chilling on the map screen.`);
			txt+=`</span></span>`;
			continue;
		}
		let name = adventure.name;
		let adv = gameInstance.defines.adventure_defines.slice(-1)[0].name;
		let camp = campaignIds[adventure.campaign_id];
		let areaGoal;
		if (gameInstance.defines.adventure_defines.length > 0 && gameInstance.defines.adventure_defines[0].objectives.length > 0)
			areaGoal = gameInstance.defines.adventure_defines[0].objectives[0].area;
		
		if (name != adv)
			txt+=addPartyRow(`Name`,name);
		txt+=addPartyRow(`Adventure`,adv);
		txt+=addPartyRow(`Campaign`,camp);
		if (gameInstance.current_patron_id > 0)
			txt+=addPartyRow(`Patron`,getPatronNameById(gameInstance.current_patron_id));
		txt+=addPartyRow(`Current Area`,`z${gameInstance.current_area}`);
		if (areaGoal != undefined)
			txt+=addPartyRow(`Area Goal`,`z${areaGoal}`);
		txt+=`<span class="formsCampaignSelect redButton" id="partyEndAdventureSpan${id}"><input type="button" onClick="partyEndAdventure(${id})" value="End Party ${id}"></span>`;
		txt+=`</span></span>`;
	}
	setFormsWrapperFormat(wrapper,2);
	wrapper.innerHTML = txt;
}

function getAdventure(adventureId,adventures) {
	for (let adventure of adventures)
		if (adventure.id == adventureId)
			return adventure;
	return undefined;
}

async function partyEndAdventure(partyId) {
	let span = document.getElementById(`partyEndAdventureSpan${partyId}`);
	let txt=``;
	txt+=`Ending Party...`;
	span.innerHTML = txt;
	let result = await endCurrentObjective(partyId);
	if (result['success']) {
		span.innerHTML = `<strong>Ended Successfully</strong>`;
		span.style = `color:var(--good1)`;
	} else {
		span.innerHTML = `<strong>Failed to End</strong>`;
		span.style = `color:var(--warning1)`;
	}
}

function addPartyRow(left,right) {
	let txt = `<span class="formsCampaignFormation"><span class="f fr falc fjs p5 w100">`;
	if (right==undefined)
		txt+=`<span class="f falc fjs w100">${left}</span>`;
	else
		txt+=`<span class="f falc fje partiesLeft"><strong>${left}</strong>:</span><span class="f falc fjs partiesRight">${right}</span>`;
	txt+=`</span></span>`;
	return txt;
}