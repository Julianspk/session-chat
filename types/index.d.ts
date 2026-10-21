export type ChatMessage = { dir: 'in' | 'out'; peer: string; text: string; at: number }

declare module 'claude-code' {
  interface PluginState {
    'session-chat': {
      log: ChatMessage[]
      peers: string[]
      target: string
      note: string
    }
  }
}
