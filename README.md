# Omega Könyvtár

**Verzió: 0.2.2**

Egy átfogó könyvtári rendszer, amely intelligens URL-alapú adatkinyeréssel és teljes körű felhasználókezeléssel rendelkezik a magyar keresztény irodalom számára.

## 🎯 Funkciók

### 🎨 Modern UI/UX Feltöltések

- **Smooth Animations**: Modern animációk a szűrők és modális ablakok számára
- **Responsive Design**: Tökéletesen alkalmazkodó kártyasűrűség és betűméret
- **Sticky Sidebar**: Rögzíthető oldalsáv a jobb felhasználói élményért
- **Modern Loading Spinner**: Tiszta, modern töltési animációk

### � Felhasználókezelés

- **Teljes Felhasználókezelés**: Regisztráció, bejelentkezés, profilkezelés
- **Szerepkör-alapú Hozzáférés**: Admin, Szolgáló, Tag szerepkörök
- **Felhasználói Adatok**: Név, email, telefonszám, lakcím, bemutatkozás
- **Valós idejű Statisztikák**: Dinamikus felhasználószám megjelenítés
- **Szűrés és Keresés**: Felhasználók keresése név, email és szerepkör szerint
- **Biztonságos Műveletek**: Szerepkör-alapú szerkesztési és törlési jogosultságok

### 📚 Könyvkezelés

- **Két Kategória**: Különálló "Bolt" és "Könyvtár" gyűjtemények
- **Intelligens Szűrés**: Szűrés cím, szerző, műfaj és kategória szerint
- **Reszponzív Tervezés**: Adaptív kártyasűrűség az optimális megjelenítéshez
- **Részletes Könyvinformáció**: Átfogó könyvinformációk megjelenítése

### 🔗 URL-alapú Adatkinyerés

- **CLC Hungary Integráció**: Automatikus könyvadat-kinyerés CLC Hungary URL-ekből
- **Bookline.hu Támogatás**: Könyvadatok kinyerése Bookline.hu webshopból
- **Moly.hu Integráció**: Támogatás mind könyv oldalak (`/konyvek/`) és kiadás oldalak (`/kiadasok/`) esetén
- **Intelligens Elemzés**: Cím, szerző, év, ISBN, leírás, kiadó és további adatok kinyerése
- **Több Proxy Támogatás**: Megbízható adatlekérés visszahúzó proxykkal
- **Hibakezelés**: Elegáns visszahúzások hálózati problémák esetén

### ✏️ Teljes Szerkesztési Funkcionalitás

- **Teljes Könyvszerkesztés**: Minden könyvmező szerkeszése előre kitöltött űrlapokkal
- **Könyv Törlése**: Biztonságos törlés megerősítő modal ablakkal
- **Felhasználó Szerkesztés**: Inline szerkesztés a felhasználói adatokon
- **Adatintegritás**: Megőrzi az összes adatot frissítés közben
- **Modal Interfész**: Tiszta, intuitív szerkesztési élmény
- **Beépített Szerkesztés**: A részletek modaljában való közvetlen szerkesztés

### 📊 Gazdag Adatkezelés

- **Könyv Adatok**: Cím, Szerző, Év, Műfaj, Leírás, ISBN, Eredeti Cím, Oldalszám, Kiadó
- **Felhasználói Adatok**: Profil információk, szerepkörök, kapcsolódási adatok
- **Borítókép Feltöltés**: Fájl alapú borítókép feltöltés előnézettel
- **Automatikus Borítókép**: URL-ből történő automatikus kinyerés
- **Magyar Címkék**: Helyi mezőnevek a magyar felhasználók számára

### 🎨 Modern UI/UX

- **Testreszabott Scrollbar**: Integrált, márkaszínű scrollbar-ek
- **Modal Interakciók**: Kattintson kívül bezárás, intuitív műveletek
- **Reszponzív Dizájn**: Mobil és asztali optimalizálás
- **Professzionális Megjelenés**: Tiszta, gyártásra kész felület

