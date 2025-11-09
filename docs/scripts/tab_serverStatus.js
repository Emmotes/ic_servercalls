const vss=1.001;

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
		let alive = responses[serverToTest].alive ? '✔️' : '❌';
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