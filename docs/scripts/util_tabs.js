const vt = 1.100; // prettier-ignore

const t_DEFAULT_TABS = [
	{id: "deleteFormationsTab", name: "Delete Formations", visible: true},
	{id: "createFormationsTab", name: "Create Formations", visible: true},
	{id: "featsTab", name: "Buy Feats", visible: true},
	{id: "buyChestsTab", name: "Buy Chests", visible: true},
	{id: "openChestsTab", name: "Open Chests", visible: true},
	{id: "bscTab", name: "Blacksmiths", visible: true},
	{id: "favourTab", name: "Favour", visible: true},
	{id: "apothecaryTab", name: "Apothecary", visible: true},
	{id: "trialsTab", name: "Trials", visible: true},
	{id: "legendariesTab", name: "Legendaries", visible: true},
	{id: "eventTiersTab", name: "Event Tiers", visible: true},
	{id: "ilvlreportTab", name: "iLvl Report", visible: true},
	{id: "shiniesTab", name: "Shinies Calculator", visible: true},
	{id: "partyTab", name: "Parties", visible: true},
	{id: "dismantleTab", name: "Dismantle", visible: true},
	{id: "celebrationsTab", name: "Celebrations", visible: true},
	{id: "aeonTab", name: "Aeon", visible: true},
	{id: "serverStatusTab", name: "Server Status", visible: true},
];

const t_LSKEY_tabOrder = "scTabOrder";
const t_LSKEY_tabVisibility = "scTabVisibility";

let t_editMode = false;
let t_currentTabs = [];

const t_tabsServerCalls = new Set();
const t_tabsDefinitionsFilters = new Set();

function t_initTabs() {
	t_loadTabSettings();
	t_generateTabHTML();
	t_updateEditModeUI();
}

function t_loadTabSettings() {
	const order = ls_getPerAccount(t_LSKEY_tabOrder, null);
	const visibility = ls_getPerAccount(t_LSKEY_tabVisibility, null);

	t_editMode = false;

	let tabs = [];

	if (order && Array.isArray(order) && order.length > 0) {
		tabs = order
			.map((tabId) => {
				const defaultTab = t_DEFAULT_TABS.find((t) => t.id === tabId);
				return defaultTab ? {...defaultTab} : null;
			})
			.filter(Boolean);

		const tabIds = tabs.map((t) => t.id);
		const newTabs = t_DEFAULT_TABS.filter((t) => !tabIds.includes(t.id));
		tabs = tabs.concat(newTabs);
	} else tabs = t_DEFAULT_TABS.map((tab) => ({...tab}));

	if (visibility && typeof visibility === "object") {
		tabs.forEach((tab) => {
			if (visibility[tab.id] !== undefined)
				tab.visible = visibility[tab.id];
		});
	}

	t_currentTabs = tabs;
}

function t_saveTabSettings() {
	const order = t_currentTabs.map((tab) => tab.id);
	const visibility = {};
	t_currentTabs.forEach((tab) => {
		visibility[tab.id] = tab.visible;
	});

	ls_setPerAccount(t_LSKEY_tabOrder, order, (v) => {
		if (!Array.isArray(v) || v.length !== t_DEFAULT_TABS.length)
			return true;
		const defaultOrder = t_DEFAULT_TABS.map((tab) => tab.id);
		return JSON.stringify(v) === JSON.stringify(defaultOrder);
	});

	ls_setPerAccount(t_LSKEY_tabVisibility, visibility, (v) => {
		if (typeof v !== "object" || v === null) return true;
		return Object.values(v).every((visible) => visible === true);
	});
}