## 🚀 Kezdés

### Előfeltételek

- Node.js 16+ és npm
- Firebase projekt konfiguráció

### Telepítés

1. Klónozza a repository-t:

   ```bash
   git clone https://github.com/tmatyi/omega-konyvtar.git
   cd omega-konyvtar
   ```

2. Telepítse a függőségeket:

   ```bash
   npm install
   ```

3. Konfigurálja a Firebase-ot:
   - Hozzon létre egy Firebase projektet a https://console.firebase.google.com oldalon
   - Másolja a Firebase konfigurációt a `src/firebase.js` fájlba
   - Engedélyezze az Authentication és Realtime Database szolgáltatásokat

4. Indítsa a fejlesztői szervert:

   ```bash
   npm run dev
   ```

5. Nyissa meg a [http://localhost:5173](http://localhost:5173) oldalt az alkalmazás megtekintéséhez.

## 🔧 Használat

### Könyvek Hozzáadása

#### URL Kinyerés (Ajánlott)

1. Kattintson a "+ Új Könyv Hozzáadása" gombra
2. Illessze be a támogatott könyv URL-jét:
   - **CLC Hungary**: `https://www.clchungary.com/termek/...`
   - **Bookline.hu**: `https://www.bookline.hu/product/...`
   - **Moly.hu**: `https://moly.hu/konyvek/...` vagy `https://moly.hu/kiadasok/...`
3. Kattintson a "🔍 Keresés" gombra
4. Ellenőrizze a kinyert adatokat és kattintson a "Könyv Hozzáadása" gombra

#### Manuális Bevitel

1. Kattintson a "+ Új Könyv Hozzáadása" gombra
2. Görgessen le a "VAGY" szekcióhoz
3. Töltse ki a könyv adatait manuálisan
4. Kattintson a "Könyv Hozzáadása" gombra

### Könyvek Szerkesztése és Törlése

1. Kattintson bármelyik könyvkártyára a részletek megtekintéséhez
2. **Szerkesztés**: Kattintson a "Szerkesztés" gombra a részletek modalban
3. Módosítsa bármelyik mezőt igény szerint
4. Kattintson a "Könyv Frissítése" gombra a mentéshez
5. **Törlés**: Kattintson a "Törlés" gombra és erősítse meg a törlést

### Gyűjtemények Kezelése

- **Bolt Fül**: Bolti készleten lévő könyvek
- **Könyvtár Fül**: Könyvtári gyűjteményben lévő könyvek
- **Profil Fül**: Felhasználói profil és beállítások
- **Olvasókártya Fül**: Olvasói kártya információk

## 🌐 Támogatott URL-ek

### CLC Hungary

- **Formátum**: `https://www.clchungary.com/termek/könyv-cím-isbn`
- **Kinyert Adatok**: Cím, Szerző, Év, Kiadó, Eredeti Cím, Oldalszám, ISBN, Leírás, Borítókép
- **Példa**: `https://www.clchungary.com/termek/kaland-a-coats-szigeten-bettina-kettschau-evangeliumi-kiado-9789639867772`

### Bookline.hu

- **Formátum**: `https://www.bookline.hu/product/...`
- **Kinyert Adatok**: Cím, Szerző, Kiadó, Leírás, ISBN, Borítókép, Év
- **Példa**: `https://www.bookline.hu/product/bookpage/vol.1._id_253735.html`

### Moly.hu

- **Könyv oldalak**: `https://moly.hu/konyvek/...`
- **Kiadás oldalak**: `https://moly.hu/kiadasok/...`
- **Kinyert Adatok**: Cím, Szerző, Kiadó, Év, Oldalszám, ISBN, Leírás, Borítókép
- **Példa**: `https://moly.hu/konyvek/a-szentek-utjai-252830`

## 🛠️ Technikai Stack

### Frontend

- **React 18**: Modern React hook-okkal
- **Vite**: Gyors fejlesztői build eszköz
- **CSS3**: Reszponzív tervezés egyedi tulajdonságokkal

### Backend és Adatbázis

- **Firebase Authentication**: Felhasználókezelés
- **Firebase Realtime Database**: Könyvadatok tárolása
- **Firebase Hosting**: Éles környezetben való telepítés

### Adatfeldolgozás

- **Web Scraping**: Intelligens HTML elemzés
- **CORS Proxik**: Több proxy szolgáltatás megbízhatóságért
- **DOM Parser**: Kliensoldali HTML feldolgozás

## 📱 Reszponzív Tervezés

- **Desktop**: Teljes funkcionalitás oldalsáv navigációval
- **Tablet**: Adaptív elrendezés érintőbarát vezérlőkkel
- **Mobile**: Alsó navigáció és optimalizált kártya elrendezés
- **Kártyasűrűség**: Állítható sűrűtől tágas nézetig

## 🔒 Biztonság

- **Firebase Authentication**: Biztonságos felhasználói bejelentkezés
- **Input Validáció**: Kliensoldali adatvalidáció
- **CORS Kezelés**: Biztonságos cross-origin kérések
- **Adat Tisztítás**: Tiszta adatkinyerés és tárolás

## 📦 Elérhető Parancsok

- `npm run dev` - Alkalmazás futtatása fejlesztői módban
- `npm run build` - Alkalmazás buildelése éles környezetre
- `npm run preview` - Éles build előnézete
- `npm run deploy` - Telepítés Firebase Hostingra

## 🔄 Verziótörténet

### v0.1.4 (Jelenlegi)

- ✨ Moly.hu URL feldolgozás hozzáadása (könyv és kiadás oldalak támogatása)
- ✨ Bookline.hu URL feldolgozás implementálása
- ✨ Könyv törlési funkcionalitás megerősítő modal ablakkal
- ✨ Borítókép feltöltés fájl alapú feltöltéssel és előnézettel
- ✨ Modern UI elemek (loading animációk, success üzenetek)
- ✨ Űrlap mezők átrendezése (borítókép első helyen)
- ✨ Teljes magyar nyelvű lokalizáció minden új funkcióhoz

### v0.1.3

- ✨ CLC Hungary URL feldolgozás hozzáadása
- ✨ Teljes szerkesztési funkcionalitás implementálása
- ✨ Új könyvmezők (eredeti cím, oldalszám, kiadó)
- ✨ Kiadó szétválasztása a leírástól
- ✨ Fejlesztett adatkinyerés debug naplózással
- ✨ Teljes magyar nyelvű lokalizáció

### v0.1.2

- 🎯 Kiadás alap könyvkezeléssel
- 📱 Dupla kategória rendszer (Bolt/Könyvtár)
- 🔍 Keresési és szűrési funkcionalitás
- 👤 Felhasználói hitelesítési rendszer

## 🤝 Hozzájárulás

1. Forkolja a repository-t
2. Hozzon létre egy feature ágat (`git checkout -b feature/amazing-feature`)
3. Véglegesítse a változtatásait (`git commit -m 'Add amazing feature'`)
4. Tolja az ágat (`git push origin feature/amazing-feature`)
5. Nyisson egy Pull Requestet

## 📄 Licenc

Ez a projekt az MIT Licenc alatt érhető el - lásd a [LICENSE](LICENSE) fájlt a részletekért.

## 🆘 Támogatás

Problémák és kérdések esetén:

- Hozzon létre egy issue-t GitHubon
- Ellenőrizze a meglévő issue-ket a megoldásokért
- Tekintse meg a dokumentációt a gyakori problémákhoz

## 🌟 Köszönetnyilvánítás

- **CLC Hungary**: Az átfogató keresztény irodalmi adatokért
- **Firebase**: A robusztus backend szolgáltatásokért
- **React Közösség**: A kiváló eszközök és könyvtárakért
