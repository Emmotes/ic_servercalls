const vbc = 1.101; // prettier-ignore
const bc_LSKEY_sliderFidelity = `scBuyChestsSliderFidelity`;
const bc_chestPackCost = 7500;
const bc_silverChestCost = 50;
const bc_goldChestCost = 500;
const bc_silverChestOpt = `<option value="1">Silver Chest</option>`;
const bc_goldChestOpt = `<option value="2">Gold Chest</option>`;
const bc_notEnoughGems = `<option value="-1">Not enough gems.</option>`;
const bc_notEnoughEventTokens = `<option value="-1">Not enough event tokens.</option>`;
const bc_serverCalls = new Set([
	"getUserDetails",
	"getShop",
	"getDismantleData",
	"getDefinitions",
]);
const bc_definitionsFilters = new Set(["chest_type_defines"]);
let bc_chestNames = null;

function bc_registerData() {
	bc_serverCalls.forEach((c) => t_tabsServerCalls.add(c));
	bc_definitionsFilters.forEach((f) => t_tabsDefinitionsFilters.add(f));
}

function bc_tab() {
	return `
					<span class="f fr w100 p5">
						<span class="f falc fjs ml2" style="width:100%">
							<h1>Buy Chests</h1>
						</span>
					</span>
					<span class="f fr w100 p5">
						<span class="f falc fjs ml2" style="width:100%;position:relative">
							This page will let you buy Silver or Gold chests for gems as well as chest packs for event tokens for champions you have flexed.
							<span class="f fc" style="position:absolute;top:-80px;right:0;align-items:center;text-align:center;z-index:1">
								<span class="f fr falc">
									<label class="p5" for="buyChestsSliderFidelity">Amount to Buy Slider Fidelity:</label>
									<select name="buyChestsSliderFidelity" id="buyChestsSliderFidelity" oninput="bc_toggleBuyChestsSliderFidelity(this.value);" style="width:70px">
										<option value="1" selected>1</option>
										<option value="10">10</option>
										<option value="25">25</option>
										<option value="50">50</option>
										<option value="100">100</option>
										<option value="250">250</option>
										<option value="1000">1000</option>
									</select>
								</span>
								<span class="f fr falc" style="font-size:0.8em">
									Note: If the fidelity is larger than the maximum<br>amount you can buy - it will use a fidelity of 1.
								</span>
							</span>
						</span>
					</span>
					<span class="f fr w100 p5">
						&nbsp;
					</span>
					<span class="f fr w100 p5" style="height:34px;">
						<span class="f falc fje mr2" style="width:50%;">
							<input type="button" onClick="bc_pullBuyChestsData()" name="buyChestsPullButton" id="buyChestsPullButton" value="Pull Chest Data" style="min-width:175px">
							<span id="buyChestsPullButtonDisabled" style="font-size:0.9em" hidden>&nbsp;</span>
						</span>
					</span>
					<span class="f fr w100 p5">
						&nbsp;
					</span>
					<span class="f falc fje mr2" style="flex-direction:column" id="buyChestsWrapper">
						&nbsp;
					</span>
					<span class="f fr w100 p5">
						&nbsp;
					</span>
					<span class="f fc falc w100 fje mr2" id="buyChestsBuyer">
						&nbsp;
					</span>
					<span class="f fr w100 p5">
						&nbsp;
					</span>
				`;
}

