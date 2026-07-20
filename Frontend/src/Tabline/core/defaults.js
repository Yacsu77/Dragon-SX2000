/**
 * Seed da sidebar — único lugar com labels/URLs iniciais.
 * A UI nunca hardcoda nomes de serviços; só renderiza o que vem do store.
 */
(function () {
  const NS = (window.SidebarNS = window.SidebarNS || {});

  const SECTIONS = Object.freeze(['tools', 'llm', 'chats', 'widgets', 'footer']);

  /** Seções que o Customise poderá editar (etapa futura). */
  const EDITABLE_SECTIONS = Object.freeze(['llm', 'chats']);

  function uid(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function createDefaults() {
    return {
      version: 1,
      items: [
        {
          id: uid('tool'),
          kind: 'action',
          section: 'tools',
          label: 'VPN',
          icon: { type: 'lucide', value: 'shield' },
          action: { type: 'stub', payload: { message: 'Em desenvolvimento' } },
          locked: true,
          order: 0,
          visible: true,
        },
        {
          id: uid('tool'),
          kind: 'action',
          section: 'tools',
          label: 'DSX Game',
          icon: { type: 'lucide', value: 'gamepad-2' },
          action: { type: 'stub', payload: { message: 'Em desenvolvimento' } },
          locked: true,
          order: 1,
          visible: true,
        },
        {
          id: uid('llm'),
          kind: 'url',
          section: 'llm',
          label: 'Claude',
          icon: { type: 'lucide', value: 'bot' },
          url: 'https://claude.ai',
          action: { type: 'openPanel' },
          locked: false,
          order: 0,
          visible: true,
        },
        {
          id: uid('llm'),
          kind: 'url',
          section: 'llm',
          label: 'ChatGPT',
          icon: { type: 'lucide', value: 'sparkles' },
          url: 'https://chatgpt.com',
          action: { type: 'openPanel' },
          locked: false,
          order: 1,
          visible: true,
        },
        {
          id: uid('chat'),
          kind: 'url',
          section: 'chats',
          label: 'WhatsApp',
          icon: { type: 'lucide', value: 'message-circle' },
          url: 'https://web.whatsapp.com',
          action: { type: 'openPanel' },
          locked: false,
          order: 0,
          visible: true,
        },
        {
          id: uid('chat'),
          kind: 'url',
          section: 'chats',
          label: 'Discord',
          icon: { type: 'lucide', value: 'hash' },
          url: 'https://discord.com/app',
          action: { type: 'openPanel' },
          locked: false,
          order: 1,
          visible: true,
        },
        {
          id: uid('chat'),
          kind: 'url',
          section: 'chats',
          label: 'Instagram',
          icon: { type: 'lucide', value: 'camera' },
          url: 'https://www.instagram.com',
          action: { type: 'openPanel' },
          locked: false,
          order: 2,
          visible: true,
        },
      ],
    };
  }

  NS.SECTIONS = SECTIONS;
  NS.EDITABLE_SECTIONS = EDITABLE_SECTIONS;
  NS.createDefaults = createDefaults;
})();
