# Shared CMOS source coverage

Runtime inventory: `src/Components/Cmos/referenceInventory.js`. Each main page records PDF filename and page evidence. All eight provided guides are local references; their steps do not authorize live transactions.

| Page | Source | Implemented groups |
| --- | --- | --- |
| Shipment Planning | Manage Shipment Planning Detail, 24 pages | Query columns, four-column header, three-column main, Pieces, Ultimate Consignee, Indicators, DG2, T-9, status, frustration, bottom actions |
| DG2 | Manage Hazardous TCN, 24 pages | Header, templates, Page 1 flags/text, Page 2 declarations, hazard code, ammo lot collection, certification, removal |
| Air Manifest | Manage Air Manifest, 12 pages | Header, pallet/loose TCN assignment, edit check, pull sheet/manifest, departure |
| Truck Manifest | Manage Truck Manifest, 28 pages | Header, TCNs, Addresses, Miscellaneous, Conveyance, Assign Statements, loading, check, print/export, departure/abort |
| Routings | Manage Routings, 28 pages | Header, TCNs/copy, Equip Group Mode, Stop Offs, Equip Load Plan, Response, Addresses, Water Port, Notices, Status, edit/request/retry |
| SPE | Manage SPE Shipments, 39 pages | Shipment Details, International Details, Hold At Location-3, requests/cancel, document retrieval/printing, carrier closeout/pickup report |
| Commercial BOL | Create Manual CBL, 34 pages | Header, TCNs, Addresses, Billing/accounting, Miscellaneous, RINs, Conveyances, Commodities, Service Codes, Via SCAC, Rail, draft/final/release |
| Rate Quote | Manage Rate Quote, 47 pages | Domestic/international SPE, Freight, equipment/service fields, results and linked carrier assignment |

The PDFs show some tab names without opened contents. Supporting fields for Rail, Via SCAC, Stop Offs, Water Port, Hold At Location and T-9 are functional training controls; their complete layouts cannot be certified against an unseen original. Collection and lookup data are fictional fixtures. Carrier/GFM/accounting responses are deterministic local simulation.

The runtime inventory supplies all editable controls to both courses. Source paperwork and generated snapshots open through one nonmodal document manager. Save is never answer validation; explicit edits and operational actions check saved revisions.
