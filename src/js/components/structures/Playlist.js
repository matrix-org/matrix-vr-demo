/*
Copyright 2017 Vector Creations Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/


export default class Playlist {
    constructor(playlist) {
        this.loadIndex = -1;
        this.playlist = playlist;
        this.assets = document.querySelector('#assets #' + this.playlist.playlistId);
        this._createElements();
    }

    cleanup() {
        document.querySelectorAll('#assets #' + this.playlist.playlistId + ' video')
            .forEach((video) => {
                video.removeEventListener('play', this.loadNext);
        });
    }

    _createElements() {
        console.warn("Creating %d playlist elements", this.playlist.items.length);
        this.playlist.items.forEach((item, index) => {
            if (!document.getElementById(item.id)) {
                const video = document.createElement('video');
                video.setAttribute('id', item.id);
                video.setAttribute('crossOrigin', true);
                this.assets.appendChild(video);
            }
        });
        this.loadNext();
    }

    loadNext(e) {
        if (e) {
            e.target.removeEventListener('play', this.loadNext);
        }

        this.loadIndex += 1;
        if (this.loadIndex < this.playlist.items.length) {
            console.log('Loading next video in playlist', this.playlist.playlistId);

            const item = this.playlist.items[this.loadIndex];
            const video = document.getElementById(item.id);
            if (!video.src) {
                video.setAttribute('src', item.src);
            } else {
                console.warn('Video ', item.id, ' has already been loaded');
            }

            // If already playing, load the next item in the playlist
            if (video.currentTime > 0 && !video.paused && !video.ended) {
                this.loadNext();
            } else {
                video.addEventListener('play', () => this.loadNext);
            }
        } else {
            console.log('All playlist items loaded');
        }
    }
}
