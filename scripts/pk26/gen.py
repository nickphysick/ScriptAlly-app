"""Generate clean, page-local CSS from the flattened ref observations.

Each rendered element in each captured state gives an intended property map P (authored winners with var()
resolved, plus a few preflight-sensitive values read from the computed style). Elements are grouped by a
selector built from their own classes and their nearest classed ancestors; a group whose members disagree is
deepened until it agrees. The emitted rules are then checked against every observation by simulating the
cascade over the recorded ancestor chains, so a less specific rule cannot leak a value onto an element that
did not have it in the ref.
"""
import json, re, sys
from collections import defaultdict, Counter

P = 'p6-'
HEADER_TEXT = "/**\n * @license\n * SPDX-License-Identifier: Apache-2.0\n *\n * GENERATED - DO NOT EDIT BY HAND. Submission packages v26, ported from\n * design-refs/submission-packages-v26/submission-packages-v26.html by scripts/pk26/ (extract.cjs reads the\n * ref's COMPUTED cascade in Chromium for every state at 1512/1440/1360/1280; gen.py flattens it into one rule\n * per element signature, checked against every observation so no rule reaches an element it does not own).\n * The ref's stylesheet is v10 to v26 of one mock, later blocks overriding earlier ones; this is its final\n * computed result, not a copy of the cascade. Hand-written additions live in pk26.css.\n * Regenerate (from the repo root): node scripts/pk26/extract.cjs <width> for 1512, 1440, 1360 and 1280, then\n *   python3 scripts/pk26/gen.py obs-1512.json src/components/packages/v26/pk26.generated.css\n */\n/* base: every element in the page and its layers */\n.p6 *, .p6-layer * { box-sizing: border-box; vertical-align: baseline; border: 0 none; }\n"
ALWAYS = ['font-family', 'display', 'box-sizing', 'vertical-align',
          'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style']
INHERITED = ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'color', 'letter-spacing',
             'text-align', 'text-transform', 'white-space', 'word-spacing', 'font-variant-ligatures',
             'font-variant-numeric', 'font-feature-settings', 'font-variation-settings', 'font-optical-sizing',
             '-webkit-font-smoothing', 'text-rendering', 'cursor', 'list-style-type', 'font-stretch']
DROP = {'content', 'caret-color', 'unicode-bidi', 'speak', 'overflow-anchor'}
DROP_PREFIX = ('-webkit-text-fill', '-webkit-border-image', 'container')
SKIP_ROOT_COMP = set()
SHORTHANDS_EARLY = {'font','border','border-top','border-right','border-bottom','border-left','border-width','border-style','border-color','border-radius','background','margin','padding','inset','gap','grid-gap','transition','animation','flex','flex-flow','grid','grid-area','grid-template','grid-row','grid-column','outline','list-style','text-decoration','overflow','place-items','place-content','place-self','columns','border-image','mask','-webkit-mask','font-variant','border-block','border-inline','margin-block','margin-inline','padding-block','padding-inline','inset-block','inset-inline','container','white-space','text-wrap','background-position','contain-intrinsic-size','scroll-margin','scroll-padding'}
ROOT_TOKS = {'ROOT': '.p6', 'aside#drw': '.p6-drawer', 'div#dim': '.p6-dim', 'div#pdlg': '.p6-pdlg',
             'div#toast': '.p6-toast', 'div#hwm': '.p6-hwm'}


def parse_tok(t):
    """'.a.b[aria-x="true"]' | 'span' | 'div#id' | 'ROOT' -> (tag, classes, attrs)"""
    if t == 'ROOT':
        return (None, frozenset(['p6']), frozenset())
    attrs = frozenset(re.findall(r'\[[^\]]+\]', t))
    t2 = re.sub(r'\[[^\]]+\]', '', t)
    if '#' in t2:
        tag, i = t2.split('#', 1)
        return (tag, frozenset([P + 'id-' + i]), attrs)
    if t2.startswith('.'):
        return (None, frozenset(P + c for c in t2[1:].split('.') if c), attrs)
    return (t2, frozenset(), attrs)


def cmp_str(c):
    tag, cls, attrs = c
    s = (tag or '') + ''.join('.' + x for x in sorted(cls)) + ''.join(sorted(attrs))
    return s or '*'


def classed(c):
    return bool(c[1])


