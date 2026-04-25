const vfs = 1.000; // prettier-ignore
const fs_LSKEY_settings = `scFreeStuffSettings`;
const fs_TIMERS = {
	main: 60 * 1000,
	starting: 60 * 1000,
	safety: 30 * 1000,
	no_timer: 8 * 60 * 60 * 1000,
	no_timer_rng: 30 * 60 * 1000,
};
const fs_DEFAULT_SETTINGS = {
	Platinum: true,
	Trials: true,
	FreeOffer: true,
	GuideQuests: true,
	BonusChests: true,
	Celebrations: true,
	OnLoad: false,
};
const fs_CHECKBOX_IDS = {
	Platinum: `freeStuffClaimDailyPlatinum`,
	Trials: `freeStuffClaimTrialsRewards`,
	FreeOffer: `freeStuffClaimFreeWeeklyShopOffers`,
	GuideQuests: `freeStuffClaimGuideQuests`,
	BonusChests: `freeStuffClaimFreePremiumBonusChests`,
	Celebrations: `freeStuffClaimCelebrationRewards`,
	OnLoad: `freeStuffClaimOnLoad`,
};
const fs_NAMES = {
	Platinum: `Daily Platinum`,
	Trials: `Trials Rewards`,
	FreeOffer: `Free Weekly Shop Offers`,
	GuideQuests: `Guide Quest Rewards`,
	BonusChests: `Free Premium Bonus Chests`,
	Celebrations: `Celebration Rewards`,
};
const fs_types = [
	`Platinum`,
	`Trials`,
	`FreeOffer`,
	`GuideQuests`,
	`BonusChests`,
	`Celebrations`,
];
const fs_TRIALS_STATUS = [
	[`Trials Status`, `Tiamat Dies in`, `Trial Joinable in`],
	[`Unknown`, `Tiamat is Dead`, `Inactive`, `Sitting in Lobby`, ``],
];
const fs_TIAMAT_HP = [40, 75, 130, 200, 290, 430, 610, 860, 1200, 1600];

const fs_state = {
	settings: {...fs_DEFAULT_SETTINGS},
	status: {},
	lastUpdate: 0,
	timers: {},
	loopIntervalId: null,
	loopBusy: false,
	loopNextTick: 0,
};

const fs_CHECK_FUNCTIONS = {
	Platinum: fs_checkPlatinum,
	Trials: fs_checkTrials,
	FreeOffer: fs_checkFreeWeeklyShopOffers,
	GuideQuests: fs_checkGuideQuests,
	BonusChests: fs_checkFreePremiumBonusChests,
	Celebrations: fs_checkCelebrationRewards,
};

const fs_CLAIM_FUNCTIONS = {
	Platinum: fs_claimPlatinum,
	Trials: fs_claimTrials,
	FreeOffer: fs_claimFreeWeeklyShopOffers,
	GuideQuests: fs_claimGuideQuests,
	BonusChests: fs_claimFreePremiumBonusChests,
	Celebrations: fs_claimCelebrationRewards,
};

