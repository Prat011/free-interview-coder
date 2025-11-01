import React, { useState, useEffect, useRef } from "react"
import { useQuery } from "react-query"
import ScreenshotQueue from "../components/Queue/ScreenshotQueue"
import {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastVariant,
  ToastMessage
} from "../components/ui/toast"
import QueueCommands from "../components/Queue/QueueCommands"
import ChatModal from "../components/Chat/ChatModal"
import AudioTranscriber from "../components/Audio/AudioTranscriber"

interface QueueProps {
  setView: React.Dispatch<React.SetStateAction<"queue" | "solutions" | "debug">>
  setIsChatOpen: React.Dispatch<React.SetStateAction<boolean>>
  isChatOpen: boolean
}

const Queue: React.FC<QueueProps> = ({ setView, setIsChatOpen, isChatOpen }) => {
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<ToastMessage>({
    title: "",
    description: "",
    variant: "neutral"
  })

  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const [tooltipHeight, setTooltipHeight] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const contentRef = useRef<HTMLDivElement>(null)
  const dragHandleRef = useRef<HTMLDivElement>(null)

  const { data: screenshots = [], refetch } = useQuery({
    queryKey: ["screenshots"],
    queryFn: async () => {
      try {
        const existing = await window.electronAPI.getScreenshots()
        return existing
      } catch (error) {
        console.error("Error loading screenshots:", error)
        showToast("Error", "Failed to load existing screenshots", "error")
        return []
      }
    },
    staleTime: Infinity,
    cacheTime: Infinity,
    refetchOnWindowFocus: true,
    refetchOnMount: true
  })

  const showToast = (
    title: string,
    description: string,
    variant: ToastVariant
  ) => {
    setToastMessage({ title, description, variant })
    setToastOpen(true)
  }

  const handleDeleteScreenshot = async (index: number) => {
    const screenshotToDelete = screenshots[index]

    try {
      const response = await window.electronAPI.deleteScreenshot(
        screenshotToDelete.path
      )

      if (response.success) {
        refetch()
      } else {
        console.error("Failed to delete screenshot:", response.error)
        showToast("Error", "Failed to delete the screenshot file", "error")
      }
    } catch (error) {
      console.error("Error deleting screenshot:", error)
    }
  }

  useEffect(() => {
    const updateDimensions = () => {
      if (contentRef.current) {
        let contentHeight = contentRef.current.scrollHeight
        const contentWidth = contentRef.current.scrollWidth
        if (isTooltipVisible) {
          contentHeight += tooltipHeight
        }
        window.electronAPI.updateContentDimensions({
          width: contentWidth,
          height: contentHeight
        })
      }
    }

    const resizeObserver = new ResizeObserver(updateDimensions)
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current)
    }
    updateDimensions()

    const cleanupFunctions = [
      window.electronAPI.onScreenshotTaken(() => refetch()),
      window.electronAPI.onResetView(() => refetch()),
      window.electronAPI.onSolutionError((error: string) => {
        showToast(
          "Processing Failed",
          "There was an error processing your screenshots.",
          "error"
        )
        setView("queue")
        console.error("Processing error:", error)
      }),
      window.electronAPI.onProcessingNoScreenshots(() => {
        showToast(
          "No Screenshots",
          "There are no screenshots to process.",
          "neutral"
        )
      })
    ]

    return () => {
      resizeObserver.disconnect()
      cleanupFunctions.forEach((cleanup) => cleanup())
    }
  }, [isTooltipVisible, tooltipHeight])

  const handleTooltipVisibilityChange = (visible: boolean, height: number) => {
    setIsTooltipVisible(visible)
    setTooltipHeight(height)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!contentRef.current) return
    setIsDragging(true)
    const rect = contentRef.current.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragOffset])

  return (
    <div
      ref={contentRef}
      className={`bg-transparent pointer-events-none ${isDragging ? 'cursor-grabbing' : ''}`}
      style={{
        position: 'fixed',
        left: position.x || '50%',
        top: position.y || '20px',
        transform: position.x ? 'none' : 'translateX(-50%)',
        zIndex: 50
      }}
    >
      <div className="pointer-events-none">
        {/* Drag Handle */}
        <div
          ref={dragHandleRef}
          onMouseDown={handleMouseDown}
          className="w-full flex justify-center mb-2 pointer-events-auto cursor-grab active:cursor-grabbing"
        >
          <div className="w-12 h-1 bg-white/30 rounded-full hover:bg-white/50 transition-colors" />
        </div>
        <Toast
          open={toastOpen}
          onOpenChange={setToastOpen}
          variant={toastMessage.variant}
          duration={3000}
        >
          <ToastTitle>{toastMessage.title}</ToastTitle>
          <ToastDescription>{toastMessage.description}</ToastDescription>
        </Toast>

        <div className="space-y-2 w-fit mx-auto flex flex-col items-center pointer-events-none">
          <ScreenshotQueue
            isLoading={false}
            screenshots={screenshots}
            onDeleteScreenshot={handleDeleteScreenshot}
          />
          <QueueCommands
            screenshots={screenshots}
            onTooltipVisibilityChange={handleTooltipVisibilityChange}
            setIsChatOpen={setIsChatOpen}
            isChatOpen={isChatOpen}
          />

          {/* Audio Transcriber */}
          <AudioTranscriber onTranscript={() => {}} />
        </div>
      </div>

      {isChatOpen && <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />}

      {/* Close chat when clicking outside - escape key */}
      {isChatOpen && (
        <div
          className="absolute inset-0 z-40"
          onClick={() => setIsChatOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setIsChatOpen(false)
          }}
        />
      )}
    </div>
  )
}

export default Queue
