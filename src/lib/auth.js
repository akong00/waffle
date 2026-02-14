/**
 * Cookie-based authentication and user identity management.
 */
import Cookies from 'js-cookie';

const COOKIE_USERNAME = 'waffle_user';
const COOKIE_EXPIRY = 365; // days

/**
 * Get stored credentials from cookies.
 * @returns {{ username: string|undefined }}
 */
export function getStoredCredentials() {
    return {
        username: Cookies.get(COOKIE_USERNAME),
    };
}

/**
 * Store username in cookie.
 */
export function storeUsername(username) {
    Cookies.set(COOKIE_USERNAME, username, { expires: COOKIE_EXPIRY, sameSite: 'strict' });
}

/**
 * Clear all stored credentials.
 */
export function clearCredentials() {
    Cookies.remove(COOKIE_USERNAME);
}
