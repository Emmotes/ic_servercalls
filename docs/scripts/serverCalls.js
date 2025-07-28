const vs=3.013;
const M=`https://master.idlechampions.com/~idledragons/`;
const SPS=`switch_play_server`;
const FR=`failure_reason`;
const OII=`Outdated instance id`;
const PARAM_CALL=`call`;
const PARAM_INSTANCEID=`instance_id`;
const PARAM_USERID=`user_id`;
const PARAM_USERHASH=`hash`;
const RETRIES=4;
var currAccount=undefined;
var SERVER=``;
var instanceId=``;
var boilerplate=``;

async function getPlayServerFromMaster() {
	let response = await sendServerCall(M,'getPlayServerForDefinitions');
	SERVER = response['play_server'];
}

async function getUserDetails() {
	let deets = await sendServerCall(SERVER,'getuserdetails',undefined,true);
	getUpdatedInstanceId(deets);
	return deets;
}

async function getUpdatedInstanceId(deets) {
	if (deets==undefined)
		deets = await getUserDetails();
	instanceId = deets.details.instance_id;
}

async function getDefinitions(filter) {
	let params = [
		['supports_chunked_defs',0],
		['new_achievements',1],
		['challenge_sets_no_deltas',0]
	];
	if (filter!=undefined&&filter!=``)
		params.push(
			['filter',filter]
		);
	return await sendServerCall(SERVER,'getdefinitions',params);
}

async function getPatronDetails() {
	return await sendServerCall(SERVER,'getpatrondetails',undefined,true,true);
}

async function getFormationSaves() {
	return await sendServerCall(SERVER,'getallformationsaves',undefined,true,true);
}

async function deleteFormationSave(formId) {
	let params = [
		['formation_save_id',formId]
	];
	return await sendServerCall(SERVER,'DeleteFormationSave',params,true,true);
}

async function openTimeGate(heroId) {
	let params = [
		['champion_id',heroId]
	];
	return await sendServerCall(SERVER,'opentimegate',params,true,true);
}

async function closeTimeGate() {
	return await sendServerCall(SERVER,'closetimegate',undefined,true,true);
}

async function purchaseFeat(featId) {
	let params = [
		['feat_id',featId]
	];
	return await sendServerCall(SERVER,'purchasefeat',params,true,true);
}

async function forgeLegendary(heroId,slotId) {
	let params = [
		['hero_id',heroId],
		['slot_id',slotId]
	];
	return await sendServerCall(SERVER,'craftlegendaryitem',params,true,true);
}

async function upgradeLegendary(heroId,slotId) {
	let params = [
		['hero_id',heroId],
		['slot_id',slotId]
	];
	return await sendServerCall(SERVER,'upgradelegendaryitem',params,true,true);
}

async function reforgeLegendary(heroId,slotId) {
	let params = [
		['hero_id',heroId],
		['slot_id',slotId]
	];
	return await sendServerCall(SERVER,'changelegendaryitem',params,true,true);
}

async function useServerBuff(buffId,heroId,slotId,count) {
	let params = [
		['buff_id',buffId],
		['hero_id',heroId],
		['slot_id',slotId],
		['num_uses',count]
	];
	return await sendServerCall(SERVER,'useServerBuff',params,true,true);
}

async function trialsRefreshData() {
	return await sendServerCall(SERVER,'trialsrefreshdata',undefined,true,true);
}

async function trialsCreateCampaign(difficultyId,isPrivate,prismatic,autoStart) {
	let params = [
		['difficulty_id',difficultyId],
		['private',isPrivate?`True`:`False`],
		['cost_choice',difficultyId==1?-1:(prismatic?`1`:`0`)],
		['auto_start',autoStart?`True`:`False`]
	];
	return await sendServerCall(SERVER,'trialsopencampaign',params,true,true);
}

async function trialsJoinCampaign(joinKey) {
	let params = [
		['join_key',joinKey],
		['player_index',0]
	];
	return await sendServerCall(SERVER,'trialsjoincampaign',params,true,true);
}

async function trialsKickPlayer(playerIndex) {
	let params = [
		['player_index',playerIndex]
	];
	return await sendServerCall(SERVER,'trialskickplayer',params,true,true);
}

async function trialsStartCampaign(campaignId) {
	let params = [
		['campaign_id',campaignId]
	];
	return await sendServerCall(SERVER,'trialsstartcampaign',params,true,true);
}

async function trialsPickRoleHero(roleId,heroId,prismatic) {
	let params = [
		['role_id',roleId],
		['hero_id',heroId],
		['cost_choice',prismatic?1:0]
	];
	return await sendServerCall(SERVER,'trialspickrolehero',params,true,true);
}

