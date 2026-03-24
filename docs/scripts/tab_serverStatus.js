const vss = 2.020; // prettier-ignore
const ss_LSKEY_serverStatusCooldown = `scServerStatusCooldown`;
const ss_LSKEY_serverStatusData = `scServerStatusData`;
const ss_LSKEY_showMoreDetails = `scServerStatusShowMoreDetails`;
const ss_SVG_up = `<svg width="22" height="22" viewBox="1.5 -9.1 14 14" xmlns="http://www.w3.org/2000/svg" fill="var(--AlienArmpit)" stroke="var(--Black)" stroke-width=".4"><path fill-rule="evenodd" d="m14.75-5.338a1 1 0 0 0-1.5-1.324l-6.435 7.28-3.183-2.593a1 1 0 0 0-1.264 1.55l3.929 3.2a1 1 0 0 0 1.38-.113l7.072-8z"/></svg>`;
const ss_SVG_down = `<svg width="22" height="22" viewBox="1 1 34 34" xmlns="http://www.w3.org/2000/svg" stroke="var(--Black)" stroke-width=".8"><path fill="var(--CarminePink)" d="M21.533 18.002 33.768 5.768a2.5 2.5 0 0 0-3.535-3.535L17.998 14.467 5.764 2.233a2.5 2.5 0 0 0-3.535 0 2.5 2.5 0 0 0 0 3.535l12.234 12.234L2.201 30.265a2.498 2.498 0 0 0 1.768 4.267c.64 0 1.28-.244 1.768-.732l12.262-12.263 12.234 12.234a2.5 2.5 0 0 0 1.768.732 2.5 2.5 0 0 0 1.768-4.267z"/></svg>`;
const ss_SVG_slow = `<svg width="22" height="22" xmlns="http://www.w3.org/2000/svg" stroke="var(--Black)" stroke-width=".6" fill="var(--TangerineYellow)"><rect height="4" rx="1.5" ry="1.5" width="21" x=".5" y="9"></rect></svg>`;
const ss_SVG_verySlow = ss_SVG_slow.replace("TangerineYellow", "Carrot");
const ss_SLOW_THRESHOLD_MS = 1.5 * 1000; // 1.5 seconds
const ss_VERYSLOW_THRESHOLD_MS = 3 * 1000; // 3 seconds
const ss_MIN_RECHECK_MS = 30 * 1000; // 30 seconds
const ss_CACHE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const ss_CACHE_GRACE_MS = 60 * 1000; // 60 seconds
const ss_TIMEOUT_MS = 15 * 1000; // 15 seconds
let ss_ageTimer = null;
let ss_recheckTimer = null;

function ss_tab() {
	return `
					<span class="f fr w100 p5">
						<span class="f falc fjs ml2" style="width:100%">
							<h1>Server Status</h1>
						</span>
					</span>
					<span class="f fr w100 p5">
						<span class="f fc fals fjs ml2" style="width:100%;position:relative">
							<p>Press the button to load the latest cached server status.</p>
							<p><em>Note: The cache is only updated approximately once every 5 minutes.</em></p>
							<span class="f fc falc" style="position:absolute;top:-85px;font-size:0.85em;right:0;z-index:1">
								<span class="f fr falc">
									<input type="checkbox" id="serverStatusShowMoreDetails" onclick="ss_toggleShowMoreDetails(this.checked)"> Show More Details
								</span>
								<span class="f fc falc" style="text-align:center">
									<span class="f fr falc" style="font-size:0.8em;align-items:center;text-align:center">
										<span><em>Note: Response times are measured from my<br>server running the status checks so won't be<br>representative of your connection.</em></span>
									</span>
								</span>
							</span>
						</span>
					</span>
					<span class="f fr w100 p5">
						&nbsp;
					</span>
					<span class="f fr w100 p5" style="height:34px;">
						<span class="f falc fje mr2" style="width:50%;">
							<input type="button" onClick="ss_pullServerStatusData()" name="checkServerStatusButton" id="checkServerStatusButton" value="Check Server Status" style="min-width:175px">
							<span id="checkServerStatusButtonDisabled" class="f fjc" style="font-size:0.9em" hidden>&nbsp;</span>
						</span>
					</span>
					<span class="f fr w100 p5">
						&nbsp;
					</span>
					<span class="f falc fje mr2" style="flex-direction:column" id="serverStatusWrapper">
						&nbsp;
					</span>
					<span class="f fr w100 p5">
						&nbsp;
					</span>
					<span class="f fr w100 p5">
						&nbsp;
					</span>
				`;
}

async function ss_pullServerStatusData() {
	ss_setCooldownUntil(Date.now() + ss_MIN_RECHECK_MS);
	const wrapper = document.getElementById(`serverStatusWrapper`);
	setWrapperFormat(wrapper, 0);
	try {
		wrapper.innerHTML = `Waiting for server status...`;
		const statusData = await getServerStatus();
		try {
			ls_setGlobal_obj(ss_LSKEY_serverStatusData, statusData);
		} catch {
			// Do nothing.
		}
		await ss_displayServerStatusData(wrapper, statusData);
	} catch (error) {
		setWrapperFormat(wrapper, 0);
		handleError(wrapper, error);
	}
}

