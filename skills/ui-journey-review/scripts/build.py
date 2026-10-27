"""Build a portable UI review canvas from JSON and verified local captures (Python 3.10+)."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import shutil
import xml.etree.ElementTree as ET
from xml.dom import minidom

RUNTIME = Path(__file__).resolve().parent


def require(condition, message):
    if not condition:
        raise ValueError(message)


def number(value):
    return type(value) in (int, float) and math.isfinite(value)


def point(value):
    return isinstance(value, list) and len(value) == 2 and all(number(n) for n in value)


def validate(data, base):
    """The single build-time contract; runtime guards only protect opening broken exports."""
    require(data.get('schemaVersion') == 2, 'schemaVersion must be 2')
    for key in ('id', 'title'):
        require(isinstance(data.get(key), str) and data[key].strip(), f'{key} is required')
    require(isinstance(data.get('subtitle', ''), str), 'subtitle must be text')
    graph = data['graph']
    require(all(number(graph.get(k)) and graph[k] > 0 for k in ('width', 'height')), 'Invalid canvas size')
    require(isinstance(graph['nodes'], list) and graph['nodes'], 'A journey needs nodes')
    branches = data.get('branches', [])
    nodes = graph['nodes'] + [n for b in branches for n in b['nodes']]
    ids = [n['id'] for n in nodes]
    require(all(isinstance(i, str) and re.fullmatch(r'[A-Za-z][A-Za-z0-9_-]*', i) for i in ids), 'Use CSS-safe node IDs')
    require(len(ids) == len(set(ids)), 'Duplicate node ID')
    main_ids = {n['id'] for n in graph['nodes']}
    screen_ids = {n['id'] for n in graph['nodes'] if n['kind'] == 'screen'}
    branch_ids = [b['id'] for b in branches]
    require(all(isinstance(i, str) and i for i in branch_ids) and len(branch_ids) == len(set(branch_ids)), 'Invalid branch IDs')
    for n in nodes:
        require(n['kind'] in ('screen', 'decision', 'text'), f"{n['id']}: invalid kind")
        require(isinstance(n['title'], str) and n['title'].strip(), f"{n['id']}: missing title")
        require(all(number(n[k]) and n[k] >= 0 for k in ('x', 'y')), f"{n['id']}: invalid position")
        require(number(n.get('width', 160)) and n.get('width', 160) > 0, f"{n['id']}: invalid width")
        require(n['kind'] != 'screen' or n.get('screen') in data['screens'], f"{n['id']}: unknown screenshot")
    groups = [(graph['edges'], main_ids)]
    for b in branches:
        require(b['from'] in screen_ids and b['nodes'], f"{b['id']}: branch must start on a main screen")
        require(all(isinstance(b.get(k), str) and b[k].strip() for k in ('title', 'action')), 'Missing branch labels')
        bounds = b['bounds']
        require(all(number(bounds[k]) and bounds[k] >= 0 for k in ('x', 'y', 'width', 'height')) and bounds['width'] > 0 and bounds['height'] > 0, 'Invalid branch bounds')
        if 'hotspot' in b:
            h = b['hotspot']
            require(len(h) == 4 and all(number(v) and 0 <= v <= 100 for v in h) and h[2] > 0 and h[3] > 0 and h[0] + h[2] <= 100 and h[1] + h[3] <= 100, 'Invalid hotspot percentages')
        groups.append((b['edges'], main_ids | {n['id'] for n in b['nodes']}))
    for edges, visible_ids in groups:
        for e in edges:
            require(e['from'] in visible_ids and e['to'] in visible_ids, 'Edge references a missing or collapsed node')
            require(len(e['points']) >= 2 and all(point(p) for p in e['points']), 'Invalid edge points')
            require(e.get('tone', 'neutral') in ('neutral', 'error'), 'Only failures use semantic edge colors')
            require(not e.get('label') or (isinstance(e['label'], str) and point(e.get('labelAt'))), 'A labeled edge needs labelAt')
    require(all(target in ids for target in data.get('nodeAliases', {}).values()), 'Unknown alias target')
    files = {}
    for key, screen in data['screens'].items():
        require(set(screen.get('variants', {})) == {'light', 'dark'}, f'{key}: light and dark captures are required')
        for theme, v in screen['variants'].items():
            src = Path(v['src'])
            require(not src.is_absolute() and src.parts and src.parts[0] == 'assets' and '..' not in src.parts, f'{key}: capture path must be inside assets/')
            image = (base / src).resolve()
            require(image.is_relative_to(base.resolve()) and image.is_file(), f'{key}: missing or external capture')
            require(image.suffix.lower() in ('.png', '.jpg', '.jpeg', '.webp'), f'{key}: use raster screenshots')
            require(all(number(v.get(k)) and v[k] > 0 for k in ('width', 'height')), f'{key}: invalid image dimensions')
            require(hashlib.sha256(image.read_bytes()).hexdigest() == v.get('sha256'), f'{key}/{theme}: screenshot checksum mismatch')
            provenance = v.get('provenance', {})
            require(all(provenance.get(k) for k in ('sourceRevision', 'device', 'runtime', 'locale', 'captureDate')), f'{key}/{theme}: missing capture provenance')
            require(type(provenance.get('fixture')) is bool and provenance.get('theme') == theme, f'{key}/{theme}: declare fixture and theme')
            files[src] = image
    return files


def build(source, output):
    source, output = source.resolve(), output.resolve()
    data = json.loads(source.read_text(encoding='utf-8'))
    files = validate(data, source.parent)
    require(not output.is_relative_to(RUNTIME), 'Export outside the framework source directory')
    output.mkdir(parents=True, exist_ok=True)
    for src, image in files.items():
        target = output / src
        require(target.resolve().is_relative_to(output), 'Output asset escapes export directory')
        target.parent.mkdir(parents=True, exist_ok=True)
        if image != target.resolve():
            shutil.copyfile(image, target)
    for name in ('journey.js', 'journey.css'):
        shutil.copyfile(RUNTIME / name, output / name)
    # External scripts and DOM serialization keep content out of inline HTML parsing.
    script = 'journey-data.js'
    (output / script).write_text('window.JOURNEY = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + ';\n', encoding='utf-8')
    root = ET.Element('html', {'lang': 'en'})
    head = ET.SubElement(root, 'head')
    ET.SubElement(head, 'meta', {'charset': 'utf-8'})
    ET.SubElement(head, 'meta', {'name': 'viewport', 'content': 'width=device-width,initial-scale=1'})
    ET.SubElement(head, 'title').text = data['title']
    ET.SubElement(head, 'link', {'rel': 'icon', 'href': 'data:,'})

    def versioned(name):
        return name + '?v=' + hashlib.sha256((output / name).read_bytes()).hexdigest()[:12]

    ET.SubElement(head, 'link', {'rel': 'stylesheet', 'href': versioned('journey.css')})
    body = ET.SubElement(root, 'body')
    ET.SubElement(body, 'main', {'id': 'journey'})
    ET.SubElement(body, 'noscript').text = 'Enable JavaScript to view this journey'
    for name in (script, 'journey.js'):
        ET.SubElement(body, 'script', {'src': versioned(name)})
    document = minidom.parseString(ET.tostring(root, encoding='utf-8'))
    document.insertBefore(document.implementation.createDocumentType('html', '', ''), document.documentElement)
    # HTML script elements need explicit closing tags even when empty.
    for element in document.getElementsByTagName('script'):
        element.appendChild(document.createTextNode(''))
    (output / 'index.html').write_bytes(document.toxml(encoding='utf-8'))
    manifest = {'journey': data['id'], 'inputSHA256': hashlib.sha256(source.read_bytes()).hexdigest(),
                'frameworkSHA256': {name: hashlib.sha256((RUNTIME / name).read_bytes()).hexdigest() for name in ('build.py', 'journey.js', 'journey.css')},
                'screenshots': len(files)}
    (output / 'build-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(f"Built {data['id']}: {len(files)} verified captures → {output / 'index.html'}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('journey', type=Path, help='Journey JSON; asset paths are relative to this file')
    parser.add_argument('--output', required=True, type=Path, help='Dedicated generated review directory')
    args = parser.parse_args()
    try:
        build(args.journey, args.output)
    except (ValueError, KeyError, TypeError, OSError) as error:
        parser.exit(1, f'Cannot build journey: {error}\n')
