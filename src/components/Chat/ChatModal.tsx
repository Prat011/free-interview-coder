import React, { useState, useRef, useEffect } from "react"
import { Send } from "lucide-react"

interface Message {
  id: string
  text: string
  sender: "user" | "assistant"
  timestamp: Date
}

interface ChatModalProps {
  isOpen: boolean
  onClose: () => void
}

const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose: _onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hi! I'm your coding assistant. Ask me anything about algorithms, data structures, or coding problems!",
      sender: "assistant",
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  if (!isOpen) return null

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userText = inputValue

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: userText,
      sender: "user",
      timestamp: new Date()
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      // Get API key from window (set by preload script synchronously)
      let apiKey = (window as any).GEMINI_API_KEY

      // Fallback: If still not available, request it asynchronously
      if (!apiKey && (window as any).electronAPI?.getApiKey) {
        apiKey = await (window as any).electronAPI.getApiKey()
      }

      if (!apiKey) {
        throw new Error("API key not available. Make sure GEMINI_API_KEY is set.")
      }

      // Call Gemini API (non-streaming for simplicity)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are a helpful coding assistant. Answer concisely with code examples when relevant.\n\nQuestion: ${userText}`
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048
            }
          })
        }
      )

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response received"

      // Create assistant message with response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: text,
        sender: "assistant",
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Chat error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Error: ${error instanceof Error ? error.message : "Failed to get response"}`,
        sender: "assistant",
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="absolute pointer-events-none" style={{ top: '120px', height: '300px', width: '505px'}}>
      <div className="backdrop-blur-md bg-black/80 pointer-events-auto w-full h-full rounded-lg border border-white/20 shadow-lg">
        <div className="flex flex-col h-full w-full">

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto space-y-2 px-3 py-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs px-3 py-2 rounded-lg text-sm leading-relaxed whitespace-pre-wrap ${
                  message.sender === "user"
                    ? "bg-white/20 text-white/90 border border-white/30"
                    : "bg-white/10 text-white/90 border border-white/20"
                }`}
              >
                {message.text || (message.sender === "assistant" && isLoading ? (
                  <div className="flex gap-1 items-center">
                    <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></span>
                    <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                  </div>
                ) : message.text)}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Container */}
        <div className="flex gap-2 items-center px-3 py-3 border-t border-white/20">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white/90 placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-colors"
            disabled={isLoading}
            autoFocus
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="px-3 py-2 bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed text-white/90 rounded-lg transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}

export default ChatModal
