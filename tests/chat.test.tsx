import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'session-chat',
  component: 'Pane',
  requestId: 'session-chat',
  props: {
    title: 'Session-Chat',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

test('Weiterleitungs-Anweisung nur, wenn das Modell senden kann', async ($, on) => {
  on('prompt.compose', () => ({ sections: [{ id: 'intro', text: 'x', scope: 'shared' }] }))
  const compose = (tools: string[]) =>
    $.prompt.compose({ model: 'm', promptModel: 'm', surfaces: [], tools, outputStyle: null, traits: [] })

  const ids = async (tools: string[]) => (await compose(tools)).sections.map(s => s.id)
  expect(await ids(['SendMessage', 'ListAgents'])).toEqual(['intro', 'session-chat:routing'])
  expect(await ids(['Read'])).toEqual(['intro'])
})

test('Senden, Empfangen und Modell-Sendungen landen im Verlauf', async ($, on) => {
  // Diese Hooks stehen fuer die Engine unter der Mod
  const sent: string[] = []
  on('tool.call', () => ({
    result: { listing: '', sections: [{ kind: 'session', total: 1, rows: [{ name: 'backend' }] }] },
  }))
  on('session.send', (_, e) => {
    sent.push(`${e.to}: ${e.text}`)
    return { isDelivered: true }
  })
  on('session.receive', (_, e) => ({ text: e.text }))

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Text', text: /Noch keine Nachrichten/ })).toBeDefined()
    await ui.unmount()
  }

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await $.ui.press({ plugin: 'session-chat', key: 'refresh' })
  await $.ui.input({ plugin: 'session-chat', key: 'message', text: 'Hallo backend' })
  expect(sent).toEqual(['backend: Hallo backend'])
  expect(await ui.find({ type: 'Text', text: /-> backend: Hallo backend/ })).toBeDefined()

  await $.session.receive({ origin: { kind: 'peer' }, text: '<msg from="backend">Antwort</msg>' })
  expect(await ui.find({ type: 'Text', text: /<- backend: .*Antwort/ })).toBeDefined()

  await $.session.send({ to: 'frontend', text: 'vom Modell', origin: { kind: 'model' } })
  expect(await ui.find({ type: 'Text', text: /-> frontend: vom Modell/ })).toBeDefined()
  await ui.unmount()
})
