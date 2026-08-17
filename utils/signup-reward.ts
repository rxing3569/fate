const SIGNUP_REWARD_CHANGE_AT = Date.UTC(2026, 7, 31, 16);

export function signupRewardPoints(now = Date.now()) {
  return now < SIGNUP_REWARD_CHANGE_AT ? 300 : 100;
}
