import { createHashRouter } from 'react-router-dom'
import { AppLayout } from './App'
import { HomePage } from './screens/HomePage'
import { EditorPage } from './screens/EditorPage'
import { ChatPage } from './screens/ChatPage'
import { SettingsPage } from './screens/SettingsPage'
import { JournalEntryPage } from './screens/JournalEntryPage'
export const router = createHashRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'editor/:entryId?', element: <EditorPage /> },
      { path: 'entry/:entryId', element: <JournalEntryPage /> },
      { path: 'chat', element: <ChatPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])
