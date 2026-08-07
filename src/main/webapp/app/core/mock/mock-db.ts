/**
 * The seed dataset, ported from `admin-demo.html`.
 *
 * The prototype's own constants are reproduced verbatim below as `DEMO_*`
 * arrays — same names, same Ghana digital addresses, same diaspora sponsors,
 * same ports, same prices. They are then mapped onto the JDL entity model.
 * Keeping the two steps separate is deliberate: the literal block can be
 * diffed against the prototype line for line, which is what makes "data
 * parity with the prototype" checkable rather than asserted.
 *
 * Rows are stored in REST shape — dates are ISO strings, not dayjs objects —
 * because that is what a real endpoint returns and what the generated
 * services' `convertValueFromServer` expects to receive.
 *
 * WHERE THE PROTOTYPE HAS NO VALUE, THIS FILE LEAVES NULL. The JDL marks
 * several Profile fields required (dateOfBirth, sex, idType, idNumber), and
 * the prototype supplies them for patients but not for professionals.
 * Inventing birthdates and national ID numbers for named people to satisfy a
 * validator is worse than a null, so the professionals' profiles carry nulls
 * there. `Document`, `CareActivity` and `UserOption` are seeded empty for the
 * same reason: they come from the PDF's entity model and the prototype has no
 * records for them.
 */

// ============================================================
// THE PROTOTYPE'S OWN DATA — transcribed, not adapted
// ============================================================

export const DEMO_ORG = {
  name: 'Abofonsa BridgeCare',
  legal: 'Abofonsa BridgeCare Ltd.',
  desc: 'Diaspora-funded home and clinical care coordination for families in Ghana. Providing peace of mind across borders.',
  rc: 'CS-2019-0884417',
  tin: 'C0031884417',
  founded: '14 Mar 2019',
  addr: {
    digital: 'GA-184-7723',
    street: '17 Nsawam Road, Kokomlemle',
    town: 'Kokomlemle',
    city: 'Accra',
    region: 'Greater Accra',
    country: 'Ghana',
  },
  phone: '+233 30 273 1188',
  email: 'operations@abofonsa.care',
  hours: 'Desk 07:00–19:00 GMT · Care line 24/7',
};

export const DEMO_ME = {
  name: 'Efua Mensah',
  first: 'Efua',
  initials: 'EM',
  title: 'Mrs.',
  role: 'Operations administrator',
  roleKey: 'ops',
  email: 'efua.mensah@abofonsa.care',
  phone: '+233 24 881 0426',
  idType: 'Ghana Card',
  idNo: 'GHA-7218840-3',
  hub: 'Accra Hub',
  since: '02 Feb 2021',
};

export const DEMO_PROS = [
  {
    id: 'p1',
    name: 'Dr. Ama Boateng',
    mono: 'AB',
    role: 'Doctor',
    spec: 'Internal medicine',
    team: 'Clinical review',
    lic: 'MDC/RN/23-4471',
    verified: 'verified',
    status: 'active',
    phone: '+233 24 551 7788',
    email: 'a.boateng@abofonsa.care',
    patients: 34,
    cases: 12,
    visits: 41,
    rating: 4.9,
    joined: '11 Jun 2021',
    hub: 'Accra Hub',
  },
  {
    id: 'p2',
    name: 'Nurse Kwesi Owusu',
    mono: 'KO',
    role: 'Nurse',
    spec: 'Geriatric nursing',
    team: 'Home visits · North',
    lic: 'NMC/GH/19-8820',
    verified: 'verified',
    status: 'active',
    phone: '+233 20 447 1290',
    email: 'k.owusu@abofonsa.care',
    patients: 28,
    cases: 9,
    visits: 63,
    rating: 4.8,
    joined: '03 Sep 2020',
    hub: 'Accra Hub',
  },
  {
    id: 'p3',
    name: 'Akosua Danso',
    mono: 'AD',
    role: 'Caregiver',
    spec: 'Daily living support',
    team: 'Home visits · South',
    lic: 'CG/ABF/22-114',
    verified: 'verified',
    status: 'active',
    phone: '+233 27 330 5514',
    email: 'a.danso@abofonsa.care',
    patients: 19,
    cases: 6,
    visits: 88,
    rating: 4.7,
    joined: '19 Jan 2022',
    hub: 'Accra Hub',
  },
  {
    id: 'p4',
    name: 'Yaw Antwi',
    mono: 'YA',
    role: 'Paramedic',
    spec: 'Emergency response',
    team: 'Rapid response',
    lic: 'AMB/GH/21-3092',
    verified: 'verified',
    status: 'active',
    phone: '+233 55 210 6647',
    email: 'y.antwi@abofonsa.care',
    patients: 12,
    cases: 15,
    visits: 22,
    rating: 4.9,
    joined: '27 Apr 2021',
    hub: 'Accra Hub',
  },
  {
    id: 'p5',
    name: 'Dr. Nii Adjei Osae',
    mono: 'NO',
    role: 'Doctor',
    spec: 'Cardiology',
    team: 'Clinical review',
    lic: 'MDC/RN/20-1187',
    verified: 'verified',
    status: 'leave',
    phone: '+233 24 902 4471',
    email: 'n.osae@abofonsa.care',
    patients: 21,
    cases: 8,
    visits: 19,
    rating: 4.8,
    joined: '08 Feb 2020',
    hub: 'Kumasi Hub',
  },
  {
    id: 'p6',
    name: 'Adjoa Sarpong',
    mono: 'AS',
    role: 'Nurse',
    spec: 'Wound care',
    team: 'Home visits · North',
    lic: 'NMC/GH/22-4410',
    verified: 'verified',
    status: 'active',
    phone: '+233 26 118 3390',
    email: 'a.sarpong@abofonsa.care',
    patients: 17,
    cases: 5,
    visits: 47,
    rating: 4.6,
    joined: '14 Nov 2022',
    hub: 'Kumasi Hub',
  },
  {
    id: 'p7',
    name: 'Kofi Ntim',
    mono: 'KN',
    role: 'Caregiver',
    spec: 'Mobility & physio support',
    team: 'Home visits · South',
    lic: 'CG/ABF/24-206',
    verified: 'pending',
    status: 'pending',
    phone: '+233 20 664 8812',
    email: 'k.ntim@abofonsa.care',
    patients: 0,
    cases: 0,
    visits: 0,
    rating: 0,
    joined: '28 Jul 2026',
    hub: 'Accra Hub',
  },
  {
    id: 'p8',
    name: 'Abena Frimpong',
    mono: 'AF',
    role: 'Paramedic',
    spec: 'Emergency response',
    team: 'Rapid response',
    lic: 'AMB/GH/26-0117',
    verified: 'pending',
    status: 'pending',
    phone: '+233 54 771 2205',
    email: 'a.frimpong@abofonsa.care',
    patients: 0,
    cases: 0,
    visits: 0,
    rating: 0,
    joined: '31 Jul 2026',
    hub: 'Accra Hub',
  },
  {
    id: 'p9',
    name: 'Mensah Akoto',
    mono: 'MA',
    role: 'Nurse',
    spec: 'Chronic disease management',
    team: 'Clinical review',
    lic: 'NMC/GH/18-2204',
    verified: 'verified',
    status: 'suspended',
    phone: '+233 24 330 9987',
    email: 'm.akoto@abofonsa.care',
    patients: 0,
    cases: 2,
    visits: 31,
    rating: 4.2,
    joined: '22 May 2019',
    hub: 'Kumasi Hub',
  },
];

