const v = 4.044; // prettier-ignore
const LSKEY_accounts = `scAccounts`;
const LSKEY_numFormat = `scNumberFormat`;
const LSKEY_pullButtonCooldown = "scPullCooldownEnd";
const globalButtonDisableTime = 15000;
const disabledUntilInit = document.getElementById(`disabledUntilInit`);
const disabledUntilData = document.getElementById(`disabledUntilData`);
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
const settingsNumberFormat = document.getElementById(`settingsNumberFormat`);
const supportUrl = document.getElementById(`supportUrl`);
const NF_GROUPS = {useGrouping: true, maximumFractionDigits: 2};
const TIME_UNITS = {
	long: {d: ["day", "days"], h: ["hour", "hours"], m: ["minute", "minutes"], s: ["second", "seconds"], ms: ["millisecond", "milliseconds"]},
	medium: {d: ["day", "days"], h: ["hr", "hrs"], m: ["min", "mins"], s: ["sec", "secs"], ms: ["ms", "ms"]},
	short: {d: ["d", "d"], h: ["h", "h"], m: ["m", "m"], s: ["s", "s"], ms: ["ms", "ms"]},
}; // prettier-ignore
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

	accountLoading();
	oldLocalStorageMigrations();

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
	ap_initApothecaryHideOptions();
	et_initEventTiersSettings();
	ss_initServerStatusSettings();

	resumePullButtonCooldown();
	ss_tryResumeCooldownOnLoad();

	swapTab();

	startUpdateCheckInterval(1800000); // 30 mins
}