async function trialsClaimRewards(campaignId) {
	let params = [
		['campaign_id',campaignId]
	];
	return await sendServerCall(SERVER,'trialsclaimrewards',params,true,true);
}

async function saveFormation(formId,campId,name,fav,formation,familiars,specs,feats,overwrite) {
	if (formId==undefined||campId==undefined||name==undefined)
		return;
	let params = [
		['formation_save_id',formId],
		['campaign_id',campId],
		['name',name],
		['favorite',fav || 0],
		['formation',formation || "[]"],
		['familiars',familiars || "{}"],
		['specializations',specs || "{}"],
		['feats',feats || "{}"]
	];
	return await sendServerCall(SERVER,'SaveFormation',params,true,true);
}

async function purchasePatronShopItem(patronId,shopItemId,count) {
	let params = [
		['patron_id',patronId],
		['shop_item_id',shopItemId],
		['count',count]
	];
	return await sendServerCall(SERVER,'purchasepatronshopitem',params,true,true);
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
	
	let params = [
		['core_id',coreId],
		['grid',grid],
		['game_instance_id',gameInstanceId],
		['formation_saves',formationSaves],
		['area_goal',areaGoal],
		['buffs',buffsStr],
		['checkin_timestamp',checkinTimestamp],
		['properties',properties]
	];
	return await sendServerCall(SERVER,'saveModron',params,true,true);
}

async function redeemCombination(combo) {
	let params = [
		['code',combo]
	];
	return await sendServerCall(SERVER,'redeemcoupon',params,true,true);
}

async function useSummonScroll(heroId) {
	let params = [
		['hero_id',heroId]
	];
	return await sendServerCall(SERVER,'usesummonscoll',params,true,true);
}

async function getDismantleData() {
	return await sendServerCall(SERVER,'getredistributehero',undefined,true,true);
}

async function dismantleHero(heroId,redistId) {
	let params = [
		['hero_id',heroId],
		['redistribute_id',redistId]
	];
	return await sendServerCall(SERVER,'redistributehero',params,true,true);
}

async function saveInstanceName(name,instanceId) {
	let params = [
		['name',name],
		['game_instance_id',instanceId]
	];
	return await sendServerCall(SERVER,'saveinstancename',params,true,true);
}

async function buySoftCurrencyChest(chestId,count) {
	let params = [
		['chest_type_id',chestId],
		['count',count],
		['spend_event_v2_tokens',(chestId > 2 ? 1 : 0)]
	];
	return await sendServerCall(SERVER,'buysoftcurrencychest',params,true,true);
}

async function openGenericChest(chestId,count,packId) {
	let params = [
		['gold_per_second',0],
		['checksum','4c5f019b6fc6eefa4d47d21cfaf1bc68'],
		['chest_type_id',chestId],
		['count',count]
	];
	if (packId!=undefined)
		params.push(['pack_id',packId]);
	return await sendServerCall(SERVER,'opengenericchest',params,true,true);
}

async function getShop() {
	let params = [
		['return_all_items_live',1],
		['return_all_items_ever',0],
		['show_hard_currency',1],
		['prioritize_item_category','recommend']
	];
	return await sendServerCall(SERVER,'getshop',params,true,true);
}

async function setCurrentObjective(instanceId,adventureId,patronId) {
	let params = [
		['patron_tier',0],
		['game_instance_id',instanceId],
		['adventure_id',adventureId],
		['patron_id',patronId]
	];
	return await sendServerCall(SERVER,'setcurrentobjective',params,true,true);
}

async function endCurrentObjective(instanceId) {
	let params = [
		['game_instance_id',instanceId]
	];
	return await sendServerCall(SERVER,'softreset',params,true,true);
}

async function getLegendaryDetails() {
	return await sendServerCall(SERVER,'getlegendarydetails',undefined,true,true);
}

async function getCampaignDetails() {
	return await sendServerCall(SERVER,'getcampaigndetails',undefined,true,true);
}

async function getDailyLoginRewards() {
	return await sendServerCall(SERVER,'getdailyloginrewards',undefined,true,true);
}

async function revealWeeklyOffers() {
	return await sendServerCall(SERVER,'revealalacarteoffers',undefined,true,true);
}

async function getWeeklyOffers() {
	return await sendServerCall(SERVER,'getalacarteoffers',undefined,true,true);
}

async function rerollWeeklyOffer(offerId) {
	let params = [
		['offer_id',offerId]
	];
	return await sendServerCall(SERVER,'rerollalacarteoffer',params,true,true);
}

async function purchaseWeeklyOffer(offerId) {
	let params = [
		['offer_id',offerId]
	];
	return await sendServerCall(SERVER,'PurchaseALaCarteOffer',params,true,true);
}