export const DEMO_PATIENTS = [
  {
    id: 'a1',
    name: 'Kojo Ampia-Addison',
    mono: 'KA',
    sex: 'M',
    dob: '19 Apr 1976',
    age: 50,
    phone: '+233 24 228 6304',
    email: 'kojo@jac.net',
    idType: 'Ghana Card',
    idNo: 'GHA-1140228-6',
    digital: 'GA-102-4471',
    street: '12 Ring Road East',
    town: 'Osu',
    city: 'Accra',
    region: 'Greater Accra',
    country: 'Ghana',
    angel: 'Ophelia Gaisie',
    angelPhone: '+233 50 228 6304',
    angelRel: 'Spouse',
    plan: 'Bridge Plus',
    status: 'active',
    cases: 12,
    lead: 'p1',
    joined: '14 Jan 2019',
    last: '02 Aug 2026',
  },
  {
    id: 'a2',
    name: 'Kwabena Adda Frimpong',
    mono: 'KF',
    sex: 'M',
    dob: '02 Oct 1948',
    age: 77,
    phone: '+233 20 771 4408',
    email: 'k.frimpong@mail.gh',
    idType: 'Ghana Card',
    idNo: 'GHA-4820117-2',
    digital: 'AK-039-8812',
    street: '4 Ahodwo Road',
    town: 'Ahodwo',
    city: 'Kumasi',
    region: 'Ashanti',
    country: 'Ghana',
    angel: 'Nana Frimpong',
    angelPhone: '+44 7700 900412',
    angelRel: 'Son · London',
    plan: 'Bridge Family',
    status: 'active',
    cases: 9,
    lead: 'p5',
    joined: '22 Mar 2020',
    last: '01 Aug 2026',
  },
  {
    id: 'a3',
    name: 'Nii Adjei Osae',
    mono: 'NO',
    sex: 'M',
    dob: '30 Nov 1955',
    age: 70,
    phone: '+233 27 118 9930',
    email: 'nii.osae@mail.gh',
    idType: 'Passport',
    idNo: 'G-2287714',
    digital: 'GA-447-1120',
    street: '88 Spintex Road',
    town: 'Baatsona',
    city: 'Accra',
    region: 'Greater Accra',
    country: 'Ghana',
    angel: 'Naa Osae',
    angelPhone: '+1 917 555 0142',
    angelRel: 'Daughter · New York',
    plan: 'Bridge Plus',
    status: 'active',
    cases: 6,
    lead: 'p2',
    joined: '09 Sep 2021',
    last: '30 Jul 2026',
  },
  {
    id: 'a4',
    name: 'Ama Serwaa',
    mono: 'AS',
    sex: 'F',
    dob: '11 Jul 1962',
    age: 64,
    phone: '+233 24 660 1174',
    email: 'a.serwaa@mail.gh',
    idType: 'Ghana Card',
    idNo: 'GHA-6621174-8',
    digital: 'AK-118-2204',
    street: '21 Danyame Crescent',
    town: 'Danyame',
    city: 'Kumasi',
    region: 'Ashanti',
    country: 'Ghana',
    angel: 'Kwame Serwaa',
    angelPhone: '+49 170 5550118',
    angelRel: 'Son · Berlin',
    plan: 'Bridge Essential',
    status: 'active',
    cases: 4,
    lead: 'p6',
    joined: '17 Feb 2022',
    last: '29 Jul 2026',
  },
  {
    id: 'a5',
    name: 'Yaa Asantewaa',
    mono: 'YA',
    sex: 'F',
    dob: '25 Dec 1944',
    age: 81,
    phone: '+233 20 993 4417',
    email: 'yaa.a@mail.gh',
    idType: 'Ghana Card',
    idNo: 'GHA-4412290-1',
    digital: 'GA-771-0093',
    street: '3 Labone Crescent',
    town: 'Labone',
    city: 'Accra',
    region: 'Greater Accra',
    country: 'Ghana',
    angel: 'Akua Asantewaa',
    angelPhone: '+1 646 555 0177',
    angelRel: 'Granddaughter · New Jersey',
    plan: 'Bridge Family',
    status: 'active',
    cases: 11,
    lead: 'p1',
    joined: '05 Jun 2019',
    last: '03 Aug 2026',
  },
  {
    id: 'a6',
    name: 'Kwaku Darkwa',
    mono: 'KD',
    sex: 'M',
    dob: '08 Mar 1958',
    age: 68,
    phone: '+233 55 220 3318',
    email: 'k.darkwa@mail.gh',
    idType: 'Ghana Card',
    idNo: 'GHA-5803318-4',
    digital: 'GA-220-3318',
    street: '9 Tema Community 5',
    town: 'Community 5',
    city: 'Tema',
    region: 'Greater Accra',
    country: 'Ghana',
    angel: 'Esi Darkwa',
    angelPhone: '+233 24 111 2093',
    angelRel: 'Sister',
    plan: 'Bridge Essential',
    status: 'active',
    cases: 3,
    lead: 'p3',
    joined: '28 Oct 2023',
    last: '26 Jul 2026',
  },
  {
    id: 'a7',
    name: 'Beatrice Sarsah',
    mono: 'BS',
    sex: 'F',
    dob: '17 May 1969',
    age: 57,
    phone: '+233 24 771 0084',
    email: 'b.sarsah@mail.gh',
    idType: 'Ghana Card',
    idNo: 'GHA-6910084-7',
    digital: 'WR-044-1180',
    street: '6 Beach Road',
    town: 'Anaji',
    city: 'Takoradi',
    region: 'Western',
    country: 'Ghana',
    angel: 'Kojo Sarsah',
    angelPhone: '+31 6 55501182',
    angelRel: 'Brother · Amsterdam',
    plan: 'Bridge Plus',
    status: 'pending',
    cases: 0,
    lead: 'p2',
    joined: '02 Aug 2026',
    last: '02 Aug 2026',
  },
  {
    id: 'a8',
    name: 'Emmanuel Sam',
    mono: 'ES',
    sex: 'M',
    dob: '30 Jan 1951',
    age: 75,
    phone: '+233 26 004 7719',
    email: 'e.sam@mail.gh',
    idType: 'Ghana Card',
    idNo: 'GHA-5147719-0',
    digital: 'GA-004-7719',
    street: '44 Achimota Mile 7',
    town: 'Achimota',
    city: 'Accra',
    region: 'Greater Accra',
    country: 'Ghana',
    angel: 'Grace Sam',
    angelPhone: '+1 240 555 0166',
    angelRel: 'Daughter · Maryland',
    plan: 'Bridge Plus',
    status: 'active',
    cases: 7,
    lead: 'p4',
    joined: '11 Dec 2020',
    last: '04 Aug 2026',
  },
  {
    id: 'a9',
    name: 'Patience Baah',
    mono: 'PB',
    sex: 'F',
    dob: '22 Aug 1973',
    age: 52,
    phone: '+233 20 118 4402',
    email: 'p.baah@mail.gh',
    idType: 'Ghana Card',
    idNo: 'GHA-7318440-9',
    digital: 'AK-118-4402',
    street: '15 Nhyiaeso Street',
    town: 'Nhyiaeso',
    city: 'Kumasi',
    region: 'Ashanti',
    country: 'Ghana',
    angel: 'Yaw Baah',
    angelPhone: '+233 24 550 1187',
    angelRel: 'Husband',
    plan: 'Bridge Essential',
    status: 'suspended',
    cases: 2,
    lead: 'p6',
    joined: '19 Apr 2023',
    last: '12 Jun 2026',
  },
  {
    id: 'a10',
    name: 'Kwabena Ofosu',
    mono: 'KO',
    sex: 'M',
    dob: '04 Feb 1940',
    age: 86,
    phone: '+233 24 330 1102',
    email: 'k.ofosu@mail.gh',
    idType: 'Ghana Card',
    idNo: 'GHA-4021102-5',
    digital: 'GA-330-1102',
    street: '2 Adabraka High Street',
    town: 'Adabraka',
    city: 'Accra',
    region: 'Greater Accra',
    country: 'Ghana',
    angel: 'Adwoa Ofosu',
    angelPhone: '+44 7700 900733',
    angelRel: 'Daughter · Manchester',
    plan: 'Bridge Family',
    status: 'active',
    cases: 14,
    lead: 'p1',
    joined: '03 Jan 2019',
    last: '05 Aug 2026',
  },
  {
    id: 'a11',
    name: 'Gifty Akator',
    mono: 'GA',
    sex: 'F',
    dob: '09 Sep 1966',
    age: 59,
    phone: '+233 27 660 3341',
    email: 'g.akator@mail.gh',
    idType: 'Ghana Card',
    idNo: 'GHA-6603341-2',
    digital: 'VR-066-3341',
    street: '7 Volta Street',
    town: 'Ho Bankoe',
    city: 'Ho',
    region: 'Volta',
    country: 'Ghana',
    angel: 'Selorm Akator',
    angelPhone: '+1 718 555 0193',
    angelRel: 'Son · Bronx',
    plan: 'Bridge Plus',
    status: 'active',
    cases: 5,
    lead: 'p3',
    joined: '25 Jul 2022',
    last: '28 Jul 2026',
  },
  {
    id: 'a12',
    name: 'Solomon Tetteh',
    mono: 'ST',
    sex: 'M',
    dob: '14 Jun 1980',
    age: 46,
    phone: '+233 55 881 0074',
    email: 's.tetteh@mail.gh',
    idType: 'Passport',
    idNo: 'G-4471180',
    digital: 'GA-881-0074',
    street: '31 Dansoman Last Stop',
    town: 'Dansoman',
    city: 'Accra',
    region: 'Greater Accra',
    country: 'Ghana',
    angel: 'Naa Tetteh',
    angelPhone: '+233 24 771 3308',
    angelRel: 'Wife',
    plan: 'Bridge Essential',
    status: 'pending',
    cases: 0,
    lead: 'p2',
    joined: '04 Aug 2026',
    last: '04 Aug 2026',
  },
];