async function ss_displayServerStatusData(
	wrapper,
	statusData,
	allowExtend = true,
) {
	const results =
		Array.isArray(statusData?.results) ? statusData.results : [];

	results.sort((a, b) => ss_compare(a.server, b.server));

	let txt = ``;
	let paddingStyle = ss_decidePadding(true, true);

	const sFlex = `f fr falc fjs`;
	const cFlex = `f fr falc fjc`;
	const eFlex = `f fr falc fje`;
	const sssmd = {sssmd: `1`};
	const sCol = `1 / -1`;

	txt += ss_buildBlurbRows(statusData, paddingStyle, sFlex, sssmd, sCol);
	txt += ss_addSingleServerStatusRow("&nbsp;");

	txt += ss_buildServerGrid(
		results,
		sFlex,
		eFlex,
		cFlex,
		sssmd,
		paddingStyle,
	);
	txt += ss_addSingleServerStatusRow("&nbsp;");

	txt += ss_buildOutagesSection(statusData, sFlex, sCol);

	txt += ss_buildKeys(results);

	setWrapperFormat(wrapper, 4);
	wrapper.innerHTML = txt;
	ss_toggleShowMoreDetails();
	ss_startAgeTicker(wrapper);
	ss_applyCooldownFromStatus(statusData, allowExtend);
}

function ss_buildBlurbRows(statusData, paddingStyle, sFlex, sssmd, sCol) {
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
			data: sssmd,
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
				data: sssmd,
			});
			blurbRows.push({
				text: msg,
				classes: sFlex,
				styles: `padding-left:40px;`,
				dim: true,
				small: true,
				gridCol: sCol,
				data: sssmd,
			});
		}
	}

	return ss_addServerStatusRow(blurbRows);
}

function ss_buildServerGrid(results, sFlex, eFlex, cFlex, sssmd, paddingStyle) {
	let txt = ``;
	txt += ss_addServerStatusRow([
		{text: `Server`, classes: eFlex, header: true},
		{text: `Status`, classes: cFlex, header: true},
		{
			text: `Response Times`,
			classes: cFlex,
			header: true,
			dim: true,
			gridCol: `span 2`,
			data: sssmd,
		},
		{
			text: `Pointed At`,
			classes: sFlex,
			header: true,
			dim: true,
			gridCol: `span 2`,
			data: sssmd,
		},
		{text: `&nbsp;`, classes: sFlex, header: true, dim: true},
	]);

	for (const r of results) {
		const verySlowResponse = r.responseTimeMs >= ss_VERYSLOW_THRESHOLD_MS;
		const slowResponse = r.responseTimeMs >= ss_SLOW_THRESHOLD_MS;
		const alive =
			r.up ?
				verySlowResponse ? ss_SVG_verySlow
				: slowResponse ? ss_SVG_slow
				: ss_SVG_up
			:	ss_SVG_down;

		const isServerDown = !r.up && r.lastSeenUp;
		const lastUp =
			!isServerDown && verySlowResponse ? `Degraded`
			: !isServerDown && slowResponse ? `Slow`
			: isServerDown ?
				`Down (last seen up ${ss_buildTimestampSpan(r.lastSeenUp, paddingStyle)} ago)`
			:	`&nbsp;`;

		const resTime =
			ss_translateServerError(r.error) ||
			getDisplayTime(r.responseTimeMs, {showMs: true});
		txt += ss_addServerStatusRow([
			{text: r.server + `:`, classes: eFlex},
			{text: alive, classes: cFlex},
			{
				text: resTime,
				classes: eFlex,
				dim: true,
				data: sssmd,
			},
			{text: `&nbsp;`, data: sssmd},
			{text: `&nbsp;`, data: sssmd},
			{
				text: r?.pointedTo || `-`,
				classes: sFlex,
				dim: true,
				data: sssmd,
			},
			{text: lastUp, classes: sFlex, dim: lastUp !== `&nbsp;`},
		]);
	}
	return txt;
}

