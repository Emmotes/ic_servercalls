const tabsContainer=document.getElementById(`tabsContainer`);
const settingsMenu=document.getElementById(`settingsMenu`);
const settingsUserId=document.getElementById(`userId`);
const settingsUserHash=document.getElementById(`userHash`);
const settingsSave=document.getElementById(`settingsMenuButtonSave`);
const settingsClose=document.getElementById(`settingsMenuButtonClose`);
const M=`https://master.idlechampions.com/~idledragons/`;
const SPS=`switch_play_server`;
const FR=`failure_reason`;
const OII=`Outdated instance id`;
const PARAM_CALL=`call`;
const PARAM_INSTANCEID=`instance_id`;
const PARAM_USERID=`user_id`;
const PARAM_USERHASH=`hash`;
const RETRIES=3;
var SERVER=``;
var userIdent=[``,``];
var instanceId=``;

function init() {
	if (localStorage.scUserIdent!=undefined&&localStorage.scUserIdent!=``) {
		settingsClose.hidden = false;
		userIdent = JSON.parse(localStorage.scUserIdent);
	} else {
		tabsContainer.hidden = true;
		settingsClose.hidden = true;
		settingsToggle();
	}
}

async function pullFormationSaves() {
	let button = document.getElementById(`formationsPullButton`);
	let message = document.getElementById(`formationsPullButtonDisabled`);
	button.hidden = true;
	message.hidden = false;
	setTimeout (function(){message.hidden = true;},10000);
	setTimeout (function(){button.hidden = false;},10000);
	let wrapper = document.getElementById(`formsWrapper`);
	let c = `Waiting for response...`;
	wrapper.innerHTML = c;
	let forms = await getFormationSaves();
	await displayFormationSaves(wrapper,forms);
}

async function displayFormationSaves(wrapper,saves) {
	if (saves==undefined||saves.all_saves==undefined) {
		wrapper.innerHTML = `Error.`;
		return;
	}
	let all = saves.all_saves;
	let c = ``;
	for (let key of Object.keys(all)) {
		if (key=="-1") continue;
		let id = Number(key);
		let camp = id % 1000;
		let patron = id - camp;
		let campName = campaignIds[`${camp}`];
		let patronName = patron==0?``:patronIds[`${patron}`];
		c += `<span class="formsCampaign" id="${key}"><span class="formsCampaignTitle">${campName}</span><span class="formsCampaignTitle">`+(patronName==``?`No Patron`:patronName)+`</span>`;
		for (let formation of all[key]) {
			let formId = formation.formation_save_id;
			let formName = formation.name;
			let formFav = Number(formation.favorite||0);
			let formLet = (formFav==1?`Q`:(formFav==2?`W`:(formFav==3?`E`:``)));
			if (formLet!=``) formLet = ` (Fav: ${formLet})`;
			c += `<span class="formsCampaignFormation" id="form_${formId}_cont"><input type="checkbox" id="form_${formId}" name="${formName}${formLet}" data-camp="${campName}" data-patron="${patronName}"><label class="cblabel" for="form_${formId}">${formName}${formLet}</label></span>`;
		}
		c += `<span class="formsCampaignSelect"><input type="button" onClick="formsSelectAll('${key}',true)" value="Select All"><input type="button" onClick="formsSelectAll('${key}',false)" value="Deselect All"></span></span>`;
	}
	wrapper.innerHTML = c;
	let formsDeleter = document.getElementById(`formsDeleter`);
	formsDeleter.innerHTML = `<span class="menuRow"><span class="menuCol1" style="width:50%" id="formationsDeleteRow"><input type="button" onClick="deleteFormationSaves()" name="formationsDeleteButton" id="formationsDeleteButton" style="font-size:0.9em;min-width:180px" value="Delete Selected Formations"></span></span>`;
}

function formsSelectAll(id,check) {
	var container = document.getElementById(id);
	var cbs = container.querySelectorAll('input[type="checkbox"]');
	for (let cb of cbs) {
		cb.checked = check;
	}
}

async function deleteFormationSaves() {
	let formsDeleter = document.getElementById(`formsDeleter`);
	let c = `<span class="menuRow">Deleting Formation Saves:</span>`;
	formsDeleter.innerHTML = c;
	let list = document.querySelectorAll('[id^="form_"]');
	for (let form of list) {
		if (!form.checked) continue;
		let id = Number(form.id.replaceAll("form_",""));
		let result = await deleteFormationSave(id);
		let patron = form.dataset.patron;
		if (patron!=``) patron = `(${patron})`;
		let successType = ``;
		if (result['success']&&result['okay']) {
			successType = `Successfully deleted`;
		} else {
			successType = `Failed to delete`;
		}
		c += `<span class="menuRow"><span class="menuCol1" style="width:175px;margin-right:5px;flex-wrap:nowrap;flex-shrink:0">- ${successType}:</span><span class="menuCol2" style="flex-grow:1;margin-left:5px;flex-wrap:wrap">${form.name} in ${form.dataset.camp} ${patron}</span></span>`;
		form.parentNode.style.display=`none`;
		form.checked = false;
		formsDeleter.innerHTML = c;
	}
}

