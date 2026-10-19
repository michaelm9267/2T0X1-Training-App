# Regulation source verification

Verified/retrieved: 18 October 2026. Catalog: 119 paragraph/issued-letter records plus 2814 DTEB code definitions and the existing AFMAN Table A4.1 variants. All quoted strings are text, never interpreted as instructions or HTML.

## Method

DTR PDFs were downloaded from their official USTRANSCOM URLs and extracted with macOS PDFKit. Numbered paragraph boundaries, physical pages, printed identifiers, exceptions and notes were checked against the source text. Only PDF layout whitespace and repeated page furniture are normalized. Individual tabular AFMAN entries preserve the source cell values; popup headings identify the UN number and exact shipping-name variant. A missing packing group in the source is not invented.

AFMAN official download returned 403. The complete 555-page government-authored publication was retrieved from the mirror already recorded by the app's source catalog. Its SHA256 exactly matches that prior catalog: `c7584a206d55da8455de5e7132b1443d06df2786d5cfee2537bfdea65e653b8b`. The supplied 160-page excerpt and three issued ATTLA PDFs are bundled unchanged. Their physical pages refer to those exact local copies, not guessed offsets into a different full manual. The full AFMAN copy is also bundled unchanged for reliable source access.

DAFI 24-602V2 was obtained from the official U.S. Government Publishing Office archive, with edition shown explicitly in each popup. This is verified archived source wording, not certification that no subsequent Air Force guidance exists. Blocked/unavailable sources are listed in the coverage audit and do not receive invented passage text.

DTEB tables were rebuilt to a temporary file with `scripts/build_dtr_reference.py`; every row in all thirteen existing tables matched the freshly retrieved official table exactly. Code links include a text fragment for the definition; browsers without text-fragment support still open the exact named table and the popup identifies its code.

## Publication manifest

