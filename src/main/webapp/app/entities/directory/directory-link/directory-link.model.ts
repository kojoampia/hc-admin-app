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

  /**
   * When the newest **phase-1** event was applied — the test for whether a registration has been seen
   * at all, and the mirror of `profileEventAt` below.
   *
   * The class comment above said the watermark was carried by the document and deliberately not
   * modelled here, on the grounds that it is a fact about consumption rather than about the person.
   * That is still true of what it *holds*; what it answers is not. Since item 47 a row can exist with
   * phase 2 and no phase 1 — normal on any backfill, since the two phases are on two topics with no
   * ordering between them — and the console was telling every such row it was "known from a
   * registration on the professional app", which is a claim nothing has made. `undefined` here is
   * that state, and it is the only thing on the row that can distinguish it.
   *
   * Read through `hasRegistration` and never rendered: what a reader sees is the sentence it selects.
   */
  lastEventAt?: string | null;

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
   * Phase 2's `lastModifiedBy`: **hc-professional's login** for whoever last wrote the profile, and
   * never a display name.
   *
   * Item 47's contract calls it "an accountId, which IS the gateway's `User.id`", and that is wrong
   * about their code — the value is Spring Data auditing's `lastModifiedBy` on their `Profile`,
   * filled by their `SpringSecurityAuditorAware` from the JWT subject, or their `system` when nobody
   * was authenticated. The architect's decision 2 moves their *`accountId`* onto a `User.id` and
   * changes nothing about auditing, so the two are in different identifier spaces.
   *
   * Nothing follows for the rendering: it is shown verbatim, and nothing is invented for it. What
   * follows is that it must not be matched against a login on *this* gateway — it names an account on
   * another stack — and that, incidentally, it is legible, which is why the column needs no apology.
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

  // --- the membership tier a patient chose, backlog item 48 --------------------------------------
  //
  // hc-patient publishes `PlanChosen` on `patient-events` when a patient picks a tier, and the api
  // writes its four fields onto this row. Only an HC_PATIENT link ever carries them: a clinician has
  // no membership and nothing on either of hc-professional's topics mentions one.
  //
  // THE PLAN A PATIENT *HOLDS* IS `Patient.plan`, NOT THIS. That field is an administrator's, set on
  // this console, and no event may write it — hc-patient does not know this service's catalogue
  // exists. These four are what somebody asked for on the other product, which is a different fact
  // and is rendered as a different thing.

  /** hc-patient's own id for the `Membership`. A support handle, never a join key. */
  planMembershipId?: string | null;

  /**
   * Abofonsa's tier code as hc-patient sent it — `PEAR`, `PAWPAW`, `MELON`.
   *
   * Resolved against `ServicePlan.code` **on this side, at render time**. Since backlog item 51 the
   * two vocabularies are the same one, synced from the same content API, so it normally matches;
   * when it does not, the tier is one Abofonsa has published and the catalogue sync has not brought
   * across yet, and the screen says so rather than inventing a plan or drawing a blank.
   */
  planCode?: string | null;

  /**
   * hc-patient's display name for the tier — `"PAWPAW Plan"`.
   *
   * **Theirs, not this catalogue's**, and the two can differ. It is what makes an unresolvable code
   * readable, and it is why the panel can name a tier it holds no record of.
   */
  planName?: string | null;

  // --- the name hc-patient holds, backlog item 50 ------------------------------------------------
  //
  // A patient learned from an event has no `Profile` here and can never be given one, so item 45 put
  // the address from this link on the row — which an operator reported from production as an email
  // where a name should be. These two fields are the missing half: the api asks hc-patient
  // (`GET /api/profiles/email/{email}`, with the administrator's own token) when the console sends
  // `resolveNames=true`, and returns the name and nothing else.
  //
  // NEITHER IS STORED ON EITHER SIDE. The api sets them on transient fields of a document it never
  // saves; this console holds them for as long as the page does. A second copy of a person's name is
  // a second thing that can disagree with hc-patient, which is the rule item 27(a) states and item 45
  // followed by refusing to default a `Profile`.

  /**
   * The name, when hc-patient supplied one.
   *
   * Absent when the lookup was not asked for, found nobody, could not be made — or succeeded against
   * a profile that carries no name, which is a real state there (`firstName` and `lastName` have no
   * `@NotNull` on their `Profile`). The row falls back to the address in all four cases, so nothing
   * on screen has to tell them apart; `nameResolution` is what does, for the one that needs a word.
   */
  resolvedName?: string | null;

  /**
   * What happened when the name was looked up, and **absent means the row was never a candidate**.
   *
   * Not `UNAVAILABLE`, which means a lookup was owed and did not come back. A clinician's link and a
   * patient link with no address carry nothing here, because hc-patient's endpoint is keyed on an
   * address and there was nothing to ask — telling a reader their name could not be looked up would
   * be true of nothing.
   *
   * Only `UNAVAILABLE` reaches the screen as words. `RESOLVED` shows the name, `NOT_FOUND` shows the
   * address exactly as it did before item 50, and neither needs explaining. There is deliberately no
   * fourth value for "a name exists and you may not see it": hc-patient answers the same 404 for a
   * refusal as for an absence, and inferring it from the caller's own authorities would copy their
   * `PatientScope` into a fourth repository to drift.
   */
  nameResolution?: 'RESOLVED' | 'NOT_FOUND' | 'UNAVAILABLE' | null;

  /**
   * The status the membership was created with on hc-patient — `PENDING` for anybody but an
   * administrator there.
   *
   * **Not a live status, and it must never be labelled as one.** Their `MembershipResource` publishes
   * on `POST` alone; `PUT` and `PATCH` write the status and announce nothing, so a membership
   * approved on their side afterwards says so on no topic and this field goes on reading `PENDING`.
   * The wording on screen says "reported" for exactly that reason. Item 54's return leg is what
   * closes the loop from this end.
   *
   * A string rather than a union: the vocabulary is hc-patient's and they ship five values today
   * (`PENDING`, `ACTIVE`, `CANCELLED`, `EXPIRED`, `SUSPENDED`), with nothing stopping a sixth.
   */
  planStatus?: string | null;
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
 * How a **patient** with no local profile is named on screen — the name if hc-patient supplied one,
 * else `resolveLinkIdentity`'s answer, else `null`.
 *
 * **The order is the whole of backlog item 50 and it is not negotiable downwards.** The address is
 * honest and was the right answer while nothing here could learn the name; a name is what the row is
 * for. Below it, everything item 45 decided stands untouched — the address, then the login, then
 * "Identity not on file", and never the record's ObjectId.
 *
 * `trim()` before testing, for the reason `resolveLinkIdentity` gives one function down: an empty
 * string is falsy but not nullish, so a `??` chain would print a blank where a name goes. The api
 * already nulls a blank name; this is the same rule stated on the side that renders it, because a
 * server changing its mind about `""` must not become a blank cell here.
 */
