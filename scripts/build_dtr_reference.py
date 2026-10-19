#!/usr/bin/env python3
"""Rebuild the CMOS code lists from the DTEB Transportation Reference Data tables.

Source: https://www.business.ustranscom.mil/cmd/associated/dteb/reference-data.cfm
Each table is a public HTML page under .../dteb/files/refdata/<TABLE>.htm.
Needs curl (the site's certificate chain is not in Python's default store). The web app uses the checked-in JSON.
Usage: python scripts/build_dtr_reference.py [--output src/Components/Cmos/dtrReference.json]
"""
import argparse, datetime, html, json, re, subprocess

BASE = 'https://www.business.ustranscom.mil/cmd/associated/dteb/files/refdata/'
# key: (table, code column, description column, row filter[, extra column])
TABLES = {
    'routeInstructionNotes': ('V_RTE_INSTR_NT', 0, 1, None),
    'equipmentTypes': ('V_TRAN_EQU_TY', 0, 2, None),
    'freightServiceAgencies': ('V_D_FRGHT_LDNG_BL_SRVC_AGNCY_CD', 0, 1, None),
    # N-series codes explain why the low-cost carrier was not used (CBL Reason / Cost Diff).
    'lowCostNotUsedReasons': ('V_D_FRGHT_LDNG_BL4_CD', 0, 1, lambda row: row[0].startswith('N')),
    'ladingBillSpecialServices': ('V_LDNG_BL_SPCL_SRV', 0, 1, None),
    'measureUnits': ('V_MSR_UN', 0, 2, None),
    # Extra column: the DODAAC of the office that owns the GBLOC.
    'gblocs': ('V_GBLOC_DOM', 0, 1, None, 5),
    'airManifestReferences': ('V_D_AR_MNFST_RFRNC_CD', 0, 1, None),
    'routeOrderServices': ('V_D_DMSTC_RTE_ORDR_MIL_SVC_CD', 0, 1, None),
    'transportationMethods': ('V_TRAN_MD', 0, 2, None),
    'holdCodes': ('V_D_CGO_LD_UNT_TY', 0, 1, None),
    'typePacks': ('V_TYPE_PACK', 0, 6, None),
    'serviceCodes': ('V_SHPMNT_UNT_SPL_HNDL_CD_DOM', 0, 1, None),
    # Pallet Type (module type, e.g. B = pallet 61"-84", L = 85"-96") and Config Code (e.g. PC) on CMOS Pallets.
    'palletModuleTypes': ('V_D_PTUNT_MODU_TY_CD', 0, 1, None),
    'palletConfigurations': ('V_D_PLTZD_TRNSPRTN2_CD', 0, 1, None),
}

def fetch(table):
    result = subprocess.run(['curl', '-sSfL', '-m', '60', '-A', 'Mozilla/5.0', BASE + table + '.htm'], check=True, capture_output=True)
    return result.stdout.decode('latin-1')

def rows(page):
    found = []
    for row in re.findall(r'<tr[^>]*>(.*?)</tr>', page, re.S | re.I):
        cells = [re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', cell)).replace('\xa0', ' ')).strip()
                 for cell in re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', row, re.S | re.I)]
        found.append(cells)
    header = next(i for i, cells in enumerate(found) if len(cells) > 1)
    width = len(found[header])
    return found[header], [cells for cells in found[header + 1:] if len(cells) == width]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', default='src/Components/Cmos/dtrReference.json')
    args = parser.parse_args()
    out = {'source': 'DTEB Transportation Reference Data, ' + BASE, 'retrieved': datetime.date.today().isoformat(), 'tables': {}}
    for key, (table, code, text, keep, *extra) in TABLES.items():
        header, data = rows(fetch(table))
        entries, seen = [], set()
        for row in data:
            if keep and not keep(row):
                continue
            if row[code] in seen or not row[code]:
                continue
            seen.add(row[code])
            entries.append([row[code], row[text], *(row[i] for i in extra)])
        out['tables'][key] = {'table': table, 'columns': [header[code], header[text], *(header[i] for i in extra)], 'rows': entries}
        print(f'{key}: {table} {len(entries)} codes')
    with open(args.output, 'w') as handle:
        json.dump(out, handle, indent=1, ensure_ascii=False)
        handle.write('\n')

if __name__ == '__main__':
    main()
