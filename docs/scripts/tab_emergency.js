const vem = 1.100; // prettier-ignore
const em_LSKEY_hideTypes = `scEmergencyHides`;
const em_serverCalls = new Set(["getShop", "getDefinitions"]);
const em_definitionsFilters = new Set([
	"hero_defines",
	"corrupted_gem_shop_item_defines",
	"hero_skin_defines",
	"loot_defines",
	"hero_feat_defines",
	"chest_type_defines",
	"buff_defines",
]);
const em_typesSort = {
	buff: `Buffs`,
	skin: `Skins`,
	loot: `Golden Epics`,
	feat: `Feats`,
	chest: `Chests`,
	unknown: `Unknown`,
};
const em_cannotBuy = `Cannot buy anything until you have selected some items.`;

let em_data = null;
let em_purchaseState = null;

function em_registerData() {
	em_serverCalls.forEach((c) => t_tabsServerCalls.add(c));
	em_definitionsFilters.forEach((f) => t_tabsDefinitionsFilters.add(f));
}

function em_tab() {
	return `
					<span class="f fr w100 p5">
						<span class="f falc fjs ml2" style="width:100%">
							<h1>Buy Thayan Enclave Shop Items</h1>
						</span>
					</span>
					<span class="f fr w100 p5">
						<span class="f fc fals fjs ml2" style="width:100%;position:relative;">
							<p>This page will let you buy any Thayan Enclave shop item that is available that you don't already own.</p>
							<p><em>Note: The <code>Select All</code> buttons will not increase sliders - but <code>Deselect All</code> will reduce them to 0.</em></p>
							<span class="f fc" style="position:absolute;top:-85px;font-size:0.85em;right:0;z-index:1">
								<span class="f fr falc">
									<input type="checkbox" id="em_hide_feat" onclick="em_toggleHideType(this.checked, 'feat')">
									<label for="em_hide_feat">Hide Feats</label>
								</span>
								<span class="f fr falc">
									<input type="checkbox" id="em_hide_chest" onclick="em_toggleHideType(this.checked, 'chest')">
									<label for="em_hide_chest">Hide Chests</label>
								</span>
								<span class="f fr falc">
									<input type="checkbox" id="em_hide_buff" onclick="em_toggleHideType(this.checked, 'buff')">
									<label for="em_hide_buff">Hide Buffs</label>
								</span>
							</span>
						</span>
					</span>
					<span class="f fr w100 p5">
						&nbsp;
					</span>
					<span class="f fr w100 p5" style="height:34px;">
						<span class="f falc fje mr2" style="width:50%;">
							<input type="button" onClick="em_pullEmergencyData()" name="emergencyPullButton" id="emergencyPullButton" value="Pull Thayan Enclave Data" style="min-width:175px">
							<span id="emergencyPullButtonDisabled" style="font-size:0.9em" hidden>&nbsp;</span>
						</span>
					</span>
					<span class="f fr w100 p5">
						&nbsp;
					</span>
					<span class="f falc fje mr2" style="flex-direction:column" id="emergencyWrapper">
						&nbsp;
					</span>
					<span class="f fr w100 p5">
						&nbsp;
					</span>
					<span class="emergenceBuyRow" id="emergencyBuyer"></span>
					<span class="f fr w100 p5">
						&nbsp;
					</span>
				`;
}

function em_initHideTypes() {
	const hiddenTypes = em_getHideTypes();
	for (const type of hiddenTypes) {
		const ele = document.getElementById(`em_hide_${type}`);
		if (ele) ele.checked = true;
	}
}

async function em_pullEmergencyData(userDetails, shopData, definitions) {
	if (!shopData || !definitions) {
		if (isBadUserData()) return;
		disablePullButtons();
	}
	const wrapper = document.getElementById(`emergencyWrapper`);
	setWrapperFormat(wrapper, 0);
	//try {
	if (!userDetails) {
		wrapper.innerHTML = `Waiting for user data...`;
		userDetails = await getUserDetails();
	}
	if (!shopData) {
		wrapper.innerHTML = `Waiting for shop data...`;
		shopData = await getShop();
	}
	if (!definitions) {
		wrapper.innerHTML = `Waiting for definitions...`;
		definitions = await getDefinitions(
			filtersFromSet(em_definitionsFilters),
		);
	}
	await em_displayEmergencyData(wrapper, userDetails, shopData, definitions);
	codeEnablePullButtons();
	//} catch (error) {
	//	setWrapperFormat(wrapper, 0);
	//	handleError(wrapper, error);
	//}
}

