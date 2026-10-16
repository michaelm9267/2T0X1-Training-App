# DG2 reference data

DG2 uses **AFMAN 24-604, 6 June 2025**, Table A4.1 (PDF pages 104–231), Table A4.2 passenger eligibility P codes (page 232), and emergency contacts in A17.2.9 (page 448).

- Publisher: https://static.e-publishing.af.mil/production/1/af_a4/publication/afman24-604/afman24-604.pdf
- PDF download used: https://www.jgatraining.com/vs-uploads/pdfs/1768239197_2_-AFMAN-24-604-Effective-06_06_25.pdf
- The publisher returned HTTP 403 for a direct download. The mirrored government PDF has the same publication title and date; key entries and emergency contacts were cross-checked against indexed publisher pages.
- PDF SHA-256 and source metadata are stored in `src/Components/Cmos/afmanDg2Catalog.json`.

The catalog preserves separate classification, packing-group, and shipping-name variants. A UN number alone fills the form only when all selectable entries agree. Forbidden entries are displayed but cannot be selected. Cross-reference-only entries and records lacking a usable classification or packing instruction require manual reference review and are not offered for autofill. Shipment quantities, package counts, weights, technical names, approval numbers and certification are not inferred from a UN number.

Use `scripts/build_dg2_reference.py` with a local copy of this PDF to rebuild the catalog. It requires the development-only Python package `pdfplumber`; no PDF parser or network lookup is required by the application. The extractor uses the PDF's column and row boundaries, preserving wrapped special provisions and separate packing groups. Source page numbers remain attached to individual entries.

Emergency contacts retain the manual's hazard/service categories, collect-call notes, DSN alternatives and both domestic/international numbers for the general DoD hotline. Class 6.2 infectious substances are not automatically treated as biological warfare materials. The default shipper address was supplied by the user; it is not inferred from the manual.

Existing training template IDs remain readable. CDF checks accept a catalog UN identifier for the same declared UN and piece, while continuing to verify the hazardous-material fields against the exercise paperwork.