export const DEMO_VENDORS = [
  {
    id: 'v1',
    name: 'Kaneshie Medical Supplies',
    cat: 'Consumables',
    service: 'Dressings, gloves, mobility aids',
    contact: 'Ernest Adu',
    phone: '+233 30 222 8814',
    email: 'orders@kaneshiemed.gh',
    city: 'Accra',
    status: 'active',
    contract: 'Renews 31 Dec 2026',
    orders: 148,
    spend: 84200,
    rating: 4.7,
  },
  {
    id: 'v2',
    name: 'Ridge Diagnostics Lab',
    cat: 'Diagnostics',
    service: 'Bloods, urea & electrolytes, imaging referral',
    contact: 'Dr. Selina Ofori',
    phone: '+233 30 277 1140',
    email: 'lab@ridgediagnostics.gh',
    city: 'Accra',
    status: 'active',
    contract: 'Renews 30 Jun 2027',
    orders: 302,
    spend: 156800,
    rating: 4.9,
  },
  {
    id: 'v3',
    name: 'GoldStar Pharmacy',
    cat: 'Pharmacy',
    service: 'Prescription fulfilment & delivery',
    contact: 'Ibrahim Yakubu',
    phone: '+233 24 118 7730',
    email: 'dispense@goldstarrx.gh',
    city: 'Kumasi',
    status: 'active',
    contract: 'Renews 30 Sep 2026',
    orders: 511,
    spend: 233400,
    rating: 4.6,
  },
  {
    id: 'v4',
    name: 'SwiftAmb Transport',
    cat: 'Transport',
    service: 'Non-emergency patient transport, ambulance',
    contact: 'Michael Tetteh',
    phone: '+233 55 330 0091',
    email: 'dispatch@swiftamb.gh',
    city: 'Accra',
    status: 'active',
    contract: 'Renews 28 Feb 2027',
    orders: 96,
    spend: 61300,
    rating: 4.8,
  },
  {
    id: 'v5',
    name: 'Homecare Equipment GH',
    cat: 'Equipment',
    service: 'Hospital beds, oxygen concentrators, hoists',
    contact: 'Doris Nyarko',
    phone: '+233 20 881 4470',
    email: 'hire@homecare-equip.gh',
    city: 'Tema',
    status: 'review',
    contract: 'Expires 31 Aug 2026',
    orders: 44,
    spend: 39900,
    rating: 4.1,
  },
  {
    id: 'v6',
    name: 'Volta Nutrition Services',
    cat: 'Nutrition',
    service: 'Therapeutic meal plans and delivery',
    contact: 'Selorm Agbeko',
    phone: '+233 27 004 1128',
    email: 'plans@voltanutrition.gh',
    city: 'Ho',
    status: 'active',
    contract: 'Renews 31 Mar 2027',
    orders: 187,
    spend: 52700,
    rating: 4.5,
  },
  {
    id: 'v7',
    name: 'Takoradi Physio Partners',
    cat: 'Therapy',
    service: 'Home physiotherapy sessions',
    contact: 'Gifty Mensah',
    phone: '+233 24 550 3312',
    email: 'bookings@tkphysio.gh',
    city: 'Takoradi',
    status: 'active',
    contract: 'Renews 31 Jan 2027',
    orders: 73,
    spend: 41100,
    rating: 4.4,
  },
  {
    id: 'v8',
    name: 'BridgePay Settlement',
    cat: 'Payments',
    service: '3rd-party payment API gateway',
    contact: 'Nana Owusu',
    phone: '+233 30 288 0012',
    email: 'support@bridgepay.gh',
    city: 'Accra',
    status: 'active',
    contract: 'Renews 31 Dec 2026',
    orders: 0,
    spend: 0,
    rating: 4.9,
  },
  {
    id: 'v9',
    name: 'Cape Coast Care Linens',
    cat: 'Consumables',
    service: 'Laundry, linens, incontinence supplies',
    contact: 'Abena Quaye',
    phone: '+233 26 770 4419',
    email: 'hello@cclinens.gh',
    city: 'Cape Coast',
    status: 'pending',
    contract: 'Awaiting first contract',
    orders: 0,
    spend: 0,
    rating: 0,
  },
];

