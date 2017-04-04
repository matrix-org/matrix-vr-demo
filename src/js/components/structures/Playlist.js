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


import React from 'react';

export default class Playlist extends React.Component {
    constructor(props) {
        super(props);
        this.state = { loadIndex: -1};

        this.assets = document.querySelector('#assets #' + this.props.playlistId);
        this.loadNext = this.loadNext.bind(this);
    }

    componentDidMount() {
        this._createElements();
    }

    componentWillUnmount() {
        document.querySelectorAll('#assets #' + this.props.playlistId + ' video').forEach(function(video){
            video.removeEventListener('play', this.loadNext());
        }.bind(this));
    }

    _createElements() {
        this.props.items.forEach(function(item, index) {
            if (!document.getElementById(item.id)) {
                const video = document.createElement('video');
                video.setAttribute('id', item.id);
                video.setAttribute('crossOrigin', true);
                this.assets.appendChild(video);
            }
        }.bind(this));
        this.loadNext();
    }

    loadNext(e) {
        if (e) {
            e.target.removeEventListener('play', this.loadNext);
        }

        const loadIndex = this.state.loadIndex + 1;
        if (loadIndex < this.props.items.length) {
            console.log('Loading next video in playlist', this.props.playlistId);

            const item = this.props.items[loadIndex];
            const video = document.getElementById(item.id);
            if (!video.src) {
                video.setAttribute('src', item.src);
            } else {
                console.warn('Video ', item.id, ' has already been loaded');
            }

            this.setState({
                loadIndex: loadIndex,
            });
            video.addEventListener('play', this.loadNext);
        } else {
            console.log('All playlist items loaded');
        }
    }

    render() {
        return null;
    }
}

Playlist.propTypes = {
    playlistId: React.PropTypes.string.isRequired,
    items: React.PropTypes.arrayOf(React.PropTypes.shape({
    src: React.PropTypes.string.isRequired,
    id: React.PropTypes.string.isRequired,
   })).isRequired,
};
