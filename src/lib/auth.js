/**
 * Cookie-based authentication and user identity management.
 */
import Cookies from 'js-cookie';

const COOKIE_PASSWORD = 'waffle_pwd';
const COOKIE_USERNAME = 'waffle_user';
const COOKIE_EXPIRY = 365; // days

/**
 * Get stored credentials from cookies.
 * @returns {{ password: string|undefined, username: string|undefined }}
 */
export function getStoredCredentials() {
    return {
        password: Cookies.get(COOKIE_PASSWORD),
        username: Cookies.get(COOKIE_USERNAME),
    };
}

/**
 * Store password in cookie.
 */
export function storePassword(password) {
    Cookies.set(COOKIE_PASSWORD, password, { expires: COOKIE_EXPIRY, sameSite: 'strict' });
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
    Cookies.remove(COOKIE_PASSWORD);
    Cookies.remove(COOKIE_USERNAME);
}
