const vai = 1.002; // prettier-ignore
const ai_asyncIntervals = [];

const runAsyncInterval = async (cb, interval, intervalIndex) => {
	await cb();
	if (ai_asyncIntervals[intervalIndex])
		setTimeout(
			() => runAsyncInterval(cb, interval, intervalIndex),
			interval,
		);
};

const setAsyncInterval = (cb, interval) => {
	if (cb && typeof cb === "function") {
		const intervalIndex = ai_asyncIntervals.length;
		ai_asyncIntervals.push(true);
		runAsyncInterval(cb, interval, intervalIndex);
		return intervalIndex;
	} else throw new Error("Callback must be a function");
};

const clearAsyncInterval = (intervalIndex) => {
	if (ai_asyncIntervals[intervalIndex])
		ai_asyncIntervals[intervalIndex] = false;
};
