//@ts-nocheck
pixso.showUI(__html__, { width: 166, height: 184 });
let hasFrameData;
let shapeTree = []
let imageHashList = []
let imageBytesList = []
let rasterizeList = []
let prefs = {
    exportRefImage: false,
    imgSaveDialog: false,
}

// receive message from the UI
pixso.ui.onmessage = message => {
    if (message.type === 'getPrefs') {
        // console.log('get those prefs');

        pixso.clientStorage.getAsync('aeux.prefs')
            .then(prefs => {
                if (prefs) {
                    pixso.ui.postMessage({ type: 'retPrefs', prefs: prefs })
                    return prefs
                } else {
                    // console.log('gotta save new prefs', message.defaultPrefs);
                    pixso.clientStorage.setAsync('aeux.prefs', message.defaultPrefs)
                        .then(() => {
                            pixso.ui.postMessage({ type: 'retPrefs', prefs: message.defaultPrefs })
                        })
                    return message.defaultPrefs
                }
            })
            .then(userPrefs => {        // store the prefs locally
                prefs = userPrefs
            })
    }
    if (message.type === 'setPrefs') {
        // console.log('save those prefs', message.prefs);

        pixso.clientStorage.setAsync('aeux.prefs', message.prefs)
            .then(ret => {
                pixso.ui.postMessage(message.prefs)
                prefs = message.prefs        // store the prefs locally
            })

    }

    if (message.type === 'exportCancel') {

    }
    if (message.type === 'exportSelection') {
        hasFrameData = false;
        shapeTree = [];
        imageHashList = [];
        imageBytesList = [];
        rasterizeList = [];

        let exportJSON = message.exportJSON || false;

        if (pixso.currentPage.selection.length < 1) {
            pixso.ui.postMessage({ type: 'fetchAEUX', data: null });
            return;
        }

        try {
            let selection = nodeToObj(pixso.currentPage.selection);
            if (shapeTree[0] && shapeTree[0].children) {
                shapeTree[0].children = selection;
            } else {
                // Fallback if no frame was wrapped
                shapeTree = [{ children: selection }];
            }
        } catch (error) {
            console.log(error);
            console.log('selected layers need to be inside of a frame');
            pixso.ui.postMessage({ type: 'footerMsg', action: 'Layers must be inside of a frame', layerCount: null });
        }

        let refImg = null, tempGroup, parentFrame
        if (prefs.exportRefImage) {         // include a reference image with transfer
            parentFrame = findFrame(pixso.currentPage.selection[0])
            let parentFrameName = parentFrame.name.replace(/\s*(\/|\\)\s*/g, '-').replace(/^\*\s/, '').replace(/^\*/, '')

            // group and mask
            let mask = pixso.createRectangle()
            mask.x = parentFrame.x
            mask.y = parentFrame.y
            mask.resize(parentFrame.width, parentFrame.height)
            tempGroup = pixso.group([mask], mask.parent)
            tempGroup.appendChild(parentFrame)
            mask.isMask = true

            rasterizeList.push(parentFrame.id)


            refImg = {
                type: 'Image',
                name: parentFrameName,
                id: parentFrame.id.replace(/:/g, '-'),
                frame: { x: parentFrame.width / 2, y: parentFrame.height / 2, width: parentFrame.width, height: parentFrame.height },
                isVisible: true,
                opacity: 50,
                blendMode: 'BlendingMode.NORMAL',
                isMask: false,
                rotation: 0,
                guide: true,
            }
        }

        if (rasterizeList.length > 0) {
            rasterizeList = [... new Set(rasterizeList)]        // remove duplicates
            // console.log('RASTERIZELIST', rasterizeList);


            let requests = rasterizeList.map((item) => {
                console.log('iten++', item);

                return new Promise((resolve) => {
                    asyncCollectHashes(item, resolve);
                });
            })

            Promise.all(requests)
                .then(() => storeImageData(imageHashList, shapeTree, refImg))
                .then(() => {
                    // remove the reference mask
                    if (tempGroup) {
                        tempGroup.parent.appendChild(parentFrame)
                        tempGroup.remove()
                    }
                })


        } else {
            // check if images need to export then send message to ui.ts
            if (exportJSON) {
                pixso.ui.postMessage({ type: 'exportAEUX', data: shapeTree });
            } else if (imageHashList.length < 1) {
                pixso.ui.postMessage({ type: 'fetchAEUX', data: shapeTree });
            } else {
                storeImageData(imageHashList, shapeTree, null)
            }
        }
        // console.log('imageHashList', imageHashList);

        function clone(val) {
            return JSON.parse(JSON.stringify(val))
        }

        function asyncCollectHashes(id, cb) {
            setTimeout(() => {
                // console.log('done with', item);
                let shape = pixso.getNodeById(id) // as any - если используете TypeScript

                // disable effects
                let effectVisList = []      // to store the effect visibility
                let effects
                if (shape.effects) {
                    // Используем безопасное клонирование вместо JSON.parse/stringify,
                    // так как в эффектах могут быть смешанные свойства
                    effects = shape.effects.map(effect => {
                        const newEffect = JSON.parse(JSON.stringify(effect));
                        effectVisList.push(effect.visible);
                        if (effect.type == 'DROP_SHADOW' || effect.type == 'LAYER_BLUR') {
                            newEffect.visible = false;
                        }
                        return newEffect;
                    });
                    shape.effects = effects;
                }

                let compMult = 3
                let imgScale = Math.min(3500 / Math.max(shape.width, shape.height), compMult)  // limit it to 4000px
                // console.log('IMAGESCALE', imgScale, shape);

                shape.exportAsync({
                    format: "PNG",
                    useAbsoluteBounds: true,
                    constraint: { type: "SCALE", value: imgScale }
                })
                    .then(img => {
                        imageHashList.push({
                            hash: pixso.createImage(img).hash,
                            // --- ИСПРАВЛЕНИЕ ЗДЕСЬ ---
                            // Было: id: `${shape.name...}_${id}`
                            // Стало: просто id. Это обеспечит совпадение имен с aeux.js
                            id: id
                        })
                    })
                    .then(() => {
                        // re-enable effects 
                        if (effects) {
                            // Восстанавливаем видимость
                            const restoredEffects = shape.effects.map((effect, i) => {
                                const newEffect = JSON.parse(JSON.stringify(effect));
                                newEffect.visible = effectVisList[i];
                                return newEffect;
                            });
                            shape.effects = restoredEffects;
                        }
                    })
                    .then(() => {
                        cb();
                    })
                    .catch(err => {
                        console.log('Export error', err);
                        cb(); // Все равно вызываем callback, чтобы не зависнуть
                    });


            }, 100);
        }
    }

    if (message.type === 'addRasterizeFlag') {
        if (pixso.currentPage.selection.length < 1) { return }      // nothing selected

        // let selection = nodeToObj(pixso.currentPage.selection)
        let layerCount = addMagicStar(pixso.currentPage.selection, 0) || 0

        // reselect layers
        pixso.currentPage.selection = pixso.currentPage.selection

        pixso.ui.postMessage({ type: 'footerMsg', action: 'marked as PNG', layerCount });
    }
    // if (message.type === 'flattenLayers') {
    //     if (pixso.currentPage.selection.length < 1) { return }      // nothing selected

    //     // let selection = nodeToObj(pixso.currentPage.selection)
    //     let layerCount = flattenRecursive(pixso.currentPage.selection, 0) || 0

    //     // reselect layers
    //     pixso.currentPage.selection = pixso.currentPage.selection

    //     pixso.ui.postMessage({type: 'footerMsg', action: 'flattened', layerCount});
    // }
    // if (message.type === 'rasterizeSelection') {
    //     if (pixso.currentPage.selection.length < 1) { return }      // nothing selected

    //     // let selection = nodeToObj(pixso.currentPage.selection)
    //     let layerCount = rasterizeSelection(pixso.currentPage.selection, 0) || 0
    //     // console.log('layerCount', layerCount);

    //     // reselect layers
    //     pixso.currentPage.selection = pixso.currentPage.selection

    //     pixso.ui.postMessage({type: 'footerMsg', action: 'rasterized', layerCount});
    // }
    // if (message.type === 'detachComponents') {
    //     console.log('detachComponents');
    //     let layerCount = 4;
    //     pixso.ui.postMessage({type: 'footerMsg', action: 'flattened', layerCount});
    // }

    //Communicate back to the UI
    // console.log('send message back to ui');
}

