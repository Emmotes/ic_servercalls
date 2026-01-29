const v = 4.032; // prettier-ignore
const globalButtonDisableTime = 15000;
const disabledUntilInit = document.getElementById(`disabledUntilInit`);
const disabledUntilData = document.getElementById(`disabledUntilData`);
const disabledVersionLockdown = document.getElementById(
	`disabledVersionLockdown`,
);
const updateContainer = document.getElementById(`updateContainer`);
const tabsContainer = document.getElementById(`tabsContainer`);
const settingsIconName = document.getElementById(`settingsIconName`);
const settingsMenu = document.getElementById(`settingsMenu`);
const settingsUserName = document.getElementById(`userName`);
const settingsUserId = document.getElementById(`userId`);
const settingsUserHash = document.getElementById(`userHash`);
const settingsSave = document.getElementById(`settingsMenuButtonSave`);
const settingsClose = document.getElementById(`settingsMenuButtonClose`);
const settingsList = document.getElementById(`settingsMenuAccountsList`);
const settingsLoad = document.getElementById(`settingsMenuButtonLoadAccount`);
const settingsDelete = document.getElementById(
	`settingsMenuButtonDeleteAccount`,
);
const settingsNumberFormat = document.getElementById(`settingsNumberFormat`);
const supportUrl = document.getElementById(`supportUrl`);
const supportUrlButton = document.getElementById(`supportUrlMenuButton`);
const lsSettings = `scSettings`;
const NF_GROUPS = {useGrouping: true, maximumFractionDigits: 2};
let numForm = new Intl.NumberFormat(undefined, NF_GROUPS);
let updateInterval;
const timerList = {};
let pbNames;
let pbCodeRunning;
let pbTimerRunning;
let pbTimerTimeout = null;

function isBadUserData() {
	if (pbCodeRunning || pbTimerRunning) return true;
	if (
		currAccount == null ||
		currAccount.name == null ||
		currAccount.id == null ||
		currAccount.hash == null
	) {
		init();
		return true;
	}
	return false;
}

function init() {
	disabledUntilInit.hidden = true;
	tabsContainer.hidden = false;
	// Deal with account migration.
	if (localStorage.scUserIdent != null) {
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
		settingsIconName.innerHTML = `&nbsp;`;
	} else {
		let accountData = getUserAccounts();
		if (
			accountData == null ||
			accountData.current == null ||
			accountData.accounts == null ||
			Object.keys(accountData.current).length === 0 ||
			Object.keys(accountData.accounts) === 0
		) {
			currAccount = undefined;
			settingsIconName.innerHTML = `&nbsp;`;
			disabledUntilData.hidden = false;
			tabsContainer.hidden = true;
			settingsClose.hidden = true;
			settingsToggle();
		} else {
			settingsClose.hidden = false;
			currAccount = accountData.current;
			settingsIconName.innerHTML = currAccount.name;
		}
	}
	refreshSettingsList();
	window.addEventListener("hashchange", () => {
		swapTab();
	});
	initSettingsNumberFormat();
	initPullButtonStuff();
	bc_initBuyChestsSliderFidelity();
	oc_initOpenChestsSliderFidelity();
	oc_initOpenChestsHideChests();
	dc_initDismantleHideOptions();
	et_initEventTiersHideTier4();
	ss_tryResumeCooldownOnLoad();
	swapTab();
	startUpdateCheckInterval(1800000); // 30 mins
}

function settingsToggle() {
	if (currAccount == null) {
		settingsMenu.style.display = `flex`;
		return;
	}
	if (
		settingsMenu.style.display === `none` ||
		settingsMenu.style.display === ``
	) {
		if (
			currAccount.name == null ||
			currAccount.id == null ||
			currAccount.hash == null
		) {
			refreshSettingsList();
			if (settingsList.value !== `-`) {
				loadUserAccount();
			} else {
				userName.value = ``;
				userId.value = ``;
				userHash.value = ``;
				settingsIconName.innerHTML = `&nbsp;`;
			}
		} else {
			userName.value = currAccount.name;
			userId.value = currAccount.id;
			userHash.value = currAccount.hash;
			settingsIconName.innerHTML = currAccount.name;
		}
		settingsMenu.style.display = `flex`;
	} else {
		settingsMenu.style.display = `none`;
	}
}

