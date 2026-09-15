# Vocabulary

The words this app uses, and the ones it deliberately does not. Full glossary
lives in alexandria; this is the works half.

## Works

**Work**:
Anything a Note or Quote can attach to — a Book, a lecture, an article, a
film. The core entity; carries a `kind` that says which.
_Avoid_: item, resource, title

**Book**:
A Work whose kind is `book`. Not a separate entity — the only fully-modelled
kind so far, and a strict subset of Work.
_Avoid_: volume, publication

**Creator**:
The person a Work is attributed to. One Creator has many Works. The Book
facade still calls this field `author`.
_Avoid_: author, writer

**Document**:
A concrete file a Work exists as: a PDF, a scan, one particular translation.
Pagination belongs here, not to the Work — "page 47" means nothing until you
know which edition.
_Avoid_: file, edition, copy, upload

**Transcription**:
One extraction run over one Document, by one model at one prompt version. A
Document may have several; they are compared, not merged.
_Avoid_: OCR, parse, text dump

**Page**:
One page of one Transcription: its text, and the key of its rendered image.
The image is what a citation shows — a picture of the actual document.
_Avoid_: sheet, leaf, scan

## The boundary

**Works** is the record of what exists in the world: true regardless of who is
reading it, readable by anyone signed in, writable by admin only. This is
scribe's half.

**Writing** — thoughts, notes, quotes, essays — is what a person has set down
themselves. Private to whoever wrote it. It points at Works; Works never
points back. That is stylus's half, and scribe should not grow an opinion
about it.
