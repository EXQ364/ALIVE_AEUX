//@ts-nocheck
figma.showUI(__html__, { width: 166, height: 184 });
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
figma.ui.onmessage = message => {
    if (message.type === 'getPrefs') {
        // console.log('get those prefs');

        figma.clientStorage.getAsync('aeux.prefs')
            .then(prefs => {
                if (prefs) {
                    figma.ui.postMessage({ type: 'retPrefs', prefs: prefs })
                    return prefs
                } else {
                    // console.log('gotta save new prefs', message.defaultPrefs);
                    figma.clientStorage.setAsync('aeux.prefs', message.defaultPrefs)
                        .then(() => {
                            figma.ui.postMessage({ type: 'retPrefs', prefs: message.defaultPrefs })
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

        figma.clientStorage.setAsync('aeux.prefs', message.prefs)
            .then(ret => {
                figma.ui.postMessage(message.prefs)
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

        if (figma.currentPage.selection.length < 1) {
            figma.ui.postMessage({ type: 'fetchAEUX', data: null });
            return;
        }

        try {
            let selection = nodeToObj(figma.currentPage.selection);
            if (shapeTree[0] && shapeTree[0].children) {
                shapeTree[0].children = selection;
            } else {
                // Fallback if no frame was wrapped
                shapeTree = [{ children: selection }];
            }
        } catch (error) {
            console.log(error);
            console.log('selected layers need to be inside of a frame');
            figma.ui.postMessage({ type: 'footerMsg', action: 'Layers must be inside of a frame', layerCount: null });
        }

        let refImg = null, tempGroup, parentFrame
        if (prefs.exportRefImage) {         // include a reference image with transfer
            parentFrame = findFrame(figma.currentPage.selection[0])
            let parentFrameName = parentFrame.name.replace(/\s*(\/|\\)\s*/g, '-').replace(/^\*\s/, '').replace(/^\*/, '')

            // group and mask
            let mask = figma.createRectangle()
            mask.x = parentFrame.x
            mask.y = parentFrame.y
            mask.resize(parentFrame.width, parentFrame.height)
            tempGroup = figma.group([mask], mask.parent)
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
                figma.ui.postMessage({ type: 'exportAEUX', data: shapeTree });
            } else if (imageHashList.length < 1) {
                figma.ui.postMessage({ type: 'fetchAEUX', data: shapeTree });
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
                let shape = figma.getNodeById(id) // as any - если используете TypeScript

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
                            hash: figma.createImage(img).hash,
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
        if (figma.currentPage.selection.length < 1) { return }      // nothing selected

        // let selection = nodeToObj(figma.currentPage.selection)
        let layerCount = addMagicStar(figma.currentPage.selection, 0) || 0

        // reselect layers
        figma.currentPage.selection = figma.currentPage.selection

        figma.ui.postMessage({ type: 'footerMsg', action: 'marked as PNG', layerCount });
    }
    // if (message.type === 'flattenLayers') {
    //     if (figma.currentPage.selection.length < 1) { return }      // nothing selected

    //     // let selection = nodeToObj(figma.currentPage.selection)
    //     let layerCount = flattenRecursive(figma.currentPage.selection, 0) || 0

    //     // reselect layers
    //     figma.currentPage.selection = figma.currentPage.selection

    //     figma.ui.postMessage({type: 'footerMsg', action: 'flattened', layerCount});
    // }
    // if (message.type === 'rasterizeSelection') {
    //     if (figma.currentPage.selection.length < 1) { return }      // nothing selected

    //     // let selection = nodeToObj(figma.currentPage.selection)
    //     let layerCount = rasterizeSelection(figma.currentPage.selection, 0) || 0
    //     // console.log('layerCount', layerCount);

    //     // reselect layers
    //     figma.currentPage.selection = figma.currentPage.selection

    //     figma.ui.postMessage({type: 'footerMsg', action: 'rasterized', layerCount});
    // }
    // if (message.type === 'detachComponents') {
    //     console.log('detachComponents');
    //     let layerCount = 4;
    //     figma.ui.postMessage({type: 'footerMsg', action: 'flattened', layerCount});
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
        shapeTree.push(getElement(nodes[0], false));
        nodes = nodes[0].children;

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

    function getElement(node, skipChildren) {
        let rasterize = false;
        let obj = {
            children: [],
            type: null,
        };

        // Проверка на растрирование (PNG)
        if (node.name && node.name.charAt(0) == '*' && node != findFrame(node)) {
            rasterizeList.push(node.id);
            rasterize = true;
        }

        for (const key in node) {
            try {
                let element = node[key];

                if (key === 'parent' || key === 'masterComponent' || key === 'removed') continue;

                if (key === 'children') {
                    if (!skipChildren && !rasterize) {
                        element = nodeToObj(element);
                    } else {
                        element = [];
                    }
                }

                if (key === 'backgrounds') { element = nodeToObj(element); }

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

                if (element == figma.mixed && key === 'cornerRadius') {
                    element = Math.min(node.topLeftRadius, node.topRightRadius, node.bottomLeftRadius, node.bottomRightRadius);
                }

                if (element == figma.mixed) {
                    let str = 'getRange' + key.replace(/^\w/, c => c.toUpperCase());
                    try { element = node[str](0, 1); } catch (e) { continue; }
                }

                // Защита от краша Cannot unwrap symbol
                if (typeof element === 'symbol' || element === figma.mixed) {
                    continue;
                }

                obj[key] = element;

            } catch (error) {
                // Игнорируем
            }
        }

        // --- ГЕОМЕТРИЯ ---
        if (node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION' || node.type === 'STAR' || node.type === 'POLYGON' || node.type === 'ELLIPSE') {
            if (node.fillGeometry && node.fillGeometry.length > 0) {
                obj['fillGeometry'] = node.fillGeometry;
            }
            if (node.strokeGeometry && node.strokeGeometry.length > 0) {
                obj['strokeGeometry'] = node.strokeGeometry;
            }
        }

        // --- ТЕКСТ И ОТСТУПЫ ---
        if (node.type === 'TEXT') {
            //@ts-ignore
            obj._calcLineHeight = null;
            if (node.lineHeight && node.lineHeight.unit === 'PIXELS') {
                obj._calcLineHeight = node.lineHeight.value;
            } else if (node.lineHeight && node.lineHeight.unit === 'PERCENT') {
                obj._calcLineHeight = node.fontSize * (node.lineHeight.value / 100);
            } else {
                // Расчет точной AUTO высоты одной строки (на базе метрик самого шрифта Figma)
                try {
                    if (node.textAutoResize === 'WIDTH_AND_HEIGHT') {
                        // Если ширина авто, текст не переносится сам. Строки создаются только через Enter (\n)
                        const linesCount = node.characters.split('\n').length;
                        obj._calcLineHeight = node.height / linesCount;
                    } else {
                        // Текст переносится по ширине (HEIGHT или NONE).
                        // Клонируем ноду, чтобы "вытянуть" текст в одну линию и измерить его реальную высоту.
                        const clone = node.clone();

                        // Чтобы высота автоматически поджалась под одну строку, ставим HEIGHT
                        if (clone.textAutoResize === 'NONE') {
                            clone.textAutoResize = 'HEIGHT';
                        }

                        // Делаем ширину гигантской, чтобы автоматические переносы исчезли
                        clone.resize(100000, clone.height);

                        // Теперь текст разбит на строки только там, где есть реальный \n
                        const linesCount = clone.characters.split('\n').length;

                        // Высота клона теперь равна точной сумме высот (с учетом реального Auto Line Height)
                        obj._calcLineHeight = clone.height / linesCount;

                        clone.remove();
                    }
                } catch (error) {
                    // Фолбэк на крайний случай, если клонирование или изменение textAutoResize упадет
                    // (например, если шрифт не был асинхронно загружен перед экспортом)
                    obj._calcLineHeight = node.fontSize * 1.2;
                }
            }

            let calculatedOffset = 0;
            try {
                if (node.characters && node.characters.trim().length > 0) {
                    const clone = node.clone();
                    figma.currentPage.appendChild(clone);
                    clone.rotation = 0; clone.x = 0; clone.y = 0;
                    const textTop = clone.absoluteBoundingBox.y;
                    const flat = figma.flatten([clone]);
                    const vectorTop = flat.absoluteBoundingBox.y;
                    calculatedOffset = vectorTop - textTop;
                    flat.remove();
                }
            } catch (error) { calculatedOffset = 0; }

            //@ts-ignore
            obj['_metricTopOffset'] = calculatedOffset;
        }

        // --- AUTOLAYOUT ---
        if (node.type === 'FRAME' && node.layoutMode !== 'NONE') { obj.type = 'AUTOLAYOUT'; }

        return obj;
    }
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
            let image = figma.getImageByHash(hash)
            let bytes = await image.getBytesAsync()

            imageBytesList.push({ name, bytes })
            // console.log('bytes', bytes);
        } catch (error) { }
    }
    if (imageBytesList.length > 0) {
        figma.ui.postMessage({ type: 'fetchImagesAndAEUX', images: imageBytesList, data: layers, refImg });
    } else {
        figma.ui.postMessage({ type: 'fetchAEUX', data: layers });
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
        figma.ui.postMessage({ type: 'footerMsg', action: 'Error in findFrame() 😖', layerCount: null });
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
                figma.flatten([shape])
                layerCount++
            } else if (shape.cornerRadius == figma.mixed || shape.cornerRadius > 0) {
                // flatten rounded corners
                figma.flatten([shape])
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
                    figma.flatten([shape])
                    layerCount++
                } else if (shape.type == 'TEXT') {
                    figma.flatten([shape])
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
                        // console.log(figma.createImage(img));
                        let rect = figma.createRectangle()

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
                        fillObj.imageHash = figma.createImage(img).hash
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

        setTimeout(() => { figma.currentPage.selection = newSelection }, 50)

        return layerCount
    } catch (error) {
        console.log(error);
        return layerCount
    }
}
async function generateFrameImage() {
    try {
        let firstSelected = figma.currentPage.selection[0]
        let parentFrame = findFrame(figma.currentPage.selection[0])

        let options = {
            format: "PNG",
            constraint: { type: "SCALE", value: 6 }
        }
        parentFrame.exportAsync(options)
            .then(img => {
                // console.log('hsadjfhjkahsdf', img);

                return figma.createImage(img)
            })
    } catch (error) {
        console.log(error);
        return null
    }
}