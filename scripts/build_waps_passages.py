"""Build the exact regulation passages shown when hovering a WAPS study-tool citation.

Usage: python3 -I scripts/build_waps_passages.py <dir with source .txt files> [--report]

Each source .txt is the text of a publication PDF, extracted with PyMuPDF, one page per form feed
(pypdf splits some words, e.g. "intern ational", so it is not used):
    python -I -c "import sys,pymupdf; d=pymupdf.open(sys.argv[1]); \
        open(sys.argv[2],'w').write('\\n\\f'.join(p.get_text() for p in d))" in.pdf out.txt
The script splits each publication into its numbered paragraphs, looks up every bank question's
citation, and writes src/Components/Waps/passages/<bank>.json. Quotes are the publication's words
exactly; only line-wrap whitespace and running page headers are removed. A passage too long to
show is cut to the run of lines that best covers the question, with "…" marking omitted text.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WAPS = ROOT / 'src' / 'Components' / 'Waps'
MAX_CHARS = 1500
# Passages the PDFs carry only as images (no text layer), transcribed word for word by hand.
OVERRIDES = json.loads((Path(__file__).resolve().parent / 'waps_passage_overrides.json').read_text())

# bank -> (bank file, [(source text file, kind, citation prefix used by the bank's refs, edition)])
SOURCES = {
    'dafi10403': ('dafi10403Bank', [('l123_1', 'dafi', '', '17 December 2025')]),
    'dafi24602v2': ('dafi24602v2Bank', [('l292_1', 'dafi', '', '20 December 2023'), ('l292_x', 'dafi', '', '20 December 2023')]),
    'dafi24602v1': ('dafi24602v1Bank', [('l363_1', 'dafi', '', '15 December 2020')]),
    'dafi24602v4': ('dafi24602v4Bank', [('l503_1', 'dafi', '', '2 June 2026')]),
    'dtrPart2': ('dtrPart2Bank', [('l624_1', 'dtr', 'Ch 202', '25 September 2026'), ('l624_2', 'dtr', 'Ch 205', '1 June 2026'),
                                  ('l624_3', 'dtr', 'Ch 210', '14 January 2026')]),
    'dtrPart3': ('dtrPart3Bank', [('l688_2', 'dtr', 'Ch 303', '25 September 2026'), ('l688_1', 'dtr', 'App P', 'June 2016')]),
    # The PDG: AFH 1, Airman. Its questions live in afh1/ch*.js and afh1/att.js (default-exported row lists).
    'afh1': ('afh1/', [('afh1', 'dafi', '', '15 February 2025')]),
    'dtrPart4': ('dtrPart4Bank', [('l731_1', 'dtr', 'Ch A-402', '14 July 2026'), ('l731_2', 'dtr', 'Ch A-411', '21 August 2024'),
                                  ('l731_3', 'dtr', 'App A-B', '18 February 2026, effective 15 May 2026'),
                                  ('l731_4', 'dtr', 'Ch A-401', '5 May 2025'), ('l731_5', 'dtr', 'App A-M', '9 January 2026')]),
}

HEADER = [
    re.compile(r'^\s*AFH 1, AIRMAN\s+15 February 2025\s*$'),
    re.compile(r'^\s*(\d+\s+)?(DAFI|AFI|DAFMAN)\s?\d{2}-\d{3}(V\d)?\s+\d{1,2}\s+[A-Z]+\s+\d{4}(\s+\d+)?\s*$'),
    re.compile(r'^\s*Defense Transportation Regulation\s*[–-]\s*Part'),
    re.compile(r'^\s*(Cargo Movement|Mobility|Personal Property)\s*$'),
    re.compile(r'^\s*(II|III|IV)-[A-Z0-9-]+\s*$'),
    re.compile(r'^\s*DP3 HHG ToS 2026\s*$'),
    re.compile(r'^\s*\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}\s*$'),
    re.compile(r'(\.{5,}|…{2,}|…\.|\.…)'),  # table of contents
]
CAPTION = re.compile(r'^\s*(Table|Figure)\s+(A?\d+\.\d+|[A-Z]+-\d+(?:-\d+)?|[A-Z]-\d+|\d+-\d+)\.(\s|$)')
LONE_MARKER = re.compile(r'^(\(\d{1,2}\)|\(([a-z])\2?\)|([A-Za-z])\3?\.|A?\d{1,2}(\.\d+)*\.|\d{1,2})$')
PAGE_NUMBER = re.compile(r'^\d{1,3}$')
EXAMPLE_WORDS = {'ONE': '1', 'TWO': '2', 'THREE': '3', 'FOUR': '4', 'FIVE': '5', 'SIX': '6'}


def read_lines(path):
    """(line, pdf page) pairs with running headers, footers, and contents lines removed."""
    out, marker = [], None
    for number, page in enumerate(path.read_text().split('\f'), start=1):
        raw = [re.sub(r'\s+', ' ', line).strip() for line in page.split('\n')]
        raw = [(line, any(rule.search(line) for rule in HEADER)) for line in raw if line]
        for index, (line, header) in enumerate(raw):
            if header:
                continue
            # A bare number beside a running header is the page number; elsewhere it is a table
            # cell or a paragraph marker ("1") printed on a line of its own.
            beside = [raw[j][1] for j in (index - 1, index + 1) if 0 <= j < len(raw)]
            if PAGE_NUMBER.match(line) and (any(beside) or index == 0):
                continue
            if LONE_MARKER.match(line):  # PyMuPDF puts some markers ("a.", "(1)") on a line of their own
                if marker:
                    out.append(marker)
                marker = (line, number)
                continue
            # A "marker" followed by a caption or another marker was the end of the previous
            # sentence or table cell ("... Appendix" / "E."), so it stays where it was.
            if marker and (special_key(line) or DAFI_MARK.match(line) or any(rule.match(line) for rule in DTR_LEVELS[:5])):
                out.append(marker)
            elif marker and marker[0].isdigit() and not re.match(r'^[A-Za-z“"(]', line):
                out.append(marker)
            elif marker:
                line, number = f'{marker[0]} {line}', marker[1]
            marker = None
            out.append((line, number))
    return out


def special_key(line):
    """Captions that start a block of their own: tables, figures, examples, attachments, intro."""
    caption = CAPTION.match(line)
    if caption:
        return f'{caption.group(1)} {caption.group(2)}'
    example = re.match(r'^EXAMPLE (ONE|TWO|THREE|FOUR|FIVE|SIX)\b', line)
    if example:
        return f'Example {EXAMPLE_WORDS[example.group(1)]}'
    if re.match(r'^Attachment \d+$', line):
        return f'Atch {line.split()[1]}'
    if line == 'INTRODUCTION':
        return 'Introduction'
    return None


# ----- DAFI: 1.2.3. numbering --------------------------------------------------------------------
DAFI_MARK = re.compile(r'^(A?\d+(?:\.\d+)+)\.(?:\s|(?=[A-Z][a-z]))')


def next_number(label):
    head, number = re.match(r'^(A?)(\d+)$', label).groups()
    return f'{head}{int(number) + 1}'


def dafi_accepts(label, path):
    parts = label.split('.')
    if len(parts) == 2 and parts[1] == '1':
        return True  # first paragraph of a chapter or attachment
    if not path:
        return False
    stack = path.split('.')
    if parts[:-1] == stack and parts[-1] == '1':
        return True
    return any(parts[:-1] == stack[:depth] and parts[-1] == next_number(stack[depth]) for depth in range(len(stack)))


def dafi_blocks(lines, inline_captions=False):
    """inline_captions: figure and table captions sit mid-paragraph (AFH 1), so they stay in the paragraph."""
    blocks, path, seen = [], None, set()
    for line, page in lines:
        match = DAFI_MARK.match(line)
        if match and match.group(1) not in seen and dafi_accepts(match.group(1), path):
            path = match.group(1)
            seen.add(path)
            blocks.append({'key': path, 'path': path.split('.'), 'lines': [line], 'pages': [page]})
            continue
        key = special_key(line)
        if key and inline_captions and CAPTION.match(line):
            key = None
        if key:
            blocks.append({'key': key, 'path': None, 'lines': [line], 'pages': [page], 'caption': True})
            continue
        if blocks:
            blocks[-1]['lines'].append(line)
            blocks[-1]['pages'].append(page)
    return blocks


# ----- DTR: A. / 1. / a. / (1) / (a) / 1 -----------------------------------------------------------------
DTR_LEVELS = [
    re.compile(r'^([A-Z]{1,2})\.\s+\S'),
    re.compile(r'^(\d{1,2})\.\s+\S'),
    re.compile(r'^([a-z]{1,2})\.\s+\S'),
    re.compile(r'^\((\d{1,2})\)\s+\S'),
    re.compile(r'^\(([a-z]{1,2})\)\s+\S'),
    re.compile(r'^(\d{1,2})\.?\s+[A-Za-z(“"$]'),
]
FIRST = ['A', '1', 'a', '1', 'a', '1']


def next_label(label):
    if label.isdigit():
        return str(int(label) + 1)
    if label == 'Z':
        return 'AA'
    if label == 'z':
        return 'aa'
    if len(label) == 2:
        return chr(ord(label[0]) + 1) * 2
    return chr(ord(label) + 1)


def dtr_key(path):
    """['C', '2', 'c', '1', 'b', '2'] -> 'C.2.c(1)(b)2'."""
    out = ''
    for depth, label in enumerate(path):
        out += label if depth in (0, 5) else f'.{label}' if depth in (1, 2) else f'({label})'
    return out


def dtr_level(line, path):
    """The deepest reading of a paragraph marker that continues the current numbering."""
    best = None
    for depth, rule in enumerate(DTR_LEVELS):
        match = rule.match(line)
        if not match:
            continue
        label = match.group(1)
        if depth < len(path) and label == next_label(path[depth]):
            best = (depth, label)
        elif depth == len(path) and label == FIRST[depth]:
            best = (depth, label)
    match = DTR_LEVELS[4].match(line)
    if best is None and match and (len(path) == 2 or (len(path) > 2 and match.group(1) == next_label(path[2]))):
        # The ToS sometimes prints a third-level item as "(c)" instead of "c.".
        best = (2, match.group(1))
    return best


def dtr_blocks(lines):
    blocks, path, lettered, parenthesized = [], [], False, False
    for line, page in lines:
        key = special_key(line)
        if key:
            blocks.append({'key': key, 'path': None, 'lines': [line], 'pages': [page], 'caption': True})
            continue
        level = dtr_level(line, path)
        if level and level[0] > 0 and blocks and blocks[-1].get('caption') and len(line) < 60:
            level = None  # a numbered table row ("5. No CRE on scene"), not a paragraph
        # The ToS sometimes letters a list under "(16) ...:" as "a.", "b." instead of "(a)", "(b)".
        letter = DTR_LEVELS[2].match(line)
        if letter and len(path) == 4 and letter.group(1) == 'a' and blocks and join(blocks[-1]['lines']).endswith(':'):
            level, lettered = (4, 'a'), True
        elif letter and lettered and len(path) == 5 and letter.group(1) == next_label(path[4]):
            level = (4, letter.group(1))
        elif letter and parenthesized and len(path) >= 3 and letter.group(1) <= path[2]:
            # The ToS lists "(c)", "(d)" under a paragraph and then starts again at "c." below them.
            level, parenthesized = (2, letter.group(1)), False
        elif level:
            lettered = False
        if level and level[0] == 2 and DTR_LEVELS[4].match(line):
            parenthesized = True
        if level and not (blocks and blocks[-1].get('caption') and level[0] > 1 and not path):
            depth, label = level
            path = path[:depth] + [label]
            blocks.append({'key': dtr_key(path), 'path': list(path), 'lines': [line], 'pages': [page]})
            continue
        if re.match(r'^\(?NOTE', line) and blocks and blocks[-1]['path'] is not None:
            blocks.append({'key': None, 'note': True, 'path': list(path), 'lines': [line], 'pages': [page]})
            continue
        if blocks:
            blocks[-1]['lines'].append(line)
            blocks[-1]['pages'].append(page)
    return blocks


# ----- passages -----------------------------------------------------------------------------------------
def join(lines):
    return re.sub(r'\s+', ' ', ' '.join(lines)).strip()


def units_for(blocks, ref, kind, all_lines):
    """Every passage the citation could mean, as (units, first page, number of leading units always
    shown): units are paragraphs, or the lines of a table. Usually one; a paragraph label printed twice, or a paragraph with several
    NOTEs, gives more, and the caller keeps the one that best supports the answer."""
    if ref.endswith(' note'):
        owner = ref[:-5]
        found = []
        for i, block in enumerate(blocks):
            if block['key'] != owner:
                continue
            for later in blocks[i + 1:]:
                if later['path'] is None or later['path'][:len(block['path'])] != block['path']:
                    break
                if later.get('note'):
                    found.append(([join(block['lines']), join(later['lines'])], block['pages'][0], 1))
        return found
    if ref.startswith('Figure '):
        # Figures sit on their own pages with the caption above or below: quote those whole pages.
        pages = sorted({b['pages'][0] for b in blocks if b['key'] == ref})
        return [([line for line, page in all_lines if page in pages], pages[0], 1)] if pages else []
    matches = [i for i, b in enumerate(blocks) if b['key'] == ref]
    if matches and blocks[matches[0]].get('caption'):
        lines = []
        for i in matches:
            lines += blocks[i]['lines']
            if ref.startswith('Atch '):  # an attachment runs through its tables to the next attachment
                for later in blocks[i + 1:]:
                    if not later.get('caption') or later['key'].startswith('Atch '):
                        break
                    lines += later['lines']
        return [(lines, blocks[matches[0]]['pages'][0], 1)]
    found = []
    for i in matches:
        head = blocks[i]
        units = ancestors(blocks, i, kind) + [join(head['lines'])]
        keep = len(units)  # parent headings and the cited paragraph itself are always shown
        for later in blocks[i + 1:]:
            if later['path'] is None:
                break
            if kind == 'dafi':
                if later['key'] and not later['key'].startswith(head['key'] + '.'):
                    break
            elif later['path'][:len(head['path'])] != head['path'] or (not later.get('note') and len(later['path']) <= len(head['path'])):
                break
            units.append(join(later['lines']))
        found.append((units, head['pages'][0], keep))
    return found


def ancestors(blocks, i, kind):
    """Short parent paragraphs ("1.17.2. The LRS Deployment and Distribution Flight will:") that say
    who or what a list item is about, nearest two, with "…" where text between them is left out."""
    head = blocks[i]
    if kind == 'dafi':
        keys = ['.'.join(head['path'][:n]) for n in range(len(head['path']) - 1, 1, -1)]
    else:
        keys = [dtr_key(head['path'][:n]) for n in range(len(head['path']) - 1, 0, -1)]
    found = []
    for key in keys[:2]:
        index = next((j for j in range(i - 1, -1, -1) if blocks[j]['key'] == key), None)
        if index is None or len(join(blocks[index]['lines'])) > 300:
            break
        found.append(index)
    out, previous = [], i
    for index in found:  # nearest first; build from the outermost down
        out.insert(0, join(blocks[index]['lines']) if previous == index + 1 else join(blocks[index]['lines']) + '\n…')
        previous = index
    return [line for unit in out for line in unit.split('\n')]


STOP = set('that this with from have they their must will shall when what which within under only also than then into each been '
           'were more less does used uses using about after before other what does should would could where there these those '
           'answer question following'.split())


def words(text):
    return [t for t in re.sub(r'[^a-z0-9 ]', ' ', text.lower().replace(',', '').replace('’', "'")).split()
            if (any(c.isdigit() for c in t) or len(t) >= 4) and t not in STOP]


def evidence(answer, quote):
    tokens = words(answer)
    if not tokens:
        return 1.0
    haystack = ' ' + ' '.join(words(quote)) + ' '
    return sum(1 for t in tokens if f' {t}' in haystack) / len(tokens)


def excerpt(units, question, answer, keep=1):
    """All the units if they fit; otherwise the first `keep` units (headings and the cited paragraph)
    plus the best-matching run of the rest."""
    if sum(len(u) + 1 for u in units) <= MAX_CHARS:
        return '\n'.join(units)
    # A paragraph too long to show whole is split into sentences, so the excerpt can land on the
    # sentence that answers the question; a split kept paragraph keeps only its first sentence.
    split, kept = [], 0
    for index, unit in enumerate(units):
        parts = re.split(r'(?<=[.!?\u201d"])\s+(?=[A-Z\u201c"(])', unit) if len(unit) > MAX_CHARS else [unit]
        while len(parts) > 1 and re.fullmatch(r'A?[\d.]+', parts[0]):  # keep "1.4." with its first sentence
            parts[:2] = [f'{parts[0]} {parts[1]}']
        split.extend(parts)
        if index < keep:
            kept += 1 if len(parts) > 1 else len(parts)
            if len(parts) > 1:
                split[len(split) - len(parts) + 1:len(split)] = [' '.join(parts[1:])] if index < keep - 1 else parts[1:]
    if kept != keep or len(split) != len(units):
        units, keep = split, max(kept, 1)
    answer_words, question_words = set(words(answer)), set(words(question)) - set(words(answer))
    found = [set(words(u)) for u in units]

    def score(start, end):
        # Distinct words, so a long run of lines that each repeat "Form" cannot outscore the answer.
        seen = set().union(*found[start:end])
        return 5 * len(answer_words & seen) + len(question_words & seen)

    best, best_range = -1, (0, 1)
    for start in range(keep, len(units)):
        length, end = 0, start
        while end < len(units) and length + len(units[end]) <= MAX_CHARS - sum(len(u) for u in units[:keep]):
            length += len(units[end]) + 1
            end += 1
        end = max(end, start + 1)
        total = score(start, end)
        if total > best:
            best, best_range = total, (start, end)
    start, end = best_range
    start = max(start, keep)
    end = max(end, start)
    parts = list(units[:keep])
    if start > keep:
        parts.append('…')
    parts.extend(units[start:end])
    if end < len(units):
        parts.append('…')
    text = '\n'.join(parts)
    if len(text) > MAX_CHARS * 2:  # one enormous paragraph: keep its opening
        text = text[:MAX_CHARS * 2].rsplit(' ', 1)[0] + ' …'
    return text


def local_ref(kind, prefix, ref):
    if kind == 'dafi':
        return ref
    head = prefix + ', '
    if not ref.startswith(head):
        return None
    rest = ref[len(head):]
    rest = re.sub(r'^para ', '', rest)
    return re.sub(r'^Fig ', 'Figure ', rest)


def bank_rows(name):
    """[ref, question, answer] for each question, read by evaluating the bank module in node."""
    if name.endswith('/'):  # AFH 1 chapter files: rows are [ref, section, kind, question, answer, wrong]
        rows = []
        for path in sorted([*(WAPS / name).glob('ch*.js'), *(WAPS / name).glob('att.js')]):
            source = path.read_text().replace('export default rows;', '')
            script = source + '\nprocess.stdout.write(JSON.stringify(rows.map(r => [r[0], r[3], r[4]])));'
            rows += json.loads(subprocess.run(['node', '-e', script], capture_output=True, text=True, check=True).stdout)
        return rows
    source = (WAPS / f'{name}.js').read_text().replace('export const ', 'const ')
    bank = re.search(r'^const (\w+Bank) =', source, re.M).group(1)
    script = source + f'\nprocess.stdout.write(JSON.stringify({bank}.map(i => [i.ref, i.question, i.answer])));'
    return json.loads(subprocess.run(['node', '-e', script], capture_output=True, text=True, check=True).stdout)


def main():
    src = Path(sys.argv[1])
    report = '--report' in sys.argv
    (WAPS / 'passages').mkdir(exist_ok=True)
    weak, missing_total = [], 0
    # --only <bank>[,<bank>] rebuilds just those banks; the SKT passage files have hand-curated quotes.
    only = sys.argv[sys.argv.index('--only') + 1].split(',') if '--only' in sys.argv else None
    for bank, (bank_file, sources) in SOURCES.items():
        if only and bank not in only:
            continue
        parsed = []
        for name, kind, prefix, _ in sources:
            lines = read_lines(src / f'{name}.txt')
            parsed.append((kind, prefix, lines, dafi_blocks(lines, inline_captions=bank == 'afh1') if kind == 'dafi' else dtr_blocks(lines)))
        refs, questions, missing = {}, {}, []
        for ref, question, answer in bank_rows(bank_file):
            candidates = []
            for kind, prefix, lines, blocks in parsed:
                local = local_ref(kind, prefix, ref)
                candidates = (local and units_for(blocks, local, kind, lines)) or []
                if candidates:
                    break
            override_key = f'{ref}|{question}' if f'{ref}|{question}' in OVERRIDES else ref
            if override_key in OVERRIDES:
                candidates = [(OVERRIDES[override_key]['units'], OVERRIDES[override_key]['page'], 1)]
            if not candidates:
                missing.append(ref)
                continue
            quotes = [(excerpt(units, question, answer, keep), page, units) for units, page, keep in candidates]
            best = max(quotes, key=lambda q: (evidence(answer, q[0]), evidence(question, q[0])))
            quote, page, units = best
            entry = {'quote': quote, 'page': page}
            override_key = f'{ref}|{question}' if f'{ref}|{question}' in OVERRIDES else ref
            if override_key in OVERRIDES:
                entry['note'] = OVERRIDES[override_key]['note']
            # One passage per citation where possible; a question gets its own when it needs a
            # different excerpt or a different one of several same-numbered paragraphs.
            if best is quotes[0] and quote == '\n'.join(units) and ref not in refs:
                refs[ref] = entry
            elif refs.get(ref) != entry:
                questions[f'{ref}|{question}'] = entry
            if evidence(answer, quote) < 0.5:
                weak.append((bank, ref, question[:80], answer[:60]))
        # Edition of each source document, by the citation prefix its refs start with ('' for a DAFI).
        editions = {prefix: edition for _, _, prefix, edition in sources}
        out = {'editions': editions, 'refs': refs, 'questions': questions}
        (WAPS / 'passages' / f'{bank}.json').write_text(json.dumps(out, ensure_ascii=False, sort_keys=True, separators=(',', ':')) + '\n')
        missing_total += len(missing)
        print(f'{bank}: {len(refs)} citations and {len(questions)} excerpts quoted; {len(missing)} questions with no passage')
        if report and missing:
            print('  missing:', '; '.join(sorted(set(missing))))
    print(f'{missing_total} questions without a passage; {len(weak)} whose answer words are mostly not in the passage')
    if report:
        for row in weak:
            print('  ', ' | '.join(row))


if __name__ == '__main__':
    main()
