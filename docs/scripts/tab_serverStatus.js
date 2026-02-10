const vss = 2.008; // prettier-ignore
const ss_LSKEY_serverStatusCooldown = `scServerStatusCooldown`;
const ss_LSKEY_showMoreDetails = `scServerStatusShowMoreDetails`;
const ss_SVG_up = `<svg width="22" height="22" viewBox="1.5 -9.1 14 14" xmlns="http://www.w3.org/2000/svg" fill="var(--AlienArmpit)" stroke="var(--Black)" stroke-width=".4"><path fill-rule="evenodd" d="m14.75-5.338a1 1 0 0 0-1.5-1.324l-6.435 7.28-3.183-2.593a1 1 0 0 0-1.264 1.55l3.929 3.2a1 1 0 0 0 1.38-.113l7.072-8z"/></svg>`;
const ss_SVG_down = `<svg width="22" height="22" viewBox="1 1 34 34" xmlns="http://www.w3.org/2000/svg" stroke="var(--Black)" stroke-width=".8"><path fill="var(--CarminePink)" d="M21.533 18.002 33.768 5.768a2.5 2.5 0 0 0-3.535-3.535L17.998 14.467 5.764 2.233a2.5 2.5 0 0 0-3.535 0 2.5 2.5 0 0 0 0 3.535l12.234 12.234L2.201 30.265a2.498 2.498 0 0 0 1.768 4.267c.64 0 1.28-.244 1.768-.732l12.262-12.263 12.234 12.234a2.5 2.5 0 0 0 1.768.732 2.5 2.5 0 0 0 1.768-4.267z"/></svg>`;
const ss_SVG_slow = `<svg width="22" height="22" xmlns="http://www.w3.org/2000/svg" stroke="var(--Black)" stroke-width=".6" fill="var(--Saffron)"><rect height="4" rx="1.5" ry="1.5" width="21" x=".5" y="9"></rect></svg>`;
const ss_SLOW_THRESHOLD_MS = 3 * 1000; // 3 seconds
const ss_MIN_RECHECK_MS = 30 * 1000; // 30 seconds
const ss_CACHE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const ss_CACHE_GRACE_MS = 60 * 1000; // 60 seconds
const ss_TIMEOUT_MS = 15 * 1000; // 15 seconds
let ss_ageTimer = null;
let ss_recheckTimer = null;

async function ss_pullServerStatusData() {
	ss_setCooldownUntil(Date.now() + ss_MIN_RECHECK_MS);
	const wrapper = document.getElementById(`serverStatusWrapper`);
	setFormsWrapperFormat(wrapper, 0);
	wrapper.innerHTML = `Waiting for server status...`;
	try {
		const statusData = await getServerStatus();
		await ss_displayServerStatusData(wrapper, statusData);
	} catch (error) {
		setFormsWrapperFormat(wrapper, 0);
		handleError(wrapper, error);
	}
}

