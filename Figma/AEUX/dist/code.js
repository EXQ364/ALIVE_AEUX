/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/code.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/code.ts":
/*!*********************!*\
  !*** ./src/code.ts ***!
  \*********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
//@ts-nocheck
figma.showUI(__html__, { width: 166, height: 184 });
let hasFrameData;
let shapeTree = [];
let imageHashList = [];
let imageBytesList = [];
let rasterizeList = [];
let prefs = {
    exportRefImage: false,
    imgSaveDialog: false,
};
// receive message from the UI
figma.ui.onmessage = message => {
    if (message.type === 'getPrefs') {
        // console.log('get those prefs');
        figma.clientStorage.getAsync('aeux.prefs')
            .then(prefs => {
            if (prefs) {
                figma.ui.postMessage({ type: 'retPrefs', prefs: prefs });
                return prefs;
            }
            else {
                // console.log('gotta save new prefs', message.defaultPrefs);
                figma.clientStorage.setAsync('aeux.prefs', message.defaultPrefs)
                    .then(() => {
                    figma.ui.postMessage({ type: 'retPrefs', prefs: message.defaultPrefs });
                });
                return message.defaultPrefs;
            }
        })
            .then(userPrefs => {
            prefs = userPrefs;
        });
    }
    if (message.type === 'setPrefs') {
        // console.log('save those prefs', message.prefs);
        figma.clientStorage.setAsync('aeux.prefs', message.prefs)
            .then(ret => {
            figma.ui.postMessage(message.prefs);
            prefs = message.prefs; // store the prefs locally
        });
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
            }
            else {
                // Fallback if no frame was wrapped
                shapeTree = [{ children: selection }];
            }
        }
        catch (error) {
            console.log(error);
            console.log('selected layers need to be inside of a frame');
            figma.ui.postMessage({ type: 'footerMsg', action: 'Layers must be inside of a frame', layerCount: null });
        }
        let refImg = null, tempGroup, parentFrame;
        if (prefs.exportRefImage) { // include a reference image with transfer
            parentFrame = findFrame(figma.currentPage.selection[0]);
            let parentFrameName = parentFrame.name.replace(/\s*(\/|\\)\s*/g, '-').replace(/^\*\s/, '').replace(/^\*/, '');
            // group and mask
            let mask = figma.createRectangle();
            mask.x = parentFrame.x;
            mask.y = parentFrame.y;
            mask.resize(parentFrame.width, parentFrame.height);
            tempGroup = figma.group([mask], mask.parent);
            tempGroup.appendChild(parentFrame);
            mask.isMask = true;
            rasterizeList.push(parentFrame.id);
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
            };
        }
        if (rasterizeList.length > 0) {
            rasterizeList = [...new Set(rasterizeList)]; // remove duplicates
            // console.log('RASTERIZELIST', rasterizeList);
            let requests = rasterizeList.map((item) => {
                console.log('iten++', item);
                return new Promise((resolve) => {
                    asyncCollectHashes(item, resolve);
                });
            });
            Promise.all(requests)
                .then(() => storeImageData(imageHashList, shapeTree, refImg))
                .then(() => {
                // remove the reference mask
                if (tempGroup) {
                    tempGroup.parent.appendChild(parentFrame);
                    tempGroup.remove();
                }
            });
        }
        else {
            // check if images need to export then send message to ui.ts
            if (exportJSON) {
                figma.ui.postMessage({ type: 'exportAEUX', data: shapeTree });
            }
            else if (imageHashList.length < 1) {
                figma.ui.postMessage({ type: 'fetchAEUX', data: shapeTree });
            }
            else {
                storeImageData(imageHashList, shapeTree, null);
            }
        }
        // console.log('imageHashList', imageHashList);
        function clone(val) {
            return JSON.parse(JSON.stringify(val));
        }
        function asyncCollectHashes(id, cb) {
            setTimeout(() => {
                // console.log('done with', item);
                let shape = figma.getNodeById(id);
                // disable effects
                let effectVisList = []; // to store the effect visibility
                let effects;
                if (shape.effects) {
                    effects = clone(shape.effects);
                    effects.forEach(effect => {
                        effectVisList.push(effect.visible);
                        if (effect.type == 'DROP_SHADOW' || effect.type == 'LAYER_BLUR') {
                            effect.visible = false;
                        }
                    });
                    shape.effects = effects;
                }
                let compMult = 3;
                let imgScale = Math.min(3500 / Math.max(shape.width, shape.height), compMult); // limit it to 4000px
                // console.log('IMAGESCALE', imgScale, shape);
                shape.exportAsync({
                    format: "PNG",
                    useAbsoluteBounds: true,
                    constraint: { type: "SCALE", value: imgScale }
                })
                    .then(img => {
                    imageHashList.push({
                        hash: figma.createImage(img).hash,
                        id: `${shape.name.replace(/^\*\s/, '').replace(/^\*/, '')}_${id}`
                    });
                })
                    .then(() => {
                    // re-enable effects 
                    for (let i = 0; i < effectVisList.length; i++) {
                        effects[i].visible = effectVisList[i];
                    }
                    shape.effects = effects;
                })
                    .then(() => {
                    cb();
                });
            }, 100);
        }
    }
    if (message.type === 'addRasterizeFlag') {
        if (figma.currentPage.selection.length < 1) {
            return;
        } // nothing selected
        // let selection = nodeToObj(figma.currentPage.selection)
        let layerCount = addMagicStar(figma.currentPage.selection, 0) || 0;
        // reselect layers
        figma.currentPage.selection = figma.currentPage.selection;
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
};
function nodeToObj(nodes) {
    //   console.log('nodes', nodes);
    if (nodes.length < 1) {
        return [];
    }
    // console.log(nodes[0].type);
    let arr = [];
    // look for the parent frame of everything except regular (non-autoLayout) frames and loose components
    if (nodes[0] && ((nodes[0].type === 'FRAME' && nodes[0].parent.type === 'PAGE') ||
        // (nodes[0].type === 'FRAME' && nodes[0].layoutMode === 'NONE') || 
        (nodes[0].type === 'COMPONENT' && nodes[0].parent.type === 'PAGE'))) { // a frame or a component master outside of a frame is directly selected
        console.log('GOT A FRAME');
        // console.log(nodes[0].children);
        hasFrameData = true; // dont need to get the frame data
        shapeTree.push(getElement(nodes[0], false));
        nodes = nodes[0].children;
    }
    // get shapes 
    if (nodes.length < 1) {
        return [];
    }
    nodes.forEach(node => {
        // get the frame data
        if (!hasFrameData) {
            if (node.parent.type === 'PAGE') {
                return;
            } // layer is outside of a frame 
            // console.log('get the frame data');
            let frame = findFrame(node);
            // console.log('frame:', frame);
            let frameData = getElement(frame, true); // skip gathering children data
            frameData.children = []; // clear the children of the frame to push them later
            shapeTree.push(frameData);
        }
        let obj = getElement(node, false);
        arr.push(obj);
    });
    // console.log('arr: ', arr);
    return arr;
    function getElement(node, skipChildren) {
        // console.log('node', node.name);
        let rasterize = false;
        let obj = {
            children: [],
            type: null,
        };
        if (node.name && node.name.charAt(0) == '*' && node != findFrame(node)) {
            console.log('rasterize', node);
            rasterizeList.push(node.id);
            rasterize = true;
        }
        for (const key in node) {
            try {
                let element = node[key];
                // console.log(element);
                if (key === 'children' && !skipChildren && !rasterize) {
                    element = nodeToObj(element);
                }
                if (key === 'backgrounds') {
                    element = nodeToObj(element);
                }
                if (key === 'fills' && element.length > 0) { // add image fills to rasterizeList
                    let hasImageFill = false;
                    for (const i in element) {
                        const fill = element[i];
                        if (fill.type == 'IMAGE') {
                            hasImageFill = true;
                            obj['rasterize'] = true;
                            // console.log('image', element);
                            // obj.type = 'RECTANGLE'
                            // return
                        }
                    }
                    if (hasImageFill) {
                        rasterizeList.push(node.id);
                    }
                }
                // corner radius
                // if (key === 'cornerRadius') {
                //     console.log(key,  element);
                // }
                if (element == figma.mixed && key === 'cornerRadius') {
                    element = Math.min(node.topLeftRadius, node.topRightRadius, node.bottomLeftRadius, node.bottomRightRadius);
                }
                // try to get the first value on the text
                if (element == figma.mixed) {
                    let str = 'getRange' + key.replace(/^\w/, c => c.toUpperCase());
                    try {
                        element = node[str](0, 1);
                    }
                    catch (error) {
                        continue;
                    }
                }
                // layer.fontName !== (figma.mixed)) ? layer.fontName.family : layer.getRangeFontName(0,1).family
                // if (key === 'parent') { console.log(element); }
                obj[key] = element;
            }
            catch (error) {
                console.log('ERROR', error);
            }
        }
        if (node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION' || node.type === 'STAR' || node.type === 'POLYGON' || node.type === 'ELLIPSE') {
            // fillGeometry содержит SVG Path Data с кривыми
            if ('fillGeometry' in node && node.fillGeometry.length > 0) {
                obj['fillGeometry'] = node.fillGeometry;
            }
            // На случай, если это обводка без заливки
            if ('strokeGeometry' in node && node.strokeGeometry.length > 0) {
                obj['strokeGeometry'] = node.strokeGeometry;
            }
        }
        if (node.type === 'TEXT') {
            // --- 1. Расчет Line Height (оставляем как было) ---
            //@ts-ignore
            obj._calcLineHeight = null;
            if (node.lineHeight.unit === 'PIXELS') {
                //@ts-ignore
                obj._calcLineHeight = node.lineHeight.value;
            }
            else if (node.lineHeight.unit === 'PERCENT') {
                //@ts-ignore
                obj._calcLineHeight = node.fontSize * (node.lineHeight.value / 100);
            }
            else {
                // AUTO
                const isSingleLine = node.characters.indexOf('\n') === -1;
                const isAutoHeight = node.textAutoResize === 'HEIGHT' || node.textAutoResize === 'WIDTH_AND_HEIGHT';
                if (isSingleLine && isAutoHeight) {
                    //@ts-ignore
                    obj._calcLineHeight = node.height;
                }
                else {
                    //@ts-ignore
                    obj._calcLineHeight = node.fontSize * 1.2;
                }
            }
            let calculatedOffset = 0;
            try {
                // Проверяем, есть ли текст, чтобы не уронить плагин
                if (node.characters && node.characters.trim().length > 0) {
                    const clone = node.clone();
                    // ВАЖНО: Выкидываем клон в корень страницы, чтобы убрать влияние групп/фреймов
                    figma.currentPage.appendChild(clone);
                    // Сбрасываем трансформации, чтобы измерять чистую геометрию
                    clone.rotation = 0;
                    clone.x = 0;
                    clone.y = 0;
                    // Запоминаем, где стоит верх текстового контейнера (в идеале это 0)
                    const textTop = clone.absoluteBoundingBox.y;
                    // Превращаем в кривые
                    const flat = figma.flatten([clone]);
                    // Смотрим, где оказалась верхняя точка кривых (букв)
                    const vectorTop = flat.absoluteBoundingBox.y;
                    // Разница — это пустота сверху
                    calculatedOffset = vectorTop - textTop;
                    // Убираем мусор
                    flat.remove();
                }
            }
            catch (error) {
                console.log('Geometry calc error', error);
                calculatedOffset = 0;
            }
            //@ts-ignore
            obj['_metricTopOffset'] = calculatedOffset;
        }
        // keep track of Auto-layout frames for alignment of children
        if (node.type === 'FRAME' && node.layoutMode !== 'NONE') {
            obj.type = 'AUTOLAYOUT';
        }
        return obj;
    }
    function collectImageHashes(element, id) {
        // console.log('imageHash', id, element);
        for (const i in element) {
            const fill = element[i];
            if (fill.type == 'IMAGE') {
                imageHashList.push({ hash: fill.imageHash, id });
            }
        }
    }
}
function storeImageData(imageHashList, layers, refImg) {
    return __awaiter(this, void 0, void 0, function* () {
        // console.log('layers++', layers);
        // console.log('imageHashList++', imageHashList);
        for (const i in imageHashList) {
            // console.log('i', i);
            const hash = imageHashList[i].hash;
            // console.log('hash', hash);
            const name = imageHashList[i].id
                .replace(/[\\:"*?%<>|]/g, '-') // replace illegal characters
                .replace(/\s*(\/|\\)\s*/g, '-'); // remove slashes
            // console.log('name', name);
            try {
                let image = figma.getImageByHash(hash);
                let bytes = yield image.getBytesAsync();
                imageBytesList.push({ name, bytes });
                // console.log('bytes', bytes);
            }
            catch (error) { }
        }
        if (imageBytesList.length > 0) {
            figma.ui.postMessage({ type: 'fetchImagesAndAEUX', images: imageBytesList, data: layers, refImg });
        }
        else {
            figma.ui.postMessage({ type: 'fetchAEUX', data: layers });
        }
    });
}
function findFrame(node) {
    // console.log('node:', node);
    // console.log('node.type:', node.type);
    try {
        if ((node.type !== 'FRAME' && !(node.type === 'COMPONENT' && node.parent.type === 'PAGE'))
            || (node.type === 'FRAME' && node.parent.type === 'FRAME')) {
            // if (node.type !== 'FRAME' && node.type !== 'COMPONENT') {                
            return findFrame(node.parent);
        }
        else {
            hasFrameData = true;
            return node;
        }
    }
    catch (error) {
        figma.ui.postMessage({ type: 'footerMsg', action: 'Error in findFrame() 😖', layerCount: null });
    }
}
function addMagicStar(selection, layerCount) {
    if (findFrame(selection[0]) == selection[0]) { // selection is the top most frame
        selection = selection[0].children; // select all the children
    }
    selection.forEach(shape => {
        if (shape.name.charAt(0) !== '*') {
            shape.name = `* ${shape.name}`;
            layerCount++;
        }
    });
    return layerCount;
}
function flattenRecursive(selection, layerCount) {
    try {
        selection.forEach(shape => {
            console.log('try flattening', shape);
            if (shape.type == 'BOOLEAN_OPERATION') {
                figma.flatten([shape]);
                layerCount++;
            }
            else if (shape.cornerRadius == figma.mixed || shape.cornerRadius > 0) {
                // flatten rounded corners
                figma.flatten([shape]);
                layerCount++;
            }
            else if (shape.children) {
                layerCount = flattenRecursive(shape.children, layerCount);
            }
            else {
                let t = shape.relativeTransform;
                console.log('shape.type', shape.type);
                /// check for transforms
                if (t[0][0].toFixed(6) != 1 ||
                    t[0][1].toFixed(6) != 0 ||
                    t[1][0].toFixed(6) != 0 ||
                    t[1][1].toFixed(6) != 1 ||
                    false) {
                    figma.flatten([shape]);
                    layerCount++;
                }
                else if (shape.type == 'TEXT') {
                    figma.flatten([shape]);
                    layerCount++;
                }
            }
        });
        return layerCount;
    }
    catch (error) {
        console.log(error);
        return layerCount;
    }
}
function rasterizeSelection(selection, layerCount) {
    try {
        let newSelection = [];
        selection.forEach(shape => {
            if (shape.type == 'GROUP') {
                let imgScale = Math.min(4000 / Math.max(shape.width, shape.height), 6); // limit it to 4000px
                // alert(imgScale)       
                let options = {
                    format: "PNG",
                    constraint: { type: "SCALE", value: imgScale }
                };
                let shapeTransform = shape.relativeTransform; // store transform
                let removeTransform = [[1, 0, shape.x], [0, 1, shape.y]];
                shape.relativeTransform = removeTransform;
                shape.exportAsync(options)
                    .then(img => {
                    // console.log(figma.createImage(img));
                    let rect = figma.createRectangle();
                    shape.parent.appendChild(rect);
                    rect.x = shape.x;
                    rect.y = shape.y;
                    rect.relativeTransform = shapeTransform;
                    rect.name = shape.name + '_rasterize';
                    rect.resize(shape.width, shape.height);
                    let fillObj = JSON.parse(JSON.stringify(rect.fills[0]));
                    fillObj.filters = {
                        contrast: 0,
                        exposure: 0,
                        highlights: 0,
                        saturation: 0,
                        shadows: 0,
                        temperature: 0,
                        tint: 0,
                    };
                    fillObj.imageHash = figma.createImage(img).hash;
                    fillObj.imageTransform = [[1, 0, 0], [0, 1, 0]];
                    fillObj.scaleMode = "CROP";
                    fillObj.type = "IMAGE";
                    fillObj.scalingFactor = 0.5,
                        delete fillObj.color;
                    rect.fills = [fillObj];
                    newSelection.push(rect);
                    shape.relativeTransform = shapeTransform;
                });
                layerCount++;
            }
        });
        setTimeout(() => { figma.currentPage.selection = newSelection; }, 50);
        return layerCount;
    }
    catch (error) {
        console.log(error);
        return layerCount;
    }
}
function generateFrameImage() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let firstSelected = figma.currentPage.selection[0];
            let parentFrame = findFrame(figma.currentPage.selection[0]);
            let options = {
                format: "PNG",
                constraint: { type: "SCALE", value: 6 }
            };
            parentFrame.exportAsync(options)
                .then(img => {
                // console.log('hsadjfhjkahsdf', img);
                return figma.createImage(img);
            });
        }
        catch (error) {
            console.log(error);
            return null;
        }
    });
}


