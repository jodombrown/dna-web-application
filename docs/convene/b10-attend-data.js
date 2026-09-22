// Brief 10, Convene Pass 2, the rest of Attend. The event (Pass 1's object, P1-SPEC section 4), its registration rows under 680's policy,
// the named parties under 678, and the attestation record under 511 and 582. Fixtures with real relations; no number renders anywhere.
(() => {
const IMG = '../assets/imagery/hero-professional.jpeg';
const EVENT = {
  id:'suppers', title:'Corridor Suppers: Accra', host:'Kwame Mensah', presented_by:'Corridor Suppers',
  when:'Thu 15 Oct, 19:00 GMT', local:null, window:null, city:'Accra', place_name:'Front Room, Osu, Accra', format:'in_person', price_nature:'free',
  delivery_intent:'In the room, at a long table. Doors at 18:30; the meal is served at 19:30 and the conversation runs until the last person leaves.',
  endpoint:'Front Room, Oxford Street, Osu. The gate is the blue one.',
  body:'A long table for members in the Accra to Los Angeles agriculture corridor. Growers, buyers, cold chain people and the ones financing them. One conversation, no panel.\n\nFood is Ghanaian and shared. Come with one thing you need and one thing you can offer.',
  media:true, sponsor:'Ecobank Ghana',
  cancelled_reason:'The venue is no longer available. Everyone registered has been told by email, and the next supper will be posted here.',
  ended:'Thu 15 Oct, 22:10 GMT',
  calendar:{ id:'suppers', starts_at:'2026-10-15T19:00:00+00:00', ends_at:'2026-10-15T22:00:00+00:00', timezone:'Africa/Accra', location_string:'Front Room, Osu, Accra', description:'Corridor Suppers: Accra. Presented by Corridor Suppers.' },
  public_url:'app.diasporanetwork.africa/e/corridor-suppers-accra',
};
// 678: a named party renders only once accepted; a pending invitation is nothing on the card and the role alone on the public page.
const SPEAKERS = [
  { name:'Thandiwe Dube', role:'Speaker', state:'accepted' },
  { name:'Ngozi Eze', role:'Speaker', state:'accepted' },
  { name:'Yusuf Diallo', role:'Moderator', state:'invited' },
];
const PARTNERS = [{ name:'Ecobank Ghana', role:'Sponsor', state:'accepted' }, { name:'Alliance Française Accra', role:'Partner', state:'accepted' }];
// 680: RSVP visibility is row policy. Each row carries the scope its member chose; the server returns only the rows the viewer may see.
// scope: everyone | connections | shared (739: members who hold a Space role with the member or attended an attested event with them). The viewer (Amara Osei) is connected to Adaeze, Ngozi and Thandiwe and shares an attested event with Sefa.
const REGISTRATIONS = [
  { name:'Adaeze Nwosu', scope:'connections', connection:true },
  { name:'Ngozi Eze', scope:'everyone', connection:true },
  { name:'Thandiwe Dube', scope:'connections', connection:true },
  { name:'Folake Adeyemi', scope:'everyone', connection:false },
  { name:'Wanjiru Kamau', scope:'everyone', connection:false },
  { name:'Sefa Owusu', scope:'shared', connection:false, shared:true },
  { name:'Ama Boateng', scope:'connections', connection:false },
];
const SCOPES = [
  { id:'everyone', label:'Anyone on DNA', line:'Members who open this event can see you are going.' },
  { id:'connections', label:'My connections', line:'Only members you are connected to can see you are going.' },
  { id:'shared', label:'People I share a Space or event with', line:'Members who hold a Space role with you or attended an attested event with you.' },
];
const FLOOR = 5; // 508, 645: names render at five or more visible rows; below the floor the row and the list are absent. Internal, never shown.
// Rows the viewer may see, by policy: everyone; connections where the viewer is connected; shared where a Space role or an attested event is shared. Signed out sees none (680).
function visible(viewer, extra) {
  const rows = REGISTRATIONS.concat(extra || []);
  if (viewer === 'public') return [];
  return rows.filter(r => r.scope === 'everyone' || (r.scope === 'connections' && r.connection) || (r.scope === 'shared' && r.shared));
}
function names(n) { return n.length === 1 ? n[0] : n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1]; }
window.B10Attend = { IMG, EVENT, SPEAKERS, PARTNERS, REGISTRATIONS, SCOPES, FLOOR, visible, names };
})();
