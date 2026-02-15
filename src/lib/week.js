/**
 * Week-based utilities for Wednesday-anchored weeks (CST).
 * Week starts on Wednesday and ends on Tuesday.
 */

// CST is UTC-6 (fixed, no DST for simplicity as requested, or we can use a library, 
// but for now we'll offset by -6 hours)
const CST_OFFSET_HOURS = -6;

/**
 * Get the current date in CST.
 */
function getCSTDate() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * CST_OFFSET_HOURS));
}

/**
 * Get the Wednesday-anchored week key for a given date (CST).
 * Format: "YYYY-Wnn-Wed"
 */
function getWedWeekKey(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    // Adjust to the most recent Wednesday
    const day = d.getDay(); // 0=Sun, 3=Wed
    const diff = d.getDate() - day + (day < 3 ? -4 : 3); // Adjust when day is Sun/Mon/Tue vs Wed+
    const wednesday = new Date(d.setDate(diff));

    const year = wednesday.getFullYear();
    // Simple week number (approximate but consistent for sorting)
    const start = new Date(year, 0, 1);
    const days = Math.floor((wednesday - start) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((days + 1) / 7);

    return `${year}-W${String(week).padStart(2, '0')}-Wed`;
}

/**
 * Get the current week key.
 */
export function getCurrentWeekKey() {
    return getWedWeekKey(getCSTDate());
}

/**
 * Get the Wednesday start date (00:00:00) for a week key.
 * This reconstructs the date from the approximate key relative to current time
 * (Note: Gist sorting relies on timestamp, key is mostly for grouping)
 */
function getStartDateFromKey(weekKey) {
    // This is tricky without a perfect reverse map, so we'll rely on timestamps for logic
    // But for the label, we can approximate or use the current week if it matches
    const currentKey = getCurrentWeekKey();
    if (weekKey === currentKey) {
        const d = getCSTDate();
        const day = d.getDay();
        const diff = d.getDate() - day + (day < 3 ? -4 : 3);
        const wed = new Date(d.setDate(diff));
        wed.setHours(0, 0, 0, 0);
        return wed;
    }
    // Fallback parsing (mostly for display label consistency)
    // Real validation happens via timestamps
    return new Date();
}

/**
 * Get human-readable label: "Wed Feb 11 – Tue Feb 17"
 */
export function getWeekLabel(weekKey) {
    // For simplicity, we'll calculate relative to "now" if it's the current week,
    // otherwise just return the key if it's too old to calculate easily without a library
    if (weekKey === getCurrentWeekKey()) {
        const start = getStartDateFromKey(weekKey);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);

        const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `Wed ${fmt(start)} – Tue ${fmt(end)}`;
    }
    return weekKey; // Fallback for old/future weeks
}

/**
 * Check if a week key is the current week or the immediate previous week.
 */
export function isWithinTwoWeeks(weekKey) {
    const current = getCurrentWeekKey();
    if (weekKey === current) return true;

    // Check previous week
    const d = getCSTDate();
    d.setDate(d.getDate() - 7);
    const prev = getWedWeekKey(d);

    return weekKey === prev;
}

/**
 * Check if a post timestamp is within the "Badge of Shame" window.
 * Window: Wed 12:01 AM CST – Fri 11:59 PM CST.
 * @param {number} timestamp - UTC timestamp of the post
 * @param {string} weekKey - The week key the post belongs to
 */
export function isPostedOnTime(timestamp, weekKey) {
    // Convert timestamp to CST date object
    const date = new Date(timestamp + (3600000 * CST_OFFSET_HOURS)); // Shift UTC to CST
    const postDay = date.getDay(); // 0=Sun, 3=Wed, 5=Fri
    const postHour = date.getHours();
    const postMin = date.getMinutes();

    // Window start: Wednesday (3) at 00:01
    // Window end: Friday (5) at 23:59

    // Check days
    if (postDay === 3) { // Wednesday
        // Must be after 00:01
        return (postHour > 0) || (postHour === 0 && postMin >= 1);
    }

    if (postDay === 4) return true; // Thursday - always safe

    if (postDay === 5) { // Friday
        // Must be before 23:59 (virtually all day fits this)
        return (postHour < 23) || (postHour === 23 && postMin <= 59);
    }

    return false; // Sat, Sun, Mon, Tue are late
}
