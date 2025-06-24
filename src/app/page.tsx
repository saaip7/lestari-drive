"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Upload, Folder, File, ImageIcon, Video, FileText, FolderPlus, Grid3x3, List, Search, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

interface DriveFile {
  id: string
  name: string
  mimeType: string
  size: number
  createdTime: string
  modifiedTime: string
  webViewLink?: string
  isFolder: boolean
}

interface BreadcrumbItem {
  id: string
  name: string
}

export default function GoogleDriveClone() {
  const [files, setFiles] = useState<DriveFile[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: "root", name: "My Drive" }])
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [newFolderName, setNewFolderName] = useState("")
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadFiles()
  }, [currentFolderId])

  const loadFiles = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (currentFolderId) {
        params.append("folderId", currentFolderId)
      }

      const response = await fetch(`/api/list?${params}`)
      if (!response.ok) throw new Error("Failed to load files")

      const data = await response.json()
      setFiles(data.files)
    } catch (error) {
      console.error("Error loading files:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files
    if (!selectedFiles) return

    setUploading(true)
    try {
      for (const file of Array.from(selectedFiles)) {
        const formData = new FormData()
        formData.append("file", file)
        if (currentFolderId) {
          formData.append("parentId", currentFolderId)
        }

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`)
        }
      }

      await loadFiles()
    } catch (error) {
      console.error("Upload error:", error)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    setIsCreatingFolder(true)
    try {
      const response = await fetch("/api/create-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentId: currentFolderId,
        }),
      })

      if (!response.ok) throw new Error("Failed to create folder")

      setNewFolderName("")
      await loadFiles()
    } catch (error) {
      console.error("Create folder error:", error)
    } finally {
      setIsCreatingFolder(false)
    }
  }


  const navigateToFolder = (folderId: string, folderName: string) => {
    setCurrentFolderId(folderId)
    setBreadcrumbs((prev) => [...prev, { id: folderId, name: folderName }])
    setSelectedFiles(new Set())
  }

  const navigateToBreadcrumb = (index: number) => {
    const targetBreadcrumb = breadcrumbs[index]
    setCurrentFolderId(targetBreadcrumb.id === "root" ? null : targetBreadcrumb.id)
    setBreadcrumbs(breadcrumbs.slice(0, index + 1))
    setSelectedFiles(new Set())
  }

  // const toggleFileSelection = (fileId: string) => {
  //   const newSelection = new Set(selectedFiles)
  //   if (newSelection.has(fileId)) {
  //     newSelection.delete(fileId)
  //   } else {
  //     newSelection.add(fileId)
  //   }
  //   setSelectedFiles(newSelection)
  // }

  const getFileIcon = (file: DriveFile) => {
    if (file.isFolder) {
      return <Folder className="w-6 h-6 text-blue-600" />
    }

    if (file.mimeType.startsWith("image/")) {
      return <ImageIcon className="w-6 h-6 text-green-600" />
    }
    if (file.mimeType.startsWith("video/")) {
      return <Video className="w-6 h-6 text-purple-600" />
    }
    if (file.mimeType.includes("pdf")) {
      return <FileText className="w-6 h-6 text-red-600" />
    }
    if (file.mimeType.includes("document") || file.mimeType.includes("text")) {
      return <FileText className="w-6 h-6 text-blue-600" />
    }

    return <File className="w-6 h-6 text-gray-600" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return ""
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return "Today"
    if (diffDays === 2) return "Yesterday"
    if (diffDays <= 7) return `${diffDays - 1} days ago`

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    })
  }

  const filteredFiles = files.filter((file) => file.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Folder className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-medium text-gray-900">Lestari Drive</h1>
          </div>

          {/* Search */}
          <div className="relative ml-8">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search in Drive"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-96 bg-gray-50 border-0 focus:bg-white focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open("https://drive.google.com/drive/folders/1zqk5-rYAqBqw6W71-QGfPpiTl5ldUOGs", "_blank")}
            className="text-blue-600 hover:text-blue-700"
          >
            Open Google Drive
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-gray-200 bg-white">
          <div className="p-4 space-y-2">
            {/* New Folder Button */}
            <Button
              onClick={() => setIsCreatingFolder(true)}
              className="w-full justify-start gap-3 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              <FolderPlus className="w-5 h-5" />
              New Folder
            </Button>

            {/* Upload File Button */}
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="w-full justify-start gap-3 bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
            >
              <Upload className="w-5 h-5" />
              Upload Files
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              accept="*/*"
            />
          </div>

          {/* Navigation */}
          <nav className="px-4 pb-4">
            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-gray-700 hover:bg-gray-100"
                onClick={() => navigateToBreadcrumb(0)}
              >
                <Home className="w-5 h-5" />
                My Drive
              </Button>
            </div>
          </nav>

          {/* New Folder Input */}
          {isCreatingFolder && (
            <div className="px-4 pb-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-gray-600" />
                  <Input
                    type="text"
                    placeholder="Folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCreateFolder()
                      }
                      if (e.key === "Escape") {
                        setIsCreatingFolder(false)
                        setNewFolderName("")
                      }
                    }}
                    className="flex-1"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                    Create
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsCreatingFolder(false)
                      setNewFolderName("")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-1">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.id} className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateToBreadcrumb(index)}
                    className="text-gray-700 hover:bg-gray-100"
                  >
                    {crumb.name}
                  </Button>
                  {index < breadcrumbs.length - 1 && <span className="text-gray-400">/</span>}
                </div>
              ))}
            </div>

            {/* View Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("grid")}
                className={viewMode === "grid" ? "bg-gray-100" : ""}
              >
                <Grid3x3 className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("list")}
                className={viewMode === "list" ? "bg-gray-100" : ""}
              >
                <List className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* File Content */}
          <div className="flex-1 overflow-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Folder className="w-16 h-16 mb-4 text-gray-300" />
                <p className="text-lg font-medium">This folder is empty</p>
                <p className="text-sm">Upload files or create folders to get started</p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {filteredFiles.map((file) => (
                  <Card
                    key={file.id}
                    className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedFiles.has(file.id) ? "ring-2 ring-blue-500 bg-blue-50" : ""
                    }`}
                    onClick={() => {
                      if (file.isFolder) {
                        navigateToFolder(file.id, file.name)
                      } else {
                        // Open file in new tab using webViewLink
                        if (file.webViewLink) {
                          window.open(file.webViewLink, "_blank")
                        }
                      }
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex flex-col items-center text-center">
                        <div className="mb-2">{getFileIcon(file)}</div>
                        <p className="text-sm font-medium text-gray-900 truncate w-full" title={file.name}>
                          {file.name}
                        </p>
                        {!file.isFolder && <p className="text-xs text-gray-500 mt-1">{formatFileSize(file.size)}</p>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {/* List Header */}
                <div className="flex items-center px-4 py-2 text-sm font-medium text-gray-500 border-b border-gray-200">
                  <div className="flex-1">Name</div>
                  <div className="w-24 text-right">Size</div>
                  <div className="w-32 text-right">Modified</div>
                  <div className="w-12"></div>
                </div>

                {/* List Items */}
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center px-4 py-2 hover:bg-gray-50 rounded cursor-pointer ${
                      selectedFiles.has(file.id) ? "bg-blue-50" : ""
                    }`}
                    onClick={() => {
                      if (file.isFolder) {
                        navigateToFolder(file.id, file.name)
                      } else {
                        // Open file in new tab using webViewLink
                        if (file.webViewLink) {
                          window.open(file.webViewLink, "_blank")
                        }
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getFileIcon(file)}
                      <span className="text-sm text-gray-900 truncate">{file.name}</span>
                    </div>
                    <div className="w-24 text-right text-sm text-gray-500">
                      {file.isFolder ? "" : formatFileSize(file.size)}
                    </div>
                    <div className="w-32 text-right text-sm text-gray-500">{formatDate(file.modifiedTime)}</div>
                    <div className="w-12 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Show context menu
                        }}
                      >
                        {/* <MoreVertical className="w-4 h-4" /> */}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-700">Uploading files...</span>
          </div>
        </div>
      )}
    </div>
  )
}
