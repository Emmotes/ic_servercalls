const vad=1.001;

async function pullAeonData() {
	if (userIdent[0]==``||userIdent[1]==``) {
		init();
		return;
	}
	temporarilyDisableAllPullButtons();
	let wrapper = document.getElementById(`aeonWrapper`);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		wrapper.innerHTML = `Waiting for patron data...`;
		let details = await getPatronDetails();
		await displayAeonData(wrapper,details);
	} catch {
		wrapper.innerHTML = BADDATA;
	}
}

async function displayAeonData(wrapper,details) {
	let aeonData = details.aeon_data;
	let millisecondsTilRollover = Number(aeonData.seconds_until_patron_rollover) * 1000;
	let currPatronId = Number(aeonData.current_patron_id);
	let nextPatronId = Number(aeonData.next_patron_id);
	let currPatron = getPatronNameById(currPatronId);
	let nextPatron = getPatronNameById(nextPatronId);
	let count = 0;
	let goal = 0;
	outerLoop:
	for (let patron of details.patrons) {
		if (patron.patron_id!=currPatronId||patron.unlocked==false||patron.progress_bars==undefined)
			continue;
		for (let prog of patron.progress_bars) {
			if (prog.label != "weekly_challenges_progress")
				continue;
			count = Number(prog.count);
			goal = Number(prog.goal);
			break outerLoop;
		}
	}
	let percent = 0;
	let choreInfo=`Patron Not Unlocked`;
	if (goal>0) {
		percent = ((count / goal) * 100).toFixed(2);
		choreInfo=`${count} / ${goal} (${percent}%)`;
	}

	let col1 = `width:25%;min-width:200px;`;
	let col2 = `width:35%;min-width:250px;`;
	let txt = ``;
	txt+=`<span class="f fr w100 p5" style="font-size:1.2em">Aeon Patron Data:</span>`;
	txt+=addAeonRow(`Current Patron:`,currPatron);
	txt+=addAeonRow(`${currPatron} Weekly Chores:`,choreInfo);
	txt+=addAeonRow(`&nbsp;`,`&nbsp;`);
	txt+=addAeonRow(`Next Patron:`,nextPatron);
	txt+=addAeonRow(`Time 'til Switch:`,getDisplayTime(millisecondsTilRollover));
	wrapper.innerHTML = txt;
}

function addAeonRow(left,right) {
	let txt = `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:25%;min-width:200px;">${left}</span><span class="f falc fjs ml2" style="padding-left:10px;width:35%;min-width:250px;">${right}</span>`;
	txt += `</span>`;
	return txt;
}