class Obs:
    __slots__ = ('state', 'x', 'own', 'chain', 'nth', 'tag', 'P', 'comp', 'pseudo', 'hover', 'text', 'w', 'path', 'first', 'last')


def norm_val(n, v):
    v = v.strip()
    v = re.sub(r'\s+', ' ', v)
    return v


def build_P(row, is_root):
    auth, comp = row['auth'], row['comp']
    P_ = {}
    for n, v in auth.items():
        if n == '__all' or n.startswith('--') or n in DROP or n.startswith(DROP_PREFIX) or n in SHORTHANDS_EARLY:
            continue
        if v is None:
            continue
        v = re.sub(r'\s*!\s*important\s*$', '', v).strip()
        if v == '' or 'var(' in v or 'color-mix(' in v:
            v = comp.get(n, '')
        if v == '':
            continue
        P_[n] = norm_val(n, v)
    if auth.get('__all'):
        for n, v in comp.items():
            if n.startswith('--'):
                continue
            if re.match(r'^(background-color|color|font-(family|size|weight|style)|line-height|letter-spacing|text-(align|transform|decoration-line)|cursor|appearance|padding-|margin-|border-(top|right|bottom|left)-(width|style|color)|outline-style)', n) and n not in P_:
                P_[n] = v
    for n in ALWAYS:
        P_[n] = comp.get(n, P_.get(n))
    for side in ('top', 'right', 'bottom', 'left'):
        if comp.get(f'border-{side}-width', '0px') not in ('0px',) and comp.get(f'border-{side}-style') != 'none':
            P_[f'border-{side}-color'] = comp.get(f'border-{side}-color')
            P_[f'border-{side}-width'] = comp.get(f'border-{side}-width')
    if row['tag'] in ('img', 'svg', 'video'):
        P_['max-width'] = P_.get('max-width', comp.get('max-width'))
        if 'height' not in P_:
            P_['height'] = 'auto' if row['tag'] == 'img' else P_.get('height', comp.get('height'))
    if is_root:
        for n in INHERITED:
            if n not in P_:
                P_[n] = comp.get(n)
    # animation names are prefixed
    for k in ('animation-name',):
        if k in P_ and P_[k] != 'none':
            P_[k] = ', '.join(P + a.strip() for a in P_[k].split(','))
    return {k: v for k, v in P_.items() if v is not None}


def load(path):
    d = json.load(open(path))
    obs = []
    for st, rows in d['states'].items():
        for r in rows:
            o = Obs()
            o.state, o.x, o.tag, o.nth, o.text, o.w = st, r['x'], r['tag'], r['nth'], r['text'], d['w']
            o.path = (st, tuple(r['chain']), r['tok'], r['nth'], r['text'])
            o.first, o.last = r.get('first', False), r.get('last', False)
            is_root = r['tok'] in ROOT_TOKS or not r['chain']
            o.own = (None, frozenset([ROOT_TOKS[r['tok']][1:]]), frozenset()) if r['tok'] in ROOT_TOKS else parse_tok(r['tok'])
            if not is_root and r['tok'] in ('aside', 'div') and False:
                pass
            if not is_root and not o.own[1] and o.own[0] is None:
                o.own = (r['tag'], o.own[1], o.own[2])
            if not is_root and not o.own[1]:
                o.own = (r['tag'], o.own[1], o.own[2])
            ch = []
            for t in r['chain']:
                if t in ROOT_TOKS:
                    ch.append((None, frozenset([ROOT_TOKS[t][1:]]), frozenset()))
                else:
                    c = parse_tok(t)
                    if not c[1] and c[0] is None:
                        c = (t.split('#')[0], c[1], c[2])
                    ch.append(c)
            o.chain = [] if is_root else ch
            o.P = build_P(r, is_root)
            o.comp = r['comp']
            o.pseudo = {}
            for k, pv in (r.get('pseudo') or {}).items():
                if k not in ('::before', '::after'):
                    continue
                pp = {}
                for n, v in pv['auth'].items():
                    if n.startswith('--') or n in SHORTHANDS_EARLY or v is None:
                        continue
                    v = re.sub(r'\s*!\s*important\s*$', '', v).strip()
                    if v == '' or 'var(' in v or 'color-mix(' in v:
                        v = pv['comp'].get(n, '')
                    if v:
                        pp[n] = norm_val(n, v)
                if 'content' not in pp and pv['comp'].get('content') not in (None, 'none', 'normal'):
                    pp['content'] = pv['comp']['content']
                for n in ('display', 'box-sizing', 'font-family'):
                    pp.setdefault(n, pv['comp'].get(n))
                if 'animation-name' in pp and pp['animation-name'] != 'none':
                    pp['animation-name'] = ', '.join(P + a.strip() for a in pp['animation-name'].split(','))
                o.pseudo[k] = pp
            o.hover = r.get('hover')
            obs.append(o)
    return d, obs


