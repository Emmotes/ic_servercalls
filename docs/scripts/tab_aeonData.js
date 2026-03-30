const vad = 1.100; // prettier-ignore
const ad_serverCalls = new Set(["getPatronDetails"]);

function ad_registerData() {
	ad_serverCalls.forEach((c) => t_tabsServerCalls.add(c));
}

function ad_tab() {
	return `
					<span class="f fr w100 p5">
						<span class="f falc fjs ml2" style="width:100%">
							<h1>Aeon Patron Data</h1>
						</span>
					</span>
					<span class="f fr w100 p5">
						<span class="f falc fjs ml2" style="width:100%">
							This page will just tell you which patron Aeon is currently on - as well as when she'll switch and what patron she'll switch to.
						</span>
					</span>
					<span class="f fr w100 p5">
						&nbsp;
					</span>
					<span class="f fr w100 p5" style="height:34px;">
						<span class="f falc fje mr2" style="width:50%;">
							<input type="button" onClick="ad_pullAeonData()" name="aeonPullButton" id="aeonPullButton" value="Pull Aeon Data" style="min-width:175px">
							<span id="aeonPullButtonDisabled" style="font-size:0.9em" hidden>&nbsp;</span>
						</span>
					</span>
					<span class="f fr w100 p5">
						&nbsp;
					</span>
					<span class="f falc fje mr2" style="flex-direction:column" id="aeonWrapper">
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

async function ad_pullAeonData(patronDetails) {
	if (!patronDetails) {
		if (isBadUserData()) return;
		disablePullButtons();
	}
	const wrapper = document.getElementById(`aeonWrapper`);
	try {
		if (!patronDetails) {
			wrapper.innerHTML = `Waiting for patron data...`;
			patronDetails = await getPatronDetails();
		}
		await ad_displayAeonData(wrapper, patronDetails);
		codeEnablePullButtons();
	} catch (error) {
		handleError(wrapper, error);
	}
}

async function ad_displayAeonData(wrapper, patronDetails) {
	const aeonData = patronDetails.aeon_data;
	const millisecondsTilRollover =
		Number(aeonData.seconds_until_patron_rollover) * 1000;
	const currPatronId = Number(aeonData.current_patron_id);
	const nextPatronId = Number(aeonData.next_patron_id);
	const currPatron =
		c_patronById.get(currPatronId) ?? `??? (id: ${currPatronId})`;
	const nextPatron =
		c_patronById.get(nextPatronId) ?? `??? (id: ${nextPatronId})`;
	let count = 0;
	let goal = 0;
	outerLoop: for (let patron of patronDetails.patrons) {
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
	return addHTMLElement({
		text: addHTMLElements([
			{
				text: left,
				classes: `f falc fje mr2`,
				styles: `width:25%;min-width:200px;`,
			},
			{
				text: right,
				classes: `f falc fjs ml2`,
				styles: `padding-left:10px;width:35%;min-width:250px;`,
			},
		]),
		classes: `f fr w100 p5`,
	});
}
