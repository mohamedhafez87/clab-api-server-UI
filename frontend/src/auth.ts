const TOKEN_KEY = 'clab-api-token';
const USER_KEY = 'clab-api-user';

export type AuthState = {
  token: string | null;
  username: string | null;
};

export function loadAuth(): AuthState {
  return {
    token: window.sessionStorage.getItem(TOKEN_KEY),
    username: window.sessionStorage.getItem(USER_KEY)
  };
}

export function saveAuth(username: string, token: string) {
  window.sessionStorage.setItem(USER_KEY, username);
  window.sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAuth() {
  window.sessionStorage.removeItem(USER_KEY);
  window.sessionStorage.removeItem(TOKEN_KEY);
}
