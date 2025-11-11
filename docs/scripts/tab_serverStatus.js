const vss=1.003;
const ss_tick=`<svg width="22" height="22" viewBox="1.5 -9.1 14 14" xmlns="http://www.w3.org/2000/svg" fill="var(--AlienArmpit)" stroke="var(--Black)" stroke-width=".4"><path fill-rule="evenodd" d="m14.75-5.338a1 1 0 0 0-1.5-1.324l-6.435 7.28-3.183-2.593a1 1 0 0 0-1.264 1.55l3.929 3.2a1 1 0 0 0 1.38-.113l7.072-8z"/></svg>`;
const ss_cross=`<svg width="22" height="22" viewBox="1 1 34 34" xmlns="http://www.w3.org/2000/svg" stroke="var(--Black)" stroke-width=".8"><path fill="var(--CarminePink)" d="M21.533 18.002 33.768 5.768a2.5 2.5 0 0 0-3.535-3.535L17.998 14.467 5.764 2.233a2.5 2.5 0 0 0-3.535 0 2.5 2.5 0 0 0 0 3.535l12.234 12.234L2.201 30.265a2.498 2.498 0 0 0 1.768 4.267c.64 0 1.28-.244 1.768-.732l12.262-12.263 12.234 12.234a2.5 2.5 0 0 0 1.768.732 2.5 2.5 0 0 0 1.768-4.267z"/></svg>`;

async function ss_pullServerStatusData() {
	if (isBadUserData())
		return;
	disablePullButtons();
	let wrapper = document.getElementById(`serverStatusWrapper`);
	setFormsWrapperFormat(wrapper,0);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		await ss_displayServerStatusData(wrapper);
		codeEnablePullButtons();
	} catch (error) {
		setFormsWrapperFormat(wrapper,0);
		handleError(wrapper,error);
	}
}

async function ss_displayServerStatusData(wrapper) {
	let serversToTest=['master','ps17','ps18','ps19','ps20','ps21','ps22','ps23','ps26'];
	
	let responses={};
	for (let serverToTest of serversToTest) {
		let url = M.replace('master',serverToTest);
		responses[serverToTest] = {alive:false,time:5000}
		try {
			let start = Date.now();
			wrapper.innerHTML = `Checking ${serverToTest}...`;
			let response = await getPlayServerForDefinitions(url,5000);
			if (response.success&&response['play_server']!=undefined) {
				let elapsed = Date.now() - start;
				responses[serverToTest] = {alive:true,time:elapsed};
				let told = response['play_server'].replace(/https?:\/\//gi,'').replace(/\.idlechampions.*/gi,'');
				if (!serversToTest.includes(told))
					serversToTest.push(told);
			}
		} catch (error) {
			// This is just to stop the try/catch in ss_pullServerStatusData from proc'ing.
		}
	}
	serversToTest.sort(ss_compare);
	
	let txt = ``;
	txt += ss_addServerStatusRow(`Server`,`Status`,`Response Time`,true);
	for (let serverToTest of serversToTest) {
		let alive = responses[serverToTest].alive ? ss_tick : ss_cross;
		let response = ss_displayTime(responses[serverToTest].time);
		if (responses[serverToTest].time >= 5000)
			response += ` (Timed Out)`;
		txt += ss_addServerStatusRow(`${serverToTest}:`,alive,response,false);
	}
	setFormsWrapperFormat(wrapper,4);
	wrapper.innerHTML = txt;
}

function ss_compare(a,b) {
	if (a=='master')
		return -1;
	if (b=='master')
		return 1;
	let an = Number(a.replace(/\D/g,'')||0);
	let bn = Number(b.replace(/\D/g,'')||0);
	return an - bn;
}

function ss_addServerStatusRow(server,alive,response,header) {
	let style = header ? ` style="font-size:1.2em"` : ``;
	return `<span class="f falc fje"${style}>${server}</span><span class="f falc fjc"${style}>${alive}</span><span class="f falc fjs"${style}>${response}</span>`;
}

function ss_displayTime(time) {
	let s = Math.floor((time/1000) % 60);
	let ms = time % 1000;
	let display = ``;
	if (s > 0)
		display += `${padZeros(s,2)}.`;
	display += `${padZeros(ms,3)}${s > 0 ? 's' : 'ms'}`;
	return display;
}