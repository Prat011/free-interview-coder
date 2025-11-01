import React, { useState, useRef } from "react"
import { Mic, MicOff, Volume2 } from "lucide-react"
import { GoogleGenAI, Modality } from '@google/genai'

interface AudioTranscriberProps {
  onTranscript: (text: string) => void
}

const AudioTranscriber: React.FC<AudioTranscriberProps> = ({ onTranscript }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [error, setError] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const sessionRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)

  const startRecording = async () => {
    try {
      setError("")
      setTranscript("")
      setIsConnecting(true)

      // Get API key
      let apiKey = (window as any).GEMINI_API_KEY
      if (!apiKey && (window as any).electronAPI?.getApiKey) {
        apiKey = await (window as any).electronAPI.getApiKey()
      }

      if (!apiKey) {
        throw new Error("API key not available")
      }

      // Initialize Google GenAI
      const ai = new GoogleGenAI({ apiKey })

      const config = {
        responseModalities: [Modality.TEXT],
        inputAudioTranscription: {}
      }

      // Connect to Gemini Live
      const session = await ai.live.connect({
        model: 'gemini-2.0-flash-exp',
        callbacks: {
          onopen: () => {
            setIsConnecting(false)
            setIsRecording(true)
          },
          onmessage: (message: any) => {
            // Get input transcription (what user said)
            if (message.serverContent?.inputTranscription?.text) {
              const text = message.serverContent.inputTranscription.text
              setTranscript((prev) => {
                const newTranscript = prev + text + " "
                onTranscript(newTranscript)
                return newTranscript
              })
            }
          },
          onerror: (e: any) => {
            setError(`Error: ${e.message}`)
            stopRecording()
          },
          onclose: (e: any) => {
            if (e.code !== 1000) {
              setError(`Connection closed: ${e.reason || "Unknown error"}`)
            }
            setIsRecording(false)
            setIsConnecting(false)
          },
        },
        config: config,
      })

      sessionRef.current = session

      // Create audio context first
      const audioContext = new AudioContext({ sampleRate: 16000 })
      audioContextRef.current = audioContext

      // Create a destination to mix audio streams
      const destination = audioContext.createMediaStreamDestination()

      try {
        // Request microphone access
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000
          }
        })

        const micSource = audioContext.createMediaStreamSource(micStream)
        micSource.connect(destination)

        // Try to get system audio (desktop/tab audio)
        try {
          const systemStream = await navigator.mediaDevices.getDisplayMedia({
            video: false,
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
              sampleRate: 16000
            }
          })

          const systemSource = audioContext.createMediaStreamSource(systemStream)
          systemSource.connect(destination)
        } catch (e) {
          console.log("System audio not available, using mic only")
        }
      } catch (e) {
        throw new Error("Failed to access audio devices")
      }

      // Use the mixed stream
      streamRef.current = destination.stream

      const source = audioContext.createMediaStreamSource(destination.stream)
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      source.connect(processor)
      processor.connect(audioContext.destination)

      processor.onaudioprocess = (e) => {
        if (session && sessionRef.current) {
          const inputData = e.inputBuffer.getChannelData(0)

          // Convert float32 to int16
          const int16Data = new Int16Array(inputData.length)
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]))
            int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
          }

          // Convert to base64
          const base64Audio = btoa(
            String.fromCharCode(...new Uint8Array(int16Data.buffer))
          )

          // Send audio to Gemini Live
          session.sendRealtimeInput({
            audio: {
              data: base64Audio,
              mimeType: "audio/pcm;rate=16000"
            }
          })
        }
      }

    } catch (error: any) {
      setError(`Failed to start recording: ${error.message}`)
      setIsRecording(false)
      setIsConnecting(false)
    }
  }

  const stopRecording = () => {
    // Disconnect audio processor
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    // Close session
    if (sessionRef.current) {
      sessionRef.current.close()
      sessionRef.current = null
    }

    setIsRecording(false)
    setIsConnecting(false)
  }

  const toggleRecording = () => {
    if (isRecording || isConnecting) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const clearTranscript = () => {
    setTranscript("")
    onTranscript("")
  }

  const saveTranscript = () => {
    if (!transcript) return

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `transcript_${timestamp}.txt`
    const blob = new Blob([transcript], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="w-full pointer-events-auto">
      {/* Recording Button */}
      <button
        onClick={toggleRecording}
        disabled={isConnecting}
        className={`text-xs text-white/90 backdrop-blur-md bg-black/60 rounded-lg py-1.5 px-3 flex items-center justify-center gap-1.5 transition-all w-full ${
          isRecording
            ? "bg-red-600/60 animate-pulse"
            : isConnecting
            ? "cursor-wait opacity-75"
            : "hover:bg-black/70"
        }`}
        title={isRecording ? "Stop Recording" : isConnecting ? "Connecting..." : "Start Recording"}
      >
        {isRecording ? (
          <>
            <MicOff className="w-3.5 h-3.5" />
            <span>Stop</span>
            <Volume2 className="w-3 h-3 animate-pulse" />
          </>
        ) : isConnecting ? (
          <>
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <Mic className="w-3.5 h-3.5" />
            <span>Record</span>
          </>
        )}
      </button>

      {/* Error Display */}
      {error && (
        <div className="mt-2 p-2 bg-red-900/30 border border-red-700/50 rounded-lg backdrop-blur-md">
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Transcript Display */}
      {transcript && (
        <div className="fixed pointer-events-none" style={{ top: '120px', left: '50%', transform: 'translateX(-50%)', maxHeight: '400px', width: '505px', zIndex: 60}}>
          <div className="backdrop-blur-md bg-black/80 pointer-events-auto w-full rounded-lg shadow-lg border border-white/20">
            <div className="flex flex-col max-h-[400px]">
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 flex-shrink-0">
                <span className="text-xs font-medium text-white/90">Transcript</span>
                <div className="flex gap-2">
                  <button
                    onClick={saveTranscript}
                    className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 text-white/70 rounded transition-colors"
                    title="Save transcript"
                  >
                    Save
                  </button>
                  <button
                    onClick={clearTranscript}
                    className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 text-white/70 rounded transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Transcript Content */}
              <div className="overflow-y-auto p-3">
                <div className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
                  {transcript}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AudioTranscriber
