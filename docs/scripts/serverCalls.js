const vs=1.0;
var SERVER=``;
var userIdent=[``,``];
var instanceId=``;

async function getPlayServerFromMaster() {
	let call = `${PARAM_CALL}=getPlayServerForDefinitions`;
	let response = await sendServerCall(M,call);
	SERVER = response['play_server'];
}

async function getUserDetails() {
	let call = `${PARAM_CALL}=getuserdetails`;
	call += `&supports_chunked_defs=0`;
	call += `&new_achievements=1`;
	return await sendServerCall(SERVER,call,true);
}

async function getDefinitions(filter) {
	let call = `${PARAM_CALL}=getdefinitions`;
	if (filter!=undefined&&filter!="")
		call += `&filter=${filter}`;
	return await sendServerCall(SERVER,call);
}

async function getPatronDetails() {
	let call = `${PARAM_CALL}=getpatrondetails`;
	return await sendServerCall(SERVER,call,true,true);
}

async function getUpdatedInstanceId(deets) {
	if (deets==undefined)
		deets = await getUserDetails();
	instanceId = deets.details.instance_id;
}

async function getFormationSaves() {
	let call = `${PARAM_CALL}=getallformationsaves`;
	return await sendServerCall(SERVER,call,true,true);
}

async function deleteFormationSave(id) {
	if (id==undefined) return;
	let call = `${PARAM_CALL}=DeleteFormationSave`;
	call += `&formation_save_id=${id}`;
	return await sendServerCall(SERVER,call,true,true);
}

async function openTimeGate(heroId) {
	let call = `${PARAM_CALL}=opentimegate`;
	call += `&champion_id=${heroId}`;
	return await sendServerCall(SERVER,call,true,true);
}

async function purchaseFeat(id) {
	let call = `${PARAM_CALL}=purchasefeat`;
	call += `&feat_id=${id}`;
	return await sendServerCall(SERVER,call,true,true);
}

async function forgeLegendary(heroId,slotId) {
	let call = `${PARAM_CALL}=craftlegendaryitem`;
	call += `&hero_id=${heroId}`;
	call += `&slot_id=${slotId}`;
	return await sendServerCall(SERVER,call,true,true);
}

async function upgradeLegendary(heroId,slotId) {
	let call = `${PARAM_CALL}=upgradelegendaryitem`;
	call += `&hero_id=${heroId}`;
	call += `&slot_id=${slotId}`;
	return await sendServerCall(SERVER,call,true,true);
}

async function useServerBuff(buffId,heroId,count) {
	let call = `${PARAM_CALL}=useServerBuff`;
	call += `&buff_id=${buffId}`;
	call += `&hero_id=${heroId}`;
	call += `&num_uses=${count}`;
	return await sendServerCall(SERVER,call,true,true);
}

async function trialsRefreshData() {
	let call = `${PARAM_CALL}=trialsrefreshdata`;
	return await sendServerCall(SERVER,call,true,true);
}

async function trialsCreateCampaign(difficultyId,isPrivate,costChoice,autoStart) {
	let call = `${PARAM_CALL}=trialsopencampaign`;
	call += `&difficulty_id=${difficultyId}`;
	call += `&private=${isPrivate}`;
	call += `&cost_choice=${costChoice}`;
	call += `&auto_start=${autoStart}`;
	return await sendServerCall(SERVER,call,true,true);
}

async function trialsJoinCampaign(joinKey,playerIndex) {
	let call = `${PARAM_CALL}=trialsjoincampaign`;
	call += `&join_key=${joinKey}`;
	call += `&player_index=${playerIndex}`;
	return await sendServerCall(SERVER,call,true,true);
}

async function trialsPickRoleHero(roleId,heroId,costChoice) {
	let call = `${PARAM_CALL}=trialspickrolehero`;
	call += `&role_id=${roleId}`;
	call += `&hero_id=${heroId}`;
	call += `&cost_choice=${cost_choice}`;
	return await sendServerCall(SERVER,call,true,true);
}