function initSettingsNumberFormat() {
	const settings = getLocalSettings();
	const settingNumFormat =
		Object.prototype.hasOwnProperty.call(Object, settings, "nf") ?
			settings.nf
		:	undefined;
	const num = 12345.67;

	let opts = ``;
	const types = [undefined, "fr-FR", "en-GB", "de-DE"];
	for (let k = 0; k < types.length; k++) {
		let name = "Browser";
		switch (k) {
			case 1:
				name = "&nbsp;&nbsp;Space";
				break;
			case 2:
				name = "&nbsp;&nbsp;Comma";
				break;
			case 3:
				name = "&nbsp;Period";
		}
		opts += `<option value="${types[k] == null ? "-" : types[k]}"${
			types[k] === settingNumFormat ? " selected" : ""
		}>${name}: ${new Intl.NumberFormat(types[k], NF_GROUPS).format(
			num,
		)}</option>`;
	}
	settingsNumberFormat.innerHTML = opts;
	numForm = new Intl.NumberFormat(settingNumFormat, NF_GROUPS);
}

function changeCurrentNumberFormat(code) {
	if (code === "-") code = undefined;
	numForm = new Intl.NumberFormat(code, NF_GROUPS);
	if (code != null) setLocalSetting("nf", code);
	else deleteLocalSetting("nf");
}

function initPullButtonStuff() {
	pbNames = [];
	for (let obj of document.querySelectorAll('[name$="PullButton"]'))
		pbNames.push(obj.name.replace(`PullButton`, ``));
	pbCodeRunning = false;
	pbTimerRunning = false;
}

async function startUpdateCheckInterval(delay) {
	await sleep(delay);
	updateInterval = setAsyncInterval(async () => {
		await checkUpdatedScriptsAvailable();
	}, delay);
}

async function checkUpdatedScriptsAvailable() {
	const newDocum = new DOMParser().parseFromString(
		await (
			await fetch(window.location.href, {
				headers: {"Cache-Control": "no-cache"},
			})
		).text(),
		"text/html",
	);
	const oldList = [
		...document.querySelectorAll("script[type='text/javascript']"),
	].map((ele) => ele.src);
	const newList = [
		...newDocum.querySelectorAll("script[type='text/javascript']"),
	].map((ele) => ele.src);
	if (
		oldList.length === newList.length &&
		oldList.every((value, index) => value === newList[index])
	)
		return;
	enableVersionUpdate();
}

function enableVersionUpdate() {
	document.getElementById("updateContainer").style.display = "";
	document.getElementById("changelogContainer").style.display = "none";
	document.getElementById("versioningContainer").style =
		"position:fixed;box-shadow:2px 2px 10px var(--ShipGrey), -2px -2px 10px var(--ShipGrey), -2px 2px 10px var(--ShipGrey), 2px -2px 10px var(--ShipGrey);";

	clearAsyncInterval(updateInterval);
}

function getPatronNameById(id) {
	switch (id) {
		case 1:
			return c_patronAdvIds["1100000"];
		case 2:
			return c_patronAdvIds["1200000"];
		case 3:
			return c_patronAdvIds["1300000"];
		case 4:
			return c_patronAdvIds["1400000"];
		case 5:
			return c_patronAdvIds["1500000"];
		default:
			return `??? (id: ${id})`;
	}
}

async function saveUserData() {
	const userName = settingsUserName.value || ``;
	const userId = settingsUserId.value || ``;
	const userHash = settingsUserHash.value || ``;
	if (userName !== `` && userId !== `` && userHash !== ``) {
		const newAccount = {name: userName, id: userId, hash: userHash};
		addUserAccount(newAccount);
		currAccount = newAccount;
		settingsIconName.innerHTML = currAccount.name;
		settingsSave.value = `SAVED`;
		if (settingsClose.hidden) settingsClose.hidden = false;
		if (tabsContainer.hidden) tabsContainer.hidden = false;
		if (!disabledUntilData.hidden) disabledUntilData.hidden = true;
		setTimeout(function () {
			settingsSave.value = `Save`;
		}, 2000);
	} else {
		settingsSave.value = `ERROR`;
		setTimeout(function () {
			settingsSave.value = `Save`;
		}, 2000);
	}
	refreshSettingsList();
	cleanup();
}

