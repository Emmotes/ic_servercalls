const vai=1.000;
const asyncIntervals = [];

const runAsyncInterval = async (cb, interval, intervalIndex) => {
	await cb();
	if (asyncIntervals[intervalIndex])
		setTimeout(() => runAsyncInterval(cb, interval, intervalIndex), interval);
};

const setAsyncInterval = (cb, interval) => {
	if (cb && typeof cb === "function") {
		const intervalIndex = asyncIntervals.length;
		asyncIntervals.push(true);
		runAsyncInterval(cb, interval, intervalIndex);
		return intervalIndex;
	} else
		throw new Error('Callback must be a function');
};

const clearAsyncInterval = (intervalIndex) => {
	if (asyncIntervals[intervalIndex])
		asyncIntervals[intervalIndex] = false;
};