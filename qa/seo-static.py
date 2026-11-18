"""SEO-only source invariants against the preserved, immutable public revision."""
from pathlib import Path
from html.parser import HTMLParser
import hashlib
import json
import re
import subprocess
import xml.etree.ElementTree as ET

BASE = '3922bb8b4b2b42307680b41f9e5d77e67e7571fc'
URL = 'https://esakits.github.io/ipa-keyboard/'
TITLE = 'Free Online IPA Keyboard – Interactive IPA Chart | esaKITs'
before = subprocess.check_output(['git', 'show', BASE + ':index.html']).decode()
after = Path('index.html').read_text()
assert before.split('</head>', 1)[1] == after.split('</head>', 1)[1], 'entire body and its scripts must be byte-identical'
assert re.findall(r'<style\b[^>]*>.*?</style>', before, re.S) == re.findall(r'<style\b[^>]*>.*?</style>', after, re.S), 'all CSS unchanged'
executable = lambda s: [m.group(0) for m in re.finditer(r'<script\b([^>]*)>.*?</script>', s, re.S) if 'application/ld+json' not in m.group(1)]
assert executable(before) == executable(after), 'every existing executable script unchanged'
for name in ['chart.html', 'i18n.js', 'language-picker.js', 'ipa-fonts.js', 'editor-gestures.js', 'diacritic-display.js', 'sw.js', 'translations.csv', 'translations.xlsx', 'apple-touch-icon.png']:
    assert Path(name).read_bytes() == subprocess.check_output(['git', 'show', BASE + ':' + name]), name
allowed = {'index.html', 'sitemap.xml', 'qa/production.cjs', 'qa/seo.cjs', 'qa/seo-static.py', 'qa/SEO.md', '.github/workflows/release-production.yml'}
changed = subprocess.check_output(['git', 'diff', '--name-only', BASE], text=True).splitlines()
assert set(changed) <= allowed, changed

class Head(HTMLParser):
    def __init__(self):
        super().__init__(); self.tags = []
    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))
h = Head(); h.feed(after.split('</head>', 1)[0])
def unique(tag, key, value):
    entries = [a for t, a in h.tags if t == tag and a.get(key) == value]
    assert len(entries) == 1, (tag, key, value, entries)
    return entries[0]
assert re.findall(r'<title>(.*?)</title>', after) == [TITLE]
description = unique('meta', 'name', 'description')['content']
assert 100 <= len(description) <= 180
assert unique('link', 'rel', 'canonical')['href'] == URL
assert '<html lang="ja">' in after
assert not any(a.get('hreflang') for t, a in h.tags)
assert not any('noindex' in a.get('content', '').lower() or 'nofollow' in a.get('content', '').lower() for t, a in h.tags if t == 'meta' and a.get('name', '').lower() in ['robots', 'googlebot', 'bingbot'])
for prop, expected in {'og:title': TITLE, 'og:description': description, 'og:url': URL, 'og:type': 'website', 'og:site_name': 'esaKITs', 'og:image': URL + 'apple-touch-icon.png', 'og:image:width': '180', 'og:image:height': '180'}.items():
    assert unique('meta', 'property', prop)['content'] == expected, prop
assert unique('meta', 'name', 'twitter:card')['content'] == 'summary'
ld = re.findall(r'<script type="application/ld\+json">(.*?)</script>', after, re.S)
assert len(ld) == 1
schema = json.loads(ld[0])
assert schema['@context'] == 'https://schema.org' and schema['@type'] == 'WebApplication'
assert schema['url'] == URL and schema['description'] == description
assert schema['name'] == 'esaKITs IPA Keyboard' and schema['softwareVersion'] == '83.34'
assert schema['inLanguage'] == ['ja', 'en', 'pt-BR', 'fa']
assert schema['isAccessibleForFree'] is True
assert schema['offers'] == {'@type': 'Offer', 'price': 0, 'priceCurrency': 'JPY'}
assert not set(schema) & {'review', 'aggregateRating', 'award', 'interactionStatistic', 'downloadUrl'}
root = ET.parse('sitemap.xml').getroot()
assert root.tag == '{http://www.sitemaps.org/schemas/sitemap/0.9}urlset'
assert [n.text for n in root.findall('.//{*}loc')] == [URL]
assert not root.findall('.//{*}lastmod')
assert not Path('robots.txt').exists(), 'do not add an ineffective subdirectory robots file'
result = {'baseline': BASE, 'title': TITLE, 'description': description, 'canonical': URL, 'bodySHA256': hashlib.sha256(after.split('</head>', 1)[1].encode()).hexdigest(), 'changed': changed, 'staticInvariants': 'PASS', 'schemaSyntax': 'PASS', 'richResultsEligibility': 'not claimed; no verified review/rating exists'}
Path('qa-production').mkdir(exist_ok=True)
Path('qa-production/seo-static-results.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result))