async function supportUrlSaveData() {
	const url = supportUrl.value || ``;
	if (url === ``) return;
	try {
		const userId = Number(
			url.match(/&user_id=[0-9]+/g)[0].replace("&user_id=", ""),
		);
		const userHash = url
			.match(/&device_hash=[A-Za-z0-9]+/g)[0]
			.replace("&device_hash=", "");
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
	const accounts = getUserAccounts();
	const accountChoice = settingsList.value;
	if (accounts.accounts[accountChoice] == null) {
		settingsLoad.value = `ERROR`;
		setTimeout(function () {
			settingsLoad.value = `Load`;
		}, 2000);
		for (var i = settingsList.length - 1; i >= 0; i--)
			if (settingsList.options[i].value === accountChoice)
				settingsList.remove(i);
	} else {
		currAccount = accounts.accounts[accountChoice];
		accounts.current = currAccount;
		saveUserAccounts(accounts);
		userName.value = currAccount.name;
		userId.value = currAccount.id;
		userHash.value = currAccount.hash;
		settingsIconName.innerHTML = currAccount.name;
		SERVER = ``;
		instanceId = ``;
		boilerplate = ``;
		oc_initOpenChestsHideChests();
	}
	clearTimers();
	cleanup();
}

async function deleteUserAccount() {
	removeUserAccount(settingsList.value);
	refreshSettingsList();
	if (settingsList.value !== `-`) loadUserAccount();
	else {
		userName.value = ``;
		userId.value = ``;
		userHash.value = ``;
		disabledUntilData.hidden = false;
		tabsContainer.hidden = true;
		settingsClose.hidden = true;
		settingsToggle();
	}
	cleanup();
}

function sanitise(obj) {
	function replacer(value) {
		if (typeof value === "string")
			if (value === currAccount.id || value === currAccount.hash)
				return "____";
		return value;
	}
	function deepSanitise(input) {
		if (Array.isArray(input)) return input.map(deepSanitise);
		else if (input && typeof input === "object") {
			const out = {};
			for (let key in input) out[key] = deepSanitise(input[key]);
			return out;
		}
		return replacer(input);
	}
	return deepSanitise(obj);
}

async function refreshSettingsList() {
	const userAccounts = getUserAccounts();
	let select = ``;
	for (let name in userAccounts.accounts)
		select += `<option value="${name}"${
			(
				currAccount != null &&
				currAccount.name != null &&
				currAccount.name === name
			) ?
				` selected`
			:	``
		}>${name}</option>`;
	if (select === ``) select += `<option value="-" selected>-</option>`;
	settingsList.innerHTML = select;
}

function swapTab() {
	const hash = window.location.hash.substring(1);
	if (hash !== "" && document.getElementById(hash) != null)
		document.getElementById(hash).click();
}

function cleanup() {
	for (let ele of [
		...document.querySelectorAll(`div[class="tabsContent"] > span`),
	].filter((e) => e.id !== ""))
		ele.innerHTML = `&nbsp;`;
}

function setHash(hash) {
	hash = "#" + hash;
	if (history.replaceState) history.replaceState(null, null, hash);
	else window.location.hash = hash;
}

function togglePullButtons(disable) {
	if (!disable && (pbCodeRunning || pbTimerRunning)) return;

	for (let name of pbNames) {
		const button = document.getElementById(`${name}PullButton`);
		const message = document.getElementById(`${name}PullButtonDisabled`);
		if (button == null || message == null) continue;
		button.hidden = disable;
		message.innerHTML = `&nbsp;`;
		const timerName = `mpb_${name}`;
		if (disable) {
			let prefix = `Disabled for `;
			let suffix = ` to prevent spamming the servers.`;
			message.innerHTML =
				prefix +
				getDisplayTime(globalButtonDisableTime - 1000) +
				suffix;
			createTimer(
				globalButtonDisableTime,
				timerName,
				`${name}PullButtonDisabled`,
				`<span id="${name}PullButtonDisabled" style="font-size:0.9em">Still busy with other tasks. Please wait.</span>`,
				prefix,
				suffix,
			);
		} else if (Object.prototype.hasOwnProperty.call(timerList, timerName)) {
			clearInterval(timerList[timerName].interval);
			delete timerList[timerName];
		}
		message.hidden = !disable;
		button.className =
			disable ?
				button.className + ` greyButton`
			:	button.className.replace(` greyButton`, ``);
	}
}

function disablePullButtons() {
	togglePullButtons(true);

	pbCodeRunning = true;
	pbTimerRunning = true;

	if (pbTimerTimeout != null) clearTimeout(pbTimerTimeout);
	pbTimerTimeout = setTimeout(() => {
		pbTimerRunning = false;
		pbTimerTimeout = null;
		togglePullButtons(false);
	}, globalButtonDisableTime);
}

function codeEnablePullButtons() {
	pbCodeRunning = false;
	togglePullButtons(false);
}

function setFormsWrapperFormat(wrapper, type) {
	if (type === 0) {
		wrapper.className = `f falc fje mr2`;
		wrapper.style = `flex-direction:column;`;
	} else if (type === 1) {
		wrapper.className = `formsWrapper`;
		wrapper.style = ``;
	} else if (type === 2) {
		wrapper.className = `partiesWrapper`;
		wrapper.style = ``;
	} else if (type === 3) {
		wrapper.className = `eventTiersWrapper`;
		wrapper.style = ``;
	} else if (type === 4) {
		wrapper.className = `serverStatusWrapper`;
		wrapper.style = ``;
	}
}

function handleError(wrapper, error) {
	wrapper.innerHTML = `${error}. Server call failed.`;
	if (error.toString().includes(`appears to be dead`)) SERVER = ``;
	codeEnablePullButtons();
}

function getDefsNames(defs) {
	const names = {};
	for (let def of defs) names[def.id] = def.name;
	return names;
}

function nf(number) {
	return numForm.format(number);
}

function randInt(min, max) {
	const minCeiled = Math.ceil(min);
	const maxFloored = Math.floor(max);
	return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled);
}