export const DEMO_MESSAGES = [
  {
    id: 'm1',
    d: '05 Aug 2026',
    tm: '08:12',
    from: 'k.ofosu@mail.gh',
    who: 'Kwabena Ofosu',
    subj: 'Home visit rescheduling request',
    chan: 'Patient app',
    status: 'new',
    prio: 'high',
    body: 'Good morning. The nurse is booked for Thursday 09:00 but I have a clinic appointment at Korle Bu that morning. Could the visit move to Friday afternoon? My daughter in Manchester has already been notified.',
  },
  {
    id: 'm2',
    d: '05 Aug 2026',
    tm: '07:41',
    from: 'a.serwaa@mail.gh',
    who: 'Ama Serwaa',
    subj: 'Service plan upgrade — Essential to Plus',
    chan: 'Patient app',
    status: 'new',
    prio: 'normal',
    body: 'My son in Berlin would like to move my plan up so that the physiotherapy sessions are included. What is the difference in the monthly amount and when would it start?',
  },
  {
    id: 'm3',
    d: '04 Aug 2026',
    tm: '19:26',
    from: 'g.akator@mail.gh',
    who: 'Gifty Akator',
    subj: 'Lab report not visible in my record',
    chan: 'Patient app',
    status: 'new',
    prio: 'high',
    body: 'Ridge Diagnostics say my urea and electrolytes result was sent on Saturday, but nothing appears under Reports in my record. Please check.',
  },
  {
    id: 'm4',
    d: '04 Aug 2026',
    tm: '15:03',
    from: 'k.owusu@abofonsa.care',
    who: 'Nurse Kwesi Owusu',
    subj: 'Duty roster clash — Wednesday night',
    chan: 'Professional app',
    status: 'read',
    prio: 'high',
    body: 'I am rostered for the Wednesday night shift and the Thursday early shift back to back. That leaves under six hours between. Can one of them be reassigned?',
  },
  {
    id: 'm5',
    d: '04 Aug 2026',
    tm: '11:47',
    from: 'k.darkwa@mail.gh',
    who: 'Kwaku Darkwa',
    subj: 'Angel contact update',
    chan: 'Patient app',
    status: 'read',
    prio: 'normal',
    body: 'Please change my next-of-kin number. My sister Esi has a new line: 024 111 2093. The old MTN number is no longer in use.',
  },
  {
    id: 'm6',
    d: '03 Aug 2026',
    tm: '16:22',
    from: 'lab@ridgediagnostics.gh',
    who: 'Ridge Diagnostics Lab',
    subj: 'August pricing schedule attached',
    chan: 'Vendor portal',
    status: 'read',
    prio: 'normal',
    body: 'Please find our revised schedule effective 01 September. Panel pricing is unchanged; home phlebotomy call-out rises by 8 cedis.',
  },
  {
    id: 'm7',
    d: '03 Aug 2026',
    tm: '09:58',
    from: 'e.sam@mail.gh',
    who: 'Emmanuel Sam',
    subj: 'Thank you to the rapid response team',
    chan: 'Patient app',
    status: 'replied',
    prio: 'low',
    body: 'Yaw and his team reached the house in under twenty minutes on Sunday. My daughter in Maryland was on the call the whole time. Please pass on our thanks.',
  },
  {
    id: 'm8',
    d: '02 Aug 2026',
    tm: '14:31',
    from: 'b.sarsah@mail.gh',
    who: 'Beatrice Sarsah',
    subj: 'Registration — documents uploaded',
    chan: 'Patient app',
    status: 'replied',
    prio: 'normal',
    body: 'I have uploaded my Ghana Card and the referral letter from my GP. My brother in Amsterdam is the sponsor on the account. Is anything else needed before approval?',
  },
  {
    id: 'm9',
    d: '02 Aug 2026',
    tm: '10:09',
    from: 'dispense@goldstarrx.gh',
    who: 'GoldStar Pharmacy',
    subj: 'Delivery exception — Kumasi route',
    chan: 'Vendor portal',
    status: 'replied',
    prio: 'normal',
    body: 'Three deliveries on the Nhyiaeso route were returned; the rider could not reach the recipients. We will retry Monday unless you advise otherwise.',
  },
  {
    id: 'm10',
    d: '01 Aug 2026',
    tm: '17:44',
    from: 'a.boateng@abofonsa.care',
    who: 'Dr. Ama Boateng',
    subj: 'Case escalation — patient a5',
    chan: 'Professional app',
    status: 'replied',
    prio: 'high',
    body: 'Yaa Asantewaa needs a cardiology review this month. Dr. Osae is on leave — can the referral route to an external partner instead?',
  },
  {
    id: 'm11',
    d: '01 Aug 2026',
    tm: '08:15',
    from: 'k.frimpong@mail.gh',
    who: 'Kwabena Adda Frimpong',
    subj: 'Monthly summary for my son',
    chan: 'Patient app',
    status: 'replied',
    prio: 'low',
    body: 'Please make sure the monthly care summary reaches Nana in London by the first week. Last month it arrived late and he chased me about it.',
  },
  {
    id: 'm12',
    d: '31 Jul 2026',
    tm: '12:50',
    from: 'y.antwi@abofonsa.care',
    who: 'Yaw Antwi',
    subj: 'Vehicle service due — response unit 2',
    chan: 'Professional app',
    status: 'replied',
    prio: 'normal',
    body: 'Unit 2 is due its 20,000 km service next week. SwiftAmb can cover our calls for two days if we schedule it Tuesday and Wednesday.',
  },
];

export const DEMO_DAYS = ['Mon 03', 'Tue 04', 'Wed 05', 'Thu 06', 'Fri 07', 'Sat 08', 'Sun 09'];

/** Seven days per professional; '' means unassigned. */
export const DEMO_ROSTER_SEED: Record<string, string[]> = {
  p1: ['D', 'D', 'D', 'O', 'D', '', 'O'],
  p2: ['E', 'E', 'N', 'D', 'O', 'O', 'E'],
  p3: ['D', 'D', 'O', 'D', 'D', 'E', ''],
  p4: ['N', 'N', 'O', 'N', 'N', 'D', 'D'],
  p5: ['O', 'O', 'O', 'O', 'O', 'O', 'O'],
  p6: ['D', 'O', 'D', 'E', 'E', '', 'O'],
  p9: ['', '', '', '', '', '', ''],
};