// --- ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ УМНОГО ФЛАТТЕНА ---
function isVectorIconWithMask(node) {
    if (node.type !== 'GROUP' && node.type !== 'FRAME') return false;
    if (!node.children || node.children.length === 0) return false;

    let hasMask = false;
    let hasTextOrImage = false;

    for (const child of node.children) {
        if (child.isMask) hasMask = true;
        if (child.type === 'TEXT' || child.type === 'INSTANCE' || child.type === 'COMPONENT') {
            hasTextOrImage = true;
        }
        if (child.fills && Array.isArray(child.fills)) {
            for (const fill of child.fills) {
                if (fill.type === 'IMAGE') hasTextOrImage = true;
            }
        }
    }
    return hasMask && !hasTextOrImage;
}

// --- ОСНОВНАЯ ФУНКЦИЯ ПАРСИНГА ---
function nodeToObj(nodes) {
    if (!nodes || nodes.length < 1) { return []; }

    let arr = [];

    if (nodes[0] && (
        (nodes[0].type === 'FRAME' && nodes[0].parent && nodes[0].parent.type === 'PAGE') ||
        (nodes[0].type === 'COMPONENT' && nodes[0].parent && nodes[0].parent.type === 'PAGE'))) {

        hasFrameData = true;

        // ФИКС: захватываем детей ДО вызова getElement
        let topChildren;
        try { topChildren = Array.from(nodes[0].children || []); } catch (e) { topChildren = []; }

        // ФИКС: skipChildren=true — не трогаем детей внутри getElement
        shapeTree.push(getElement(nodes[0], true));

        // outer forEach обработает topChildren и вернёт их в arr → shapeTree[0].children
        nodes = topChildren;

        if (!nodes || nodes.length < 1) { return arr; }
    }

    nodes.forEach(node => {
        if (!hasFrameData) {
            if (node.parent && node.parent.type === 'PAGE') { return; }
            let frame = findFrame(node);
            if (frame) {
                let frameData = getElement(frame, true);
                frameData.children = [];
                shapeTree.push(frameData);
            }
        }

        let obj = getElement(node, false);
        arr.push(obj);
    });

    return arr;
}

