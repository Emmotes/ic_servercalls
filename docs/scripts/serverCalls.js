const vs = 3.023; // prettier-ignore
const STATUS = "https://ic-server-status.emmote0.workers.dev/ic_server_status";
const M = `https://master.idlechampions.com/~idledragons/`;
const SPS = `switch_play_server`;
const FR = `failure_reason`;
const OII = `Outdated instance id`;
const PARAM_CALL = `call`;
const PARAM_INSTANCEID = `instance_id`;
const PARAM_USERID = `user_id`;
const PARAM_USERHASH = `hash`;
const RETRIES = 4;
let currAccount = undefined;
let SERVER = ``;
let instanceId = ``;
let boilerplate = ``;

async function getPlayServerForDefinitions() {
	const response = await sendServerCall(
		M,
		"getPlayServerForDefinitions",
		undefined,
		false,
		false,
	);
	SERVER = response["play_server"];
}

async function getUserDetails() {
	const deets = await sendServerCall(
		SERVER,
		"getuserdetails",
		undefined,
		true,
	);
	getUpdatedInstanceId(deets);
	return deets;
}

async function getUpdatedInstanceId(deets) {
	if (deets == null) deets = await getUserDetails();
	instanceId = deets.details.instance_id;
}

async function getDefinitions(filter, checksum) {
	const params = [
		["supports_chunked_defs", 0],
		["new_achievements", 1],
		["challenge_sets_no_deltas", 0],
	];
	if (checksum != null) params.push(["checksum", checksum]);
	if (checksum == null && filter != null && filter !== ``)
		params.push(["filter", filter]);
	return await sendServerCall(SERVER, "getdefinitions", params);
}

async function getPatronDetails() {
	return await sendServerCall(
		SERVER,
		"getpatrondetails",
		undefined,
		true,
		true,
	);
}

async function getFormationSaves() {
	return await sendServerCall(
		SERVER,
		"getallformationsaves",
		undefined,
		true,
		true,
	);
}

async function deleteFormationSave(formId) {
	const params = [["formation_save_id", formId]];
	return await sendServerCall(
		SERVER,
		"DeleteFormationSave",
		params,
		true,
		true,
	);
}

async function getUserGameInstance(gameInstanceId) {
	const params = [["game_instance_id", gameInstanceId]];
	return await sendServerCall(
		SERVER,
		"getusergameinstance",
		params,
		true,
		true,
	);
}

async function openTimeGate(heroId) {
	const params = [["champion_id", heroId]];
	return await sendServerCall(SERVER, "opentimegate", params, true, true);
}

async function closeTimeGate() {
	return await sendServerCall(SERVER, "closetimegate", undefined, true, true);
}

async function purchaseFeat(featId) {
	const params = [["feat_id", featId]];
	return await sendServerCall(SERVER, "purchasefeat", params, true, true);
}

async function forgeLegendary(heroId, slotId) {
	const params = [
		["hero_id", heroId],
		["slot_id", slotId],
	];
	return await sendServerCall(
		SERVER,
		"craftlegendaryitem",
		params,
		true,
		true,
	);
}

async function upgradeLegendary(heroId, slotId) {
	const params = [
		["hero_id", heroId],
		["slot_id", slotId],
	];
	return await sendServerCall(
		SERVER,
		"upgradelegendaryitem",
		params,
		true,
		true,
	);
}

async function reforgeLegendary(heroId, slotId) {
	const params = [
		["hero_id", heroId],
		["slot_id", slotId],
	];
	return await sendServerCall(
		SERVER,
		"changelegendaryitem",
		params,
		true,
		true,
	);
}

async function useServerBuff(buffId, heroId, slotId, count) {
	const params = [
		["buff_id", buffId],
		["hero_id", heroId],
		["slot_id", slotId],
		["num_uses", count],
	];
	return await sendServerCall(SERVER, "useServerBuff", params, true, true);
}

async function trialsRefreshData() {
	return await sendServerCall(
		SERVER,
		"trialsrefreshdata",
		undefined,
		true,
		true,
	);
}