export function resolveLinkDisplayName(link: IDirectoryLink | null | undefined): string | null {
  const resolved = link?.resolvedName?.trim();
  if (resolved) {
    return resolved;
  }
  return resolveLinkIdentity(link);
}

/**
 * Whether this row's name was looked up and the lookup did not come back.
 *
 * The one outcome that gets words on the screen. `NOT_FOUND` deliberately does not: hc-patient
 * genuinely does not name this person to this caller, the address is the honest answer, and a
 * sentence saying so on every learned row would be noise on the common case. `UNAVAILABLE` is
 * different in kind — the row *would* have had a name and this console could not obtain it — and
 * saying nothing would leave an operator comparing two rows that differ for a reason nothing on
 * screen explains.
 *
 * An absent `nameResolution` is false, not unknown: it means the row was never a candidate.
 */
export function isNameUnavailable(link: IDirectoryLink | null | undefined): boolean {
  return link?.nameResolution === 'UNAVAILABLE';
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
 *
 * **The review asked whether "some frame was accepted" is really "a `ProfileStatus` arrived", and
 * under the architect's decision 3 of 2026-09-08 it is — exactly, and not approximately.** That
 * decision has `SiblingEventParser.parseProfessionalProfileEvent` accept `type == "ProfileStatus"`
 * and nothing else on `hc.professional.entity`, and `profile_event_at` is written on the one path
 * that a parsed profile status reaches. So the name and the test agree, and the function is left as
 * it is rather than renamed or re-keyed.
 *
 * It was a real gap before that decision and is worth recording as one: the parser then accepted
 * `entity.created` and `entity.updated` for a `Profile`, which are hc-professional's generic entity
 * signal and carry none of `isComplete`, `isVerified` or `lastModifiedBy` — so a stamped
 * `profileEventAt` could have meant a frame that answered no column, and every cell on the row would
 * have read "Not reported" while this function said the status had arrived.
 *
 * **What would break it again is a second accepted type on that topic**, not a change here. If one
 * is ever added, the question this function asks stops being the question the row needs, and the
 * answer is a field the api sets only for a status rather than a looser test on this side.
 */
export function hasProfileStatus(link: IDirectoryLink | null | undefined): boolean {
  return !!link?.profileEventAt;
}

/**
 * Whether phase 1 has arrived for this clinician at all — a registration, an account event, or an
 * onboarding state.
 *
 * **The mirror of `hasProfileStatus`, and it exists because a row can have neither phase's
 * counterpart.** `lastEventAt` is stamped by the api on every applied phase-1 frame and by nothing
 * else, so its absence is "no registration has been seen" and not "the registration carried no
 * login". The two are different sentences on the screen: a phase-2-only row is a profile for an
 * account nobody has announced, and telling a reader it was "known from a registration" asserts a
 * message that was never sent — the same shape as reading an absent `isVerified` as "No".
 *
 * Not `!login`, which was the tempting test and answers a different question: `dl-prof-anon` has a
 * registration and no login, because an `onboarding.state` frame carries neither an address nor a
 * name.
 */
export function hasRegistration(link: IDirectoryLink | null | undefined): boolean {
  return !!link?.lastEventAt;
}

/**
 * The status hc-patient reports for a membership that is waiting on a decision.
 *
 * One of their five, and the only one that means "awaiting action" — which is the whole reason
 * `PlanChosen` is published. It is a literal because it is *their* vocabulary: this console does not
 * own the value and cannot enumerate what they may add, so it names the one it acts on and asks the
 * server for exactly that rather than fetching every choice and filtering here.
 */
export const PLAN_STATUS_PENDING = 'PENDING';

/**
 * Whether this row carries a plan choice at all.
 *
 * `planCode` and not `planStatus`, on the same reasoning `hasProfileStatus` gives one contract along:
 * the api writes each of the four fields only when the event carried it, and a membership created
 * through hc-patient's administrative path can legitimately carry no status. A missing code is the
 * closest thing to "no choice has been made", and a choice with no tier on it is not something to
 * put under a heading naming tiers.
 */
export function hasPlanChoice(link: IDirectoryLink | null | undefined): boolean {
  return !!link?.planCode;
}