function fs_tab() {
	const beta =
		(
			t_currentTabs.filter(
				(e) => e.id === "freeStuffTab" && e.flag === "beta",
			).length > 0
		) ?
			`<p><em style="color:var(--TangerineYellow)">Note: This tab is currently in beta.</em></p>`
		:	``;
	return `
					<span class="f fr w100 p5">
						<span class="f falc fjs ml2" style="width:100%">
							<h1>Claim Free Stuff</h1>
						</span>
					</span>
					<span class="f fr w100 p5">
						<span class="f fc fals fjs ml2" style="width:100%;position:relative">
							<p style="width:75%">Once initiated - this page will continuously and automatically check various in-game systems to find available free items.</p>
							${beta}
							<span class="f fc fals" style="position:absolute;top:-85px;font-size:0.85em;right:0;z-index:1">
								<span class="f fr falc">
									<input type="checkbox" id="freeStuffClaimDailyPlatinum" onclick="fs_updateSettings(this)" data-type="Platinum">
									<label for="freeStuffClaimDailyPlatinum">Claim Daily Platinum</label>
								</span>
								<span class="f fr falc">
									<input type="checkbox" id="freeStuffClaimTrialsRewards" onclick="fs_updateSettings(this)" data-type="Trials">
									<label for="freeStuffClaimTrialsRewards">Claim Trial Rewards</label>
								</span>
								<span class="f fr falc">
									<input type="checkbox" id="freeStuffClaimFreeWeeklyShopOffers" onclick="fs_updateSettings(this)" data-type="FreeOffer">
									<label for="freeStuffClaimFreeWeeklyShopOffers">Claim Free Weekly Shop Offers</label>
								</span>
								<span class="f fr falc">
									<input type="checkbox" id="freeStuffClaimGuideQuests" onclick="fs_updateSettings(this)" data-type="GuideQuests">
									<label for="freeStuffClaimGuideQuests">Claim Guide Quests</label>
								</span>
								<span class="f fr falc">
									<input type="checkbox" id="freeStuffClaimFreePremiumBonusChests" onclick="fs_updateSettings(this)" data-type="BonusChests">
									<label for="freeStuffClaimFreePremiumBonusChests">Claim Free Premium Bonus Chests</label>
								</span>
								<span class="f fr falc">
									<input type="checkbox" id="freeStuffClaimCelebrationRewards" onclick="fs_updateSettings(this)" data-type="Celebrations">
									<label for="freeStuffClaimCelebrationRewards">Claim Celebration Rewards</label>
								</span>
								<span class="f fr falc">
									<input type="checkbox" id="freeStuffClaimOnLoad" onclick="fs_toggleClaimOnLoad(this.checked)">
									<label for="freeStuffClaimOnLoad">Start Automatically on Load</label>
								</span>
							</span>
						</span>
					</span>
					<span class="f fr w100 p5">
						&nbsp;
					</span>
					<span class="f fr w100 p5" style="height:34px;">
						<span class="f falc fje mr2" style="width:50%;" id="checkFreeStuffButtonContainer">
							<input type="button" onClick="fs_toggleFreeStuffChecker()" name="checkFreeStuffButton" id="checkFreeStuffButton" value="Start Automated Claimer" style="min-width:175px">
							<span id="checkFreeStuffButtonDisabled" class="f fjc" style="font-size:0.9em" hidden>&nbsp;</span>
						</span>
					</span>
					<span class="f fr w100 p5">
						&nbsp;
					</span>
					<span class="formsWrapper" style="grid-template-columns:repeat(auto-fill,400px);" id="freeStuffWrapper">
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

async function fs_toggleFreeStuffChecker() {
	const tabs = t_currentTabs.filter((e) => e.id === `freeStuffTab`);
	if (tabs.length !== 1)
		return;
	const tab = tabs[0];
	if (!tab.visible || (tab.flag != null && !f_getSiteFlags().has(tab.flag)))
		return;

	let running = fs_state.loopIntervalId != null;
	if (!running) fs_startTimersLoop();
	else {
		clearInterval(fs_state.loopIntervalId);
		fs_state.loopIntervalId = null;
		fs_displayState();
	}
	running = fs_state.loopIntervalId != null;

	const container = document.getElementById(`checkFreeStuffButtonContainer`);
	const button = document.getElementById(`checkFreeStuffButton`);
	if (container) {
		if (running) container.classList.add(`redButton`);
		else container.classList.remove(`redButton`);
	}
	if (button)
		button.value = `${running ? `Stop` : `Start`} Automated Claimer`;
}

function fs_startTimersLoop() {
	if (isBadUserData()) return;
	fs_resetFreeStuffStatus();
	fs_initializeTimers();
	if (fs_state.loopIntervalId != null) return;
	fs_state.loopNextTick = Date.now() + fs_TIMERS.main;
	fs_state.loopIntervalId = setInterval(fs_processNextTimer, fs_TIMERS.main);
	fs_processNextTimer().catch((error) =>
		console.error(`fs_startTimersLoop immediate tick error:`, error),
	);
}

async function fs_processNextTimer() {
	if (fs_state.loopBusy) return;
	const nextType = fs_getNextDueType();
	if (!nextType) {
		fs_state.loopNextTick = Date.now() + fs_TIMERS.main;
		fs_displayState();
		return;
	}
	fs_state.loopBusy = true;
	try {
		await fs_performCheckAndClaim(nextType);
	} catch (error) {
		console.error(`fs_processNextTimer error for ${nextType}:`, error);
	} finally {
		fs_state.loopBusy = false;
		fs_state.loopNextTick = Date.now() + fs_TIMERS.main;
		fs_displayState();
	}
}

function fs_displayState() {
	const wrapper = document.getElementById(`freeStuffWrapper`);
	if (!wrapper) return;

	let running = fs_state.loopIntervalId != null;
	if (!running) {
		wrapper.innerHTML = `&nbsp;`;
		return;
	}

	const cols = `width:50%;margin-bottom:10px;`;
	const intervalPrefix = `Interval tick in `;

	let txt = ``;
	const nextInterval = Number(fs_state.loopNextTick) - Date.now();
	txt += addHTMLElement({
		text: `${intervalPrefix}${getDisplayTime(nextInterval, {showMs: false, pad: false})}`,
		classes: `f fr falc fjs w100`,
		id: `fs_loopNextTickEle`,
		gridCol: `1 / -1`,
	});
	const nextType = fs_getNextScheduledType();
	if (nextType) {
		const time = Math.max(fs_state?.timers?.[nextType] ?? 0, 0);
		const dispTime = fs_ceilMSToNearestMainMS(Number(time));
		txt += addHTMLElement({
			text: `Next scheduled check: ${nextType} in ${dispTime}`,
			classes: `f fr falc fjs w100`,
			gridCol: `1 / -1`,
		});
	}

	const currDate = new Date();
	for (const type of fs_types) {
		const status = fs_state.status[type];

		const header = fs_NAMES[type] ?? type;

		let inTxt = ``;
		if (fs_state.settings[type] !== true) {
			inTxt += addHTMLElement({
				text: `Disabled.`,
				classes: `f fr falc fjs w100`,
				small: true,
			});
		} else {
			let claimedHeader;
			switch (type) {
				case `Platinum`:
					claimedHeader = `Platinum Days Claimed`;
					break;
				case `Trials`:
					claimedHeader = `Rewards Claimed`;
					break;
				case `FreeOffer`:
					claimedHeader = `Weekly Offers Claimed`;
					break;
				case `GuideQuests`:
					claimedHeader = `Rewards Claimed`;
					break;
				case `BonusChests`:
					claimedHeader = `Bonus Chests Claimed`;
					break;
				case `Celebrations`:
					claimedHeader = `Rewards Claimed`;
					break;
				default:
					claimedHeader = `${type} Claimed`;
			}
			const claimed = nf(Number(status?.claimed ?? 0));

			const nextCheckHeader = `Time Until Next Check`;
			const nextCheck = Math.max(fs_state?.timers?.[type] ?? 0, 0);

			let extraHeader = ``,
				extra = ``;
			if (type === `Platinum`) {
				extraHeader = `Daily Boost Expires`;
				const expires = Number(status?.extra?.dailyBoostExpires ?? -1);
				if (expires > 0) extra = fs_ceilMSToNearestMainMS(expires);
				else if (expires === 0) extra = `Inactive`;
			} else if (type === `Trials`) {
				const tStatus = status?.extra?.trialsStatus ?? [0, null];
				extraHeader =
					fs_TRIALS_STATUS?.[0]?.[tStatus?.[0] ?? 0] ??
					fs_TRIALS_STATUS[0][0];
				if (tStatus?.[1] == null) extra = ``;
				else if (tStatus?.[1] === 1)
					extra =
						fs_TRIALS_STATUS?.[1]?.[tStatus?.[1] ?? 0] ??
						fs_TRIALS_STATUS[1][0];
				else extra = fs_ceilMSToNearestMainMS(tStatus?.[1]);
			} else if (type === `FreeOffer`) {
				extraHeader = `Free Rerolls Remaining`;
				extra = nf(Number(status?.extra?.rerollsRemaining ?? 0));
			} else if (type === `GuideQuests`) {
				extraHeader = `Unclaimed Guide Quests`;
				extra = nf(Number(status?.extra?.unclaimedGuideQuests ?? 0));
			}

			inTxt = addHTMLElements([
				{
					text: addHTMLElements([
						{
							text: claimedHeader + `:`,
							classes: `f fr falc fje mr2`,
							styles: cols,
							small: true,
						},
						{
							text: claimed,
							classes: `f fr falc fjs ml2`,
							styles: cols,
							small: true,
						},
					]),
					classes: `f fr falc fjs w100`,
				},
				{
					text: addHTMLElements([
						{
							text: nextCheckHeader + `:`,
							classes: `f fr falc fje mr2`,
							styles: cols,
							small: true,
						},
						{
							text: fs_ceilMSToNearestMainMS(nextCheck),
							classes: `f fr falc fjs ml2`,
							styles: cols,
							small: true,
						},
					]),
					classes: `f fr falc fjs w100`,
				},
			]);
			if (extraHeader !== ``) {
				inTxt += addHTMLElement({
					text: addHTMLElements([
						{
							text: extraHeader + `:`,
							classes: `f fr falc fje mr2`,
							styles: cols,
							small: true,
						},
						{
							text: extra.toString(),
							classes: `f fr falc fjs ml2`,
							styles: cols,
							small: true,
						},
					]),
					classes: `f fr falc fjs w100`,
				});
			}
		}
		txt += addHTMLElement({
			text: addHTMLElements([
				{text: header, classes: `f fr falc fjs w100`, header: true},
				{text: inTxt, classes: `formsCampaign w100`},
			]),
			classes: `f fc fals fjs p5 w100`,
		});
	}

	wrapper.innerHTML = txt;
	createTimer(
		nextInterval,
		`fs_loopNextTick`,
		`fs_loopNextTickEle`,
		`waiting`,
		intervalPrefix,
		``,
		false,
	);
}

function fs_ceilMSToNearestMainMS(timer) {
	const date = new Date();
	if (timer <= date) return `Queued`;
	const val = Math.ceil((timer - date) / fs_TIMERS.main) * fs_TIMERS.main;
	return getDisplayTime(val, {showMs: false, showSecs: false, pad: false});
}

// ==================
// ===== CHECKS =====
// ==================

async function fs_checkPlatinum() {
	const status = fs_getDefaultStatus(`Platinum`);
	status.claimed = fs_state?.status?.Platinum?.claimed ?? 0;

	const response = await getDailyLoginRewards();
	if (!response || !response.success) {
		fs_state.status.Platinum = status;
		return;
	}

	const details = response?.daily_login_details || {};
	const todayIndex = Number(details?.today_index ?? 0);
	const rewardBit = 1 << todayIndex;
	const claimedMask = Number(details?.rewards_claimed ?? 0);
	const premActive = details?.premium_active ?? false;
	const premExpireMS = Number(details?.premium_expire_seconds ?? 0) * 1000;

	let nextClaimMS = Number(details.next_claim_seconds ?? 0) * 1000;
	if (nextClaimMS === 0) {
		const nextReset = Number(details?.next_reset_seconds ?? 0) * 1000;
		nextClaimMS = nextReset % 86400;
	}

	status.claimable = (claimedMask & rewardBit) === 0;
	status.nextCheck = status.claimable ? 0 : fs_calcTimer(nextClaimMS, true);
	status.extra.dailyBoostExpires =
		premActive && premExpireMS > 0 ? fs_calcTimer(premExpireMS) : 0;

	fs_state.status.Platinum = status;
}

async function fs_checkTrials() {
	const status = fs_getDefaultStatus(`Trials`);
	status.claimed = fs_state?.status?.Trials?.claimed ?? 0;

	const response = await trialsRefreshData();
	if (!response || !response.success) {
		fs_state.status.Trials = status;
		return;
	}

	const trialsData = response?.trials_data || {};
	status.extra.campaignId = 0;
	const pendingReward = Number(trialsData?.pending_unclaimed_campaign ?? -1);
	if (pendingReward > 0) {
		status.claimable = true;
		status.extra.campaignId = pendingReward;
		status.extra.trialsStatus = [1, 2];
		status.nextCheck = 0;
		fs_state.status.Trials = status;
		return;
	}

	const campaigns = trialsData?.campaigns ?? [];
	const started = campaigns?.[0]?.started ?? false;
	if (campaigns.length > 0 && started) {
		const campaign = campaigns[0];
		let currDPS = 0;
		let totalDamage = 0;
		for (const player of campaign?.players ?? []) {
			currDPS += Number(player?.dps ?? 0);
			totalDamage += Number(player?.total_damage ?? 0);
		}
		if (isNaN(currDPS) || !isFinite(currDPS)) currDPS = 0;
		if (isNaN(totalDamage) || !isFinite(totalDamage)) totalDamage = 0;

		const difficultyId = Number(campaign?.difficulty_id ?? 0);
		const tiamatHP =
			(fs_TIAMAT_HP?.[difficultyId - 1] ?? 0) * 10000000 - totalDamage;
		const timeTilTiamatDies =
			(currDPS <= 0 ? 99999999 : tiamatHP / currDPS) * 1000;
		let nextCheck = Math.min(
			Math.round(timeTilTiamatDies / 2),
			fs_calcNoTimerDelay(),
		);
		status.extra.tiamatDiesIn = timeTilTiamatDies;
		status.extra.trialsStatus = [2, fs_calcTimer(timeTilTiamatDies)];
		status.claimable = false;
		status.nextCheck = fs_calcTimer(nextCheck);
		fs_state.status.Trials = status;
		return;
	}

	if (campaigns.length > 0 && !started) {
		status.extra.trialsStatus = [1, 4];
		status.claimable = false;
		status.nextCheck = fs_calcTimer(fs_calcNoTimerDelay());
		fs_state.status.Trials = status;
		return;
	}

	const joinMS =
		Number(trialsData?.seconds_until_can_join_campaign ?? 0) * 1000;
	if (joinMS > 0) {
		status.extra.trialsStatus = [3, fs_calcTimer(joinMS)];
		status.claimable = false;
		status.nextCheck = fs_calcTimer(fs_calcNoTimerDelay());
		fs_state.status.Trials = status;
		return;
	}

	status.extra.trialsStatus = [1, 3];
	status.claimable = false;
	status.nextCheck = fs_calcTimer(fs_calcNoTimerDelay());

	fs_state.status.Trials = status;
}

async function fs_checkFreeWeeklyShopOffers() {
	const status = fs_getDefaultStatus(`FreeOffer`);
	status.claimed = fs_state?.status?.FreeOffer?.claimed ?? 0;

	await revealWeeklyOffers();
	const response = await getWeeklyOffers();
	if (!response || !response.success) {
		fs_state.status.FreeOffer = status;
		return;
	}

	const offers = response?.offers?.offers ?? [];
	status.extra.offerIds = [];
	for (const offer of offers) {
		const type = offer.type ?? ``;
		const cost = Number(offer?.cost ?? -1);
		if (type !== `free` || cost !== 0) continue;

		const purchased = offer?.purchased ?? true;
		if (purchased) continue;

		const offerId = Number(offer?.offer_id ?? -1);
		if (offerId > 0) status.extra.offerIds.push(offerId);
	}
	const timeRemaining = Number(response?.offers?.time_remaining ?? 0) * 1000;
	const rerollCost = Number(response?.offers?.reroll_cost ?? -1);
	const freeRerollsRemaining =
		rerollCost === 0 ? Number(response?.offers?.rerolls_remaining ?? 0) : 0;

	status.claimable = status.extra.offerIds.length > 0;
	status.extra.rerollsRemaining = freeRerollsRemaining;
	status.nextCheck = fs_calcTimer(timeRemaining);

	fs_state.status.FreeOffer = status;
}

async function fs_checkGuideQuests() {
	const status = fs_getDefaultStatus(`GuideQuests`);
	status.claimed = fs_state?.status?.GuideQuests?.claimed ?? 0;

	const response = await getCompletionData();
	if (!response || !response.success) {
		fs_state.status.GuideQuests = status;
		return;
	}

	status.extra.unclaimedGuideQuests = 0;
	for (const quest of response?.data?.guidequest ?? []) {
		const complete = quest?.complete ?? -1;
		const claimed = quest?.rewards_claimed ?? -1;
		if (complete === 1 && claimed === 0)
			status.extra.unclaimedGuideQuests += 1;
	}
	status.claimable = status.extra.unclaimedGuideQuests > 0;
	status.nextCheck =
		status.claimable ? 0 : fs_calcTimer(fs_calcNoTimerDelay());

	fs_state.status.GuideQuests = status;
}

async function fs_checkFreePremiumBonusChests() {
	const status = fs_getDefaultStatus(`BonusChests`);
	status.claimed = fs_state?.status?.BonusChests?.claimed ?? 0;

	const response = await getShop();
	if (!response || !response.success) {
		fs_state.status.BonusChests = status;
		return;
	}

	status.extra.bonusChestIds = [];
	for (const deal of response?.package_deals ?? []) {
		const status = deal?.bonus_status ?? ``;
		const bonusItems = deal?.bonus_item ?? [];
		const itemId = Number(deal?.item_id ?? -1);
		if (
			status !== `0` ||
			!Array.isArray(bonusItems) ||
			bonusItems.length === 0 ||
			itemId <= 0
		)
			continue;

		status.extra.bonusChestIds.push(itemId);
	}
	status.claimable = status.extra.bonusChestIds.length > 0;
	status.nextCheck = fs_calcTimer(fs_calcNoTimerDelay());

	fs_state.status.BonusChests = status;
}

async function fs_checkCelebrationRewards(userDetails = null) {
	const status = fs_getDefaultStatus(`Celebrations`);
	status.claimed = fs_state?.status?.Celebrations?.claimed ?? 0;

	if (!userDetails) userDetails = await getUserDetails();
	const custNotes = userDetails?.details?.custom_notifications ?? [];
	if (!Array.isArray(custNotes) || custNotes.length === 0) {
		status.nextCheck = fs_calcTimer(fs_calcNoTimerDelay());
		fs_state.status.Celebrations = status;
		return;
	}

	status.extra.celebrationCodes = [];
	status.extra.dialogIds = custNotes
		.map((n) => n.identifier)
		.filter((e) => typeof e === `string`);
	let nextTimer = Infinity;
	for (const custNote of custNotes) {
		const ident = custNote?.identifier ?? null;
		if (ident == null) continue;

		const dialog = await getDynamicDialog(ident);
		if (!dialog || !dialog.success || !dialog.dialog_data) continue;
		const eles = dialog?.dialog_data?.elements ?? [];
		for (const ele of eles) {
			const timer = Number(ele?.timer ?? -1);
			if (timer < nextTimer) nextTimer = timer;

			const type = ele?.type ?? ``;
			const text = ele?.text ?? ``;
			if (type === `button` && text.toLowerCase().includes(`claim`)) {
				const actions = ele?.actions ?? [];
				for (const action of actions) {
					const act = action?.action ?? ``;
					const code = action?.params?.code ?? ``;
					if (
						act === `redeem_code` &&
						typeof code === `string` &&
						code !== ``
					)
						status.extra.celebrationCodes.push(code);
				}
			}
		}
	}
	status.claimable = status.extra.celebrationCodes.length > 0;
	status.nextCheck = fs_calcTimer(
		nextTimer === Infinity ? fs_calcNoTimerDelay() : nextTimer * 1000,
	);

	fs_state.status.Celebrations = status;
}

// ==================
// ===== CLAIMS =====
// ==================

async function fs_claimPlatinum() {
	const status = fs_state.status.Platinum || fs_getDefaultStatus(`Platinum`);
	const response = await claimDailyLoginReward(false);
	if (response && response.success) {
		const details = response?.daily_login_details || {};
		const todayIndex = Number(details?.today_index ?? 0);
		const rewardBit = 1 << todayIndex;
		const claimedMask = Number(details?.rewards_claimed ?? 0);
		if ((claimedMask & rewardBit) !== 0) {
			status.claimed += 1;
			status.claimable = false;
			status.nextCheck = fs_calcTimer(0, true);
		}
		if (details?.premium_active ?? false) await claimDailyLoginReward(true);
	}
	status.nextCheck = fs_calcTimer(0, true);

	fs_state.status.Platinum = status;
}

async function fs_claimTrials() {
	const status = fs_state.status.Trials || fs_getDefaultStatus(`Trials`);
	const campaignId = status.extra.campaignId;
	if (!campaignId || campaignId <= 0) {
		status.claimable = false;
		status.extra.campaignId = 0;
		status.nextCheck = fs_calcTimer(0, true);
		return;
	}

	const response = await trialsClaimRewards(status.extra.campaignId);
	status.extra.campaignId = 0;
	status.claimable = false;
	if (
		response &&
		response?.success &&
		Array.isArray(response?.rewards) &&
		response.rewards.length > 0
	) {
		status.claimed += 1;
		status.extra.trialsStatus = [1, 3];
	} else status.extra.trialsStatus = [1, 1];
	status.nextCheck = fs_calcTimer(0, true);

	fs_state.status.Trials = status;
}

async function fs_claimFreeWeeklyShopOffers() {
	const status =
		fs_state.status.FreeOffer || fs_getDefaultStatus(`FreeOffer`);
	const ids = status.extra.offerIds ?? [];
	let successCount = 0;
	for (const id of ids) {
		const response = await purchaseWeeklyOffer(id);
		if (
			response &&
			response?.success &&
			Array.isArray(response?.loot) &&
			response.loot.length > 0
		)
			successCount += 1;
	}
	status.claimed += successCount;
	status.claimable = false;
	status.nextCheck = fs_calcTimer(0, true);

	fs_state.status.FreeOffer = status;
}

async function fs_claimGuideQuests() {
	const response = await claimCollectionQuestRewards(-1);
	const status =
		fs_state.status.GuideQuests || fs_getDefaultStatus(`GuideQuests`);
	if (response && response?.success && response?.awarded_items?.success) {
		const awardedIds =
			response?.awarded_items?.rewards_claimed_quest_ids ?? [];
		const claimedCount = Array.isArray(awardedIds) ? awardedIds.length : 0;
		status.claimed += claimedCount;
		status.claimable = false;
		status.extra.unclaimedGuideQuests = 0;
	}
	status.nextCheck = fs_calcTimer(0, true);

	fs_state.status.GuideQuests = status;
}

async function fs_claimFreePremiumBonusChests() {
	const status =
		fs_state.status.BonusChests || fs_getDefaultStatus(`BonusChests`);
	const ids = status.extra.bonusChestIds ?? [];
	let successCount = 0;
	for (const id of ids) {
		const result = await claimSaleBonus(id);
		if (
			result &&
			result?.success &&
			Array.isArray(result?.loot_details) &&
			result.loot_details.length > 0
		)
			successCount += 1;
	}
	status.claimed += successCount;
	status.claimable = false;
	status.extra.bonusChestIds = [];
	status.nextCheck = fs_calcTimer(0, true);

	fs_state.status.BonusChests = status;
}

async function fs_claimCelebrationRewards() {
	const status =
		fs_state.status.Celebrations || fs_getDefaultStatus(`Celebrations`);
	const codes = status.extra.celebrationCodes || [];
	let successCount = 0;
	for (const code of codes) {
		const result = await redeemCombination(code);
		if (
			result &&
			result?.success &&
			Array.isArray(result?.loot_details) &&
			result.loot_details.length > 0
		)
			successCount += 1;
	}
	status.claimed += successCount;
	status.claimable = false;
	status.extra.celebrationCodes = [];
	status.nextCheck = fs_calcTimer(0, true);

	fs_state.status.Celebrations = status;
}

// ================
// ===== MISC =====
// ================

function fs_scheduleNextCheck(type, nextCheck) {
	if (!fs_types.includes(type)) return;
	const candidate = Number(nextCheck);
	const nextValue = candidate > 0 ? candidate : Date.now();
	fs_state.timers[type] = nextValue;
	if (fs_state.status[type]) fs_state.status[type].nextCheck = nextValue;
	return nextValue;
}

function fs_getNextDueType() {
	const now = Date.now();
	return (
		Object.entries(fs_state.timers)
			.filter(
				([type, nextCheck]) =>
					fs_state.settings[type] === true &&
					Number(nextCheck) <= now,
			)
			.sort(([, a], [, b]) => Number(a) - Number(b))
			.map(([type]) => type)[0] || null
	);
}

async function fs_performCheckAndClaim(type) {
	const checker = fs_CHECK_FUNCTIONS[type];
	if (!checker) return;
	await checker();
	const status = fs_state.status[type];
	if (status?.claimable) {
		const claimer = fs_CLAIM_FUNCTIONS[type];
		if (claimer) await claimer();
	}
	fs_scheduleNextCheck(type, fs_state.status[type]?.nextCheck);
}

function fs_getDefaultStatus(type) {
	return {
		type,
		name: fs_NAMES[type] ?? type,
		enabled: fs_state.settings[type] === true,
		claimable: false,
		nextCheck: Date.now() + fs_TIMERS[`starting`],
		claimed: 0,
		extra: {},
	};
}

function fs_restoreCheckboxes() {
	for (const [type, checkboxId] of Object.entries(fs_CHECKBOX_IDS)) {
		const checkbox = document.getElementById(checkboxId);
		if (!checkbox) continue;
		checkbox.checked = fs_state.settings[type] === true;
	}
}

function fs_updateSettings(element) {
	if (!element || !element.dataset || !element.dataset.type) return;
	const type = element.dataset.type;
	if (!Object.prototype.hasOwnProperty.call(fs_state.settings, type)) return;
	fs_state.settings[type] = element.checked;
	fs_saveSettings();

	if (type !== `OnLoad`) {
		if (element.checked) fs_enableTimerForType(type);
		else fs_disableTimerForType(type);
	}

	fs_displayState();
}

function fs_toggleClaimOnLoad(checked) {
	fs_state.settings.OnLoad = checked;
	fs_saveSettings();
	fs_displayState();
}

function fs_resetFreeStuffStatus() {
	for (const type of fs_types)
		fs_state.status[type] = fs_getDefaultStatus(type);
	fs_state.lastUpdate = Date.now();
}

function fs_calcTimer(timeToAdd = 0, incSafety = false) {
	const timer = timeToAdd + (incSafety ? fs_TIMERS.safety : 0);
	return Date.now() + timer;
}

function fs_calcNoTimerDelay() {
	const rng = randInt(-fs_TIMERS.no_timer_rng, fs_TIMERS.no_timer_rng);
	return fs_TIMERS.no_timer + rng;
}

function fs_init() {
	fs_loadSettings();
	fs_restoreCheckboxes();
	if (fs_state.settings.OnLoad) fs_toggleFreeStuffChecker();
}

function fs_loadSettings() {
	const saved = ls_getPerAccount(fs_LSKEY_settings, null);
	fs_state.settings = {
		...fs_DEFAULT_SETTINGS,
		...(saved || {}),
	};
	return fs_state.settings;
}

function fs_saveSettings() {
	const isDefault = Object.keys(fs_DEFAULT_SETTINGS).every(
		(key) => fs_state.settings[key] === fs_DEFAULT_SETTINGS[key],
	);
	ls_setPerAccount(
		fs_LSKEY_settings,
		fs_state.settings,
		(v) =>
			!v ||
			typeof v !== `object` ||
			Object.keys(v).length === 0 ||
			isDefault,
	);
}

function fs_initializeTimers() {
	fs_state.timers = {};
	const now = Date.now();
	let mult = 0;
	for (let index = 0; index < fs_types.length; index++) {
		const type = fs_types[index];
		if (fs_state.settings[type] === true) {
			mult++;
			fs_state.timers[type] = now + fs_TIMERS.starting * mult;
		}
	}
}

function fs_enableTimerForType(type) {
	if (!fs_types.includes(type)) return;
	fs_state.settings[type] = true;
	fs_state.timers[type] =
		Date.now() + fs_TIMERS.starting * (fs_types.indexOf(type) + 1);
}

function fs_disableTimerForType(type) {
	if (!fs_types.includes(type)) return;
	fs_state.settings[type] = false;
	fs_state.timers[type] = Infinity;
}

function fs_getNextScheduledType() {
	return (
		Object.entries(fs_state.timers)
			.filter(([type]) => fs_state.settings[type] === true)
			.sort(([, a], [, b]) => Number(a) - Number(b))
			.map(([type]) => type)[0] || null
	);
}

