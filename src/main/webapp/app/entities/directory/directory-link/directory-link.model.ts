/**
 * One account on a sibling stack, as this console reads it from `GET /api/directory-links`.
 *
 * There is no screen for this collection and there is deliberately no create, update or delete on
 * the server — a link is a fact about another system's account, and editing it here would only be
 * overwritten by the next event. The console reads it for one reason: a patient learned from a
 * sibling event has no `Profile` and therefore no name, and this is the only place their identity
 * exists. See `resolveLinkIdentity` below and `DirectoryLinkResource`'s javadoc on the api.
 *
 * Only the fields the console actually uses are modelled. The document carries more — the watermark,
 * the last event id and type, `firstSeenAt` — and none of it belongs on a directory row. (`state`
 * joined the list on 2026-09-07 with the awaiting-a-record panel, which has nothing else to say about
 * a clinician whose record does not exist; `firstSeenAt` is still only a sort key and is still not
 * read here.)
 */
export interface IDirectoryLink {
  id: string;

  /** Which sibling stack taught us about this account. */
  source?: keyof typeof DirectorySource | null;

  /**
   * The correlation key: a lowercased email address for a patient, an `accountId` for a clinician.
   *
   * Carried as well as `email` because the two are the same value for a patient and they are not for
   * a professional, and a reader should not have to know which source stores identity where.
   */
  externalKey?: string | null;

  /** The sibling's own identifier for the subject, when the stream has published one. */
  externalId?: string | null;

  login?: string | null;
  email?: string | null;

  /**
   * The last lifecycle state the far side reported — an event type for hc-patient, the
   * `onboarding.state` payload field for hc-professional.
   *
   * **Null for a clinician who has only registered, and that is the common case.** This comment
   * described the professional half as always being the `onboarding.state` payload field, which was
   * untrue for exactly the case item 46 was reported for: `registration.created` carries no `state`,
   * and the api filled the gap with the event type, so a newly registered clinician's row read
   * "no record in this directory · registration.created" — a wire identifier printed as a status.
   * The api stopped falling back on 2026-09-07 (`SiblingEventParser.parseProfessionalEvent`), so the
   * honest answer is now an absent field and the template's `@if (link.state)` is what renders it.
   *
   * Rendered on the professional directory's awaiting-a-record panel and nowhere else: for a
   * clinician with no record here it is the only thing this console can say about how far they have
   * got (`DOCUMENTS_SUBMITTED`, `APPLICATION_SUBMITTED`), and it is the far side's own word rather
   * than an inference. Shown verbatim and deliberately not translated — it is hc-professional's
   * vocabulary, not this product's, and a lookup table here would silently print a raw key the day
   * they add a state.
   */
  state?: string | null;

  /** What kind of account this is, and therefore whether a local record is kept for it. */
  subjectKind?: keyof typeof DirectorySubjectKind | null;

  /** Whether the stream has ever said this account can sign in. */
  activated?: boolean | null;

  /** Set when the far side told us it had erased the subject. Null for everybody else. */
  erasedAt?: string | null;

  /** The local record this subject produced, when it produced one. This is the join to `Patient.id`. */
  localId?: string | null;

  // --- the two-phase professional contract, backlog item 47 -------------------------------------
  //
  // A clinician is accepted in two phases, published by two applications onto two topics with no
  // ordering between them:
  //
  //   phase 1  AccountStatus { accountId, login, email, activated, createdDate, modifiedDate }
  //            hc-professional's GATEWAY, on hc.professional.registration
  //   phase 2  ProfileStatus { profileId, accountId, isComplete, isVerified,
  //                            createdDate, modifiedDate, lastModifiedBy }
  //            hc-professional's API, on hc.professional.entity
  //
  // They join on `accountId`, which is `externalKey` above, and the api writes both halves onto one
  // document — so a row here carries whichever phases have arrived and nothing has to be joined
  // client-side. Four of phase 1's six fields are the ones already declared above; the rest are
  // here.
  //
  // EVERY ONE OF THESE IS OPTIONAL AND `undefined` MEANS "NOT REPORTED", NEVER `false` OR AN EPOCH.
  // That is the rule the whole row rests on: a clinician whose profile status has simply not arrived
  // must not be rendered as unverified, which would assert something about a person from the absence
  // of a message.

  /** Phase 1's `createdDate` — when the ACCOUNT was created on hc-professional. */
  accountCreatedDate?: string | null;

  /** Phase 1's `modifiedDate` — when the account last changed there. */
  accountModifiedDate?: string | null;

  /** Phase 2's `profileId`: hc-professional's own id for the profile. Not shown; carried for support. */
  profileId?: string | null;

  /** Phase 2's `isComplete`. `undefined` is unknown — see the block comment above. */
  profileComplete?: boolean | null;

  /** Phase 2's `isVerified`. `undefined` is unknown. */
  profileVerified?: boolean | null;