function dateFormat(input) {
	return Intl.DateTimeFormat(undefined, {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	}).format(input);
}

function getDisplayTime(timeMs) {
	let ms = Math.max(0, Number(timeMs) || 0);

	const totalSeconds = Math.floor(ms / 1000);
	const days = Math.floor(totalSeconds / 86400);
	const hours = Math.floor((totalSeconds % 86400) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	const parts = [];

	if (days > 0) parts.push(`${days} day${days === 1 ? "" : "s"}`);
	if (days > 0 || hours > 0)
		parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
	if (days > 0 || hours > 0 || minutes > 0)
		parts.push(`${padZeros(minutes, 2)} min${minutes === 1 ? "" : "s"}`);
	parts.push(`${padZeros(seconds, 2)} sec${seconds === 1 ? "" : "s"}`);

	return parts.join(" ");
}

function padZeros(num, places) {
	return String(num).padStart(places, "0");
}

function compress(input) {
	return LZString.compress(input);
}

function decompress(input) {
	return LZString.decompress(input);
}

function findWord(word, str) {
	if (ciEquals(word, `Test`) && ciEquals(str, `Test of High Sorcery`))
		return false;
	return RegExp("\\b" + word + "\\b", "i").test(str);
}

function ciEquals(a, b) {
	return typeof a === "string" && typeof b === "string" ?
			a.localeCompare(b, undefined, {sensitivity: "accent"}) === 0
		:	a === b;
}

function numSort(arr, reverse) {
	arr.sort((a, b) => (reverse ? b - a : a - b));
}

async function sleep(ms) {
	await new Promise((r) => setTimeout(r, ms));
}

function getUserAccounts() {
	if (localStorage.scAccounts == null) return {accounts: {}};
	return JSON.parse(localStorage.scAccounts);
}

function saveUserAccounts(accounts) {
	localStorage.scAccounts = JSON.stringify(accounts);
}

function addUserAccount(account) {
	const userAccounts = getUserAccounts();
	userAccounts.accounts[account.name] = account;
	userAccounts.current = account;
	saveUserAccounts(userAccounts);
}

function removeUserAccount(name) {
	const userAccounts = getUserAccounts();
	if (Object.keys(userAccounts.accounts).includes(name))
		delete userAccounts.accounts[name];
	if (userAccounts.current.name === name) {
		userAccounts.current = {};
		currAccount = undefined;
		settingsIconName.innerHTML = `&nbsp;`;
	}
	saveUserAccounts(userAccounts);
}

function createTimer(timeLength, timerName, eleName, endMsg, prefix, suffix) {
	if (timeLength <= 0) return;

	if (timerList[timerName]?.interval != null) {
		clearInterval(timerList[timerName].interval);
		delete timerList[timerName];
	}

	const timeAim = Date.now() + timeLength;

	const timeInterval = setInterval(() => {
		const ele = document.getElementById(eleName);
		const timerJson = timerList[timerName];

		if (!timerJson?.interval || timerJson.aim == null) {
			delete timerList[timerName];
			return;
		}
		if (ele === null) {
			clearInterval(timerJson.interval);
			delete timerList[timerName];
			return;
		}

		const remaining = timerJson.aim - Date.now();
		ele.innerHTML = `${prefix || ""}${getDisplayTime(remaining)}${suffix || ""}`;

		if (remaining < 0) {
			clearInterval(timerJson.interval);
			delete timerList[timerName];
			ele.outerHTML = endMsg || ``;
		}
	}, 1000);

	timerList[timerName] = {aim: timeAim, interval: timeInterval};
}

function clearTimers(prefix) {
	for (let name in timerList) {
		if (prefix == null || name.startsWith(prefix)) {
			if (timerList[name].interval != null) {
				clearInterval(timerList[name].interval);
				delete timerList[name];
			}
		}
	}
}

function getFirstLine(text) {
	let index = text.indexOf("\n");
	if (index === -1) index = undefined;
	return text.substring(0, index);
}

function getLocalSettings() {
	const strg = localStorage.getItem(lsSettings);
	if (strg) return JSON.parse(strg);
	return {};
}

function setLocalSetting(key, value) {
	const strg = getLocalSettings();
	strg[key] = value;
	localStorage.setItem(lsSettings, JSON.stringify(strg));
}

function deleteLocalSetting(key) {
	const strg = getLocalSettings();
	if (Object.prototype.hasOwnProperty.call(strg, key)) {
		delete strg[key];
		if (Object.keys(strg).length === 0) localStorage.removeItem(lsSettings);
		else localStorage.setItem(lsSettings, JSON.stringify(strg));
	}
}