def matches(sel, o):
    """sel: list of (combinator, compound) from left; last is the subject. combinators ' ' or '>' or ':nth'."""
    subj = sel[-1][1]

    def cmatch(c, e):  # e = (tag, cls, attrs) plus nth handled separately
        tag, cls, attrs = c
        et, ecls, eattrs = e
        if tag and tag != et:
            return False
        return cls <= ecls and attrs <= eattrs

    own_full = (o.tag, o.own[1], o.own[2])
    if not cmatch(subj, own_full):
        return False
    ps = sel[-1][2]
    if ps is not None:
        if ps == ':first-child' and not o.first: return False
        if ps == ':not(:first-child)' and o.first: return False
        if ps == ':last-child' and not o.last: return False
        if ps == ':not(:last-child)' and o.last: return False
        if ps.startswith(':nth-child(') and int(ps[11:-1]) != o.nth: return False
    for x in sel[-1][3]:
        if x.startswith('.') and x[1:] in o.own[1]:
            return False
        if x.startswith('[') and x in o.own[2]:
            return False
    # walk ancestors right-to-left
    anc = o.chain  # nearest first
    pos = 0
    for i in range(len(sel) - 2, -1, -1):
        comb_after = sel[i + 1][0]
        c = sel[i][1]
        if comb_after == '>':
            if pos >= len(anc) or not cmatch(c, anc[pos]):
                return False
            pos += 1
        else:
            while pos < len(anc) and not cmatch(c, anc[pos]):
                pos += 1
            if pos >= len(anc):
                return False
            pos += 1
    return True


def spec(sel):
    a = b = c = 0
    for comb, comp, nth, neg in sel:
        tag, cls, attrs = comp
        b += len(cls) + len(attrs) + ((2 if nth.startswith(':not(') else 1) if nth else 0) + len(neg)
        c += 1 if tag else 0
    return (a, b, c)


def sel_str(sel):
    out = ''
    for i, (comb, comp, nth, neg) in enumerate(sel):
        s = cmp_str(comp) + ''.join(f':not({x})' for x in sorted(neg)) + (nth or '')
        out += (s if i == 0 else (' > ' if comb == '>' else ' ') + s)
    return out


NEG = {}


def build_neg(obs):
    keys = defaultdict(set)
    for o in obs:
        own = (o.tag if not o.own[1] else None, o.own[1], o.own[2])
        par = o.chain[0] if o.chain else None
        keys[own].add(par)
    allk = list(keys)
    for k in allk:
        tag, cls, attrs = k
        extra = set()
        for k2 in allk:
            if k2 == k:
                continue
            t2, c2, a2 = k2
            if tag and t2 and t2 != tag:
                continue
            if tag and not t2:
                continue
            if not tag and t2:
                pass
            if cls <= c2 and attrs <= a2:
                if tag is None and not cls:
                    continue
                if tag and not cls:
                    # a bare tag only negates classed siblings under the same parents
                    if not (keys[k] & keys[k2]):
                        continue
                extra |= {'.' + x for x in (c2 - cls)} | set(a2 - attrs)
        if extra:
            NEG[k] = frozenset(extra)


def pos_of(o, use_nth, pos):
    if use_nth:
        return f':nth-child({o.nth})'
    if pos == 'first':
        return ':first-child' if o.first else ':not(:first-child)'
    if pos == 'last':
        return ':last-child' if o.last else ':not(:last-child)'
    return None


