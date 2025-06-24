import { type NextRequest, NextResponse } from "next/server"
import { BlobServiceClient } from "@azure/storage-blob"
import JSZip from "jszip"

export async function POST(request: NextRequest) {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
    const containerName = process.env.AZURE_CONTAINER_NAME || "uploads"

    if (!connectionString) {
      return NextResponse.json(
        {
          error: "AZURE_STORAGE_CONNECTION_STRING environment variable is not set",
        },
        { status: 500 },
      )
    }

    const { fileNames, folderName, singleFile } = await request.json()

    if (!fileNames || !Array.isArray(fileNames) || fileNames.length === 0) {
      return NextResponse.json({ error: "File names are required" }, { status: 400 })
    }

    // Create blob service client
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
    const containerClient = blobServiceClient.getContainerClient(containerName)

    if (singleFile && fileNames.length === 1) {
      // Single file download - return the file directly
      try {
        const blobClient = containerClient.getBlobClient(fileNames[0])
        const downloadResponse = await blobClient.download()

        if (downloadResponse.readableStreamBody) {
          // Convert stream to buffer using Node.js stream utilities
          const stream = downloadResponse.readableStreamBody
          const chunks: Buffer[] = []
          for await (const chunk of stream) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
          }
          const buffer = Buffer.concat(chunks)
          const fileName = fileNames[0].split("/").pop() || "download"

          // Get content type from blob properties
          const properties = await blobClient.getProperties()
          const contentType = properties.contentType || "application/octet-stream"

          return new NextResponse(buffer, {
            headers: {
              "Content-Type": contentType,
              "Content-Disposition": `attachment; filename="${fileName}"`,
            },
          })
        }
      } catch (error) {
        console.error(`Failed to download ${fileNames[0]}:`, error)
        return NextResponse.json({ error: "Failed to download file" }, { status: 500 })
      }
    } else {
      // Multiple files - create ZIP archive
      const zip = new JSZip()

      // Download each file and add to ZIP
      for (const fileName of fileNames) {
        try {
          const blobClient = containerClient.getBlobClient(fileName)
          const downloadResponse = await blobClient.download()

          if (downloadResponse.readableStreamBody) {
            // Convert stream to buffer using Node.js stream utilities
            const stream = downloadResponse.readableStreamBody
            const chunks: Buffer[] = []
            for await (const chunk of stream) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
            }
            const buffer = Buffer.concat(chunks)
            const fileNameOnly = fileName.split("/").pop() || fileName
            zip.file(fileNameOnly, buffer)
          }
        } catch (error) {
          console.error(`Failed to download ${fileName}:`, error)
          // Optionally, you can skip this file or return an error
          return NextResponse.json({ error: `Failed to download file: ${fileName}` }, { status: 500 })
        }
      }

      // Generate ZIP buffer
      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" })

      // Return ZIP file
      return new NextResponse(zipBuffer, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${folderName || "files"}.zip"`,
        },
      })
    }
  } catch (error) {
    console.error("Download error:", error)
    return NextResponse.json({ error: "Failed to process download" }, { status: 500 })
  }
}
