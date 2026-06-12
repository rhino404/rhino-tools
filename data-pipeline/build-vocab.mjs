#!/usr/bin/env node
// data-pipeline/build-vocab.mjs
// Expands Vocabulary I from 24 → 124 items across 8 stages.
// Run from repo root: node data-pipeline/build-vocab.mjs
// Reads:  src/japanese/data/vocab.json  (existing 24 items preserved)
// Writes: src/japanese/data/vocab.json

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT  = resolve(__dirname, '..');
const VOCAB = resolve(ROOT, 'src/japanese/data/vocab.json');

// ─────────────────────────────────────────────────────────────────────────────
// SOURCE TABLE: [lesson, word, reading, accepts (str|str[]), meaning, mnemonic, exJa, exEn]
// Existing 24 items (greetings/colors/everyday) are preserved from vocab.json.
// Only the new items below are emitted; everyday items are re-tagged → food.
// ─────────────────────────────────────────────────────────────────────────────
const SRC = [
  // ── Stage 2: People & Family ─────────────────────────────────────────────
  ['people','わたし','watashi','watashi','I / Me',`WAH-tah-shi — 'what-a-she', that's me!`,'わたしはがくせいです。','I am a student.'],
  ['people','あなた','anata','anata','You',`a-NA-ta — 'ah, natà' (you, there).`,'あなたのなまえはなんですか？','What is your name?'],
  ['people','かれ','kare','kare','He / Him',`KA-reh — 'car-eh'; he drives the car.`,'かれはせんせいです。','He is a teacher.'],
  ['people','かのじょ','kanojo','kanojo','She / Her',`ka-NO-jo — 'can-oh-jo'; she's the one.`,'かのじょはがくせいです。','She is a student.'],
  ['people','ひと','hito','hito','Person',`HI-to — 'hee-toh'; a person stands on two legs.`,'このひとはだれですか？','Who is this person?'],
  ['people','がくせい','gakusei','gakusei','Student','GAKU-sei — gaku = study, sei = life; a student lives to study.','わたしはがくせいです。','I am a student.'],
  ['people','せんせい','sensei','sensei','Teacher','SEN-sei — sen is the path, sei is life; a teacher guides the way.','せんせいはほんをよみます。','The teacher reads a book.'],
  ['people','ともだち','tomodachi','tomodachi','Friend',`to-MO-da-chi — 'toe-mo-dah-chi'; friends walk side by side.`,'ともだちとごはんをたべます。','I eat a meal with my friend.'],
  ['people','こども','kodomo','kodomo','Child','KO-do-mo — ko = small; a small human.','こどもがこうえんであそびます。','The child plays at the park.'],
  ['people','にほんじん','nihonjin','nihonjin','Japanese person','NI-hon-JIN — nihon = Japan, jin = person.','かれはにほんじんです。','He is Japanese.'],
  ['people','なまえ','namae','namae','Name',`na-MA-eh — 'nah, may?'; what's your name?`,'おなまえはなんですか？','What is your name?'],
  ['people','かぞく','kazoku','kazoku','Family',`KA-zo-ku — 'kah-zoh-koo'; your family is your cause of joy.`,'わたしのかぞくはよにんです。','My family has four people.'],
  ['people','ちち','chichi','chichi','Father',`chi-chi — like a clock ticking; dad's always on time.`,'ちちはしごとにいきます。','My father goes to work.'],
  ['people','はは','haha','haha','Mother',`HA-ha — haha, mom's always cheerful.`,'はははごはんをつくります。','My mother makes a meal.'],
  ['people','あに','ani','ani','Older brother',`A-ni — 'ah-nee'; older bro is always right!`,'あにはだいがくせいです。','My older brother is a university student.'],
  ['people','あね','ane','ane','Older sister',`A-neh — 'ah-neh'; older sis shows the way.`,'あねははたらいています。','My older sister is working.'],

  // ── Stage 3: Common Verbs ────────────────────────────────────────────────
  ['verbs','たべる','taberu','taberu','to eat','Group 2 (る) verb. Polite: たべます. TABE sounds like "tabletop" where you eat.','すしをたべます。','I eat sushi.'],
  ['verbs','のむ','nomu','nomu','to drink','Group 1 verb. Polite: のみます. NO-MU — "no moo!"; people drink, cows just moo.','みずをのみます。','I drink water.'],
  ['verbs','みる','miru','miru','to see / watch','Group 2 (る) verb. Polite: みます. MI sounds like "me" — I see it!','テレビをみます。','I watch TV.'],
  ['verbs','よむ','yomu','yomu','to read',"Group 1 verb. Polite: よみます. YO-MU — yo, I'm reading!",'ほんをよみます。','I read a book.'],
  ['verbs','きく','kiku','kiku','to listen / ask','Group 1 verb. Polite: ききます. KI-KU — "kee-koo"; ears go kiku!','おんがくをききます。','I listen to music.'],
  ['verbs','かく','kaku','kaku','to write','Group 1 verb. Polite: かきます. KA-KU — "kah-koo"; write it down quick.','てがみをかきます。','I write a letter.'],
  ['verbs','いく','iku','iku','to go',"Group 1 verb. Polite: いきます. I-KU — \"ee-koo\"; I'll go!",'がっこうにいきます。','I go to school.'],
  ['verbs','くる','kuru','kuru','to come','Irregular verb. Polite: きます. KU-RU — "koo-roo"; here it comes!','ともだちがきます。','My friend comes.'],
  ['verbs','かえる','kaeru','kaeru','to return / go home','Group 2 (る) verb. Polite: かえります. KA-E-RU — like a frog hopping back home.','いえにかえります。','I return home.'],
  ['verbs','する','suru','suru','to do','Irregular verb. Polite: します. SU-RU — "soo-roo"; just do it.','べんきょうをします。','I do studying.'],
  ['verbs','はなす','hanasu','hanasu','to speak / talk','Group 1 verb. Polite: はなします. HA-NA-SU — speak your words like flowers.','にほんごをはなします。','I speak Japanese.'],
  ['verbs','ねる','neru','neru','to sleep','Group 2 (る) verb. Polite: ねます. NE-RU — "neh-roo"; zero energy — sleep!','じゅうじにねます。','I sleep at ten.'],
  ['verbs','おきる','okiru','okiru','to wake up / get up','Group 2 (る) verb. Polite: おきます (same polite form as おく — context tells them apart). O-KI-RU — wake up!','しちじにおきます。','I wake up at seven.'],
  ['verbs','わかる','wakaru','wakaru','to understand','Group 1 verb. Polite: わかります. WA-KA-RU — the answer dawns on you.','にほんごがわかります。','I understand Japanese.'],
  ['verbs','ある','aru','aru','there is (thing)','Group 1 verb. Polite: あります. A-RU — something is there! Use for inanimate objects.','つくえのうえにほんがあります。','There is a book on the desk.'],
  ['verbs','いる','iru','iru','there is (person/animal)','Group 2 (る) verb. Polite: います. I-RU — a person or animal is here. Use for living things.','ねこがいます。','There is a cat.'],
  ['verbs','おく','oku','oku','to put / place','Group 1 verb. Polite: おきます (same polite form as おきる — context tells them apart). O-KU — put it right there.','ほんをつくえにおきます。','I put the book on the desk.'],
  ['verbs','かう','kau','kau','to buy','Group 1 verb. Polite: かいます. KA-U — "kah-oo"; cows cost money to buy.','みせでパンをかいます。','I buy bread at the shop.'],
  ['verbs','あう','au','au','to meet','Group 1 verb. Polite: あいます. A-U — "ah-oo"; we meet — ahh!','ともだちにあいます。','I meet my friend.'],
  ['verbs','うたう','utau','utau','to sing','Group 1 verb. Polite: うたいます. U-TA-U — "oo-tah-oo"; singing goes oo-ta-oo!','うたをうたいます。','I sing a song.'],
  ['verbs','べんきょうする','benkyousuru','benkyousuru','to study','Compound verb (noun + する). Polite: べんきょうします. BEN-KYOU: study hard at your desk.','まいにちにほんごをべんきょうします。','I study Japanese every day.'],

  // ── Stage 4: Describing Words ────────────────────────────────────────────
  ['adjectives','おおきい','ookii',['ookii','ooki'],'big / large','OO-KI-I — "ooh, key!"; the huge key is big!','これはおおきいいえです。','This is a big house.'],
  ['adjectives','ちいさい','chiisai','chiisai','small / little','CHI-I-SA-I — "chee-sigh"; small things make a quiet sigh.','あのいぬはちいさいです。','That dog is small.'],
  ['adjectives','たかい','takai','takai','tall / expensive','TA-KA-I — "tah-kah-ee"; tall people always look expensive.','このとけいはたかいです。','This watch is expensive.'],
  ['adjectives','やすい','yasui','yasui','cheap / inexpensive',"YA-SU-I — \"yah-soo-ee\"; yeah, it's super cheap!",'このみせはやすいです。','This shop is cheap.'],
  ['adjectives','あたらしい','atarashii','atarashii','new','a-TA-RA-SHI-I — "a-ta-rush-ee"; rushing to get the new thing.','あたらしいほんをかいました。','I bought a new book.'],
  ['adjectives','ふるい','furui','furui','old','FU-RU-I — "foo-roo-ee"; an old fool buys the old model.','このいえはふるいです。','This house is old.'],
  ['adjectives','いい','ii','ii','good','I-I — "ee-ee"; double good!','これはいいほんです。','This is a good book.'],
  ['adjectives','わるい','warui','warui','bad','WA-RU-I — "wah-roo-ee"; war is bad news.','てんきがわるいです。','The weather is bad.'],
  ['adjectives','あつい','atsui','atsui','hot','A-TSU-I — "ah-tsoo-ee"; ah, too hot!','きょうはあついです。','Today is hot.'],
  ['adjectives','さむい','samui','samui','cold','SA-MU-I — "sah-moo-ee"; Samuel is always cold.','ふゆはさむいです。','Winter is cold.'],
  ['adjectives','はやい','hayai','hayai','fast / early','HA-YA-I — "hah-yah-ee"; fast like a ninja!','このでんしゃははやいです。','This train is fast.'],
  ['adjectives','おもい','omoi','omoi','heavy','O-MO-I — "oh-moh-ee"; oh my, it\'s so heavy!','このかばんはおもいです。','This bag is heavy.'],
  ['adjectives','おいしい','oishii','oishii','delicious','O-I-SHI-I — "oh-ee-shee"; oh, this is delicious!','このすしはおいしいです。','This sushi is delicious.'],
  ['adjectives','おもしろい','omoshiroi','omoshiroi','interesting / funny','o-MO-SHI-RO-I — "oh-mosh-ero-ee"; oh, more interesting stuff!','このほんはおもしろいです。','This book is interesting.'],
  ['adjectives','むずかしい','muzukashii','muzukashii','difficult','mu-ZU-KA-SHI-I — "moo-zoo-kash-ee"; a muzzy, confused feeling = difficult.','にほんごはむずかしいですか？','Is Japanese difficult?'],
  ['adjectives','にぎやか','nigiyaka','nigiyaka','lively / busy','ni-GI-YA-KA — "nee-gee-yah-kah"; the festival is nigiyaka!','このまちはにぎやかです。','This town is lively.'],
  ['adjectives','しずか','shizuka','shizuka','quiet','SHI-ZU-KA — "shee-zoo-kah"; the zoo is quiet after closing.','としょかんはしずかです。','The library is quiet.'],
  ['adjectives','きれい','kirei','kirei','beautiful / clean','KI-RE-I — "kee-ray-ee"; key rays of sunlight are beautiful.','このはなはきれいです。','This flower is beautiful.'],
  ['adjectives','すき','suki','suki','liked / favourite','SU-KI — "soo-kee"; you love your favourite thing!','わたしはすしがすきです。','I like sushi.'],
  ['adjectives','げんき','genki','genki','energetic / well','GEN-KI — "gen-kee"; full of energy!','げんきですか？','Are you well?'],

  // ── Stage 5: Things & Places ─────────────────────────────────────────────
  ['things','ほん','hon','hon','Book','HON — sounds like "phone" in a Japanese accent; keep a book in your pocket.','ほんをよみます。','I read a book.'],
  ['things','かばん','kaban','kaban','Bag','KA-BAN — "kah-ban"; you carry your bag to the cab.','かばんのなかにほんがあります。','There is a book in the bag.'],
  ['things','えんぴつ','enpitsu','enpitsu','Pencil','EN-PI-TSU — "en-pee-tsoo"; pencils write envelopes.','えんぴつでかきます。','I write with a pencil.'],
  ['things','ペン','pen','pen','Pen','PEN — English loanword! Easy.','ペンをかいます。','I buy a pen.'],
  ['things','つくえ','tsukue','tsukue','Desk','TSU-KU-E — "tsoo-koo-eh"; at the desk you focus.','つくえのうえにほんがあります。','There is a book on the desk.'],
  ['things','いす','isu','isu','Chair','I-SU — "ee-soo"; easy to sit on a chair.','いすにすわります。','I sit on the chair.'],
  ['things','でんわ','denwa','denwa','Telephone','DEN-WA — "den" = electricity, "wa" = talk. Electric talk!','でんわをします。','I make a phone call.'],
  ['things','とけい','tokei','tokei','Clock / Watch','TO-KE-I — "toh-keh-ee"; the ticking clock on your wrist.','とけいをみます。','I look at the clock.'],
  ['things','かさ','kasa','kasa','Umbrella','KA-SA — "kah-sah"; "casa" (house) — umbrella is your portable house.','かさをかいます。','I buy an umbrella.'],
  ['things','くるま','kuruma','kuruma','Car','KU-RU-MA — "koo-roo-mah"; the car goes roo-ma!','くるまでいきます。','I go by car.'],
  ['things','でんしゃ','densha','densha','Train','DEN-SHA — "den" = electricity + "sha" = vehicle. Electric vehicle!','でんしゃにのります。','I ride the train.'],
  ['things','バス','basu','basu','Bus','BA-SU — English loanword "bus". The bus arrives.','バスでがっこうにいきます。','I go to school by bus.'],
  ['things','しんぶん','shinbun','shinbun','Newspaper','SHIN-BUN — shin (new) + bun (writing) = newspaper.','ちちはしんぶんをよみます。','My father reads the newspaper.'],
  ['things','テレビ','terebi','terebi','TV / Television','TE-RE-BI — "television" shortened. Easy loanword!','テレビをみます。','I watch TV.'],
  ['things','がっこう','gakkou','gakkou','School','GAK-KOU — "gah-koh"; gaku = study, kou = school. Study house!','まいにちがっこうにいきます。','I go to school every day.'],
  ['things','としょかん','toshokan','toshokan','Library','TO-SHO-KAN — "toh-show-kan"; the show of books.','としょかんでほんをよみます。','I read a book at the library.'],
  ['things','えき','eki','eki','Station','E-KI — "eh-kee"; station gates go "eki"!','えきまであるきます。','I walk to the station.'],
  ['things','みせ','mise','mise','Shop / Store','MI-SE — "mee-seh"; like "mise en place" — a shop has everything in order.','みせでやさいをかいます。','I buy vegetables at the shop.'],
  ['things','いえ','ie','ie','House / Home','I-E — "ee-eh"; your home is where you go "ee-eh!" with relief.','いえにかえります。','I return home.'],
  ['things','へや','heya','heya','Room','HE-YA — "hey-ya!"; in my room: hey ya!','へやはきれいです。','The room is clean.'],
  ['things','こうえん','kouen','kouen','Park','KOU-EN — "koh-en"; you "go in" to the park.','こうえんをさんぽします。','I walk in the park.'],
  ['things','トイレ','toire','toire','Restroom / Toilet','TO-I-RE — "toi-reh"; English "toilet" adapted. Essential!','トイレはどこですか？','Where is the restroom?'],
  ['things','びょういん','byouin','byouin','Hospital','BYOU-IN — byou = sick, in = building. Sick building = hospital.','びょういんにいきます。','I go to the hospital.'],
  ['things','ゆうびんきょく','yuubinkyoku','yuubinkyoku','Post office','YUU-BIN-KYOU-KU — long word for the place the mail comes from.','ゆうびんきょくはえきのそばです。','The post office is near the station.'],

  // ── Stage 6: Food, Drink & Nature additions (existing everyday items re-tagged below) ──
  ['food','ごはん','gohan','gohan','Rice / Meal','GO-HAN — "go-han"; the heart of every Japanese meal.','ごはんをたべます。','I eat a meal.'],
  ['food','すし','sushi','sushi','Sushi','SU-SHI — you know sushi! Vinegared rice with toppings.','すしがすきです。','I like sushi.'],
  ['food','やさい','yasai','yasai','Vegetable','YA-SA-I — "yah-sah-ee"; yah, salad!','やさいをたべます。','I eat vegetables.'],
  ['food','さかな','sakana','sakana','Fish','SA-KA-NA — "sah-kah-nah"; sake and a fish dinner.','さかなをたべます。','I eat fish.'],
  ['food','にく','niku','niku','Meat','NI-KU — "nee-koo"; a neat cook serves meat.','にくをたべます。','I eat meat.'],
  ['food','たまご','tamago','tamago','Egg',"TA-MA-GO — \"tah-mah-go\"; let's go get eggs!",'たまごをたべます。','I eat eggs.'],
  ['food','パン','pan','pan','Bread','PAN — from Portuguese "pão". A soft round loaf.','パンをかいます。','I buy bread.'],
  ['food','くだもの','kudamono','kudamono','Fruit','KU-DA-MO-NO — "koo-dah-moh-noh"; fruit falls down (kudaru = descend).','くだものをたべます。','I eat fruit.'],
  ['food','りんご','ringo','ringo','Apple','RIN-GO — "rin-go"; ring-shaped apple on the table.','りんごをたべます。','I eat an apple.'],
  ['food','コーヒー','koohii','koohii','Coffee','KOO-HI-I — English "coffee" adapted. Easy!','コーヒーをのみます。','I drink coffee.'],
  ['food','おかし','okashi','okashi','Sweets / Candy','O-KA-SHI — "oh-kah-shee"; the honorable sweet thing.','おかしをたべます。','I eat sweets.'],

  // ── Stage 8: More Words ───────────────────────────────────────────────────
  ['extras','にほん','nihon','nihon','Japan','NI-HON — "nee-hon"; the land of the rising sun.','にほんにいきたいです。','I want to go to Japan.'],
  ['extras','にほんご','nihongo','nihongo','Japanese language','NI-HON-GO — nihon (Japan) + go (language).','にほんごをべんきょうします。','I study Japanese.'],
  ['extras','えいご','eigo','eigo','English language','EI-GO — "ay-go"; ei (英) = English, go = language.','えいごをはなします。','I speak English.'],
  ['extras','アメリカ','america','america','America / USA','A-ME-RI-KA — loanword from English. Easy!','アメリカにいきます。','I go to America.'],
  ['extras','まいにち','mainichi','mainichi','Every day','MA-I-NI-CHI — "my-nee-chee"; my day, every day.','まいにちべんきょうします。','I study every day.'],
  ['extras','とても','totemo','totemo','Very / Really','TO-TE-MO — "toh-teh-moh"; totally, very!','このほんはとてもおもしろいです。','This book is very interesting.'],
  ['extras','すこし','sukoshi','sukoshi','A little','SU-KO-SHI — "soo-koh-shee"; just a little, scoochy.','すこしわかります。','I understand a little.'],
  ['extras','たくさん','takusan','takusan','A lot / Many','TA-KU-SAN — "tah-koo-san"; tons and tons!','ともだちがたくさんいます。','I have many friends.'],
];