function getElement(node, skipChildren) {
    let rasterize = false;
    let obj = {
        children: [],
        type: null,
    };

    // КРИТИЧЕСКИЙ ФИКС: захватываем детей ПЕРВЫМ ДЕЛОМ, до любых других обращений к ноде
    let liveChildren = null;
    if (!skipChildren) {
        try {
            const ch = node.children;
            if (ch && ch.length > 0) {
                liveChildren = Array.from(ch);
            }
        } catch(e) {}
    }

    // Проверка на растрирование
    if (node.name && node.name.charAt(0) == '*' && node != findFrame(node)) {
        rasterizeList.push(node.id);
        rasterize = true;
        liveChildren = null; // растрируем — детей не нужно
    }

    for (const key in node) {
        try {
            let element = node[key];

            // ФИКС: пропускаем функции (remove, toString и прочие методы Pixso-прокси)
            if (typeof element === 'function') { continue; }

            if (key === 'parent' || key === 'masterComponent' || key === 'removed') continue;
            if (key === 'children') { continue; } // обрабатываем через liveChildren

            if (key === 'backgrounds') { continue; } // в Pixso нет backgrounds

            if (key === 'fills' && Array.isArray(element) && element.length > 0) {
                let hasImageFill = false;
                for (const i in element) {
                    if (element[i].type == 'IMAGE') {
                        hasImageFill = true;
                        obj['rasterize'] = true;
                    }
                }
                if (hasImageFill) { rasterizeList.push(node.id); }
            }

            if (element == pixso.mixed && key === 'cornerRadius') {
                element = Math.min(node.topLeftRadius, node.topRightRadius, node.bottomLeftRadius, node.bottomRightRadius);
            }

            if (element == pixso.mixed) {
                let str = 'getRange' + key.replace(/^\w/, c => c.toUpperCase());
                try { element = node[str](0, 1); } catch (e) { continue; }
            }

            if (typeof element === 'symbol' || element === pixso.mixed) { continue; }

            obj[key] = element;

        } catch (error) {}
    }

    // Явно копируем геттеры
    const geoProps = [
        'width', 'height', 'x', 'y', 'rotation', 'opacity', 'visible', 'isMask',
        'blendMode', 'type', 'id', 'name', 'cornerRadius',
        'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius',
        'strokeWeight', 'strokeAlign', 'strokeTopWeight', 'strokeBottomWeight',
        'strokeLeftWeight', 'strokeRightWeight', 'strokeCap', 'strokeJoin', 'dashPattern',
        'layoutMode', 'booleanOperation', 'textAlignHorizontal', 'textCase',
        'fontSize', 'letterSpacing', 'lineHeight', 'characters', 'fontName',
        'textAutoResize', 'pointCount', 'innerRadius', 'absoluteBoundingBox',
    ];
    geoProps.forEach(prop => {
        try {
            if (obj[prop] === undefined && node[prop] !== undefined) {
                const val = node[prop];
                if (typeof val !== 'function' && typeof val !== 'symbol' && val !== pixso.mixed) {
                    obj[prop] = val;
                }
            }
        } catch(e) {}
    });

    // relativeTransform
    try {
        const t = node.relativeTransform;
        if (t && t[0] && t[1]) {
            obj['relativeTransform'] = [[t[0][0], t[0][1], t[0][2]], [t[1][0], t[1][1], t[1][2]]];
        } else {
            obj['relativeTransform'] = [[1, 0, node.x || 0], [0, 1, node.y || 0]];
        }
    } catch(e) { obj['relativeTransform'] = [[1, 0, 0], [0, 1, 0]]; }

    // absoluteTransform
    try {
        const at = node.absoluteTransform;
        if (at && at[0] && at[1]) {
            obj['absoluteTransform'] = [[at[0][0], at[0][1], at[0][2]], [at[1][0], at[1][1], at[1][2]]];
        }
    } catch(e) {}

    // fills / strokes / effects — явно
    ['fills', 'strokes', 'effects'].forEach(prop => {
        try {
            if (!obj[prop] && node[prop]) {
                obj[prop] = JSON.parse(JSON.stringify(Array.isArray(node[prop]) ? node[prop] : []));
            }
        } catch(e) { obj[prop] = []; }
    });

    // vectorPaths
    try {
        if (node.vectorPaths && node.vectorPaths.length > 0) {
            obj['vectorPaths'] = Array.from(node.vectorPaths).map(p => ({ data: p.data, windingRule: p.windingRule }));
        }
    } catch(e) {}

    // ДЕТИ — используем liveChildren захваченные в начале
    if (!skipChildren && !rasterize) {
        if (liveChildren && liveChildren.length > 0) {
            obj.children = nodeToObj(liveChildren);
        } else {
            obj.children = [];
        }
    }

    // --- TEXT ---
    if (node.type === 'TEXT') {
        obj._calcLineHeight = null;
        if (node.lineHeight && node.lineHeight.unit === 'PIXELS') {
            obj._calcLineHeight = node.lineHeight.value;
        } else if (node.lineHeight && node.lineHeight.unit === 'PERCENT') {
            obj._calcLineHeight = node.fontSize * (node.lineHeight.value / 100);
        } else {
            try {
                if (node.textAutoResize === 'WIDTH_AND_HEIGHT') {
                    obj._calcLineHeight = node.height / (node.characters.split('\n').length);
                } else {
                    const clone = node.clone();
                    if (clone.textAutoResize === 'NONE') clone.textAutoResize = 'HEIGHT';
                    clone.resize(100000, clone.height);
                    obj._calcLineHeight = clone.height / (clone.characters.split('\n').length);
                    clone.remove();
                }
            } catch(e) { obj._calcLineHeight = node.fontSize * 1.2; }
        }

        let calculatedOffset = 0;
        try {
            if (node.characters && node.characters.trim().length > 0) {
                const clone = node.clone();
                pixso.currentPage.appendChild(clone);
                clone.rotation = 0; clone.x = 0; clone.y = 0;
                const textTop = clone.absoluteBoundingBox.y;
                const flat = pixso.flatten([clone]);
                calculatedOffset = flat.absoluteBoundingBox.y - textTop;
                flat.remove();
            }
        } catch(e) { calculatedOffset = 0; }
        obj['_metricTopOffset'] = calculatedOffset;
    }

    // --- AUTOLAYOUT ---
    if (node.type === 'FRAME' && node.layoutMode !== 'NONE') { obj.type = 'AUTOLAYOUT'; }

    return obj;
}