async function trialsCreateCampaign(
	difficultyId,
	isPrivate,
	prismatic,
	autoStart,
) {
	const params = [
		["difficulty_id", difficultyId],
		["private", isPrivate ? `True` : `False`],
		[
			"cost_choice",
			difficultyId === 1 ? -1
			: prismatic ? `1`
			: `0`,
		],
		["auto_start", autoStart ? `True` : `False`],
	];
	return await sendServerCall(
		SERVER,
		"trialsopencampaign",
		params,
		true,
		true,
	);
}

async function trialsJoinCampaign(joinKey) {
	const params = [
		["join_key", joinKey],
		["player_index", 0],
	];
	return await sendServerCall(
		SERVER,
		"trialsjoincampaign",
		params,
		true,
		true,
	);
}

async function trialsKickPlayer(playerIndex) {
	const params = [["player_index", playerIndex]];
	return await sendServerCall(SERVER, "trialskickplayer", params, true, true);
}

async function trialsStartCampaign(campaignId) {
	const params = [["campaign_id", campaignId]];
	return await sendServerCall(
		SERVER,
		"trialsstartcampaign",
		params,
		true,
		true,
	);
}

async function trialsPickRoleHero(roleId, heroId, prismatic) {
	const params = [
		["role_id", roleId],
		["hero_id", heroId],
		["cost_choice", prismatic ? 1 : 0],
	];
	return await sendServerCall(
		SERVER,
		"trialspickrolehero",
		params,
		true,
		true,
	);
}

async function trialsClaimRewards(campaignId) {
	const params = [["campaign_id", campaignId]];
	return await sendServerCall(
		SERVER,
		"trialsclaimrewards",
		params,
		true,
		true,
	);
}

async function saveFormation(
	formId,
	campId,
	name,
	fav,
	formation,
	familiars,
	specs,
	feats,
) {
	if (campId == null || name == null) return;
	const params = [
		["campaign_id", campId],
		["name", name],
		["favorite", fav || 0],
		["formation", formation || "[]"],
		["familiars", familiars || "{}"],
		["specializations", specs || "{}"],
		["feats", feats || "{}"],
	];
	if (formId > 0) params.push(["formation_save_id", formId]);
	return await sendServerCall(SERVER, "SaveFormation", params, true, true);
}

async function purchasePatronShopItem(patronId, shopItemId, count) {
	const params = [
		["patron_id", patronId],
		["shop_item_id", shopItemId],
		["count", count],
	];
	return await sendServerCall(
		SERVER,
		"purchasepatronshopitem",
		params,
		true,
		true,
	);
}

async function saveModron(
	coreId,
	grid,
	gameInstanceId,
	formationSaves,
	areaGoal,
	buffs,
	properties,
) {
	const checkinTimestamp = Date.now() / 1000 + 604800;
	const params = [
		["core_id", coreId],
		["grid", JSON.stringify(grid)],
		["game_instance_id", gameInstanceId],
		["formation_saves", JSON.stringify(formationSaves)],
		["area_goal", areaGoal],
		["buffs", JSON.stringify(buffs)],
		["checkin_timestamp", checkinTimestamp],
		["properties", JSON.stringify(properties)],
	];
	return await sendServerCall(SERVER, "saveModron", params, true, true);
}

async function redeemCombination(combo) {
	const params = [["code", combo]];
	return await sendServerCall(SERVER, "redeemcoupon", params, true, true);
}

async function useSummonScroll(heroId) {
	const params = [["hero_id", heroId]];
	return await sendServerCall(SERVER, "usesummonscoll", params, true, true);
}

async function exchangeSummonScroll(count) {
	const params = [["count", count]];
	return await sendServerCall(
		SERVER,
		"exchangesummonscroll",
		params,
		true,
		true,
	);
}

async function useGildingScroll(heroId) {
	const params = [["hero_id", heroId]];
	return await sendServerCall(SERVER, "usegildingscroll", params, true, true);
}

async function getDismantleData() {
	return await sendServerCall(
		SERVER,
		"getredistributehero",
		undefined,
		true,
		true,
	);
}