async function em_displayEmergencyData(
	wrapper,
	userDetails,
	shopData,
	definitions,
) {
	if (shopData == null || definitions == null) {
		setWrapperFormat(wrapper, 0);
		wrapper.textContent = `Error.`;
		return;
	}
	i_clear(wrapper);
	setWrapperFormat(wrapper, 9);

	em_data = em_createMap(wrapper, userDetails, shopData, definitions);
	if (em_data == null) return;

	const displayObj = {};

	for (const shopItem of em_data.shop) {
		const actual = em_data.enclave.get(shopItem.id);
		if (!actual) continue;
		actual.purchaseId = shopItem.id;
		actual.cost = shopItem.cost;
		actual.remaining = shopItem.remaining;
		const type = actual.type;
		if (type === "unknown") actual.name = shopItem.name;
		else {
			const source = em_data[type].get(actual.id);
			actual.name = source.name;
			if (source.hero_id != null && em_data.champ.has(source.hero_id))
				actual.champ = em_data.champ.get(source.hero_id).name;
			if (source.rarity != null) actual.rarity = source.rarity;
			if (source.slot_id != null) actual.slotId = source.slot_id;
			if (source.gild > 0)
				actual.gild = source.gild === 2 ? `GE` : `Shiny`;
		}

		if (!displayObj[type]) displayObj[type] = [];
		displayObj[type].push(actual);
	}

	const hiddenTypes = em_getHideTypes();

	for (const key of Object.keys(em_typesSort)) {
		const arr = displayObj[key];
		if (!Array.isArray(arr)) continue;
		const id = `em_typeBlock_${key}`;
		const container = i_create(null, {
			id,
			style: {
				display: `flex`,
				flexDirection: `column`,
			},
		});
		if (hiddenTypes.has(key)) container.style.display = `none`;
		const title = i_create(null, {
			className: `emergenceGroupTitle`,
			textContent: em_typesSort[key],
		});
		const list = i_create(
			null,
			{className: `emergenceGroup greenCheckbox`},
			i_create(
				null,
				{className: `emergenceGroupRow`, style: {paddingBottom: `4px`}},
				i_create(null, {textContent: `Buy`}),
				i_create(null, {textContent: `Name`}),
				i_create(null, {textContent: `Cost`}),
			),
		);
		for (const item of arr) {
			const flex1 = i_create(null, {className: `emergenceGroupRow`});
			const id = `em_item_${item.purchaseId}`;
			const isSlider = item.remaining > 1;
			const input = em_decideInput(isSlider, item, id);
			const label = i_create(`label`, {
				for: id,
				textContent: em_makeItemLabelText(item),
			});
			const cost = i_create(null, {
				textContent: nf(item.cost) + (isSlider ? ` ea` : ``),
			});
			i_addChild(list, flex1);
			if (isSlider) {
				i_addChildren(flex1, input.gap, label, cost);
				const flex2 = i_create(null, {
					className: `emergenceGroupRow`,
					style: {paddingBottom: `12px`},
				});
				i_addChildren(flex2, input.label, input.input, input.cost);
				i_addChild(list, flex2);
			} else i_addChildren(flex1, input, label, cost);
		}
		i_addChild(list, i_create(null, {style: {flexGrow: `1`}}));
		i_addChild(list, em_createSelectButtons(id));

		i_addChildren(container, title, list);
		i_addChild(wrapper, container);
	}

	const buyContainer = document.getElementById(`emergencyBuyer`);
	if (!buyContainer) {
		setWrapperFormat(wrapper, 0);
		wrapper.textContent = `Can't find element to place the buy button. Cannot continue.`;
		return;
	}

	i_setChildren(
		buyContainer,
		em_addBuyerRow(
			{textContent: `Total Corrupted Gems Cost:`},
			{id: `em_purchase_cost`, textContent: `0`},
		),
		em_addBuyerRow(
			{textContent: `Corrupted Gems Available:`},
			{
				id: `em_purchase_cGems`,
				textContent: nf(em_data.corruptedGems),
			},
		),
		i_create(null, {
			id: `em_purchase_buttonBox`,
			className: `f falc fjc greenButton p5`,
			textContent: em_cannotBuy,
		}),
	);
	em_updateBuyBox();
}

