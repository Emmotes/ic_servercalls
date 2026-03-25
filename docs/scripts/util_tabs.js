const vt = 1.001; // prettier-ignore

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

	t_currentTabs.forEach((tab, index) => {
		if (!t_editMode && !tab.visible) return;

		const isChecked = index === 0 && !t_editMode;
		const tabClass =
			t_editMode ?
				`t_tabsLabel ${!tab.visible ? " t_hiddenTab" : ""}`
			:	"tabsLabel";

		let contentHtml = "";

		switch (tab.id) {
			case "deleteFormationsTab":
				contentHtml = df_tab();
				break;
			case "createFormationsTab":
				contentHtml = cf_tab();
				break;
			case "featsTab":
				contentHtml = bf_tab();
				break;
			case "buyChestsTab":
				contentHtml = bc_tab();
				break;
			case "openChestsTab":
				contentHtml = oc_tab();
				break;
			case "bscTab":
				contentHtml = bs_tab();
				break;
			case "favourTab":
				contentHtml = fc_tab();
				break;
			case "apothecaryTab":
				contentHtml = ap_tab();
				break;
			case "trialsTab":
				contentHtml = tm_tab();
				break;
			case "legendariesTab":
				contentHtml = lf_tab();
				break;
			case "eventTiersTab":
				contentHtml = et_tab();
				break;
			case "ilvlreportTab":
				contentHtml = ir_tab();
				break;
			case "shiniesTab":
				contentHtml = sc_tab();
				break;
			case "partyTab":
				contentHtml = pm_tab();
				break;
			case "dismantleTab":
				contentHtml = dc_tab();
				break;
			case "celebrationsTab":
				contentHtml = cc_tab();
				break;
			case "aeonTab":
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
