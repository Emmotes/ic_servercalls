const vpm = 1.011; // prettier-ignore

async function pm_pullPartyData() {
	if (isBadUserData()) return;
	disablePullButtons();
	const wrapper = document.getElementById(`partyWrapper`);
	setFormsWrapperFormat(wrapper, 0);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		wrapper.innerHTML = `Waiting for user data...`;
		const gameInstances = (await getUserDetails()).details.game_instances;
		wrapper.innerHTML = `Waiting for definitions...`;
		const adventures = (await getDefinitions("adventure_defines"))
			.adventure_defines;
		await pm_displayPartyData(wrapper, gameInstances, adventures);
		codeEnablePullButtons();
	} catch (error) {
		setFormsWrapperFormat(wrapper, 0);
		handleError(wrapper, error);
	}
}

async function pm_displayPartyData(wrapper, gameInstances, adventures) {
	let txt = "";
	for (let gameInstance of gameInstances) {
		const id = gameInstance.game_instance_id;
		const adventureId = gameInstance.current_adventure_id;
		if (adventureId == null) continue;
		const adventure =
			adventureId > 0 ?
				pm_getAdventure(adventureId, adventures)
			:	undefined;
		let customName = gameInstance.custom_name;
		if (customName !== `` && customName != null)
			customName = `: ${customName}`;
		txt += `<span style="display:flex;flex-direction:column"><span class="formsCampaignTitle">Party ${id}${customName}</span><span class="formsCampaign">`;
		if (adventureId === -1 || adventure == null) {
			txt += pm_addPartyRow(`Chilling on the map screen.`);
			txt += `</span></span>`;
			continue;
		}
		const name = adventure.name;
		const adv = gameInstance.defines.adventure_defines.slice(-1)[0].name;
		const camp = c_campaignIds[adventure.campaign_id];
		const patronId = Number(gameInstance.current_patron_id || 0);
		let areaGoal;
		if (gameInstance.defines.adventure_defines.length > 0) {
			let advDef = gameInstance.defines.adventure_defines[0];
			if (patronId === 0 && advDef.objectives.length > 0) {
				areaGoal = advDef.objectives[0].area;
			} else if (
				advDef.patron_objectives != null &&
				Object.keys(advDef.patron_objectives).includes(`${patronId}`)
			) {
				let patObj = advDef.patron_objectives[patronId];
				outerLoop: for (let patObjKey in patObj) {
					for (let patObjIn of patObj[patObjKey]) {
						if (
							patObjIn.condition != null &&
							patObjIn.condition === `complete_area` &&
							patObjIn.area != null
						) {
							areaGoal = Number(patObjIn.area);
							break outerLoop;
						}
					}
				}
			}
		}

		if (name !== adv) txt += pm_addPartyRow(`Name`, name);
		txt += pm_addPartyRow(`Adventure`, adv);
		txt += pm_addPartyRow(`Campaign`, camp);
		if (patronId > 0)
			txt += pm_addPartyRow(`Patron`, getPatronNameById(patronId));
		txt += pm_addPartyRow(`Current Area`, `z${gameInstance.current_area}`);
		if (areaGoal != null)
			txt += pm_addPartyRow(`Area Goal`, `z${areaGoal}`);
		txt += `<span class="formsCampaignSelect redButton" id="partyEndAdventureSpan${id}"><input type="button" onClick="pm_partyEndAdventure(${id})" value="End Party ${id}"></span>`;
		txt += `</span></span>`;
	}
	setFormsWrapperFormat(wrapper, 2);
	wrapper.innerHTML = txt;
}

function pm_getAdventure(adventureId, adventures) {
	for (let adventure of adventures)
		if (adventure.id === adventureId) return adventure;
	return undefined;
}

async function pm_partyEndAdventure(partyId) {
	const span = document.getElementById(`partyEndAdventureSpan${partyId}`);
	let txt = ``;
	txt += `Ending Party...`;
	span.innerHTML = txt;
	const result = await endCurrentObjective(partyId);
	if (result["success"]) {
		span.innerHTML = `<strong>Ended Successfully</strong>`;
		span.style = `color:var(--good1)`;
	} else {
		span.innerHTML = `<strong>Failed to End</strong>`;
		span.style = `color:var(--warning1)`;
	}
}

function pm_addPartyRow(left, right) {
	let txt = `<span class="formsCampaignFormation"><span class="f fr falc fjs p5 w100">`;
	if (right == null) txt += `<span class="f falc fjs w100">${left}</span>`;
	else
		txt += `<span class="f falc fje partiesLeft"><strong>${left}</strong>:</span><span class="f falc fjs partiesRight">${right}</span>`;
	txt += `</span></span>`;
	return txt;
}