| Publication | Verified edition | SHA256 | New-tab destination |
| --- | --- | --- | --- |
| DTR Part III · Joint inspection | 3 February 2023 | `f25c77329cd22953430e37abb291ad301bdddf0af31088be33e003ca737dc58c` | https://www.business.ustranscom.mil/dtr/part-iii/dtr_part_iii_app_o.pdf |
| DTR Part III · Center of balance | June 2016 | `4c939dd5e72b789d062ee44e72b675b7f19202c8d0f53f42eb7d9cdd52c86d1a` | https://www.business.ustranscom.mil/dtr/part-iii/dtr_part_iii_app_p.pdf |
| DTR Part III · Aircraft load planning | 12 June 2025 | `99cabd1c6167e7936b94f0353dbc970e4925f2f37daba186a844471787cb10d0` | https://www.business.ustranscom.mil/dtr/part-iii/dtr_part_iii_app_v.pdf |
| DTR Part III · Marshalling area | June 2016 | `16ab321645b21c1011f80dd9813ba34cf95c9e923411c936f98e4764b1227dba` | https://www.business.ustranscom.mil/dtr/part-iii/dtr_part_iii_app_q.pdf |
| DTR Part II · Cargo routing | 25 September 2026 | `9a15a8ba09ff9d9bbd32e92bacb638c74e63b1139a7a0d36d15f622f9b5a11bf` | https://www.business.ustranscom.mil/dtr/part-ii/dtr_part_ii_202.pdf |
| DTR Part II · Shipper requirements | 1 September 2026 | `723afe6ba70652a03fff057d644ce65d7df3c2e6869d50832082b2737f96d089` | https://www.business.ustranscom.mil/dtr/part-ii/dtr_part_ii_203.pdf |
| DTR Part II · Packaging and handling | 1 September 2026 | `bb114e57d104c73ab48cfc2b33d3aab6635cad52d9d1c53145cf7ad27708bca6` | https://www.business.ustranscom.mil/dtr/part-ii/dtr_part_ii_208.pdf |
| DTR Part II · Transportation control number | 2 June 2026 | `76393715362768dcf6580862d5b67e49e50f4820fb67b4acccc1e9fcc9bc70cd` | https://www.business.ustranscom.mil/dtr/part-ii/dtr_part_ii_app_l.pdf |
| DTR Part II · Transportation control and movement document | 22 May 2026 | `705ef16105cbcd5b3cd190ab1818e582cd26d810bb1a0eb2261d29e4fbc900e0` | https://www.business.ustranscom.mil/dtr/part-ii/dtr_part_ii_app_m.pdf |
| DTR Part II · Transportation account codes | 10 December 2025 | `c6f05bdaef3925c15b5dbe3852fb2bc256193ac0d2078b3ad61857b4abb8e102` | https://www.business.ustranscom.mil/dtr/part-ii/dtr_part_ii_app_v.pdf |
| DTR Part II · Bills of lading | 9 September 2026 | `907a67e11b8e1d70c91a8a3b960349adf476b33bef24186fae17e8d106bc33aa` | https://www.business.ustranscom.mil/dtr/part-ii/dtr_part_ii_206.pdf |
| AFMAN 24-604 · supplied excerpt | 6 June 2025 | `d9826880da3891d417048946e44e67d8bdc3bb2a17aada0502daf480098b7d94` | asset:references/afman24-604-2025-excerpt.pdf |
| ATTLA · FMTV A1P2 | Issued letter supplied with training app | `e85a91e16b12b35e6ea7cb909e66e375698c681b7572823351cfba8897af595c` | asset:references/attla-fmtv.pdf |
| ATTLA · ISU container | Issued letter supplied with training app | `5d61f22a4a9c1dd6ad7e9a20c1864548e00f75d9743b3ae0f6387ba45f9b9ec3` | asset:references/attla-isu.pdf |
| ATTLA · HMMWV | Issued letter supplied with training app | `2d23a41279dcc8e523dd0ad2c4e25a7cb8e6dc4a6b1d85bee9623cd202acbf34` | asset:references/attla-hmmwv.pdf |
| AFMAN 24-604 | 6 June 2025 | `c7584a206d55da8455de5e7132b1443d06df2786d5cfee2537bfdea65e653b8b` | asset:references/afman24-604-2025.pdf |
| DAFI 24-602V2 | 20 December 2023 · GPO archived edition | `7e98ced32d3d314b7a304ef4d455f81d1d0c74259d2768b836c4c833113c0fde` | https://www.govinfo.gov/content/pkg/GOVPUB-D301-PURL-gpo248784/pdf/GOVPUB-D301-PURL-gpo248784.pdf |

## DTEB row comparison