async function claimDailyLoginReward(isBoost) {
	let params = undefined;
	if (isBoost)
		params = [
			['is_boost',1]
		];
	return await sendServerCall(SERVER,'claimdailyloginreward',params,true,true);
}

async function getDynamicDialog(dialog) {
	let params = [
		['dialog',dialog],
		['ui_type','standard']
	];
	return await sendServerCall(SERVER,'getdynamicdialog',params,true,true);
}

async function claimSaleBonus(premiumId) {
	let params = [
		['premium_item_id',premiumId],
		['return_all_items_live',1],
		['return_all_items_ever',0],
		['show_hard_currency',1],
		['prioritize_item_category','recommend']
	];
	return await sendServerCall(SERVER,'claimsalebonus',params,true,true);
}

async function convertContracts(sourceBuffId,resultBuffId,count,toEventTokens) {
	let params = [
		['source_buff_id',sourceBuffId],
		['result_buff_id',resultBuffId],
		['count',count],
		['to_event_tokens',toEventTokens?1:0]
	];
	return await sendServerCall(SERVER,'convertcontracts',params,true,true);
}

async function purchaseNotaryChestBundle(chestId,count) {
	let params = [
		['chest_type_id',chestId],
		['count',count]
	];
	return await sendServerCall(SERVER,'purchasenotarychestbundle',params,true,true);
}

async function distillPotions(pots) {
	// {"id":amount,"id":amount,etc..
	let params = [
		['to_distill',JSON.stringify(pots)]
	];
	return await sendServerCall(SERVER,'distillpotions',params,true,true);
}

async function brewPotions(buffId,count) {
	let params = [
		['buff_id',buffId],
		['count',count]
	];
	return await sendServerCall(SERVER,'brewpotions',params,true,true);
}

async function enhancePotions(sourceBuffId,resultBuffId,count) {
	let params = [
		['source_buff_id',sourceBuffId],
		['result_buff_id',resultBuffId],
		['count',count]
	];
	return await sendServerCall(SERVER,'enhancepotions',params,true,true);
}

function appendUserData() {
	return buildParams([
		[PARAM_USERID,currAccount.id],
		[PARAM_USERHASH,currAccount.hash]
	]);
}

async function appendInstanceId() {
	if (instanceId==``)
		await getUpdatedInstanceId()
	return buildParams([
		[PARAM_INSTANCEID,instanceId]
	]);
}

function appendBoilerplate() {
	if (boilerplate == undefined || boilerplate == ``)
		boilerplate = buildParams([
			['language_id',1],
			['timestamp',0],
			['request_id',0],
			['mobile_client_version',99999],
			['include_free_play_objectives','true'],
			['instance_key',1],
			['offline_v2_build',1],
			['localization_aware','true']
		]);
	return boilerplate;
}

function buildParams(paramList) {
	let params = ``;
	for (let param of paramList)
		params += `&${param[0]}=${param[1]}`;
	return params;
}

async function sendServerCall(server,callType,params,addUserData,addInstanceId) {
	let call=`${PARAM_CALL}=${callType}`;
	if (params != undefined)
		call += buildParams(params);
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
			server = SERVER = response[SPS].replace(`http://`, `https://`);
			response = await sendOutgoingCall(server,call);
		} else if (!response['success']) {
			if (response[FR]==OII) {
				console.log(`Got outdated instance id.`);
				let oldII = instanceId;
				await getUpdatedInstanceId();
				console.log(`Old: ${call}`)
				call = call.replace(oldII,instanceId);
				console.log(`New: ${call}`)
				response = await sendOutgoingCall(server,call);
			} else if (response[FR].includes(`Security hash failure`)) {
				throw new Error(`Your user data is incorrect`);
			} else if (response[FR].includes(`non-atomic`)) {
				throw new Error(`Interrupted by non-atomic action`);
			} else {
				// Unknown error.
				console.log(`${server}post.php?${call}`);
				console.log(` - Unknown Error: ${response[FR]}`);
				throw new Error(response);
			}
		}
		limit++;
	}
	return response;
}

async function sendOutgoingCall(server,call) {
	let url = `${server}post.php?${call}`;
	let errTxt = `Server ps${server.replace(/[^0-9]/g,``)} appears to be dead`;
	try {
		let response = await fetch(url, {signal:AbortSignal.timeout(20000)});
		await sleep(200);
		if (response.ok)
			return await JSON.parse(await response.text());
		else {
			if (response.status === 502) throw new Error(errTxt);
			if (response.status === 500) throw new Error(errTxt);
			if (response.status === 404) throw new Error(errTxt);
			throw new Error(response.status);
		}
	} catch (error) {
		if (error.name === 'AbortError')
			throw new Error(`Timed out. ${errTxt}`);
		console.error('Fetch', error);
		throw error;
	}
	return `Unknown error`;
}