const va = 1.000; // prettier-ignore

function a_collectLSKEYs() {
	const keys = [];
	for (let i = 0; i < localStorage.length; i++) {
		const k = localStorage.key(i);
		if (!k) continue;
		if (k.startsWith("sc")) keys.push(k);
	}
	return keys;
}

function a_exportBackup() {
	const keys = a_collectLSKEYs();
	const data = {};
	keys.forEach((k) => (data[k] = localStorage.getItem(k)));

	const out = {
		meta: {
			app: "ic_servercalls",
			version: va,
			exportedAt: new Date().toISOString(),
		},
		data,
	};

	const json = JSON.stringify(out, null, 2);
	const blob = new Blob([json], {type: "application/json"});
	const ts = new Date().toISOString().replace(/[:.]/g, "-");
	const name = `ic_servercalls-backup-${ts}.json`;

	const a = document.createElement("a");
	a.href = URL.createObjectURL(blob);
	a.download = name;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(a.href), 5000);
	a_tempChangeButton(`DOWNLOADED`, settingsBackupDownload);
}

function a_importBackup(obj) {
	if (!obj || !obj.data || typeof obj.data !== "object") {
		a_tempChangeButton(`INVALID FILE`, settingsBackupRestore);
		return;
	}

	const backupKeys = Object.keys(obj.data);
	const backupSet = new Set(backupKeys);

	// Remove any saved app keys that are not present in the backup.
	a_collectLSKEYs().forEach((k) => {
		if (!backupSet.has(k)) localStorage.removeItem(k);
	});

	backupKeys.forEach((k) => {
		localStorage.setItem(k, obj.data[k]);
	});

	a_tempChangeButton(`RESTORED`, settingsBackupRestore);
	init();
}

function a_tempChangeButton(newTxt, ele) {
	if (!ele) return;

	const oldTxt = ele.value;

	ele.value = newTxt;
	ele.disabled = true;
	setTimeout(() => {
		ele.value = oldTxt;
		ele.disabled = false;
	}, buttonTextChangeMS);
}

function a_handleBackupFile(files) {
	if (!files || files.length === 0) return;
	const f = files[0];
	const reader = new FileReader();
	reader.onload = (e) => {
		try {
			const obj = JSON.parse(e.target.result);
			a_importBackup(obj);
		} catch (err) {
			alert("Failed to read backup file: " + err);
		}
	};
	reader.readAsText(f);
}
