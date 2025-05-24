const v=3.007;
const tabsContainer=document.getElementById(`tabsContainer`);
const disabledUntilData=document.getElementById(`disabledUntilData`);
const settingsMenu=document.getElementById(`settingsMenu`);
const settingsUserId=document.getElementById(`userId`);
const settingsUserHash=document.getElementById(`userHash`);
const settingsSave=document.getElementById(`settingsMenuButtonSave`);
const settingsClose=document.getElementById(`settingsMenuButtonClose`);
const supportUrl=document.getElementById(`supportUrl`);
const supportUrlButton=document.getElementById(`supportUrlMenuButton`);
const M=`https://master.idlechampions.com/~idledragons/`;
const SPS=`switch_play_server`;
const FR=`failure_reason`;
const OII=`Outdated instance id`;
const PARAM_CALL=`call`;
const PARAM_INSTANCEID=`instance_id`;
const PARAM_USERID=`user_id`;
const PARAM_USERHASH=`hash`;
const RETRIES=4;
const BADDATA = `Response: Your user data is incorrect. Server call failed.`;
const NUMFORM = new Intl.NumberFormat("en",{useGrouping:true,maximumFractionDigits:2});

function init() {
	if (localStorage.scUserIdent!=undefined&&localStorage.scUserIdent!=``) {
		settingsClose.hidden = false;
		userIdent = JSON.parse(localStorage.scUserIdent);
	} else {
		disabledUntilData.hidden = false;
		tabsContainer.hidden = true;
		settingsClose.hidden = true;
		settingsToggle();
	}
	window.addEventListener('hashchange',() =>{
		swapTab();
	});
	initBuyChestsSliderFidelity();
	initOpenChestsSliderFidelity();
	initOpenChestsHideChests();
	swapTab();
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

function settingsToggle() {
	if (localStorage.scUserIdent==undefined||localStorage.scUserIdent==``) {
		settingsMenu.style.display = `flex`;
		return;
	}
	if (settingsMenu.style.display==`none`||settingsMenu.style.display==``) {
		userId.value = userIdent[0];
		userHash.value = userIdent[1];
		settingsMenu.style.display = `flex`;
	} else {
		settingsMenu.style.display = `none`;
	}
}

async function saveUserData() {
	let userId = settingsUserId.value || ``;
	let userHash = settingsUserHash.value || ``;
	if (userId!=``&&userHash!=``) {
		userIdent[0] = userId;
		userIdent[1] = userHash;
		localStorage.scUserIdent = JSON.stringify(userIdent);
		settingsSave.value = `SAVED`;
		if (settingsClose.hidden)
			settingsClose.hidden = false;
		if (tabsContainer.hidden)
			tabsContainer.hidden = false;
		if (!disabledUntilData.hidden)
			disabledUntilData.hidden = true;
		await new Promise(r => setTimeout(r, 2000));
		settingsSave.value = `Save`;
	} else {
		settingsSave.value = `ERROR`;
		await new Promise(r => setTimeout(r, 2000));
		settingsSave.value = `Save`;
	}
}

async function supportUrlSaveData() {
	let url = supportUrl.value || ``;
	if (url==``)
		return;
	try {
		let userId = Number(url.match(/&user_id=[0-9]+/g)[0].replace("&user_id=",""));
		let userHash = url.match(/&device_hash=[A-Za-z0-9]+/g)[0].replace("&device_hash=","");
		settingsUserId.value = userId;
		settingsUserHash.value = userHash;
		supportUrl.value = ``;
		await saveUserData();
	} catch {
		supportUrl.value = `Couldn't find user data in url.`;
	}
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

function temporarilyDisableAllPullButtons() {
	let names = [];
	for (let obj of document.querySelectorAll('[name$="PullButton"]'))
		names.push(obj.name.replace(`PullButton`,``));
	
	let eles = [];
	for (let name of names) {
		let button = document.getElementById(`${name}PullButton`);
		let message = document.getElementById(`${name}PullButtonDisabled`);
		if (button==undefined||message==undefined)
			continue;
		button.hidden = true;
		message.hidden = false;
		eles.push([button,message]);
	}
	setTimeout(function(){for(let ele of eles){ele[0].hidden=false;ele[1].hidden=true;}},10000);
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