async function ss_displayServerStatusData(wrapper, statusData) {
	const results =
		Array.isArray(statusData?.results) ? statusData.results : [];

	results.sort((a, b) => ss_compare(a.server, b.server));

	let txt = ``;
	let paddingStyle = ss_decidePadding(true, true);

	const sFlex = `f fr falc fjs`;
	const cFlex = `f fr falc fjc`;
	const eFlex = `f fr falc fje`;
	const sssrt = {sssrt: `1`};
	const sCol = `1 / -1`;

	const lastChecked =
		`Servers were last checked ` +
		ss_buildTimestampSpan(statusData?.checkedAt || "", paddingStyle) +
		` ago.`;
	const blurbRows = [{text: lastChecked, classes: sFlex, gridCol: sCol}];
	if (statusData?.checkedDurationMs > 0) {
		const lastCheckedDur =
			`It took ` +
			getDisplayTime(statusData?.checkedDurationMs, {showMs: true}) +
			` to complete the process.`;
		blurbRows.push({
			text: lastCheckedDur,
			classes: sFlex,
			styles: `padding-left:20px;`,
			dim: true,
			small: true,
			gridCol: sCol,
			data: sssrt,
		});
	}
	const pruned = statusData?.pruned || [];
	if (Array.isArray(pruned) && pruned.length > 0) {
		let msg = arrayToListReadable(pruned, {symbolAnd: false});
		if (msg !== ``) {
			const plural = msg.includes(` and `);
			const prefix =
				`Th${plural ? `ese` : `is`} server${plural ? `s` : ``} ha${plural ? `ve` : `s`}n't ` +
				`been seen alive for 24 hours and ha${plural ? `ve` : `s`} been culled from the list:`;
			blurbRows.push({
				text: prefix,
				classes: sFlex,
				styles: `padding-left:20px;`,
				dim: true,
				small: true,
				gridCol: sCol,
				data: sssrt,
			});
			blurbRows.push({
				text: msg,
				classes: sFlex,
				styles: `padding-left:40px;`,
				dim: true,
				small: true,
				gridCol: sCol,
				data: sssrt,
			});
		}
	}

	txt += ss_addServerStatusRow(blurbRows);

	txt += ss_addSingleServerStatusRow("&nbsp;");

	txt += ss_addServerStatusRow([
		{text: `Server`, classes: eFlex, header: true},
		{text: `Status`, classes: cFlex, header: true},
		{
			text: `Response Times`,
			classes: cFlex,
			header: true,
			gridCol: `span 2`,
			data: sssrt,
		},
		{text: `Pointed At`, classes: sFlex, header: true, data: sssrt},
		{text: `&nbsp;`, classes: sFlex, header: true, dim: true},
	]);

	for (const r of results) {
		const slowResponse = r.responseTimeMs >= ss_SLOW_THRESHOLD_MS;
		const alive =
			r.up ?
				slowResponse ? ss_SVG_slow
				:	ss_SVG_up
			:	ss_SVG_down;

		const isServerDown = !r.up && r.lastSeenUp;
		const lastUp =
			!isServerDown && slowResponse ? `Slow`
			: isServerDown ?
				`Down (last seen up ${ss_buildTimestampSpan(r.lastSeenUp, paddingStyle)} ago)`
			:	`&nbsp;`;

		txt += ss_addServerStatusRow([
			{text: r.server + `:`, classes: eFlex},
			{text: alive, classes: cFlex},
			{
				text: getDisplayTime(r.responseTimeMs, {showMs: true}),
				classes: eFlex,
				data: sssrt,
			},
			{text: `&nbsp;`, data: sssrt},
			{
				text: r?.pointedTo || `Unknown`,
				classes: sFlex,
				data: sssrt,
				styles: `padding-left:20px;`,
			},
			{text: lastUp, classes: eFlex, dim: lastUp !== `&nbsp;`},
		]);
	}

	style = ss_decidePadding(false, true);
	const slowTxt = nf(ss_SLOW_THRESHOLD_MS / 1000) + ` seconds`;
	const downTxt =
		nf((results.timeoutMs || ss_TIMEOUT_MS) / 1000) + ` seconds`;

	const keys = [
		`&nbsp;`,
		`<b>Key:</b>`,
		`${ss_buildSVGSpan(ss_SVG_up, style)} Healthy servers took less than ${slowTxt} to respond.`,
		`${ss_buildSVGSpan(ss_SVG_slow, style)} Slow servers took ${slowTxt} or longer to respond.`,
		`${ss_buildSVGSpan(ss_SVG_down, style)} Down servers did not respond within ${downTxt}.`,
	];
	for (const k of keys) txt += ss_addSingleServerStatusRow(k);

	setFormsWrapperFormat(wrapper, 4);
	wrapper.innerHTML = txt;
	ss_toggleShowMoreDetails();
	ss_startAgeTicker(wrapper);
	ss_applyCooldownFromStatus(statusData);
}

function ss_decidePadding(padLeft, padRight) {
	let style = ``;
	if (padLeft) style += `padding-left:4px;`;
	if (padRight) style += `padding-right:4px;`;
	if (style) style = ` style="${style}"`;
	return style;
}

function ss_buildTimestampSpan(timer, style) {
	return `<span data-ss-age-iso="${timer}"${style}>-</span>`;
}

function ss_buildSVGSpan(svg, style) {
	svg = svg.replaceAll(/(width|height)="22"/gm, `$1="18"`);
	return `<span${style}>${svg}</span>`;
}

function ss_compare(a, b) {
	if (a === "master") return -1;
	if (b === "master") return 1;
	const an = Number(a.replace(/\D/g, "") || 0);
	const bn = Number(b.replace(/\D/g, "") || 0);
	return an - bn;
}

function ss_addServerStatusRow(columns) {
	let txt = ``;
	for (let column of columns) {
		let style =
			column.header ? `font-size:1.2em;`
			: column.large ? `font-size:1.1em;`
			: column.small ? `font-size:0.9em;`
			: ``;
		if (column.dim != null) style += `opacity:0.85;`;
		if (column.styles != null) style += column.styles;
		if (column.hide) style += `display:none;`;
		if (column.gridCol != null) style += `grid-column:${column.gridCol};`;
		if (style !== ``) style = ` style="${style}"`;
		let id = column.id != null ? ` id="${column.id}"` : ``;
		let data = ``;
		if (column.data != null && typeof column.data === "object")
			for (let key in column.data)
				data += ` data-${key}="${column.data[key]}"`;
		txt += `<span class="${column.classes || `f fr falc fjc`}"${id}${data}${style}>${column.text || `&nbsp;`}</span>`;
	}
	return txt;
}

