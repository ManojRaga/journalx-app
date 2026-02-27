import { createContext } from 'react'
import type { AppDataContextValue } from '../types/context'

export const AppDataContext = createContext<AppDataContextValue | undefined>(undefined)

