import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { ChatMessage } from '../types'

const PANE = 'session-chat'
const log = atom({ plugin: 'session-chat', key: 'log' } as const, [] as ChatMessage[])
const peers = atom({ plugin: 'session-chat', key: 'peers' } as const, [] as string[])
const target = atom({ plugin: 'session-chat', key: 'target' } as const, '')
const note = atom({ plugin: 'session-chat', key: 'note' } as const, '')

const push = ($: EngineInterface, m: Omit<ChatMessage, 'at'>) =>
  update($, log, list => [...list, { ...m, at: Date.now() }].slice(-200))

// Erreichbare Sessions ueber das eingebaute ListAgents-Tool holen
async function refresh($: EngineInterface) {
  const ran = await $.tool.call({ tool: 'ListAgents' })
  const listing = ran.result as { sections?: { rows: { name?: string }[] }[] } | undefined
  const sections = listing?.sections ?? []
  const names = [...new Set(sections.flatMap(s => s.rows.flatMap(r => (r.name ? [r.name] : []))))]
  await update($, peers, () => names)
  await update($, target, t => (names.includes(t) ? t : (names[0] ?? '')))
  await update($, note, () => (names.length ? '' : 'Keine anderen Sessions erreichbar.'))
}

async function send($: EngineInterface, text: string) {
  const to = await read($, target)
  if (!to || !text.trim()) return
  const sent = await $.session.send({ to, text })
  if (sent.isDelivered) await push($, { dir: 'out', peer: to, text })
  await update($, note, () => (sent.isDelivered ? '' : `Nicht zugestellt: ${sent.reason}`))
}

// ponytail: Absender aus dem Umschlag des Textes geraten, Fallback "Session"
const senderOf = (text: string) => /from="([^"]+)"/.exec(text)?.[1] ?? 'Session'

const time = (at: number) => new Date(at).toTimeString().slice(0, 5)

// Anweisung fuer das Modell: Weiterleiten per normaler Texteingabe
const ROUTING = {
  id: 'session-chat:routing',
  scope: 'session',
  text: `# Weiterleiten an andere Sessions
Sagt der Nutzer, etwas soll an eine andere Session gehen ("gib das an die Session, die xyz bearbeitet", "sag der Feedback-Session ..."):
1. Ziel finden: ListAgents aufrufen und die Peer-Session nehmen, deren Name am besten zu xyz passt. Passt kein Name eindeutig, mit mcp__ccd_session_mgmt__list_sessions oder mcp__ccd_session_mgmt__search_session_transcripts (falls vorhanden, sonst per ToolSearch laden) nach Titel, Ordner oder Inhalt suchen.
2. Mehrere oder keine passende Session: die Kandidaten kurz nennen und nachfragen, nicht raten.
3. Senden: SendMessage an genau diesen Namen. Die Nachricht muss für sich allein verständlich sein, denn die andere Session kennt diesen Verlauf nicht. "Das" ist meist deine letzte Antwort oder das gerade Besprochene: gib den Inhalt selbst weiter (Ergebnis, Pfade, Befehle, Entscheidungen), nicht nur einen Verweis. Hat der Nutzer gesagt, was die andere Session damit tun soll, schreib das an den Anfang.
4. Danach in einem Satz bestätigen, an welche Session was ging.
Die Aufforderung des Nutzers ist die Erlaubnis für genau diese Nachricht; frag nicht noch einmal nach.`,
} as const

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'chat',
      description: 'Panel zum Schreiben mit anderen Sessions oeffnen',
    })

    return next(e)
  })

  on('command.run', { command: 'chat' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Session-Chat' })
    await refresh($)

    return { text: 'Session-Chat geoeffnet.' }
  })

  // Nur dort anhaengen, wo das Modell auch senden kann
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    if (!e.tools.includes('SendMessage') || !e.tools.includes('ListAgents')) return composed

    return { sections: [...composed.sections, ROUTING] }
  })

  // Eingehende Nachrichten anderer Sessions mitschreiben, das Modell liest sie weiterhin
  on('session.receive', async ($, e, next) => {
    const isPeer = e.origin.kind === 'peer' || e.origin.kind === 'peer-send-message'
    if (isPeer && e.agentId === undefined) {
      const peer = 'teammate' in e.origin ? e.origin.teammate : senderOf(e.text)
      await push($, { dir: 'in', peer, text: e.text })
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  // Sendungen des Modells (SendMessage-Tool) ebenfalls im Verlauf zeigen
  on('session.send', async ($, e, next) => {
    const sent = await next(e)
    if (e.origin.kind === 'model' && e.agentId === undefined && sent.isDelivered) {
      await push($, { dir: 'out', peer: e.to, text: e.text })
    }

    return sent
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const [list, names, to, hint] = await Promise.all([
      read($, log),
      read($, peers),
      read($, target),
      read($, note),
    ])
    const room = Math.max(1, (e.props.scroll?.bodyRows ?? e.viewport?.rows ?? 24) - 6)
    const { Box, Text } = $.ui.resolve(e)
    const history = (
      <Box flexDirection="column">
        {list.length === 0 && <Text dimColor>Noch keine Nachrichten.</Text>}
        {list.slice(-room).map(m => (
          <Text dimColor={m.dir === 'out'}>
            {`${time(m.at)} ${m.dir === 'in' ? '<-' : '->'} ${m.peer}: ${m.text}`}
          </Text>
        ))}
      </Box>
    )

    // Mobil gibt es weder Input noch Select: nur den Verlauf zeigen
    if (e.surface === 'mobile') return history

    const { Button, Input, Select } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        <Box flexDirection="row">
          {names.length > 0 && (
            <Select
              key="target"
              label="An"
              options={names.map(value => ({ value }))}
              value={to}
              onSelect={value => void update($, target, () => value)}
            />
          )}
          <Button key="refresh" label="Aktualisieren" onPress={() => void refresh($)} />
        </Box>
        {hint !== '' && <Text color="yellow">{hint}</Text>}
        {history}
        {to !== '' && (
          <Input
            key="message"
            placeholder={`Nachricht an ${to}`}
            submitLabel="senden"
            value=""
            onSubmit={text => void send($, text)}
          />
        )}
      </Box>
    )
  })
}