export const DEMO_TASKS = [
  {
    id: 't1',
    t: 'Verify Kofi Ntim caregiver licence with the registry',
    col: 'todo',
    prio: 'high',
    own: 'p1',
    due: '07 Aug 2026',
    tag: 'Onboarding',
  },
  {
    id: 't2',
    t: 'Approve Beatrice Sarsah patient registration',
    col: 'todo',
    prio: 'high',
    own: 'p2',
    due: '06 Aug 2026',
    tag: 'Accounts',
  },
  {
    id: 't3',
    t: 'Resolve Wednesday night roster clash for Kwesi Owusu',
    col: 'todo',
    prio: 'high',
    own: 'p2',
    due: '06 Aug 2026',
    tag: 'Roster',
  },
  {
    id: 't4',
    t: 'Renew Homecare Equipment GH contract before 31 Aug',
    col: 'todo',
    prio: 'normal',
    own: 'p4',
    due: '20 Aug 2026',
    tag: 'Vendors',
  },
  { id: 't5', t: 'Publish September catalogue price update', col: 'todo', prio: 'low', own: 'p3', due: '25 Aug 2026', tag: 'Catalog' },
  {
    id: 't6',
    t: 'Chase Ridge Diagnostics on the missing urea report',
    col: 'doing',
    prio: 'high',
    own: 'p1',
    due: '05 Aug 2026',
    tag: 'Reports',
  },
  {
    id: 't7',
    t: 'Draft cardiology cover arrangement while Dr. Osae is on leave',
    col: 'doing',
    prio: 'high',
    own: 'p1',
    due: '08 Aug 2026',
    tag: 'Clinical',
  },
  {
    id: 't8',
    t: 'Migrate Kumasi hub rosters onto the new template',
    col: 'doing',
    prio: 'normal',
    own: 'p6',
    due: '12 Aug 2026',
    tag: 'Roster',
  },
  {
    id: 't9',
    t: 'Quarterly review of Bridge Family plan pricing',
    col: 'doing',
    prio: 'normal',
    own: 'p4',
    due: '15 Aug 2026',
    tag: 'Plans',
  },
  {
    id: 't10',
    t: 'Suspend Mensah Akoto pending HR investigation',
    col: 'done',
    prio: 'high',
    own: 'p1',
    due: '28 Jul 2026',
    tag: 'Accounts',
  },
  {
    id: 't11',
    t: 'Onboard Volta Nutrition Services to the vendor portal',
    col: 'done',
    prio: 'normal',
    own: 'p3',
    due: '24 Jul 2026',
    tag: 'Vendors',
  },
  {
    id: 't12',
    t: 'Roll out July care summaries to all sponsor contacts',
    col: 'done',
    prio: 'normal',
    own: 'p2',
    due: '02 Aug 2026',
    tag: 'Comms',
  },
  { id: 't13', t: 'Patch admin gateway to 5504.3 and restart', col: 'done', prio: 'high', own: 'p4', due: '19 Jul 2026', tag: 'Platform' },
];

export const DEMO_PLANS = [
  {
    id: 'pl1',
    tier: 'Entry',
    name: 'Bridge Essential',
    price: 320,
    per: 'GHS / month',
    feat: true,
    subs: 41,
    desc: 'Monthly check-in visit, record keeping and the 24/7 care line.',
    items: [
      '1 home visit per month',
      'Full digital health record',
      '24/7 care line access',
      'Monthly summary to one sponsor',
      'Pharmacy delivery at cost',
    ],
  },
  {
    id: 'pl2',
    tier: 'Most chosen',
    name: 'Bridge Plus',
    price: 680,
    per: 'GHS / month',
    feat: false,
    subs: 52,
    desc: 'Fortnightly nursing visits, physiotherapy and priority scheduling.',
    items: [
      '2 home visits per month',
      'Physiotherapy sessions included',
      'Priority appointment scheduling',
      'Quarterly doctor review',
      'Summaries to up to three sponsors',
      'Lab panel twice yearly',
    ],
  },
  {
    id: 'pl3',
    tier: 'Full cover',
    name: 'Bridge Family',
    price: 1240,
    per: 'GHS / month',
    feat: false,
    subs: 23,
    desc: 'Weekly care, rapid response cover and a named clinical lead.',
    items: [
      'Weekly home visits',
      'Named doctor as clinical lead',
      'Rapid response cover included',
      'Unlimited sponsor accounts',
      'Full lab panel quarterly',
      'Equipment hire at 50%',
      'Live video visit on request',
    ],
  },
];

export const DEMO_CATEGORIES = [
  { id: 'c1', name: 'Clinical visits', desc: 'Nurse, doctor and paramedic attendance at the home', icon: 'stetho' },
  { id: 'c2', name: 'Diagnostics', desc: 'Laboratory panels, imaging referral and phlebotomy', icon: 'report' },
  { id: 'c3', name: 'Daily living', desc: 'Grooming, mobility, companionship and household support', icon: 'leaf' },
  { id: 'c4', name: 'Pharmacy', desc: 'Prescription fulfilment, dosette packing and delivery', icon: 'pill' },
  { id: 'c5', name: 'Equipment', desc: 'Beds, oxygen, hoists and mobility aid hire', icon: 'card' },
  { id: 'c6', name: 'Transport', desc: 'Clinic runs, discharge transport and ambulance', icon: 'pin' },
];

export const DEMO_ACTIVITIES = [
  { id: 'ac1', cat: 'c1', name: 'Routine nursing visit', unit: 'per visit', price: 180, dur: '60 min', active: true },
  { id: 'ac2', cat: 'c1', name: 'Doctor home consultation', unit: 'per visit', price: 450, dur: '45 min', active: true },
  { id: 'ac3', cat: 'c1', name: 'Wound dressing', unit: 'per visit', price: 140, dur: '30 min', active: true },
  { id: 'ac4', cat: 'c1', name: 'Rapid response call-out', unit: 'per call', price: 620, dur: 'On demand', active: true },
  { id: 'ac5', cat: 'c2', name: 'Urea & electrolytes panel', unit: 'per test', price: 210, dur: '24 h result', active: true },
  { id: 'ac6', cat: 'c2', name: 'Full blood count', unit: 'per test', price: 160, dur: '24 h result', active: true },
  { id: 'ac7', cat: 'c2', name: 'Home phlebotomy call-out', unit: 'per visit', price: 95, dur: '20 min', active: true },
  { id: 'ac8', cat: 'c3', name: 'Grooming & bathing support', unit: 'per session', price: 120, dur: '90 min', active: true },
  { id: 'ac9', cat: 'c3', name: 'Companionship visit', unit: 'per session', price: 85, dur: '120 min', active: true },
  { id: 'ac10', cat: 'c3', name: 'Physiotherapy session', unit: 'per session', price: 230, dur: '45 min', active: true },
  { id: 'ac11', cat: 'c4', name: 'Prescription fulfilment', unit: 'per script', price: 40, dur: 'Same day', active: true },
  { id: 'ac12', cat: 'c4', name: 'Weekly dosette packing', unit: 'per week', price: 65, dur: 'Weekly', active: true },
  { id: 'ac13', cat: 'c5', name: 'Hospital bed hire', unit: 'per month', price: 540, dur: 'Monthly', active: true },
  { id: 'ac14', cat: 'c5', name: 'Oxygen concentrator hire', unit: 'per month', price: 720, dur: 'Monthly', active: false },
  { id: 'ac15', cat: 'c6', name: 'Clinic transport, one way', unit: 'per trip', price: 150, dur: 'Scheduled', active: true },
  { id: 'ac16', cat: 'c6', name: 'Ambulance transfer', unit: 'per trip', price: 880, dur: 'On demand', active: true },
];

/**
 * The port map from the architecture page. `plane` groups them the way the
 * platform-health screen does; it is the one column the prototype expresses
 * through layout rather than a field.
 */
