# session-chat

Eine Claude-Code-Mod für Nachrichten zwischen Claude-Sessions auf demselben Rechner.

- `/chat` öffnet ein Panel: Ziel-Session wählen, Nachricht tippen, mit Enter senden. Der Verlauf zeigt ein- und ausgehende Nachrichten, auch die, die Claude selbst über `SendMessage` verschickt.
- Weiterleiten per Texteingabe: „gib das an die Session, die xyz bearbeitet“. Claude sucht die passende Session über ihren Titel (notfalls über Ordner oder Verlauf), fragt bei Mehrdeutigkeit nach und schickt den Inhalt so, dass die andere Session ihn ohne den Verlauf versteht.

## Installation

In einer Terminal-Session am Prompt:

```
/plugin install session-chat --marketplace Julianspk/session-chat
```

Aus einer Shell:

```
claude plugin install session-chat --marketplace Julianspk/session-chat
```

In der Desktop-App, wo `/plugin` nicht läuft: auf + neben dem Eingabefeld klicken, dann Plugins, Add marketplace mit `Julianspk/session-chat`, dann Add plugin.

Das Repo ist privat: Installieren kann nur, wer es auf GitHub lesen darf und auf dem eigenen Rechner Git-Zugangsdaten für github.com hat (SSH-Schlüssel oder `gh auth login` und danach `gh auth setup-git`).

## Entwicklung

```
claude plugin validate .
claude plugin test .
```
