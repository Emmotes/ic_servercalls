const vbc=1.012;
let chestPackCost=7500;
let silverChestCost=50;
let goldChestCost=500;
let silverChestOpt=`<option value="1">Silver Chest</option>`;
let notEnoughGems=`<option value="-1">Not enough gems.</option>`;
let notEnoughEventTokens=`<option value="-1">Not enough event tokens.</option>`;

async function pullBuyChestsData() {
	if (userIdent[0]==``||userIdent[1]==``) {
		init();
		return;
	}
	temporarilyDisableAllPullButtons();
	let wrapper = document.getElementById(`buyChestsWrapper`);
	wrapper.innerHTML = `Waiting for response...`;
	let buyChestsBuyer = document.getElementById(`buyChestsBuyer`);
	if (buyChestsBuyer.innerHTML.includes('buyChestsButton'))
		buyChestsBuyer.innerHTML = `&nbsp;`;
	try {
		wrapper.innerHTML = `Waiting for user data...`;
		let details = (await getUserDetails()).details;
		let gems = details.red_rubies;
		let tokens = details.events_details.tokens;
		if (gems < 50 && tokens < chestPackCost) {
			wrapper.innerHTML = `&nbsp;`;
			buyChestsBuyer.innerHTML = `<span class="f w100 p5" style="padding-left:10%">You do not have enough gems or tokens to buy any chests.</span>`
			return;
		}
		let eventActive = details.events_details.active_events.length > 0 ? true : false;
		wrapper.innerHTML = `Waiting for definitions...`;
		let chests = (await getDefinitions("chest_type_defines")).chest_type_defines;
		wrapper.innerHTML = `Waiting for shop data...`;
		let shop = (await getShop()).shop_data.items.chest;
		await displayBuyChestsData(wrapper,gems,tokens,eventActive,chests,shop);
	} catch (error) {
		handleError(wrapper,error);
	}
}

async function displayBuyChestsData(wrapper,gems,tokens,eventActive,chests,shop) {
	let buyChestsBuyer = document.getElementById(`buyChestsBuyer`);
	let eventChestIds = [];
	let eventChestNames = [];
	if (eventActive) {
		for (let chest of shop)
			if (chest.tags.includes('event')||chest.tags.includes('event_v2'))
				eventChestIds.push(chest.type_id);
		numSort(eventChestIds);
		for (let chestId of eventChestIds) {
			for (let chest of chests) {
				if (chest.id == chestId) {
					eventChestNames.push(chest.name.replace("Gold ", "") + " Pack");
					break;
				}
			}
		}
	}
	if (eventChestIds.length!=eventChestNames.length||eventChestNames.includes(undefined)) {
		wrapper.innerHTML = `&nbsp;`;
		buyChestsBuyer.innerHTML = `<span class="f w100 p5" style="padding-left:10%">Error found when parsing chest ids. Cannot continue.</span>`
		return;
	}
	let silverChests = Math.floor(gems/silverChestCost);
	let goldChests = Math.floor(gems/goldChestCost);
	let chestPacks = Math.floor(tokens/chestPackCost);
	
	let txt = ``;
	txt+=addChestsRow(`Available Gems:`,nf(gems),`buyChestsGems`,gems);
	txt+=addChestsRow(`Maximum Silver Chests:`,nf(silverChests),`buyChestsSilver`,silverChests);
	txt+=addChestsRow(`Maximum Gold Chests:`,nf(goldChests),`buyChestsGold`,goldChests);
	txt+=addChestsRow(`&nbsp;`,`&nbsp;`);
	txt+=addChestsRow(`Available Event Tokens:`,nf(tokens),`buyChestsTokens`,tokens);
	txt+=addChestsRow(`Maximum Chest Packs:`,nf(chestPacks),`buyChestsEvent`,chestPacks);
	txt+=addChestsRow(`&nbsp;`,`&nbsp;`);
	let s=`<select name="buyChestsBuyList" id="buyChestsBuyList" oninput="modifyBuyChestsBuyAmountSlider(this.value);"><option value="-1" selected>-</option><optgroup label="Gem Chests" id="gemChestsOpt">`;
	if (gems >= silverChestCost)
		s+=`${silverChestOpt}<option value="2">Gold Chest</option>`;
	else
		s+=notEnoughGems;
	s+=`</optgroup><optgroup label="Event Chest Packs" id="tokenChestsOpt">`;
	if (eventChestIds.length > 0) {
		if (tokens >= chestPackCost) {
			for (let i=0; i<eventChestIds.length; i++)
				s+=`<option value="${eventChestIds[i]}">${eventChestNames[i]}</option>`;
		} else
			s+=notEnoughEventTokens;
	} else
		s+=`<option value="-1">No event chest packs available.</option>`;
	s+=`</optgroup></select>`;
	txt+=addChestsRow(`What to Buy:`,s);
	let r=`<input type="range" min="0" max="0" step="0" value="0" name="buyChestsBuyAmount" id="buyChestsBuyAmount" oninput="updateBuyChestsSliderValue(this.value);displayBuyChestsBuyButton(this.value);"><label style="padding-left:10px" for="buyChestsBuyAmount" id="buyChestsSliderValue">0</label>`;
	txt+=addChestsRow(`Amount to Buy:`,r);
	wrapper.innerHTML = txt;
	modifyBuyChestsBuyAmountSlider();
}