function em_decideInput(isSlider, item, id) {
	if (isSlider)
		return {
			gap: i_create(null, {textContent: blankSpace}),
			input: i_create(`input`, {
				type: `range`,
				min: 0,
				max: item.remaining,
				value: 0,
				step: 1,
				id,
				dataset: {id: item.purchaseId, cost: item.cost},
				oninput: (e) => em_togglePurchase(e.target),
			}),
			label: i_create(`label`, {
				for: id,
				id: `${id}_value`,
				style: {justifySelf: `end`},
				textContent: 0,
			}),
			cost: i_create(null, {
				id: `${id}_cost`,
				textContent: `0 tot`,
			}),
		};

	return i_create(
		null,
		{style: {alignSelf: `start`}},
		i_create(`input`, {
			type: `checkbox`,
			id,
			dataset: {id: item.purchaseId, cost: item.cost},
			oninput: (e) => em_togglePurchase(e.target),
		}),
	);
}

function em_createSelectButtons(id) {
	const container = i_create(null, {
		className: `formsCampaignSelect`,
		style: {fontSize: `1.1em`},
	});
	i_addChildren(
		container,
		i_create(`input`, {
			type: `button`,
			value: `Select All`,
			onclick: () => em_batchToggleCheckboxes(id, false),
		}),
		i_create(`input`, {
			type: `button`,
			value: `Deselect All`,
			onclick: () => em_batchToggleCheckboxes(id, true),
		}),
	);
	return container;
}

function em_batchToggleCheckboxes(id, disable) {
	const group = document.getElementById(id);
	if (!group) return;

	group.querySelectorAll(`input[type="checkbox"]`).forEach((e) => {
		e.checked = !disable;
		em_togglePurchase(e);
	});
	if (disable)
		group.querySelectorAll(`input[type="range"]`).forEach((e) => {
			e.value = 0;
			em_togglePurchase(e);
		});
}

function em_createMap(wrapper, userDetails, shopData, definitions) {
	const data = {};

	const cGemsEarned = Number(
		userDetails?.details?.stats?.corrupted_gems_earned ?? 0,
	);
	const cGemsSpent = Number(
		userDetails?.details?.stats?.corrupted_gems_spent ?? 0,
	);
	const cGemsHave = cGemsEarned - cGemsSpent;
	if (cGemsHave < 0) {
		setWrapperFormat(wrapper, 0);
		wrapper.textContent = `Invalid user data for number of Corrupt Gems. Cannot continue.`;
		return null;
	}
	data.corruptedGems = cGemsHave;
	data.corruptedGemsEarned = cGemsEarned;
	data.corruptedGemsSpent = cGemsSpent;

	data.shop = em_parseShopData(shopData?.shop_data?.all_items);
	if (data.shop == null) {
		setWrapperFormat(wrapper, 0);
		wrapper.textContent = `Shop data was invalid. Cannot continue.`;
		return null;
	}

	const enclave = em_parseThayanEnclaveItems(
		definitions?.corrupted_gem_shop_item_defines,
	);
	if (enclave == null) {
		setWrapperFormat(wrapper, 0);
		wrapper.textContent = `Definitions data was invalid. Cannot continue.`;
		return null;
	}
	const {enclaveMap, skinIds, lootIds, featIds, chestIds, buffIds} = enclave;

	data.enclave = enclaveMap;
	data.champ = em_parseDefinitions(definitions?.hero_defines, null, `name`);
	data.skin = em_parseDefinitions(
		definitions?.hero_skin_defines,
		skinIds,
		`name`,
		`hero_id`,
	);
	data.loot = em_parseDefinitions(
		definitions?.loot_defines,
		lootIds,
		`name`,
		`hero_id`,
		`slot_id`,
		`rarity`,
	);
	data.feat = em_parseDefinitions(
		definitions?.hero_feat_defines,
		featIds,
		`name`,
		`hero_id`,
		`rarity`,
	);
	data.chest = em_parseDefinitions(
		definitions?.chest_type_defines,
		chestIds,
		`name`,
	);
	data.buff = em_parseDefinitions(definitions?.buff_defines, buffIds, `name`);

	return data;
}