async function saveFormation(formId,campId,name,fav,formation,familiars,specs,feats,overwrite) {
	if (formId==undefined||campId==undefined||name==undefined) return;
	let call = `${PARAM_CALL}=SaveFormation`;
	call += `&formation_save_id=${formId}`;
	call += `&campaign_id=${campId}`;
	call += `&name=${name}`;
	call += `&favorite=` + (fav==undefined ? 0 : fav);
	call += `&formation=` + (formation==undefined ? "[]" : formation)
	call += `&familiars=` + (familiars==undefined ? "{}" : familiars)
	call += `&specializations=` + (specs==undefined ? "{}" : specs)
	call += `&feats=` + (feats==undefined ? "{}" : feats)
	return await sendServerCall(SERVER,call,true,true);
}

async function purchasePatronShopItem(patronId,shopItemId,count) {
	let call = `${PARAM_CALL}=purchasepatronshopitem`;
	call += `&patron_id=${patronId}`;
	call += `&shop_item_id=${shopItemId}`;
	call += `&count=${count}`;
	return await sendServerCall(SERVER,call,true,true);
}

async function saveModron(coreId,gameInstanceId,buffs) {
	let userDetails = await getUserDetails();
	let modronSave = userDetails.details.modron_saves[coreId];
	let grid = JSON.stringify(modronSave.grid);
	let formationSaves = JSON.stringify(modronSave.formation_saves);
	let areaGoal = modronSave.area_goal;
	let buffsStr = JSON.stringify(buffs);
	let checkinTimestamp = (Date.now() / 1000) + 604800;
	let properties = JSON.stringify(modronSave.properties);
	
	let call = `${PARAM_CALL}=saveModron`;
	call += `&core_id=${coreId}`;
	call += `&grid=${grid}`;
	call += `&game_instance_id=${gameInstanceId}`;
	call += `&formation_saves=${formationSaves}`;
	call += `&area_goal=${areaGoal}`;
	call += `&buffs=${buffsStr}`;
	call += `&checkin_timestamp=${checkinTimestamp}`;
	call += `&properties=${properties}`;
	return await sendServerCall(SERVER,call,true,true);
}

async function redeemCombination(combo) {
	let call = `${PARAM_CALL}=redeemcoupon`;
	call += `&code=${combo}`;
	return await sendServerCall(SERVER,call,true,true);
}

async function useSummonScroll(heroId) {
	let call = `${PARAM_CALL}=usesummonscoll`;
	call += `&hero_id=${heroId}`;
	return await sendServerCall(SERVER,call,true,true);
}

async function getDismantleData() {
	let call = `${PARAM_CALL}=getredistributehero`;
	return await sendServerCall(SERVER,call,true,true);
}

async function dismantleHero(heroId,redistId) {
	let call = `${PARAM_CALL}=redistributehero`;
	call += `&hero_id=${heroId}`;
	call += `&redistribute_id=${redistId}`;
	return await sendServerCall(SERVER,call,true,true);
}

async function saveInstanceName(name,instanceId) {
	let call = `${PARAM_CALL}=saveinstancename`;
	call += `&name=${name}`;
	call += `&game_instance_id=${instanceId}`;
	return await sendServerCall(SERVER,call,true,true);
}

async function buySoftCurrencyChest(chestId,count) {
	let call = `${PARAM_CALL}=buysoftcurrencychest`;
	call += `&chest_type_id=${chestId}`;
	call += `&count=${count}`;
	let tokens=(chestId==1||chestId==2?0:1);
	call += `&spend_event_v2_tokens=${tokens}`;
	return await sendServerCall(SERVER,call,true,true);
}

async function openGenericChest(chestId,count) {
	let call = `${PARAM_CALL}=opengenericchest`;
	call += `&gold_per_second=0`;
	call += `&checksum=4c5f019b6fc6eefa4d47d21cfaf1bc68`;
	call += `&chest_type_id=${chestId}`;
	call += `&count=${count}`;
	return await sendServerCall(SERVER,call,true,true);
}

async function getShop() {
	let call = `${PARAM_CALL}=getshop`;
	return await sendServerCall(SERVER,call,true,true);
}

async function setCurrentObjective(instanceId,adventureId,patronId) {
	let call = `${PARAM_CALL}=setcurrentobjective`;
	call += `&patron_tier=0`;
	call += `&game_instance_id=${instanceId}`;
	call += `&adventure_id=${adventureId}`;
	call += `&patron_id=${patronId}`;
	return await sendServerCall(SERVER,call,true,true);
}