async function dismantleHero(heroId, redistId) {
	const params = [
		["hero_id", heroId],
		["redistribute_id", redistId],
	];
	return await sendServerCall(SERVER, "redistributehero", params, true, true);
}

async function saveInstanceName(name, instanceId) {
	const params = [
		["name", name],
		["game_instance_id", instanceId],
	];
	return await sendServerCall(SERVER, "saveinstancename", params, true, true);
}

async function buySoftCurrencyChest(chestId, count) {
	const params = [
		["chest_type_id", chestId],
		["count", count],
		["spend_event_v2_tokens", chestId > 2 ? 1 : 0],
	];
	return await sendServerCall(
		SERVER,
		"buysoftcurrencychest",
		params,
		true,
		true,
	);
}

async function openGenericChest(chestId, count, packId) {
	const params = [
		["gold_per_second", 0],
		["checksum", "4c5f019b6fc6eefa4d47d21cfaf1bc68"],
		["chest_type_id", chestId],
		["count", count],
	];
	if (packId != null) params.push(["pack_id", packId]);
	return await sendServerCall(SERVER, "opengenericchest", params, true, true);
}

async function getShop() {
	const params = [
		["return_all_items_live", 1],
		["return_all_items_ever", 0],
		["show_hard_currency", 1],
		["prioritize_item_category", "recommend"],
	];
	return await sendServerCall(SERVER, "getshop", params, true, true);
}

async function setCurrentObjective(
	instanceId,
	adventureId,
	patronId,
	timeGateObjective,
) {
	// Use patronId OR timeGateObjective. Never both.
	const params = [
		["game_instance_id", instanceId],
		["adventure_id", adventureId],
	];
	if (patronId != null && timeGateObjective != null) {
		console.error(
			"Cannot set a patronId and a timeGateObjective in the same call.",
		);
		return {};
	} else if (timeGateObjective !== undefined) {
		params.push(["time_gate_objective", timeGateObjective]);
	} else {
		params.push(["patron_tier", 0]);
		params.push(["patron_id", patronId || 0]);
	}
	return await sendServerCall(
		SERVER,
		"setcurrentobjective",
		params,
		true,
		true,
	);
}

async function endCurrentObjective(instanceId) {
	const params = [["game_instance_id", instanceId]];
	return await sendServerCall(SERVER, "softreset", params, true, true);
}

async function getLegendaryDetails() {
	return await sendServerCall(
		SERVER,
		"getlegendarydetails",
		undefined,
		true,
		true,
	);
}

async function getCampaignDetails() {
	return await sendServerCall(
		SERVER,
		"getcampaigndetails",
		undefined,
		true,
		true,
	);
}

async function getDailyLoginRewards() {
	return await sendServerCall(
		SERVER,
		"getdailyloginrewards",
		undefined,
		true,
		true,
	);
}

async function revealWeeklyOffers() {
	return await sendServerCall(
		SERVER,
		"revealalacarteoffers",
		undefined,
		true,
		true,
	);
}

async function getWeeklyOffers() {
	return await sendServerCall(
		SERVER,
		"getalacarteoffers",
		undefined,
		true,
		true,
	);
}

async function rerollWeeklyOffer(offerId) {
	const params = [["offer_id", offerId]];
	return await sendServerCall(
		SERVER,
		"rerollalacarteoffer",
		params,
		true,
		true,
	);
}

async function purchaseWeeklyOffer(offerId) {
	const params = [["offer_id", offerId]];
	return await sendServerCall(
		SERVER,
		"PurchaseALaCarteOffer",
		params,
		true,
		true,
	);
}

async function claimDailyLoginReward(isBoost) {
	const params = isBoost ? [["is_boost", 1]] : undefined;
	return await sendServerCall(
		SERVER,
		"claimdailyloginreward",
		params,
		true,
		true,
	);
}

async function getDynamicDialog(dialog) {
	const params = [
		["dialog", dialog],
		["ui_type", "standard"],
	];
	return await sendServerCall(SERVER, "getdynamicdialog", params, true, true);
}