def make_sel(o, depth, use_nth=False, parent_strict=False, pos=None):
    """root, then `depth` nearest classed ancestors (far to near), then [parent >] own."""
    own = (o.tag if not o.own[1] else None, o.own[1], o.own[2])
    if not o.chain:
        return [(' ', own, None, frozenset())]
    root = o.chain[-1]
    strict = parent_strict or not own[1]
    anc = o.chain[1:] if strict else o.chain
    picked = []
    for c in anc:
        if len(picked) >= depth:
            break
        if c[1] and c is not root:
            picked.append(c)
    seq = [(' ', root, None)]
    for c in reversed(picked):
        seq.append((' ', c, None))
    if strict and o.chain[0] is not root:
        seq.append((' ', o.chain[0], None))
    seq.append(('>' if strict else ' ', own, pos_of(o, use_nth, pos), NEG.get(own, frozenset())))
    return [x if len(x) == 4 else x + (frozenset(),) for x in seq]


def consensus(group, key='P'):
    """props all members agree on (missing counts as a value); returns (agreed, disagreeing prop names)."""
    keys = set()
    for o in group:
        keys |= set(getattr(o, key))
    agreed, bad = {}, []
    for k in sorted(keys):
        vals = {getattr(o, key).get(k, '<none>') for o in group}
        if len(vals) == 1:
            v = vals.pop()
            if v != '<none>':
                agreed[k] = v
        else:
            bad.append(k)
    return agreed, bad


def assign(obs, maxdepth=6):
    """Group observations by selector; a group that disagrees is first tried as a first-child/last-child split (rows
    of a list that differ only by being first or last), then deepened, then pinned to its parent, then numbered."""
    level = {id(o): (1, False, False, None) for o in obs}

    def sel_of(o):
        d, nth, strict, pos = level[id(o)]
        return make_sel(o, d, nth, strict, pos)

    for it in range(60):
        groups = defaultdict(list)
        for o in obs:
            groups[sel_str(sel_of(o))].append(o)
        changed = False
        for s_, g in groups.items():
            ag, bad = consensus(g)
            if not bad:
                continue
            d0, nth0, strict0, pos0 = level[id(g[0])]
            split = None
            if pos0 is None and not nth0:
                for key, attr in (('first', 'first'), ('last', 'last')):
                    a = [o for o in g if getattr(o, attr)]
                    b = [o for o in g if not getattr(o, attr)]
                    if a and b and not consensus(a)[1] and not consensus(b)[1]:
                        split = key
                        break
            if split:
                for o in g:
                    d, nth, strict, _ = level[id(o)]
                    level[id(o)] = (d, nth, strict, split)
                changed = True
                continue
            for o in g:
                d, nth, strict, pos = level[id(o)]
                if d < maxdepth and d <= len([c for c in o.chain if c[1]]):
                    level[id(o)] = (d + 1, nth, strict, pos); changed = True
                elif not strict:
                    level[id(o)] = (d, nth, True, pos); changed = True
                elif not nth:
                    level[id(o)] = (d, True, strict, None); changed = True
        if not changed:
            break
    groups = defaultdict(list)
    for o in obs:
        groups[sel_str(sel_of(o))].append((o, sel_of(o)))
    return groups


def leakfix(rules, obs, log):
    rules.sort(key=lambda r: spec(r[0]))
    for it in range(6):
        fixes = 0
        for o in obs:
            hit = [r for r in rules if matches(r[0], o)]
            own = [r for r in hit if o in r[2]]
            if not own:
                log.append(f'NOMATCH {o.state} {o.x}')
                continue
            own_rule = own[-1]
            eff = {}
            for r in hit:
                eff.update(r[1])
            for k in set(eff) | set(o.P):
                want, have = o.P.get(k), eff.get(k)
                if want == have:
                    continue
                if want is None:
                    if k not in own_rule[1]:
                        own_rule[1][k] = 'unset' if k != 'display' else o.comp.get(k)
                        fixes += 1
                elif own_rule[1].get(k) != want:
                    own_rule[1][k] = want
                    fixes += 1
        if not fixes:
            break
    resid = 0
    for o in obs:
        hit = [r for r in rules if matches(r[0], o)]
        eff = {}
        for r in sorted(hit, key=lambda r: spec(r[0])):
            eff.update(r[1])
        for k in set(eff) | set(o.P):
            if o.P.get(k) != eff.get(k) and not (o.P.get(k) is None and eff.get(k) == 'unset'):
                resid += 1
                if resid < 60:
                    log.append(f'RESID {o.state} {o.tok if hasattr(o, "tok") else ""} {sel_str(make_sel(o,1))} {k} want={o.P.get(k)} have={eff.get(k)}')
    log.append(f'RESIDUAL {resid}')


