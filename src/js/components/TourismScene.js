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


/*jshint esversion: 6 */
import {Entity} from 'aframe-react';
import React from 'react';
import Playlist from './structures/Playlist';
import {default as dispatcher} from '../common/dispatcher';

function degreesToRadians(degrees) {
    return degrees * Math.PI / 180.0;
}

const REFLECTION_PROPORTION = 1.0;

export default class TourismScene extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            videoIndex: 0,
        };
        this.mute = false;
        this.thetaStart = 0;
        this.thetaLength = 120;
        this.phiStart = 0;
        this.phiLength = 360;
        this.transformUvs = this.transformUvs.bind(this);
        // Bind methods
        this.onLoaded = this.onLoaded.bind(this);
        this.triggerDown = this.triggerDown.bind(this);
        this.clickHandler = this.clickHandler.bind(this);
        this.playNextVideo = this.playNextVideo.bind(this);
        this._onKeyEvent = this._onKeyEvent.bind(this);

        this.playlistItems = [
            {
                id: 'ski-video1',
                src: 'https://matrix.org/vrdemo_resources/video/360/ski1.mp4',
            },
            {
                id: 'ski-video2',
                src: 'https://matrix.org/vrdemo_resources/video/360/ski2.mp4',
            },
            {
                id: 'ski-video3',
                src: 'https://matrix.org/vrdemo_resources/video/360/ski3.mp4',
            },
            {
                id: 'ski-video4',
                src: 'https://matrix.org/vrdemo_resources/video/360/ski4.mp4',
            }];
    }

    onLoaded() {
        console.warn('TourismScene loaded.');
        const newIndex = 0;
        this.setState({videoIndex: newIndex});

        // Set up music
        this.music = document.getElementById('ski-sunday-music');
        this.music.currentTime = 0;
        if (this.music) this.music.play();

        // Set up videos
        this.videos = document.querySelectorAll('span#tourism video');
        this.transformUvs(0);

        // Play the video and set up event listeners
        this.videos[newIndex].addEventListener('ended', this.playNextVideo);
        dispatcher.on('keyEvent', this._onKeyEvent);
        this.videos[newIndex].currentTime = 0;
        this.videos[newIndex].play();
    }

    _onKeyEvent(key) {
        switch (key) {
            case 'n':
                console.log('Skipping video');
                this.videos[this.state.videoIndex].pause();
                this.playNextVideo();
                break;
            case 'm':
                this.toggleMuteAudio();
                break;
            default:
        }
    }

    triggerDown() {
        console.warn('Tourism scene detected triggerdown event');
        this.playNextVideo();
    }

    clickHandler() {
        console.warn('Tourism scene detected click event');
        this.playNextVideo();
    }

    toggleMuteAudio() {
        this.mute = !this.mute;
        if (this.mute) {
            console.warn('Muting scene audio');
            this.music.pause();
        } else {
            console.warn('Unmuting scene audio');
            this.music.play();
        }
    }

    videoEnded() {
        console.log('Video ended');
        // In case video is set to loop
        if (this.videos[this.state.videoIndex]) {
            this.videos[this.state.videoIndex].pause();
        }
        this.playNextVideo();
    }

    playNextVideo() {
        this.videos[this.state.videoIndex].removeEventListener('ended', this.playNextVideo);

        const newIndex = this.state.videoIndex + 1;
        this.setState({videoIndex: newIndex});

        if (newIndex < this.videos.length) {
            console.log('Playing next video in queue', this.videos[newIndex]);
            this.videos[newIndex].addEventListener('ended', this.playNextVideo);
            this.transformUvs(newIndex);
            this.videos[newIndex].currentTime = 0; // Seek to begining of video
            this.videos[newIndex].play();
        } else {
            console.warn('Reached end of tourism video playlist. Returning to lobby');
            dispatcher.emit('keyEvent', 'l');
        }
    }

    transformUvs(index) {
        this.videoSphere = document.getElementById('videoSphere' + (index+1));

        const phiStart = degreesToRadians(this.phiStart);
        const phiLength = degreesToRadians(this.phiLength);
        const thetaStart = degreesToRadians(this.thetaStart);
        const thetaLength = degreesToRadians(this.thetaLength);

        const vs = thetaStart / Math.PI;
        const vl = thetaLength / Math.PI;
        const ve = vs + vl;

        const uvs = this.videoSphere.object3D.children[0].geometry.attributes.uv.array;
        for (let i = 0; i < uvs.length; i+=2) {
            const u = uvs[i];
            let v = 1 - uvs[i+1];

            const phi = phiStart + (1 - u) * phiLength;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);

            // vs = vStart corresponding to thetaStart
            // vl = vLength corresponding to thetaLength
            // ve = vEnd = vs + vl corresponding to thetaEnd
            // 0 <= vs < ve <= 1
            if (v < vs) {
                v = REFLECTION_PROPORTION * (vs - v);
            } else if (v > ve) {
                v = 1 - REFLECTION_PROPORTION * (v - ve);
            } else {
                v = (v - vs) / vl;
            }
            const theta = 0.5 * v;
            uvs[i] = 0.5 + theta * sinPhi;
            uvs[i+1] = 0.5 + theta * cosPhi;
        }

        // setting here to avoid weirdness while recalculating UVs
        this.videoSphere.setAttribute('src', '#' + this.videos[index].id);
    }

    componentDidMount() {
        console.warn("Tourism scene component mounted");
        dispatcher.addListener('controllerTrigger', this.triggerDown);

        window.addEventListener('dblclick', this.clickHandler);
    }

    componentWillUnmount() {
        if (this.music) this.music.pause();
        if (this.videos[this.state.videoIndex]) {
            this.videos[this.state.videoIndex].pause();
            this.videos[this.state.videoIndex].removeEventListener('ended',
                this.playNextVideo);
        }
        dispatcher.removeListener('keyEvent', this._onKeyEvent);
        dispatcher.removeListener('controllerTrigger', this.triggerDown);
        window.removeEventListener('click', this.clickHandler);
    }

    render() {
        return (
            <Entity events={{
                loaded: this.onLoaded,
            }}>
                <Playlist playlistId='tourism' items={this.playlistItems}/>
                <a-videosphere
                    id='videoSphere1'
                    radius='100'
                    segments-height='21'
                    visible={this.state.videoIndex === 0}
                    mixin='ski-video1-mixin'></a-videosphere>
                <a-videosphere
                    id='videoSphere2'
                    radius='100'
                    segments-height='21'
                    visible={this.state.videoIndex === 1}
                    mixin='ski-video2-mixin'></a-videosphere>
                <a-videosphere
                    id='videoSphere3'
                    radius='100'
                    segments-height='21'
                    visible={this.state.videoIndex === 2}
                    mixin='ski-video3-mixin'></a-videosphere>
                <a-videosphere
                    id='videoSphere4'
                    radius='100'
                    segments-height='21'
                    visible={this.state.videoIndex === 3}
                    mixin='ski-video4-mixin'></a-videosphere>
                <a-entity ref='music' sound='src: #ski-sunday-music; autoplay: false; loop: true'></a-entity>
            </Entity>
        );
    }
}
