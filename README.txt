PO POTEH ROMANA – PWA kviz ob 60. rojstnem dnevu
================================================

1) LESTVICA V ŽIVO – Firebase (enkrat, ~5 minut, brezplačno)
   a. Pojdi na https://console.firebase.google.com in se prijavi z Google računom.
   b. "Create a project" → ime npr. roman60 → Google Analytics izklopi → Create.
   c. Levo: Build → Realtime Database → "Create Database"
      → lokacija: Belgium (europe-west1) → "Start in locked mode" → Enable.
   d. Zavihek "Rules": vse izbriši, prilepi vsebino datoteke firebase-pravila.json → Publish.
   e. Zavihek "Data": na vrhu je naslov baze, npr.
      https://roman60-default-rtdb.europe-west1.firebasedatabase.app
      Kopiraj ga in prilepi v config.js:
      window.LEADERBOARD_URL = "https://roman60-default-rtdb.europe-west1.firebasedatabase.app";

2) OBJAVA
   a. Odpri https://app.netlify.com/drop
   b. Povleci celo mapo "po-poteh-romana" v okno.
   c. Dobiš povezavo (https://....netlify.app).

3) NA ZABAVI
   - Na TV/prenosniku odpri  https://....netlify.app/leaderboard.html
     → klikni "Celozaslonsko". Na zaslonu je QR koda, ki jo gostje skenirajo.
   - Pred začetkom klikni "Počisti lestvico", da izbrišeš poskusne vožnje.
   - Zmaga ekipa z največ točkami; pri enakih točkah krajši čas.

UREJANJE
- Vprašanja, odgovori, namigi, koordinate: data.js (correct: 0 = prvi odgovor).
- Predlogi imen ekip: seznam TEAMS na vrhu app.js.
- Po spremembah datotek (razen config.js) povečaj VERSION v sw.js (npr. "ppr-v5").
- Po zabavi lahko v Firebase pravilih ".write": true zamenjaš s false, da lestvico zakleneš.
