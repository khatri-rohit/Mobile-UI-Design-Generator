"use client";

import { useLayoutEffect, useRef, useState } from 'react';
import { createShapeId, TLComponents, type Editor, Tldraw, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'

import RightPanel from '@/components/RightPanel';
import { PhoneFrameShapeUtil } from '@/components/shapes/PhoneFrameShapeUtil';
import logger from '@/lib/logger';

const components: TLComponents = {
    Grid: ({ size, ...camera }) => {
        const editor = useEditor()
        const screenBounds = useValue('screenBounds', () => editor.getViewportScreenBounds(), [])
        const devicePixelRatio = useValue('dpr', () => editor.getInstanceState().devicePixelRatio, [])
        const canvas = useRef<HTMLCanvasElement>(null)
        editor.user.updateUserPreferences({ colorScheme: 'system', color: '#202124' })

        useLayoutEffect(() => {
            if (!canvas.current) return

            const canvasW = screenBounds.w * devicePixelRatio
            const canvasH = screenBounds.h * devicePixelRatio

            canvas.current.width = canvasW
            canvas.current.height = canvasH

            const ctx = canvas.current.getContext('2d')
            if (!ctx) return

            ctx.clearRect(0, 0, canvasW, canvasH)

            const pageViewportBounds = editor.getViewportPageBounds()
            const startPageX = Math.ceil(pageViewportBounds.minX / size) * size
            const startPageY = Math.ceil(pageViewportBounds.minY / size) * size
            const endPageX = Math.floor(pageViewportBounds.maxX / size) * size
            const endPageY = Math.floor(pageViewportBounds.maxY / size) * size
            const numRows = Math.round((endPageY - startPageY) / size)
            const numCols = Math.round((endPageX - startPageX) / size)

            const majorDot = '#7f7f7f'
            const majorStep = 2
            const majorRadius = 2 * devicePixelRatio

            for (let row = 0; row <= numRows; row += majorStep) {
                const pageY = startPageY + row * size
                const canvasY = (pageY + camera.y) * camera.z * devicePixelRatio

                for (let col = 0; col <= numCols; col += majorStep) {
                    const pageX = startPageX + col * size
                    const canvasX = (pageX + camera.x) * camera.z * devicePixelRatio

                    ctx.beginPath()
                    ctx.fillStyle = majorDot
                    ctx.arc(canvasX, canvasY, majorRadius, 0, Math.PI * 2)
                    ctx.fill()
                }
            }
        }, [camera, devicePixelRatio, editor, screenBounds, size])

        return <canvas className="tl-grid" ref={canvas} />
    },
}

const shapeUtils = [PhoneFrameShapeUtil]  // defined OUTSIDE component — never recreate in render


const StudioPage = () => {
    const editorRef = useRef<Editor | null>(null)
    const shapeIdRef = useRef<ReturnType<typeof createShapeId> | null>(null)
    const accumulatedTextRef = useRef('')

    const [prompt, setPrompt] = useState('Design a clean dashboard for analytics with cards and charts')
    // const [prompt, setPrompt] = useState('Why is the sky blue?')
    const [isGenerating, setIsGenerating] = useState(false)
    const [conversation, setConversation] = useState<Array<{ role: string; content: string }>>([])

    const handleGenerate = async () => {
        if (!prompt.trim()) return

        setIsGenerating(true)
        try {
            if (!editorRef.current) throw new Error("Editor not initialized")

            // 2. On each token — accumulate and update the shape
            shapeIdRef.current = null
            accumulatedTextRef.current = ''


            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt }),
            })

            if (!response.ok || !response.body) {
                const errorData = await response.json()
                
                logger.error("Error response: ", errorData)
                throw new Error(errorData.message || 'Generation failed')
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let sseBuffer = '';

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                sseBuffer += decoder.decode(value, { stream: true })
                const lines = sseBuffer.split('\n')
                sseBuffer = lines.pop() ?? ''

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue
                    const raw = line.slice(6).trim()
                    if (raw === '[DONE]') return

                    const event = JSON.parse(raw)
                    handleEvent(event) // <-- pass accumulated as an argument to handleEvent
                }
            }

        } catch (error) {
            logger.error('Error generating layout:', error)
        } finally {
            setIsGenerating(false)
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleEvent(event: any) {
        const editor = editorRef.current
        if (!editor) return

        if (event.type === 'screen_start') {
            const id = createShapeId()
            shapeIdRef.current = id
            accumulatedTextRef.current = ''
            editor.createShape({
                id,
                type: 'phone-frame',
                x: 100,
                y: 100,
                props: {
                    w: 200,
                    h: 380,
                    screenName: event.screen,
                    content: '',
                    state: 'skeleton',
                }

            })
            editor.zoomToFit({ animation: { duration: 300 } })
        } else if (event.type === 'code_chunk') {
            if (!shapeIdRef.current) {
                const id = createShapeId()
                shapeIdRef.current = id
                accumulatedTextRef.current = ''
                editor.createShape({
                    id,
                    type: 'phone-frame',
                    x: 100,
                    y: 100,
                    props: {
                        w: 200,
                        h: 380,
                        screenName: event.screen,
                        content: '',
                        state: 'skeleton',
                    }
                })
            }

            accumulatedTextRef.current += event.token
            editor.updateShape({
                id: shapeIdRef.current,
                type: 'phone-frame',
                props: {
                    w: 200,
                    h: 380,
                    screenName: event.screen,
                    content: accumulatedTextRef.current,
                    state: 'streaming',
                }
            })
        } else if (event.type === 'screen_done') {
            // TODO: finalize shape state if needed


        } else if (event.type === 'chat' || event.type === 'spec') {
            setConversation((prev) => {
                const updated = [...prev]
                const lastMessage = updated[updated.length - 1]

                if (lastMessage && lastMessage.role === 'assistant') {
                    updated[updated.length - 1] = {
                        ...lastMessage,
                        content: lastMessage.content + event.text,
                    }
                    return updated
                }

                return [...updated, { role: 'assistant', content: event.text }]
            })
        }

        if (event.type === "error") {
            logger.error("Stream error:", event.message);
        }
    }


    const handleMount = (mountedEditor: Editor) => {
        editorRef.current = mountedEditor   // always current, never stale
        mountedEditor.updateInstanceState({ isGridMode: true })
    }

    return (
        <div className="relative flex h-screen w-full flex-col-reverse overflow-hidden md:flex-row">

            <div className="relative h-full min-h-[45vh] flex-1 md:min-h-0">

                <div className="h-full">
                    <Tldraw hideUi shapeUtils={shapeUtils} components={components} onMount={handleMount} />
                </div>
            </div>
            <RightPanel
                prompt={prompt}
                isGenerating={isGenerating}
                onPromptChange={setPrompt}
                onGenerate={handleGenerate}
                conversation={conversation}
                setConversation={setConversation}
            />
        </div>
    )
}

export default StudioPage
