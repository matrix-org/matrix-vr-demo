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
import {Entity} from 'aframe-react';
import Call from '../structures/Call';
import Playlist from '../structures/Playlist';
import {default as dispatcher} from '../../common/dispatcher';
import 'aframe-look-at-component';

export default class Ringback extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            videoIndex: 0,
            muted: false,
        };
        this.startRingback = this.startRingback.bind(this);
        this.stopRingback = this.stopRingback.bind(this);
        this.ringbackHidden = this.ringbackHidden.bind(this);
        this.playNextVideo = this.playNextVideo.bind(this);
        this.playVideo = this.playVideo.bind(this);
        this.queueVideo = this.queueVideo.bind(this);
        this._onKeyEvent = this._onKeyEvent.bind(this);
        this.videos = [];
        this.showAnimationLength = 1500;
        this.hideAnimationLength = 750;

        this.showRingbackTimeout = null;
        this.showVideoTimeout = null;
        this.playVideoTimeout = null;

        this.playlist = new Playlist({
            playlistId: 'ringback',
            items: [
                {
                    id: 'ringback-welcome',
                    src: 'https://matrix.org/vrdemo_resources/video/ringback/Welcome_to_Matrix_in_VR.mp4',
                },
                {
                    id: 'ringback-you-are-being',
                    src: 'https://matrix.org/vrdemo_resources/video/ringback/You_Are_Being.mp4',
                },
                {
                    id: 'ringback-still-waiting',
                    src: 'https://matrix.org/vrdemo_resources/video/ringback/Still_Waiting.mp4',
                },
                {
                    id: 'ringback-please-wait',
                    src: 'https://matrix.org/vrdemo_resources/video/ringback/Please_Wait.mp4',
                },
            ],
        });
    }

    componentDidMount() {
        if (this.props.ringbackDidMount && typeof this.props.ringbackDidMount === 'function') {
            this.props.ringbackDidMount();
        }

        if (this.props.call) {
            this.props.call.on('callActive', this.stopRingback);
        }

        this.videos = document.querySelectorAll('span#ringback video');
        this.videos[this.state.videoIndex].addEventListener('ended', this.playNextVideo);
        // console.warn('Videos:', this.videos, this.videos[this.state.videoIndex]);

        dispatcher.on('keyEvent', this._onKeyEvent);

        if (!this.props.ringbackPlayed) {
            dispatcher.addListener('transitionInComplete', this.startRingback);
        } else {
            console.warn('Ringback has already been played. Not starting');
        }
    }

    componentWillUnmount() {
        this.stopVideo();
        this.refs.videoPlane.removeEventListener('animationend', this.ringbackHidden);
        dispatcher.removeListener('keyEvent', this._onKeyEvent);

        if (this.showRingbackTimeout) clearTimeout(this.showRingbackTimeout);
        if (this.showVideoTimeout) clearTimeout(this.showVideoTimeout);
        if (this.playVideoTimeout) clearTimeout(this.playVideoTimeout);

        // Clean up an unused / incomplete playlist resources
        this.playlist.cleanup();

        // Callback to parent when component will unmount
        if (this.props.ringbackDidUnmount && typeof this.props.ringbackDidUnmount === 'function') {
            this.props.ringbackDidUnmount();
        }
    }

    _onKeyEvent(key) {
        switch (key) {
            case 'm':
                this.toggleMute();
                break;
            case 'p':
                this.togglePauseVideo();
                break;
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (!prevProps.call && this.props.call) {
            console.warn('Ringback adding call active listener', this.props.call);
            this.props.call.on('callActive', this.stopRingback);
        }
    }

    startRingback() {
        console.warn('Ringback: scene loaded');
        dispatcher.removeListener('transitionInComplete', this.startRingback);
        this.setState({videoIndex: 0});

        this.showRingbackTimeout = setTimeout(() => {
            this.showRingbackTimeout = null;
            this.refs.videoPlane.emit('showRingback');
            this.playVideoTimeout = setTimeout(() => {
                this.playVideoTimeout = null;
                console.warn('Starting ringback video');
                this.playVideo(0);

                if (this.props.ringbackDidPlay) {
                    this.props.ringbackDidPlay();
                }
            }, 500);
        }, this.props.startDelay);
    }

    stopRingback() {
        console.warn('Stopping ringback');
        if (!this.videos[this.state.videoIndex].paused) {
            this.videos[this.state.videoIndex].pause();
        }
        if (this.refs.videoPlane) {
            this.refs.videoPlane.addEventListener('animationend', this.ringbackHidden);
            this.refs.videoPlane.emit('hideRingback');
        }
    }

    ringbackHidden(e) {
        this.refs.videoPlane.removeEventListener('animationend', this.ringbackHidden);
        dispatcher.removeListener('keyEvent', this._onKeyEvent);

        const ele = e.target || e.srcElement; // for IE
        if (ele.id === 'ringbackHideScale' || ele.id === 'ringbackHideOpacity') {        // Ringback hide complete
            console.warn('Ringback hide complete');
            if (this.props.ringbackDidHide && typeof this.props.ringbackDidHide === 'function') {
                this.props.ringbackDidHide();
            }
        }
    }

    playNextVideo() {
        if (!this.videos[this.state.videoIndex].paused) {
            this.videos[this.state.videoIndex].pause();
        }
        this.videos[this.state.videoIndex].removeEventListener('ended', this.playNextVideo);
        const prevVideoIndex = this.state.videoIndex;
        setTimeout(() => {
            this.videos[prevVideoIndex].currentTime = 0;
        }, this.hideAnimationLength);
        let videoIndex = this.state.videoIndex + 1;

        if (this.hasLooped ||
                (this.props.loopRingback &&
                (videoIndex >= this.videos.length || !this.props.call))) {
            this.hasLooped = true;
            videoIndex = 0;
        }


        if (videoIndex < this.videos.length) {
            const delayMixin = document.getElementById(this.videos[videoIndex].id + '-mixin');
            let delayStart = 0;
            if (delayMixin && delayMixin.getAttribute('delay')) {
                delayStart = Number(delayMixin.getAttribute('delay'));
            } else if (videoIndex === 0) {
                delayStart = this.props.startDelay;
            }

            if (delayStart > 0) {
                this.queueVideo(delayStart, videoIndex);
            } else {
                this.playVideo(videoIndex);
            }
        } else {
            this.stopRingback();
        }
    }

    playVideo(videoIndex) {
        console.warn('Playing video ' + this.videos[videoIndex].id);

        this.setState({
            videoIndex: videoIndex,
        });
        this.videos[videoIndex].addEventListener('ended', this.playNextVideo);

        this.playVideoTimeout = null;

        // Ensure that current mute status is preserved
        this.videos[videoIndex].muted = this.state.muted;
        this.videos[videoIndex].play();
    }

    toggleMute() {
        if (this.state.muted) {
            console.warn("Un-muting ringback video");
        } else {
            console.warn("Muting ringback video");
        }
        this.videos[this.state.videoIndex].muted = !this.state.muted;
        this.setState({muted: !this.state.muted});
    }

    togglePauseVideo() {
        if (this.videos[this.state.videoIndex].paused) {
            console.warn("Un-pausing ringback video");
            this.videos[this.state.videoIndex].play();
        } else {
            console.warn("Pausing ringback video");
            this.videos[this.state.videoIndex].pause();
        }
    }

    stopVideo() {
        console.warn('Stopping ringback video');
        this.videos[this.state.videoIndex].pause();
    }

    queueVideo(delay, videoIndex) {
        console.warn('Waiting %d before playing next video', delay);
        if (delay > this.hideAnimationLength + this.showAnimationLength) {
            this.refs.videoPlane.emit('hideRingback');
            this.showRingbackTimeout = setTimeout(() => {
                this.setState({
                    videoIndex: videoIndex,
                });
                this.videos[videoIndex].addEventListener('ended', this.playNextVideo);

                this.showRingbackTimeout = null;
                this.refs.videoPlane.emit('showRingback');
            }, delay - (this.hideAnimationLength + this.showAnimationLength));
            this.playVideoTimeout = setTimeout(() => this.playVideo(videoIndex), delay);
        } else {
            this.playVideoTimeout = setTimeout(() => {
                this.setState({
                    videoIndex: videoIndex,
                });
                this.videos[videoIndex].addEventListener('ended', this.playNextVideo);

                this.playVideo(videoIndex);
            }, delay);
        }
    }

    render() {
        return (
            <Entity
            rotation={this.props.rotation}>
                {this.videos[this.state.videoIndex] && (
                <a-plane
                    id='videoPlane'
                    ref='videoPlane'
                    src={'#' + this.videos[this.state.videoIndex].id}
                    width={this.props.width}
                    height={this.props.height}
                    scale='0 0 0'
                    position={this.props.position.join(' ')}
                    material='shader: flat; side: double'
                    look-at={this.props.faceCamera ? '#camera' : null}>

                    {/*  Show Ringback animation */}
                    <a-animation
                        attribute='opacity'
                        dur='750'
                        from='0.5'
                        to={this.props.opacity}
                        begin='showRingback'>
                    </a-animation>
                    <a-animation
                        attribute='scale'
                        dur={this.showAnimationLength}
                        from='0 0 0'
                        to='1 1 1'
                        begin='showRingback'>
                    </a-animation>

                    {/*  Hide Ringback animation */}
                    <a-animation
                        id='ringbackHideOpacity'
                        attribute='opacity'
                        dur={this.hideAnimationLength}
                        from={this.props.opacity}
                        to='0'
                        begin='hideRingback'>
                    </a-animation>
                    <a-animation
                        id='ringbackHideScale'
                        attribute='scale'
                        dur={this.hideAnimationLength}
                        from='1 1 1'
                        to='0 0 0'
                        begin='hideRingback'>
                    </a-animation>
                </a-plane>)}
            </Entity>
        );
    }
}

Ringback.defaultProps = {
    faceCamera: true,
    height: 0.9,
    opacity: 1,
    position: [0, 0, -3],
    rotation: [0, 0, 0],
    text: '',
    width: 1.6,
    startDelay: 3000,
};

Ringback.propTypes = {
    faceCamera: React.PropTypes.bool,
    width: React.PropTypes.number,
    height: React.PropTypes.number,
    opacity: React.PropTypes.number,
    position: React.PropTypes.array,
    rotation: React.PropTypes.array,
    text: React.PropTypes.string,
    startDelay: React.PropTypes.number,
    call: React.PropTypes.instanceOf(Call),
    ringbackDidMount: React.PropTypes.func,
    ringbackDidUnmount: React.PropTypes.func,
    ringbackDidHide: React.PropTypes.func,
    ringbackPlayed: React.PropTypes.bool,
    ringbackDidPlay: React.PropTypes.func,
    loopRingback: React.PropTypes.bool,
};