  /** Phase 2's `createdDate` — when the PROFILE was created, which is not when the account was. */
  profileCreatedDate?: string | null;

  /** Phase 2's `modifiedDate`. */
  profileModifiedDate?: string | null;

  /**
   * Phase 2's `lastModifiedBy`, which is an **accountId** and never a display name.
   *
   * That accountId is the gateway's `User.id` — the identifier space this estate already audits
   * against — so there is nothing to resolve it to here and nothing is invented. Shown verbatim.
   */
  profileLastModifiedBy?: string | null;

  /**
   * When the newest phase-2 event was applied. **The test for whether phase 2 has arrived at all.**
   *
   * Preferred over checking `profileComplete` or `profileId` for that, because either of those can
   * legitimately be absent from a `ProfileStatus` that did arrive — and reading their absence as
   * "no profile status" is the same conflation of empty and false the block comment above forbids.
   */
  profileEventAt?: string | null;
}

export const DirectorySource = {
  HC_PATIENT: 'HC_PATIENT',
  HC_PROFESSIONAL: 'HC_PROFESSIONAL',
} as const;

export const DirectorySubjectKind = {
  PATIENT: 'PATIENT',
  PROFESSIONAL: 'PROFESSIONAL',
  CARE_ANGEL: 'CARE_ANGEL',
} as const;

/**
 * How a record with no profile is named on screen, and `null` when nothing here can name it.
 *
 * **Order matters and it is not arbitrary.** The address is preferred because it is the handle the
 * person themselves would give — somebody who reports that they registered and cannot be found says
 * their email, never their login — and because it is what an administrator can act on: write to
 * them, or match them against the account on hc-patient. The login is the fallback for a
 * professional-sourced link, where `externalKey` is an opaque `accountId` and there may be no
 * address at all.
 *
 * **`externalKey` is deliberately not a third fallback.** For a patient it equals `email` and adds
 * nothing; for a professional it is a UUID, which is the same unreadable-identifier-as-a-name defect
 * this whole change exists to remove, one field along. Returning `null` and letting the caller say
 * "identity not on file" is the honest answer.
 */
export function resolveLinkIdentity(link: IDirectoryLink | null | undefined): string | null {
  if (!link) {
    return null;
  }
  const email = link.email?.trim();
  if (email) {
    return email;
  }
  // Written out rather than chained: `trim()` returns "" for a whitespace-only field, which is
  // falsy but not nullish, so `?? null` would let a blank through as somebody's name. The same
  // trap `Patient.location()` documents one screen along.
  const login = link.login?.trim();
  if (login) {
    return login;
  }
  return null;
}

/**
 * How a **clinician** is named on screen, and `null` when nothing here can name them.
 *
 * **The login, and only ever the login.** This is deliberately not `resolveLinkIdentity` above, and
 * the difference is the point rather than an oversight to tidy away:
 *
 * - **The patient directory shows the address on purpose.** `DirectoryLinkResource`'s javadoc argues
 *   it at length — an administrator's patient directory is exactly where a patient's contact address
 *   belongs, the reader is authenticated and authorised, and the row shows a phone number and a date
 *   of birth beside it already.
 * - **The clinician row must not.** Backlog item 47 names `login` as the field the console shows and
 *   says of `email` that it is "for correlation, not for display". Item 43 established that this key
 *   is the identifying value and took it out of every log line; keeping it off the screen as well is
 *   the same decision one surface along, and it costs nothing here because a clinician's login is
 *   what an administrator on this stack would search for anyway.
 *
 * **`externalKey` is deliberately not a fallback**, for the reason `resolveLinkIdentity` gives: for a
 * clinician it is an `accountId`, a UUID, and printing one where a name goes is the defect item 45
 * removed from the patient directory. A row that cannot be named says so in words.
 *
 * This supersedes the professional panel's use of `resolveLinkIdentity`, which had been showing the
 * address — correct under item 46, which predates the contract, and wrong under item 47.
 */
export function resolveClinicianLogin(link: IDirectoryLink | null | undefined): string | null {
  // Written out rather than returned through `??`, for the reason `resolveLinkIdentity` gives above:
  // `trim()` yields "" for a whitespace-only field, which is falsy but not nullish, so a nullish
  // coalesce would let a blank through as somebody's login and print an empty name cell.
  const login = link?.login?.trim();
  if (login) {
    return login;
  }
  return null;
}

/**
 * Whether phase 2 has arrived for this clinician at all.
 *
 * The single test the whole row branches on, so that "unknown" is decided in one place rather than
 * per column. `profileEventAt` is stamped by the api on every applied `ProfileStatus` and by nothing
 * else, which is why it and not `profileComplete` or `profileId` answers this: a `ProfileStatus` may
 * legitimately omit either of those, and reading their absence as "no profile status" would report a
 * clinician's profile as unreported on the strength of one missing field.
 */
export function hasProfileStatus(link: IDirectoryLink | null | undefined): boolean {
  return !!link?.profileEventAt;
}