async function bc_pullBuyChestsData(
	userDetails,
	shopData,
	dismantleData,
	definitions,
) {
	if (!userDetails || !shopData || !dismantleData || !definitions) {
		if (isBadUserData()) return;
		disablePullButtons();
	}
	const wrapper = document.getElementById(`buyChestsWrapper`);
	const buyChestsBuyer = document.getElementById(`buyChestsBuyer`);
	if (buyChestsBuyer.innerHTML.includes("buyChestsButton"))
		buyChestsBuyer.innerHTML = `&nbsp;`;
	try {
		if (!userDetails) {
			wrapper.innerHTML = `Waiting for user data...`;
			userDetails = await getUserDetails();
		}
		const details = userDetails.details;
		const gems = details.red_rubies;
		const tokens = details.events_details.tokens;
		if (gems < 50 && tokens < bc_chestPackCost) {
			wrapper.innerHTML = `&nbsp;`;
			buyChestsBuyer.innerHTML = `<span class="f w100 p5" style="padding-left:10%">You do not have enough gems or tokens to buy any chests.</span>`;
			return;
		}
		const eventActive =
			details.events_details.active_events.length > 0 ? true : false;
		if (!definitions) {
			wrapper.innerHTML = `Waiting for definitions...`;
			definitions = await getDefinitions(
				filtersFromSet(bc_definitionsFilters),
			);
		}
		const chests = definitions.chest_type_defines;
		if (!shopData) {
			wrapper.innerHTML = `Waiting for shop data...`;
			shopData = await getShop();
		}
		const shop = shopData.shop_data.items.chest;
		if (!dismantleData) {
			wrapper.innerHTML = `Waiting for dismantle data...`;
			dismantleData = await getDismantleData();
		}
		await bc_displayBuyChestsData(
			wrapper,
			gems,
			tokens,
			eventActive,
			chests,
			shop,
			dismantleData,
		);
		codeEnablePullButtons();
	} catch (error) {
		handleError(wrapper, error);
	}
}

async function bc_displayBuyChestsData(
	wrapper,
	gems,
	tokens,
	eventActive,
	chests,
	shop,
	dismantleData,
) {
	const buyChestsBuyer = document.getElementById(`buyChestsBuyer`);
	const fullDismantleChampions =
		bc_getFullDismantleChampionIds(dismantleData);
	bc_chestNames = bc_buildChestNames(chests);
	let eventChestIds = [];
	const eventChests = {};
	let gotBadChest = false;
	if (eventActive) {
		for (const chest of shop)
			if (chest.tags.includes("event") || chest.tags.includes("event_v2"))
				eventChests[chest.type_id] = {};
		eventChestIds = Object.keys(eventChests);
		numSort(eventChestIds);
		outerLoop: for (const eventChestId of eventChestIds) {
			const eChestId = Number(eventChestId ?? -1);
			if (eChestId <= 0) continue;
			for (const chest of chests) {
				const chestId = Number(chest.id ?? -1);
				if (chestId <= 0) continue;
				if (chestId === eChestId) {
					const name =
						bc_chestNames.has(chestId) ?
							bc_chestNames.get(chestId).name
						:	null;
					const heroIds = chest?.hero_ids;
					if (name == null || heroIds == null) {
						gotBadChest = true;
						break outerLoop;
					}
					const dismantle = chest.hero_ids.some((r) =>
						fullDismantleChampions.includes(r),
					);
					eventChests[eventChestId] = {name, dismantle};
					break;
				}
			}
		}
	}
	if (gotBadChest) {
		wrapper.innerHTML = `&nbsp;`;
		buyChestsBuyer.innerHTML = `<span class="f w100 p5" style="padding-left:10%">Error found when parsing chest ids. Cannot continue.</span>`;
		return;
	}
	const silverChests = Math.floor(gems / bc_silverChestCost);
	const goldChests = Math.floor(gems / bc_goldChestCost);
	const chestPacks = Math.floor(tokens / bc_chestPackCost);

	let txt = ``;
	txt += bc_addChestsRow(`Available Gems:`, nf(gems), `buyChestsGems`, gems);
	txt += bc_addChestsRow(
		`Maximum Silver Chests:`,
		nf(silverChests),
		`buyChestsSilver`,
		silverChests,
	);
	txt += bc_addChestsRow(
		`Maximum Gold Chests:`,
		nf(goldChests),
		`buyChestsGold`,
		goldChests,
	);
	txt += bc_addChestsRow(`&nbsp;`, `&nbsp;`);
	txt += bc_addChestsRow(
		`Available Event Tokens:`,
		nf(tokens),
		`buyChestsTokens`,
		tokens,
	);
	txt += bc_addChestsRow(
		`Maximum Chest Packs:`,
		nf(chestPacks),
		`buyChestsEvent`,
		chestPacks,
	);
	txt += bc_addChestsRow(`&nbsp;`, `&nbsp;`);
	let s = `<select name="buyChestsBuyList" id="buyChestsBuyList" oninput="bc_modifyBuyChestsBuyAmountSlider(this.value);" style="width:100%"><option value="-1" selected>-</option><optgroup label="Gem Chests" id="gemChestsOpt">`;
	if (gems >= bc_silverChestCost) {
		s += `${bc_silverChestOpt}`;
		if (gems >= bc_goldChestCost) s += `${bc_goldChestOpt}`;
		else s += bc_notEnoughGems;
	} else s += bc_notEnoughGems;
	s += `</optgroup><optgroup label="Event Chest Packs" id="tokenChestsOpt">`;
	if (eventChestIds.length > 0) {
		if (tokens >= bc_chestPackCost) {
			for (let eventChestId of eventChestIds) {
				const eventChest = eventChests[eventChestId];
				s += `<option value="${eventChestId}" data-dismantle="${
					eventChest.dismantle ? 1 : 0
				}">${eventChest.name}</option>`;
			}
		} else s += bc_notEnoughEventTokens;
	} else s += `<option value="-1">No event chest packs available.</option>`;
	s += `</optgroup></select>`;
	txt += bc_addChestsRow(`What to Buy:`, s);
	const r = `<input type="range" min="0" max="0" step="0" value="0" name="buyChestsBuyAmount" id="buyChestsBuyAmount" oninput="bc_updateBuyChestsSliderValue(this.value);bc_displayBuyChestsBuyButton(this.value);" style="width:100%"></span><span class="f falc fjs ml2"><label style="padding-left:10px;text-wrap-style: pretty" for="buyChestsBuyAmount" id="buyChestsSliderValue">0</label>`;
	txt += bc_addChestsRow(`Amount to Buy:`, r);
	wrapper.innerHTML = txt;
	bc_modifyBuyChestsBuyAmountSlider();
}

