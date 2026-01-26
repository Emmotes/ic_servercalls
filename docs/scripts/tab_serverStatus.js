const vss = 2.002; // prettier-ignore
const ss_SVG_up = `<svg width="22" height="22" viewBox="1.5 -9.1 14 14" xmlns="http://www.w3.org/2000/svg" fill="var(--AlienArmpit)" stroke="var(--Black)" stroke-width=".4"><path fill-rule="evenodd" d="m14.75-5.338a1 1 0 0 0-1.5-1.324l-6.435 7.28-3.183-2.593a1 1 0 0 0-1.264 1.55l3.929 3.2a1 1 0 0 0 1.38-.113l7.072-8z"/></svg>`;
const ss_SVG_down = `<svg width="22" height="22" viewBox="1 1 34 34" xmlns="http://www.w3.org/2000/svg" stroke="var(--Black)" stroke-width=".8"><path fill="var(--CarminePink)" d="M21.533 18.002 33.768 5.768a2.5 2.5 0 0 0-3.535-3.535L17.998 14.467 5.764 2.233a2.5 2.5 0 0 0-3.535 0 2.5 2.5 0 0 0 0 3.535l12.234 12.234L2.201 30.265a2.498 2.498 0 0 0 1.768 4.267c.64 0 1.28-.244 1.768-.732l12.262-12.263 12.234 12.234a2.5 2.5 0 0 0 1.768.732 2.5 2.5 0 0 0 1.768-4.267z"/></svg>`;
const ss_SVG_slow = `<svg width="22" height="22" xmlns="http://www.w3.org/2000/svg" stroke="var(--Black)" stroke-width=".6" fill="var(--Saffron)"><rect height="4" rx="1.5" ry="1.5" width="21" x=".5" y="9"></rect></svg>`;
const ss_SLOW_THRESHOLD_MS = 6 * 1000; // 6 seconds
const ss_MIN_RECHECK_MS = 30 * 1000; // 30 seconds
const ss_CACHE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const ss_CACHE_GRACE_MS = 30 * 1000; // 30 seconds
const ss_COOLDOWN_STORAGE_KEY = `scServerStatusCooldown`;
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

	txt +=
		`<span class="f falc fjs" style="grid-column:1 / -1;padding-bottom:8px">` +
		`Servers were last checked ` +
		buildTimestampSpan(statusData?.checkedAt || "", true, true) +
		` ago</span>`;

	txt += ss_addServerStatusRow(`Server`, `Status`, `&nbsp;`, true);

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
				`Down (last seen up ${buildTimestampSpan(r.lastSeenUp, true, true)} ago)`
			:	`&nbsp;`;

		txt += ss_addServerStatusRow(
			`${r.server}:`,
			alive,
			lastUp,
			false,
			lastUp !== `&nbsp;`,
		);
	}

	setFormsWrapperFormat(wrapper, 4);
	wrapper.innerHTML = txt;
	ss_startAgeTicker(wrapper);
	ss_applyCooldownFromStatus(statusData);
}

function buildTimestampSpan(timer, padLeft, padRight) {
	let style = ``;
	if (padLeft) style += `padding-left:4px;`;
	if (padRight) style += `padding-right:4px;`;
	if (style) style = ` style="${style}"`;
	return `<span data-ss-age-iso="${timer}"${style}>-</span>`;
}

function ss_compare(a, b) {
	if (a === "master") return -1;
	if (b === "master") return 1;
	const an = Number(a.replace(/\D/g, "") || 0);
	const bn = Number(b.replace(/\D/g, "") || 0);
	return an - bn;
}

function ss_addServerStatusRow(server, alive, lastUp, header, dimLastUp) {
	const style = header ? ` style="font-size:1.2em"` : ``;
	const lastUpStyle = dimLastUp ? ` style="opacity:0.85"` : style;
	return (
		`<span class="f falc fje"${style}>${server}</span>` +
		`<span class="f falc fjc"${style}>${alive}</span>` +
		`<span class="f falc fjs"${lastUpStyle}>${lastUp}</span>`
	);
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
		localStorage.setItem(ss_COOLDOWN_STORAGE_KEY, String(untilMs));
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
				localStorage.removeItem(ss_COOLDOWN_STORAGE_KEY);
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
		const until = Number(
			localStorage.getItem(ss_COOLDOWN_STORAGE_KEY) || 0,
		);
		if (until && until > Date.now()) ss_setCooldownUntil(until);
	} catch {
		// Do nothing.
	}
}