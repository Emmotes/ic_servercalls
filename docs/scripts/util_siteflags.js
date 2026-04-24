const vf = 1.000; // prettier-ignore
const f_LSKEY_siteFlags = `scSiteFlags`;
const f_siteFlags = document.getElementById("siteFlags");
const f_siteFlagsContainer = document.getElementById("siteFlagsContainer");
const f_removeSVG = `<svg width="14" height="14" viewBox="2 2 20 20" fill="var(--ChineseBlack)" xmlns="http://www.w3.org/2000/svg"><title>cross</title><path d="M6.995 7.006a1 1 0 0 0 0 1.415l3.585 3.585-3.585 3.585a1 1 0 1 0 1.414 1.414l3.585-3.585 3.585 3.585a1 1 0 0 0 1.415-1.414l-3.586-3.585 3.586-3.585a1 1 0 0 0-1.415-1.415l-3.585 3.585L8.41 7.007a1 1 0 0 0-1.414 0"/></svg>`;

function f_eventListeners() {
	if (f_siteFlags) {
		f_siteFlags.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				f_addSiteFlag(e.srcElement.value.trim());
				e.srcElement.value = "";
			}
		});
	}
}

function f_updateSiteFlags() {
	if (!f_siteFlagsContainer) return;

	const flags = f_getSiteFlags();
	if (flags.size === 0) {
		f_siteFlagsContainer.innerHTML = `&nbsp;`;
		f_siteFlagsContainer.style.display = "none";
		return;
	}

	const eles = [];
	for (const flag of flags) {
		const removeBtn = `<span class="f falc fjc s_removeSiteFlagSVG" onclick="f_removeSiteFlag('${flag}');">${f_removeSVG}</span>`;
		eles.push({
			text: `${flag} ${removeBtn}`,
			classes: `f falc fjs ml2 s_removeSiteFlag`,
		});
	}

	f_siteFlagsContainer.innerHTML = addHTMLElements(eles);
	f_siteFlagsContainer.style.display = "";
}

function f_getSiteFlags() {
	return ls_getGlobal_set(f_LSKEY_siteFlags, []);
}

function f_addSiteFlag(flag) {
	if (!flag || flag === "") return;
	if (!/^[a-zA-Z0-9]*$/.test(flag) || flag.length > 20) return;

	const flags = f_getSiteFlags();
	if (flags.has(flag)) return;

	flags.add(flag);
	ls_setGlobal_arr(f_LSKEY_siteFlags, [...flags]);

	f_updateSiteFlags();
}

function f_removeSiteFlag(flag) {
	const flags = f_getSiteFlags();
	if (!flags.has(flag)) return;

	flags.delete(flag);
	ls_setGlobal_arr(f_LSKEY_siteFlags, [...flags]);

	f_updateSiteFlags();
}