function bc_buildChestNames(chests) {
	const chestNames = new Map();
	for (const chest of chests) {
		const id = Number(chest?.id ?? 0);
		const name = chest?.name ?? null;
		const namePlural = chest?.name_plural ?? null;
		if (id <= 0 || name == null || namePlural == null) continue;
		chestNames.set(id, {name, namePlural});
	}
	return chestNames;
}

function bc_modifyBuyChestsBuyAmountSlider(val) {
	const buyChestsSilver = document.getElementById(`buyChestsSilver`);
	const buyChestsGold = document.getElementById(`buyChestsGold`);
	const buyChestsEvent = document.getElementById(`buyChestsEvent`);
	const buyChestsBuyAmount = document.getElementById(`buyChestsBuyAmount`);
	val = Number(val);
	let maximumToUse =
		val == null ? 0
		: val === 1 ? Number(buyChestsSilver.value)
		: val === 2 ? Number(buyChestsGold.value)
		: Number(buyChestsEvent.value);

	buyChestsBuyAmount.max = maximumToUse;
	buyChestsBuyAmount.min = 0;
	buyChestsBuyAmount.value = 0;
	const fidelity = bc_getBuyChestsSliderFidelity();
	buyChestsBuyAmount.step = fidelity > maximumToUse ? 1 : fidelity;
	bc_updateBuyChestsSliderValue(0);
	bc_displayBuyChestsBuyButton(0);
}