// ─────────────────────────────────────────────────────────────────────────────
// CONVERT SOURCE ROW → ITEM OBJECT
// ─────────────────────────────────────────────────────────────────────────────
function toItem([lesson, word, reading, accepts, meaning, mnemonic, exJa, exEn]) {
  return {
    id: `vocab-${reading.replace(/\s+/g, '')}`,
    word, reading,
    accepts: Array.isArray(accepts) ? accepts : [accepts],
    lesson, audio: '',
    meaning, mnemonic,
    example: { ja: exJa, en: exEn },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSEMBLE
// ─────────────────────────────────────────────────────────────────────────────
const existing = JSON.parse(readFileSync(VOCAB, 'utf8'));

// Re-tag existing "everyday" lesson → "food" (moved into stage 6)
const existingItems = existing.items.map(it =>
  it.lesson === 'everyday' ? { ...it, lesson: 'food' } : it
);

const byLesson    = (l) => existingItems.filter(it => it.lesson === l);
const newItems    = SRC.map(toItem);
const newByLesson = (l) => newItems.filter(it => it.lesson === l);

// Physical order must match stage gate order so renderDeck sections display correctly
const orderedItems = [
  ...byLesson('greetings'),       // s1 (8 existing)
  ...newByLesson('people'),       // s2 (16 new)
  ...newByLesson('verbs'),        // s3 (21 new) — unlocks after ~24 items, not ~63
  ...newByLesson('adjectives'),   // s4 (20 new)
  ...newByLesson('things'),       // s5 (24 new)
  ...byLesson('food'),            // s6 existing (9 re-tagged from everyday)
  ...newByLesson('food'),         // s6 new (11 additions)
  ...byLesson('colors'),          // s7 (7 existing)
  ...newByLesson('extras'),       // s8 (8 new)
];

const stages = [
  { id: 's1', label: 'Greetings',            lessons: ['greetings'] },
  { id: 's2', label: 'People & Family',      lessons: ['people'] },
  { id: 's3', label: 'Common Verbs',         lessons: ['verbs'] },
  { id: 's4', label: 'Describing Words',     lessons: ['adjectives'] },
  { id: 's5', label: 'Things & Places',      lessons: ['things'] },
  { id: 's6', label: 'Food, Drink & Nature', lessons: ['food'] },
  { id: 's7', label: 'Colors',               lessons: ['colors'] },
  { id: 's8', label: 'More Words',           lessons: ['extras'] },
];

const out = { ...existing, stages, items: orderedItems };
writeFileSync(VOCAB, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(`✓ Wrote ${orderedItems.length} items to vocab.json`);

// ─────────────────────────────────────────────────────────────────────────────
// COVERAGE ASSERTION — words that were missing from Sentences I
// ─────────────────────────────────────────────────────────────────────────────
const CRITICAL = [
  // Verbs (13)
  'いく','くる','かえる','たべる','のむ','よむ','はなす',
  'ねる','わかる','べんきょうする','ある','いる','おく',
  // Pronouns (3)
  'わたし','あなた','かれ',
  // Core nouns (13)
  'がくせい','でんしゃ','としょかん','なまえ','がっこう',
  'いえ','にほん','すし','えいご','かばん','みせ','へや','にほんご',
  // Adjectives (4)
  'はやい','にぎやか','おもい','きれい',
];

const wordSet = new Set(orderedItems.map(it => it.word));
const missing = CRITICAL.filter(w => !wordSet.has(w));

if (missing.length === 0) {
  console.log(`✓ Coverage PASS — all ${CRITICAL.length} sentence-critical words are taught.`);
} else {
  console.error(`✗ Coverage FAIL — still missing: ${missing.join(', ')}`);
  process.exit(1);
}

// Lesson breakdown
const counts = {};
for (const it of orderedItems) counts[it.lesson] = (counts[it.lesson] || 0) + 1;
console.log('Lesson counts:', JSON.stringify(counts));
console.log(`Total: ${orderedItems.length} items across ${stages.length} stages`);
