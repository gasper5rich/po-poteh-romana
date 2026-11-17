/* =========================================================
   PO POTEH ROMANA – podatki o etapah
   Vprašanja, odgovore in koordinate lahko prosto urejaš tukaj.
   correct = zaporedna številka pravilnega odgovora (0 = prvi).
   type: "words" = odprto vprašanje – igralci napišejo besede,
         vsak odgovor je pravilen, besede se pokažejo na končni tabli.
   Prva lokacija dobi oznako S (start), zadnja C (cilj).
   ========================================================= */
window.ROUTE = [
  {
    id: "dom",
    label: "S",
    name: "Domača hiša",
    lat: 46.219912194204504, lng: 14.614852140343732,
    audio: "audio/01-doma-mama.m4a", voice: "Mama",
    q: "Za kakšno vrednost sta Romanova mama in ata kupila Jegličev hrib?",
    options: ["Za 2 kravi", "Za 4000 mark", "Za 10 bikov"],
    correct: 0,
    place: [
      "Zgodovina Kamnika sega okoli 1000 let v preteklost.",
      "Kamnik ima mestne pravice že 750 let.",
      "Novi trg je omenjen leta 1402, torej obstaja že 624 let.",
      "Na začetku je imela pomembno vlogo gostilna sodnika Nikolaja.",
      "Zgodba pravi, da je v njej prenočeval duhovnik. Ko se je zgodila kraja, je s prižiganjem sveč in molitvijo ugotovil, kdo je tat."
    ]
  },
  {
    id: "invalidni-dom",
    name: "Invalidni dom",
    lat: 46.21907934795632, lng: 14.611756225419999,
    audio: "audio/10-invalidni-dom-nadi.m4a", voice: "Nadi",
    q: "Koliko je bil star Roman, ko je začel voziti motor?",
    options: ["16 let", "8 let", "18 let"],
    correct: 1,
    place: [
      "Začetki invalidnega doma segajo v obdobje po 2. svetovni vojni, ko so ob mekinjskem samostanu v kamniških toplicah Kurhaus rehabilitirali otroke in najstnike, prizadete v vojni.",
      "Toplice je leta 1880 ustanovil Prašnikar. Tam so kneipali, masirali in delali elektrošoke.",
      "Del terapije je bil tudi sprehod skozi gozd, zato je dal urediti pot na Stari grad s 36 klopcami za počitek."
    ]
  },
  {
    id: "scrm",
    name: "ŠCRM šola",
    lat: 46.2206951742629, lng: 14.61203101498432,
    audio: "audio/09-scrm-roman.m4a", voice: "Roman",
    q: "S katerim programom se je pričela Romanova srednješolska pot?",
    options: ["Gimnazijski program", "Gradbeni tehnik", "Polagalec keramike in pečar"],
    correct: 2,
    place: [
      "Po vojni so leta 1945 v Kamniku ustanovili nižjo gimnazijo v današnji Osnovni šoli Toma Brejca, kjer so bili tudi osnovna šola, internat in strokovna šola.",
      "Nižja gimnazija je trajala 4 leta, po 4 letih osnovne šole.",
      "Leta 1949 je postala 8-letna gimnazija."
    ]
  },
  {
    id: "zaprice",
    name: "Grad Zaprice",
    lat: 46.222250360813106, lng: 14.607197305938097,
    audio: "audio/07-zaprice-milena.m4a", voice: "Milena",
    q: "Koliko časa se Roman in Milena že poznata?",
    options: ["39 let", "45 let", "30 let"],
    correct: 1,
    place: [
      "Pred gradom je muzej na prostem z lesenimi kaščami iz Tuhinjske doline.",
      "Najstarejša kašča je stara 233 let.",
      "Kašče so bile včasih hišni sefi, saj so v njih hranili hrano – hrana je bila največje bogastvo.",
      "Ključe kašče je imela gospodinja oziroma gospodarica."
    ]
  },
  {
    id: "maistrova-hisa",
    name: "Maistrova hiša",
    lat: 46.22319153149531, lng: 14.608374806301784,
    audio: "audio/03-maistrova-hisa-anja.m4a", voice: "Anja",
    q: "Na kakšen način sta povezana Roman in Rudolf Maister?",
    options: [
      "Roman je rojen na Maistrov dan.",
      "Za vojaške zasluge je Roman dobil Maistrovo medaljo.",
      "General Maister je rojen na Novem trgu v Kamniku."
    ],
    correct: 0,
    place: [
      "Večina pozna Rudolfa Maistra kot generala, ki je poskrbel, da je Maribor danes v slovenskih rokah.",
      "Rudolf Maister je bil tudi velik športnik in slikar, pisal pa je ljubezenske in domoljubne pesmi ter izdal kar 2 pesniški zbirki.",
      "Bil je velik ljubitelj knjig in je imel bogato osebno knjižnico."
    ]
  },
  {
    id: "sutna-cerkev",
    name: "Šutenska cerkev",
    lat: 46.223380597814774, lng: 14.608726448938784,
    audio: "audio/02-sutenska-cerkev-mama.m4a", voice: "Mama",
    q: "V koliko državah je Roman že bil?",
    options: ["27", "46", "63"],
    correct: 1,
    place: [
      "Meščanski otroci so imeli šolo ob šutenski cerkvi že v srednjem veku, pred 600 leti.",
      "Prvo državno šolo je Kamnik dobil leta 1780, torej pred 246 leti.",
      "Ob prvem vpisu je bilo 79 učencev.",
      "Danes sta v samem centru 2 osnovni šoli z 11 podružničnimi šolami, še ena pa je na Duplici."
    ]
  },
  {
    id: "mali-grad",
    type: "words",
    name: "Mali grad",
    lat: 46.224649429434784, lng: 14.611392398886672,
    audio: "audio/05-mali-grad-tjasa.m4a", voice: "Tjaša",
    q: "Katere besede pa po tvojem najbolje opišejo Romana?",
    placeholder: "npr. trmast, zabaven, vedno na poti",
    place: [
      "Severno od Malega gradu je bilo nekoč jezero vse do Nevelj, kjer naj bi pri cerkvi privezovali čolne.",
      "Mali in Stari grad je povezoval hrib, ki je zapiral jezero.",
      "Zaradi velikega deževja je hrib popustil in jezero se je razlilo po Mengeškem polju.",
      "Zgodbo je v 17. stoletju zapisal Janez Vajkard Valvasor."
    ]
  },
  {
    id: "glavni-trg",
    name: "Glavni trg",
    lat: 46.22570733682908, lng: 14.612047682359258,
    audio: "audio/04-glavni-trg-anja.m4a", voice: "Anja",
    q: "Kaj si je Roman želel biti po poklicu?",
    options: ["Šofer taksija", "Kuhar", "Ginekolog"],
    correct: 0,
    place: [
      "Plečnik je imel v Kamniku pomembne prijateljske vezi s sorodnikom enega od udeležencev tega praznovanja – zato je tu najverjetneje toliko njegovih del: hiša na Glavnem trgu, železniška postaja, kapela Božjega groba, most čez Nevljico, krstilnica na Šutni in kmečka soba pri Steletovih.",
      "Plečnik je želel preurediti ves Kamnik: leta 1956 je izdelal načrt za celovito ureditev mestnega jedra.",
      "Posebej je želel izpostaviti Mali grad, na območju Usnjarne pa zgraditi obrtno šolo."
    ]
  },
  {
    id: "trznica",
    name: "Kamniška tržnica",
    lat: 46.226035521400156, lng: 14.613925682414045,
    audio: "audio/06-trznica-milena.m4a", voice: "Milena",
    q: "Katere hrane Roman definitivno ne je?",
    options: ["Tofu", "Filane paprike", "Vampi"],
    correct: 2,
    place: [
      "V bližini tržnice stoji spomenik mamutu, ki so ga našli v Nevljah. Ostanki so v muzeju v Ljubljani.",
      "Mamut je živel pred približno 20.000 leti.",
      "Mladič mamuta je tehtal okoli 90 kg, odrasli mamut pa tudi do 10 ton.",
      "Ker je bil rastlinojedec, je moral pojesti ogromno – tudi do 200 kg rastlin na dan."
    ]
  },
  {
    id: "novi-trg",
    label: "C",
    name: "Novi trg",
    lat: 46.222935086714465, lng: 14.613173217909159,
    audio: "audio/08-novi-trg-tjasa.m4a", voice: "Tjaša",
    q: "Koliko je bil star Roman, ko je postal oče?",
    options: ["25 let", "20 let", "30 let"],
    correct: 1,
    place: [
      "Na Novem trgu 9 se je rodil pesnik France Balantič.",
      "Bil je zelo inteligenten, saj je že pred šolo obvladal branje in pisanje.",
      "Bil je samouk tujih jezikov – ruščine, poljščine in češčine.",
      "Umrl je pri 21 letih in v tem kratkem času ustvaril okoli 105 pesmi.",
      "Na Novem trgu stoji tudi spomenik pesniku."
    ]
  }
];
window.POINTS_PER_Q = 10;