function bc_displayBuyChestsBuyButton(amount) {
	const buyChestsBuyList = document.getElementById(`buyChestsBuyList`);
	const buyChestsBuyer = document.getElementById(`buyChestsBuyer`);
	let be = ``;
	const chestId = Number(buyChestsBuyList.value);
	const isDismantle =
		buyChestsBuyList.options[buyChestsBuyList.selectedIndex].dataset[
			"dismantle"
		] === "1";

	if (isDismantle)
		be += `<span class="f w100 p5" style="padding:0 0 20px 5%;color:var(--TangerineYellow)">Warning: This champion currently has a Full Dismantle running. Buying will disable that.</span>`;
	if (chestId <= 0 || amount == null || amount <= 0)
		be += `<span class="f w100 p5" style="padding-left:10%">Cannot buy until a valid chest type and amount has been selected.</span>`;
	else
		be += `<span class="f fr w100 p5"><span class="f falc fje mr2 greenButton" style="width:50%" id="buyChestsRow"><input type="button" onClick="bc_buyChests()" name="buyChestsButton" id="buyChestsButton" style="font-size:0.9em;min-width:180px" value="Buy Chest${
			chestId > 2 ? ` Pack` : ``
		}s"></span></span>`;
	buyChestsBuyer.innerHTML = be;
}

function bc_updateBuyChestsSliderValue(val) {
	const chestId = Number(document.getElementById("buyChestsBuyList").value);
	let txt = nf(val);
	if (chestId > 2)
		txt += ` Gold + ${nf(val * 2)} Silver (${nf(val * 3)} Total)`;
	document.getElementById("buyChestsSliderValue").innerHTML = txt;
}

