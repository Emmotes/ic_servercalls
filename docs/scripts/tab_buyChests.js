const vbc = 1.020; // prettier-ignore
const bc_chestPackCost = 7500;
const bc_silverChestCost = 50;
const bc_goldChestCost = 500;
const bc_silverChestOpt = `<option value="1">Silver Chest</option>`;
const bc_goldChestOpt = `<option value="2">Gold Chest</option>`;
const bc_notEnoughGems = `<option value="-1">Not enough gems.</option>`;
const bc_notEnoughEventTokens = `<option value="-1">Not enough event tokens.</option>`;
const bc_sliderFidelity = `scBuyChestsSliderFidelity`;

async function bc_pullBuyChestsData() {
	if (isBadUserData()) return;
	disablePullButtons();
	const wrapper = document.getElementById(`buyChestsWrapper`);
	wrapper.innerHTML = `Waiting for response...`;
	const buyChestsBuyer = document.getElementById(`buyChestsBuyer`);
	if (buyChestsBuyer.innerHTML.includes("buyChestsButton"))
		buyChestsBuyer.innerHTML = `&nbsp;`;
	try {
		wrapper.innerHTML = `Waiting for user data...`;
		const details = (await getUserDetails()).details;
		const gems = details.red_rubies;
		const tokens = details.events_details.tokens;
		if (gems < 50 && tokens < bc_chestPackCost) {
			wrapper.innerHTML = `&nbsp;`;
			buyChestsBuyer.innerHTML = `<span class="f w100 p5" style="padding-left:10%">You do not have enough gems or tokens to buy any chests.</span>`;
			return;
		}
		const eventActive =
			details.events_details.active_events.length > 0 ? true : false;
		wrapper.innerHTML = `Waiting for definitions...`;
		const chests = (await getDefinitions("chest_type_defines"))
			.chest_type_defines;
		wrapper.innerHTML = `Waiting for shop data...`;
		const shop = (await getShop()).shop_data.items.chest;
		wrapper.innerHTML = `Waiting for dismantle data...`;
		const dismantleData = await getDismantleData();
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
	let eventChestIds = [];
	const eventChests = {};
	let gotBadChest = false;
	if (eventActive) {
		for (let chest of shop)
			if (chest.tags.includes("event") || chest.tags.includes("event_v2"))
				eventChests[chest.type_id] = {};
		eventChestIds = Object.keys(eventChests);
		numSort(eventChestIds);
		outerLoop: for (let chestId of eventChestIds) {
			for (let chest of chests) {
				if (chest.id === Number(chestId)) {
					const name = chest.name.replace("Gold ", "") + " Pack";
					const heroIds = chest.hero_ids;
					if (name == null || heroIds == null) {
						gotBadChest = true;
						break outerLoop;
					}
					const dismantle = chest.hero_ids.some((r) =>
						fullDismantleChampions.includes(r),
					);
					eventChests[chestId] = {name: name, dismantle: dismantle};
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
		buyChestsBuyer.innerHTML = buying + txt;
		return;
	}
	let numFails = 0;
	buyChestsBuyer.innerHTML = buying + txt;
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
			buyChestsBuyer.innerHTML = buying + txt;
			return;
		}
		if (result["success"] && result["okay"]) {
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
			bc_updateBuyChestsSliderValue(buyChestsBuyAmount.value);
		} else numFails++;
		buying = bc_makeBuyingRow(amount, chestName, initAmount);
		txt += bc_addChestResultRow(
			`- ${successType}:`,
			`${toBuy} ${genChest}${cost}`,
		);
		buyChestsBuyer.innerHTML = buying + txt;
	}
	buying = bc_makeBuyingRow(amount, chestName, initAmount);
	txt += bc_addChestResultRow(`Finished.`);
	buyChestsBuyer.innerHTML = buying + txt;
	if (numFails >= RETRIES) {
		txt += bc_addChestResultRow(`- Stopping:`, `Got too many failures.`);
		buying = bc_makeBuyingRow(0, chestName, initAmount);
		buyChestsBuyer.innerHTML = buying + txt;
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
	let hiddenField = ``;
	let hiddenId = ``;
	if (hiddenInput != null && hiddenValue != null) {
		hiddenField = `<input type="hidden" id="${hiddenInput}" name="${hiddenInput}" value="${hiddenValue}">`;
		hiddenId = ` id="${hiddenInput}Display" name="${hiddenInput}Display"`;
	}
	return `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:25%;min-width:200px;">${left}</span><span class="f falc fjs ml2" style="padding-left:10px;width:28%;min-width:200px;"${hiddenId}>${right}</span>${hiddenField}</span>`;
}

function bc_addChestResultRow(left, right) {
	let rightAdd = ``;
	if (right != null)
		rightAdd = `<span class="f falc fjs ml2" style="flex-grow:1;margin-left:5px;flex-wrap:wrap">${right}</span>`;
	return `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:175px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">${left}</span>${rightAdd}</span>`;
}

function bc_makeBuyingRow(amount, name, initAmount) {
	return `<span class="f fr w100 p5">${
		amount === 0 ? `Finished ` : ``
	}Buying ${nf(amount === 0 ? initAmount : amount)} ${name}s:</span>`;
}

function bc_initBuyChestsSliderFidelity() {
	let fidelity = bc_getBuyChestsSliderFidelity();
	if (![1, 10, 25, 50, 100, 250, 1000].includes(fidelity)) {
		bc_toggleBuyChestsSliderFidelity(1);
		fidelity = 1;
	}
	document.getElementById(`buyChestsSliderFidelity`).value = fidelity;
}

function bc_toggleBuyChestsSliderFidelity(fidelity) {
	if (fidelity === 1 && localStorage.getItem(bc_sliderFidelity))
		localStorage.removeItem(`bc_sliderFidelity`);
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
	const fidelity = localStorage.getItem(bc_sliderFidelity);
	if (!fidelity) return 1;
	return Number(fidelity);
}

function bc_saveBuyChestsSliderFidelity(fidelity) {
	localStorage.setItem(bc_sliderFidelity, fidelity);
}
