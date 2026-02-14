/**
 * Week-based utilities for ISO week calculations.
 */

/**
 * Get the ISO week number and year for a given date.
 * @returns {{ year: number, week: number }}
 */
function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    // Set to nearest Thursday: current date + 4 - current day number (Mon=1, Sun=7)
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return { year: d.getUTCFullYear(), week: weekNo };
}

/**
 * Get the current week key string like "2026-W07".
 */
export function getCurrentWeekKey() {
    const { year, week } = getISOWeek(new Date());
    return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Check if a week key is within the last 2 weeks (inclusive of current).
 */
export function isWithinTwoWeeks(weekKey) {
    const current = getCurrentWeekKey();
    const currentParsed = parseWeekKey(current);
    const targetParsed = parseWeekKey(weekKey);

    if (!currentParsed || !targetParsed) return false;

    // Calculate the difference in weeks
    const currentTotal = currentParsed.year * 52 + currentParsed.week;
    const targetTotal = targetParsed.year * 52 + targetParsed.week;

    return currentTotal - targetTotal >= 0 && currentTotal - targetTotal <= 2;
}

/**
 * Parse a week key string like "2026-W07" into { year, week }.
 */
function parseWeekKey(weekKey) {
    const match = weekKey.match(/^(\d{4})-W(\d{2})$/);
    if (!match) return null;
    return { year: parseInt(match[1]), week: parseInt(match[2]) };
}

/**
 * Get a human-readable label for a week key.
 * Returns something like "Feb 9 – Feb 15, 2026"
 */
export function getWeekLabel(weekKey) {
    const parsed = parseWeekKey(weekKey);
    if (!parsed) return weekKey;

    // Find the Monday of this ISO week
    const jan4 = new Date(Date.UTC(parsed.year, 0, 4));
    const dayOfWeek = jan4.getUTCDay() || 7;
    const monday = new Date(jan4);
    monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (parsed.week - 1) * 7);

    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const startMonth = months[monday.getUTCMonth()];
    const endMonth = months[sunday.getUTCMonth()];
    const startDay = monday.getUTCDate();
    const endDay = sunday.getUTCDate();
    const year = parsed.year;

    if (startMonth === endMonth) {
        return `${startMonth} ${startDay} – ${endDay}, ${year}`;
    }
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
}
