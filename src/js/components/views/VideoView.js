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
import 'aframe';
import {Entity} from 'aframe-react';
import 'aframe-look-at-component';

export default class VideoView extends React.Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {
        const video = document.getElementById(this.props.src);
        if (video && (video.paused || video.videoWidth <= 0)) {
            const playPromise = video.play();
            if (playPromise instanceof Promise) {
                playPromise.then(() => {}, console.warn);
            }
        }
    }

    componentWillUnmount() {
        const video = document.getElementById(this.props.src);
        if (video) {
            video.pause();
        }
    }

    render() {
        let text;
        if (this.props.text.length > 0) {
            text = <a-text
                    value={this.props.text}
                    width='3'
                    scale='0 0 0'
                    color='#ffffff'
                    align='center'
                    position={[0, -(this.props.height / 2) - 0.1, 0].join(' ')}>
                <a-animation
                    attribute='opacity'
                    dur='500'
                    from='0'
                    to={this.props.opacity}></a-animation>
                <a-animation
                    attribute='scale'
                    dur='1000'
                    from='0 0 0'
                    to='0.8 0.8 1'></a-animation>
            </a-text>;
        }

        const videoPlane = <a-plane
            src={'#' + this.props.src}
            width={this.props.width}
            height={this.props.height}
            scale='0 0 0'
            position={this.props.position.join(' ')}
            material='shader: flat; side: double'
            look-at={this.props.faceCamera ? '[camera]' : null}>
            <a-animation
                attribute='opacity'
                dur='500'
                from='0'
                to={this.props.opacity}></a-animation>
            <a-animation
                attribute='scale'
                dur='1000'
                from='0 0 0'
                to='1 1 1'></a-animation>
            {text}
        </a-plane>;

        return (
            <Entity rotation={this.props.rotation}>
                {videoPlane}
            </Entity>
        );
    }
}

VideoView.defaultProps = {
    faceCamera: true,
    height: 0.9,
    opacity: 1.0,
    position: [0, 0, -2],
    rotation: [0, 0, 0],
    text: '',
    width: 1.6,
};

VideoView.propTypes = {
    faceCamera: React.PropTypes.bool,
    height: React.PropTypes.number,
    opacity: React.PropTypes.number,
    position: React.PropTypes.array,
    rotation: React.PropTypes.array,
    src: React.PropTypes.string,
    text: React.PropTypes.string,
    width: React.PropTypes.number,
};