async function storeImageData(imageHashList, layers, refImg) { // imageHashList should be fiiled but isnt
    // console.log('layers++', layers);
    // console.log('imageHashList++', imageHashList);

    for (const i in imageHashList) {
        // console.log('i', i);
        const hash = imageHashList[i].hash;
        // console.log('hash', hash);

        const name = imageHashList[i].id
            .replace(/[\\:"*?%<>|]/g, '-')     // replace illegal characters
            .replace(/\s*(\/|\\)\s*/g, '-')    // remove slashes
        // console.log('name', name);

        try {
            let image = pixso.getImageByHash(hash)
            let bytes = await image.getBytesAsync()

            imageBytesList.push({ name, bytes })
            // console.log('bytes', bytes);
        } catch (error) { }
    }
    if (imageBytesList.length > 0) {
        pixso.ui.postMessage({ type: 'fetchImagesAndAEUX', images: imageBytesList, data: layers, refImg });
    } else {
        pixso.ui.postMessage({ type: 'fetchAEUX', data: layers });
    }

}
function findFrame(node) {
    // console.log('node:', node);
    // console.log('node.type:', node.type);
    try {
        if ((node.type !== 'FRAME' && !(node.type === 'COMPONENT' && node.parent.type === 'PAGE'))
            || (node.type === 'FRAME' && node.parent.type === 'FRAME')) {
            // if (node.type !== 'FRAME' && node.type !== 'COMPONENT') {                
            return findFrame(node.parent);
        } else {
            hasFrameData = true;
            return node;
        }
    } catch (error) {
        pixso.ui.postMessage({ type: 'footerMsg', action: 'Error in findFrame() 😖', layerCount: null });
    }
}
function addMagicStar(selection, layerCount) {
    if (findFrame(selection[0]) == selection[0]) {     // selection is the top most frame
        selection = selection[0].children               // select all the children
    }

    selection.forEach(shape => {
        if (shape.name.charAt(0) !== '*') {
            shape.name = `* ${shape.name}`
            layerCount++
        }
    })

    return layerCount
}
function flattenRecursive(selection, layerCount) {
    try {
        selection.forEach(shape => {
            console.log('try flattening', shape);

            if (shape.type == 'BOOLEAN_OPERATION') {
                pixso.flatten([shape])
                layerCount++
            } else if (shape.cornerRadius == pixso.mixed || shape.cornerRadius > 0) {
                // flatten rounded corners
                pixso.flatten([shape])
                layerCount++
            } else if (shape.children) {
                layerCount = flattenRecursive(shape.children, layerCount)
            } else {
                let t = shape.relativeTransform;
                console.log('shape.type', shape.type);

                /// check for transforms
                if (t[0][0].toFixed(6) != 1 ||
                    t[0][1].toFixed(6) != 0 ||
                    t[1][0].toFixed(6) != 0 ||
                    t[1][1].toFixed(6) != 1 ||
                    false) {
                    pixso.flatten([shape])
                    layerCount++
                } else if (shape.type == 'TEXT') {
                    pixso.flatten([shape])
                    layerCount++
                }
            }
        });
        return layerCount
    } catch (error) {
        console.log(error);

        return layerCount
    }
}

function rasterizeSelection(selection, layerCount) {
    try {
        let newSelection = []

        selection.forEach(shape => {
            if (shape.type == 'GROUP') {
                let imgScale = Math.min(4000 / Math.max(shape.width, shape.height), 6)  // limit it to 4000px
                // alert(imgScale)       
                let options = {
                    format: "PNG",
                    constraint: { type: "SCALE", value: imgScale }
                }
                let shapeTransform = shape.relativeTransform        // store transform
                let removeTransform = [[1, 0, shape.x], [0, 1, shape.y]]
                shape.relativeTransform = removeTransform

                shape.exportAsync(options)
                    .then(img => {
                        // console.log(pixso.createImage(img));
                        let rect = pixso.createRectangle()

                        shape.parent.appendChild(rect)
                        rect.x = shape.x
                        rect.y = shape.y
                        rect.relativeTransform = shapeTransform
                        rect.name = shape.name + '_rasterize'
                        rect.resize(shape.width, shape.height)

                        let fillObj = JSON.parse(JSON.stringify(rect.fills[0]))

                        fillObj.filters = {
                            contrast: 0,
                            exposure: 0,
                            highlights: 0,
                            saturation: 0,
                            shadows: 0,
                            temperature: 0,
                            tint: 0,
                        }
                        fillObj.imageHash = pixso.createImage(img).hash
                        fillObj.imageTransform = [[1, 0, 0], [0, 1, 0]]
                        fillObj.scaleMode = "CROP"
                        fillObj.type = "IMAGE"
                        fillObj.scalingFactor = 0.5,
                            delete fillObj.color

                        rect.fills = [fillObj]
                        newSelection.push(rect)

                        shape.relativeTransform = shapeTransform
                    })
                layerCount++
            }
        });

        setTimeout(() => { pixso.currentPage.selection = newSelection }, 50)

        return layerCount
    } catch (error) {
        console.log(error);
        return layerCount
    }
}
async function generateFrameImage() {
    try {
        let firstSelected = pixso.currentPage.selection[0]
        let parentFrame = findFrame(pixso.currentPage.selection[0])

        let options = {
            format: "PNG",
            constraint: { type: "SCALE", value: 6 }
        }
        parentFrame.exportAsync(options)
            .then(img => {
                // console.log('hsadjfhjkahsdf', img);

                return pixso.createImage(img)
            })
    } catch (error) {
        console.log(error);
        return null
    }
}