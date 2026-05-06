import { customAlphabet } from "nanoid";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const userIdGen = customAlphabet(ALPHABET, 16);
const diaryIdGen = customAlphabet(ALPHABET, 16);
const entryIdGen = customAlphabet(ALPHABET, 16);
const drawingIdGen = customAlphabet(ALPHABET, 16);
const attachmentIdGen = customAlphabet(ALPHABET, 16);

export const newUserId = () => `usr_${userIdGen()}`;
export const newDiaryId = () => `dry_${diaryIdGen()}`;
export const newEntryId = () => `ent_${entryIdGen()}`;
export const newDrawingId = () => `drw_${drawingIdGen()}`;
export const newAttachmentId = () => `att_${attachmentIdGen()}`;

export const nowIso = () => new Date().toISOString();