/***/ })

/******/ });
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vLy4vc3JjL2NvZGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtRQUFBO1FBQ0E7O1FBRUE7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTs7UUFFQTtRQUNBOztRQUVBO1FBQ0E7O1FBRUE7UUFDQTtRQUNBOzs7UUFHQTtRQUNBOztRQUVBO1FBQ0E7O1FBRUE7UUFDQTtRQUNBO1FBQ0EsMENBQTBDLGdDQUFnQztRQUMxRTtRQUNBOztRQUVBO1FBQ0E7UUFDQTtRQUNBLHdEQUF3RCxrQkFBa0I7UUFDMUU7UUFDQSxpREFBaUQsY0FBYztRQUMvRDs7UUFFQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0EseUNBQXlDLGlDQUFpQztRQUMxRSxnSEFBZ0gsbUJBQW1CLEVBQUU7UUFDckk7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7UUFDQSwyQkFBMkIsMEJBQTBCLEVBQUU7UUFDdkQsaUNBQWlDLGVBQWU7UUFDaEQ7UUFDQTtRQUNBOztRQUVBO1FBQ0Esc0RBQXNELCtEQUErRDs7UUFFckg7UUFDQTs7O1FBR0E7UUFDQTs7Ozs7Ozs7Ozs7OztBQ2xGYTtBQUNiO0FBQ0EsMkJBQTJCLCtEQUErRCxnQkFBZ0IsRUFBRSxFQUFFO0FBQzlHO0FBQ0EsbUNBQW1DLE1BQU0sNkJBQTZCLEVBQUUsWUFBWSxXQUFXLEVBQUU7QUFDakcsa0NBQWtDLE1BQU0saUNBQWlDLEVBQUUsWUFBWSxXQUFXLEVBQUU7QUFDcEcsK0JBQStCLHFGQUFxRjtBQUNwSDtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0Esd0JBQXdCLDBCQUEwQjtBQUNsRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHNDQUFzQyxpQ0FB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QixXQUFXO0FBQ3pDO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx1RkFBdUY7QUFDdkY7QUFDQTtBQUNBO0FBQ0EsaUNBQWlDO0FBQ2pDO0FBQ0EsNkRBQTZEO0FBQzdEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQSxTQUFTO0FBQ1QsMEJBQTBCLDRDQUE0QyxFQUFFO0FBQ3hFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw2QkFBNkI7QUFDN0I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMIiwiZmlsZSI6ImNvZGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSkge1xuIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuIFx0XHR9XG4gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbiBcdFx0XHRpOiBtb2R1bGVJZCxcbiBcdFx0XHRsOiBmYWxzZSxcbiBcdFx0XHRleHBvcnRzOiB7fVxuIFx0XHR9O1xuXG4gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4gXHRcdG1vZHVsZS5sID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9uIGZvciBoYXJtb255IGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uZCA9IGZ1bmN0aW9uKGV4cG9ydHMsIG5hbWUsIGdldHRlcikge1xuIFx0XHRpZighX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIG5hbWUpKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBnZXR0ZXIgfSk7XG4gXHRcdH1cbiBcdH07XG5cbiBcdC8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uciA9IGZ1bmN0aW9uKGV4cG9ydHMpIHtcbiBcdFx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG4gXHRcdH1cbiBcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbiBcdH07XG5cbiBcdC8vIGNyZWF0ZSBhIGZha2UgbmFtZXNwYWNlIG9iamVjdFxuIFx0Ly8gbW9kZSAmIDE6IHZhbHVlIGlzIGEgbW9kdWxlIGlkLCByZXF1aXJlIGl0XG4gXHQvLyBtb2RlICYgMjogbWVyZ2UgYWxsIHByb3BlcnRpZXMgb2YgdmFsdWUgaW50byB0aGUgbnNcbiBcdC8vIG1vZGUgJiA0OiByZXR1cm4gdmFsdWUgd2hlbiBhbHJlYWR5IG5zIG9iamVjdFxuIFx0Ly8gbW9kZSAmIDh8MTogYmVoYXZlIGxpa2UgcmVxdWlyZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy50ID0gZnVuY3Rpb24odmFsdWUsIG1vZGUpIHtcbiBcdFx0aWYobW9kZSAmIDEpIHZhbHVlID0gX193ZWJwYWNrX3JlcXVpcmVfXyh2YWx1ZSk7XG4gXHRcdGlmKG1vZGUgJiA4KSByZXR1cm4gdmFsdWU7XG4gXHRcdGlmKChtb2RlICYgNCkgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAmJiB2YWx1ZS5fX2VzTW9kdWxlKSByZXR1cm4gdmFsdWU7XG4gXHRcdHZhciBucyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18ucihucyk7XG4gXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShucywgJ2RlZmF1bHQnLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2YWx1ZSB9KTtcbiBcdFx0aWYobW9kZSAmIDIgJiYgdHlwZW9mIHZhbHVlICE9ICdzdHJpbmcnKSBmb3IodmFyIGtleSBpbiB2YWx1ZSkgX193ZWJwYWNrX3JlcXVpcmVfXy5kKG5zLCBrZXksIGZ1bmN0aW9uKGtleSkgeyByZXR1cm4gdmFsdWVba2V5XTsgfS5iaW5kKG51bGwsIGtleSkpO1xuIFx0XHRyZXR1cm4gbnM7XG4gXHR9O1xuXG4gXHQvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5uID0gZnVuY3Rpb24obW9kdWxlKSB7XG4gXHRcdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuIFx0XHRcdGZ1bmN0aW9uIGdldERlZmF1bHQoKSB7IHJldHVybiBtb2R1bGVbJ2RlZmF1bHQnXTsgfSA6XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0TW9kdWxlRXhwb3J0cygpIHsgcmV0dXJuIG1vZHVsZTsgfTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgJ2EnLCBnZXR0ZXIpO1xuIFx0XHRyZXR1cm4gZ2V0dGVyO1xuIFx0fTtcblxuIFx0Ly8gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7IHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSk7IH07XG5cbiBcdC8vIF9fd2VicGFja19wdWJsaWNfcGF0aF9fXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBcIlwiO1xuXG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oX193ZWJwYWNrX3JlcXVpcmVfXy5zID0gXCIuL3NyYy9jb2RlLnRzXCIpO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xyXG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XHJcbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cclxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XHJcbiAgICB9KTtcclxufTtcclxuLy9AdHMtbm9jaGVja1xyXG5maWdtYS5zaG93VUkoX19odG1sX18sIHsgd2lkdGg6IDE2NiwgaGVpZ2h0OiAxODQgfSk7XHJcbmxldCBoYXNGcmFtZURhdGE7XHJcbmxldCBzaGFwZVRyZWUgPSBbXTtcclxubGV0IGltYWdlSGFzaExpc3QgPSBbXTtcclxubGV0IGltYWdlQnl0ZXNMaXN0ID0gW107XHJcbmxldCByYXN0ZXJpemVMaXN0ID0gW107XHJcbmxldCBwcmVmcyA9IHtcclxuICAgIGV4cG9ydFJlZkltYWdlOiBmYWxzZSxcclxuICAgIGltZ1NhdmVEaWFsb2c6IGZhbHNlLFxyXG59O1xyXG4vLyByZWNlaXZlIG1lc3NhZ2UgZnJvbSB0aGUgVUlcclxuZmlnbWEudWkub25tZXNzYWdlID0gbWVzc2FnZSA9PiB7XHJcbiAgICBpZiAobWVzc2FnZS50eXBlID09PSAnZ2V0UHJlZnMnKSB7XHJcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ2dldCB0aG9zZSBwcmVmcycpO1xyXG4gICAgICAgIGZpZ21hLmNsaWVudFN0b3JhZ2UuZ2V0QXN5bmMoJ2FldXgucHJlZnMnKVxyXG4gICAgICAgICAgICAudGhlbihwcmVmcyA9PiB7XHJcbiAgICAgICAgICAgIGlmIChwcmVmcykge1xyXG4gICAgICAgICAgICAgICAgZmlnbWEudWkucG9zdE1lc3NhZ2UoeyB0eXBlOiAncmV0UHJlZnMnLCBwcmVmczogcHJlZnMgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJlZnM7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnZ290dGEgc2F2ZSBuZXcgcHJlZnMnLCBtZXNzYWdlLmRlZmF1bHRQcmVmcyk7XHJcbiAgICAgICAgICAgICAgICBmaWdtYS5jbGllbnRTdG9yYWdlLnNldEFzeW5jKCdhZXV4LnByZWZzJywgbWVzc2FnZS5kZWZhdWx0UHJlZnMpXHJcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHsgdHlwZTogJ3JldFByZWZzJywgcHJlZnM6IG1lc3NhZ2UuZGVmYXVsdFByZWZzIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbWVzc2FnZS5kZWZhdWx0UHJlZnM7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgICAgICAgICAudGhlbih1c2VyUHJlZnMgPT4ge1xyXG4gICAgICAgICAgICBwcmVmcyA9IHVzZXJQcmVmcztcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGlmIChtZXNzYWdlLnR5cGUgPT09ICdzZXRQcmVmcycpIHtcclxuICAgICAgICAvLyBjb25zb2xlLmxvZygnc2F2ZSB0aG9zZSBwcmVmcycsIG1lc3NhZ2UucHJlZnMpO1xyXG4gICAgICAgIGZpZ21hLmNsaWVudFN0b3JhZ2Uuc2V0QXN5bmMoJ2FldXgucHJlZnMnLCBtZXNzYWdlLnByZWZzKVxyXG4gICAgICAgICAgICAudGhlbihyZXQgPT4ge1xyXG4gICAgICAgICAgICBmaWdtYS51aS5wb3N0TWVzc2FnZShtZXNzYWdlLnByZWZzKTtcclxuICAgICAgICAgICAgcHJlZnMgPSBtZXNzYWdlLnByZWZzOyAvLyBzdG9yZSB0aGUgcHJlZnMgbG9jYWxseVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gJ2V4cG9ydENhbmNlbCcpIHtcclxuICAgIH1cclxuICAgIGlmIChtZXNzYWdlLnR5cGUgPT09ICdleHBvcnRTZWxlY3Rpb24nKSB7XHJcbiAgICAgICAgaGFzRnJhbWVEYXRhID0gZmFsc2U7XHJcbiAgICAgICAgc2hhcGVUcmVlID0gW107XHJcbiAgICAgICAgaW1hZ2VIYXNoTGlzdCA9IFtdO1xyXG4gICAgICAgIGltYWdlQnl0ZXNMaXN0ID0gW107XHJcbiAgICAgICAgcmFzdGVyaXplTGlzdCA9IFtdO1xyXG4gICAgICAgIGxldCBleHBvcnRKU09OID0gbWVzc2FnZS5leHBvcnRKU09OIHx8IGZhbHNlO1xyXG4gICAgICAgIGlmIChmaWdtYS5jdXJyZW50UGFnZS5zZWxlY3Rpb24ubGVuZ3RoIDwgMSkge1xyXG4gICAgICAgICAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7IHR5cGU6ICdmZXRjaEFFVVgnLCBkYXRhOiBudWxsIH0pO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGxldCBzZWxlY3Rpb24gPSBub2RlVG9PYmooZmlnbWEuY3VycmVudFBhZ2Uuc2VsZWN0aW9uKTtcclxuICAgICAgICAgICAgaWYgKHNoYXBlVHJlZVswXSAmJiBzaGFwZVRyZWVbMF0uY2hpbGRyZW4pIHtcclxuICAgICAgICAgICAgICAgIHNoYXBlVHJlZVswXS5jaGlsZHJlbiA9IHNlbGVjdGlvbjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIGlmIG5vIGZyYW1lIHdhcyB3cmFwcGVkXHJcbiAgICAgICAgICAgICAgICBzaGFwZVRyZWUgPSBbeyBjaGlsZHJlbjogc2VsZWN0aW9uIH1dO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzZWxlY3RlZCBsYXllcnMgbmVlZCB0byBiZSBpbnNpZGUgb2YgYSBmcmFtZScpO1xyXG4gICAgICAgICAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7IHR5cGU6ICdmb290ZXJNc2cnLCBhY3Rpb246ICdMYXllcnMgbXVzdCBiZSBpbnNpZGUgb2YgYSBmcmFtZScsIGxheWVyQ291bnQ6IG51bGwgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCByZWZJbWcgPSBudWxsLCB0ZW1wR3JvdXAsIHBhcmVudEZyYW1lO1xyXG4gICAgICAgIGlmIChwcmVmcy5leHBvcnRSZWZJbWFnZSkgeyAvLyBpbmNsdWRlIGEgcmVmZXJlbmNlIGltYWdlIHdpdGggdHJhbnNmZXJcclxuICAgICAgICAgICAgcGFyZW50RnJhbWUgPSBmaW5kRnJhbWUoZmlnbWEuY3VycmVudFBhZ2Uuc2VsZWN0aW9uWzBdKTtcclxuICAgICAgICAgICAgbGV0IHBhcmVudEZyYW1lTmFtZSA9IHBhcmVudEZyYW1lLm5hbWUucmVwbGFjZSgvXFxzKihcXC98XFxcXClcXHMqL2csICctJykucmVwbGFjZSgvXlxcKlxccy8sICcnKS5yZXBsYWNlKC9eXFwqLywgJycpO1xyXG4gICAgICAgICAgICAvLyBncm91cCBhbmQgbWFza1xyXG4gICAgICAgICAgICBsZXQgbWFzayA9IGZpZ21hLmNyZWF0ZVJlY3RhbmdsZSgpO1xyXG4gICAgICAgICAgICBtYXNrLnggPSBwYXJlbnRGcmFtZS54O1xyXG4gICAgICAgICAgICBtYXNrLnkgPSBwYXJlbnRGcmFtZS55O1xyXG4gICAgICAgICAgICBtYXNrLnJlc2l6ZShwYXJlbnRGcmFtZS53aWR0aCwgcGFyZW50RnJhbWUuaGVpZ2h0KTtcclxuICAgICAgICAgICAgdGVtcEdyb3VwID0gZmlnbWEuZ3JvdXAoW21hc2tdLCBtYXNrLnBhcmVudCk7XHJcbiAgICAgICAgICAgIHRlbXBHcm91cC5hcHBlbmRDaGlsZChwYXJlbnRGcmFtZSk7XHJcbiAgICAgICAgICAgIG1hc2suaXNNYXNrID0gdHJ1ZTtcclxuICAgICAgICAgICAgcmFzdGVyaXplTGlzdC5wdXNoKHBhcmVudEZyYW1lLmlkKTtcclxuICAgICAgICAgICAgcmVmSW1nID0ge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ0ltYWdlJyxcclxuICAgICAgICAgICAgICAgIG5hbWU6IHBhcmVudEZyYW1lTmFtZSxcclxuICAgICAgICAgICAgICAgIGlkOiBwYXJlbnRGcmFtZS5pZC5yZXBsYWNlKC86L2csICctJyksXHJcbiAgICAgICAgICAgICAgICBmcmFtZTogeyB4OiBwYXJlbnRGcmFtZS53aWR0aCAvIDIsIHk6IHBhcmVudEZyYW1lLmhlaWdodCAvIDIsIHdpZHRoOiBwYXJlbnRGcmFtZS53aWR0aCwgaGVpZ2h0OiBwYXJlbnRGcmFtZS5oZWlnaHQgfSxcclxuICAgICAgICAgICAgICAgIGlzVmlzaWJsZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIG9wYWNpdHk6IDUwLFxyXG4gICAgICAgICAgICAgICAgYmxlbmRNb2RlOiAnQmxlbmRpbmdNb2RlLk5PUk1BTCcsXHJcbiAgICAgICAgICAgICAgICBpc01hc2s6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgcm90YXRpb246IDAsXHJcbiAgICAgICAgICAgICAgICBndWlkZTogdHJ1ZSxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHJhc3Rlcml6ZUxpc3QubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICByYXN0ZXJpemVMaXN0ID0gWy4uLm5ldyBTZXQocmFzdGVyaXplTGlzdCldOyAvLyByZW1vdmUgZHVwbGljYXRlc1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnUkFTVEVSSVpFTElTVCcsIHJhc3Rlcml6ZUxpc3QpO1xyXG4gICAgICAgICAgICBsZXQgcmVxdWVzdHMgPSByYXN0ZXJpemVMaXN0Lm1hcCgoaXRlbSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2l0ZW4rKycsIGl0ZW0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXN5bmNDb2xsZWN0SGFzaGVzKGl0ZW0sIHJlc29sdmUpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBQcm9taXNlLmFsbChyZXF1ZXN0cylcclxuICAgICAgICAgICAgICAgIC50aGVuKCgpID0+IHN0b3JlSW1hZ2VEYXRhKGltYWdlSGFzaExpc3QsIHNoYXBlVHJlZSwgcmVmSW1nKSlcclxuICAgICAgICAgICAgICAgIC50aGVuKCgpID0+IHtcclxuICAgICAgICAgICAgICAgIC8vIHJlbW92ZSB0aGUgcmVmZXJlbmNlIG1hc2tcclxuICAgICAgICAgICAgICAgIGlmICh0ZW1wR3JvdXApIHtcclxuICAgICAgICAgICAgICAgICAgICB0ZW1wR3JvdXAucGFyZW50LmFwcGVuZENoaWxkKHBhcmVudEZyYW1lKTtcclxuICAgICAgICAgICAgICAgICAgICB0ZW1wR3JvdXAucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgLy8gY2hlY2sgaWYgaW1hZ2VzIG5lZWQgdG8gZXhwb3J0IHRoZW4gc2VuZCBtZXNzYWdlIHRvIHVpLnRzXHJcbiAgICAgICAgICAgIGlmIChleHBvcnRKU09OKSB7XHJcbiAgICAgICAgICAgICAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7IHR5cGU6ICdleHBvcnRBRVVYJywgZGF0YTogc2hhcGVUcmVlIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGltYWdlSGFzaExpc3QubGVuZ3RoIDwgMSkge1xyXG4gICAgICAgICAgICAgICAgZmlnbWEudWkucG9zdE1lc3NhZ2UoeyB0eXBlOiAnZmV0Y2hBRVVYJywgZGF0YTogc2hhcGVUcmVlIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc3RvcmVJbWFnZURhdGEoaW1hZ2VIYXNoTGlzdCwgc2hhcGVUcmVlLCBudWxsKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBjb25zb2xlLmxvZygnaW1hZ2VIYXNoTGlzdCcsIGltYWdlSGFzaExpc3QpO1xyXG4gICAgICAgIGZ1bmN0aW9uIGNsb25lKHZhbCkge1xyXG4gICAgICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh2YWwpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZnVuY3Rpb24gYXN5bmNDb2xsZWN0SGFzaGVzKGlkLCBjYikge1xyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdkb25lIHdpdGgnLCBpdGVtKTtcclxuICAgICAgICAgICAgICAgIGxldCBzaGFwZSA9IGZpZ21hLmdldE5vZGVCeUlkKGlkKTtcclxuICAgICAgICAgICAgICAgIC8vIGRpc2FibGUgZWZmZWN0c1xyXG4gICAgICAgICAgICAgICAgbGV0IGVmZmVjdFZpc0xpc3QgPSBbXTsgLy8gdG8gc3RvcmUgdGhlIGVmZmVjdCB2aXNpYmlsaXR5XHJcbiAgICAgICAgICAgICAgICBsZXQgZWZmZWN0cztcclxuICAgICAgICAgICAgICAgIGlmIChzaGFwZS5lZmZlY3RzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWZmZWN0cyA9IGNsb25lKHNoYXBlLmVmZmVjdHMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGVmZmVjdHMuZm9yRWFjaChlZmZlY3QgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlZmZlY3RWaXNMaXN0LnB1c2goZWZmZWN0LnZpc2libGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWZmZWN0LnR5cGUgPT0gJ0RST1BfU0hBRE9XJyB8fCBlZmZlY3QudHlwZSA9PSAnTEFZRVJfQkxVUicpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVmZmVjdC52aXNpYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBzaGFwZS5lZmZlY3RzID0gZWZmZWN0cztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGxldCBjb21wTXVsdCA9IDM7XHJcbiAgICAgICAgICAgICAgICBsZXQgaW1nU2NhbGUgPSBNYXRoLm1pbigzNTAwIC8gTWF0aC5tYXgoc2hhcGUud2lkdGgsIHNoYXBlLmhlaWdodCksIGNvbXBNdWx0KTsgLy8gbGltaXQgaXQgdG8gNDAwMHB4XHJcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnSU1BR0VTQ0FMRScsIGltZ1NjYWxlLCBzaGFwZSk7XHJcbiAgICAgICAgICAgICAgICBzaGFwZS5leHBvcnRBc3luYyh7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9ybWF0OiBcIlBOR1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIHVzZUFic29sdXRlQm91bmRzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0cmFpbnQ6IHsgdHlwZTogXCJTQ0FMRVwiLCB2YWx1ZTogaW1nU2NhbGUgfVxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgICAudGhlbihpbWcgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGltYWdlSGFzaExpc3QucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhc2g6IGZpZ21hLmNyZWF0ZUltYWdlKGltZykuaGFzaCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IGAke3NoYXBlLm5hbWUucmVwbGFjZSgvXlxcKlxccy8sICcnKS5yZXBsYWNlKC9eXFwqLywgJycpfV8ke2lkfWBcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHJlLWVuYWJsZSBlZmZlY3RzIFxyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZWZmZWN0VmlzTGlzdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlZmZlY3RzW2ldLnZpc2libGUgPSBlZmZlY3RWaXNMaXN0W2ldO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBzaGFwZS5lZmZlY3RzID0gZWZmZWN0cztcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNiKCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSwgMTAwKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAobWVzc2FnZS50eXBlID09PSAnYWRkUmFzdGVyaXplRmxhZycpIHtcclxuICAgICAgICBpZiAoZmlnbWEuY3VycmVudFBhZ2Uuc2VsZWN0aW9uLmxlbmd0aCA8IDEpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH0gLy8gbm90aGluZyBzZWxlY3RlZFxyXG4gICAgICAgIC8vIGxldCBzZWxlY3Rpb24gPSBub2RlVG9PYmooZmlnbWEuY3VycmVudFBhZ2Uuc2VsZWN0aW9uKVxyXG4gICAgICAgIGxldCBsYXllckNvdW50ID0gYWRkTWFnaWNTdGFyKGZpZ21hLmN1cnJlbnRQYWdlLnNlbGVjdGlvbiwgMCkgfHwgMDtcclxuICAgICAgICAvLyByZXNlbGVjdCBsYXllcnNcclxuICAgICAgICBmaWdtYS5jdXJyZW50UGFnZS5zZWxlY3Rpb24gPSBmaWdtYS5jdXJyZW50UGFnZS5zZWxlY3Rpb247XHJcbiAgICAgICAgZmlnbWEudWkucG9zdE1lc3NhZ2UoeyB0eXBlOiAnZm9vdGVyTXNnJywgYWN0aW9uOiAnbWFya2VkIGFzIFBORycsIGxheWVyQ291bnQgfSk7XHJcbiAgICB9XHJcbiAgICAvLyBpZiAobWVzc2FnZS50eXBlID09PSAnZmxhdHRlbkxheWVycycpIHtcclxuICAgIC8vICAgICBpZiAoZmlnbWEuY3VycmVudFBhZ2Uuc2VsZWN0aW9uLmxlbmd0aCA8IDEpIHsgcmV0dXJuIH0gICAgICAvLyBub3RoaW5nIHNlbGVjdGVkXHJcbiAgICAvLyAgICAgLy8gbGV0IHNlbGVjdGlvbiA9IG5vZGVUb09iaihmaWdtYS5jdXJyZW50UGFnZS5zZWxlY3Rpb24pXHJcbiAgICAvLyAgICAgbGV0IGxheWVyQ291bnQgPSBmbGF0dGVuUmVjdXJzaXZlKGZpZ21hLmN1cnJlbnRQYWdlLnNlbGVjdGlvbiwgMCkgfHwgMFxyXG4gICAgLy8gICAgIC8vIHJlc2VsZWN0IGxheWVyc1xyXG4gICAgLy8gICAgIGZpZ21hLmN1cnJlbnRQYWdlLnNlbGVjdGlvbiA9IGZpZ21hLmN1cnJlbnRQYWdlLnNlbGVjdGlvblxyXG4gICAgLy8gICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHt0eXBlOiAnZm9vdGVyTXNnJywgYWN0aW9uOiAnZmxhdHRlbmVkJywgbGF5ZXJDb3VudH0pO1xyXG4gICAgLy8gfVxyXG4gICAgLy8gaWYgKG1lc3NhZ2UudHlwZSA9PT0gJ3Jhc3Rlcml6ZVNlbGVjdGlvbicpIHtcclxuICAgIC8vICAgICBpZiAoZmlnbWEuY3VycmVudFBhZ2Uuc2VsZWN0aW9uLmxlbmd0aCA8IDEpIHsgcmV0dXJuIH0gICAgICAvLyBub3RoaW5nIHNlbGVjdGVkXHJcbiAgICAvLyAgICAgLy8gbGV0IHNlbGVjdGlvbiA9IG5vZGVUb09iaihmaWdtYS5jdXJyZW50UGFnZS5zZWxlY3Rpb24pXHJcbiAgICAvLyAgICAgbGV0IGxheWVyQ291bnQgPSByYXN0ZXJpemVTZWxlY3Rpb24oZmlnbWEuY3VycmVudFBhZ2Uuc2VsZWN0aW9uLCAwKSB8fCAwXHJcbiAgICAvLyAgICAgLy8gY29uc29sZS5sb2coJ2xheWVyQ291bnQnLCBsYXllckNvdW50KTtcclxuICAgIC8vICAgICAvLyByZXNlbGVjdCBsYXllcnNcclxuICAgIC8vICAgICBmaWdtYS5jdXJyZW50UGFnZS5zZWxlY3Rpb24gPSBmaWdtYS5jdXJyZW50UGFnZS5zZWxlY3Rpb25cclxuICAgIC8vICAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7dHlwZTogJ2Zvb3Rlck1zZycsIGFjdGlvbjogJ3Jhc3Rlcml6ZWQnLCBsYXllckNvdW50fSk7XHJcbiAgICAvLyB9XHJcbiAgICAvLyBpZiAobWVzc2FnZS50eXBlID09PSAnZGV0YWNoQ29tcG9uZW50cycpIHtcclxuICAgIC8vICAgICBjb25zb2xlLmxvZygnZGV0YWNoQ29tcG9uZW50cycpO1xyXG4gICAgLy8gICAgIGxldCBsYXllckNvdW50ID0gNDtcclxuICAgIC8vICAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7dHlwZTogJ2Zvb3Rlck1zZycsIGFjdGlvbjogJ2ZsYXR0ZW5lZCcsIGxheWVyQ291bnR9KTtcclxuICAgIC8vIH1cclxuICAgIC8vQ29tbXVuaWNhdGUgYmFjayB0byB0aGUgVUlcclxuICAgIC8vIGNvbnNvbGUubG9nKCdzZW5kIG1lc3NhZ2UgYmFjayB0byB1aScpO1xyXG59O1xyXG5mdW5jdGlvbiBub2RlVG9PYmoobm9kZXMpIHtcclxuICAgIC8vICAgY29uc29sZS5sb2coJ25vZGVzJywgbm9kZXMpO1xyXG4gICAgaWYgKG5vZGVzLmxlbmd0aCA8IDEpIHtcclxuICAgICAgICByZXR1cm4gW107XHJcbiAgICB9XHJcbiAgICAvLyBjb25zb2xlLmxvZyhub2Rlc1swXS50eXBlKTtcclxuICAgIGxldCBhcnIgPSBbXTtcclxuICAgIC8vIGxvb2sgZm9yIHRoZSBwYXJlbnQgZnJhbWUgb2YgZXZlcnl0aGluZyBleGNlcHQgcmVndWxhciAobm9uLWF1dG9MYXlvdXQpIGZyYW1lcyBhbmQgbG9vc2UgY29tcG9uZW50c1xyXG4gICAgaWYgKG5vZGVzWzBdICYmICgobm9kZXNbMF0udHlwZSA9PT0gJ0ZSQU1FJyAmJiBub2Rlc1swXS5wYXJlbnQudHlwZSA9PT0gJ1BBR0UnKSB8fFxyXG4gICAgICAgIC8vIChub2Rlc1swXS50eXBlID09PSAnRlJBTUUnICYmIG5vZGVzWzBdLmxheW91dE1vZGUgPT09ICdOT05FJykgfHwgXHJcbiAgICAgICAgKG5vZGVzWzBdLnR5cGUgPT09ICdDT01QT05FTlQnICYmIG5vZGVzWzBdLnBhcmVudC50eXBlID09PSAnUEFHRScpKSkgeyAvLyBhIGZyYW1lIG9yIGEgY29tcG9uZW50IG1hc3RlciBvdXRzaWRlIG9mIGEgZnJhbWUgaXMgZGlyZWN0bHkgc2VsZWN0ZWRcclxuICAgICAgICBjb25zb2xlLmxvZygnR09UIEEgRlJBTUUnKTtcclxuICAgICAgICAvLyBjb25zb2xlLmxvZyhub2Rlc1swXS5jaGlsZHJlbik7XHJcbiAgICAgICAgaGFzRnJhbWVEYXRhID0gdHJ1ZTsgLy8gZG9udCBuZWVkIHRvIGdldCB0aGUgZnJhbWUgZGF0YVxyXG4gICAgICAgIHNoYXBlVHJlZS5wdXNoKGdldEVsZW1lbnQobm9kZXNbMF0sIGZhbHNlKSk7XHJcbiAgICAgICAgbm9kZXMgPSBub2Rlc1swXS5jaGlsZHJlbjtcclxuICAgIH1cclxuICAgIC8vIGdldCBzaGFwZXMgXHJcbiAgICBpZiAobm9kZXMubGVuZ3RoIDwgMSkge1xyXG4gICAgICAgIHJldHVybiBbXTtcclxuICAgIH1cclxuICAgIG5vZGVzLmZvckVhY2gobm9kZSA9PiB7XHJcbiAgICAgICAgLy8gZ2V0IHRoZSBmcmFtZSBkYXRhXHJcbiAgICAgICAgaWYgKCFoYXNGcmFtZURhdGEpIHtcclxuICAgICAgICAgICAgaWYgKG5vZGUucGFyZW50LnR5cGUgPT09ICdQQUdFJykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9IC8vIGxheWVyIGlzIG91dHNpZGUgb2YgYSBmcmFtZSBcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ2dldCB0aGUgZnJhbWUgZGF0YScpO1xyXG4gICAgICAgICAgICBsZXQgZnJhbWUgPSBmaW5kRnJhbWUobm9kZSk7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdmcmFtZTonLCBmcmFtZSk7XHJcbiAgICAgICAgICAgIGxldCBmcmFtZURhdGEgPSBnZXRFbGVtZW50KGZyYW1lLCB0cnVlKTsgLy8gc2tpcCBnYXRoZXJpbmcgY2hpbGRyZW4gZGF0YVxyXG4gICAgICAgICAgICBmcmFtZURhdGEuY2hpbGRyZW4gPSBbXTsgLy8gY2xlYXIgdGhlIGNoaWxkcmVuIG9mIHRoZSBmcmFtZSB0byBwdXNoIHRoZW0gbGF0ZXJcclxuICAgICAgICAgICAgc2hhcGVUcmVlLnB1c2goZnJhbWVEYXRhKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IG9iaiA9IGdldEVsZW1lbnQobm9kZSwgZmFsc2UpO1xyXG4gICAgICAgIGFyci5wdXNoKG9iaik7XHJcbiAgICB9KTtcclxuICAgIC8vIGNvbnNvbGUubG9nKCdhcnI6ICcsIGFycik7XHJcbiAgICByZXR1cm4gYXJyO1xyXG4gICAgZnVuY3Rpb24gZ2V0RWxlbWVudChub2RlLCBza2lwQ2hpbGRyZW4pIHtcclxuICAgICAgICAvLyBjb25zb2xlLmxvZygnbm9kZScsIG5vZGUubmFtZSk7XHJcbiAgICAgICAgbGV0IHJhc3Rlcml6ZSA9IGZhbHNlO1xyXG4gICAgICAgIGxldCBvYmogPSB7XHJcbiAgICAgICAgICAgIGNoaWxkcmVuOiBbXSxcclxuICAgICAgICAgICAgdHlwZTogbnVsbCxcclxuICAgICAgICB9O1xyXG4gICAgICAgIGlmIChub2RlLm5hbWUgJiYgbm9kZS5uYW1lLmNoYXJBdCgwKSA9PSAnKicgJiYgbm9kZSAhPSBmaW5kRnJhbWUobm9kZSkpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ3Jhc3Rlcml6ZScsIG5vZGUpO1xyXG4gICAgICAgICAgICByYXN0ZXJpemVMaXN0LnB1c2gobm9kZS5pZCk7XHJcbiAgICAgICAgICAgIHJhc3Rlcml6ZSA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIG5vZGUpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGxldCBlbGVtZW50ID0gbm9kZVtrZXldO1xyXG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoa2V5ID09PSAnY2hpbGRyZW4nICYmICFza2lwQ2hpbGRyZW4gJiYgIXJhc3Rlcml6ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBub2RlVG9PYmooZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoa2V5ID09PSAnYmFja2dyb3VuZHMnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IG5vZGVUb09iaihlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChrZXkgPT09ICdmaWxscycgJiYgZWxlbWVudC5sZW5ndGggPiAwKSB7IC8vIGFkZCBpbWFnZSBmaWxscyB0byByYXN0ZXJpemVMaXN0XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGhhc0ltYWdlRmlsbCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgaSBpbiBlbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGwgPSBlbGVtZW50W2ldO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmlsbC50eXBlID09ICdJTUFHRScpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc0ltYWdlRmlsbCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYmpbJ3Jhc3Rlcml6ZSddID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdpbWFnZScsIGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gb2JqLnR5cGUgPSAnUkVDVEFOR0xFJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmV0dXJuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhc0ltYWdlRmlsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByYXN0ZXJpemVMaXN0LnB1c2gobm9kZS5pZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gY29ybmVyIHJhZGl1c1xyXG4gICAgICAgICAgICAgICAgLy8gaWYgKGtleSA9PT0gJ2Nvcm5lclJhZGl1cycpIHtcclxuICAgICAgICAgICAgICAgIC8vICAgICBjb25zb2xlLmxvZyhrZXksICBlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgIC8vIH1cclxuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50ID09IGZpZ21hLm1peGVkICYmIGtleSA9PT0gJ2Nvcm5lclJhZGl1cycpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gTWF0aC5taW4obm9kZS50b3BMZWZ0UmFkaXVzLCBub2RlLnRvcFJpZ2h0UmFkaXVzLCBub2RlLmJvdHRvbUxlZnRSYWRpdXMsIG5vZGUuYm90dG9tUmlnaHRSYWRpdXMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gdHJ5IHRvIGdldCB0aGUgZmlyc3QgdmFsdWUgb24gdGhlIHRleHRcclxuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50ID09IGZpZ21hLm1peGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHN0ciA9ICdnZXRSYW5nZScgKyBrZXkucmVwbGFjZSgvXlxcdy8sIGMgPT4gYy50b1VwcGVyQ2FzZSgpKTtcclxuICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gbm9kZVtzdHJdKDAsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gbGF5ZXIuZm9udE5hbWUgIT09IChmaWdtYS5taXhlZCkpID8gbGF5ZXIuZm9udE5hbWUuZmFtaWx5IDogbGF5ZXIuZ2V0UmFuZ2VGb250TmFtZSgwLDEpLmZhbWlseVxyXG4gICAgICAgICAgICAgICAgLy8gaWYgKGtleSA9PT0gJ3BhcmVudCcpIHsgY29uc29sZS5sb2coZWxlbWVudCk7IH1cclxuICAgICAgICAgICAgICAgIG9ialtrZXldID0gZWxlbWVudDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdFUlJPUicsIGVycm9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAobm9kZS50eXBlID09PSAnVkVDVE9SJyB8fCBub2RlLnR5cGUgPT09ICdCT09MRUFOX09QRVJBVElPTicgfHwgbm9kZS50eXBlID09PSAnU1RBUicgfHwgbm9kZS50eXBlID09PSAnUE9MWUdPTicgfHwgbm9kZS50eXBlID09PSAnRUxMSVBTRScpIHtcclxuICAgICAgICAgICAgLy8gZmlsbEdlb21ldHJ5INGB0L7QtNC10YDQttC40YIgU1ZHIFBhdGggRGF0YSDRgSDQutGA0LjQstGL0LzQuFxyXG4gICAgICAgICAgICBpZiAoJ2ZpbGxHZW9tZXRyeScgaW4gbm9kZSAmJiBub2RlLmZpbGxHZW9tZXRyeS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBvYmpbJ2ZpbGxHZW9tZXRyeSddID0gbm9kZS5maWxsR2VvbWV0cnk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8g0J3QsCDRgdC70YPRh9Cw0LksINC10YHQu9C4INGN0YLQviDQvtCx0LLQvtC00LrQsCDQsdC10Lcg0LfQsNC70LjQstC60LhcclxuICAgICAgICAgICAgaWYgKCdzdHJva2VHZW9tZXRyeScgaW4gbm9kZSAmJiBub2RlLnN0cm9rZUdlb21ldHJ5Lmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIG9ialsnc3Ryb2tlR2VvbWV0cnknXSA9IG5vZGUuc3Ryb2tlR2VvbWV0cnk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKG5vZGUudHlwZSA9PT0gJ1RFWFQnKSB7XHJcbiAgICAgICAgICAgIC8vIC0tLSAxLiDQoNCw0YHRh9C10YIgTGluZSBIZWlnaHQgKNC+0YHRgtCw0LLQu9GP0LXQvCDQutCw0Log0LHRi9C70L4pIC0tLVxyXG4gICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgb2JqLl9jYWxjTGluZUhlaWdodCA9IG51bGw7XHJcbiAgICAgICAgICAgIGlmIChub2RlLmxpbmVIZWlnaHQudW5pdCA9PT0gJ1BJWEVMUycpIHtcclxuICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgICAgICAgICAgb2JqLl9jYWxjTGluZUhlaWdodCA9IG5vZGUubGluZUhlaWdodC52YWx1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmIChub2RlLmxpbmVIZWlnaHQudW5pdCA9PT0gJ1BFUkNFTlQnKSB7XHJcbiAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgICAgIG9iai5fY2FsY0xpbmVIZWlnaHQgPSBub2RlLmZvbnRTaXplICogKG5vZGUubGluZUhlaWdodC52YWx1ZSAvIDEwMCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBBVVRPXHJcbiAgICAgICAgICAgICAgICBjb25zdCBpc1NpbmdsZUxpbmUgPSBub2RlLmNoYXJhY3RlcnMuaW5kZXhPZignXFxuJykgPT09IC0xO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaXNBdXRvSGVpZ2h0ID0gbm9kZS50ZXh0QXV0b1Jlc2l6ZSA9PT0gJ0hFSUdIVCcgfHwgbm9kZS50ZXh0QXV0b1Jlc2l6ZSA9PT0gJ1dJRFRIX0FORF9IRUlHSFQnO1xyXG4gICAgICAgICAgICAgICAgaWYgKGlzU2luZ2xlTGluZSAmJiBpc0F1dG9IZWlnaHQpIHtcclxuICAgICAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgICAgICAgICBvYmouX2NhbGNMaW5lSGVpZ2h0ID0gbm9kZS5oZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgICAgICAgICBvYmouX2NhbGNMaW5lSGVpZ2h0ID0gbm9kZS5mb250U2l6ZSAqIDEuMjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsZXQgY2FsY3VsYXRlZE9mZnNldCA9IDA7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAvLyDQn9GA0L7QstC10YDRj9C10LwsINC10YHRgtGMINC70Lgg0YLQtdC60YHRgiwg0YfRgtC+0LHRiyDQvdC1INGD0YDQvtC90LjRgtGMINC/0LvQsNCz0LjQvVxyXG4gICAgICAgICAgICAgICAgaWYgKG5vZGUuY2hhcmFjdGVycyAmJiBub2RlLmNoYXJhY3RlcnMudHJpbSgpLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjbG9uZSA9IG5vZGUuY2xvbmUoKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyDQktCQ0JbQndCeOiDQktGL0LrQuNC00YvQstCw0LXQvCDQutC70L7QvSDQsiDQutC+0YDQtdC90Ywg0YHRgtGA0LDQvdC40YbRiywg0YfRgtC+0LHRiyDRg9Cx0YDQsNGC0Ywg0LLQu9C40Y/QvdC40LUg0LPRgNGD0L/Qvy/RhNGA0LXQudC80L7QslxyXG4gICAgICAgICAgICAgICAgICAgIGZpZ21hLmN1cnJlbnRQYWdlLmFwcGVuZENoaWxkKGNsb25lKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyDQodCx0YDQsNGB0YvQstCw0LXQvCDRgtGA0LDQvdGB0YTQvtGA0LzQsNGG0LjQuCwg0YfRgtC+0LHRiyDQuNC30LzQtdGA0Y/RgtGMINGH0LjRgdGC0YPRjiDQs9C10L7QvNC10YLRgNC40Y5cclxuICAgICAgICAgICAgICAgICAgICBjbG9uZS5yb3RhdGlvbiA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgY2xvbmUueCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgY2xvbmUueSA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g0JfQsNC/0L7QvNC40L3QsNC10LwsINCz0LTQtSDRgdGC0L7QuNGCINCy0LXRgNGFINGC0LXQutGB0YLQvtCy0L7Qs9C+INC60L7QvdGC0LXQudC90LXRgNCwICjQsiDQuNC00LXQsNC70LUg0Y3RgtC+IDApXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGV4dFRvcCA9IGNsb25lLmFic29sdXRlQm91bmRpbmdCb3gueTtcclxuICAgICAgICAgICAgICAgICAgICAvLyDQn9GA0LXQstGA0LDRidCw0LXQvCDQsiDQutGA0LjQstGL0LVcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmbGF0ID0gZmlnbWEuZmxhdHRlbihbY2xvbmVdKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyDQodC80L7RgtGA0LjQvCwg0LPQtNC1INC+0LrQsNC30LDQu9Cw0YHRjCDQstC10YDRhdC90Y/RjyDRgtC+0YfQutCwINC60YDQuNCy0YvRhSAo0LHRg9C60LIpXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmVjdG9yVG9wID0gZmxhdC5hYnNvbHV0ZUJvdW5kaW5nQm94Lnk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g0KDQsNC30L3QuNGG0LAg4oCUINGN0YLQviDQv9GD0YHRgtC+0YLQsCDRgdCy0LXRgNGF0YNcclxuICAgICAgICAgICAgICAgICAgICBjYWxjdWxhdGVkT2Zmc2V0ID0gdmVjdG9yVG9wIC0gdGV4dFRvcDtcclxuICAgICAgICAgICAgICAgICAgICAvLyDQo9Cx0LjRgNCw0LXQvCDQvNGD0YHQvtGAXHJcbiAgICAgICAgICAgICAgICAgICAgZmxhdC5yZW1vdmUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdHZW9tZXRyeSBjYWxjIGVycm9yJywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgY2FsY3VsYXRlZE9mZnNldCA9IDA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgIG9ialsnX21ldHJpY1RvcE9mZnNldCddID0gY2FsY3VsYXRlZE9mZnNldDtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8ga2VlcCB0cmFjayBvZiBBdXRvLWxheW91dCBmcmFtZXMgZm9yIGFsaWdubWVudCBvZiBjaGlsZHJlblxyXG4gICAgICAgIGlmIChub2RlLnR5cGUgPT09ICdGUkFNRScgJiYgbm9kZS5sYXlvdXRNb2RlICE9PSAnTk9ORScpIHtcclxuICAgICAgICAgICAgb2JqLnR5cGUgPSAnQVVUT0xBWU9VVCc7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBvYmo7XHJcbiAgICB9XHJcbiAgICBmdW5jdGlvbiBjb2xsZWN0SW1hZ2VIYXNoZXMoZWxlbWVudCwgaWQpIHtcclxuICAgICAgICAvLyBjb25zb2xlLmxvZygnaW1hZ2VIYXNoJywgaWQsIGVsZW1lbnQpO1xyXG4gICAgICAgIGZvciAoY29uc3QgaSBpbiBlbGVtZW50KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGZpbGwgPSBlbGVtZW50W2ldO1xyXG4gICAgICAgICAgICBpZiAoZmlsbC50eXBlID09ICdJTUFHRScpIHtcclxuICAgICAgICAgICAgICAgIGltYWdlSGFzaExpc3QucHVzaCh7IGhhc2g6IGZpbGwuaW1hZ2VIYXNoLCBpZCB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5mdW5jdGlvbiBzdG9yZUltYWdlRGF0YShpbWFnZUhhc2hMaXN0LCBsYXllcnMsIHJlZkltZykge1xyXG4gICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICAvLyBjb25zb2xlLmxvZygnbGF5ZXJzKysnLCBsYXllcnMpO1xyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdpbWFnZUhhc2hMaXN0KysnLCBpbWFnZUhhc2hMaXN0KTtcclxuICAgICAgICBmb3IgKGNvbnN0IGkgaW4gaW1hZ2VIYXNoTGlzdCkge1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnaScsIGkpO1xyXG4gICAgICAgICAgICBjb25zdCBoYXNoID0gaW1hZ2VIYXNoTGlzdFtpXS5oYXNoO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnaGFzaCcsIGhhc2gpO1xyXG4gICAgICAgICAgICBjb25zdCBuYW1lID0gaW1hZ2VIYXNoTGlzdFtpXS5pZFxyXG4gICAgICAgICAgICAgICAgLnJlcGxhY2UoL1tcXFxcOlwiKj8lPD58XS9nLCAnLScpIC8vIHJlcGxhY2UgaWxsZWdhbCBjaGFyYWN0ZXJzXHJcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxzKihcXC98XFxcXClcXHMqL2csICctJyk7IC8vIHJlbW92ZSBzbGFzaGVzXHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCduYW1lJywgbmFtZSk7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgaW1hZ2UgPSBmaWdtYS5nZXRJbWFnZUJ5SGFzaChoYXNoKTtcclxuICAgICAgICAgICAgICAgIGxldCBieXRlcyA9IHlpZWxkIGltYWdlLmdldEJ5dGVzQXN5bmMoKTtcclxuICAgICAgICAgICAgICAgIGltYWdlQnl0ZXNMaXN0LnB1c2goeyBuYW1lLCBieXRlcyB9KTtcclxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdieXRlcycsIGJ5dGVzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXRjaCAoZXJyb3IpIHsgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoaW1hZ2VCeXRlc0xpc3QubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7IHR5cGU6ICdmZXRjaEltYWdlc0FuZEFFVVgnLCBpbWFnZXM6IGltYWdlQnl0ZXNMaXN0LCBkYXRhOiBsYXllcnMsIHJlZkltZyB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHsgdHlwZTogJ2ZldGNoQUVVWCcsIGRhdGE6IGxheWVycyB9KTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufVxyXG5mdW5jdGlvbiBmaW5kRnJhbWUobm9kZSkge1xyXG4gICAgLy8gY29uc29sZS5sb2coJ25vZGU6Jywgbm9kZSk7XHJcbiAgICAvLyBjb25zb2xlLmxvZygnbm9kZS50eXBlOicsIG5vZGUudHlwZSk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIGlmICgobm9kZS50eXBlICE9PSAnRlJBTUUnICYmICEobm9kZS50eXBlID09PSAnQ09NUE9ORU5UJyAmJiBub2RlLnBhcmVudC50eXBlID09PSAnUEFHRScpKVxyXG4gICAgICAgICAgICB8fCAobm9kZS50eXBlID09PSAnRlJBTUUnICYmIG5vZGUucGFyZW50LnR5cGUgPT09ICdGUkFNRScpKSB7XHJcbiAgICAgICAgICAgIC8vIGlmIChub2RlLnR5cGUgIT09ICdGUkFNRScgJiYgbm9kZS50eXBlICE9PSAnQ09NUE9ORU5UJykgeyAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgcmV0dXJuIGZpbmRGcmFtZShub2RlLnBhcmVudCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBoYXNGcmFtZURhdGEgPSB0cnVlO1xyXG4gICAgICAgICAgICByZXR1cm4gbm9kZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7IHR5cGU6ICdmb290ZXJNc2cnLCBhY3Rpb246ICdFcnJvciBpbiBmaW5kRnJhbWUoKSDwn5iWJywgbGF5ZXJDb3VudDogbnVsbCB9KTtcclxuICAgIH1cclxufVxyXG5mdW5jdGlvbiBhZGRNYWdpY1N0YXIoc2VsZWN0aW9uLCBsYXllckNvdW50KSB7XHJcbiAgICBpZiAoZmluZEZyYW1lKHNlbGVjdGlvblswXSkgPT0gc2VsZWN0aW9uWzBdKSB7IC8vIHNlbGVjdGlvbiBpcyB0aGUgdG9wIG1vc3QgZnJhbWVcclxuICAgICAgICBzZWxlY3Rpb24gPSBzZWxlY3Rpb25bMF0uY2hpbGRyZW47IC8vIHNlbGVjdCBhbGwgdGhlIGNoaWxkcmVuXHJcbiAgICB9XHJcbiAgICBzZWxlY3Rpb24uZm9yRWFjaChzaGFwZSA9PiB7XHJcbiAgICAgICAgaWYgKHNoYXBlLm5hbWUuY2hhckF0KDApICE9PSAnKicpIHtcclxuICAgICAgICAgICAgc2hhcGUubmFtZSA9IGAqICR7c2hhcGUubmFtZX1gO1xyXG4gICAgICAgICAgICBsYXllckNvdW50Kys7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gbGF5ZXJDb3VudDtcclxufVxyXG5mdW5jdGlvbiBmbGF0dGVuUmVjdXJzaXZlKHNlbGVjdGlvbiwgbGF5ZXJDb3VudCkge1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBzZWxlY3Rpb24uZm9yRWFjaChzaGFwZSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd0cnkgZmxhdHRlbmluZycsIHNoYXBlKTtcclxuICAgICAgICAgICAgaWYgKHNoYXBlLnR5cGUgPT0gJ0JPT0xFQU5fT1BFUkFUSU9OJykge1xyXG4gICAgICAgICAgICAgICAgZmlnbWEuZmxhdHRlbihbc2hhcGVdKTtcclxuICAgICAgICAgICAgICAgIGxheWVyQ291bnQrKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmIChzaGFwZS5jb3JuZXJSYWRpdXMgPT0gZmlnbWEubWl4ZWQgfHwgc2hhcGUuY29ybmVyUmFkaXVzID4gMCkge1xyXG4gICAgICAgICAgICAgICAgLy8gZmxhdHRlbiByb3VuZGVkIGNvcm5lcnNcclxuICAgICAgICAgICAgICAgIGZpZ21hLmZsYXR0ZW4oW3NoYXBlXSk7XHJcbiAgICAgICAgICAgICAgICBsYXllckNvdW50Kys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAoc2hhcGUuY2hpbGRyZW4pIHtcclxuICAgICAgICAgICAgICAgIGxheWVyQ291bnQgPSBmbGF0dGVuUmVjdXJzaXZlKHNoYXBlLmNoaWxkcmVuLCBsYXllckNvdW50KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGxldCB0ID0gc2hhcGUucmVsYXRpdmVUcmFuc2Zvcm07XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2hhcGUudHlwZScsIHNoYXBlLnR5cGUpO1xyXG4gICAgICAgICAgICAgICAgLy8vIGNoZWNrIGZvciB0cmFuc2Zvcm1zXHJcbiAgICAgICAgICAgICAgICBpZiAodFswXVswXS50b0ZpeGVkKDYpICE9IDEgfHxcclxuICAgICAgICAgICAgICAgICAgICB0WzBdWzFdLnRvRml4ZWQoNikgIT0gMCB8fFxyXG4gICAgICAgICAgICAgICAgICAgIHRbMV1bMF0udG9GaXhlZCg2KSAhPSAwIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgdFsxXVsxXS50b0ZpeGVkKDYpICE9IDEgfHxcclxuICAgICAgICAgICAgICAgICAgICBmYWxzZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGZpZ21hLmZsYXR0ZW4oW3NoYXBlXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGF5ZXJDb3VudCsrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoc2hhcGUudHlwZSA9PSAnVEVYVCcpIHtcclxuICAgICAgICAgICAgICAgICAgICBmaWdtYS5mbGF0dGVuKFtzaGFwZV0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGxheWVyQ291bnQrKztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiBsYXllckNvdW50O1xyXG4gICAgfVxyXG4gICAgY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xyXG4gICAgICAgIHJldHVybiBsYXllckNvdW50O1xyXG4gICAgfVxyXG59XHJcbmZ1bmN0aW9uIHJhc3Rlcml6ZVNlbGVjdGlvbihzZWxlY3Rpb24sIGxheWVyQ291bnQpIHtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgbGV0IG5ld1NlbGVjdGlvbiA9IFtdO1xyXG4gICAgICAgIHNlbGVjdGlvbi5mb3JFYWNoKHNoYXBlID0+IHtcclxuICAgICAgICAgICAgaWYgKHNoYXBlLnR5cGUgPT0gJ0dST1VQJykge1xyXG4gICAgICAgICAgICAgICAgbGV0IGltZ1NjYWxlID0gTWF0aC5taW4oNDAwMCAvIE1hdGgubWF4KHNoYXBlLndpZHRoLCBzaGFwZS5oZWlnaHQpLCA2KTsgLy8gbGltaXQgaXQgdG8gNDAwMHB4XHJcbiAgICAgICAgICAgICAgICAvLyBhbGVydChpbWdTY2FsZSkgICAgICAgXHJcbiAgICAgICAgICAgICAgICBsZXQgb3B0aW9ucyA9IHtcclxuICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6IFwiUE5HXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3RyYWludDogeyB0eXBlOiBcIlNDQUxFXCIsIHZhbHVlOiBpbWdTY2FsZSB9XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgbGV0IHNoYXBlVHJhbnNmb3JtID0gc2hhcGUucmVsYXRpdmVUcmFuc2Zvcm07IC8vIHN0b3JlIHRyYW5zZm9ybVxyXG4gICAgICAgICAgICAgICAgbGV0IHJlbW92ZVRyYW5zZm9ybSA9IFtbMSwgMCwgc2hhcGUueF0sIFswLCAxLCBzaGFwZS55XV07XHJcbiAgICAgICAgICAgICAgICBzaGFwZS5yZWxhdGl2ZVRyYW5zZm9ybSA9IHJlbW92ZVRyYW5zZm9ybTtcclxuICAgICAgICAgICAgICAgIHNoYXBlLmV4cG9ydEFzeW5jKG9wdGlvbnMpXHJcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oaW1nID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhmaWdtYS5jcmVhdGVJbWFnZShpbWcpKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgcmVjdCA9IGZpZ21hLmNyZWF0ZVJlY3RhbmdsZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNoYXBlLnBhcmVudC5hcHBlbmRDaGlsZChyZWN0KTtcclxuICAgICAgICAgICAgICAgICAgICByZWN0LnggPSBzaGFwZS54O1xyXG4gICAgICAgICAgICAgICAgICAgIHJlY3QueSA9IHNoYXBlLnk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVjdC5yZWxhdGl2ZVRyYW5zZm9ybSA9IHNoYXBlVHJhbnNmb3JtO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlY3QubmFtZSA9IHNoYXBlLm5hbWUgKyAnX3Jhc3Rlcml6ZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVjdC5yZXNpemUoc2hhcGUud2lkdGgsIHNoYXBlLmhlaWdodCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZpbGxPYmogPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHJlY3QuZmlsbHNbMF0pKTtcclxuICAgICAgICAgICAgICAgICAgICBmaWxsT2JqLmZpbHRlcnMgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyYXN0OiAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBleHBvc3VyZTogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaGlnaGxpZ2h0czogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2F0dXJhdGlvbjogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2hhZG93czogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGVyYXR1cmU6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbnQ6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICBmaWxsT2JqLmltYWdlSGFzaCA9IGZpZ21hLmNyZWF0ZUltYWdlKGltZykuaGFzaDtcclxuICAgICAgICAgICAgICAgICAgICBmaWxsT2JqLmltYWdlVHJhbnNmb3JtID0gW1sxLCAwLCAwXSwgWzAsIDEsIDBdXTtcclxuICAgICAgICAgICAgICAgICAgICBmaWxsT2JqLnNjYWxlTW9kZSA9IFwiQ1JPUFwiO1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbGxPYmoudHlwZSA9IFwiSU1BR0VcIjtcclxuICAgICAgICAgICAgICAgICAgICBmaWxsT2JqLnNjYWxpbmdGYWN0b3IgPSAwLjUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBmaWxsT2JqLmNvbG9yO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlY3QuZmlsbHMgPSBbZmlsbE9ial07XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3U2VsZWN0aW9uLnB1c2gocmVjdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2hhcGUucmVsYXRpdmVUcmFuc2Zvcm0gPSBzaGFwZVRyYW5zZm9ybTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgbGF5ZXJDb3VudCsrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7IGZpZ21hLmN1cnJlbnRQYWdlLnNlbGVjdGlvbiA9IG5ld1NlbGVjdGlvbjsgfSwgNTApO1xyXG4gICAgICAgIHJldHVybiBsYXllckNvdW50O1xyXG4gICAgfVxyXG4gICAgY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xyXG4gICAgICAgIHJldHVybiBsYXllckNvdW50O1xyXG4gICAgfVxyXG59XHJcbmZ1bmN0aW9uIGdlbmVyYXRlRnJhbWVJbWFnZSgpIHtcclxuICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgbGV0IGZpcnN0U2VsZWN0ZWQgPSBmaWdtYS5jdXJyZW50UGFnZS5zZWxlY3Rpb25bMF07XHJcbiAgICAgICAgICAgIGxldCBwYXJlbnRGcmFtZSA9IGZpbmRGcmFtZShmaWdtYS5jdXJyZW50UGFnZS5zZWxlY3Rpb25bMF0pO1xyXG4gICAgICAgICAgICBsZXQgb3B0aW9ucyA9IHtcclxuICAgICAgICAgICAgICAgIGZvcm1hdDogXCJQTkdcIixcclxuICAgICAgICAgICAgICAgIGNvbnN0cmFpbnQ6IHsgdHlwZTogXCJTQ0FMRVwiLCB2YWx1ZTogNiB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHBhcmVudEZyYW1lLmV4cG9ydEFzeW5jKG9wdGlvbnMpXHJcbiAgICAgICAgICAgICAgICAudGhlbihpbWcgPT4ge1xyXG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ2hzYWRqZmhqa2Foc2RmJywgaW1nKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmaWdtYS5jcmVhdGVJbWFnZShpbWcpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn1cclxuIl0sInNvdXJjZVJvb3QiOiIifQ==