function modifyBuyChestsBuyAmountSlider(val) {
	let buyChestsSilver = document.getElementById(`buyChestsSilver`);
	let buyChestsGold = document.getElementById(`buyChestsGold`);
	let buyChestsEvent = document.getElementById(`buyChestsEvent`);
	let buyChestsBuyAmount = document.getElementById(`buyChestsBuyAmount`);
	let buyChestsSliderValue = document.getElementById(`buyChestsSliderValue`);
	let buyChestsBuyer = document.getElementById(`buyChestsBuyer`);
	let be = ``;
	let maximumToUse;
	if (val==undefined)
		maximumToUse = 0;
	else if (val==1)
		maximumToUse = Number(buyChestsSilver.value);
	else if (val==2)
		maximumToUse = Number(buyChestsGold.value);
	else
		maximumToUse = Number(buyChestsEvent.value);
	
	buyChestsBuyAmount.max = maximumToUse;
	buyChestsBuyAmount.min = 0;
	buyChestsBuyAmount.value = 0;
	let fidelity = getBuyChestsSliderFidelity();
	buyChestsBuyAmount.step = fidelity > maximumToUse ? 1 : fidelity;
	updateBuyChestsSliderValue(0);
	displayBuyChestsBuyButton(0);
}

function displayBuyChestsBuyButton(amount) {
	let buyChestsBuyList = document.getElementById(`buyChestsBuyList`);
	let buyChestsBuyAmount = document.getElementById(`buyChestsBuyAmount`);
	let buyChestsSliderValue = document.getElementById(`buyChestsSliderValue`);
	let buyChestsBuyer = document.getElementById(`buyChestsBuyer`);
	let be = ``;
	let chestId = Number(buyChestsBuyList.value);
	
	if (chestId<=0||amount==undefined||amount<=0)
		be+=`<span class="f w100 p5" style="padding-left:10%">Cannot buy until a valid chest type and amount has been selected.</span>`;
	else
		be+=`<span class="f fr w100 p5"><span class="f falc fje mr2 greenButton" style="width:50%" id="buyChestsRow"><input type="button" onClick="buyChests()" name="buyChestsButton" id="buyChestsButton" style="font-size:0.9em;min-width:180px" value="Buy Chest${chestId>2?` Pack`:``}s"></span></span>`;
	buyChestsBuyer.innerHTML = be;
}

function updateBuyChestsSliderValue(val) {
	document.getElementById('buyChestsSliderValue').innerHTML=nf(val);
}

