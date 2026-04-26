/**
 * DeeTwin Bot System - RAG Engine (Fixed Version)
 */

'use server'

import { embed } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { adminClient } from '@/lib/supabase/admin'
import * as cheerio from 'cheerio'

// Polyfill for DOMMatrix which is needed by some PDF parsers
if (typeof global !== 'undefined' && !(global as any).DOMMatrix) {
    (global as any).DOMMatrix = class DOMMatrix {
        constructor() {}
        static fromFloat32Array() { return new DOMMatrix(); }
        static fromFloat64Array() { return new DOMMatrix(); }
    };
}

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
})

function chunkText(text: string, size: number = 1000): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
        chunks.push(text.substring(start, start + size));
        start += size - 100;
    }
    return chunks;
}

export async function ingestWebUrl(url: string, clinicId: string | null = null) {
    try {
        const response = await fetch(url);
        const html = await response.text();
        const $ = cheerio.load(html);
        
        $('script, style, nav, footer').remove();
        const content = $('body').text().replace(/\s+/g, ' ').trim();
        const title = $('title').text() || url;

        const chunks = chunkText(content);
        
        for (const chunk of chunks) {
            const { embedding } = await embed({
                model: google.textEmbeddingModel('embedding-001'),
                value: chunk,
            });

            await adminClient.from('knowledge_base').insert({
                clinic_id: clinicId,
                source_type: 'web',
                source_name: String(title),
                content: String(chunk),
                embedding: embedding,
                metadata: { url: String(url) }
            });
        }

        return { success: true, chunks: chunks.length };
    } catch (err: any) {
        console.error('[RAG/Web] Error:', err);
        return { success: false, error: String(err.message) };
    }
}

export async function ingestFile(formData: FormData, clinicId: string | null = null) {
    try {
        const file = formData.get('file') as File;
        if (!file) return { success: false, error: 'No file provided' };

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        let content = '';

        if (file.type === 'application/pdf') {
            // Re-ensure polyfill in the local scope if needed
            if (typeof global !== 'undefined' && !(global as any).DOMMatrix) {
                (global as any).DOMMatrix = class DOMMatrix {
                    constructor() {}
                    static fromFloat32Array() { return new DOMMatrix(); }
                    static fromFloat64Array() { return new DOMMatrix(); }
                };
            }
            
            const parse = require('pdf-parse');
            const data = await parse(buffer);
            content = data.text;
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const mammoth = require('mammoth');
            const data = await mammoth.extractRawText({ buffer });
            content = data.value;
        } else {
            content = await file.text();
        }

        const chunks = chunkText(content.replace(/\s+/g, ' ').trim());
        
        for (const chunk of chunks) {
            const { embedding } = await embed({
                model: google.textEmbeddingModel('embedding-001'),
                value: chunk,
            });

            await adminClient.from('knowledge_base').insert({
                clinic_id: clinicId,
                source_type: 'file',
                source_name: String(file.name),
                content: String(chunk),
                embedding: embedding,
            });
        }

        return { success: true, chunks: chunks.length };
    } catch (err: any) {
        console.error('[RAG/File] Error:', err);
        return { success: false, error: String(err.message) };
    }
}

export async function searchKnowledge(query: string, clinicId: string | null = null) {
    try {
        const { embedding } = await embed({
            model: google.textEmbeddingModel('embedding-001'),
            value: query,
        });

        const { data, error } = await adminClient.rpc('match_knowledge', {
            query_embedding: embedding,
            match_threshold: 0.5,
            match_count: 5,
            p_clinic_id: clinicId
        });

        if (error) throw error;
        return (data || []) as { content: string; source_name: string; similarity: number }[];
    } catch (err) {
        console.error('[RAG/Search] Error:', err);
        return [];
    }
}
