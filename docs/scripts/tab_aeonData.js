const vad = 1.008; // prettier-ignore

async function ad_pullAeonData() {
	if (isBadUserData()) return;
	disablePullButtons();
	const wrapper = document.getElementById(`aeonWrapper`);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		wrapper.innerHTML = `Waiting for patron data...`;
		const details = await getPatronDetails();
		await ad_displayAeonData(wrapper, details);
		codeEnablePullButtons();
	} catch (error) {
		handleError(wrapper, error);
	}
}

async function ad_displayAeonData(wrapper, details) {
	const aeonData = details.aeon_data;
	const millisecondsTilRollover =
		Number(aeonData.seconds_until_patron_rollover) * 1000;
	const currPatronId = Number(aeonData.current_patron_id);
	const nextPatronId = Number(aeonData.next_patron_id);
	const currPatron = getPatronNameById(currPatronId);
	const nextPatron = getPatronNameById(nextPatronId);
	let count = 0;
	let goal = 0;
	outerLoop: for (let patron of details.patrons) {
		if (
			patron.patron_id !== currPatronId ||
			patron.unlocked === false ||
			patron.progress_bars == null
		)
			continue;
		for (let prog of patron.progress_bars) {
			if (prog.label !== "weekly_challenges_progress") continue;
			count = Number(prog.count);
			goal = Number(prog.goal);
			break outerLoop;
		}
	}
	let percent = 0;
	let choreInfo = `Patron Not Unlocked`;
	if (goal > 0) {
		percent = ((count / goal) * 100).toFixed(2);
		choreInfo = `${count} / ${goal} (${percent}%)`;
	}

	let txt = ``;
	txt += `<span class="f fr w100 p5" style="font-size:1.2em">Aeon Patron Data:</span>`;
	txt += ad_addAeonRow(`Current Patron:`, currPatron);
	txt += ad_addAeonRow(`${currPatron} Weekly Chores:`, choreInfo);
	txt += ad_addAeonRow(`&nbsp;`, `&nbsp;`);
	txt += ad_addAeonRow(`Next Patron:`, nextPatron);
	txt += ad_addAeonRow(
		`Time 'til Switch:`,
		`<span id="aeonTimer">${getDisplayTime(millisecondsTilRollover)}</span>`,
	);
	createTimer(
		millisecondsTilRollover,
		`ad_switchPatron`,
		`aeonTimer`,
		`Switched`,
	);
	wrapper.innerHTML = txt;
}

function ad_addAeonRow(left, right) {
	return `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:25%;min-width:200px;">${left}</span><span class="f falc fjs ml2" style="padding-left:10px;width:35%;min-width:250px;">${right}</span></span>`;
}
