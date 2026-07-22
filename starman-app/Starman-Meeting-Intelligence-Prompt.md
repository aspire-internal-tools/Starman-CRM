You are working inside Starman CRM.

Build a rough but working prototype for a Meeting Intelligence / Transcript Filing feature.

Act as a senior SaaS coding architect, CRM systems designer, and visual product designer.

Important:
- Inspect the existing Starman project before coding.
- Do not assume the architecture.
- Keep the UI clean, organized, professional, and visually consistent with Starman.
- Avoid clutter, repeated wording, unnecessary descriptors, and admin-dump screens.
- Do not break existing client, document, task, dashboard, pipeline, or CRM functionality.

Goal:
Automatically ingest meeting transcripts, voice-note transcripts, or advisor notes; identify the correct client; classify the document type; extract the meeting date; summarize key information; and store the file under the correct client profile.

Naming format:
Last, First - Document Type - Jun 16 2026

Example:
Smith, John - Teams Meeting Transcript - Jun 16 2026

Before coding, inspect and identify:
- client/person models
- household model if applicable
- document upload/storage system
- compliance/task/pipeline models
- AI/intelligence utilities
- database schema
- API routes
- frontend patterns
- permissions/access control
- audit logging if present
- design/theme/component system

Core feature:
Create a transcript ingestion system that scans:
/transcripts/incoming

After processing:
- successful files move to /transcripts/processed
- failed or ambiguous files move to /transcripts/review-needed

Supported inputs:
- .txt
- .docx
- .vtt
- .pdf if already supported
- pasted transcript/advisor note text
- future-ready for iPhone voice memo transcription output

Client matching:
Match transcripts to Starman client records using:
- full name
- first + last name
- email
- phone
- household members
- speaker labels
- meeting attendees
- aliases
- CRM profile data

Confidence rules:
- 90%+ = auto-file under client
- 60–89% = suggested match, manual review required
- below 60% = review-needed
- ambiguous similar names always go to review

Document type detection:
Default:
Teams Meeting Transcript

Also detect:
- Discovery Meeting
- KYC Meeting
- Annual Review
- Insurance Review
- Investment Review
- Follow-Up Meeting
- Planning Meeting
- Client Notes

Date extraction:
Extract from:
- transcript metadata
- transcript header
- filename
- file creation date
- meeting text

Visible date format must be exactly:
Jun 16 2026

If no date is found:
use file created date and set:
date_source = "file_created_at"

Storage:
Save under the correct client document area using:
Last, First - Document Type - Jun 16 2026

Rules:
- last name first
- first name second
- title case names
- clean illegal filename characters
- never overwrite existing files
- duplicates append “- 2”, “- 3”, etc.

Metadata:
For every processed transcript save:
- client_id
- household_id if applicable
- client_name
- original_filename
- stored_filename
- document_type
- meeting_date
- date_source
- confidence_score
- matched_fields
- processing_status
- created_at
- processed_at
- transcript_summary
- key_action_items
- client_concerns
- products_or_accounts_mentioned
- advisor_review_questions

Summary:
Generate an internal summary with:
- meeting purpose
- key topics
- client concerns
- follow-up tasks
- deadlines
- products/accounts mentioned
- compliance items
- planning opportunities
- questions needing advisor review

Starman integration:
Surface transcript-derived intelligence in:
- client profile timeline
- recent activity
- tasks
- compliance flags
- upcoming reviews
- intelligence/ask interface if available

If transcript creates follow-up tasks, create draft tasks for advisor review rather than silently adding final tasks unless existing app patterns already support that.

Manual review queue:
Create a UI/page/component consistent with Starman design.

Queue should show:
- original filename
- extracted names
- extracted emails
- extracted date
- suggested client matches
- confidence scores
- preview of first 500 characters
- assign-to-client action
- reject/archive action

Once manually assigned, store using the same naming format.

Privacy/compliance:
- do not send transcript content to third-party APIs unless the project already has approved AI configuration
- prefer local parsing
- redact sensitive data in logs
- keep originals archived
- create audit log for every match, rejection, and manual decision
- respect existing role-based permissions
- do not delete original files unless safely archived

Create or update:
- transcript ingestion service
- transcript parser
- client matching service
- document type classifier
- meeting date extractor
- document naming utility
- transcript storage service
- summary/action item extractor
- audit log service
- review queue model/table if needed
- API routes if needed
- frontend review queue if frontend exists
- tests

Tests:
- clear name match
- email match
- phone match
- household match
- ambiguous John Smith match goes to review
- date formatting as Jun 16 2026
- duplicate filename handling
- review routing
- audit log creation
- successful document storage
- manual review assignment

Acceptance criteria:
- John Smith transcript saves as:
  Smith, John - Teams Meeting Transcript - Jun 16 2026
- email match auto-assigns correctly
- ambiguous same-name clients go to review
- dates always format like Jun 16 2026
- files are never overwritten
- summary and action items are created
- audit log is created
- manual review can assign transcript to client
- existing Starman CRM functionality is not broken

Final response must include:
- files changed
- commands to run
- tests added
- assumptions made
- how to open the review queue
