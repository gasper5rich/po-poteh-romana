# 🏍️ Po poteh Romana

Motoristični PWA kviz po Kamniku ob Romanovem 60. rojstnem dnevu – v KTM barvah.

**Igraj:** https://gasper5rich.github.io/po-poteh-romana/
**Lestvica za TV:** https://gasper5rich.github.io/po-poteh-romana/leaderboard.html

## Kaj zna
- Interaktivni zemljevid (OpenStreetMap) z 10 etapami, start **S** in cilj **C**
- Vprašanje na vsaki etapi (10 točk), en poskus, Radio Softi posnetek kot namig
- Odprto vprašanje z besedami na Malem gradu – oblak besed na končni tabli
- Zanimivosti o kraju po vsakem odgovoru
- Štoparica od zagona motorja do cilja, lestvica v živo (Firebase Realtime Database)
- Navigacija do lokacij z Google Zemljevidi, interaktivna navodila, sintetiziran zvok V-twin motorja
- Deluje kot aplikacija na domačem zaslonu (PWA), tudi s slabim signalom

## Urejanje
- `data.js` – vprašanja, odgovori, koordinate, zanimivosti
- `config.js` – naslov Firebase baze
- `app.js` – seznam imen ekip (`TEAMS`)
- Po spremembah povečaj `VERSION` v `sw.js`

Lestvica: pravila baze so v `firebase-pravila.json`.