def build_rules(obs, log):
    NEG.clear()
    groups = assign(obs)
    rules = []
    for s_, items in groups.items():
        g = [o for o, _ in items]
        ag, bad = consensus(g)
        for k in bad:
            c = Counter(o.P.get(k, '<none>') for o in g)
            v, n = c.most_common(1)[0]
            log.append(f'CONFLICT {s_} {k} {dict(c)}')
            if v != '<none>':
                ag[k] = v
        rules.append([list(items[0][1]), ag, g])
    exclude(rules, obs, log)
    leakfix(rules, obs, log)
    return rules


def exclude(rules, obs, log):
    """A rule must not reach an element it does not own: add :not() on the subject for whatever class or state
    attribute sets the stray element apart. Where nothing on the subject sets it apart, the stray is left to
    the leak fix (its own rule is then more specific, or it is reported)."""
    for it in range(4):
        changed = 0
        for r in rules:
            sel, props, members = r
            subj = sel[-1]
            mem_own = [(o.tag, o.own[1], o.own[2]) for o in members]
            for o in obs:
                if o in members or not matches(sel, o):
                    continue
                extra = sorted(['.' + c for c in o.own[1] if c not in subj[1][1]] + [a for a in o.own[2] if a not in subj[1][2]])
                # only a mark no member carries
                extra = [x for x in extra if not any((x[1:] in m[1]) if x.startswith('.') else (x in m[2]) for m in mem_own)]
                if extra and extra[0] not in subj[3]:
                    subj = (subj[0], subj[1], subj[2], subj[3] | {extra[0]})
                    changed += 1
            sel[-1] = subj
        if not changed:
            break


def own_sel(rules):
    m = {}
    for sel, props, g in rules:
        for o in g:
            m[(o.state, o.x)] = sel
    return m


