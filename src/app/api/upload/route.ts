import { type NextRequest, NextResponse } from "next/server"
import { uploadFile } from "@/lib/google-drive"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const parentId = formData.get("parentId") as string

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 })
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Determine content type
    let contentType = file.type
    if (!contentType || contentType === "application/octet-stream") {
      const fileExtension = file.name.toLowerCase().split(".").pop()
      const contentTypeMap: { [key: string]: string } = {
        heic: "image/heic",
        heif: "image/heif",
        mov: "video/quicktime",
        m4v: "video/x-m4v",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        mp4: "video/mp4",
        pdf: "application/pdf",
        txt: "text/plain",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }
      contentType = contentTypeMap[fileExtension || ""] || "application/octet-stream"
    }

    // Upload file
    const uploadedFile = await uploadFile(file.name, buffer, contentType, parentId)

    return NextResponse.json({
      message: "File uploaded successfully",
      file: {
        id: uploadedFile.id,
        name: uploadedFile.name,
        size: uploadedFile.size,
        mimeType: uploadedFile.mimeType,
        createdTime: uploadedFile.createdTime,
        modifiedTime: uploadedFile.modifiedTime,
        webViewLink: uploadedFile.webViewLink,
      },
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }
}