function ss_addSingleServerStatusRow(msg) {
	return `<span class="f falc fjs" style="grid-column:1 / -1">${msg}</span>`;
}

function ss_getAgeMs(isoString, nowMs) {
	if (!isoString) return null;
	const t = Date.parse(isoString);
	if (!Number.isFinite(t)) return null;
	return Math.max(0, nowMs - t);
}

function ss_startAgeTicker(wrapper) {
	if (ss_ageTimer) clearInterval(ss_ageTimer);

	const update = () => {
		const nowMs = Date.now();
		const nodes = wrapper.querySelectorAll(`[data-ss-age-iso]`);
		for (const n of nodes) {
			const iso = n.getAttribute(`data-ss-age-iso`);
			const ageMs = ss_getAgeMs(iso, nowMs);
			n.textContent = ageMs === null ? `-` : getDisplayTime(ageMs);
		}
	};

	update();
	ss_ageTimer = setInterval(update, 1000);
}

function ss_setCooldownUntil(untilMs) {
	const btn = document.getElementById(`checkServerStatusButton`);
	const disabled = document.getElementById(`checkServerStatusButtonDisabled`);

	if (!btn || !disabled) return;

	try {
		ls_setGlobal_num(ss_LSKEY_serverStatusCooldown, untilMs);
	} catch {
		// Do nothing.
	}

	btn.hidden = true;
	btn.disabled = true;
	disabled.hidden = false;
	btn.classList.add(`greyButton`);
	disabled.classList.add(`fgr`);

	if (ss_recheckTimer) clearInterval(ss_recheckTimer);

	const update = () => {
		const nowMs = Date.now();
		const remainingMs = Math.max(0, untilMs - nowMs);

		if (remainingMs <= 0) {
			if (ss_recheckTimer) clearInterval(ss_recheckTimer);
			ss_recheckTimer = null;
			disabled.hidden = true;
			disabled.innerHTML = `&nbsp;`;
			disabled.classList.remove(`fgr`);
			btn.hidden = false;
			btn.classList.remove(`greyButton`);
			btn.disabled = false;
			try {
				ls_remove(ss_LSKEY_serverStatusCooldown);
			} catch {
				// Do nothing.
			}
			return;
		}

		const fakePastIso = new Date(nowMs - remainingMs).toISOString();
		const ageMs = ss_getAgeMs(fakePastIso, nowMs);
		const countdown = getDisplayTime(ageMs);

		disabled.textContent = `Next update in ${countdown}.`;
	};

	update();
	ss_recheckTimer = setInterval(update, 1000);
}

function ss_applyCooldownFromStatus(statusData) {
	const nowMs = Date.now();

	const checkedAtMs =
		statusData?.checkedAt ? Date.parse(statusData.checkedAt) : NaN;

	const minBlockUntil = nowMs + ss_MIN_RECHECK_MS;

	if (!Number.isFinite(checkedAtMs)) {
		ss_setCooldownUntil(minBlockUntil);
		return;
	}

	const cacheLikelyNewAt =
		checkedAtMs + ss_CACHE_INTERVAL_MS + ss_CACHE_GRACE_MS;
	const blockUntil = Math.max(minBlockUntil, cacheLikelyNewAt);

	ss_setCooldownUntil(blockUntil);
}

function ss_tryResumeCooldownOnLoad() {
	try {
		const until = Number(ls_getGlobal(ss_LSKEY_serverStatusCooldown, 0));
		if (until && until > Date.now()) ss_setCooldownUntil(until);
	} catch {
		// Do nothing.
	}
}

function ss_toggleShowMoreDetails(checked) {
	if (checked == null) checked = ss_getShowMoreDetails();
	else ss_setShowMoreDetails(checked);

	const wrapper = document.getElementById(`serverStatusWrapper`);
	if (wrapper == null) return;

	checked ?
		wrapper.classList.add(`serverStatusResponseColumn`)
	:	wrapper.classList.remove(`serverStatusResponseColumn`);

	const eles = document.querySelectorAll(`#serverStatusWrapper [data-sssrt]`);
	for (let ele of eles) ele.style.display = checked ? `` : `none`;
}

function ss_initServerStatusSettings() {
	const responseTimesEle = document.getElementById(
		`serverStatusShowMoreDetails`,
	);
	if (responseTimesEle) responseTimesEle.checked = ss_getShowMoreDetails();
}

function ss_getShowMoreDetails() {
	return ls_getGlobal(ss_LSKEY_showMoreDetails, false) === 1;
}

function ss_setShowMoreDetails(show) {
	return ls_setGlobal_bool(ss_LSKEY_showMoreDetails, show, false);
}