async function buyChests() {
	let buyChestsBuyer = document.getElementById(`buyChestsBuyer`);
	let buyChestsBuyList = document.getElementById(`buyChestsBuyList`);
	let buyChestsBuyAmount = document.getElementById(`buyChestsBuyAmount`);
	let buyChestsSliderValue = document.getElementById(`buyChestsSliderValue`);
	buyChestsBuyList.disabled = true;
	buyChestsBuyAmount.disabled = true;
	let buying=``;
	let txt=``;
	if (buyChestsBuyList==undefined||buyChestsBuyAmount==undefined) {
		txt+=`<span class="f w100 p5" style="padding-left:10%">Unknown error. Didn't buy any chest packs.</span>`;
		buyChestsBuyer.innerHTML = txt;
		return;
	}
	let chestId = buyChestsBuyList.value;
	let chestName = buyChestsBuyList.options[buyChestsBuyList.selectedIndex].text;
	let genChest = chestId > 2 ? `Chest Pack` : chestId == 1 ? `Silver Chest` : `Gold Chest`;
	let amount = buyChestsBuyAmount.value;
	let initAmount = amount;
	
	
	let buyChestsCurrencyDisplay = document.getElementById(chestId > 2 ? `buyChestsTokensDisplay` : `buyChestsGemsDisplay`);
	let buyChestsMaxType = document.getElementById(chestId == 1 ? `buyChestsTokensDisplay` : `buyChestsGemsDisplay`);
	let buyChestsMaxTypeDisplay;
	
	buyChestsBuyer.innerHTML = txt;
	buying=makeBuyingRow(amount,chestName,initAmount);
	if (amount==0) {
		txt += addChestResultRow(`- None`);
		buyChestsBuyer.innerHTML = buying + txt;
		return;
	}
	let numFails=0;
	buyChestsBuyer.innerHTML = buying + txt;
	while (amount > 0 && numFails < RETRIES) {
		let toBuy = Math.min(250,amount);
		let result = await buySoftCurrencyChest(chestId,toBuy);
		let successType = `Failed to buy`;
		let cost = ``;
		if (JSON.stringify(result).includes(`Failure: Not enough`)) {
			let failureType = chestId > 2 ? `tokens` : `gems`;
			txt += addChestResultRow(`- ${successType}:`,`Not enough ${failureType}.`);
			buying=makeBuyingRow(0,chestName,initAmount);
			buyChestsBuyer.innerHTML = buying + txt;
			return;
		}
		if (result['success']&&result['okay']) {
			successType = `Successfully bought`;
			let currencyType = chestId > 2 ? `Tokens` : `Gems`;
			let currencyRemaining = Math.floor(result.currency_remaining);
			cost = ` for ${nf(result.currency_spent)} ${currencyType} (${nf(currencyRemaining)} ${currencyType} Remaining)`;
			amount -= toBuy;
			if (chestId > 2) {
				applyValueToElementAndDisplay(`buyChestsTokens`,currencyRemaining);
				applyValueToElementAndDisplay(`buyChestsEvent`,Math.floor(currencyRemaining / chestPackCost));
			} else {
				applyValueToElementAndDisplay(`buyChestsGems`,currencyRemaining);
				applyValueToElementAndDisplay(`buyChestsSilver`,Math.floor(currencyRemaining / silverChestCost));
				applyValueToElementAndDisplay(`buyChestsGold`,Math.floor(currencyRemaining / goldChestCost));
			}
			buyChestsBuyAmount.value -= toBuy;
			updateBuyChestsSliderValue(buyChestsBuyAmount.value);
		} else
			numFails++;
		buying=makeBuyingRow(amount,chestName,initAmount);
		txt += addChestResultRow(`- ${successType}:`,`${toBuy} ${genChest}${cost}`);
		buyChestsBuyer.innerHTML = buying + txt;
	}
	buying=makeBuyingRow(amount,chestName,initAmount);
	txt += addChestResultRow(`Finished.`);
	buyChestsBuyer.innerHTML = buying + txt;
	if (numFails >= RETRIES) {
		txt += addChestResultRow(`- Stopping:`,`Got too many failures.`);
		buying=makeBuyingRow(0,chestName,initAmount);
		buyChestsBuyer.innerHTML = buying + txt;
		return;
	}
	let gemsValue = document.getElementById(`buyChestsGems`).value;
	if (gemsValue<silverChestCost) {
		document.getElementById(`gemChestsOpt`).innerHTML=notEnoughGems;
	} else if (gemsValue<goldChestCost) {
		document.getElementById(`gemChestsOpt`).innerHTML=silverChestOpt;
	}
	if (document.getElementById(`buyChestsTokens`).value<chestPackCost)
		document.getElementById(`tokenChestsOpt`).innerHTML=notEnoughEventTokens;
	buyChestsBuyAmount.max = 0;
	buyChestsBuyAmount.min = 0;
	buyChestsBuyAmount.value = 0;
	updateBuyChestsSliderValue(0);
	buyChestsBuyList.value = "-1";
	buyChestsBuyList.disabled = false;
	buyChestsBuyAmount.disabled = false;
}