function accountLoading() {
	const old_LSKEY = `scUserIdent`;
	if (ls_has(old_LSKEY)) {
		let userIdent = ls_getGlobal(old_LSKEY);
		settingsUserName.value = ``;
		settingsUserId.value = userIdent[0];
		settingsUserHash.value = userIdent[1];

		disabledUntilData.hidden = false;
		tabsContainer.hidden = true;
		settingsClose.hidden = true;
		currAccount = undefined;
		ls_remove(old_LSKEY);
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
}

function oldLocalStorageMigrations() {
	// Change old number formatting setting name to the new name:
	const oldSettingsKey = `scSettings`;
	if (ls_has(oldSettingsKey)) {
		if (!ls_has(LSKEY_numFormat)) {
			const oldFormat = ls_getGlobal(oldSettingsKey, {});
			ls_setGlobal_obj(LSKEY_numFormat, oldFormat);
		} else ls_remove(oldSettingsKey);
	}
	// Migrate dismantle hide options to account-specific.
	const distOpts = ls_getGlobal(dc_LSKEY_hideDismantleOpts, null);
	if (distOpts != null && Array.isArray(distOpts)) {
		if (distOpts.length === 0) {
			ls_remove(dc_LSKEY_hideDismantleOpts);
		} else {
			let accs = ls_getGlobal(LSKEY_accounts, null);
			if (accs != null) accs = Object.keys(accs?.accounts);
			if (Array.isArray(accs) && accs.length > 0) {
				const strg = {};
				for (let acc of accs) strg[acc] = distOpts;
				try {
					ls_setGlobal_obj(dc_LSKEY_hideDismantleOpts, strg);
				} catch {
					ls_remove(dc_LSKEY_hideDismantleOpts);
				}
			}
		}
	}
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
	const settings = ls_getGlobal(LSKEY_numFormat, {});
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
	if (code != null) ls_setGlobal_obj(LSKEY_numFormat, {nf: code});
	else ls_remove(LSKEY_numFormat);
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
	const userName = settingsUserName.value.trim() ?? ``;
	const userId = settingsUserId.value.trim() ?? ``;
	const userHash = settingsUserHash.value.trim() ?? ``;
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
		settingsSave.disabled = true;
		settingsSave.style.color = `#555`;
		settingsSave.style.backgroundColor = `hsl(calc(240*0.95),15%,calc(16%*0.8))`;
		setTimeout(function () {
			settingsSave.value = `Save`;
			settingsSave.disabled = false;
			settingsSave.style.color = ``;
			settingsSave.style.backgroundColor = ``;
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
	clearTimers(null, "mpb_");
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

function togglePullButtons(disable, customTimer) {
	if (!disable && (pbCodeRunning || pbTimerRunning)) return;
	if (customTimer == null || customTimer <= 0)
		customTimer = globalButtonDisableTime;

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
				prefix + getDisplayTime(customTimer - 1000) + suffix;
			createTimer(
				customTimer,
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
	pbCodeRunning = true;

	const cooldownEnd = Date.now() + globalButtonDisableTime;
	ls_setGlobal_num(LSKEY_pullButtonCooldown, cooldownEnd, 0);

	startPullButtonCooldown(globalButtonDisableTime);
}

function codeEnablePullButtons(skipCooldown) {
	pbCodeRunning = false;
	if (skipCooldown) {
		pbTimerRunning = false;
		pbTimerTimeout = null;
		ls_remove(LSKEY_pullButtonCooldown);
		clearTimers(`mpb_`);
	}
	togglePullButtons(false);
}

function resumePullButtonCooldown() {
	const cooldownEnd = Number(ls_getGlobal(LSKEY_pullButtonCooldown, 0));
	if (!cooldownEnd) return;

	const remaining = cooldownEnd - Date.now();
	startPullButtonCooldown(remaining);
}

function startPullButtonCooldown(remainingMs) {
	if (remainingMs <= 0) {
		ls_remove(LSKEY_pullButtonCooldown);
		return;
	}

	togglePullButtons(true, remainingMs);
	pbTimerRunning = true;

	if (pbTimerTimeout != null) clearTimeout(pbTimerTimeout);

	pbTimerTimeout = setTimeout(() => {
		pbTimerRunning = false;
		pbTimerTimeout = null;
		ls_remove(LSKEY_pullButtonCooldown);
		togglePullButtons(false);
	}, remainingMs);
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
	} else if (type === 5) {
		wrapper.className = `apothecaryDistillWrapper`;
		wrapper.style = ``;
	} else if (type === 6) {
		wrapper.className = `apothecaryBrewWrapper`;
		wrapper.style = ``;
	} else if (type === 7) {
		wrapper.className = `apothecaryEnhanceWrapper`;
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
	return Intl.DateTimeFormat("en-GB", {
		dateStyle: "long",
		timeStyle: "medium",
		hour12: false,
	}).format(input);
}

function getDisplayTime(timeMs, options = {}) {
	const {showMs = false, style = "medium"} = options;

	let ms = Math.max(0, Number(timeMs) || 0);

	const totalSeconds = Math.floor(ms / 1000);
	const milliseconds = ms % 1000;

	let seconds = totalSeconds % 60;
	let minutes = Math.floor(totalSeconds / 60) % 60;
	let hours = Math.floor(totalSeconds / 3600) % 24;
	let days = Math.floor(totalSeconds / 86400);

	if (style === "clock") {
		const totalHours = Math.floor(totalSeconds / 3600);
		const base =
			padZeros(totalHours, 2) +
			":" +
			padZeros(minutes, 2) +
			":" +
			padZeros(seconds, 2);

		return showMs ? base + "." + padZeros(milliseconds, 3) : base;
	}

	const u = TIME_UNITS[style] || TIME_UNITS.medium;
	const parts = [];

	if (days > 0) parts.push(`${days} ${days === 1 ? u.d[0] : u.d[1]}`);

	if (days > 0 || hours > 0)
		parts.push(`${hours} ${hours === 1 ? u.h[0] : u.h[1]}`);

	if (days > 0 || hours > 0 || minutes > 0)
		parts.push(
			`${padZeros(minutes, 2)} ${minutes === 1 ? u.m[0] : u.m[1]}`,
		);

	if (!showMs || days > 0 || hours > 0 || minutes > 0 || seconds > 0)
		parts.push(
			`${padZeros(seconds, 2)} ${seconds === 1 ? u.s[0] : u.s[1]}`,
		);

	if (showMs) parts.push(`${padZeros(milliseconds, 3)} ${u.ms[0]}`);

	return parts.join(" ");
}

function padZeros(num, places) {
	return String(num).padStart(places, "0");
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
	return ls_getGlobal(LSKEY_accounts, {});
}

function saveUserAccounts(accounts) {
	ls_setGlobal_obj(LSKEY_accounts, accounts);
}

function addUserAccount(account) {
	let userAccounts = getUserAccounts();

	if (!userAccounts || typeof userAccounts !== "object") userAccounts = {};

	if (!userAccounts.accounts || typeof userAccounts.accounts !== "object")
		userAccounts.accounts = {};

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

function createTimer(
	timeLength,
	timerName,
	eleName,
	endMsg,
	prefix,
	suffix,
	addTooltip,
) {
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
		const tooltipPrefix =
			addTooltip ? `<span class="timerTooltipHolder">` : ``;
		const tooltipTime =
			addTooltip ?
				`<span class="timerTooltip">${dateFormat(timeAim)}</span>`
			:	``;
		const tooltipSuffix = addTooltip ? `</span>` : ``;
		ele.innerHTML = `${prefix ?? ""}${tooltipPrefix}${getDisplayTime(remaining)}${tooltipTime}${tooltipSuffix}${suffix ?? ""}`;

		if (remaining < 0) {
			clearInterval(timerJson.interval);
			delete timerList[timerName];
			ele.outerHTML = endMsg ?? ``;
		}
	}, 1000);

	timerList[timerName] = {aim: timeAim, interval: timeInterval};
}

function clearTimers(prefix, excludePrefix) {
	for (let name in timerList) {
		if (excludePrefix && name.startsWith(excludePrefix)) continue;
		if (prefix == null || name.startsWith(prefix)) {
			if (timerList[name].interval != null) {
				clearInterval(timerList[name].interval);
				delete timerList[name];
			}
		}
	}
}

function capitalise(s) {
	if (s === `armor_based`) return `Armoured`;
	if (s === `hits_based`) return `Hits-Based`;
	return s && s[0].toUpperCase() + s.slice(1);
}

function arrayToListReadable(arr, options) {
	const {symbolAnd = false} = options;
	if (!Array.isArray(arr)) return ``;
	arr = arr.filter((v) => v != null && v !== ``);
	if (arr.length === 0) return ``;
	if (arr.length === 1) return arr[0];
	const and = symbolAnd ? ` & ` : ` and `;
	if (arr.length === 2) return arr[0] + and + arr[1];

	return arr.slice(0, -1).join(`, `) + and + arr[arr.length - 1];
}

function ls_has(key) {
	const v = localStorage.getItem(key);
	return v !== null && v !== "";
}

function ls_remove(key) {
	localStorage.removeItem(key);
}

function ls_getGlobal(key, defaultValue) {
	try {
		const raw = localStorage.getItem(key);
		if (raw == null) return defaultValue;
		return JSON.parse(raw);
	} catch {
		return defaultValue;
	}
}

function ls_getGlobal_set(key, defaultValue) {
	return new Set(ls_getGlobal(key, defaultValue));
}

function ls_setGlobal(key, value, isEmptyFn) {
	const isEmpty = isEmptyFn ? isEmptyFn(value) : value == null;

	if (isEmpty) localStorage.removeItem(key);
	else localStorage.setItem(key, JSON.stringify(value));
}

function ls_setGlobal_num(key, value, defaultValue) {
	const num = Number(value);
	ls_setGlobal(key, num, (v) => !Number.isFinite(v) || v === defaultValue);
}

function ls_setGlobal_bool(key, value, defaultValue) {
	const num = value ? 1 : 0;
	const def = defaultValue ? 1 : 0;

	ls_setGlobal(key, num, (v) => v === def);
}

function ls_setGlobal_arr(key, arr) {
	ls_setGlobal(key, arr, (v) => !Array.isArray(v) || v.length === 0);
}

function ls_setGlobal_obj(key, obj) {
	ls_setGlobal(
		key,
		obj,
		(v) => !v || typeof v !== "object" || Object.keys(v).length === 0,
	);
}

function ls_getPerAccount(key, defaultValue) {
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return defaultValue;

		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object") return defaultValue;

		const value = parsed[currAccount.name];
		return value ?? defaultValue;
	} catch {
		return defaultValue;
	}
}
function ls_getPerAccount_set(key, defaultValue) {
	return new Set(ls_getPerAccount(key, defaultValue));
}

function ls_setPerAccount(key, value, isEmptyFn) {
	let parsed = {};
	try {
		const raw = localStorage.getItem(key);
		if (raw) parsed = JSON.parse(raw) || {};
	} catch {
		parsed = {};
	}

	const isEmpty = isEmptyFn ? isEmptyFn(value) : value == null;

	if (isEmpty) {
		delete parsed[currAccount.name];
	} else {
		parsed[currAccount.name] = value;
	}

	if (Object.keys(parsed).length === 0) ls_remove(key);
	else localStorage.setItem(key, JSON.stringify(parsed));
}

function ls_setPerAccount_num(key, value, defaultValue) {
	const num = Number(value);
	ls_setPerAccount(
		key,
		num,
		(v) => !Number.isFinite(v) || v === defaultValue,
	);
}

function ls_setPerAccount_bool(key, value, defaultValue) {
	const num = value ? 1 : 0;
	const def = defaultValue ? 1 : 0;

	ls_setPerAccount(key, num, (v) => v === def);
}

function ls_setPerAccount_arr(key, arr) {
	ls_setPerAccount(key, arr, (v) => !Array.isArray(v) || v.length === 0);
}

function ls_setPerAccount_obj(key, obj) {
	ls_setPerAccount(
		key,
		obj,
		(v) => !v || typeof v !== "object" || Object.keys(v).length === 0,
	);
}
