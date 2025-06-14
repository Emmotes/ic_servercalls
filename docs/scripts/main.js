const v=4.00;
const tabsContainer=document.getElementById(`tabsContainer`);
const disabledUntilData=document.getElementById(`disabledUntilData`);
const settingsMenu=document.getElementById(`settingsMenu`);
const settingsUserName=document.getElementById(`userName`);
const settingsUserId=document.getElementById(`userId`);
const settingsUserHash=document.getElementById(`userHash`);
const settingsSave=document.getElementById(`settingsMenuButtonSave`);
const settingsClose=document.getElementById(`settingsMenuButtonClose`);
const settingsList=document.getElementById(`settingsMenuAccountsList`);
const settingsLoad=document.getElementById(`settingsMenuButtonLoadAccount`);
const settingsDelete=document.getElementById(`settingsMenuButtonDeleteAccount`);
const supportUrl=document.getElementById(`supportUrl`);
const supportUrlButton=document.getElementById(`supportUrlMenuButton`);
const NUMFORM = new Intl.NumberFormat("en",{useGrouping:true,maximumFractionDigits:2});
var pbNames;
var pbCodeRunning;
var pbTimerRunning;

function isBadUserData() {
	if (currAccount==undefined||currAccount.name==undefined||currAccount.id==undefined||currAccount.hash==undefined) {
		init();
		return true;
	}
	return false;
}

function init() {
	// Deal with account migration.
	if (localStorage.scUserIdent!=undefined) {
		let userIdent = JSON.parse(localStorage.scUserIdent);
		settingsUserName.value = ``;
		settingsUserId.value = userIdent[0];
		settingsUserHash.value = userIdent[1];
		
		disabledUntilData.hidden = false;
		tabsContainer.hidden = true;
		settingsClose.hidden = true;
		currAccount = undefined;
		localStorage.removeItem(`scUserIdent`);
		settingsToggle();
		settingsUserName.focus();
	} else {
		let accountData = getUserAccounts();
		if (accountData==undefined||accountData.current==undefined||accountData.accounts==undefined||Object.keys(accountData.current).length==0||Object.keys(accountData.accounts)==0) {
			currAccount = undefined;
			disabledUntilData.hidden = false;
			tabsContainer.hidden = true;
			settingsClose.hidden = true;
			settingsToggle();
		} else {
			settingsClose.hidden = false;
			currAccount = accountData.current;
		}
	}
	refreshSettingsList();
	window.addEventListener('hashchange',() =>{
		swapTab();
	});
	initPullButtonStuff();
	initBuyChestsSliderFidelity();
	initOpenChestsSliderFidelity();
	initOpenChestsHideChests();
	initDismantleHideOptions();
	swapTab();
}

function settingsToggle() {
	if (currAccount==undefined) {
		settingsMenu.style.display = `flex`;
		return;
	}
	if (settingsMenu.style.display==`none`||settingsMenu.style.display==``) {
		if (currAccount.name==undefined||currAccount.id==undefined||currAccount.has==undefined) {
			refreshSettingsList();
			if (settingsList.value!=`-`) {
				loadUserAccount();
			} else {
				userName.value = ``;
				userId.value = ``;
				userHash.value = ``;
			}
		} else {
			userName.value = currAccount.name;
			userId.value = currAccount.id;
			userHash.value = currAccount.hash;
		}
		settingsMenu.style.display = `flex`;
	} else {
		settingsMenu.style.display = `none`;
	}
}

function initPullButtonStuff() {
	pbNames=[];
	for (let obj of document.querySelectorAll('[name$="PullButton"]'))
		pbNames.push(obj.name.replace(`PullButton`,``));
	pbCodeRunning = false;
	pbTimerRunning = false;
}

function getPatronNameById(id) {
	switch (id) {
		case 1: return paronAdvIds["1100000"];
		case 2: return paronAdvIds["1200000"];
		case 3: return paronAdvIds["1300000"];
		case 4: return paronAdvIds["1400000"];
		case 5: return paronAdvIds["1500000"];
		default: return `??? (id: ${id})`;
	}
}

async function saveUserData() {
	let userName = settingsUserName.value || ``;
	let userId = settingsUserId.value || ``;
	let userHash = settingsUserHash.value || ``;
	if (userName!=``&&userId!=``&&userHash!=``) {
		let newAccount = {name:userName,id:userId,hash:userHash};
		addUserAccount(newAccount);
		currAccount = newAccount;
		settingsSave.value = `SAVED`;
		if (settingsClose.hidden)
			settingsClose.hidden = false;
		if (tabsContainer.hidden)
			tabsContainer.hidden = false;
		if (!disabledUntilData.hidden)
			disabledUntilData.hidden = true;
		setTimeout(function(){settingsSave.value=`Save`;},2000);
	} else {
		settingsSave.value = `ERROR`;
		setTimeout(function(){settingsSave.value=`Save`;},2000);
	}
	refreshSettingsList();
}

async function supportUrlSaveData() {
	let url = supportUrl.value || ``;
	if (url==``)
		return;
	try {
		let userId = Number(url.match(/&user_id=[0-9]+/g)[0].replace("&user_id=",""));
		let userHash = url.match(/&device_hash=[A-Za-z0-9]+/g)[0].replace("&device_hash=","");
		settingsUserName.value = ``;
		settingsUserId.value = userId;
		settingsUserHash.value = userHash;
		supportUrl.value = ``;
		settingsUserName.focus();
	} catch {
		supportUrl.value = `Couldn't find user data in url.`;
	}
}

