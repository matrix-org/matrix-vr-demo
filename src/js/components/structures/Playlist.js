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
        this.state = { loadIndex: 0};

        this.loadNext = this.loadNext.bind(this);
    }

    loadNext(e) {
        e.target.removeEventListener('play', this.loadNext);

        if (this.state.loadIndex < this.props.items.length) {
            console.log('Loading next video in playlist', e);
            this.setState({
                loadIndex: this.state.loadIndex + 1,
            });
        } else {
            console.log('All playlist items loaded');
        }
    }

    render() {
        return (
            <span id={this.props.playlistId}>
                {this.props.items.map(function(item, index) {
                    if (index <= this.state.loadIndex) {
                        return <video id={item.id}
                            key={index}
                            src={item.src}
                            onPlay={this.loadNext}
                            crossOrigin></video>;
                    }

                    return <video id={item.id}
                        key={index}
                        crossOrigin></video>;
                }.bind(this))}
            </span>
         );
    }
}

Playlist.propTypes = {
    playlistId: React.PropTypes.string.isRequired,
    items: React.PropTypes.arrayOf(React.PropTypes.shape({
     src: React.PropTypes.string.isRequired,
     id: React.PropTypes.string.isRequired,
   })).isRequired,
};