export const DEMO_SERVICES = [
  { port: 5501, nm: 'Admin Dashboard', host: 'hc-admin-dashboard', up: 'ok', ms: 68, plane: 'Admin' },
  { port: 5504, nm: 'Admin Gateway', host: 'hc-admin-gateway', up: 'ok', ms: 41, plane: 'Admin' },
  { port: 5507, nm: 'Admin Service', host: 'hc-admin-ms', up: 'ok', ms: 37, plane: 'Admin' },
  { port: 5502, nm: 'Professional Dashboard', host: 'hc-professional-dashboard', up: 'ok', ms: 74, plane: 'Professional' },
  { port: 5505, nm: 'Professional Gateway', host: 'hc-professional-gateway', up: 'ok', ms: 44, plane: 'Professional' },
  { port: 5508, nm: 'Professional Service', host: 'hc-professional-service', up: 'ok', ms: 39, plane: 'Professional' },
  { port: 5503, nm: 'Patient Dashboard', host: 'hc-patient-dashboard', up: 'ok', ms: 71, plane: 'Patient' },
  { port: 5506, nm: 'Patient Gateway', host: 'hc-patient-gateway', up: 'ok', ms: 46, plane: 'Patient' },
  { port: 5509, nm: 'Patient Service', host: 'hc-patient-ms', up: 'ok', ms: 35, plane: 'Patient' },
  { port: 5500, nm: 'Vendor Gateway', host: 'hc-vendor-gw', up: 'warn', ms: 212, plane: 'Vendor and payments' },
  { port: 5512, nm: 'Vendor Service', host: 'hc-vendorr-ms', up: 'ok', ms: 58, plane: 'Vendor and payments' },
  { port: 5511, nm: 'Payment Service', host: 'hc-payment-ms', up: 'ok', ms: 92, plane: 'Vendor and payments' },
  { port: 9092, nm: 'Kafka event bus', host: 'hc-kafka', up: 'ok', ms: 12, plane: 'Core' },
];

export const DEMO_CAPS: [string, string, string][] = [
  ['Realtime message notification', 'bell', 'Live'],
  ['Long term persistence storage', 'save', 'Healthy'],
  ['Metric visualization', 'report', 'Live'],
  ['AI & ML analysis', 'star', 'Beta'],
];

export const DEMO_AUDIT = [
  { ts: '05 Aug · 08:31', who: 'Efua Mensah', act: 'signed in', obj: 'admin-gateway', lvl: 'info' },
  { ts: '04 Aug · 17:02', who: 'Efua Mensah', act: 'suspended account', obj: 'p9 · Mensah Akoto', lvl: 'warn' },
  { ts: '04 Aug · 11:48', who: 'System', act: 'flagged slow response', obj: '5500 · hc-vendor-gw', lvl: 'warn' },
  { ts: '03 Aug · 15:20', who: 'Kwame Asare', act: 'published price update', obj: 'catalog · Diagnostics', lvl: 'info' },
  { ts: '02 Aug · 09:14', who: 'Efua Mensah', act: 'approved vendor', obj: 'v6 · Volta Nutrition', lvl: 'info' },
  { ts: '01 Aug · 18:55', who: 'System', act: 'nightly backup completed', obj: 'mongo · all shards', lvl: 'info' },
  { ts: '31 Jul · 07:40', who: 'Efua Mensah', act: 'rotated API credential', obj: 'BridgePay Settlement', lvl: 'warn' },
];

/**
 * Network totals. The directories hold a live, fully interactive extract of
 * the book; these are the whole-network figures the dashboard reports
 * against. The prototype shows 116/24/9 while loading a 12-record extract,
 * and this build does the same — it does not fabricate 116 patient rows to
 * make a number agree.
 */
export const DEMO_NET = { patients: 116, pros: 24, vendors: 9 };

/** Desk volume per month, 2026. */
export const DEMO_MESSAGE_VOLUME: [string, number][] = [
  ['Feb', 118],
  ['Mar', 143],
  ['Apr', 131],
  ['May', 168],
  ['Jun', 154],
  ['Jul', 187],
];

/** KPI sparkline series, in the prototype's tile order. */
export const DEMO_SPARKLINES: Record<string, number[]> = {
  patients: [98, 102, 105, 109, 112, 116],
  professionals: [18, 19, 21, 22, 23, 24],
  messages: [7, 5, 9, 4, 6, 3],
  tasks: [11, 13, 10, 12, 9, 9],
};

// ============================================================
// MAPPING — prototype values onto the JDL entity model
// ============================================================

const MONTHS: Record<string, string> = {
  Jan: '01',
  Feb: '02',
  Mar: '03',
  Apr: '04',
  May: '05',
  Jun: '06',
  Jul: '07',
  Aug: '08',
  Sep: '09',
  Oct: '10',
  Nov: '11',
  Dec: '12',
};

/** '19 Apr 1976' -> '1976-04-19'. */
export const toIsoDate = (value: string): string => {
  const [day, month, year] = value.trim().split(/\s+/);
  return `${year}-${MONTHS[month]}-${day.padStart(2, '0')}`;
};

/** '05 Aug 2026' + '08:12' -> '2026-08-05T08:12:00Z'. */
export const toIsoInstant = (date: string, time: string): string => `${toIsoDate(date)}T${time}:00Z`;

/** '05 Aug · 08:31' -> '2026-08-05T08:31:00Z'. The trail is all 2026. */
const auditInstant = (stamp: string): string => {
  const [datePart, timePart] = stamp.split('·').map(part => part.trim());
  return toIsoInstant(`${datePart} 2026`, timePart);
};

const ACCOUNT_STATUS: Record<string, string> = {
  active: 'ACTIVE',
  pending: 'PENDING',
  suspended: 'SUSPENDED',
  leave: 'ON_LEAVE',
  review: 'UNDER_REVIEW',
};

const PROFESSIONAL_ROLE: Record<string, string> = {
  Caregiver: 'CAREGIVER',
  Paramedic: 'PARAMEDIC',
  Nurse: 'NURSE',
  Doctor: 'DOCTOR',
};

const CHANNEL: Record<string, string> = {
  'Patient app': 'PATIENT_APP',
  'Professional app': 'PROFESSIONAL_APP',
  'Vendor portal': 'VENDOR_PORTAL',
  Email: 'EMAIL',
};

const ID_TYPE: Record<string, string> = {
  'Ghana Card': 'GHANA_CARD',
  Passport: 'PASSPORT',
  'Voter ID': 'VOTER_ID',
  "Driver's licence": 'DRIVERS_LICENCE',
};

const SHIFT: Record<string, string> = { D: 'DAY', E: 'EVENING', N: 'NIGHT', O: 'OFF' };

const PLAN_TIER: Record<string, string> = {
  'Bridge Essential': 'ESSENTIAL',
  'Bridge Plus': 'PLUS',
  'Bridge Family': 'FAMILY',
};

/**
 * Split a display name into the Profile model's three parts, stripping the
 * honorific the prototype carries inline ("Dr. Ama Boateng", "Nurse Kwesi
 * Owusu"). Only DR and PROF exist in the Title enum; "Nurse" is a role, not a
 * title, so it is dropped rather than forced into a slot that has no value
 * for it.
 */
