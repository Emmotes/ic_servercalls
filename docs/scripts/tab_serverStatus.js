const vss=1.000;

async function ss_pullServerStatusData() {
	if (isBadUserData())
		return;
	disablePullButtons();
	let wrapper = document.getElementById(`serverStatusWrapper`);
	wrapper.innerHTML = `Waiting for response...`;
	try {
		await sc_displayServerStatusData(wrapper);
		codeEnablePullButtons();
	} catch (error) {
		handleError(wrapper,error);
	}
}

async function sc_displayServerStatusData(wrapper) {
	let serversToTest=['master','ps17','ps18','ps19','ps20','ps21','ps22','ps23','ps26'];
	
	let responses={};
	for (let serverToTest of serversToTest) {
		let url = M.replace('master',serverToTest);
		responses[serverToTest] = false;
		try {
			wrapper.innerHTML = `Checking ${serverToTest}...`;
			let response = await getPlayServerForDefinitions(url,5000);
			if (response.success&&response['play_server']!=undefined)
				responses[serverToTest] = true;
		} catch (error) {
			// This is just to stop the try/catch in ss_pullServerStatusData from proc'ing.
		}
	}
	
	let txt = ``;
	for (let serverToTest of serversToTest)
		txt+=sc_addServerStatusRow(`${serverToTest}:`,responses[serverToTest]?'✔️':'❌');
	wrapper.innerHTML = txt;
}

function sc_addServerStatusRow(left,right) {
	let txt = `<span class="f fr w100 p5"><span class="f falc fje mr2" style="width:25%;min-width:200px;">${left}</span><span style="width:10px">&nbsp;</span><span class="f fals fjs mr2" style="width:fit-content">${right}</span>`;
	txt += `</span>`;
	return txt;
}