import unittest
from scripts.build_horse_photos import photo_ids

class PhotoIdentityTest(unittest.TestCase):
    def test_matching_horse_only_and_deduplication(self):
        text = 'show_photo.php?horse_id=2018103559&amp;no=71108 show_photo.php?horse_id=2018103559&no=71108 show_photo.php?horse_id=2019103559&no=999'
        self.assertEqual(photo_ids(text, '2018103559'), ['71108'])

    def test_empty_page(self):
        self.assertEqual(photo_ids('no photo', '2018103559'), [])