export const splitName = (fullName: string): { title: string | null; firstName: string; middleName: string | null; lastName: string } => {
  let parts = fullName.trim().split(/\s+/);
  let title: string | null = null;

  if (parts[0] === 'Dr.') {
    title = 'DR';
    parts = parts.slice(1);
  } else if (parts[0] === 'Prof.') {
    title = 'PROF';
    parts = parts.slice(1);
  } else if (parts[0] === 'Nurse') {
    parts = parts.slice(1);
  } else if (parts[0] === 'Mrs.') {
    title = 'MRS';
    parts = parts.slice(1);
  } else if (parts[0] === 'Mr.') {
    title = 'MR';
    parts = parts.slice(1);
  }

  return {
    title,
    firstName: parts[0],
    middleName: parts.length > 2 ? parts.slice(1, -1).join(' ') : null,
    lastName: parts[parts.length - 1],
  };
};

// ---- id allocation -------------------------------------------------------
// Ids are assigned deterministically from array position so a restart returns
// the same graph, and the demo's own string keys ('p1', 'a3', 'm12') map onto
// them through these helpers rather than being scattered through the file.

const proId = (key: string): number => DEMO_PROS.findIndex(p => p.id === key) + 1;
const patId = (key: string): number => DEMO_PATIENTS.findIndex(p => p.id === key) + 1;
const msgId = (key: string): number => DEMO_MESSAGES.findIndex(m => m.id === key) + 1;
const planIdByName = (name: string): number => DEMO_PLANS.findIndex(p => p.name === name) + 1;
const catId = (key: string): number => DEMO_CATEGORIES.findIndex(c => c.id === key) + 1;

export const HUBS = ['Accra Hub', 'Kumasi Hub'];
const hubId = (name: string): number => HUBS.indexOf(name) + 1;

export const TEAMS = ['Clinical review', 'Home visits · North', 'Home visits · South', 'Rapid response'];
const teamId = (name: string): number => TEAMS.indexOf(name) + 1;

/** The prototype's roster week: Monday 3 August 2026. */
export const ROSTER_WEEK_START = '2026-08-03';
export const ROSTER_WEEK_LABEL = 'Week of 3 August 2026';

