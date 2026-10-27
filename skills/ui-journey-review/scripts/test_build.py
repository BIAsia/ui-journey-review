"""Contract coverage run by the repository's affected-path CI job."""
import copy
import json
from pathlib import Path
import tempfile
import unittest
from html.parser import HTMLParser

from build import build, validate

EXAMPLE = Path(__file__).parent.parent / 'assets/examples/viewer-walkthrough/journey.json'


class ExportParser(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.elements = []
        self.title = ''
        self.doctype = None
        self.in_title = False
        self.feed(html)

    def handle_decl(self, declaration):
        self.doctype = declaration

    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))
        if tag == 'title':
            self.in_title = True

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data


class JourneyBuildTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads(EXAMPLE.read_text())

    def test_portable_export_has_no_atlas_dependency(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            build(EXAMPLE, output)
            document = ExportParser((output / 'index.html').read_text())
            self.assertEqual(document.doctype.lower(), 'doctype html')
            for tag, attribute in [('script', 'src'), ('link', 'href')]:
                for element_tag, attributes in document.elements:
                    if element_tag != tag:
                        continue
                    name = attributes[attribute].split('?')[0]
                    if not name.startswith('data:'):
                        self.assertTrue((output / name).is_file())
            self.assertNotIn('@import', (output / 'journey.css').read_text())
            self.assertEqual(len(list((output / 'assets').iterdir())), 4)

    def test_missing_dark_capture_is_rejected(self):
        del self.data['screens']['zoom']['variants']['dark']
        with self.assertRaisesRegex(ValueError, 'light and dark'):
            validate(self.data, EXAMPLE.parent)

    def test_replaced_image_is_rejected(self):
        self.data['screens']['zoom']['variants']['dark']['sha256'] = '0' * 64
        with self.assertRaisesRegex(ValueError, 'checksum'):
            validate(self.data, EXAMPLE.parent)

    def test_external_asset_is_rejected(self):
        self.data['screens']['zoom']['variants']['dark']['src'] = 'assets/../../private.png'
        with self.assertRaisesRegex(ValueError, 'assets/'):
            validate(self.data, EXAMPLE.parent)

    def test_main_cannot_reference_collapsed_branch(self):
        branch_node = copy.deepcopy(self.data['graph']['nodes'].pop())
        self.data['branches'] = [{'id':'detail','from':'overview','title':'Details','action':'Open details',
            'bounds':{'x':0,'y':0,'width':1500,'height':1500},'nodes':[branch_node],'edges':[]}]
        with self.assertRaisesRegex(ValueError, 'collapsed node'):
            validate(self.data, EXAMPLE.parent)

    def test_branch_cannot_start_on_a_decision(self):
        self.data['graph']['nodes'].append({'id':'result','kind':'decision','title':'Ready?','x':0,'y':0})
        self.data['branches'] = [{'id':'detail','from':'result','title':'Details','action':'Open details',
            'bounds':{'x':0,'y':0,'width':500,'height':500},
            'nodes':[{'id':'detail-state','kind':'text','title':'State','x':0,'y':0}],'edges':[]}]
        with self.assertRaisesRegex(ValueError, 'main screen'):
            validate(self.data, EXAMPLE.parent)

    def test_missing_condition_position_is_rejected(self):
        del self.data['graph']['edges'][0]['labelAt']
        with self.assertRaisesRegex(ValueError, 'labelAt'):
            validate(self.data, EXAMPLE.parent)

    def test_title_is_serialized_as_text(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'source'
            source.mkdir()
            # No screens are needed for a single factual state node.
            data = {'schemaVersion':2,'id':'text','title':'<script>alert(1)</script>',
                    'screens':{},'graph':{'width':500,'height':500,'nodes':[
                        {'id':'state','kind':'text','title':'Done','x':10,'y':10}], 'edges':[]}}
            path = source / 'journey.json'
            path.write_text(json.dumps(data))
            output = Path(directory) / 'output'
            build(path, output)
            document = ExportParser((output / 'index.html').read_text())
            self.assertEqual(document.title, data['title'])
            self.assertEqual(len([tag for tag, attrs in document.elements if tag == 'script']), 2)


if __name__ == '__main__':
    unittest.main()
