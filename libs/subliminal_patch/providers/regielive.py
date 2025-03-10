# -*- coding: utf-8 -*-
from __future__ import absolute_import
import logging
import io
import os

from requests import Session
from guessit import guessit
from subliminal_patch.providers import Provider
from subliminal_patch.subtitle import Subtitle, guess_matches
from subliminal.subtitle import SUBTITLE_EXTENSIONS, fix_line_ending
from subliminal.video import Episode, Movie
from subzero.language import Language

import zipfile

logger = logging.getLogger(__name__)


class RegieLiveSubtitle(Subtitle):
    """RegieLive Subtitle."""
    provider_name = 'regielive'
    hash_verifiable = False

    def __init__(self, filename, video, link, rating, language):
        super(RegieLiveSubtitle, self).__init__(language)
        self.filename = filename
        self.page_link = link
        self.video = video
        self.rating = rating
        self.language = language
        self.release_info = filename

    @property
    def id(self):
        return self.page_link

    def get_matches(self, video):
        type_ = "movie" if isinstance(video, Movie) else "episode"
        matches = set()
        subtitle_filename = self.filename

        # episode
        if type_ == "episode":
            # already matched in search query
            matches.update(['title', 'series', 'season', 'episode', 'year'])
        # movie
        else:
            # already matched in search query
            matches.update(['title', 'year'])

        # release_group
        if video.release_group and video.release_group.lower() in subtitle_filename:
            matches.add('release_group')

        matches |= guess_matches(video, guessit(self.filename, {"type": type_}))

        return matches


class RegieLiveProvider(Provider):
    """RegieLive Provider."""
    languages = {Language(l) for l in ['ron']}
    language = list(languages)[0]
    video_types = (Episode, Movie)
    SEARCH_THROTTLE = 8

    def __init__(self):
        self.initialize()

    def initialize(self):
        self.session = Session()
        #self.url = 'http://api.regielive.ro/kodi/cauta.php'
        # this is a proxy API/scraper for subtitrari.regielive.ro used for subtitles search only
        self.url = 'http://subtitles.24-7.ro/index.php'
        self.api = 'API-KODI-KINGUL'
        self.headers = {'RL-API': self.api}

    def terminate(self):
        self.session.close()

    def query(self, video, language):
        payload = {}
        if isinstance (video, Episode):
            payload['nume'] = video.series
            payload['sezon'] = video.season
            payload['episod'] = video.episode
        elif isinstance(video, Movie):
            payload['nume'] = video.title
        payload['an'] = video.year
        response = self.session.post(self.url, data=payload, headers=self.headers)
        logger.info(response.json())
        subtitles = []
        if response.json()['cod'] == 200:
            results_subs = response.json()['rezultate']
            for film in results_subs:
                for sub in results_subs[film]['subtitrari']:
                    logger.debug(sub)
                    subtitles.append(
                            RegieLiveSubtitle(sub['titlu'], video, sub['url'], sub['rating'], language)
                    )

        # {'titlu': 'Chernobyl.S01E04.The.Happiness.of.All.Mankind.720p.AMZN.WEB-DL.DDP5.1.H.264-NTb', 'url': 'https://subtitrari.regielive.ro/descarca-33336-418567.zip', 'rating': {'nota': 4.89, 'voturi': 48}}
        # subtitle def __init__(self, language, filename, subtype, video, link):
        return subtitles

    def list_subtitles(self, video, languages):
        return self.query(video, self.language)

    def download_subtitle(self, subtitle):
        session = Session()
        _addheaders = {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:72.0) Gecko/20100101 Firefox/72.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Origin': 'https://subtitrari.regielive.ro',
            'Accept-Language' : 'en-US,en;q=0.5',
            'Referer': 'https://subtitrari.regielive.ro',
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
        }
        session.headers.update(_addheaders)
        res = session.get('https://subtitrari.regielive.ro')
        cookies = res.cookies
        _zipped = session.get(subtitle.page_link, cookies=cookies)
        if _zipped:
            if _zipped.text == '500':
                raise ValueError('Error 500 on server')
            archive = zipfile.ZipFile(io.BytesIO(_zipped.content))
            subtitle_content = self._get_subtitle_from_archive(archive)
            subtitle.content = fix_line_ending(subtitle_content)

            return subtitle
        raise ValueError('Problems conecting to the server')

    def _get_subtitle_from_archive(self, archive):
        # some files have a non subtitle with .txt extension
        _tmp = list(SUBTITLE_EXTENSIONS)
        _tmp.remove('.txt')
        _subtitle_extensions = tuple(_tmp)

        for name in archive.namelist():
            # discard hidden files
            if os.path.split(name)[-1].startswith('.'):
                continue

            # discard non-subtitle files
            if not name.lower().endswith(_subtitle_extensions):
                continue

            return archive.read(name)

        raise APIThrottled('Can not find the subtitle in the compressed file')