function applyValueToElementAndDisplay(eleName,value) {
	document.getElementById(`${eleName}Display`).innerHTML = nf(value);
	document.getElementById(eleName).value = value;
}

function addChestsRow(left,right,hiddenInput,hiddenValue) {
	let hiddenField=``;
	let hiddenId=``;
	if (hiddenInput!=undefined&&hiddenValue!=undefined) {
		hiddenField = `<input type="hidden" id="${hiddenInput}" name="${hiddenInput}" value="${hiddenValue}">`
		hiddenId = ` id="${hiddenInput}Display" name="${hiddenInput}Display"`;
	}
	let txt = `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:25%;min-width:200px;">${left}</span><span class="f falc fjs ml2" style="padding-left:10px;width:35%;min-width:250px;"${hiddenId}>${right}</span>${hiddenField}</span>`;
	return txt;
}

function addChestResultRow(left,right) {
	let rightAdd = ``;
	if (right!=undefined)
		rightAdd = `<span class="f falc fjs ml2" style="flex-grow:1;margin-left:5px;flex-wrap:wrap">${right}</span>`;
	return `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:175px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">${left}</span>${rightAdd}</span>`;
}

function makeBuyingRow(amount,name,initAmount) {
	return `<span class="f fr w100 p5">${amount==0?`Finished `:``}Buying ${nf(amount==0?initAmount:amount)} ${name}s:</span>`;
}

function initBuyChestsSliderFidelity() {
	let fidelity = getBuyChestsSliderFidelity();
	if (![1,10,25,50,100,250,1000].includes(fidelity)) {
		toggleBuyChestsSliderFidelity(1);
		fidelity = 1;
	}
	document.getElementById(`buyChestsSliderFidelity`).value = fidelity;
}

function toggleBuyChestsSliderFidelity(fidelity) {
	if (fidelity==1&&localStorage.scBuyChestsSliderFidelity!=undefined)
		localStorage.removeItem(`scBuyChestsSliderFidelity`);
	else if (fidelity!=1)
		saveBuyChestsSliderFidelity(fidelity);
	let buyChestsBuyAmount = document.getElementById(`buyChestsBuyAmount`);
	if (buyChestsBuyAmount!=null) {
		buyChestsBuyAmount.step = fidelity;
		buyChestsBuyAmount.value = 0;
		modifyBuyChestsBuyAmountSlider(document.getElementById(`buyChestsBuyList`).value);
	}
}

function getBuyChestsSliderFidelity() {
	if (localStorage.scBuyChestsSliderFidelity!=undefined)
		return Number(localStorage.scBuyChestsSliderFidelity);
	return 1
}

function saveBuyChestsSliderFidelity(fidelity) {
	localStorage.scBuyChestsSliderFidelity = fidelity;
}