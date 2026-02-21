const vu = 1.002; // prettier-ignore
const u_LSKEY_updates = `scUpdatesSeen`;
const u_updatesContainer = `unseenUpdatesContainer`;
const u_FEATURE_UPDATES = new Map([
	[
		1,
		{
			id: 1,
			date: "2026-02-12",
			title: "Update Notifications",
			list: [
				"Tells you what's been updated when there's been a big change or addition.",
				"Why is it telling you about itself?",
				"... Because it can? 🤷‍♀️",
			],
		},
	],
	[
		2,
		{
			id: 2,
			date: "2026-02-21",
			title: "New Tab: Create Formations",
			list: [
				"Let's you build formations for any campaign/event.",
				"You can use this to build formations from scratch or modify existing ones.",
				"Right now you can save and load from browser storage - but you cannot delete from there yet.",
				"There will be bugs. This turned out way more complicated than I expected - and I expected complicated.",
				"Please do tell me if something doesn't work.",
			],
			tab: "createFormations",
		},
	],
]);
let u_currentUnseenUpdateIds = new Set([]);

function u_displayUnseenUpdates() {
	const allIds = [...u_FEATURE_UPDATES.keys()];
	const seenIds = u_getSeenUpdates();
	const unseenIds = allIds
		.filter((id) => !seenIds.has(id))
		.sort((a, b) => a - b);
	if (unseenIds.length === 0) return;

	u_currentUnseenUpdateIds = new Set(unseenIds);

	if (u_isNewUser()) {
		u_userConfirmSeenChanges();
		return;
	}

	const tabsContainer = document.getElementById(`tabsContainer`);
	if (!tabsContainer) return;

	const updatesHeader = document.createElement(`div`);
	updatesHeader.classList.add(u_updatesContainer);
	updatesHeader.id = u_updatesContainer;

	const plural = u_currentUnseenUpdateIds.size !== 1;

	let txt = `<div class="unseenUpdates"><span class="unseenUpdatesGrid">`;

	const updateBlurb = `Since your last visit there ha${plural ? `ve` : `s`} been ${plural ? `some` : `an`} update${plural ? `s` : ``}.`;
	const sCol = `1 / -1`;
	txt += u_addUpdateGridItems([
		{text: `Updates`, header: true, gridCol: sCol},
		{text: updateBlurb, gridCol: sCol},
	]);

	for (const unseenId of unseenIds) {
		const update = u_FEATURE_UPDATES.get(unseenId);
		if (update) {
			txt += u_buildUpdateGridItem(update);
			if (update?.tab != null) {
				let tab = document.querySelector(
					`label[for='${update.tab}Tab']`,
				);
				if (tab) tab.classList.add(`hasUnseenUpdate`);
			}
		}
	}

	txt += u_addUpdateGridItems([
		{
			text: u_buildMarkAsSeenButton(plural),
			classes: "f fr falc fje",
			gridCol: sCol,
		},
	]);
	txt += `</span></div>`;

	updatesHeader.innerHTML = txt;
	document.body.insertBefore(updatesHeader, tabsContainer);

	// display the unseen updates.
	// have an "ok" button call `u_userConfirmSeenChanges()`
}

function u_buildUpdateGridItem(update) {
	const {id, date, title, list} = update;
	if ((id ?? -1) < 0 || !date || !title || !list) return null;
	if (!u_currentUnseenUpdateIds.has(id)) return null;

	let txt = `<span class="f fc fals fjs p5 unseenUpdatesBlob">`;
	const header = u_addUpdateGridItems([
		{text: title, large: true},
		{text: dateFormat(new Date(date), {showTime: false})},
	]);
	txt += u_addUpdateGridItems([
		{
			text: header,
			classes: `f fr`,
			styles: `padding-bottom:5px;justify-content:space-between;width:100%;`,
		},
	]);
	if (list.length > 0) {
		let inner = `<ul>`;
		for (const lis of list) inner += `<li>${lis}</li>`;
		inner += `</ul>`;
		txt += u_addUpdateGridItems([{text: inner}]);
	}
	txt += `</span>`;
	return txt;
}

function u_addUpdateGridItems(columns) {
	let txt = ``;
	for (let column of columns) {
		let style =
			column.header ? `font-size:1.45em;`
			: column.large ? `font-size:1.15em;`
			: ``;
		if (column.styles != null) style += column.styles;
		if (column.hide) style += `display:none;`;
		if (column.gridCol != null) style += `grid-column:${column.gridCol};`;
		if (style !== ``) style = ` style="${style}"`;
		let id = column.id != null ? ` id="${column.id}"` : ``;
		let data = ``;
		if (column.data != null && typeof column.data === "object")
			for (let key in column.data)
				data += ` data-${key}="${column.data[key]}"`;
		const clazz = column.classes ? ` class="${column.classes}"` : ``;
		txt += `<span${clazz}${id}${data}${style}>${column.text || `&nbsp;`}</span>`;
	}
	return txt;
}

function u_buildMarkAsSeenButton(plural) {
	return (
		`<input type="button" style="width:max-content;color:var(--TangerineYellow);padding:2px;"` +
		` id="u_markUpdatesAsSeenButton" value="Mark Update${plural ? `s` : ``} as Seen" onclick="u_userConfirmSeenChanges()">`
	);
}

function u_userConfirmSeenChanges() {
	if (u_currentUnseenUpdateIds.size === 0) return;

	const currSeen = u_getSeenUpdates();
	for (let id of u_currentUnseenUpdateIds) currSeen.add(id);

	u_setSeenUpdates([...currSeen]);

	u_currentUnseenUpdateIds.clear();

	const container = document.getElementById(u_updatesContainer);
	if (container) container.remove();
}

function u_isNewUser() {
	return (
		currAccount == null ||
		currAccount.name == null ||
		currAccount.id == null ||
		currAccount.hash == null
	);
}

function u_getSeenUpdates() {
	return ls_getGlobal_set(u_LSKEY_updates, []);
}

function u_setSeenUpdates(ids) {
	ids.sort((a, b) => a - b);
	ls_setGlobal_arr(u_LSKEY_updates, ids);
}
