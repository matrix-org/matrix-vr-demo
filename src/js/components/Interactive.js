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


import AFRAME from 'aframe';

const DEFAULT_HIGHLIGHT_COLOR = '#FFF';

AFRAME.registerComponent('interactive', {
    schema: {
        highlightColor: {default: DEFAULT_HIGHLIGHT_COLOR},
        opacity: {default: 0.75},
        highlightOpacity: {default: 1},
    },
    init: function() {
        const el = this.el;
        const data = this.data;

        el.setAttribute('opacity', data.opacity);

        this.el.addEventListener('mouseenter', (e) => {
            const material = this.el.getAttribute('material');
            if (material && material.color) {
                this.originalColor = material.color;
            }

            this.el.setAttribute('material', 'color', this.data.highlightColor);
            this.el.setAttribute('material', 'opacity', this.data.highlightOpacity);
        });

        this.el.addEventListener('mouseleave', (e) => {
            if (this.originalColor) {
                this.el.setAttribute('material', 'color', this.originalColor);
            } else {
                this.el.removeAttribute('material', 'color');
            }
            this.el.setAttribute('material', 'opacity', this.data.opacity);
        });
    },
});
