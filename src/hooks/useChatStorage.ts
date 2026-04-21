'use client'

import { useEffect, useState } from 'react'
import { UIMessage } from 'ai'

const DB_NAME = 'DeeTwinLocalDB'
const STORE_NAME = 'transcripts'
const DB_VERSION = 1

/**
 * Hook to manage local chat storage using IndexedDB.
 * Retains transcripts for 30 days.
 */
export function useChatStorage(sessionId: string | null) {
    const [localMessages, setLocalMessages] = useState<UIMessage[]>([])

    useEffect(() => {
        if (!sessionId) return

        const openDB = async () => {
            return new Promise<IDBDatabase>((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION)
                request.onupgradeneeded = () => {
                    const db = request.result
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME, { keyPath: 'sessionId' })
                    }
                }
                request.onsuccess = () => resolve(request.result)
                request.onerror = () => reject(request.error)
            })
        }

        const loadMessages = async () => {
            try {
                const db = await openDB()
                const transaction = db.transaction(STORE_NAME, 'readonly')
                const store = transaction.objectStore(STORE_NAME)
                const request = store.get(sessionId)
                
                request.onsuccess = () => {
                    if (request.result) {
                        setLocalMessages(request.result.messages)
                        // TODO: Check expiration (30 days) and cleanup
                    }
                }
            } catch (error) {
                console.error('Failed to load local messages:', error)
            }
        }

        loadMessages()
    }, [sessionId])

    const saveMessagesLocally = async (messages: UIMessage[]) => {
        if (!sessionId || messages.length === 0) return

        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION)
            request.onsuccess = () => {
                const db = request.result
                const transaction = db.transaction(STORE_NAME, 'readwrite')
                const store = transaction.objectStore(STORE_NAME)
                store.put({
                    sessionId,
                    messages,
                    updatedAt: Date.now()
                })
            }
        } catch (error) {
            console.error('Failed to save messages locally:', error)
        }
    }

    return { localMessages, saveMessagesLocally }
}
