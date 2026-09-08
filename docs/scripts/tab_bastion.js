const vbt = 1.004; // prettier-ignore
const bt_serverCalls = new Set(["getbastiondetails"]);
const bt_definitionsFilters = new Set([
	"bastion_room_defines",
	"bastion_trophy_defines",
]);
const bt_costTypes = ["hard_currency", "patron_currency", "gems", ""];
let bt_bastionMap = null;

/*
    Notes on Bastion server calls:
	  - `unlockBastionRoom` seems explicitly designed for level 0 -> 1.
	  - `unlockBastionRoomFeature` is for levelling up 1 -> 2 or 2 -> 3 etc.
	      - The level it will become must be sent with the call. Too high or too low causes failure.
	  - `levelupbastionroom` seems to result in `okay:null` no matter what room I use it on.
	      - I am guessing it will level up rooms that do not unlock features - none of those exist yet.
	  - `saveBastionLayout` is a mystery. No idea what it will be for or what format the call will take.
	  - `purchaseBastionTrophy` buys a trophy - very simple.
*/

function bt_registerData() {
	bt_serverCalls.forEach((c) => t_tabsServerCalls.add(c));
	bt_definitionsFilters.forEach((f) => t_tabsDefinitionsFilters.add(f));
}

function bt_tab() {
	return `
					<span class="f fr w100 p5">
						<span class="f falc fjs ml2" style="width:100%">
							<h1>Bastion</h1>
						</span>
					</span>
					<span class="f fr w100 p5">
						<span class="f falc fjs ml2" style="width:100%">
							This page will provide details about your Bastion including rooms and trophies.
						</span>
					</span>
					<span class="f fr w100 p5">
						&nbsp;
					</span>
					<span class="f fr w100 p5" style="height:34px;">
						<span class="f falc fje mr2" style="width:50%;">
							<input type="button" onClick="bt_pullBastionData()" name="bastionPullButton" id="bastionPullButton" value="Pull Bastion Data" style="min-width:175px">
							<span id="bastionPullButtonDisabled" style="font-size:0.9em" hidden>&nbsp;</span>
						</span>
					</span>
					<span class="f fr w100 p5">
						&nbsp;
					</span>
					<span class="f falc fje mr2" style="flex-direction:column" id="bastionWrapper">
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

async function bt_pullBastionData(bastionDetails, definitions) {
	if (!bastionDetails || !definitions) {
		if (isBadUserData()) return;
		disablePullButtons();
	}
	const wrapper = document.getElementById(`bastionWrapper`);
	setWrapperFormat(wrapper, 0);
	try {
		if (!bastionDetails) {
			wrapper.textContent = `Waiting for bastion details...`;
			bastionDetails = await getBastionDetails();
		}
		if (!definitions) {
			wrapper.textContent = `Waiting for definitions...`;
			definitions = await getDefinitions(
				filtersFromSet(bt_definitionsFilters),
			);
		}
		bt_displayBastionData(
			wrapper,
			bastionDetails,
			definitions.bastion_room_defines,
			definitions.bastion_trophy_defines,
		);
		codeEnablePullButtons();
	} catch (error) {
		setWrapperFormat(wrapper, 0);
		handleError(wrapper, error);
	}
}

function bt_displayBastionData(
	wrapper,
	bastionDetails,
	roomDefines,
	trophyDefines,
) {
	if (
		!bastionDetails?.success ||
		!bastionDetails?.bastion_details ||
		!Array.isArray(bastionDetails?.unlocked_features) ||
		!Array.isArray(roomDefines) ||
		!Array.isArray(trophyDefines)
	) {
		setWrapperFormat(wrapper, 0);
		handleInvalidData(wrapper);
		return;
	}
	bt_buildMaps(bastionDetails, roomDefines, trophyDefines);
	setWrapperFormat(wrapper, 2);

	wrapper.replaceChildren();

	// Rooms
	bt_appendCategoryHeader(wrapper, `Rooms`);

	const roomsSorted = [...bt_bastionMap.get("rooms").values()].sort(
		bt_roomSort,
	);
	for (const room of roomsSorted) {
		const outer = document.createElement(`span`);
		outer.classList.add(`f`, `fc`);

		bt_appendItemHeader(outer, room.name);

		const body = document.createElement(`span`);
		body.classList.add(`formsCampaign`);

		const level = bt_generateAmountsStrings(room.level, room.maxLevel);
		bt_appendRow(body, `Level`, level.text, null, level.colour);

		if (room.unlocks.length > 0) bt_tryAppendNextUpgrade(body, room);

		outer.appendChild(body);
		wrapper.appendChild(outer);
	}

	// Trophies
	bt_appendCategoryHeader(wrapper, `Trophies`, true);

	const trophiesSorted = [...bt_bastionMap.get("trophies").values()].sort(
		bt_trophySort,
	);
	for (const trophy of trophiesSorted) {
		const outer = document.createElement(`span`);
		outer.classList.add(`f`, `fc`);

		bt_appendItemHeader(outer, trophy.name);

		const body = document.createElement(`span`);
		body.classList.add(`formsCampaign`);

		const owned = bt_generateAmountsStrings(trophy.count, trophy.maxCount);
		bt_appendRow(body, `Owned`, owned.text, null, owned.colour);

		const rarity = bt_generateRarityStrings(trophy.rarity);
		bt_appendRow(body, `Rarity`, rarity.text, null, rarity.colour);

		bt_appendRow(body, `Cost`, trophy.costStr);

		bt_appendRow(body, `Bastion Buff`, decideSciNote(trophy.bastionBuff));

		outer.appendChild(body);
		wrapper.appendChild(outer);
	}
}

function bt_tryAppendNextUpgrade(body, room) {
	const unlock = room.unlocks.filter(
		(e) => e?.level === room?.level + 1,
	)?.[0];
	if (
		!unlock ||
		!unlock?.unlocks ||
		!Array.isArray(unlock.requires) ||
		room?.level == null ||
		unlock?.level == null
	)
		return;

	const header =
		(room.level === 0 ? `Room` : `Next Level (${nf(unlock.level)})`) +
		` Unlocks & Requirements`;
	bt_appendRow(body, blankSpace);
	bt_appendRequirementHeader(body, header);
	bt_appendRequirementRow(body, 1, unlock.unlocks);
	for (const req of unlock.requires) {
		let text = addFullStop(req.desc);
		if (req?.earned) text += ` (Earned)`;
		else if (req?.progress && req?.goal)
			text += ` (${nf(req.progress)} / ${nf(req.goal)})`;
		bt_appendRequirementRow(body, 2, text);
	}
}

function bt_appendCategoryHeader(parent, text, addSpacer = false) {
	const header = document.createElement(`span`);
	header.classList.add(`f`, `fr`, `falc`, `fjs`);
	header.style.gridColumn = `1 / -1`;
	header.style.fontSize = `1.5em`;
	header.style.fontWeight = `bold`;
	if (addSpacer) header.style.marginTop = `1em`;
	header.textContent = text;

	parent.appendChild(header);
}

function bt_appendItemHeader(parent, text) {
	const header = document.createElement(`span`);
	header.classList.add(`formsCampaignTitle`);
	header.style.fontSize = `1.2em`;
	header.textContent = text;

	parent.appendChild(header);
}

function bt_appendRow(
	parent,
	leftText = null,
	rightText = null,
	colourLeft = null,
	colourRight = null,
) {
	const row = document.createElement(`span`);
	row.classList.add(`formsCampaignFormation`, `p5`);

	if (!rightText) {
		row.textContent = leftText;
		row.style.textWrapStyle = `pretty`;
		if (colourLeft) row.style.color = colourLeft;

		parent.appendChild(row);
		return;
	}

	const left = document.createElement(`span`);
	left.classList.add(`f`, `falc`, `fje`, `partiesLeft`);
	if (colourLeft) left.style.color = colourLeft;
	left.textContent = leftText + ":";
	row.appendChild(left);

	const right = document.createElement(`span`);
	right.classList.add(`f`, `falc`, `fjs`, `partiesRight`);
	if (colourRight) right.style.color = colourRight;
	right.textContent = rightText;
	row.appendChild(right);

	parent.appendChild(row);
}

function bt_appendRequirementHeader(parent, text) {
	const header = document.createElement(`span`);
	header.style.fontSize = `1.1em`;
	header.style.fontWeight = `bold`;
	header.textContent = text;

	parent.appendChild(header);
}

function bt_appendRequirementRow(parent, padMult, text) {
	const row = document.createElement(`span`);
	row.classList.add(`formsCampaignFormation`, `p5`);
	row.textContent = text;
	row.style.textWrapStyle = `pretty`;
	row.style.paddingLeft = `${padMult * 15}px`;

	parent.appendChild(row);
	return;
}

function bt_buildMaps(bastionDetails, roomDefines, trophyDefines) {
	const map = new Map();

	// Rooms
	const rooms = new Map();
	bt_parseRoomDefines(rooms, roomDefines);
	bt_parseRoomDetails(rooms, bastionDetails?.bastion_details?.rooms);
	bt_parseRoomRequirementProgress(
		rooms,
		bastionDetails?.bastion_details?.requirements_progress,
	);
	map.set("rooms", rooms);

	// Trophies
	const trophies = new Map();
	bt_parseTrophyDefines(trophies, trophyDefines);
	bt_parseTrophyDetails(trophies, bastionDetails?.bastion_details?.trophies);
	map.set("trophies", trophies);

	bt_bastionMap = map;
}

function bt_parseRoomDefines(rooms, roomDefines) {
	for (const room of roomDefines) {
		const id = Number(room?.id ?? -1);
		const name = room?.name;
		const desc = room?.description;
		if (id <= 0 || !name || !desc) continue;
		const roomObj = {id, name, desc, level: 0, maxLevel: 1, unlocks: []};

		const unlockReqs = bt_parseRoomUnlockReqs(room);
		if (unlockReqs) roomObj.unlocks.push(unlockReqs);

		const extraUnlocks = bt_parseRoomExtraUnlocks(room);
		if (extraUnlocks)
			for (const unlock of extraUnlocks) {
				roomObj.unlocks.push(unlock);
				if (unlock.level > roomObj.maxLevel)
					roomObj.maxLevel = unlock.level;
			}
		rooms.set(id, roomObj);
	}
}

function bt_parseRoomDetails(rooms, roomDetails) {
	if (!Array.isArray(roomDetails) || roomDetails.length === 0) return;

	for (const room of roomDetails) {
		const id = Number(room?.room_id ?? -1);
		const level = Number(room?.level ?? -1);
		if (id <= 0 || level <= 0) continue;
		rooms.get(id).level = level;
	}
}

function bt_parseRoomRequirementProgress(rooms, roomProgress) {
	if (!roomProgress) return;

	for (const roomIdStr in Object.keys(roomProgress)) {
		const progs = roomProgress[roomIdStr];
		const roomId = Number(roomIdStr ?? -1);
		if (!Array.isArray(progs) || roomId <= 0) continue;
		for (const prog of progs) {
			const reqIndex = Number(prog?.req_index ?? -1);
			const progress = Number(prog?.progress ?? -1);
			const goal = Number(prog?.goal ?? -1);
			if (reqIndex < 0 || progress < 0 || goal <= 0) continue;
			const room = rooms?.get(roomId);
			if (!room || !room?.unlocks || !room?.level) continue;
			for (const unlock of room.unlocks) {
				if (unlock.level !== room?.level + 1) continue;
				const specificReq = unlock?.requires?.[reqIndex];
				if (!specificReq) continue;
				if (progress < goal) specificReq.earned = true;
				specificReq.progress = progress < goal ? progress : goal;
				specificReq.goal = goal;
				break;
			}
		}
	}
}

function bt_parseTrophyDefines(trophies, trophyDefines) {
	for (const trophy of trophyDefines) {
		const id = Number(trophy?.id ?? -1);
		const name = trophy?.name;
		if (id <= 0 || !name) continue;
		const desc = trophy?.description ?? "";
		const rarity = Number(trophy?.rarity ?? 1);
		const maxCount = Number(trophy?.max_count ?? 1);
		const bastionBuff = Number(trophy?.bastion_buff ?? 0);
		const cost = bt_parseTrophyCost(trophy?.cost) ?? ["", Infinity, "-"];
		trophies.set(id, {
			id,
			name,
			desc,
			rarity,
			count: 0,
			maxCount,
			bastionBuff,
			costType: cost[0],
			costValue: cost[1],
			costStr: cost[2],
		});
	}
}

function bt_parseTrophyDetails(trophies, trophyDetails) {
	if (!Array.isArray(trophyDetails) || trophyDetails.length === 0) return;

	for (const trophy of trophyDetails) {
		const id = Number(trophy?.trophy_id ?? -1);
		if (id <= 0) continue;
		trophies.get(id).count++;
	}
}

function bt_parseRoomUnlockReqs(room) {
	const unlockReqsObj = room?.unlock_requirements;
	if (!unlockReqsObj || Array.isArray(unlockReqsObj)) return null;

	const unlocksText = unlockReqsObj?.unlocks_text;
	if (!unlocksText) return null;

	const unlockReqs = unlockReqsObj?.requirements;
	if (!Array.isArray(unlockReqs)) return null;

	const reqs = [];
	for (const req of unlockReqs) {
		const desc = (req?.description ?? "None")
			.replace(/\(current: \$[^)]+\)/g, "")
			.trim();
		reqs.push({desc, earned: false});
	}
	if (reqs.length === 0) return null;

	return {unlocks: unlocksText, requires: reqs, level: 1};
}

function bt_parseRoomExtraUnlocks(room) {
	const extraUnlocks = room?.extra_unlocks;
	if (!Array.isArray(extraUnlocks) || extraUnlocks.length === 0) return null;

	const unlocks = [];
	let level = 1;
	for (const extraUnlock of extraUnlocks) {
		level++;
		const unlocksText = extraUnlock?.unlocks_text;
		if (!unlocksText) continue;

		const unlockReqs = extraUnlock?.requirements;
		const reqs = [];
		if (!Array.isArray(unlockReqs)) continue;
		for (const req of unlockReqs) {
			const desc = (req?.description ?? "None")
				.replace(/\(current: \$[^)]+\)/g, "")
				.trim();
			reqs.push({desc, earned: false});
		}
		unlocks.push({unlocks: unlocksText, requires: reqs, level});
	}
	if (unlocks.length === 0) return null;

	return unlocks;
}

function bt_parseTrophyCost(cost) {
	if (Array.isArray(cost)) return null;
	const type = cost?.type;
	if (!type) return null;
	if (type === "gems") {
		const amnt = Number(cost?.amount ?? -1);
		if (amnt <= 0) return null;
		return [type, amnt, `${nf(amnt)} Gems`];
	} else if (type === "hard_currency") {
		const amnt = Number(cost?.amount ?? -1);
		if (amnt <= 0) return null;
		return [type, amnt, `${nf(amnt)} Platinum`];
	} else if (type === "patron_currency") {
		const patronId = Number(cost?.patron_id ?? -1);
		const amnt = Number(cost?.patron_currency ?? -1);
		if (patronId <= 0 || amnt <= 0) return null;
		return [
			type,
			patronId,
			`${nf(amnt)} ${c_patronById.get(patronId)} Currency`,
		];
	}
	console.log("Unknown Bastion trophy cost type: " + type);
	return null;
}

function bt_generateAmountsStrings(curr, max) {
	return {
		text: `${nf(curr)} / ${nf(max)}`,
		colour:
			curr === max ? `var(--CarolinaBlue)`
			: curr > 0 ? `var(--Saffron)`
			: `var(--RedOrange)`,
	};
}

function bt_generateRarityStrings(rarityId) {
	const rarity = r_rarityById.get(rarityId);
	return {
		text: rarity?.name ?? "-",
		colour: rarity?.colour ?? null,
	};
}

function bt_roomSort(a, b) {
	// Put rooms at max level last.
	if (a.level === a.maxLevel && b.level < b.maxLevel) return 1;
	if (a.level < a.maxLevel && b.level === b.maxLevel) return -1;

	// Then by name.
	return a.name.localeCompare(b.name);
}

function bt_trophySort(a, b) {
	// Put trophies at max count last.
	if (a.count === a.maxCount && b.count < b.maxCount) return 1;
	if (a.count < a.maxCount && b.count === b.maxCount) return -1;

	// No Cost -> Gems -> Patron Currency -> Platinum.
	const aCostInd = bt_costTypes.indexOf(a.costType);
	const bCostInd = bt_costTypes.indexOf(b.costType);
	if (aCostInd !== bCostInd) return bCostInd - aCostInd; // reverse-order.

	// Cost value (or patronId) increasing.
	if (a.costValue !== b.costValue) return a.costValue - b.costValue;

	// Rarity increasing.
	if (a.rarity !== b.rarity) return a.rarity - b.rarity;

	// Lastly by name.
	return a.name.localeCompare(b.name);
}
