# session-chat

Eine Mod für Claude Code, mit der sich Claude-Sessions auf demselben Rechner Nachrichten schicken. Du schreibst entweder selbst über ein Panel, oder du sagst Claude einfach „gib das an die Session, die das Backend baut“.

## Voraussetzungen

- Claude Code mit Unterstützung für Hooks-Module (Mods). Diese API ist im Early Access und kann sich ändern.
- Die eingebauten Werkzeuge `ListAgents` und `SendMessage`, über die Sessions einander finden und Nachrichten schicken. Die Mod bringt keinen eigenen Transport mit, sondern nutzt diese beiden.
- Mindestens eine zweite Session auf demselben Rechner, sonst gibt es niemanden zum Schreiben.

## Installation

Im Prompt einer Terminal-Session:

```
/plugin install session-chat --marketplace Julianspk/session-chat
```

Aus einer Shell:

```
claude plugin install session-chat --marketplace Julianspk/session-chat
```

In der Desktop-App, wo `/plugin` nicht läuft: auf + neben dem Prompt-Feld klicken, dann Plugins, Add marketplace mit `Julianspk/session-chat`, dann Add plugin.

Ablauf bei der Installation:

1. Claude Code fragt `Add marketplace?` und nennt `github:Julianspk/session-chat`. Mit `y` bestätigen.
2. Einen Gültigkeitsbereich wählen, zum Beispiel den für deinen Benutzer.
3. Danach steht `Installed session-chat. Plugin is now active.` Die Mod ist sofort aktiv. Optionen gibt es keine.

Prüfen, ob die Mod läuft: `/chat` eingeben. Die Antwort ist `Session-Chat geoeffnet.`, und das Panel `Session-Chat` geht auf.

## Benutzung

Es gibt zwei Wege: selbst im Panel schreiben, oder Claude per normalem Prompt bitten, etwas weiterzugeben.

### Im Panel schreiben

1. `/chat` öffnet das Panel und lädt die Liste der erreichbaren Sessions.
2. Unter `An` die Ziel-Session wählen.
3. Nachricht ins Feld tippen und mit Enter senden.

Ist keine andere Session erreichbar, steht im Panel `Keine anderen Sessions erreichbar.` Sessions, die du nach dem Öffnen startest, erscheinen erst nach einem Klick auf `Aktualisieren`.

Der Verlauf zeigt jede Nachricht als eine Zeile mit Uhrzeit, Richtung und Session:

```
14:02 -> backend: Bitte die API für /users um das Feld email erweitern
14:05 <- backend: Erledigt, Commit 3f2a1c
```

- `->` heißt gesendet, `<-` heißt empfangen. Gesendete Nachrichten sind abgeschwächt dargestellt.
- Im Verlauf stehen auch die Nachrichten, die Claude selbst über `SendMessage` verschickt, und alles, was andere Sessions dieser Session schicken.
- Konnte eine Nachricht nicht zugestellt werden, steht `Nicht zugestellt: <Grund>` über dem Verlauf, und die Nachricht erscheint nicht darin.
- In der mobilen Oberfläche zeigt das Panel nur den Verlauf, ohne Auswahl und Eingabefeld.

### Per Prompt weiterleiten

Du kannst Claude auch einfach sagen, was an welche Session gehen soll:

| Prompt | Was Claude schickt |
| --- | --- |
| `Gib das an die Session, die das Backend bearbeitet` | die letzte Antwort oder das gerade Besprochene, mit allen Details |
| `Sag der Feedback-Session, sie soll die Tests noch mal laufen lassen` | den Auftrag am Anfang, danach den nötigen Kontext |

Claude bestätigt danach in einem Satz, an welche Session was ging. Eine zusätzliche Rückfrage vor dem Senden gibt es nicht: Deine Aufforderung gilt als Erlaubnis für genau diese Nachricht.

### Deaktivieren

Einen Befehl zum Pausieren gibt es nicht. Das Panel kannst du jederzeit schließen.

- Ganz abschalten: `claude plugin disable session-chat`.

## Wie Claude die Ziel-Session findet

Die Mod hängt an den Systemprompt eine kurze Anweisung für das Weiterleiten an, aber nur, wenn das Modell `ListAgents` und `SendMessage` auch nutzen kann.

1. Claude ruft `ListAgents` auf und nimmt die Session, deren Name am besten zu deiner Beschreibung passt.
2. Passt kein Name eindeutig, sucht Claude über die Sitzungsverwaltung nach Titel, Ordner oder Inhalt des Verlaufs.
3. Gibt es mehrere oder keine passende Session, nennt Claude die Kandidaten und fragt nach, statt zu raten.
4. Die Nachricht muss für sich allein verständlich sein, denn die andere Session kennt deinen Verlauf nicht. Claude gibt deshalb den Inhalt selbst weiter, also Ergebnisse, Pfade, Befehle und Entscheidungen, nicht nur einen Verweis darauf. Hast du gesagt, was die andere Session damit tun soll, steht das am Anfang.

## Optionen

Die Mod hat keine Optionen.

## Grenzen

- Erreichbar sind nur die Sessions, die `ListAgents` liefert. Eine Session in der Cloud empfängt Nachrichten, kann aber nicht antworten.
- Die Liste im Panel aktualisiert sich nicht von selbst, dafür gibt es `Aktualisieren`.
- Der Name des Absenders wird aus der eingehenden Nachricht gelesen. Klappt das nicht, steht im Verlauf nur `Session`.
- Nachrichten von und an Subagenten erscheinen nicht im Verlauf, nur die der Session selbst.
- Der Verlauf hält die letzten 200 Nachrichten. Das Panel zeigt davon so viele, wie hineinpassen.
- Die Zuordnung „die Session, die xyz bearbeitet“ geht über Namen und ist eine Heuristik. Prüf in Claudes Bestätigung, ob die richtige Session gemeint war.

## Entwicklung

Im Ordner der Mod:

```
claude plugin validate .
claude plugin test .
```

Die Logik steht in `hooks/register.tsx`, die Typen in `types/index.d.ts`, die Tests in `tests/chat.test.tsx`.