| Table | Rows | Result |
| --- | --- | --- |
| V_RTE_INSTR_NT | 140 | Equal to fresh official download |
| V_TRAN_EQU_TY | 190 | Equal to fresh official download |
| V_D_FRGHT_LDNG_BL_SRVC_AGNCY_CD | 11 | Equal to fresh official download |
| V_D_FRGHT_LDNG_BL4_CD | 13 | Equal to fresh official download |
| V_LDNG_BL_SPCL_SRV | 168 | Equal to fresh official download |
| V_MSR_UN | 80 | Equal to fresh official download |
| V_GBLOC_DOM | 923 | Equal to fresh official download |
| V_D_AR_MNFST_RFRNC_CD | 576 | Equal to fresh official download |
| V_D_DMSTC_RTE_ORDR_MIL_SVC_CD | 11 | Equal to fresh official download |
| V_TRAN_MD | 35 | Equal to fresh official download |
| V_D_CGO_LD_UNT_TY | 23 | Equal to fresh official download |
| V_TYPE_PACK | 118 | Equal to fresh official download |
| V_SHPMNT_UNT_SPL_HNDL_CD_DOM | 526 | Equal to fresh official download |
| V_D_PTUNT_MODU_TY_CD | 25 | Added 18 October 2026 for CMOS Pallets (Pallet Type: B = 61"-84", L = 85"-96", M = 97" & up) |
| V_D_PLTZD_TRNSPRTN2_CD | 15 | Added 18 October 2026 for CMOS Pallets (Config Code: PC = Palletized Cargo) |

## Full quotation check (18 October 2026)

`scripts/verify_regulation_quotes.py` re-checks every record in `passages.json` against its publication: it downloads the official PDF (or uses the bundled copy for `asset:` URLs), removes repeated running headers and footers, and confirms the quotation appears on its cited physical PDF page and the pages after it, ignoring only PDF spacing and punctuation spacing. Result after the fixes below: **119 of 119 quotations verified**, 0 mismatched, 0 unreadable. Run it again whenever a publication is replaced: `python3 -I scripts/verify_regulation_quotes.py`.

Problems the check found and fixed:

| Record | Problem | Fix |
| --- | --- | --- |
| `dafi602.Table2.1` | The quotation was about 70,000 characters of the table of contents ("2.5. Selecting Mode and Method. …… 27 …"), not Table 2.1 | Replaced with Table 2.1 from physical page 26, transcribed row by row |
| `dafi602.2.4` | Table 2.1 cells were interleaved into running text ("1 day or < DD Form 1348- 1A PD 04-15 …") | Paragraph 2.4 keeps its own text; the embedded table is transcribed row by row |
| `dtr2.203.Table203-3` | Cells interleaved, and the quotation stopped after TP 2; TP 3, TP 4 and the table note (PDF page 73) were missing | Full table, row by row, PDF pages 72–73 |
| `dtr2.208.E`, `dtr2.appL.A` | Paragraph numbers bunched ahead of the text ("E. MARKING AND LABELING 1. 2. 3. 4. Marking and …") | Rebuilt from the source with each number at its paragraph |
| `dtr2.appM.A` | Ran into paragraph B, lost its numbering, and ended mid-sentence with "2. 3. 4. b. 5. II-M-1" | Trimmed to paragraph A, ending "… and clicking on Reference Data." |
| `attla.fmtv.table2`, `attla.hmmwv.weights` | Tables flattened into one line (two HMMWV models per row) | One model per line; HMMWV footnote numbers shown as [1]–[4]; every number unchanged |

Table quotations carry a `layoutNote` that is recorded with the record: their cells are transcribed row by row, merged cells are repeated on each row they span, and the `|` separators and line breaks are added for reading. The verifier checks those records word for word without regard to order. `catalog.test.js` now fails on table-of-contents leaders or bunched paragraph numbers in any quotation, on an unresolved claim ID, or on a PDF record with no physical page.

## Representative checks

- DTR III O K.2.e(6): physical page 8, printed III-O-8, including the keys/combination note and removal from chalk.
- DTR III P C.1/C.2/C.3: physical page 2, printed III-P-2, including rounding and the AGE marking exception.
- DTR III O K.1.c includes the sight-sensitive cargo exception; K.2.f(4) retains movement/equipment/ramp fuel conditions.
- DTR II 202 M.1 spans physical pages 8–9, retaining the CONUS, Alaska/Hawaii/Puerto Rico, and AMC-delivery conditions.
- DTR II 203 B.2 spans physical pages 1–2, including clear-text addressing and the sponsoring-Service-code fallback.
- AFMAN P5: supplied excerpt physical page 133, printed 232. Full manual physical/printed page 232.
- AFMAN UN3166 gas and liquid variants remain distinct catalog IDs; both source entries occur on full-manual page 228.
- AFMAN A7.11.2 on page 328 includes the residual-fuel rule and all subordinate exceptions, rather than presenting 500 ml as a universal limit for every vehicle.
- DAFI 24-602V2 2.2.1.3 on page 23 retains the exception allowing a missing TAC to be entered on the document.
- DAFI 24-602V2 A3.1.19 and 2.2.2 distinguish the requester's signature from the in-checker's block 18 acceptance.

Official PDF URLs can later serve a new edition; update quotations and physical page mappings together during future regulatory reviews. Source fingerprints identify the exact copies used for this implementation. No runtime network request is needed to read a popup.