function em_parseShopData(shopData) {
	if (!Array.isArray(shopData)) return null;

	const shop = [];

	for (const item of shopData) {
		const type = item?.type;
		const id = Number(item?.type_id ?? -1);
		const cost = Number(item?.cost?.corrupted_gems ?? -1);
		const remaining = Number(item?.user_remaining_stock ?? -1);
		if (type !== `corrupted_gem` || id < 1 || cost < 0 || remaining < 1)
			continue;

		shop.push({id, cost, remaining});
	}

	return shop;
}

function em_parseThayanEnclaveItems(defs) {
	if (!Array.isArray(defs)) return null;

	const enclaveMap = new Map();
	const skinIds = new Set();
	const lootIds = new Set();
	const featIds = new Set();
	const chestIds = new Set();
	const buffIds = new Set();

	for (const cgsi of defs) {
		const id = Number(cgsi?.id ?? -1);
		if (id < 1) continue;

		for (const lootDetail of cgsi?.loot_details ?? []) {
			const type = lootDetail?.type;
			if (!type) continue;
			if (type === `skin`) {
				const skinId = Number(lootDetail?.skin_id ?? -1);
				if (skinId < 1) continue;
				enclaveMap.set(id, {type, id: skinId});
				skinIds.add(skinId);
			} else if (type === `loot`) {
				const lootId = Number(lootDetail?.loot_id ?? -1);
				if (lootId < 1) continue;
				enclaveMap.set(id, {
					type,
					id: lootId,
					gild: Number(lootDetail?.gild_level ?? 0),
				});
				lootIds.add(lootId);
			} else if (type === `champion_feat`) {
				const featId = Number(lootDetail?.feat_id ?? -1);
				if (featId < 1) continue;
				enclaveMap.set(id, {type: `feat`, id: featId});
				featIds.add(featId);
			} else if (type === `generic_chests`) {
				const chestId = Number(lootDetail?.chest_type_id ?? -1);
				if (chestId < 1) continue;
				enclaveMap.set(id, {type: `chest`, id: chestId});
				chestIds.add(chestId);
			} else if (type === `award_buff`) {
				const buffId = Number(lootDetail?.buff_id ?? -1);
				if (buffId < 1) continue;
				enclaveMap.set(id, {type: `buff`, id: buffId});
				buffIds.add(buffId);
			} else {
				console.error(
					`Unknown Enclave item type '${type}'. Falling back to basic name.`,
				);
				enclaveMap.set(id, {type: `unknown`, name: lootDetail?.name});
			}
		}
	}

	return {
		enclaveMap,
		skinIds,
		lootIds,
		featIds,
		chestIds,
		buffIds,
	};
}

function em_parseDefinitions(defs, activeIds, ...keys) {
	const map = new Map();
	if (!Array.isArray(defs)) return map;

	for (const def of defs) {
		const id = Number(def?.id ?? -1);
		if (id < 1 || (activeIds != null && !activeIds.has(id))) continue;

		const obj = {id};
		for (const key of keys) obj[key] = em_tryNumber(def[key]);
		map.set(id, obj);
	}

	return map;
}

function em_tryNumber(value) {
	const num = Number(value);
	if (!isFinite(num)) return value;
	return num;
}

function em_makeItemLabelText(item) {
	if (item.type === `buff`) return item.name.replace("Marvelous", "").trim();
	if (item.type === `feat`)
		return item.name + (item?.champ ? ` (${item.champ})` : ``);
	if (item.type === `loot`) {
		let extras = [];
		if (item?.champ) extras.push(item.champ);
		if (item?.slotId) extras.push(`Slot ${item.slotId}`);
		return item.name + (extras.length > 0 ? ` (${extras.join(` `)})` : ``);
	}

	return item.name;
}