function settingsToggle() {
	if (localStorage.scUserIdent==undefined||localStorage.scUserIdent==``) {
		settingsMenu.style.display = `flex`;
		return;
	}
	if (settingsMenu.style.display==`none`||settingsMenu.style.display==``) {
		userId.value = userIdent[0];
		userHash.value = userIdent[1];
		settingsMenu.style.display = `flex`;
	} else {
		settingsMenu.style.display = `none`;
	}
}

async function saveUserData() {
	let userId = settingsUserId.value || ``;
	let userHash = settingsUserHash.value || ``;
	if (userId!=``&&userHash!=``) {
		userIdent[0] = userId;
		userIdent[1] = userHash;
		localStorage.scUserIdent = JSON.stringify(userIdent);
		settingsSave.value = `SAVED`;
		if (settingsClose.hidden)
			settingsClose.hidden = false;
		if (tabsContainer.hidden)
			tabsContainer.hidden = false;
		await new Promise(r => setTimeout(r, 2000));
		settingsSave.value = `Save`;
	} else {
		settingsSave.value = `ERROR`;
		await new Promise(r => setTimeout(r, 2000));
		settingsSave.value = `Save`;
	}
}

function swapTab() {
	let hash=window.location.hash.substring(1).split("_");
	if (hash[0]!=""&&document.getElementById(hash[0])!=undefined) {
		document.getElementById(hash[0]).click();
	}
	if (hash.length>1) {
		switch (hash[0]) {
			case `${st}`:
				stackRoute.value=hash[1];
				stackReset.value=hash[2];
				stackFavour.value=hash[3];
				stackStack.value=hash[4];
				stackBrivZone.value=hash[5];
				stackWithMetal.checked=hash[6]==`1`?true:false;
				stackRuns.value=hash[7];
				break;
		}
	}
}

function setHash(hash) {
	hash=`#`+hash;
	if(history.replaceState) {
		history.replaceState(null,null,hash);
	} else {
		window.location.hash=hash;
	}
}

async function getPlayServerFromMaster() {
	let call = `${PARAM_CALL}=getPlayServerForDefinitions`;
	call += appendBoilerplate();
	let response = await sendServerCall(M,call);
	SERVER = response['play_server'];
}

async function getUserDetails() {
	let call = `${PARAM_CALL}=getuserdetails`;
	call += `&${PARAM_USERID}=${userIdent[0]}`;
	call += `&${PARAM_USERHASH}=${userIdent[1]}`;
	call += appendBoilerplate();
	return await sendServerCall(SERVER,call);
}

async function getUpdatedInstanceId(deets) {
	if (deets==undefined)
		deets = await getUserDetails();
	instanceId = deets.details.instance_id;
}

async function getFormationSaves() {
	let call = `${PARAM_CALL}=getallformationsaves`;
	call += `&${PARAM_USERID}=${userIdent[0]}`;
	call += `&${PARAM_USERHASH}=${userIdent[1]}`;
	if (instanceId==``)
		await getUpdatedInstanceId()
	call += `&${PARAM_INSTANCEID}=${instanceId}`;
	call += appendBoilerplate();
	return await sendServerCall(SERVER,call);
}

async function deleteFormationSave(id) {
	if (id==undefined) return;
	let call = `${PARAM_CALL}=DeleteFormationSave`;
	call += `&formation_save_id=${id}`;
	call += `&${PARAM_USERID}=${userIdent[0]}`;
	call += `&${PARAM_USERHASH}=${userIdent[1]}`;
	if (instanceId==``)
		await getUpdatedInstanceId()
	call += `&${PARAM_INSTANCEID}=${instanceId}`;
	call += appendBoilerplate();
	return await sendServerCall(SERVER,call);
}

function appendBoilerplate() {
	return `&language_id=1&timestamp=0&request_id=0&mobile_client_version=99999&include_free_play_objectives=true&instance_key=1&offline_v2_build=1&localization_aware=true`;
}

async function sendServerCall(server,call) {
	if (server==``) {
		if (SERVER==``)
			await getPlayServerFromMaster();
		server = SERVER;
	}
	let response = await sendOutgoingCall(server,call);
	let limit = 0;
	while (response[SPS]!=undefined||!response['success']&&limit<RETRIES) {
		if (response[SPS]) {
			SERVER = response[SPS];
			response = await sendOutgoingCall(SERVER,call);
		} else if (!response['success']) {
			console.log(`Got outdated instance id.`);
			if (response[FR]==OII) {
				let oldII = instanceId;
				instanceId = await getUpdatedInstanceId();
				call = call.replace(oldII,instanceId);
				response = await sendOutgoingCall(server,call);
			} else {
				// Unknown error.
				console.log(`Unknown Error: ${response[FR]}`);
				return response;
			}
		}
		limit++;
	}
	return response;
}

async function sendOutgoingCall(server,call) {
	let url = `${server}post.php?${call}`;
	var response = await fetch(url)
		.then(response => response.text())
		.catch(err => console.log(err));
	return await JSON.parse(response);
}