function t_generateTabHTML() {
	const tabsContainer = document.querySelector(".tabs");
	if (!tabsContainer) return;

	tabsContainer.innerHTML = "";

	if (!t_editMode && t_currentTabs.every((e) => !e.visible)) {
		tabsContainer.innerHTML = addHTMLElement({
			text: `<img src="images/w.png"><br>Seriously?`,
			classes: `f fc falc fjc w100`,
			styles: `text-align:center;`,
		});
	}

	t_tabsServerCalls.clear();
	t_tabsDefinitionsFilters.clear();
	let firstVisibleChecked = false;
	t_currentTabs.forEach((tab) => {
		if (!t_editMode && !tab.visible) return;

		let isChecked = false;
		if (!t_editMode && !firstVisibleChecked) {
			isChecked = true;
			firstVisibleChecked = true;
		}
		const tabClass =
			t_editMode ?
				`t_tabsLabel ${!tab.visible ? " t_hiddenTab" : ""}`
			:	"tabsLabel";

		let contentHtml = "";

		switch (tab.id) {
			case "deleteFormationsTab":
				df_registerData();
				contentHtml = df_tab();
				break;
			case "createFormationsTab":
				cf_registerData();
				contentHtml = cf_tab();
				break;
			case "featsTab":
				bf_registerData();
				contentHtml = bf_tab();
				break;
			case "buyChestsTab":
				bc_registerData();
				contentHtml = bc_tab();
				break;
			case "openChestsTab":
				oc_registerData();
				contentHtml = oc_tab();
				break;
			case "bscTab":
				bs_registerData();
				contentHtml = bs_tab();
				break;
			case "favourTab":
				fc_registerData();
				contentHtml = fc_tab();
				break;
			case "apothecaryTab":
				ap_registerData();
				contentHtml = ap_tab();
				break;
			case "trialsTab":
				tm_registerData();
				contentHtml = tm_tab();
				break;
			case "legendariesTab":
				lf_registerData();
				contentHtml = lf_tab();
				break;
			case "eventTiersTab":
				et_registerData();
				contentHtml = et_tab();
				break;
			case "ilvlreportTab":
				ir_registerData();
				contentHtml = ir_tab();
				break;
			case "shiniesTab":
				sc_registerData();
				contentHtml = sc_tab();
				break;
			case "partyTab":
				pm_registerData();
				contentHtml = pm_tab();
				break;
			case "dismantleTab":
				dc_registerData();
				contentHtml = dc_tab();
				break;
			case "celebrationsTab":
				cc_registerData();
				contentHtml = cc_tab();
				break;
			case "aeonTab":
				ad_registerData();
				contentHtml = ad_tab();
				break;
			case "serverStatusTab":
				contentHtml = ss_tab();
				break;
			default:
				contentHtml = `<div>Tab content not implemented</div>`;
		}

		let html = `
			<input${!t_editMode ? ` onClick="setHash('${tab.id}')"` : ``} type="radio" class="tabsRadio" name="serverTabs" id="${tab.id}" ${isChecked ? "checked" : ""}>
			<label for="${tab.id}" class="${tabClass}" ${t_editMode ? `draggable="true" ondragstart="t_onDragStart(event, '${tab.id}')" ondragover="t_onDragOver(event)" ondrop="t_onDrop(event, '${tab.id}')"` : ""}>
				${t_editMode ? `<span class="t_dragHandle">⋮⋮</span>` : ""}
				<span>${tab.name}</span>
				${t_editMode ? `<button class="t_hideButton" onclick="t_toggleTabVisibility('${tab.id}')" title="${tab.visible ? "Hide tab" : "Show tab"}">${tab.visible ? "✔️" : "❌"}</button>` : ""}
			</label>
			<div class="tabsContent">
				${contentHtml}
			</div>
		`;

		tabsContainer.innerHTML += html;
	});
}

function t_toggleEditMode() {
	t_editMode = !t_editMode;
	t_saveTabSettings();
	t_generateTabHTML();
	t_updateEditModeUI();
	if (!t_editMode) init();
}

function t_updateEditModeUI() {
	const btn = document.getElementById("tabsEditModeButton");
	if (btn) {
		btn.value = ` ${t_editMode ? `Disable` : `Enable`} Tab Edit Mode `;
		const container = document.getElementById(
			`tabsEditModeButtonContainer`,
		);
		if (container) {
			if (t_editMode) container.classList.add(`yellowButton`);
			else container.classList.remove(`yellowButton`);
		}
	}
}

function t_toggleTabVisibility(tabId) {
	const tab = t_currentTabs.find((t) => t.id === tabId);
	if (tab) {
		tab.visible = !tab.visible;
		t_saveTabSettings();
		t_generateTabHTML();
	}
}

function t_onDragStart(event, tabId) {
	event.dataTransfer.setData("text/plain", tabId);
	event.dataTransfer.effectAllowed = "move";
}

function t_onDragOver(event) {
	event.preventDefault();
	event.dataTransfer.dropEffect = "move";
}

function t_onDrop(event, targetTabId) {
	event.preventDefault();

	const draggedTabId = event.dataTransfer.getData("text/plain");
	if (draggedTabId === targetTabId) return;

	const draggedIndex = t_currentTabs.findIndex((t) => t.id === draggedTabId);
	const targetIndex = t_currentTabs.findIndex((t) => t.id === targetTabId);

	if (draggedIndex !== -1 && targetIndex !== -1) {
		const [draggedTab] = t_currentTabs.splice(draggedIndex, 1);
		t_currentTabs.splice(targetIndex, 0, draggedTab);

		t_saveTabSettings();
		t_generateTabHTML();
	}
}

function t_onAccountSwitch() {
	t_loadTabSettings();
	t_generateTabHTML();
	t_updateEditModeUI();
}

