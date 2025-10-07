# Document Upload System Documentation

The PALM platform includes a document upload and library system that allows users to upload documents and use them as context in AI conversations. Documents are stored in cloud storage providers and embedded using AI models for semantic search and retrieval.

## Overview

The document upload system provides:

- **Secure Document Processing**: Documents are temporarily uploaded to AWS S3 for processing, then automatically deleted after embeddings are generated
- **AI-Powered Embeddings**: Generate vector embeddings using AWS Bedrock AI models, stored in the database
- **Document Library Management**: Organize and manage your document embeddings through the UI
- **Contextual AI Conversations**: Chat with your documents using AI to extract insights and information

## Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Frontend UI   │───▶│  Document    │───▶│  S3 Storage     │
│  /profile       │    │  Upload      │    │  (Temporary)    │
│  /document-lib  │    │  Provider    │    └─────────────────┘
└─────────────────┘    └──────────────┘             │
                              │                     │
                              ▼                     ▼
                       ┌──────────────┐    ┌─────────────────┐
                       │  AI Provider │───▶│  Embeddings     │
                       │  (Bedrock)   │    │  Generated      │
                       └──────────────┘    └─────────────────┘
                                                    │
                                                    ▼
                       ┌──────────────┐    ┌─────────────────┐
                       │  S3 File     │    │  Embeddings     │
                       │  Deleted     │◀───│  Stored in DB   │
                       └──────────────┘    └─────────────────┘
```

## Security Model

For security reasons, PALM does not permanently store document files. The workflow is:

1. **Upload**: Document is temporarily uploaded to S3
2. **Process**: AI embeddings are generated from the document content
3. **Store**: Embeddings are stored in the PALM database
4. **Delete**: Original document file is automatically deleted from S3

This ensures that sensitive document content is not retained in cloud storage, while the semantic embeddings remain available for AI conversations.

## Current Providers

Currently, PALM supports document upload through:

- **AWS S3**: Primary document storage provider

## Setup Requirements

To enable document upload functionality, you need to configure:

1. **AWS S3 Bucket**: For document storage
2. **AWS Bedrock AI Provider**: For generating document embeddings
3. **CORS Configuration**: For browser-based uploads
4. **User Group Permissions**: Enable AI provider access for users
5. **System Configuration**: Set default document upload provider

## Quick Start

For detailed setup instructions, see:

- [AWS Setup Guide](./aws-setup/README.md) - Complete AWS S3 and Bedrock configuration

## Usage

Once configured, users can:

1. Navigate to **Profile** → **Document Library**
2. Upload documents (PDF, TXT, DOC, etc.)
3. Documents are automatically processed, embedded, and then securely deleted from S3
4. Reference document embeddings in AI conversations to ask questions and extract insights

## System Configuration

### Setting the Default Document Upload Provider

Admins must configure the default document upload provider:

1. Navigate to **Settings** → **System Configurations**
2. Find the **Document Library** section
3. Select the upload provider (currently AWS S3)
4. Save configuration

**Location**: `features/settings/components/system-configurations/tables/DocumentLibraryDocumentUploadProviderSelectionTable.tsx`

### Document Library UI

Users access the document library through:

**Location**: `features/profile/components/document-library`

## Technical Details

### AI Provider Requirements

The embeddings feature requires an AWS Bedrock AI provider to be:

1. **Configured**: Set up through Settings → AI Providers
2. **Enabled**: Associated with the user's user group
3. **Accessible**: User must have permission to use the provider

**Provider Implementation**: `features/ai-provider/sources/bedrock.ts`

### Supported Document Types

- PDF (`.pdf`)
- Text files (`.txt`, `.md`, `.html`)
- Microsoft Word (`.doc`, `.docx`)
- Microsoft Excel (`.xlsx`)
- CSV (`.csv`)

## Troubleshooting

### Common Issues

**Upload fails with CORS error:**
- Check S3 bucket CORS configuration
- Verify localhost (development) or production URL is allowed

**Embeddings not generating:**
- Verify Bedrock AI provider is configured
- Check user has access to the AI provider
- Ensure embedding model is available in your AWS region

**Documents not appearing:**
- Check S3 bucket permissions
- Verify upload provider is set in system configuration
- Check browser console for errors

## Security Considerations

- **Automatic File Deletion**: Original documents are automatically deleted from S3 after embedding generation
- **No Permanent Storage**: Document files are not retained; only embeddings are stored in the database
- **S3 Bucket Policies**: Configure appropriate access policies for temporary storage
- **CORS Restrictions**: Ensure CORS is configured restrictively (specific origins only)
- **Access Logs**: Monitor S3 access logs for security auditing
