# DTR reference data code lists

CMOS lookups use the public **DTEB Transportation Reference Data** tables published by USTRANSCOM:

- Catalog: https://www.business.ustranscom.mil/cmd/associated/dteb/reference-data.cfm
- Tables: `https://www.business.ustranscom.mil/cmd/associated/dteb/files/refdata/<TABLE>.htm`
- Retrieved 2026-10-15. Each table's "Next Page" link returns 404; the first page holds every row.
- Python's default certificate store does not verify the site; plain `curl` does.

`scripts/build_dtr_reference.py` downloads the tables below and writes `src/Components/Cmos/dtrReference.json`. The app reads only the checked-in JSON.

| Table | Codes | Used for |
| --- | --- | --- |
| V_RTE_INSTR_NT Route Instruction Note | 140 | CBL RINs: RIN Nbr lookup; choosing a code fills RIN Text when blank |
| V_TRAN_EQU_TY Transportation Equipment Type | 190 | Equip Type Ordered/Furnished (CBL conveyances), routing equipment lookups |
| V_D_FRGHT_LDNG_BL_SRVC_AGNCY_CD Freight Lading Bill Service Agency | 11 | CBL Miscellaneous Service Agency |
| V_D_FRGHT_LDNG_BL4_CD Freight Lading Bill Reason (N-series only) | 13 | CBL Miscellaneous Reason (low-cost carrier not used) |
| V_LDNG_BL_SPCL_SRV Lading Bill Special Service | 168 | CBL Service Codes SVC Code lookup |
| V_MSR_UN Measure Unit | 80 | Service Codes UOM, piece Volume UOM lookups |
| V_GBLOC_DOM Bill of Lading Office | 923 | CBL Consignee GBLOC lookup; filled from the consignee DODAAC when DTR lists it |
| V_D_AR_MNFST_RFRNC_CD Air Manifest Reference | 576 | Air Manifest Ref ID lookup |
| V_D_DMSTC_RTE_ORDR_MIL_SVC_CD Domestic Route Order Military Service | 11 | Routings Svc Agency Code lookup |
| V_TRAN_MD Transportation Method | 35 | Completes clipped MIL Mode descriptions |
| V_D_CGO_LD_UNT_TY Transportation Hold | 23 | Completes clipped hold code descriptions |
| V_TYPE_PACK Type Pack | 118 | CMOS Type Pack lookups and the Outbound CMOS piece Type Pack list |

The MIL/EDI mode, CIIC, hold code, security class and type cargo lists stay as transcribed from the user's CMOS screenshots. DTR text replaces a clipped ("...") description only when it begins with the visible words; CMOS keeps EDI mode AF for MIL mode Q (DTR lists A) and lists hold code Y with text DTR files under X.

The Outbound packing paperwork offers a short list of DTR type pack codes (`TYPE_PACKS` in `src/Components/Outbound/outboundData.js`). A triwall is answered **MW** (multiwall container secured to warehouse pallet); DTR defines PL as Pail, has no PK, and uses PT for other palletized unit loads. Changed 2026-10-15 at the user's direction; earlier sessions expected PL for triwall.
