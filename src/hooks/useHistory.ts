'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { UIMessage } from 'ai'

const IDB_NAME = 'DeeTwinHistory'
const IDB_STORE = 'sessions'
const IDB_VERSION = 1
const MAX_LOCAL_SESSIONS = 30

interface HistorySession {
    sessionId: string
    messages: UIMessage[]
    preview: string       // first user message truncated
    updatedAt: number
}

// ── IndexedDB helpers ─────────────────────────────────────────────────────────
async function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IDB_NAME, IDB_VERSION)
        req.onupgradeneeded = () => {
            const db = req.result
            if (!db.objectStoreNames.contains(IDB_STORE)) {
                const store = db.createObjectStore(IDB_STORE, { keyPath: 'sessionId' })
                store.createIndex('updatedAt', 'updatedAt', { unique: false })
            }
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
    })
}

async function idbGet(sessionId: string): Promise<HistorySession | null> {
    try {
        const db = await openDB()
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readonly')
            const req = tx.objectStore(IDB_STORE).get(sessionId)
            req.onsuccess = () => resolve(req.result ?? null)
            req.onerror = () => reject(req.error)
        })
    } catch { return null }
}

async function idbPut(session: HistorySession): Promise<void> {
    try {
        const db = await openDB()
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readwrite')
            const store = tx.objectStore(IDB_STORE)
            store.put(session)
            tx.oncomplete = () => resolve()
            tx.onerror = () => reject(tx.error)
        })
    } catch (e) { console.error('[useHistory] idbPut error:', e) }
}

async function idbGetAll(): Promise<HistorySession[]> {
    try {
        const db = await openDB()
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readonly')
            const req = tx.objectStore(IDB_STORE).getAll()
            req.onsuccess = () => resolve(
                (req.result as HistorySession[]).sort((a, b) => b.updatedAt - a.updatedAt)
            )
            req.onerror = () => reject(req.error)
        })
    } catch { return [] }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useHistory(sessionId: string | null) {
    const [sessions, setSessions] = useState<HistorySession[]>([])

    // Load all local sessions on mount
    useEffect(() => {
        idbGetAll().then(setSessions)
    }, [])

    /**
     * Save messages for current session.
     * Also persists to Supabase chat_history (fire-and-forget, non-blocking).
     */
    const saveSession = useCallback(async (
        messages: UIMessage[],
        opts?: { userId?: string | null; clinicId?: string | null }
    ) => {
        if (!sessionId || messages.length === 0) return

        const firstUserMsg = messages.find((m) => m.role === 'user')
        const preview = firstUserMsg
            ? (firstUserMsg.parts?.[0] as any)?.text?.slice(0, 60) ?? '...'
            : '...'

        const session: HistorySession = { sessionId, messages, preview, updatedAt: Date.now() }

        // 1. Local (fast)
        await idbPut(session)
        setSessions((prev) => {
            const others = prev.filter((s) => s.sessionId !== sessionId)
            return [session, ...others].slice(0, MAX_LOCAL_SESSIONS)
        })

        // 2. Supabase (async, non-blocking)
        const lastUser = messages.findLast((m) => m.role === 'user')
        const lastAssistant = messages.findLast((m) => m.role === 'assistant')
        const userText = (lastUser?.parts?.[0] as any)?.text
        const assistantText = (lastAssistant?.parts?.[0] as any)?.text

        if (userText && assistantText && (opts?.userId || opts?.clinicId)) {
            supabase.from('chat_history').insert({
                user_id: opts?.userId ?? null,
                clinic_id: opts?.clinicId ?? null,
                message: userText,
                response: assistantText,
            }).then(({ error }) => {
                if (error) console.error('[useHistory] Supabase save error:', error)
            })
        }
    }, [sessionId])

    /**
     * Load messages for a specific session from local store.
     */
    const loadSession = useCallback(async (id: string): Promise<UIMessage[]> => {
        const s = await idbGet(id)
        return s?.messages ?? []
    }, [])

    /**
     * Delete a session from local store.
     */
    const deleteSession = useCallback(async (id: string) => {
        try {
            const db = await openDB()
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(IDB_STORE, 'readwrite')
                tx.objectStore(IDB_STORE).delete(id)
                tx.oncomplete = () => resolve()
                tx.onerror = () => reject(tx.error)
            })
            setSessions((prev) => prev.filter((s) => s.sessionId !== id))
        } catch (e) { console.error('[useHistory] delete error:', e) }
    }, [])

    return { sessions, saveSession, loadSession, deleteSession }
}