async function claimSaleBonus(premiumId) {
	const params = [
		["premium_item_id", premiumId],
		["return_all_items_live", 1],
		["return_all_items_ever", 0],
		["show_hard_currency", 1],
		["prioritize_item_category", "recommend"],
	];
	return await sendServerCall(SERVER, "claimsalebonus", params, true, true);
}

async function convertContracts(
	sourceBuffId,
	resultBuffId,
	count,
	toEventTokens,
) {
	const params = [
		["source_buff_id", sourceBuffId],
		["result_buff_id", resultBuffId],
		["count", count],
		["to_event_tokens", toEventTokens ? 1 : 0],
	];
	return await sendServerCall(SERVER, "convertcontracts", params, true, true);
}

async function purchaseNotaryChestBundle(chestId, count) {
	const params = [
		["chest_type_id", chestId],
		["count", count],
	];
	return await sendServerCall(
		SERVER,
		"purchasenotarychestbundle",
		params,
		true,
		true,
	);
}

async function distillPotions(pots) {
	// {"id":amount,"id":amount,etc..
	const params = [["to_distill", JSON.stringify(pots)]];
	return await sendServerCall(SERVER, "distillpotions", params, true, true);
}

async function brewPotions(buffId, count) {
	const params = [
		["buff_id", buffId],
		["count", count],
	];
	return await sendServerCall(SERVER, "brewpotions", params, true, true);
}

async function enhancePotions(sourceBuffId, resultBuffId, count) {
	const params = [
		["source_buff_id", sourceBuffId],
		["result_buff_id", resultBuffId],
		["count", count],
	];
	return await sendServerCall(SERVER, "enhancepotions", params, true, true);
}

async function getCompletionData() {
	const params = [["level", 0]];
	return await sendServerCall(
		SERVER,
		"getcompletiondata",
		params,
		true,
		true,
	);
}

async function getPlayHistory(page, includeGems) {
	const types = [0, 1, 2, 3, 6, 11, 12, 13, 19, 20, 21, 28, 30, 37, 45, 50];
	if (includeGems) {
		types.push(18);
		types.sort();
	}
	const params = [
		["page", page],
		["types", types],
	];
	return await sendServerCall(SERVER, "getPlayHistory", params, true, true);
}

async function claimCollectionQuestRewards(questId) {
	// Use -1 questId to claim all.
	const params = [["collection_quest_id", questId]];
	return await sendServerCall(
		SERVER,
		"claimcollectionquestrewards",
		params,
		true,
		true,
	);
}

async function getEventsDetails() {
	return await sendServerCall(
		SERVER,
		"geteventsdetails",
		undefined,
		true,
		true,
	);
}

async function pickEventFlexHero(eventId, heroId, flexSlotId, resetHero) {
	const params = [
		["event_id", eventId],
		["hero_id", heroId],
		["slot_id", flexSlotId],
		["reset_tiers", resetHero ? 1 : 0],
	];
	return await sendServerCall(
		SERVER,
		"pickeventflexhero",
		params,
		true,
		true,
	);
}

async function getActiveTasksData() {
	return await sendServerCall(
		SERVER,
		"getactivetasksdata",
		undefined,
		true,
		true,
	);
}

async function purchaseVaultItem(itemType, itemId) {
	const params = [
		["item_type", itemType],
		["item_id", itemId],
	];
	return await sendServerCall(
		SERVER,
		"purchaseshopvaultoffer",
		params,
		true,
		true,
	);
}

async function getMasteryChallengeData() {
	return await sendServerCall(
		SERVER,
		"getmasterychallengesdata",
		undefined,
		true,
		true,
	);
}

async function setMasteryChallengeOptions(challengeId, restrictions) {
	// Restrictions should be an array of integers.
	const params = [
		["challenge_id", challengeId],
		["restrictions", JSON.stringify(restrictions)],
	];
	return await sendServerCall(
		SERVER,
		"setmasterychallengeoptions",
		params,
		true,
		true,
	);
}