async function bc_buyChests() {
	const buyChestsBuyer = document.getElementById(`buyChestsBuyer`);
	const buyChestsBuyList = document.getElementById(`buyChestsBuyList`);
	const buyChestsBuyAmount = document.getElementById(`buyChestsBuyAmount`);
	buyChestsBuyList.disabled = true;
	buyChestsBuyAmount.disabled = true;
	disablePullButtons();
	let have = ``;
	let buying = ``;
	let txt = ``;
	if (buyChestsBuyList == null || buyChestsBuyAmount == null) {
		txt += `<span class="f w100 p5" style="padding-left:10%">Unknown error. Didn't buy any chest packs.</span>`;
		buyChestsBuyer.innerHTML = txt;
		return;
	}
	const chestId = buyChestsBuyList.value;
	const chestName =
		buyChestsBuyList.options[buyChestsBuyList.selectedIndex].text;
	const genChest =
		chestId > 2 ? `Chest Pack`
		: chestId === 1 ? `Silver Chest`
		: `Gold Chest`;
	let amount = buyChestsBuyAmount.value;
	const initAmount = amount;

	buyChestsBuyer.innerHTML = txt;
	buying = bc_makeBuyingRow(amount, chestName, initAmount);
	if (amount === 0) {
		txt += bc_addChestResultRow(`- None`);
		buyChestsBuyer.innerHTML = have + buying + txt;
		return;
	}
	let numFails = 0;
	buyChestsBuyer.innerHTML = have + buying + txt;
	while (amount > 0 && numFails < RETRIES) {
		const toBuy = Math.min(250, amount);
		const result = await buySoftCurrencyChest(chestId, toBuy);
		let successType = `Failed to buy`;
		let cost = ``;
		if (JSON.stringify(result).includes(`Failure: Not enough`)) {
			const failureType = chestId > 2 ? `tokens` : `gems`;
			txt += bc_addChestResultRow(
				`- ${successType}:`,
				`Not enough ${failureType}.`,
			);
			buying = bc_makeBuyingRow(0, chestName, initAmount);
			buyChestsBuyer.innerHTML = have + buying + txt;
			return;
		}
		if (result.success && result.okay) {
			successType = `Successfully bought`;
			const currencyType = chestId > 2 ? `Tokens` : `Gems`;
			const currencyRemaining = Math.floor(result.currency_remaining);
			cost = ` for ${nf(result.currency_spent)} ${currencyType} (${nf(
				currencyRemaining,
			)} ${currencyType} Remaining)`;
			amount -= toBuy;
			if (chestId > 2) {
				bc_applyValueToElementAndDisplay(
					`buyChestsTokens`,
					currencyRemaining,
				);
				bc_applyValueToElementAndDisplay(
					`buyChestsEvent`,
					Math.floor(currencyRemaining / bc_chestPackCost),
				);
			} else {
				bc_applyValueToElementAndDisplay(
					`buyChestsGems`,
					currencyRemaining,
				);
				bc_applyValueToElementAndDisplay(
					`buyChestsSilver`,
					Math.floor(currencyRemaining / bc_silverChestCost),
				);
				bc_applyValueToElementAndDisplay(
					`buyChestsGold`,
					Math.floor(currencyRemaining / bc_goldChestCost),
				);
			}
			buyChestsBuyAmount.value -= toBuy;
			have = bc_parseActions(result.actions);
			bc_updateBuyChestsSliderValue(buyChestsBuyAmount.value);
		} else numFails++;
		buying = bc_makeBuyingRow(amount, chestName, initAmount);
		txt += bc_addChestResultRow(
			`- ${successType}:`,
			`${toBuy} ${genChest}${cost}`,
		);
		buyChestsBuyer.innerHTML = have + buying + txt;
	}
	buying = bc_makeBuyingRow(amount, chestName, initAmount);
	txt += bc_addChestResultRow(`Finished.`);
	buyChestsBuyer.innerHTML = have + buying + txt;
	if (numFails >= RETRIES) {
		txt += bc_addChestResultRow(`- Stopping:`, `Got too many failures.`);
		buying = bc_makeBuyingRow(0, chestName, initAmount);
		buyChestsBuyer.innerHTML = have + buying + txt;
		return;
	}
	let gemsValue = document.getElementById(`buyChestsGems`).value;
	if (gemsValue < bc_silverChestCost) {
		document.getElementById(`gemChestsOpt`).innerHTML = bc_notEnoughGems;
	} else if (gemsValue < bc_goldChestCost) {
		document.getElementById(`gemChestsOpt`).innerHTML = bc_silverChestOpt;
	}
	if (document.getElementById(`buyChestsTokens`).value < bc_chestPackCost)
		document.getElementById(`tokenChestsOpt`).innerHTML =
			bc_notEnoughEventTokens;
	buyChestsBuyAmount.max = 0;
	buyChestsBuyAmount.min = 0;
	buyChestsBuyAmount.value = 0;
	bc_updateBuyChestsSliderValue(0);
	buyChestsBuyList.value = "-1";
	buyChestsBuyList.disabled = false;
	buyChestsBuyAmount.disabled = false;
	codeEnablePullButtons();
}

function bc_parseActions(actions) {
	const chests = [];
	for (const action of actions) {
		if (action?.action !== "update_chest_count") continue;
		const id = Number(action?.chest_type_id ?? -1);
		if (id <= 0) continue;
		const count = Number(action?.count ?? -1);
		if (count <= 0) continue;
		const name =
			bc_chestNames != null && bc_chestNames.has(id) ?
				bc_chestNames.get(id)[count === 1 ? "name" : "namePlural"]
			:	`??? (id:${id})`;
		chests.push({id, count, name});
	}
	console.log("Chests: ", chests);
	if (chests.length === 0) return ``;

	chests.sort((a, b) => a.id - b.id);

	let have = addHTMLElement({
		text: `You now have:`,
		classes: `f fr w100 p5`,
	});
	for (const chest of chests)
		have += bc_addChestResultRow(`${chest.name}:`, `${nf(chest.count)}`);
	have += addHTMLElement({
		text: `&nbsp;`,
		classes: `f fr w100 p5`,
	});
	return have;
}

