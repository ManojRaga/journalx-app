# JournalX

JournalX is a local-first, AI-augmented journaling desktop app built with **Electron**, **Vite**, and **React**.  
It helps you capture daily reflections, organize them into a personal knowledge base, and explore them with an AI assistant.

---

## Screenshots

Place your screenshots in the `screenshots` directory with these filenames:

- `screenshots/home.png`
- `screenshots/editor.png`
- `screenshots/chat.png`

Then they will render below:

![Home screen](./screenshots/home.png)
![Editor](./screenshots/editor.png)
![Chat](./screenshots/chat.png)

---

## Features

- **Local-first journaling**
  - Entries are stored locally (backed by SQLite / file-based storage).
  - Fast loading of your journal archive without round-trips to a server.

- **Rich journal home view**
  - Browse a **library of entries** with titles, summaries, tags, and last-updated timestamps.
  - Sorts entries by most recently updated so your current work is always at the top.
  - Quick preview panel to read the full entry without leaving the home screen.

- **Focused writing experience**
  - Dedicated **Editor** screen for creating and refining entries.
  - Title + long-form content editing with a clean, distraction-minimized layout.
  - Clear saving state feedback (`Saving...` / `Saved` / failure notice).

- **AI-powered insights (via LangChain + Anthropic/OpenAI)**
  - Integrates `langchain`, `@anthropic-ai/sdk`, and `@langchain/openai` for AI features.
  - Vector store powered by `faiss-node` for semantic retrieval over your journal.
  - A **Chat** screen to converse with an AI about your entries (reflection, summarization, pattern-finding, etc.).

- **Modern UI/UX**
  - Built with **React 18**, **React Router v7**, and **Tailwind CSS**.
  - The main layout uses `AppLayout` with a persistent navigation sidebar (`Nav`) and routed content.
  - Themed with a dark, gradient-heavy aesthetic (midnight / onyx / aurum / pearl).

- **Type-safe and modular architecture**
  - Shared **types** (`journal`, `settings`, `ai`, etc.) under `src/shared/types`.
  - **Stores & context** for app data in `src/shared/context` and `src/shared/store`.
  - **Services** for journal persistence and AI integration in `src/shared/services`.
  - **Hooks** for IPC and app data (`useIpcInvoke`, `useIpcEvent`, `useAppData`).

---

## Tech Stack

- **Frontend / Renderer**
  - React + React DOM
  - React Router (v7)
  - Vite for dev server and bundling
  - Tailwind CSS for styling
  - Zustand for state management
  - sonner for toast notifications

- **Desktop / Packaging**
  - Electron for the desktop runtime
  - electron-builder for packaging and distribution

- **Data / AI**
  - better-sqlite3 for fast local database access
  - LangChain + `@langchain/anthropic`, `@langchain/openai`
  - faiss-node for vector search over journal entries

- **Tooling**
  - TypeScript
  - ESLint (`@typescript-eslint`, React hooks plugin)
  - PostCSS / Autoprefixer

---

## Project Structure

High-level overview:

```text
src/
  App.tsx                 # Root layout with Nav + routed content
  main.tsx                # Vite/React entry point
  routes.tsx              # React Router configuration

  components/
    layout/
      Nav.tsx             # Sidebar navigation

  screens/
    HomePage.tsx          # Library + preview of journal entries
    EditorPage.tsx        # Create/edit a journal entry
    ChatPage.tsx          # Converse with AI about your notes
    SettingsPage.tsx      # App / AI / storage settings
    JournalEntryPage.tsx  # Dedicated read view for a single entry

  shared/
    context/
      AppDataContext.ts   # App data context type definitions
      AppDataProvider.tsx # Provider wiring storage + state
    hooks/
      useAppData.ts       # Access to app-level journal data
      useIpcInvoke.ts     # IPC wrapper for invoking Electron main
      useIpcEvent.ts      # IPC wrapper for event subscriptions
    services/
      JournalService.ts   # CRUD operations for journal entries
      AIService.ts        # AI-related calls (summaries, chat, etc.)
    storage/
      FileStorage.ts      # File-based storage abstraction
      SecureStore.ts      # Secure/local storage
      SettingsStorage.ts  # Persistence for app settings
      VectorStore.ts      # Faiss-based vector index for entries
      InMemoryStore.ts    # In-memory store implementation
      constants.ts        # Storage constants / paths
    store/
      chatStore.ts        # Zustand store for chat state
    types/
      journal.ts          # Journal entry types
      renderer.ts         # Renderer-side types
      settings.ts         # Settings types
      ai.ts               # AI-related types
      events.ts           # IPC event payloads
      context.ts          # App context shapes

screenshots/
  home.png
  editor.png
  chat.png
```

---

## Getting Started

### Prerequisites

- Node.js (LTS recommended)
- npm (comes with Node)

### Install dependencies

```bash
npm install
```

### Run in development

```bash
npm run dev
```

This starts the Vite dev server and Electron. You should see the JournalX window open. If you only see a browser URL, open it in a browser or check your Electron dev setup.

### Build for production

```bash
npm run build
```

This will:

- Run TypeScript type checking
- Build the renderer bundle with Vite
- Package the Electron app using `electron-builder`

Built artifacts will appear under `dist*` / `release` (typically ignored by git).

---

## Usage

- **Create a new entry**
  - From the Home screen, click **New Entry**.
  - Enter a title and your reflection in the editor, then click **Save**.

- **Review past entries**
  - Use the left-hand journal library to select entries.
  - The right-hand pane shows a rich preview with timestamps and tags.
  - Click **Edit Entry** to jump back into the editor.

- **Chat with your journal**
  - Open the **Chat** tab.
  - Ask questions like “What themes show up in my entries this month?” or “Summarize my last few reflections.”
  - The AI uses your local entries and vector store to ground its responses.

- **Configure settings**
  - Go to the **Settings** screen to manage preferences such as AI configuration and storage behavior.

---

## Roadmap / Ideas

- Rich text or markdown editing for entries
- More powerful tagging and search
- Timeline / calendar views of entries
- Multi-LLM support and offline models
- Encrypted backups and multi-device sync (optional)

---

## License

This project is licensed under the **MIT License**.
