const vbt = 1.000; // prettier-ignore
const bt_serverCalls = new Set(["getbastiondetails"]);
const bt_definitionsFilters = new Set([
	"bastion_room_defines",
	"bastion_trophy_defines",
]);
const bt_costTypes = ["hard_currency", "patron_currency", "gems", ""];
let bt_bastionMap = null;

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
							This page will provide details about your Bastion.
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
			wrapper.innerHTML = `Waiting for bastion details...`;
			bastionDetails = await getBastionDetails();
		}
		if (!definitions) {
			wrapper.innerHTML = `Waiting for definitions...`;
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

	for (const child of wrapper.childNodes) wrapper.removeChild(child);

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

		if (room.level > 0) bt_appendRow(body, `Level`, nf(room.level));
		else
			bt_appendRow(
				body,
				`Level`,
				`Locked`,
				null,
				`var(--TangerineYellow)`,
			);

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

		const ownedText =
			trophy.count === 0 ?
				`Unowned`
			:	`${nf(trophy.count)} / ${nf(trophy.maxCount)}`;
		const ownedColour =
			trophy.count === 0 ? `var(--TangerineYellow)` : null;
		bt_appendRow(body, `Owned`, ownedText, null, ownedColour);

		bt_appendRow(body, `Rarity`, r_nameById?.get(trophy.rarity) ?? `-`);

		bt_appendRow(body, `Cost`, trophy.costStr);

		bt_appendRow(body, `Bastion Buff`, decideSciNote(trophy.bastionBuff));

		outer.appendChild(body);
		wrapper.appendChild(outer);
	}
}

function bt_appendCategoryHeader(parent, headerText, addSpacer = false) {
	const header = document.createElement(`span`);
	header.classList.add(`f`, `fr`, `falc`, `fjs`);
	header.style.gridColumn = `1 / -1`;
	header.style.fontSize = `1.5em`;
	header.style.fontWeight = `bold`;
	if (addSpacer) header.style.marginTop = `1em`;
	header.textContent = headerText;

	parent.appendChild(header);
}

function bt_appendItemHeader(parent, headerText) {
	const header = document.createElement(`span`);
	header.classList.add(`formsCampaignTitle`);
	header.style.fontSize = `1.2em`;
	header.textContent = headerText;

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

function bt_buildMaps(bastionDetails, roomDefines, trophyDefines) {
	const map = new Map();

	// Rooms
	const rooms = new Map();
	for (const room of roomDefines) {
		const id = Number(room?.id ?? -1);
		const name = room?.name;
		const desc = room?.description;
		if (id <= 0 || !name || !desc) continue;
		rooms.set(id, {id, name, desc, level: 0});
	}
	const roomDetails = bastionDetails?.bastion_details?.rooms;
	if (Array.isArray(roomDetails) && roomDetails.length > 0) {
		for (const room of roomDetails) {
			const id = Number(room?.room_id ?? -1);
			const level = Number(room?.level ?? -1);
			if (id <= 0 || level <= 0) continue;
			rooms.get(id).level = level;
		}
	}
	map.set("rooms", rooms);

	// Trophies
	const trophies = new Map();
	for (const trophy of trophyDefines) {
		const id = Number(trophy?.id ?? -1);
		const name = trophy?.name;
		if (id <= 0 || !name) continue;
		const desc = trophy?.description ?? "";
		const rarity = Number(trophy?.rarity ?? 1);
		const maxCount = Number(trophy?.max_count ?? 1);
		const bastionBuff = Number(trophy?.bastion_buff ?? 0);
		const cost = bt_parseCost(trophy?.cost) ?? ["", Infinity, "-"];
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
	map.set("trophies", trophies);

	bt_bastionMap = map;
}

function bt_parseCost(cost) {
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

function bt_roomSort(a, b) {
	// Owned before unowned.
	if (a.level > 0 && b.level === 0) return -1;
	if (a.level === 0 && b.level > 0) return 1;

	// Lastly by name.
	return a.name.localeCompare(b.name);
}

function bt_trophySort(a, b) {
	// Owned before unowned.
	if (a.count > 0 && b.count === 0) return -1;
	if (a.count === 0 && b.count > 0) return 1;

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