async function endCurrentObjective(instanceId) {
	let call = `${PARAM_CALL}=softreset`;
	call += `&game_instance_id=${instanceId}`;
	return await sendServerCall(SERVER,call,true,true);
}

async function getLegendaryDetails() {
	let call = `${PARAM_CALL}=getlegendarydetails`;
	return await sendServerCall(SERVER,call,true,true);
}

async function getCampaignDetails() {
	let call = `${PARAM_CALL}=getcampaigndetails`;
	return await sendServerCall(SERVER,call,true,true);
}

async function getDailyLoginRewards() {
	let call = `${PARAM_CALL}=getdailyloginrewards`;
	return await sendServerCall(SERVER,call,true,true);
}

async function revealWeeklyOffers() {
	let call = `${PARAM_CALL}=revealalacarteoffers`;
	return await sendServerCall(SERVER,call,true,true);
}

async function getWeeklyOffers() {
	let call = `${PARAM_CALL}=getalacarteoffers`;
	return await sendServerCall(SERVER,call,true,true);
}

async function purchaseWeeklyOffer(offerId) {
	let call = `${PARAM_CALL}=PurchaseALaCarteOffer`;
	call += `&offer_id=${offerId}`;
	return await sendServerCall(SERVER,call,true,true);
}

async function claimDailyLoginReward(isBoost) {
	let call = `${PARAM_CALL}=claimdailyloginreward`;
	if (isBoost != undefined && isBoost)
		call += `&is_boost=1`;
	return await sendServerCall(SERVER,call,true,true);
}

async function getDynamicDialog(dialog) {
	let call = `${PARAM_CALL}=getdynamicdialog`;
	call += `&dialog=${dialog}`;
	call += `&ui_type=standard`;
	return await sendServerCall(SERVER,call,true,true);
}

async function claimSaleBonus(premiumId) {
	let call = `${PARAM_CALL}=claimsalebonus`;
	call += `&premium_item_id=${premiumId}`;
	call += `&return_all_items_live=1`;
	call += `&return_all_items_ever=0`;
	call += `&show_hard_currency=1`;
	call += `&prioritize_item_category=recommend`;
	return await sendServerCall(SERVER,call,true,true);
}

function appendUserData() {
	return `&${PARAM_USERID}=${userIdent[0]}&${PARAM_USERHASH}=${userIdent[1]}`;
}

async function appendInstanceId() {
	if (instanceId==``)
		await getUpdatedInstanceId()
	return `&${PARAM_INSTANCEID}=${instanceId}`;
}

function appendBoilerplate() {
	return `&language_id=1&timestamp=0&request_id=0&mobile_client_version=99999&include_free_play_objectives=true&instance_key=1&offline_v2_build=1&localization_aware=true`;
}

async function sendServerCall(server,call,addUserData,addInstanceId) {
	if (addUserData)
		call += appendUserData();
	if (addInstanceId)
		call += await appendInstanceId();
	call += appendBoilerplate();
	if (server==``) {
		if (SERVER==``)
			await getPlayServerFromMaster();
		server = SERVER;
	}
	let response = await sendOutgoingCall(server,call);
	let limit = 0;
	while ((response[SPS]!=undefined||!response['success'])&&limit<RETRIES) {
		if (response[SPS]) {
			SERVER = response[SPS].replace(`http://`, `https://`);
			response = await sendOutgoingCall(SERVER,call);
		} else if (!response['success']) {
			if (response[FR]==OII) {
				console.log(`Got outdated instance id.`);
				let oldII = instanceId;
				await getUpdatedInstanceId();
				console.log(`Old: ${call}`)
				call = call.replace(oldII,instanceId);
				console.log(`New: ${call}`)
				response = await sendOutgoingCall(server,call);
			} else {
				// Unknown error.
				console.log(`${server}post.php?${call}`);
				console.log(` - Unknown Error: ${response[FR]}`);
				return response;
			}
		}
		limit++;
	}
	await sleep(200);
	return response;
}

async function sendOutgoingCall(server,call) {
	let url = `${server}post.php?${call}`;
	let response = await fetch(url)
		.then(response => response.text())
		.catch(err => console.log(err));
	return await JSON.parse(response);
}