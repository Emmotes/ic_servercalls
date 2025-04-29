const vbc=1.005;

async function pullBuyChestsData() {
	if (userIdent[0]==``||userIdent[1]==``) {
		init();
		return;
	}
	temporarilyDisableAllPullButtons();
	let wrapper = document.getElementById(`buyChestsWrapper`);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		wrapper.innerHTML = `Waiting for user data...`;
		let details = (await getUserDetails()).details;
		let gems = details.red_rubies;
		let tokens = details.events_details.tokens;
		if (gems < 50 && tokens < 7500) {
			wrapper.innerHTML = `&nbsp;`;
			document.getElementById(`buyChestsBuyer`).innerHTML = `<span class="f w100 p5" style="padding-left:10%">You do not have enough gems or tokens to buy any chests.</span>`
			return;
		}
		let eventActive = details.events_details.active_events.length > 0 ? true : false;
		wrapper.innerHTML = `Waiting for definitions...`;
		let chests = (await getDefinitions("chest_type_defines")).chest_type_defines;
		wrapper.innerHTML = `Waiting for shop data...`;
		let shop = (await getShop()).shop_data.items.chest;
		await displayBuyChestsData(wrapper,gems,tokens,eventActive,chests,shop);
	} catch {
		wrapper.innerHTML = BADDATA;
	}
}