BASE_DECL = {'box-sizing': 'border-box', 'vertical-align': 'baseline', 'border': '0'}
BLOCK_TAGS = {'div', 'p', 'section', 'header', 'aside', 'nav', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ol', 'ul', 'dl', 'dd', 'dt', 'form', 'main', 'footer', 'article'}
INLINE_TAGS = {'span', 'b', 'small', 'em', 'i', 'u', 'a', 'strong', 'kbd', 'label', 'code'}


def css_rule(sel, props, heading=False, tags=()):
    c = compress(props)
    for k, v in BASE_DECL.items():
        if c.get(k) == v:
            del c[k]
    if tags and 'display' in c:
        if (c['display'] == 'block' and all(t in BLOCK_TAGS for t in tags)) or (c['display'] == 'inline' and all(t in INLINE_TAGS for t in tags)):
            del c['display']
    if not c:
        return ''
    body = ';\n  '.join(f'{k}: {v}' + (' !important' if heading and k.startswith('font') else '') for k, v in sorted(c.items()))
    return f'{sel} {{\n  {body};\n}}\n'


def subst_vars(v, root):
    for _ in range(5):
        m = re.search(r'var\((--[\w-]+)(?:,\s*([^()]*(?:\([^()]*\))?[^()]*))?\)', v)
        if not m:
            break
        val = root.get(m.group(1), '').strip() or (m.group(2) or '').strip()
        v = v[:m.start()] + val + v[m.end():]
    return v


def main():
    base_path, out_path = sys.argv[1], sys.argv[2]
    log = []
    d, obs = load(base_path)
    base = [o for o in obs if not o.state.startswith('new')]
    rules = build_rules(base, log)
    sel_of = own_sel(rules)
    bykey = {(o.state, o.x): o for o in obs}
    out = [HEADER_TEXT]
    head = lambda g: any(o.tag in ('h1', 'h2', 'h3') for o in g)
    for sel, props, g in sorted(rules, key=lambda r: spec(r[0])):
        out.append(css_rule(sel_str(sel), props, head(g), {o.tag for o in g}))
    # ── pseudo-elements ──
    pz = defaultdict(list)
    for o in base:
        for k, pp in o.pseudo.items():
            pz[sel_str(sel_of[(o.state, o.x)]) + k].append(pp)
    for s_, lst in pz.items():
        keys = set().union(*lst)
        ag = {}
        for k in keys:
            c = Counter(p.get(k, '<none>') for p in lst)
            v = c.most_common(1)[0][0]
            if len(c) > 1:
                log.append(f'PSEUDO {s_} {k} {dict(c)}')
            if v != '<none>':
                ag[k] = v
        out.append(css_rule(s_, ag))
    # ── hover ──
    hz = defaultdict(list)
    for o in base:
        if not o.hover:
            continue
        hb, hv = dict((x, v) for x, v in o.hover['base']), dict((x, v) for x, v in o.hover['hover'])
        me = sel_str(sel_of[(o.state, o.x)])
        for x, after in hv.items():
            before = hb.get(x, {})
            diff = {k: v for k, v in after.items() if before.get(k) != v and k not in ('width', 'max-width')}
            if not diff:
                continue
            if x == o.x:
                s_ = me + ':hover'
            else:
                dd = bykey.get((o.state, x))
                if not dd:
                    continue
                own = (dd.tag if not dd.own[1] else None, dd.own[1], dd.own[2])
                s_ = me + ':hover ' + cmp_str(own)
            hz[s_].append(diff)
    for s_, lst in hz.items():
        keys = set().union(*lst)
        ag = {}
        for k in keys:
            c = Counter(p.get(k, '<none>') for p in lst)
            v = c.most_common(1)[0][0]
            if v != '<none>':
                ag[k] = v
        if ag:
            out.append(css_rule(s_, ag))
    # ── responsive buckets ──
    BUCKETS = [(1440, '(max-width: 1440px)'), (1360, '(max-width: 1360px)'), (1280, '(max-width: 1300px)')]
    prevP = {(o.state, o.x): dict(o.P) for o in base}
    for w, mq in BUCKETS:
        try:
            _, ow = load(base_path.replace('1512', str(w)))
        except FileNotFoundError:
            continue
        bucket = defaultdict(list)
        bypath = defaultdict(list)
        for b0 in base:
            bypath[b0.path].append(b0)
        for o in ow:
            if o.state.startswith('new'):
                continue
            hits = bypath.get(o.path, [])
            if len(hits) != 1:
                continue
            b = hits[0]
            k = (b.state, b.x)
            diff = {kk: vv for kk, vv in o.P.items() if prevP[k].get(kk) != vv}
            for kk in prevP[k]:
                if kk not in o.P and kk not in DROP_IF:
                    diff[kk] = 'unset'
            if diff:
                bucket[sel_str(sel_of[k])].append(diff)
                prevP[k].update(o.P)
        txt = ''
        for s_, lst in bucket.items():
            keys = set().union(*lst)
            ag = {}
            for k in keys:
                c = Counter(p.get(k, '<none>') for p in lst)
                v = c.most_common(1)[0][0]
                if v != '<none>':
                    ag[k] = v
            r = css_rule(s_, ag)
            if r:
                txt += '  ' + r.replace('\n', '\n  ').rstrip() + '\n'
        if txt:
            out.append(f'@media {mq} {{\n{txt}}}\n')
    # ── the empty state: overrides under .p6.p6-new ──
    new = [o for o in obs if o.state.startswith('new')]
    nrules = build_rules(new, log)
    base_by = {sel_str(sel): props for sel, props, g in rules}
    for sel, props, g in sorted(nrules, key=lambda r: spec(r[0])):
        s_ = sel_str(sel)
        bp = base_by.get(s_, {})
        diff = {k: v for k, v in props.items() if bp.get(k) != v}
        if s_ in base_by:
            for k in bp:
                if k not in props:
                    diff[k] = 'unset'
        if not diff:
            continue
        if s_.startswith('.p6 ') or s_ == '.p6':
            s_ = '.p6.p6-new' + s_[3:]
        else:
            continue
        out.append(css_rule(s_, diff, head(g)))
    # ── keyframes ──
    root = next(o.comp for o in base if not o.chain and 'p6' in o.own[1])
    for name, frames in sorted(d['keyframes'].items()):
        body = ''
        for f in frames:
            pr = {}
            for n, v in f['props']:
                pr[n] = subst_vars(v, root)
            body += '  ' + f['key'] + ' { ' + '; '.join(f'{n}: {hexify(v)}' for n, v in pr.items()) + '; }\n'
        out.append(f'@keyframes {P}{name} {{\n{body}}}\n')
    open(out_path, 'w').write(''.join(out))
    json.dump({'log': log}, open(out_path + '.log.json', 'w'), indent=1)
    print(len(rules), 'rules,', len(nrules), 'new-state rules,', len(log), 'log', file=sys.stderr)




# ── compression (applied at emission) ────────────────────────────────────────────────────────
SHORTHANDS = {'font', 'border', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-width',
              'border-style', 'border-color', 'border-radius', 'background', 'margin', 'padding', 'inset', 'gap',
              'grid-gap', 'transition', 'animation', 'flex', 'flex-flow', 'grid', 'grid-area', 'grid-template',
              'grid-row', 'grid-column', 'outline', 'list-style', 'text-decoration', 'overflow', 'place-items',
              'place-content', 'place-self', 'columns', 'border-image', 'mask', '-webkit-mask', 'font-variant',
              'text-emphasis', 'border-block', 'border-inline', 'margin-block', 'margin-inline', 'padding-block',
              'padding-inline', 'inset-block', 'inset-inline', 'scroll-margin', 'scroll-padding', 'container',
              'white-space', 'border-spacing', 'offset', 'contain-intrinsic-size', 'text-wrap', 'background-position'}
DROP_IF = {
    'border-image-outset': '0', 'border-image-repeat': 'stretch', 'border-image-slice': '100%',
    'border-image-source': 'none', 'border-image-width': '1', 'background-attachment': ('initial', 'scroll'),
    'background-clip': ('initial', 'border-box'), 'background-origin': ('initial', 'padding-box'),
    'background-position-x': ('initial', '0%'), 'background-position-y': ('initial', '0%'),
    'background-repeat': ('initial', 'repeat'), 'background-size': ('initial', 'auto'),
    'font-variant-alternates': 'normal', 'font-variant-caps': 'normal', 'font-variant-east-asian': 'normal',
    'font-variant-emoji': 'normal', 'font-variant-position': 'normal', 'font-variant-ligatures': 'normal',
    'font-variant-numeric': 'normal', 'font-kerning': 'auto', 'font-language-override': 'normal',
    'font-size-adjust': 'none', 'font-feature-settings': 'normal', 'font-variation-settings': 'normal',
    'font-optical-sizing': 'auto', 'font-stretch': ('100%', 'normal'), 'transition-behavior': None,
    'animation-composition': None, 'animation-range-start': None, 'animation-range-end': None,
    'animation-timeline': None, 'text-indent': '0px', 'grid-template-areas': 'none',
    'text-decoration-thickness': 'auto', 'text-decoration-style': 'solid', 'text-underline-position': None,
    'border-image': None, 'mask-clip': None, 'mask-composite': None, 'mask-mode': None, 'mask-origin': None,
    'mask-repeat': None, 'mask-size': None, 'mask-position-x': None, 'mask-position-y': None,
}


def hexify(v):
    def rep(m):
        parts = [x.strip() for x in m.group(2).split(',')]
        try:
            r, g, b = (int(float(x)) for x in parts[:3])
        except ValueError:
            return m.group(0)
        if len(parts) == 4:
            a = float(parts[3])
            if a >= 1:
                return '#%02x%02x%02x' % (r, g, b)
            return f'rgba({r},{g},{b},{round(a, 3)})'
        h = '#%02x%02x%02x' % (r, g, b)
        if h[1] == h[2] and h[3] == h[4] and h[5] == h[6]:
            h = '#' + h[1] + h[3] + h[5]
        return h
    return re.sub(r'(rgba?)\(([^()]*)\)', rep, v)


BG_INIT = {'background-image': 'none', 'background-attachment': 'scroll', 'background-clip': 'border-box',
           'background-origin': 'padding-box', 'background-position-x': '0%', 'background-position-y': '0%',
           'background-repeat': 'repeat', 'background-size': 'auto', 'mask-image': 'none'}


def fix_lists(p):
    for k, init in BG_INIT.items():
        if k in p and ',' in p[k]:
            items = [x.strip() for x in re.split(r',(?![^()]*\))', p[k])]
            items = [init if x == 'initial' else x for x in items]
            if all(x == init for x in items) and k != 'background-image':
                del p[k]
            else:
                p[k] = ', '.join(items)


def compress(props):
    p = {k: v for k, v in props.items() if k not in SHORTHANDS}
    fix_lists(p)
    for k, iv in DROP_IF.items():
        if k in p and (iv is None or p[k] == iv or (isinstance(iv, tuple) and p[k] in iv) or p[k] == 'initial'):
            del p[k]
    if p.get('background-image') in ('initial', 'none') and 'background-color' in p:
        del p['background-image']
    sides = ('top', 'right', 'bottom', 'left')

    def box(prefix, fmt, name):
        ks = [fmt % s for s in sides]
        if all(k in p for k in ks) and (len({p[k] for k in ks}) == 1 or not any(p[k] == 'unset' for k in ks)):
            vals = [p.pop(k) for k in ks]
            t, r, b, l = vals
            if t == r == b == l:
                p[name] = t
            elif t == b and r == l:
                p[name] = f'{t} {r}'
            elif r == l:
                p[name] = f'{t} {r} {b}'
            else:
                p[name] = f'{t} {r} {b} {l}'
    box('margin', 'margin-%s', 'margin')
    box('padding', 'padding-%s', 'padding')
    # radii
    rk = ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius']
    if all(k in p for k in rk) and (len({p[k] for k in rk}) == 1 or not any(p[k] == 'unset' for k in rk)):
        vals = [p.pop(k) for k in rk]
        p['border-radius'] = vals[0] if len(set(vals)) == 1 else ' '.join(vals)
    # borders: drop colours where the side draws nothing
    for s in sides:
        if p.get(f'border-{s}-style') in ('none', 'hidden') or p.get(f'border-{s}-width') == '0px':
            p.pop(f'border-{s}-color', None)
    w = [p.get(f'border-{s}-width') for s in sides]
    st = [p.get(f'border-{s}-style') for s in sides]
    co = [p.get(f'border-{s}-color') for s in sides]
    if all(x in ('none',) for x in st) and all(x in (None, '0px') for x in w):
        for s in sides:
            for t in ('width', 'style', 'color'):
                p.pop(f'border-{s}-{t}', None)
        p['border'] = '0'
    elif len(set(st)) == 1 and len(set(w)) == 1 and len(set(co)) == 1 and st[0] and w[0]:
        for s in sides:
            for t in ('width', 'style', 'color'):
                p.pop(f'border-{s}-{t}', None)
        p['border'] = ' '.join(x for x in (w[0], st[0], co[0]) if x)
    if 'row-gap' in p and 'column-gap' in p and not ('unset' in (p['row-gap'], p['column-gap']) and p['row-gap'] != p['column-gap']):
        r, c = p.pop('row-gap'), p.pop('column-gap')
        p['gap'] = r if r == c else f'{r} {c}'
    if all(k in p for k in ('flex-grow', 'flex-shrink', 'flex-basis')) and not any(p[k] == 'unset' for k in ('flex-grow', 'flex-shrink', 'flex-basis')):
        p['flex'] = f"{p.pop('flex-grow')} {p.pop('flex-shrink')} {p.pop('flex-basis')}"
    if 'overflow-x' in p and 'overflow-y' in p and not ('unset' in (p['overflow-x'], p['overflow-y']) and p['overflow-x'] != p['overflow-y']):
        x, y = p.pop('overflow-x'), p.pop('overflow-y')
        p['overflow'] = x if x == y else f'{x} {y}'
    tk = ['transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay']
    if all(k in p for k in tk):
        cols = [[x.strip() for x in re.split(r',(?![^()]*\))', p.pop(k))] for k in tk]
        n = len(cols[0])
        parts = []
        for i in range(n):
            prop, dur, tf, dl = (c[i % len(c)] for c in cols)
            s = f'{prop} {dur}' + ('' if tf == 'ease' else f' {tf}') + ('' if dl == '0s' else f' {dl}')
            parts.append(s)
        if not (n == 1 and cols[0][0] == 'all' and cols[1][0] == '0s'):
            p['transition'] = ', '.join(parts)
    if p.get('outline-style') == 'none':
        for k in ('outline-color', 'outline-width', 'outline-offset'):
            p.pop(k, None)
    # the app's own face tokens, declared at :root (shell/primitives.css): this sheet READS the two faces rather than
    # naming them, the house rule the marketing census holds
    FACES = {'"Special Elite", monospace': 'var(--sp-type)', '"Source Serif 4", Georgia, serif': 'var(--sp-serif)'}
    if p.get('font-family') in FACES:
        p['font-family'] = FACES[p['font-family']]
    return {k: hexify(v) for k, v in p.items()}


if __name__ == '__main__':
    main()
