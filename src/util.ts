export function pluralise(n: number, singular: string, plural: string): string {
	if (n === 0) {
		return `no ${plural}`;
	} else if (n === 1) {
		return `${n} ${singular}`;
	} else {
		return `${n} ${plural}`;
	}
}

export function formatDuration(seconds: number): string {
	if (seconds >= 86400) return pluralise(Math.floor(seconds / 86400), "day", "days");
	if (seconds >= 3600) return pluralise(Math.floor(seconds / 3600), "hour", "hours");
	if (seconds >= 60) return pluralise(Math.floor(seconds / 60), "minute", "minutes");
	return pluralise(Math.floor(seconds), "second", "seconds");
}