async function displayBuyChestsData(wrapper,gems,tokens,eventActive,chests,shop) {
	let buyChestsBuyer = document.getElementById(`buyChestsBuyer`);
	let eventChestIds = [];
	let eventChestNames = [];
	if (eventActive) {
		for (let chest of shop)
			if (chest.tags.includes('event'))
				eventChestIds.push(chest.type_id);
		eventChestIds.sort((a, b) => a - b);
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
	let silverChests = Math.floor(gems/50);
	let goldChests = Math.floor(gems/500);
	let chestPacks = Math.floor(tokens/7500);
	
	let txt = ``;
	txt+=addChestsRow(`Available Gems:`,nf(gems));
	txt+=addChestsRow(`Maximum Silver Chests:`,`${nf(silverChests)}<input type="hidden" id="buyChestsSilver" name="buyChestsSilver" value="${silverChests}">`);
	txt+=addChestsRow(`Maximum Gold Chests:`,`${nf(goldChests)}<input type="hidden" id="buyChestsGold" name="buyChestsGold" value="${goldChests}">`);
	txt+=addChestsRow(`&nbsp;`,`&nbsp;`);
	txt+=addChestsRow(`Available Event Tokens:`,nf(tokens));
	txt+=addChestsRow(`Maximum Chest Packs:`,`${nf(chestPacks)}<input type="hidden" id="buyChestsEvent" name="buyChestsEvent" value="${chestPacks}">`);
	txt+=addChestsRow(`&nbsp;`,`&nbsp;`);
	let s=`<select name="buyChestsBuyList" id="buyChestsBuyList" oninput="displayBuyChestsBuyButton(this.value);"><option value="-1" selected>-</option><optgroup label="Gem Chests">`;
	if (gems >= 50)
		s+=`<option value="1">Silver Chest</option><option value="2">Gold Chest</option>`;
	else
		s+=`<option value="-1">Not enough gems.</option>`;
	s+=`</optgroup><optgroup label="Event Chest Packs">`;
	if (eventChestIds.length > 0) {
		if (tokens >= 7500) {
			for (let i=0; i<eventChestIds.length; i++)
				s+=`<option value="${eventChestIds[i]}">${eventChestNames[i]}</option>`;
		} else
			s+=`<option value="-1">Not enough event tokens.</option>`;
	} else
		s+=`<option value="-1">No event chest packs available.</option>`;
	s+=`</optgroup></select>`;
	txt+=addChestsRow(`What to Buy:`,s);
	let r=`<input type="range" min="0" max="0" step="1" value="0" name="buyChestsBuyAmount" id="buyChestsBuyAmount" oninput="updatebuyChestsSliderValue(this.value);"><label style="padding-left:10px" for="buyChestsBuyAmount" id="buyChestsSliderValue">0</label>`;
	txt+=addChestsRow(`Amount to Buy:`,r);
	wrapper.innerHTML = txt;
	displayBuyChestsBuyButton();
}

function displayBuyChestsBuyButton(val) {
	let buyChestsSilver = document.getElementById(`buyChestsSilver`);
	let buyChestsGold = document.getElementById(`buyChestsGold`);
	let buyChestsEvent = document.getElementById(`buyChestsEvent`);
	let buyChestsBuyAmount = document.getElementById(`buyChestsBuyAmount`);
	let buyChestsSliderValue = document.getElementById(`buyChestsSliderValue`);
	let buyChestsBuyer = document.getElementById(`buyChestsBuyer`);
	let be = ``;
	if (val==undefined||val=="-1") {
		be+=`<span class="f w100 p5" style="padding-left:10%">Cannot buy until a valid chest type has been selected.</span>`;
		buyChestsBuyAmount.max = 0;
		buyChestsBuyAmount.min = 0;
		buyChestsBuyAmount.value = 0;
		buyChestsSliderValue.innerHTML = nf(0);
	} else {
		be+=`<span class="f fr w100 p5"><span class="f falc fje mr2 greenButton" style="width:50%" id="buyChestsRow"><input type="button" onClick="buyChests()" name="buyChestsButton" id="buyChestsButton" style="font-size:0.9em;min-width:180px" value="Buy Chest${val>2?` Pack`:``}s"></span></span>`;
		buyChestsBuyAmount.min = 1;
		buyChestsBuyAmount.value = 1;
		buyChestsSliderValue.innerHTML = nf(1);
		if (val==1)
			buyChestsBuyAmount.max = Number(buyChestsSilver.value);
		else if (val==2)
			buyChestsBuyAmount.max = Number(buyChestsGold.value);
		else
			buyChestsBuyAmount.max = Number(buyChestsEvent.value);
	}
	buyChestsBuyer.innerHTML = be;
}

function updatebuyChestsSliderValue(val) {
	document.getElementById('buyChestsSliderValue').innerHTML=nf(val);
}

async function buyChests() {
	let buyChestsBuyer = document.getElementById(`buyChestsBuyer`);
	let buyChestsBuyList = document.getElementById(`buyChestsBuyList`);
	let buyChestsBuyAmount = document.getElementById(`buyChestsBuyAmount`);
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
	
	buyChestsBuyer.innerHTML = txt;
	buying=makeBuyingRow(amount,chestName,initAmount);
	if (amount==0) {
		txt += `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:175px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">- None</span></span>`;
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
			txt += `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:175px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">- ${successType}:</span><span class="f falc fjs ml2" style="flex-grow:1;margin-left:5px;flex-wrap:wrap">Not enough ${failureType}.</span></span>`;
			buying=makeBuyingRow(0,chestName,initAmount);
			buyChestsBuyer.innerHTML = buying + txt;
			return;
		}
		if (result['success']&&result['okay']) {
			successType = `Successfully bought`;
			let currencyType = chestId > 2 ? `Tokens` : `Gems`;
			cost = ` for ${nf(result.currency_spent)} ${currencyType} (${nf(Math.round(result.currency_remaining))} ${currencyType} Remaining)`;
			amount -= toBuy;
		} else
			numFails++;
		buying=makeBuyingRow(amount,chestName,initAmount);
		txt += `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:175px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">- ${successType}:</span><span class="f falc fjs ml2" style="flex-grow:1;margin-left:5px;flex-wrap:wrap">${toBuy} ${genChest}${cost}</span></span>`;
		buyChestsBuyer.innerHTML = buying + txt;
	}
	buying=makeBuyingRow(amount,chestName,initAmount);
	buyChestsBuyer.innerHTML = buying + txt;
	if (numFails >= RETRIES) {
		txt += `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:175px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">- Stopping:</span><span class="f falc fjs ml2" style="flex-grow:1;margin-left:5px;flex-wrap:wrap">Got too many failures.</span></span>`;
		buying=makeBuyingRow(0,chestName,initAmount);
		buyChestsBuyer.innerHTML = buying + txt;
	}
}

function addChestsRow(left,right) {
	let txt = `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:25%;min-width:200px;">${left}</span><span class="f falc fjs ml2" style="padding-left:10px;width:35%;min-width:250px;">${right}</span>`;
	txt += `</span>`;
	return txt;
}

function makeBuyingRow(amount,name,initAmount) {
	return `<span class="f fr w100 p5">${amount==0?`Finished `:``}Buying ${nf(amount==0?initAmount:amount)} ${name}s:</span>`;
}