const rosterDate = (dayIndex: number): string => {
  const start = new Date(`${ROSTER_WEEK_START}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() + dayIndex);
  return start.toISOString().slice(0, 10);
};

// ---- the entity collections ---------------------------------------------

export type MockDatabase = Record<string, any[]>;

export const buildDatabase = (): MockDatabase => {
  // Addresses: one per patient, plus the organisation's and one per hub.
  // Professionals have no address in the prototype and are given none.
  const addresses = DEMO_PATIENTS.map((p, index) => ({
    id: index + 1,
    digitalAddress: p.digital,
    streetAddress: p.street,
    townDistrict: p.town,
    cityState: p.city,
    region: p.region,
    country: p.country,
  }));

  const orgAddressId = addresses.length + 1;
  addresses.push({
    id: orgAddressId,
    digitalAddress: DEMO_ORG.addr.digital,
    streetAddress: DEMO_ORG.addr.street,
    townDistrict: DEMO_ORG.addr.town,
    cityState: DEMO_ORG.addr.city,
    region: DEMO_ORG.addr.region,
    country: DEMO_ORG.addr.country,
  });

  // Profiles: professionals first (ids 1..9), then patients, then the
  // signed-in operator. Patient profile ids are offset by the professional
  // count so both stay stable if either list grows.
  const professionalProfiles = DEMO_PROS.map((pro, index) => {
    const name = splitName(pro.name);
    return {
      id: index + 1,
      title: name.title,
      firstName: name.firstName,
      middleName: name.middleName,
      lastName: name.lastName,
      // Not in the prototype for professionals — see the file header.
      dateOfBirth: null,
      sex: null,
      mobilePhone: pro.phone,
      email: pro.email,
      idType: null,
      idNumber: null,
      address: null,
    };
  });

  const patientProfiles = DEMO_PATIENTS.map((patient, index) => {
    const name = splitName(patient.name);
    return {
      id: DEMO_PROS.length + index + 1,
      title: name.title,
      firstName: name.firstName,
      middleName: name.middleName,
      lastName: name.lastName,
      dateOfBirth: toIsoDate(patient.dob),
      sex: patient.sex === 'M' ? 'MALE' : 'FEMALE',
      mobilePhone: patient.phone,
      email: patient.email,
      idType: ID_TYPE[patient.idType] ?? null,
      idNumber: patient.idNo,
      address: { id: index + 1 },
    };
  });

  const operatorProfileId = DEMO_PROS.length + DEMO_PATIENTS.length + 1;
  const operatorName = splitName(`${DEMO_ME.title} ${DEMO_ME.name}`);
  const operatorProfile = {
    id: operatorProfileId,
    title: operatorName.title,
    firstName: operatorName.firstName,
    middleName: operatorName.middleName,
    lastName: operatorName.lastName,
    dateOfBirth: null,
    sex: null,
    mobilePhone: DEMO_ME.phone,
    email: DEMO_ME.email,
    idType: ID_TYPE[DEMO_ME.idType] ?? null,
    idNumber: DEMO_ME.idNo,
    address: null,
  };

  const profiles = [...professionalProfiles, ...patientProfiles, operatorProfile];

  const angels = DEMO_PATIENTS.map((patient, index) => ({
    id: index + 1,
    name: patient.angel,
    relationship: patient.angelRel,
    phone: patient.angelPhone,
    email: null,
    // The prototype encodes the sponsor's country inside the relationship
    // string ("Son · London"); it is not a separate field there, so it is
    // not invented as one here.
    country: null,
  }));

  const hubs = HUBS.map((name, index) => ({
    id: index + 1,
    name,
    staffCount: DEMO_PROS.filter(pro => pro.hub === name).length,
    address: null,
  }));

  const teams = TEAMS.map((name, index) => ({
    id: index + 1,
    name,
    description: null,
    // Supervisor: the first verified, active professional on the team, which
    // is how the prototype's team column reads on the professionals screen.
    supervisor: (() => {
      const lead = DEMO_PROS.find(pro => pro.team === name && pro.verified === 'verified' && pro.status === 'active');
      return lead ? { id: proId(lead.id), licenceNumber: lead.lic } : null;
    })(),
  }));

  const credentials = DEMO_PROS.map((pro, index) => ({
    id: index + 1,
    email: pro.email,
    phoneNumber: pro.phone,
    passwordHash: null,
    role: 'PROFESSIONAL',
    enabled: pro.status === 'active',
    lastLoginAt: null,
  }));

  const professionals = DEMO_PROS.map((pro, index) => ({
    id: index + 1,
    role: PROFESSIONAL_ROLE[pro.role],
    speciality: pro.spec,
    licenceNumber: pro.lic,
    verification: pro.verified === 'verified' ? 'VERIFIED' : 'PENDING',
    status: ACCOUNT_STATUS[pro.status],
    patientCount: pro.patients,
    caseCount: pro.cases,
    visitCount: pro.visits,
    rating: pro.rating,
    joinedOn: toIsoDate(pro.joined),
    profile: { id: index + 1, firstName: professionalProfiles[index].firstName, lastName: professionalProfiles[index].lastName },
    credential: { id: index + 1, email: pro.email },
    team: { id: teamId(pro.team), name: pro.team },
    hub: { id: hubId(pro.hub), name: pro.hub },
  }));

  const servicePlans = DEMO_PLANS.map((plan, index) => ({
    id: index + 1,
    name: plan.name,
    tier: PLAN_TIER[plan.name],
    tierLabel: plan.tier,
    monthlyPrice: plan.price,
    currency: 'GHS',
    summary: plan.desc,
    featured: plan.feat,
    subscriberCount: plan.subs,
  }));

  let planFeatureId = 0;
  const planFeatures = DEMO_PLANS.flatMap((plan, planIndex) =>
    plan.items.map((label, position) => ({
      id: ++planFeatureId,
      label,
      position,
      plan: { id: planIndex + 1, name: plan.name },
    })),
  );

  const patients = DEMO_PATIENTS.map((patient, index) => ({
    id: index + 1,
    status: ACCOUNT_STATUS[patient.status],
    joinedOn: toIsoDate(patient.joined),
    lastActiveOn: toIsoDate(patient.last),
    caseCount: patient.cases,
    profile: {
      id: patientProfiles[index].id,
      firstName: patientProfiles[index].firstName,
      lastName: patientProfiles[index].lastName,
    },
    angel: { id: index + 1, name: patient.angel },
    plan: { id: planIdByName(patient.plan), name: patient.plan },
    clinicalLead: { id: proId(patient.lead), licenceNumber: DEMO_PROS[proId(patient.lead) - 1].lic },
    // The prototype puts a patient in the hub of their clinical lead.
    hub: (() => {
      const lead = DEMO_PROS[proId(patient.lead) - 1];
      return { id: hubId(lead.hub), name: lead.hub };
    })(),
  }));

  const vendors = DEMO_VENDORS.map((vendor, index) => ({
    id: index + 1,
    name: vendor.name,
    category: vendor.cat,
    serviceSummary: vendor.service,
    contactName: vendor.contact,
    phone: vendor.phone,
    email: vendor.email,
    city: vendor.city,
    status: ACCOUNT_STATUS[vendor.status],
    contractNote: vendor.contract,
    // "Renews 31 Dec 2026" / "Expires 31 Aug 2026" carry a date; "Awaiting
    // first contract" does not, and gets null rather than a guess.
    contractRenewsOn: (() => {
      const match = /(\d{2}) (\w{3}) (\d{4})/.exec(vendor.contract);
      return match ? toIsoDate(`${match[1]} ${match[2]} ${match[3]}`) : null;
    })(),
    orderCount: vendor.orders,
    spendToDate: vendor.spend,
    rating: vendor.rating,
  }));

  const messages = DEMO_MESSAGES.map((message, index) => ({
    id: index + 1,
    sentAt: toIsoInstant(message.d, message.tm),
    fromAddress: message.from,
    senderName: message.who,
    subject: message.subj,
    body: message.body,
    channel: CHANNEL[message.chan],
    status: message.status.toUpperCase(),
    priority: message.prio.toUpperCase(),
  }));

  const tasks = DEMO_TASKS.map((task, index) => ({
    id: index + 1,
    title: task.t,
    state: task.col === 'doing' ? 'DOING' : task.col.toUpperCase(),
    priority: task.prio.toUpperCase(),
    dueOn: toIsoDate(task.due),
    tag: task.tag,
    createdAt: null,
    owner: { id: proId(task.own), licenceNumber: DEMO_PROS[proId(task.own) - 1].lic },
    sourceMessage: null,
  }));

  const rosterWeeks = [
    {
      id: 1,
      label: ROSTER_WEEK_LABEL,
      startDate: ROSTER_WEEK_START,
      published: false,
      publishedAt: null,
    },
  ];

  // Only assigned cells become rows. An unassigned slot is the absence of a
  // ShiftAssignment, not a row with a null shift — that is what lets the
  // roster's "unassigned slots" count be a subtraction rather than a filter.
  let shiftId = 0;
  const shiftAssignments = Object.entries(DEMO_ROSTER_SEED).flatMap(([proKey, week]) =>
    week
      .map((shift, dayIndex) => ({ shift, dayIndex }))
      .filter(cell => cell.shift !== '')
      .map(cell => ({
        id: ++shiftId,
        dayIndex: cell.dayIndex,
        shiftDate: rosterDate(cell.dayIndex),
        shift: SHIFT[cell.shift],
        week: { id: 1, label: ROSTER_WEEK_LABEL },
        professional: { id: proId(proKey), licenceNumber: DEMO_PROS[proId(proKey) - 1].lic },
      })),
  );

  const categories = DEMO_CATEGORIES.map((category, index) => ({
    id: index + 1,
    name: category.name,
    description: category.desc,
    iconKey: category.icon,
  }));

  const serviceActivities = DEMO_ACTIVITIES.map((activity, index) => ({
    id: index + 1,
    name: activity.name,
    unit: activity.unit,
    unitPrice: activity.price,
    duration: activity.dur,
    published: activity.active,
    category: { id: catId(activity.cat), name: DEMO_CATEGORIES[catId(activity.cat) - 1].name },
  }));

  const platformServices = DEMO_SERVICES.map((service, index) => ({
    id: index + 1,
    name: service.nm,
    host: service.host,
    port: service.port,
    plane: service.plane,
    health: service.up === 'ok' ? 'HEALTHY' : 'DEGRADED',
    responseMs: service.ms,
  }));

  const auditEntries = DEMO_AUDIT.map((entry, index) => ({
    id: index + 1,
    occurredAt: auditInstant(entry.ts),
    actor: entry.who,
    action: entry.act,
    target: entry.obj,
    level: entry.lvl.toUpperCase(),
  }));

  const organisations = [
    {
      id: 1,
      name: DEMO_ORG.name,
      legalName: DEMO_ORG.legal,
      description: DEMO_ORG.desc,
      registrationNumber: DEMO_ORG.rc,
      tin: DEMO_ORG.tin,
      foundedOn: toIsoDate(DEMO_ORG.founded),
      switchboard: DEMO_ORG.phone,
      email: DEMO_ORG.email,
      deskHours: DEMO_ORG.hours,
      address: { id: orgAddressId, digitalAddress: DEMO_ORG.addr.digital },
    },
  ];

  return {
    // Keys are the REST resource names the generated services call.
    addresses,
    profiles,
    organisations,
    hubs,
    angels,
    patients,
    professionals,
    teams,
    vendors,
    messages,
    tasks,
    'roster-weeks': rosterWeeks,
    'shift-assignments': shiftAssignments,
    'service-plans': servicePlans,
    'plan-features': planFeatures,
    categories,
    'service-activities': serviceActivities,
    // Present in the PDF's entity model, absent from the prototype.
    'care-activities': [],
    documents: [],
    credentials,
    'user-options': [],
    'platform-services': platformServices,
    'audit-entries': auditEntries,
  };
};

/** Mutable state for the running session. `reset()` restores the seed. */
let database: MockDatabase = buildDatabase();

export const db = (): MockDatabase => database;

export const resetDatabase = (): void => {
  database = buildDatabase();
};

/** Next id for a collection: max + 1, so a create never collides with a seed row. */
export const nextId = (collection: string): number => {
  const rows = database[collection] ?? [];
  return rows.reduce((max: number, row: any) => Math.max(max, Number(row.id) || 0), 0) + 1;
};