function ss_buildOutagesSection(statusData, sFlex, sCol) {
	if (!Array.isArray(statusData?.outages) || statusData.outages.length === 0)
		return ``;

	let txt = ``;

	const ind1 = `padding-left:20px;`;
	const ind2 = `padding-left:40px;`;

	txt += ss_addServerStatusRow([
		{
			text: `Recent Server Outages`,
			classes: sFlex,
			header: true,
			gridCol: sCol,
		},
	]);

	for (const outage of statusData.outages) {
		const startedAt = ss_roundToNearestCacheInterval(outage.startedAt);
		const endedAt = ss_roundToNearestCacheInterval(outage.endedAt);
		if (!startedAt || !endedAt) continue;

		const servers = outage.servers || [];
		if (servers.length === 0) continue;

		const serverList = arrayToListReadable(servers, {symbolAnd: true});
		const started = dateFormat(startedAt);
		const duration = getDisplayTime(endedAt - startedAt, {showSecs: false});
		txt += ss_addServerStatusRow([
			{
				text: started,
				classes: sFlex,
				styles: `${ind1};padding-top:10px;`,
				gridCol: sCol,
			},
			{
				text: `Lasted approx ${duration}.`,
				classes: sFlex,
				styles: ind2,
				dim: true,
				small: true,
				gridCol: sCol,
			},
			{
				text: `Affected server${servers.length > 1 ? `s` : ``}: ${serverList}.`,
				classes: sFlex,
				styles: ind2,
				small: true,
				dim: true,
				gridCol: sCol,
			},
		]);
	}

	txt += ss_addSingleServerStatusRow("&nbsp;");

	return txt;
}

function ss_roundToNearestCacheInterval(isoString) {
	const t = Date.parse(isoString);
	if (!Number.isFinite(t)) return null;
	return Math.round(t / ss_CACHE_INTERVAL_MS) * ss_CACHE_INTERVAL_MS;
}

function ss_buildKeys(results) {
	style = ss_decidePadding(false, true);
	const slowTxt = nf(ss_SLOW_THRESHOLD_MS / 1000) + ` seconds`;
	const verySlowTxt = nf(ss_VERYSLOW_THRESHOLD_MS / 1000) + ` seconds`;
	const downTxt =
		nf((results.timeoutMs || ss_TIMEOUT_MS) / 1000) + ` seconds`;

	const keys = [
		`<b>Key:</b>`,
		`${ss_buildSVGSpan(ss_SVG_up, style)} Healthy servers took less than ${slowTxt} to respond.`,
		`${ss_buildSVGSpan(ss_SVG_slow, style)} Slow servers took between ${slowTxt} and ${verySlowTxt} to respond.`,
		`${ss_buildSVGSpan(ss_SVG_verySlow, style)} Degraded servers took ${verySlowTxt} or longer to respond.`,
		`${ss_buildSVGSpan(ss_SVG_down, style)} Down servers did not respond within ${downTxt}.`,
	];

	let txt = ``;
	for (const k of keys) txt += ss_addSingleServerStatusRow(k);
	return txt;
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

function ss_translateServerError(error) {
	if (!error) return null;

	if (error === "timeout" || error === "AbortError") return "Timed Out";

	if (error.startsWith("http_")) {
		const code = error.split("_")[1];

		if (code === "401") return "Unauthorized";
		if (code === "403") return "Forbidden";
		if (code === "404") return "Server Not Found";
		if (code === "429") return "Rate Limited";
		if (code === "500") return "Server Error";
		if (code === "502" || code === "503" || code === "504")
			return "Service Unavailable";
		if (code === "521") return "Server Unreachable";
		if (code === "522") return "Timed Out";

		return `HTTP ${code}`;
	}

	if (error === "TypeError") return "Network Error";

	return "Connection Failed";
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
				ls_remove(ss_LSKEY_serverStatusData);
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

function ss_applyCooldownFromStatus(statusData, allowExtend = true) {
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
	const storedUntil = Number(ls_getGlobal(ss_LSKEY_serverStatusCooldown, 0));
	const blockUntil = Math.max(minBlockUntil, cacheLikelyNewAt);

	let finalUntil = blockUntil;

	if (!allowExtend && storedUntil && storedUntil > nowMs)
		finalUntil = storedUntil;

	ss_setCooldownUntil(finalUntil);
}

function ss_tryResumeCooldownOnLoad() {
	const until = Number(ls_getGlobal(ss_LSKEY_serverStatusCooldown, 0));
	if (!until || until <= Date.now()) return;

	ss_setCooldownUntil(until);

	let statusData = ls_getGlobal(ss_LSKEY_serverStatusData, null);
	if (!statusData) return;

	const checkedAt = Date.parse(statusData?.checkedAt);
	if (!Number.isFinite(checkedAt)) return;

	const age = Date.now() - checkedAt;
	if (age <= ss_CACHE_INTERVAL_MS + ss_CACHE_GRACE_MS) {
		const wrapper = document.getElementById(`serverStatusWrapper`);
		if (wrapper) ss_displayServerStatusData(wrapper, statusData, false);
	}
}

function ss_toggleShowMoreDetails(checked) {
	if (checked == null) checked = ss_getShowMoreDetails();
	else ss_setShowMoreDetails(checked);

	const wrapper = document.getElementById(`serverStatusWrapper`);
	if (wrapper == null) return;

	checked ?
		wrapper.classList.add(`serverStatusDetailsColumns`)
	:	wrapper.classList.remove(`serverStatusDetailsColumns`);

	const eles = document.querySelectorAll(`#serverStatusWrapper [data-sssmd]`);
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
