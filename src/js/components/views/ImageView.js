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

const IMAGE_ID_REGEX = /[^a-zA-Z0-9]/g;

export default class ImageView extends React.Component {
    constructor(props) {
        super(props);

        this._onLoaded = this._onLoaded.bind(this);

        const image = document.createElement('img');
        image.addEventListener('load', this._onLoaded);
        image.id = props.src.replace(IMAGE_ID_REGEX, '');
        image.src = props.src;
        document.body.appendChild(image);

        this.state = {
            image: image,
            width: 0,
            height: 0,
        };
    }

    _onLoaded() {
        let width = this.state.image.width;
        let height = this.state.image.height;
        const aspectRatio = width / height;
        if (aspectRatio > this.props.width / this.props.height) {
            width = this.props.width;
            height = width / aspectRatio;
        } else {
            height = this.props.height;
            width = height * aspectRatio;
        }
        this.setState({
            loaded: true,
            width: width,
            height: height,
        });
    }

    componentWillUnmount() {
        this.state.image.removeEventListener('loaded');
        document.body.removeChild(this.state.image);
    }

    render() {
        let imagePlane;

        if (this.state.loaded) {
            const imagePlaneProps = {
                'width': this.state.width,
                'height': this.state.height,
                'scale': '0 0 0',
                'position': this.props.position.join(' '),
                'material': 'shader: flat; side: double',
                'look-at': this.props.faceCamera ? '[camera]' : null,
                'src': `#${this.state.image.id}`,
            };

            imagePlane = <a-plane {...imagePlaneProps} >
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
            </a-plane>;
        }

        return (
            <Entity rotation={this.props.rotation}>
                {imagePlane}
            </Entity>
        );
    }
}

ImageView.defaultProps = {
    faceCamera: true,
    height: 0.9,
    opacity: 1.0,
    position: [0, 0, -2],
    rotation: [0, 0, 0],
    width: 1.6,
};

ImageView.propTypes = {
    faceCamera: React.PropTypes.bool,
    height: React.PropTypes.number,
    opacity: React.PropTypes.number,
    position: React.PropTypes.array,
    rotation: React.PropTypes.array,
    src: React.PropTypes.string,
    width: React.PropTypes.number,
};