function em_toggleHideType(checked, type) {
	if (!Object.keys(em_typesSort).includes(type)) return;

	const types = em_getHideTypes();
	const blockId = `em_typeBlock_${type}`;
	const block = document.getElementById(blockId);
	if (checked) {
		types.add(type);
		if (block) {
			block.style.display = `none`;
			for (const ele of document.querySelectorAll(
				`#${blockId} input:checked`,
			)) {
				ele.checked = false;
				em_togglePurchase(ele);
			}
		}
	} else {
		types.delete(type);
		if (block) block.style.display = `flex`;
	}

	em_setHideTypes(types);
	em_updateBuyBox();
}

function em_togglePurchase(ele) {
	if (!em_purchaseState)
		em_purchaseState = {
			costs: new Map(),
			totalCost: 0,
		};

	let totalCost = Number(ele.dataset.cost ?? 0);
	let count = 1;
	if (ele.type === `range`) {
		const value = document.getElementById(`${ele.id}_value`);
		if (value) value.textContent = nf(ele.value);
		count = Number(ele.value ?? 0);
		totalCost *= count;
		const cost = document.getElementById(`${ele.id}_cost`);
		if (cost) cost.textContent = nf(totalCost) + ` tot`;
	} else if (ele.type === `checkbox`) {
		count = Number(ele.checked);
		totalCost *= count;
	}
	let purchaseId = Number(ele.dataset.id ?? -1);
	if (purchaseId < 1) return;

	const initial = em_purchaseState.costs.get(purchaseId)?.cost ?? 0;
	const diff = totalCost - initial;

	em_purchaseState.totalCost += diff;
	if (count > 0 || totalCost > 0)
		em_purchaseState.costs.set(purchaseId, {cost: totalCost, count});
	else em_purchaseState.costs.delete(purchaseId);

	const totCost = document.getElementById(`em_purchase_cost`);
	if (totCost) totCost.textContent = nf(em_purchaseState.totalCost);

	em_updateBuyBox();
}

function em_updateBuyBox() {
	const buyBox = document.getElementById(`em_purchase_buttonBox`);
	if (!buyBox) return;

	const possibleBlocks = document.querySelectorAll(
		"#emergencyWrapper > span",
	);
	const hasVisibleBlock = Array.from(possibleBlocks).find(
		(span) => span.style.display !== "none",
	);

	i_clear(buyBox);
	if (possibleBlocks.length === 0)
		buyBox.textContent = `Congratulations - you've already bought everything.`;
	else if (!hasVisibleBlock)
		buyBox.textContent = `The only items you can buy are ones you've hidden.`;
	else if ((em_purchaseState?.costs?.size ?? 0) === 0)
		buyBox.textContent = em_cannotBuy;
	else if ((em_purchaseState?.totalCost ?? 0) > (em_data?.corruptedGems ?? 0))
		buyBox.textContent = `You cannot afford what you have selected to buy.`;
	else {
		buyBox.textContent = ``;
		i_addChild(
			buyBox,
			i_create(`input`, {
				type: `button`,
				value: `Buy Thayan Enclave Items`,
				onclick: () => em_buyEmergencyItems(),
			}),
		);
	}
}

