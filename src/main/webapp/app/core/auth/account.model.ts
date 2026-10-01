export class Account {
  constructor(
    public activated: boolean,
    public authorities: string[],
    public email: string,
    public firstName: string | null,
    public langKey: string,
    public lastName: string | null,
    public login: string,
    public imageUrl: string | null,

    /**
     * The gateway's user id. Present in every `GET /api/account` response.
     *
     * **It IS the join key into the admin service — since item 123 (2026-09-24), and this comment
     * has now asserted both answers, so read the history before trusting either.** It first said
     * "join key" while `Profile.accountId` held the **login**: `/account` asked for
     * `by-account/a0eebc99-…-a11`, got the 404 that means "no profile yet", and offered to create
     * a profile for an administrator who already had one, silently. The comment then said "not the
     * join key" — correctly — until the api's item 123 migrated `Profile.accountId` to the
     * account's `User.id` (estate rule: `account.id = profile.accountId`), at which point the
     * login became the identifier that silently 404s. `account-settings.service.ts` is still the
     * only file that decides this; its `accountKey` is where the answer lives in code.
     *
     * The same id is what the gateway mints as the `uid` claim, so the api can stamp the right
     * auditor on a document — one identifier, one meaning, on both channels.
     *
     * Optional and last so existing callers, including the specs that build this as a literal,
     * keep working — but an account without it cannot be joined to a profile at all, which
     * `accountKey` enforces.
     */
    public id?: string | null,
  ) {}
}