async function loadUserAccount() {
	let accounts = getUserAccounts();
	let accountChoice = settingsList.value;
	if (accounts.accounts[accountChoice]==undefined) {
		settingsLoad.value = `ERROR`;
		setTimeout(function(){settingsLoad.value=`Load`;},2000);
		for (var i=settingsList.length-1; i>=0; i--)
			if (settingsList.options[i].value == accountChoice)
				settingsList.remove(i);
	} else {
		currAccount = accounts.accounts[accountChoice];
		accounts.current = currAccount;
		saveUserAccounts(accounts);
		userName.value = currAccount.name;
		userId.value = currAccount.id;
		userHash.value = currAccount.hash;
		SERVER=``;
		instanceId=``;
		boilerplate=``;
	}
}

async function deleteUserAccount() {
	removeUserAccount(settingsList.value);
	refreshSettingsList();
	if (settingsList.value!=`-`)
		loadUserAccount();
	else {
		userName.value = ``;
		userId.value = ``;
		userHash.value = ``;
		disabledUntilData.hidden = false;
		tabsContainer.hidden = true;
		settingsClose.hidden = true;
		settingsToggle();
	}
}

async function refreshSettingsList() {
	let userAccounts = getUserAccounts();
	let select = ``;
	for (let name of Object.keys(userAccounts.accounts))
		select += `<option value="${name}"${currAccount!=undefined&&currAccount.name!=undefined&&currAccount.name==name?` selected`:``}>${name}</option>`;
	if (select==``)
		select += `<option value="-" selected>-</option>`;
	settingsList.innerHTML = select;
}

function swapTab() {
	let hash = window.location.hash.substring(1);
	if (hash != "" && document.getElementById(hash) != undefined)
		document.getElementById(hash).click();
}

function setHash(hash) {
	hash = "#" + hash;
	if (history.replaceState)
		history.replaceState(null, null, hash);
	else
		window.location.hash = hash;
}

function togglePullButtons(disable) {
	if (pbCodeRunning||pbTimerRunning)
		return;
	
	for (let name of pbNames) {
		let button = document.getElementById(`${name}PullButton`);
		let message = document.getElementById(`${name}PullButtonDisabled`);
		if (button==undefined||message==undefined)
			continue;
		button.hidden = disable;
		message.hidden = !disable;
		button.className = disable ? button.className + ` greyButton` : button.className.replace(` greyButton`,``);
	}
}

function disablePullButtons(skipTimer) {
	togglePullButtons(true);
	pbCodeRunning = true;
	if (skipTimer)
		pbTimerRunning = false;
	else {
		pbTimerRunning = true;
		setTimeout(function(){pbTimerRunning=false;togglePullButtons(false);},10000);
	}
}

function codeEnablePullButtons() {
	pbCodeRunning = false;
	togglePullButtons(false);
}

function setFormsWrapperFormat(wrapper,type) {
	if (type == 0) {
		wrapper.className = `f falc fje mr2`;
		wrapper.style = `flex-direction:column;`;
	} else if (type == 1) {
		wrapper.className = `formsWrapper`;
		wrapper.style = ``;
	} else if (type == 2) {
		wrapper.className = `partiesWrapper`;
		wrapper.style = ``;
	}
}

function handleError(wrapper,error) {
	wrapper.innerHTML = `${error}. Server call failed.`;
	if (error.toString().includes(`appears to be dead`))
		SERVER = ``;
}

function getDefsNames(defs) {
    let names = {};
    for (let def of defs)
        names[def.id] = def.name;
    return names;
}

function nf(number) {
	return NUMFORM.format(number);
}

function randInt(min, max) {
	const minCeiled = Math.ceil(min);
	const maxFloored = Math.floor(max);
	return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled);
}

function dateFormat(input) {
	return Intl.DateTimeFormat("en-GB", {"hour":"2-digit","minute":"2-digit","second":"2-digit"}).format(input);
}

function getDisplayTime(time) {
	let days = Math.floor(time/(1000*60*60*24));
	let hours = Math.floor((time/(1000*60*60)) % 24);
	let minutes = Math.floor((time/1000/60) % 60);
	let seconds = Math.floor((time/1000) % 60);
	let display = ``;
	if (days>0) display += `${days} days `;
	if (days>0||hours>0) display += `${hours} hours `;
	if (days>0||hours>0||minutes>0) display += `${padZeros(minutes,2)} mins `;
	display+= `${padZeros(seconds,2)} secs`;
	return display;
}

function padZeros(num,places) {
	return String(num).padStart(places, '0');
}

function compress(input) {
	return LZString.compress(input);
}

function decompress(input) {
	return LZString.decompress(input);
}

function findWord(word,str) {
	if (ciEquals(word,`Test`) && ciEquals(str,`Test of High Sorcery`))
		return false;
	return RegExp('\\b'+ word +'\\b', 'i').test(str)
}

function ciEquals(a, b) {
	return typeof a === 'string' && typeof b === 'string' ? a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0 : a === b;
}

function numSort(arr,reverse) {
	arr.sort((a, b) => (reverse ? b - a : a - b));
}

async function sleep(ms) {
	await new Promise(r => setTimeout(r, ms));
}

function getUserAccounts() {
	if (localStorage.scAccounts==undefined)
		return {accounts:{}};
	return JSON.parse(localStorage.scAccounts);
}

function saveUserAccounts(accounts) {
	localStorage.scAccounts = JSON.stringify(accounts);
}

function addUserAccount(account) {
	let userAccounts = getUserAccounts();
	userAccounts.accounts[account.name] = account;
	userAccounts.current = account;
	saveUserAccounts(userAccounts);
}

function removeUserAccount(name) {
	let userAccounts = getUserAccounts();
	if (Object.keys(userAccounts.accounts).includes(name))
		delete userAccounts.accounts[name];
	if (userAccounts.current.name==name) {
		userAccounts.current = {};
		currAccount = undefined;
	}
	saveUserAccounts(userAccounts);
}