async function em_buyEmergencyItems() {
	const buyer = document.getElementById(`emergencyBuyer`);
	if (!buyer) return;

	em_disableAllEmergencyButtonsAndCheckboxes(true);
	i_clear(buyer);

	i_addChild(
		buyer,
		i_create(null, {
			className: `f fjs falc`,
			textContent: `Buying Thayan Enclave Items:`,
		}),
	);
	if (em_purchaseState.costs.size === 0) {
		i_addChild(
			buyer,
			em_addBuyerRow(undefined, {textContent: `- None.`}, true),
		);
		em_disableAllEmergencyButtonsAndCheckboxes(false);
		return;
	}

	for (const [
		purchaseId,
		{cost, count},
	] of em_purchaseState.costs.entries()) {
		if (!em_data.enclave?.has(purchaseId)) continue;
		const item = em_data.enclave.get(purchaseId);
		const label = em_makeItemLabelText(item);
		let text = `${count > 1 ? count + `x ` : ``}${label} for ${nf(cost)}`;

		const result = await purchaseEmergenceItem(purchaseId, count);

		let successType = `- Failed to buy:`;
		if (
			result?.success &&
			result?.okay &&
			result?.purchase_result?.success
		) {
			successType = `- Successfully bought:`;
			for (const action of result?.actions ?? []) {
				if (
					action.action === "update_stat" &&
					action.stat === "corrupted_gems_spent"
				) {
					const value = Number(action?.value ?? -1);
					if (value >= 0) {
						em_data.corruptedGemsSpent = Number(action.value);
						em_data.corruptedGems =
							em_data.corruptedGemsEarned - value;
					}
				}
			}
			em_cleanupBought(purchaseId, count);
			text += ` (${nf(em_data.corruptedGems)} remaining)`;
		}
		i_addChild(
			buyer,
			em_addBuyerRow(
				{textContent: successType},
				{textContent: text},
				true,
			),
		);
		if (result?.purchase_result?.error_msg) {
			i_addChild(
				buyer,
				em_addBuyerRow(
					undefined,
					{textContent: addFullStop(result.purchase_result.error_msg)},
					true,
				),
			);
			// We got an error - and that usually means ran out of corrupted gems somehow.
			// So stop here and break out of purchasing.
			break;
		}
	}

	i_addChild(
		buyer,
		em_addBuyerRow(undefined, {textContent: `- Done.`}, true),
	);
	buyer.firstChild.textContent = `Finished Buying Thayan Enclave Items:`;

	em_disableAllEmergencyButtonsAndCheckboxes(false);
}

function em_addBuyerRow(
	obj1 = {textContent: blankSpace},
	obj2 = {textContent: blankSpace},
	alt = false,
) {
	const row = i_create(null, {className: `f fjs falc`, style: {gap: `8px`}});
	const ele1 = i_create(null, {
		className: `f fje falc`,
		style: {width: alt ? `35%` : `60%`},
		textContent: obj1.textContent,
	});
	if (obj1.id) ele1.id = obj1.id;
	const ele2 = i_create(null, {
		className: `f ${alt ? `fjs` : `fje`} falc`,
		style: {width: alt ? `65%` : `25%`, textWrap: `nowrap`},
		textContent: obj2.textContent,
	});
	if (obj2.id) ele2.id = obj2.id;
	i_addChildren(row, ele1, ele2);
	return row;
}

function em_cleanupBought(purchaseId, count) {
	const ele = document.getElementById(`em_item_${purchaseId}`);
	if (!ele) return;

	// Remember the grandparent.
	let grandparent = ele.parentNode.parentNode;
	// Checkboxes have an extra span around them so add another parentNode.
	if (ele.type === `checkbox`) grandparent = grandparent.parentNode;

	// 1. Remove the elements.
	//      If it's a slider (with a max of 0) - remove not just its parent - but the element preceeding
	//      its parent because sliders take up two rows.
	if (ele.type === `range`) {
		const newMax = Number(ele.max ?? 0) - count;
		if (newMax <= 0) {
			i_removeSelf(ele.parentNode.previousElementSibling);
			i_removeSelf(ele.parentNode);
		} else {
			ele.max = Math.max(0, newMax);
			ele.value = 0;
			const cost = document.getElementById(`em_item_${purchaseId}_cost`);
			if (cost) cost.textContent = `0 tot`;
		}
	} else if (ele.type === `checkbox`) {
		i_removeSelf(ele.parentNode.parentNode);
	}

	// 3. If the grandparent now only has 3 children or fewer - it's empty. Remove it.
	if (grandparent.children.length <= 3) i_removeSelf(grandparent.parentNode);
}

function em_disableAllEmergencyButtonsAndCheckboxes(disable) {
	if (disable) {
		disablePullButtons();
		document.querySelectorAll(`#emergencyWrapper input`).forEach((e) => {
			e.disabled = disable;
			e.style.opacity = disable ? `0.4` : ``;
			e.style.pointerEvents = disable ? `none` : ``;
			e.style.backgroundColor =
				disable ? `hsl(calc(240*0.95),15%,calc(16%*0.8))` : ``;
		});
	} else codeEnablePullButtons();
}

function em_getHideTypes() {
	return ls_getGlobal_set(em_LSKEY_hideTypes);
}

function em_setHideTypes(types) {
	ls_setGlobal_set(em_LSKEY_hideTypes, types);
}
