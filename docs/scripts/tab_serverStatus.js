const vss = 2.000; // prettier-ignore
const ss_SVG_tick = `<svg width="22" height="22" viewBox="1.5 -9.1 14 14" xmlns="http://www.w3.org/2000/svg" fill="var(--AlienArmpit)" stroke="var(--Black)" stroke-width=".4"><path fill-rule="evenodd" d="m14.75-5.338a1 1 0 0 0-1.5-1.324l-6.435 7.28-3.183-2.593a1 1 0 0 0-1.264 1.55l3.929 3.2a1 1 0 0 0 1.38-.113l7.072-8z"/></svg>`;
const ss_SVG_cross = `<svg width="22" height="22" viewBox="1 1 34 34" xmlns="http://www.w3.org/2000/svg" stroke="var(--Black)" stroke-width=".8"><path fill="var(--CarminePink)" d="M21.533 18.002 33.768 5.768a2.5 2.5 0 0 0-3.535-3.535L17.998 14.467 5.764 2.233a2.5 2.5 0 0 0-3.535 0 2.5 2.5 0 0 0 0 3.535l12.234 12.234L2.201 30.265a2.498 2.498 0 0 0 1.768 4.267c.64 0 1.28-.244 1.768-.732l12.262-12.263 12.234 12.234a2.5 2.5 0 0 0 1.768.732 2.5 2.5 0 0 0 1.768-4.267z"/></svg>`;
let ss_ageTimer = null;

async function ss_pullServerStatusData() {
	if (isBadUserData()) return;
	disablePullButtons();
	const wrapper = document.getElementById(`serverStatusWrapper`);
	setFormsWrapperFormat(wrapper, 0);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		wrapper.innerHTML = `Waiting for server status...`;
		const statusData = await getServerStatus();
		await ss_displayServerStatusData(wrapper, statusData);
		codeEnablePullButtons();
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
		const alive = r.up ? ss_SVG_tick : ss_SVG_cross;

		const isServerDown = !r.up && r.lastSeenUp;
		const lastUp =
			isServerDown ?
				`Down (last seen up ${buildTimestampSpan(r.lastSeenUp, true, true)} ago)`
			:	`&nbsp;`;

		txt += ss_addServerStatusRow(`${r.server}:`, alive, lastUp, false, isServerDown);
	}

	setFormsWrapperFormat(wrapper, 4);
	wrapper.innerHTML = txt;
	ss_startAgeTicker(wrapper);
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

function ss_formatAge(isoString, nowMs) {
	if (!isoString) return `-`;
	const t = Date.parse(isoString);
	if (!Number.isFinite(t)) return `-`;

	let diff = Math.max(0, Math.floor((nowMs - t) / 1000)); // seconds

	const days = Math.floor(diff / 86400);
	diff -= days * 86400;

	const hours = Math.floor(diff / 3600);
	diff -= hours * 3600;

	const mins = Math.floor(diff / 60);
	const secs = diff - mins * 60;

	if (days > 0) return `${days}d ${hours}h`;
	if (hours > 0) return `${hours}h ${mins}m`;
	if (mins > 0) return `${mins}m ${secs}s`;
	return `${secs}s`;
}

function ss_startAgeTicker(wrapper) {
	if (ss_ageTimer) clearInterval(ss_ageTimer);

	const update = () => {
		const nowMs = Date.now();
		const nodes = wrapper.querySelectorAll(`[data-ss-age-iso]`);
		for (const n of nodes) {
			const iso = n.getAttribute(`data-ss-age-iso`);
			n.textContent = ss_formatAge(iso, nowMs);
		}
	};

	update();
	ss_ageTimer = setInterval(update, 1000);
}
