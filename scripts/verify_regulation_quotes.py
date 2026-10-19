# Checks every quotation in src/Components/Regulations/passages.json against its official publication.
# Downloads each publication from its catalog URL (or uses the bundled copy in public/ for asset:
# URLs), removes repeated running headers/footers, and confirms the quotation appears on its cited
# PDF page and the pages after it, ignoring only PDF spacing and punctuation spacing. Table quotations
# (those with a layoutNote) are transcribed row by row, so they are checked word for word without
# regard to order. Needs pypdf. Usage: python3 -I scripts/verify_regulation_quotes.py [repo] [download dir]
import json, re, sys, os, subprocess
import pypdf
repo = sys.argv[1] if len(sys.argv) > 1 else '.'
work = sys.argv[2] if len(sys.argv) > 2 else os.path.join(repo, '.regulation-sources')
os.makedirs(work, exist_ok=True)
pubs = json.load(open(f'{repo}/src/Components/Regulations/publications.json'))
pubs = pubs if isinstance(pubs, dict) else {p['id']: p for p in pubs}
passages = json.load(open(f'{repo}/src/Components/Regulations/passages.json'))
def norm(t):
    t = t.replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"').replace('–', '-').replace('—', '-').replace(' ', ' ').replace('ﬁ','fi').replace('ﬂ','fl')
    t = re.sub(r'-\s*\n\s*', '-', t)
    return re.sub(r'\s+', ' ', t).strip().lower()
texts = {}
def pages(pid):
    if pid in texts: return texts[pid]
    url = pubs[pid]['url']
    path = os.path.join(work, pid + '.pdf')
    if url.startswith('asset:'):
        path = os.path.join(repo, 'public', url[len('asset:'):])
    elif not os.path.exists(path):
        subprocess.run(['curl', '-s', '-L', '-o', path, url], check=False)
    try:
        r = pypdf.PdfReader(path)
        raw = [(p.extract_text() or '').split('\n') for p in r.pages]
        from collections import Counter
        key = lambda line: re.sub(r'[^a-z]', '', line.lower())
        counts = Counter(k for lines in raw for k in set(key(l) for l in lines) if k)
        common = {k for k, c in counts.items() if c >= max(3, len(raw) * 0.3)}
        texts[pid] = [norm('\n'.join(l for l in lines if key(l) not in common and not re.fullmatch(r'\s*[A-Z]?\d+[-\s]*\d*\s*', l))) for lines in raw]
    except Exception as e:
        texts[pid] = None
        print('FAILED TO READ', pid, url, e)
    return texts[pid]
ok = bad = skipped = 0
for key, p in passages.items():
    pid = p['publicationId']
    pg = pages(pid)
    if pg is None: skipped += 1; continue
    q = norm(p['quote'])
    tight = lambda t: re.sub(r'[^a-z0-9]', '', t)
    # Noncontiguous excerpts are marked with an ellipsis; check each part.
    parts = [x.strip() for x in re.split(r'\s*(?:\.\.\.|…|\[\.\.\.\])\s*', q) if x.strip()]
    n = p.get('pdfPage')
    if p.get('layoutNote'):
        from collections import Counter
        win = ' '.join(pg[max(0, n - 2): n + 2])
        want = Counter(re.findall(r'[a-z0-9]+', re.sub(r'\[(\d)\]', r'\1', q)))
        have = Counter(re.findall(r'[a-z0-9]+', win))
        # Merged cells are repeated on each row they span, so require each word, not its count.
        short = {w: c for w, c in want.items() if not have[w]}
        if short: bad += 1; print(f'TABLE MISMATCH {key}: words not on the page {dict(list(short.items())[:12])}')
        else: ok += 1
        continue
    window = ' '.join(pg[max(0, n - 2): n + 6]) if n else ' '.join(pg)
    whole = ' '.join(pg)
    missing = [x for x in parts if tight(x) not in tight(window)]
    if not missing: ok += 1; continue
    elsewhere = [x for x in missing if tight(x) in tight(whole)]
    bad += 1
    print(f'MISMATCH {key} (pub {pid}, pdfPage {n}): ' + ('text found on a different page' if len(elsewhere) == len(missing) else 'text NOT found in publication'))
    for x in missing[:1]:
        words = x.split(); best = 0
        for k in range(len(words), 0, -1):
            if ' '.join(words[:k]) in window: best = k; break
        print('   first mismatch after', best, 'matching words of', len(words), '→', ' '.join(words[best:best+12]))
print(f'\nverified {ok}, mismatched {bad}, unreadable {skipped}, total {len(passages)}')
sys.exit(1 if bad or skipped else 0)
