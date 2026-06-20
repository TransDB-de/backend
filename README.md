# TransDB Backend & API

Das Backend für die Trans\*DB Website. Es ist für alles rund um die Datenverarbeitung der Einträge auf der Seite verantwortlich.

> Disclaimer: Dies ist der neuere .NET Rewrite des Backends, welches früher auf TypeScript basierte.
> Für die Migration wurde in Teilen generatives Machine-Learning zur Unterstützung eingesetzt.
> Der gesamte Code wurde manuell von einer menschlichen Software-Entwicklerin überprüft und verifiziert.

## Contribution
Trans\*DB gilt als Source-Available, alle Rechte liegen bei den ursprünglichen Entwicklern.

Der Grundgedanke von Trans\*DB ist es, Hilfe möglichst einfach, schnell und zentralisiert zu vermitteln.
Früher musste man in Selbsthilfegruppen nach einzelnen Listen fragen oder selbst im Internet recherchieren.
Wenn jetzt die Software von anderen einfach wiederverwendet wird, um eigene Seiten zu hosten, sind wir ganz schnell wieder bei dem ursprünglichen Problem, das hiermit zu lösen versucht wurde.

Wir bitten darum, das zu respektieren.

Wenn ihr trotzdem etwas technisches beitragen möchtet, eröffnet gerne ein Issue und wir arbeiten gemeinsam eine sinnvolle Implementierung aus.
Bitte nicht einfach ungefragt und unabgesprochen Pull-Requests schicken.

## Dependencies

- [ASP.NET Core](https://learn.microsoft.com/aspnet/core) Web-Framework für die API.
- [MongoDB.Driver](https://www.mongodb.com/docs/drivers/csharp/) Offizieller C#-Treiber für MongoDB.
- [libphonenumber-csharp](https://github.com/twcclegg/libphonenumber-csharp) Normalisierung von Telefonnummern ins internationale Format.

## Geocoding
Um Geocoding zu ermöglichen, verwendet Trans\*DB zwei verschiedene Services.
1. **OpenStreetMaps Nominatim** um einmalig am Eintrag eine Adresse in Koordinaten umzuwandeln-
2. **TransDBGeocoding** ist ein eigener, selbst gehosteter Service der es ermöglicht, die Suchanfragen nach Postleitzahlen, Orten oder User-Standortdaten zu verarbeiten. Dies wird benötigt, um Einträge in der Suche entsprechend filtern/sortieren zu können.

## Einrichtung

### Voraussetzungen
- .NET 10 SDK
- laufende MongoDB-Instanz
- Directus CMS (cms.transdb.de)
- Cap-Instanz (Optional)
- TransDBGeocoding Service

1. Repo clonen.
2. `appsettings.json` mit den eigenen Werten befüllen (MongoDB, CMS, Geocoding, Nominatim, Captcha).
3. `dotnet run` ausführen.

### Konfiguration (`appsettings.json`)

```json
{
  "MongoDB": {
    "ConnectionUri": "mongodb://localhost:27017/transdb"
  },
  "Cms": {
    "Url": "https://cms.transdb.de",
    "AccessToken": "<Directus Admin Token>",
    "TicketCollection": "transdb_tickets"
  },
  "Geocoding": {
    "Url": "https://geo.transdb.de",
    "ApiKey": "<API Key>"
  },
  "Nominatim": {
    "Url": "https://nominatim.openstreetmap.org",
    "UserAgent": "transdb.de/2.0.0 (ASP.NET)"
  },
  "Captcha": {
    "InstanceUrl": "https://cap.transdb.de",
    "SiteKey": "<Site Key>",
    "Secret": "<Secret>",
    "Enabled": true
  }
}
```

Für die lokale Entwicklung legt eine `appsettings.Development.json` mit `"Captcha": { "Enabled": false }` die CAPTCHA-Prüfung still.

## Authentifizierung

Admins loggen sich über `POST /auth/login` ein. Das Backend validiert die Credentials gegen Directus, prüft den management_users-Eintrag und setzt einen Session-Cookie (nicht persistent, läuft mit dem Browser-Tab ab).

## CAPTCHA-Schutz

Die folgenden Endpunkte erfordern einen gültigen [Cap](https://trycap.dev)-Token im `X-Cap-Token`-Header:

- `GET /entries`
- `POST /entries`
- `POST /auth/login`
- `POST /report`

### Warum ist der öffentliche Endpunkt zum Abrufen von Einträgen mit Captchas versehen?
Die automatisierte Verarbeitung der Daten ist nicht erwünscht.
Wir wurden schon mal gefragt, ob man die Daten bereitstellen könne, damit Leute ihre Suche nach zb. Therapeuten automatisieren können.
Wenn das jeder tun würde, dann würden wir unzählige Anfragen bekommen, doch bitte aufgrund zu vieler (spam-)Anfragen die Praxen aus unserer Liste zu entfernen.
Damit ist im Endeffekt niemandem geholfen.