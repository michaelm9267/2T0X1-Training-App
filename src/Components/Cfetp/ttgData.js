// CFETP 2T0X1, Attachment 5 (pages 69-70): the 33 Task Training Guides, numbered and grouped as
// listed. The CFETP lists TTG titles only; it does not say which STS tasks each one covers.
//
// A TTG whose document has been transcribed (see ./ttgs) is verified: its lessons say which STS
// tasks it trains. All 33 are transcribed. A TTG listed here without content would need a
// SUGGESTED `tasks` list, which the UI marks unverified. To add or replace a TTG, transcribe it
// into ./ttgs and register it in `ttgContent` below.

import { passengerTtgs } from './ttgs/passenger';
import { personalPropertyTtgs } from './ttgs/personalProperty';
import { packagingTtgs } from './ttgs/packaging';
import { outboundTtgs } from './ttgs/outbound';
import { inboundTtgs } from './ttgs/inbound';
import { specialHandlingTtgs } from './ttgs/specialHandling';
import { receiptTtgs } from './ttgs/receipt';

export const ttgContent = { ...passengerTtgs, ...personalPropertyTtgs, ...packagingTtgs, ...outboundTtgs, ...inboundTtgs, ...specialHandlingTtgs, ...receiptTtgs };

export const TTG_PORTAL = 'https://usaf.dps.mil/sites/Traffic-Management';
// When the transcriptions in ./ttgs were last reviewed against the TTG files. The TTGs carry no
// edition date of their own.
export const TTG_REVIEWED = '2 November 2026';

export const ttgGroups = [
  { title: 'Passenger Operations', sub: '4.1', ttgs: [
    { n: 1, title: 'Utilize and Interpret Appropriate Publications' },
    { n: 2, title: 'Coordinating Travel Arrangements' },
    { n: 3, title: 'Billing Reconciliation' },
    { n: 4, title: 'Quality Assurance Evaluator' },
  ] },
  { title: 'Personal Property', sub: '4.2', ttgs: [
    { n: 5, title: 'Shipment Application Process' },
    { n: 6, title: 'Communicating Personal Property Entitlements' },
    { n: 7, title: 'Personally Procured Moves' },
    { n: 8, title: 'Personal Property Rebuttals and BCMR Requests' },
    { n: 9, title: 'Quality Assurance Operations' },
    { n: 10, title: 'Personal Property Management' },
  ] },
  { title: 'Packaging Operations', sub: '5.1', ttgs: [
    { n: 11, title: 'In-checking' },
    { n: 12, title: 'Packaging' },
    { n: 13, title: 'Obtain Dimension and Weight / Calculate Center of Balance for Rolling Stock' },
    { n: 14, title: 'Forklift' },
    { n: 15, title: 'Reusable Container Program' },
    { n: 16, title: 'Lock Out Tag Out Program / Decipher SPIs / Operate Saws' },
    { n: 17, title: 'Wood Packaging Material Program' },
    { n: 18, title: 'CCO Program' },
  ] },
  { title: 'Outbound Operations', sub: '5.2', ttgs: [
    { n: 19, title: 'Shipment Planning' },
    { n: 20, title: 'Cargo Security' },
    { n: 21, title: 'Outbound Cargo Accountability Actions' },
    { n: 22, title: 'Track and Trace' },
    { n: 23, title: 'Financial Reconciliation' },
    { n: 24, title: 'Supervisory Responsibilities' },
  ] },
  { title: 'Inbound Operations', sub: '5.3', ttgs: [
    { n: 25, title: 'In-checking Process' },
    { n: 26, title: 'Discrepancy Reporting and Tracing Procedures' },
    { n: 27, title: 'Receipt and Inbound Cargo Supervision' },
  ] },
  { title: 'Special Handling', sub: '5.4', ttgs: [
    { n: 28, title: 'Special Handling (Basic)' },
    { n: 29, title: 'Special Handling (Intermediate)' },
    { n: 30, title: 'Special Handling (Advanced/Expert)' },
  ] },
  { title: 'Receipt Operations', sub: '5.5', ttgs: [
    { n: 31, title: 'Receipt Operations (Basic)' },
    { n: 32, title: 'Receipt Operations (Intermediate)' },
    { n: 33, title: 'Receipt Operations (Advanced/Expert)' },
  ] },
];