function t_restoreDefaultLayout() {
	ls_setPerAccount_arr(t_LSKEY_tabOrder, []);
	ls_setPerAccount_arr(t_LSKEY_tabVisibility, []);
	closeRestoreDefaultTabsConfirmationPopup();
	init();
}

// Map of tab IDs to their pull function calls (factory pattern)
function getTabPullFunctions(data) {
	return {
		aeonTab: () => ad_pullAeonData(data.patronDetails),
		apothecaryTab: () => ap_pullApothecaryData(data.userDetails, data.definitions),
		bscTab: () => bs_pullBSCData(data.userDetails, data.definitions),
		buyChestsTab: () => bc_pullBuyChestsData(data.userDetails, data.shopData, data.dismantleData, data.definitions),
		featsTab: () => bf_pullFeatsData(data.userDetails, data.definitions),
		celebrationsTab: () => cc_pullCelebrationsData(data.userDetails),
		createFormationsTab: () => cf_pullFormationSaves(data.userDetails, data.formationSaves, data.definitions),
		deleteFormationsTab: () => df_pullFormationSaves(data.formationSaves),
		dismantleTab: () => dc_pullData(data.dismantleData, data.userDetails, data.definitions),
		eventTiersTab: () => et_pullEventTiersData(data.userDetails, data.completionData, data.definitions),
		favourTab: () => fc_pullFavourData(data.userDetails),
		ilvlreportTab: () => ir_pulliLvlReportData(data.userDetails, data.definitions),
		legendariesTab: () => lf_pullData(data.userDetails, data.definitions),
		openChestsTab: () => oc_pullOpenChestsData(data.userDetails, data.definitions),
		partyTab: () => pm_pullPartyData(data.userDetails, data.definitions),
		shiniesTab: () => sc_pullShiniesData(data.userDetails),
		trialsTab: () => tm_pullData(false, data.trialsRefresh, data.definitions),
	}; // prettier-ignore
}

async function pullAllTabsData() {
	if (isBadUserData()) return;
	disablePullButtons(globalButtonDisableTimeAllTabs);

	const statusText = document.getElementById("allTabsDataPullButtonStatus");

	try {
		// Initialize data variables
		let userDetails;
		let definitions;
		let patronDetails;
		let formationSaves;
		let dismantleData;
		let shopData;
		let completionData;
		let trialsRefresh;

		// Fetch server data sequentially only if tabs need it
		if (t_tabsServerCalls.has("getUserDetails")) {
			statusText.innerHTML = `Waiting for user data...`;
			userDetails = await getUserDetails();
			await sleep(200);
		}

		if (t_tabsServerCalls.has("getDefinitions")) {
			statusText.innerHTML = `Waiting for definitions...`;
			definitions = await getDefinitions(
				filtersFromSet(t_tabsDefinitionsFilters),
			);
			await sleep(200);
		}

		if (t_tabsServerCalls.has("getPatronDetails")) {
			statusText.innerHTML = `Waiting for patron data...`;
			patronDetails = await getPatronDetails();
			await sleep(200);
		}

		if (t_tabsServerCalls.has("getFormationSaves")) {
			statusText.innerHTML = `Waiting for formation saves data...`;
			formationSaves = await getFormationSaves();
			await sleep(200);
		}

		if (t_tabsServerCalls.has("getDismantleData")) {
			statusText.innerHTML = `Waiting for dismantle data...`;
			dismantleData = await getDismantleData();
			await sleep(200);
		}

		if (t_tabsServerCalls.has("getShop")) {
			statusText.innerHTML = `Waiting for shop data...`;
			shopData = await getShop();
			await sleep(200);
		}

		if (t_tabsServerCalls.has("getCompletionData")) {
			statusText.innerHTML = `Waiting for collections data...`;
			completionData = await getCompletionData();
			await sleep(200);
		}

		if (t_tabsServerCalls.has("trialsRefreshData")) {
			statusText.innerHTML = `Waiting for trials data...`;
			trialsRefresh = await trialsRefreshData();
			await sleep(200);
		}

		statusText.innerHTML = `Processing data...`;
		const dataPackage = {
			userDetails,
			definitions,
			patronDetails,
			formationSaves,
			dismantleData,
			shopData,
			completionData,
			trialsRefresh,
		};
		const pullFunctions = getTabPullFunctions(dataPackage);
		const pullPromises = t_currentTabs
			.filter((tab) => tab.visible)
			.map((tab) => pullFunctions[tab.id]?.())
			.filter((promise) => promise != null);

		await Promise.all(pullPromises);

		statusText.innerHTML = `Done.`;
		setTimeout(() => {
			if (statusText) statusText.innerHTML = `&nbsp;`;
		}, 5000);

		codeEnablePullButtons();
	} catch (error) {
		statusText.innerHTML = "Error pulling all tabs data: " + error.message;
		codeEnablePullButtons();
	}
}