async function purchaseCardSleeve(sleeveId, heroId, autoEquip) {
	const params = [
		["sleeve_id", sleeveId],
		["hero_id", heroId],
		["auto_equip", autoEquip ? 1 : 0],
	];
	return await sendServerCall(
		SERVER,
		"purchasecardsleeve",
		params,
		true,
		true,
	);
}

async function equipCardSleeve(sleeveId, heroId) {
	const params = [
		["sleeve_id", sleeveId],
		["hero_id", heroId],
	];
	return await sendServerCall(SERVER, "equipcardsleeve", params, true, true);
}

async function unequipCardSleeve(heroId) {
	const params = [["hero_id", heroId]];
	return await sendServerCall(SERVER, "equipcardsleeve", params, true, true);
}

async function getServerStatus() {
	const res = await fetch(STATUS, {});
	if (!res.ok) throw new Error(`Status fetch failed: ${res.status}`);

	return await res.json();
}

function appendUserData() {
	return buildParams([
		[PARAM_USERID, currAccount.id],
		[PARAM_USERHASH, currAccount.hash],
	]);
}

async function appendInstanceId() {
	if (instanceId === ``) await getUpdatedInstanceId();
	return buildParams([[PARAM_INSTANCEID, instanceId]]);
}

function appendBoilerplate() {
	if (boilerplate == null || boilerplate === ``)
		boilerplate = buildParams([
			["language_id", 1],
			["timestamp", 0],
			["request_id", 0],
			["mobile_client_version", 99999],
			["include_free_play_objectives", "true"],
			["instance_key", 1],
			["offline_v2_build", 1],
			["localization_aware", "true"],
		]);
	return boilerplate;
}

function buildParams(paramList) {
	let params = ``;
	for (let param of paramList) params += `&${param[0]}=${param[1]}`;
	return params;
}

async function sendServerCall(
	server,
	callType,
	params,
	addUserData,
	addInstanceId,
	customTimeout,
) {
	let call = `${PARAM_CALL}=${callType}`;
	if (params != null) call += buildParams(params);
	if (addUserData) call += appendUserData();
	if (addInstanceId) call += await appendInstanceId();
	call += appendBoilerplate();
	if (server === ``) {
		if (SERVER === ``) await getPlayServerForDefinitions();
		server = SERVER;
	}
	let response = await sendOutgoingCall(server, call, customTimeout);
	let limit = 0;
	while ((response[SPS] != null || !response["success"]) && limit < RETRIES) {
		if (response[SPS]) {
			server = SERVER = response[SPS].replace(`http://`, `https://`);
			response = await sendOutgoingCall(server, call, customTimeout);
		} else if (!response["success"]) {
			if (response[FR] === OII) {
				console.log(`Got outdated instance id.`);
				let oldII = instanceId;
				await getUpdatedInstanceId();
				console.log(`Old: ${call}`);
				call = call.replace(oldII, instanceId);
				console.log(`New: ${call}`);
				response = await sendOutgoingCall(server, call, customTimeout);
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

async function sendOutgoingCall(server, call, customTimeout) {
	const url = `${server}post.php?${call}`;
	const errTxt = `Server ps${server.replace(
		/[^0-9]/g,
		``,
	)} appears to be dead`;
	const timeoutTime =
		Number.isInteger(customTimeout) && customTimeout > 0 ?
			customTimeout
		:	40000;
	try {
		const response = await fetch(url, {
			signal: AbortSignal.timeout(timeoutTime),
		});
		await sleep(200);
		if (response.ok) return await JSON.parse(await response.text());
		else {
			if (response.status === 502) throw new Error(errTxt);
			if (response.status === 500) throw new Error(errTxt);
			if (response.status === 404) throw new Error(errTxt);
			throw new Error(response.status);
		}
	} catch (error) {
		if (error.name === "TimeoutError" || error.name === "AbortError")
			throw new Error(
				`Timed out. Took more than ${
					timeoutTime / 1000
				} seconds to get a response`,
			);
		console.error("Fetch", error);
		throw error;
	}
}