function bc_getFullDismantleChampionIds(dismantleData) {
	const fullDismantleIds = [];
	if (
		dismantleData == null ||
		dismantleData.redistribute_hero == null ||
		Object.keys(dismantleData.redistribute_hero).length === 0
	)
		return fullDismantleIds;
	dismantleData = dismantleData.redistribute_hero;
	for (let champId in dismantleData) {
		const champ = dismantleData[champId];
		if (
			champ.redistribute_id == null ||
			champ.time_remaining == null ||
			champ.reward_breakdown == null ||
			champ.legendaries_only
		)
			continue;
		fullDismantleIds.push(Number(champId));
	}
	return fullDismantleIds;
}

function bc_applyValueToElementAndDisplay(eleName, value) {
	document.getElementById(`${eleName}Display`).innerHTML = nf(value);
	document.getElementById(eleName).value = value;
}

function bc_addChestsRow(left, right, hiddenInput, hiddenValue) {
	let hiddenField = null;
	let hiddenId = null;
	if (hiddenInput != null && hiddenValue != null) {
		hiddenField = `<input type="hidden" id="${hiddenInput}" name="${hiddenInput}" value="${hiddenValue}">`;
		hiddenId = `${hiddenInput}Display`;
	}
	const eles = [
		{
			text: left,
			classes: `f falc fje mr2`,
			styles: `width:25%;min-width:200px;`,
		},
		{
			text: right,
			classes: `f falc fjs ml2`,
			styles: `padding-left:10px;width:28%;min-width:200px;`,
			id: hiddenId,
			name: hiddenId,
		},
	];
	let txt = addHTMLElements(eles);
	if (hiddenField) txt += hiddenField;
	return addHTMLElement({
		text: txt,
		classes: `f fr w100 p5`,
	});
}

function bc_addChestResultRow(left, right) {
	const eles = [
		{
			text: left,
			classes: `f falc fje mr2`,
			styles: `width:175px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0;`,
		},
	];
	if (right != null)
		eles.push({
			text: right,
			classes: `f falc fjs ml2`,
			styles: `flex-grow:1;margin-left:5px;flex-wrap:wrap;`,
		});
	return addHTMLElement({
		text: addHTMLElements(eles),
		classes: `f fr w100 p5`,
	});
}

function bc_makeBuyingRow(amount, name, initAmount) {
	const prefix = (amount === 0 ? `Finished ` : ``) + `Buying`;
	const displayAmount = amount > 0 ? nf(amount) : nf(initAmount);
	return addHTMLElement({
		text: `${prefix} ${displayAmount} ${name}s:`,
		classes: `f fr w100 p5`,
	});
}

function bc_initBuyChestsSliderFidelity() {
	const ele = document.getElementById(`buyChestsSliderFidelity`);
	if (!ele) return;
	let fidelity = bc_getBuyChestsSliderFidelity();
	if (![1, 10, 25, 50, 100, 250, 1000].includes(fidelity)) {
		bc_toggleBuyChestsSliderFidelity(1);
		fidelity = 1;
	}
	ele.value = fidelity;
}

function bc_toggleBuyChestsSliderFidelity(fidelity) {
	if (fidelity === 1 && ls_has(bc_LSKEY_sliderFidelity))
		ls_remove(bc_LSKEY_sliderFidelity);
	else if (fidelity !== 1) bc_saveBuyChestsSliderFidelity(fidelity);

	const buyChestsBuyAmount = document.getElementById(`buyChestsBuyAmount`);
	if (buyChestsBuyAmount != null) {
		buyChestsBuyAmount.step = fidelity;
		buyChestsBuyAmount.value = 0;
		bc_modifyBuyChestsBuyAmountSlider(
			document.getElementById(`buyChestsBuyList`).value,
		);
	}
}

function bc_getBuyChestsSliderFidelity() {
	return ls_getGlobal(bc_LSKEY_sliderFidelity, 1);
}

function bc_saveBuyChestsSliderFidelity(fidelity) {
	ls_setGlobal_num(bc_LSKEY_sliderFidelity, fidelity, 1);
}
