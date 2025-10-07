# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

## PALM v1.2.0 - 2025-10-07

### Added

- Chat - Incorporate Personal Document Library
- Allow Users to Follow up by Selecting Text
- Chat - DB - Add updatedAt column to ChatMessage table
- Chat - Follow up questions - update visibility logic of follow-ups to match Perplexity
- Chat - deep research - add deepResearch column to chatMessage table
- Chat - deep research - incorporate deepResearch column into types and supporting code
- Document Library - Update permissions to require access to a Bedrock provider w/ model
- Add UI indicator for deep research assistant messages
- Chat - Add Deep Research Functionality
- Chat - deep research - add user group access check for deep research button
- Chat - deep research - hide research button if selected chat model does not support deep research
- Chat - retry message - disable message input and direct user to 'retry' button w/ tooltip
- App-wide - Improve loading icon
- Chat - document upload - add file selection input
- Chat - document upload - Incorporate input into add-message and retry-message routes
- Chat - deep research - allow user to stop in progress deep research job
- App wide - add "Are you still there" modal for 15 minute activity logout
- Chat - update context so LLM is aware of 'knowledge base' and 'document library' concepts
- Chat - document upload - add embedding number validation check
- Chat - deep research - loading icon UI/UX (color, transitions)
- Chat - system prompt - update instructions to use mermaid (.mmd) as underlying engine for diagrams and graphs
- Chat - deep research - regenerate deep research message
- Chat - fix race condition in chat summary generation
- App Wide - PII modal check (email addresses)

### Changed

- Replace OpenAI with Bedrock for document upload embeddings
- Chat - deep research - refactoring
- AI Providers - update model inputs
- CERTA - switch from OpenAI to Bedrock for embeddings
- Profile - Document Upload - implement parallel file processing

### Fixed

- Add AI Provider modal - update test to fix palm repo sync
- Chat - model select - show placeholder when model has been deleted instead of empty input

## PALM v1.1.2 - 2025-09-02

### Added

- Automatically open new chat artifacts
- Syntax highlighting for chat artifacts
- Allow retry action on any LLM response in chat
- System message editing at any point in chat conversation
- Edit previous chat message functionality
- Added follow-up chat message generation feature
- Reduced minuscule chat artifacts through updated prompt instructions
- Breadcrumbs for nested pages in settings
- Breadcrumbs for prompt detail pages
- Add lastLoginAt column to User Group Members table
- Updated User Group links without anchor tags

### Changed

- Migration from OpenAI to Bedrock for document embeddings

### Fixed

- AI Agents: Agent detail page AppHead now incorporates agent name
- Chat: Fixed issue where users could continue conversation with unavailable model
- Chat: Fixed popup overlay issue that occurs when citations are visible

## PALM v1.1.1 - 2025-08-12

### Changed

- Hide document library checkbox in chat if there are no providers set in system config

### Security

- Address critical vulnerability from `form-data`
- Address high vulnerabilities from `xlsx`

## PALM v1.1.0 - 2025-08-12

### Added

- Add RADAR to codebase
- AI Agent Management
- Profile - "Personal Document Library" tab (upload and manage documents)
- Settings - "Document Upload Providers" (manage document upload providers)
- Modify `KnowledgeBase` DB table to exclude PDL metadata
- Add Document Upload Provider backend and worker/queue
