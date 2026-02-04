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
        let exportJSON = false;
        if (message.exportJSON) {
            exportJSON = true;
        }
        // nothing selected
        if (figma.currentPage.selection.length < 1) {
            figma.ui.postMessage({ type: 'fetchAEUX', data: null });
            return;
        }
        try {
            // pre-process the selected shapes hierarchy
            let selection = nodeToObj(figma.currentPage.selection);
            if (shapeTree[0].children.length < 1) {
                shapeTree[0].children = selection;
            }
            // console.log('shapeTree: ', shapeTree);
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
        if (node.type === 'TEXT') {
            //@ts-ignore
            obj._calcLineHeight = null; // Создаем свое поле
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
                // Трюк для получения точного значения без async/await:
                // Если текст в одну строку и стоит Auto Height — высота слоя равна Line Height.
                const isSingleLine = node.characters.indexOf('\n') === -1;
                const isAutoHeight = node.textAutoResize === 'HEIGHT' || node.textAutoResize === 'WIDTH_AND_HEIGHT';
                if (isSingleLine && isAutoHeight) {
                    //@ts-ignore
                    obj._calcLineHeight = node.height;
                }
                else {
                    // Если строк много или фиксированный размер, берем безопасный дефолт,
                    // так как синхронно "достать" метрики шрифта для Auto нельзя.
                    // 1.2 — стандарт для веба/дизайна (Inter, Roboto и т.д.)
                    //@ts-ignore
                    obj._calcLineHeight = node.fontSize * 1.2;
                }
            }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vLy4vc3JjL2NvZGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtRQUFBO1FBQ0E7O1FBRUE7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTs7UUFFQTtRQUNBOztRQUVBO1FBQ0E7O1FBRUE7UUFDQTtRQUNBOzs7UUFHQTtRQUNBOztRQUVBO1FBQ0E7O1FBRUE7UUFDQTtRQUNBO1FBQ0EsMENBQTBDLGdDQUFnQztRQUMxRTtRQUNBOztRQUVBO1FBQ0E7UUFDQTtRQUNBLHdEQUF3RCxrQkFBa0I7UUFDMUU7UUFDQSxpREFBaUQsY0FBYztRQUMvRDs7UUFFQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0EseUNBQXlDLGlDQUFpQztRQUMxRSxnSEFBZ0gsbUJBQW1CLEVBQUU7UUFDckk7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7UUFDQSwyQkFBMkIsMEJBQTBCLEVBQUU7UUFDdkQsaUNBQWlDLGVBQWU7UUFDaEQ7UUFDQTtRQUNBOztRQUVBO1FBQ0Esc0RBQXNELCtEQUErRDs7UUFFckg7UUFDQTs7O1FBR0E7UUFDQTs7Ozs7Ozs7Ozs7OztBQ2xGYTtBQUNiO0FBQ0EsMkJBQTJCLCtEQUErRCxnQkFBZ0IsRUFBRSxFQUFFO0FBQzlHO0FBQ0EsbUNBQW1DLE1BQU0sNkJBQTZCLEVBQUUsWUFBWSxXQUFXLEVBQUU7QUFDakcsa0NBQWtDLE1BQU0saUNBQWlDLEVBQUUsWUFBWSxXQUFXLEVBQUU7QUFDcEcsK0JBQStCLHFGQUFxRjtBQUNwSDtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0Esd0JBQXdCLDBCQUEwQjtBQUNsRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHNDQUFzQyxpQ0FB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O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHVGQUF1RjtBQUN2RjtBQUNBO0FBQ0E7QUFDQSxpQ0FBaUM7QUFDakM7QUFDQSw2REFBNkQ7QUFDN0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBLFNBQVM7QUFDVCwwQkFBMEIsNENBQTRDLEVBQUU7QUFDeEU7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDZCQUE2QjtBQUM3QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0wiLCJmaWxlIjoiY29kZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIiBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbiBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG5cbiBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cbiBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKSB7XG4gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG4gXHRcdH1cbiBcdFx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcbiBcdFx0dmFyIG1vZHVsZSA9IGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdID0ge1xuIFx0XHRcdGk6IG1vZHVsZUlkLFxuIFx0XHRcdGw6IGZhbHNlLFxuIFx0XHRcdGV4cG9ydHM6IHt9XG4gXHRcdH07XG5cbiBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4gXHRcdG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG4gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbiBcdFx0bW9kdWxlLmwgPSB0cnVlO1xuXG4gXHRcdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG4gXHRcdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbiBcdH1cblxuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5tID0gbW9kdWxlcztcblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGUgY2FjaGVcbiBcdF9fd2VicGFja19yZXF1aXJlX18uYyA9IGluc3RhbGxlZE1vZHVsZXM7XG5cbiBcdC8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb24gZm9yIGhhcm1vbnkgZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kID0gZnVuY3Rpb24oZXhwb3J0cywgbmFtZSwgZ2V0dGVyKSB7XG4gXHRcdGlmKCFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywgbmFtZSkpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgbmFtZSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGdldHRlciB9KTtcbiBcdFx0fVxuIFx0fTtcblxuIFx0Ly8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5yID0gZnVuY3Rpb24oZXhwb3J0cykge1xuIFx0XHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcbiBcdFx0fVxuIFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xuIFx0fTtcblxuIFx0Ly8gY3JlYXRlIGEgZmFrZSBuYW1lc3BhY2Ugb2JqZWN0XG4gXHQvLyBtb2RlICYgMTogdmFsdWUgaXMgYSBtb2R1bGUgaWQsIHJlcXVpcmUgaXRcbiBcdC8vIG1vZGUgJiAyOiBtZXJnZSBhbGwgcHJvcGVydGllcyBvZiB2YWx1ZSBpbnRvIHRoZSBuc1xuIFx0Ly8gbW9kZSAmIDQ6IHJldHVybiB2YWx1ZSB3aGVuIGFscmVhZHkgbnMgb2JqZWN0XG4gXHQvLyBtb2RlICYgOHwxOiBiZWhhdmUgbGlrZSByZXF1aXJlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnQgPSBmdW5jdGlvbih2YWx1ZSwgbW9kZSkge1xuIFx0XHRpZihtb2RlICYgMSkgdmFsdWUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKHZhbHVlKTtcbiBcdFx0aWYobW9kZSAmIDgpIHJldHVybiB2YWx1ZTtcbiBcdFx0aWYoKG1vZGUgJiA0KSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICYmIHZhbHVlLl9fZXNNb2R1bGUpIHJldHVybiB2YWx1ZTtcbiBcdFx0dmFyIG5zID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5yKG5zKTtcbiBcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG5zLCAnZGVmYXVsdCcsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHZhbHVlIH0pO1xuIFx0XHRpZihtb2RlICYgMiAmJiB0eXBlb2YgdmFsdWUgIT0gJ3N0cmluZycpIGZvcih2YXIga2V5IGluIHZhbHVlKSBfX3dlYnBhY2tfcmVxdWlyZV9fLmQobnMsIGtleSwgZnVuY3Rpb24oa2V5KSB7IHJldHVybiB2YWx1ZVtrZXldOyB9LmJpbmQobnVsbCwga2V5KSk7XG4gXHRcdHJldHVybiBucztcbiBcdH07XG5cbiBcdC8vIGdldERlZmF1bHRFeHBvcnQgZnVuY3Rpb24gZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBub24taGFybW9ueSBtb2R1bGVzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm4gPSBmdW5jdGlvbihtb2R1bGUpIHtcbiBcdFx0dmFyIGdldHRlciA9IG1vZHVsZSAmJiBtb2R1bGUuX19lc01vZHVsZSA/XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0RGVmYXVsdCgpIHsgcmV0dXJuIG1vZHVsZVsnZGVmYXVsdCddOyB9IDpcbiBcdFx0XHRmdW5jdGlvbiBnZXRNb2R1bGVFeHBvcnRzKCkgeyByZXR1cm4gbW9kdWxlOyB9O1xuIFx0XHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZ2V0dGVyLCAnYScsIGdldHRlcik7XG4gXHRcdHJldHVybiBnZXR0ZXI7XG4gXHR9O1xuXG4gXHQvLyBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGxcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubyA9IGZ1bmN0aW9uKG9iamVjdCwgcHJvcGVydHkpIHsgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KTsgfTtcblxuIFx0Ly8gX193ZWJwYWNrX3B1YmxpY19wYXRoX19cbiBcdF9fd2VicGFja19yZXF1aXJlX18ucCA9IFwiXCI7XG5cblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXyhfX3dlYnBhY2tfcmVxdWlyZV9fLnMgPSBcIi4vc3JjL2NvZGUudHNcIik7XG4iLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIF9fYXdhaXRlciA9ICh0aGlzICYmIHRoaXMuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XHJcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cclxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxyXG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcclxuICAgIH0pO1xyXG59O1xyXG4vL0B0cy1ub2NoZWNrXHJcbmZpZ21hLnNob3dVSShfX2h0bWxfXywgeyB3aWR0aDogMTY2LCBoZWlnaHQ6IDE4NCB9KTtcclxubGV0IGhhc0ZyYW1lRGF0YTtcclxubGV0IHNoYXBlVHJlZSA9IFtdO1xyXG5sZXQgaW1hZ2VIYXNoTGlzdCA9IFtdO1xyXG5sZXQgaW1hZ2VCeXRlc0xpc3QgPSBbXTtcclxubGV0IHJhc3Rlcml6ZUxpc3QgPSBbXTtcclxubGV0IHByZWZzID0ge1xyXG4gICAgZXhwb3J0UmVmSW1hZ2U6IGZhbHNlLFxyXG4gICAgaW1nU2F2ZURpYWxvZzogZmFsc2UsXHJcbn07XHJcbi8vIHJlY2VpdmUgbWVzc2FnZSBmcm9tIHRoZSBVSVxyXG5maWdtYS51aS5vbm1lc3NhZ2UgPSBtZXNzYWdlID0+IHtcclxuICAgIGlmIChtZXNzYWdlLnR5cGUgPT09ICdnZXRQcmVmcycpIHtcclxuICAgICAgICAvLyBjb25zb2xlLmxvZygnZ2V0IHRob3NlIHByZWZzJyk7XHJcbiAgICAgICAgZmlnbWEuY2xpZW50U3RvcmFnZS5nZXRBc3luYygnYWV1eC5wcmVmcycpXHJcbiAgICAgICAgICAgIC50aGVuKHByZWZzID0+IHtcclxuICAgICAgICAgICAgaWYgKHByZWZzKSB7XHJcbiAgICAgICAgICAgICAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7IHR5cGU6ICdyZXRQcmVmcycsIHByZWZzOiBwcmVmcyB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBwcmVmcztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdnb3R0YSBzYXZlIG5ldyBwcmVmcycsIG1lc3NhZ2UuZGVmYXVsdFByZWZzKTtcclxuICAgICAgICAgICAgICAgIGZpZ21hLmNsaWVudFN0b3JhZ2Uuc2V0QXN5bmMoJ2FldXgucHJlZnMnLCBtZXNzYWdlLmRlZmF1bHRQcmVmcylcclxuICAgICAgICAgICAgICAgICAgICAudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlnbWEudWkucG9zdE1lc3NhZ2UoeyB0eXBlOiAncmV0UHJlZnMnLCBwcmVmczogbWVzc2FnZS5kZWZhdWx0UHJlZnMgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBtZXNzYWdlLmRlZmF1bHRQcmVmcztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgICAgIC50aGVuKHVzZXJQcmVmcyA9PiB7XHJcbiAgICAgICAgICAgIHByZWZzID0gdXNlclByZWZzO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gJ3NldFByZWZzJykge1xyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdzYXZlIHRob3NlIHByZWZzJywgbWVzc2FnZS5wcmVmcyk7XHJcbiAgICAgICAgZmlnbWEuY2xpZW50U3RvcmFnZS5zZXRBc3luYygnYWV1eC5wcmVmcycsIG1lc3NhZ2UucHJlZnMpXHJcbiAgICAgICAgICAgIC50aGVuKHJldCA9PiB7XHJcbiAgICAgICAgICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKG1lc3NhZ2UucHJlZnMpO1xyXG4gICAgICAgICAgICBwcmVmcyA9IG1lc3NhZ2UucHJlZnM7IC8vIHN0b3JlIHRoZSBwcmVmcyBsb2NhbGx5XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBpZiAobWVzc2FnZS50eXBlID09PSAnZXhwb3J0Q2FuY2VsJykge1xyXG4gICAgfVxyXG4gICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gJ2V4cG9ydFNlbGVjdGlvbicpIHtcclxuICAgICAgICBoYXNGcmFtZURhdGEgPSBmYWxzZTtcclxuICAgICAgICBzaGFwZVRyZWUgPSBbXTtcclxuICAgICAgICBpbWFnZUhhc2hMaXN0ID0gW107XHJcbiAgICAgICAgaW1hZ2VCeXRlc0xpc3QgPSBbXTtcclxuICAgICAgICByYXN0ZXJpemVMaXN0ID0gW107XHJcbiAgICAgICAgbGV0IGV4cG9ydEpTT04gPSBmYWxzZTtcclxuICAgICAgICBpZiAobWVzc2FnZS5leHBvcnRKU09OKSB7XHJcbiAgICAgICAgICAgIGV4cG9ydEpTT04gPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBub3RoaW5nIHNlbGVjdGVkXHJcbiAgICAgICAgaWYgKGZpZ21hLmN1cnJlbnRQYWdlLnNlbGVjdGlvbi5sZW5ndGggPCAxKSB7XHJcbiAgICAgICAgICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHsgdHlwZTogJ2ZldGNoQUVVWCcsIGRhdGE6IG51bGwgfSk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gcHJlLXByb2Nlc3MgdGhlIHNlbGVjdGVkIHNoYXBlcyBoaWVyYXJjaHlcclxuICAgICAgICAgICAgbGV0IHNlbGVjdGlvbiA9IG5vZGVUb09iaihmaWdtYS5jdXJyZW50UGFnZS5zZWxlY3Rpb24pO1xyXG4gICAgICAgICAgICBpZiAoc2hhcGVUcmVlWzBdLmNoaWxkcmVuLmxlbmd0aCA8IDEpIHtcclxuICAgICAgICAgICAgICAgIHNoYXBlVHJlZVswXS5jaGlsZHJlbiA9IHNlbGVjdGlvbjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnc2hhcGVUcmVlOiAnLCBzaGFwZVRyZWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnc2VsZWN0ZWQgbGF5ZXJzIG5lZWQgdG8gYmUgaW5zaWRlIG9mIGEgZnJhbWUnKTtcclxuICAgICAgICAgICAgZmlnbWEudWkucG9zdE1lc3NhZ2UoeyB0eXBlOiAnZm9vdGVyTXNnJywgYWN0aW9uOiAnTGF5ZXJzIG11c3QgYmUgaW5zaWRlIG9mIGEgZnJhbWUnLCBsYXllckNvdW50OiBudWxsIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgcmVmSW1nID0gbnVsbCwgdGVtcEdyb3VwLCBwYXJlbnRGcmFtZTtcclxuICAgICAgICBpZiAocHJlZnMuZXhwb3J0UmVmSW1hZ2UpIHsgLy8gaW5jbHVkZSBhIHJlZmVyZW5jZSBpbWFnZSB3aXRoIHRyYW5zZmVyXHJcbiAgICAgICAgICAgIHBhcmVudEZyYW1lID0gZmluZEZyYW1lKGZpZ21hLmN1cnJlbnRQYWdlLnNlbGVjdGlvblswXSk7XHJcbiAgICAgICAgICAgIGxldCBwYXJlbnRGcmFtZU5hbWUgPSBwYXJlbnRGcmFtZS5uYW1lLnJlcGxhY2UoL1xccyooXFwvfFxcXFwpXFxzKi9nLCAnLScpLnJlcGxhY2UoL15cXCpcXHMvLCAnJykucmVwbGFjZSgvXlxcKi8sICcnKTtcclxuICAgICAgICAgICAgLy8gZ3JvdXAgYW5kIG1hc2tcclxuICAgICAgICAgICAgbGV0IG1hc2sgPSBmaWdtYS5jcmVhdGVSZWN0YW5nbGUoKTtcclxuICAgICAgICAgICAgbWFzay54ID0gcGFyZW50RnJhbWUueDtcclxuICAgICAgICAgICAgbWFzay55ID0gcGFyZW50RnJhbWUueTtcclxuICAgICAgICAgICAgbWFzay5yZXNpemUocGFyZW50RnJhbWUud2lkdGgsIHBhcmVudEZyYW1lLmhlaWdodCk7XHJcbiAgICAgICAgICAgIHRlbXBHcm91cCA9IGZpZ21hLmdyb3VwKFttYXNrXSwgbWFzay5wYXJlbnQpO1xyXG4gICAgICAgICAgICB0ZW1wR3JvdXAuYXBwZW5kQ2hpbGQocGFyZW50RnJhbWUpO1xyXG4gICAgICAgICAgICBtYXNrLmlzTWFzayA9IHRydWU7XHJcbiAgICAgICAgICAgIHJhc3Rlcml6ZUxpc3QucHVzaChwYXJlbnRGcmFtZS5pZCk7XHJcbiAgICAgICAgICAgIHJlZkltZyA9IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICdJbWFnZScsXHJcbiAgICAgICAgICAgICAgICBuYW1lOiBwYXJlbnRGcmFtZU5hbWUsXHJcbiAgICAgICAgICAgICAgICBpZDogcGFyZW50RnJhbWUuaWQucmVwbGFjZSgvOi9nLCAnLScpLFxyXG4gICAgICAgICAgICAgICAgZnJhbWU6IHsgeDogcGFyZW50RnJhbWUud2lkdGggLyAyLCB5OiBwYXJlbnRGcmFtZS5oZWlnaHQgLyAyLCB3aWR0aDogcGFyZW50RnJhbWUud2lkdGgsIGhlaWdodDogcGFyZW50RnJhbWUuaGVpZ2h0IH0sXHJcbiAgICAgICAgICAgICAgICBpc1Zpc2libGU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiA1MCxcclxuICAgICAgICAgICAgICAgIGJsZW5kTW9kZTogJ0JsZW5kaW5nTW9kZS5OT1JNQUwnLFxyXG4gICAgICAgICAgICAgICAgaXNNYXNrOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHJvdGF0aW9uOiAwLFxyXG4gICAgICAgICAgICAgICAgZ3VpZGU6IHRydWUsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChyYXN0ZXJpemVMaXN0Lmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgcmFzdGVyaXplTGlzdCA9IFsuLi5uZXcgU2V0KHJhc3Rlcml6ZUxpc3QpXTsgLy8gcmVtb3ZlIGR1cGxpY2F0ZXNcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ1JBU1RFUklaRUxJU1QnLCByYXN0ZXJpemVMaXN0KTtcclxuICAgICAgICAgICAgbGV0IHJlcXVlc3RzID0gcmFzdGVyaXplTGlzdC5tYXAoKGl0ZW0pID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdpdGVuKysnLCBpdGVtKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGFzeW5jQ29sbGVjdEhhc2hlcyhpdGVtLCByZXNvbHZlKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgUHJvbWlzZS5hbGwocmVxdWVzdHMpXHJcbiAgICAgICAgICAgICAgICAudGhlbigoKSA9PiBzdG9yZUltYWdlRGF0YShpbWFnZUhhc2hMaXN0LCBzaGFwZVRyZWUsIHJlZkltZykpXHJcbiAgICAgICAgICAgICAgICAudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAvLyByZW1vdmUgdGhlIHJlZmVyZW5jZSBtYXNrXHJcbiAgICAgICAgICAgICAgICBpZiAodGVtcEdyb3VwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGVtcEdyb3VwLnBhcmVudC5hcHBlbmRDaGlsZChwYXJlbnRGcmFtZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGVtcEdyb3VwLnJlbW92ZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIGNoZWNrIGlmIGltYWdlcyBuZWVkIHRvIGV4cG9ydCB0aGVuIHNlbmQgbWVzc2FnZSB0byB1aS50c1xyXG4gICAgICAgICAgICBpZiAoZXhwb3J0SlNPTikge1xyXG4gICAgICAgICAgICAgICAgZmlnbWEudWkucG9zdE1lc3NhZ2UoeyB0eXBlOiAnZXhwb3J0QUVVWCcsIGRhdGE6IHNoYXBlVHJlZSB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmIChpbWFnZUhhc2hMaXN0Lmxlbmd0aCA8IDEpIHtcclxuICAgICAgICAgICAgICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHsgdHlwZTogJ2ZldGNoQUVVWCcsIGRhdGE6IHNoYXBlVHJlZSB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHN0b3JlSW1hZ2VEYXRhKGltYWdlSGFzaExpc3QsIHNoYXBlVHJlZSwgbnVsbCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ2ltYWdlSGFzaExpc3QnLCBpbWFnZUhhc2hMaXN0KTtcclxuICAgICAgICBmdW5jdGlvbiBjbG9uZSh2YWwpIHtcclxuICAgICAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodmFsKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGZ1bmN0aW9uIGFzeW5jQ29sbGVjdEhhc2hlcyhpZCwgY2IpIHtcclxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnZG9uZSB3aXRoJywgaXRlbSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgc2hhcGUgPSBmaWdtYS5nZXROb2RlQnlJZChpZCk7XHJcbiAgICAgICAgICAgICAgICAvLyBkaXNhYmxlIGVmZmVjdHNcclxuICAgICAgICAgICAgICAgIGxldCBlZmZlY3RWaXNMaXN0ID0gW107IC8vIHRvIHN0b3JlIHRoZSBlZmZlY3QgdmlzaWJpbGl0eVxyXG4gICAgICAgICAgICAgICAgbGV0IGVmZmVjdHM7XHJcbiAgICAgICAgICAgICAgICBpZiAoc2hhcGUuZWZmZWN0cykge1xyXG4gICAgICAgICAgICAgICAgICAgIGVmZmVjdHMgPSBjbG9uZShzaGFwZS5lZmZlY3RzKTtcclxuICAgICAgICAgICAgICAgICAgICBlZmZlY3RzLmZvckVhY2goZWZmZWN0ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWZmZWN0VmlzTGlzdC5wdXNoKGVmZmVjdC52aXNpYmxlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVmZmVjdC50eXBlID09ICdEUk9QX1NIQURPVycgfHwgZWZmZWN0LnR5cGUgPT0gJ0xBWUVSX0JMVVInKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlZmZlY3QudmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2hhcGUuZWZmZWN0cyA9IGVmZmVjdHM7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBsZXQgY29tcE11bHQgPSAzO1xyXG4gICAgICAgICAgICAgICAgbGV0IGltZ1NjYWxlID0gTWF0aC5taW4oMzUwMCAvIE1hdGgubWF4KHNoYXBlLndpZHRoLCBzaGFwZS5oZWlnaHQpLCBjb21wTXVsdCk7IC8vIGxpbWl0IGl0IHRvIDQwMDBweFxyXG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ0lNQUdFU0NBTEUnLCBpbWdTY2FsZSwgc2hhcGUpO1xyXG4gICAgICAgICAgICAgICAgc2hhcGUuZXhwb3J0QXN5bmMoe1xyXG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdDogXCJQTkdcIixcclxuICAgICAgICAgICAgICAgICAgICB1c2VBYnNvbHV0ZUJvdW5kczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBjb25zdHJhaW50OiB7IHR5cGU6IFwiU0NBTEVcIiwgdmFsdWU6IGltZ1NjYWxlIH1cclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oaW1nID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpbWFnZUhhc2hMaXN0LnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBoYXNoOiBmaWdtYS5jcmVhdGVJbWFnZShpbWcpLmhhc2gsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBgJHtzaGFwZS5uYW1lLnJlcGxhY2UoL15cXCpcXHMvLCAnJykucmVwbGFjZSgvXlxcKi8sICcnKX1fJHtpZH1gXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAvLyByZS1lbmFibGUgZWZmZWN0cyBcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGVmZmVjdFZpc0xpc3QubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWZmZWN0c1tpXS52aXNpYmxlID0gZWZmZWN0VmlzTGlzdFtpXTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgc2hhcGUuZWZmZWN0cyA9IGVmZmVjdHM7XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjYigpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0sIDEwMCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gJ2FkZFJhc3Rlcml6ZUZsYWcnKSB7XHJcbiAgICAgICAgaWYgKGZpZ21hLmN1cnJlbnRQYWdlLnNlbGVjdGlvbi5sZW5ndGggPCAxKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9IC8vIG5vdGhpbmcgc2VsZWN0ZWRcclxuICAgICAgICAvLyBsZXQgc2VsZWN0aW9uID0gbm9kZVRvT2JqKGZpZ21hLmN1cnJlbnRQYWdlLnNlbGVjdGlvbilcclxuICAgICAgICBsZXQgbGF5ZXJDb3VudCA9IGFkZE1hZ2ljU3RhcihmaWdtYS5jdXJyZW50UGFnZS5zZWxlY3Rpb24sIDApIHx8IDA7XHJcbiAgICAgICAgLy8gcmVzZWxlY3QgbGF5ZXJzXHJcbiAgICAgICAgZmlnbWEuY3VycmVudFBhZ2Uuc2VsZWN0aW9uID0gZmlnbWEuY3VycmVudFBhZ2Uuc2VsZWN0aW9uO1xyXG4gICAgICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHsgdHlwZTogJ2Zvb3Rlck1zZycsIGFjdGlvbjogJ21hcmtlZCBhcyBQTkcnLCBsYXllckNvdW50IH0pO1xyXG4gICAgfVxyXG4gICAgLy8gaWYgKG1lc3NhZ2UudHlwZSA9PT0gJ2ZsYXR0ZW5MYXllcnMnKSB7XHJcbiAgICAvLyAgICAgaWYgKGZpZ21hLmN1cnJlbnRQYWdlLnNlbGVjdGlvbi5sZW5ndGggPCAxKSB7IHJldHVybiB9ICAgICAgLy8gbm90aGluZyBzZWxlY3RlZFxyXG4gICAgLy8gICAgIC8vIGxldCBzZWxlY3Rpb24gPSBub2RlVG9PYmooZmlnbWEuY3VycmVudFBhZ2Uuc2VsZWN0aW9uKVxyXG4gICAgLy8gICAgIGxldCBsYXllckNvdW50ID0gZmxhdHRlblJlY3Vyc2l2ZShmaWdtYS5jdXJyZW50UGFnZS5zZWxlY3Rpb24sIDApIHx8IDBcclxuICAgIC8vICAgICAvLyByZXNlbGVjdCBsYXllcnNcclxuICAgIC8vICAgICBmaWdtYS5jdXJyZW50UGFnZS5zZWxlY3Rpb24gPSBmaWdtYS5jdXJyZW50UGFnZS5zZWxlY3Rpb25cclxuICAgIC8vICAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7dHlwZTogJ2Zvb3Rlck1zZycsIGFjdGlvbjogJ2ZsYXR0ZW5lZCcsIGxheWVyQ291bnR9KTtcclxuICAgIC8vIH1cclxuICAgIC8vIGlmIChtZXNzYWdlLnR5cGUgPT09ICdyYXN0ZXJpemVTZWxlY3Rpb24nKSB7XHJcbiAgICAvLyAgICAgaWYgKGZpZ21hLmN1cnJlbnRQYWdlLnNlbGVjdGlvbi5sZW5ndGggPCAxKSB7IHJldHVybiB9ICAgICAgLy8gbm90aGluZyBzZWxlY3RlZFxyXG4gICAgLy8gICAgIC8vIGxldCBzZWxlY3Rpb24gPSBub2RlVG9PYmooZmlnbWEuY3VycmVudFBhZ2Uuc2VsZWN0aW9uKVxyXG4gICAgLy8gICAgIGxldCBsYXllckNvdW50ID0gcmFzdGVyaXplU2VsZWN0aW9uKGZpZ21hLmN1cnJlbnRQYWdlLnNlbGVjdGlvbiwgMCkgfHwgMFxyXG4gICAgLy8gICAgIC8vIGNvbnNvbGUubG9nKCdsYXllckNvdW50JywgbGF5ZXJDb3VudCk7XHJcbiAgICAvLyAgICAgLy8gcmVzZWxlY3QgbGF5ZXJzXHJcbiAgICAvLyAgICAgZmlnbWEuY3VycmVudFBhZ2Uuc2VsZWN0aW9uID0gZmlnbWEuY3VycmVudFBhZ2Uuc2VsZWN0aW9uXHJcbiAgICAvLyAgICAgZmlnbWEudWkucG9zdE1lc3NhZ2Uoe3R5cGU6ICdmb290ZXJNc2cnLCBhY3Rpb246ICdyYXN0ZXJpemVkJywgbGF5ZXJDb3VudH0pO1xyXG4gICAgLy8gfVxyXG4gICAgLy8gaWYgKG1lc3NhZ2UudHlwZSA9PT0gJ2RldGFjaENvbXBvbmVudHMnKSB7XHJcbiAgICAvLyAgICAgY29uc29sZS5sb2coJ2RldGFjaENvbXBvbmVudHMnKTtcclxuICAgIC8vICAgICBsZXQgbGF5ZXJDb3VudCA9IDQ7XHJcbiAgICAvLyAgICAgZmlnbWEudWkucG9zdE1lc3NhZ2Uoe3R5cGU6ICdmb290ZXJNc2cnLCBhY3Rpb246ICdmbGF0dGVuZWQnLCBsYXllckNvdW50fSk7XHJcbiAgICAvLyB9XHJcbiAgICAvL0NvbW11bmljYXRlIGJhY2sgdG8gdGhlIFVJXHJcbiAgICAvLyBjb25zb2xlLmxvZygnc2VuZCBtZXNzYWdlIGJhY2sgdG8gdWknKTtcclxufTtcclxuZnVuY3Rpb24gbm9kZVRvT2JqKG5vZGVzKSB7XHJcbiAgICAvLyAgIGNvbnNvbGUubG9nKCdub2RlcycsIG5vZGVzKTtcclxuICAgIGlmIChub2Rlcy5sZW5ndGggPCAxKSB7XHJcbiAgICAgICAgcmV0dXJuIFtdO1xyXG4gICAgfVxyXG4gICAgLy8gY29uc29sZS5sb2cobm9kZXNbMF0udHlwZSk7XHJcbiAgICBsZXQgYXJyID0gW107XHJcbiAgICAvLyBsb29rIGZvciB0aGUgcGFyZW50IGZyYW1lIG9mIGV2ZXJ5dGhpbmcgZXhjZXB0IHJlZ3VsYXIgKG5vbi1hdXRvTGF5b3V0KSBmcmFtZXMgYW5kIGxvb3NlIGNvbXBvbmVudHNcclxuICAgIGlmIChub2Rlc1swXSAmJiAoKG5vZGVzWzBdLnR5cGUgPT09ICdGUkFNRScgJiYgbm9kZXNbMF0ucGFyZW50LnR5cGUgPT09ICdQQUdFJykgfHxcclxuICAgICAgICAvLyAobm9kZXNbMF0udHlwZSA9PT0gJ0ZSQU1FJyAmJiBub2Rlc1swXS5sYXlvdXRNb2RlID09PSAnTk9ORScpIHx8IFxyXG4gICAgICAgIChub2Rlc1swXS50eXBlID09PSAnQ09NUE9ORU5UJyAmJiBub2Rlc1swXS5wYXJlbnQudHlwZSA9PT0gJ1BBR0UnKSkpIHsgLy8gYSBmcmFtZSBvciBhIGNvbXBvbmVudCBtYXN0ZXIgb3V0c2lkZSBvZiBhIGZyYW1lIGlzIGRpcmVjdGx5IHNlbGVjdGVkXHJcbiAgICAgICAgY29uc29sZS5sb2coJ0dPVCBBIEZSQU1FJyk7XHJcbiAgICAgICAgLy8gY29uc29sZS5sb2cobm9kZXNbMF0uY2hpbGRyZW4pO1xyXG4gICAgICAgIGhhc0ZyYW1lRGF0YSA9IHRydWU7IC8vIGRvbnQgbmVlZCB0byBnZXQgdGhlIGZyYW1lIGRhdGFcclxuICAgICAgICBzaGFwZVRyZWUucHVzaChnZXRFbGVtZW50KG5vZGVzWzBdLCBmYWxzZSkpO1xyXG4gICAgICAgIG5vZGVzID0gbm9kZXNbMF0uY2hpbGRyZW47XHJcbiAgICB9XHJcbiAgICAvLyBnZXQgc2hhcGVzIFxyXG4gICAgaWYgKG5vZGVzLmxlbmd0aCA8IDEpIHtcclxuICAgICAgICByZXR1cm4gW107XHJcbiAgICB9XHJcbiAgICBub2Rlcy5mb3JFYWNoKG5vZGUgPT4ge1xyXG4gICAgICAgIC8vIGdldCB0aGUgZnJhbWUgZGF0YVxyXG4gICAgICAgIGlmICghaGFzRnJhbWVEYXRhKSB7XHJcbiAgICAgICAgICAgIGlmIChub2RlLnBhcmVudC50eXBlID09PSAnUEFHRScpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfSAvLyBsYXllciBpcyBvdXRzaWRlIG9mIGEgZnJhbWUgXHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdnZXQgdGhlIGZyYW1lIGRhdGEnKTtcclxuICAgICAgICAgICAgbGV0IGZyYW1lID0gZmluZEZyYW1lKG5vZGUpO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnZnJhbWU6JywgZnJhbWUpO1xyXG4gICAgICAgICAgICBsZXQgZnJhbWVEYXRhID0gZ2V0RWxlbWVudChmcmFtZSwgdHJ1ZSk7IC8vIHNraXAgZ2F0aGVyaW5nIGNoaWxkcmVuIGRhdGFcclxuICAgICAgICAgICAgZnJhbWVEYXRhLmNoaWxkcmVuID0gW107IC8vIGNsZWFyIHRoZSBjaGlsZHJlbiBvZiB0aGUgZnJhbWUgdG8gcHVzaCB0aGVtIGxhdGVyXHJcbiAgICAgICAgICAgIHNoYXBlVHJlZS5wdXNoKGZyYW1lRGF0YSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBvYmogPSBnZXRFbGVtZW50KG5vZGUsIGZhbHNlKTtcclxuICAgICAgICBhcnIucHVzaChvYmopO1xyXG4gICAgfSk7XHJcbiAgICAvLyBjb25zb2xlLmxvZygnYXJyOiAnLCBhcnIpO1xyXG4gICAgcmV0dXJuIGFycjtcclxuICAgIGZ1bmN0aW9uIGdldEVsZW1lbnQobm9kZSwgc2tpcENoaWxkcmVuKSB7XHJcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ25vZGUnLCBub2RlLm5hbWUpO1xyXG4gICAgICAgIGxldCByYXN0ZXJpemUgPSBmYWxzZTtcclxuICAgICAgICBsZXQgb2JqID0ge1xyXG4gICAgICAgICAgICBjaGlsZHJlbjogW10sXHJcbiAgICAgICAgICAgIHR5cGU6IG51bGwsXHJcbiAgICAgICAgfTtcclxuICAgICAgICBpZiAobm9kZS5uYW1lICYmIG5vZGUubmFtZS5jaGFyQXQoMCkgPT0gJyonICYmIG5vZGUgIT0gZmluZEZyYW1lKG5vZGUpKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdyYXN0ZXJpemUnLCBub2RlKTtcclxuICAgICAgICAgICAgcmFzdGVyaXplTGlzdC5wdXNoKG5vZGUuaWQpO1xyXG4gICAgICAgICAgICByYXN0ZXJpemUgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBub2RlKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZWxlbWVudCA9IG5vZGVba2V5XTtcclxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGtleSA9PT0gJ2NoaWxkcmVuJyAmJiAhc2tpcENoaWxkcmVuICYmICFyYXN0ZXJpemUpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gbm9kZVRvT2JqKGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKGtleSA9PT0gJ2JhY2tncm91bmRzJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBub2RlVG9PYmooZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoa2V5ID09PSAnZmlsbHMnICYmIGVsZW1lbnQubGVuZ3RoID4gMCkgeyAvLyBhZGQgaW1hZ2UgZmlsbHMgdG8gcmFzdGVyaXplTGlzdFxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBoYXNJbWFnZUZpbGwgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGkgaW4gZWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxsID0gZWxlbWVudFtpXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpbGwudHlwZSA9PSAnSU1BR0UnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNJbWFnZUZpbGwgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqWydyYXN0ZXJpemUnXSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnaW1hZ2UnLCBlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9iai50eXBlID0gJ1JFQ1RBTkdMRSdcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJldHVyblxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChoYXNJbWFnZUZpbGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmFzdGVyaXplTGlzdC5wdXNoKG5vZGUuaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIGNvcm5lciByYWRpdXNcclxuICAgICAgICAgICAgICAgIC8vIGlmIChrZXkgPT09ICdjb3JuZXJSYWRpdXMnKSB7XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgY29uc29sZS5sb2coa2V5LCAgZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAvLyB9XHJcbiAgICAgICAgICAgICAgICBpZiAoZWxlbWVudCA9PSBmaWdtYS5taXhlZCAmJiBrZXkgPT09ICdjb3JuZXJSYWRpdXMnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IE1hdGgubWluKG5vZGUudG9wTGVmdFJhZGl1cywgbm9kZS50b3BSaWdodFJhZGl1cywgbm9kZS5ib3R0b21MZWZ0UmFkaXVzLCBub2RlLmJvdHRvbVJpZ2h0UmFkaXVzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIHRyeSB0byBnZXQgdGhlIGZpcnN0IHZhbHVlIG9uIHRoZSB0ZXh0XHJcbiAgICAgICAgICAgICAgICBpZiAoZWxlbWVudCA9PSBmaWdtYS5taXhlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzdHIgPSAnZ2V0UmFuZ2UnICsga2V5LnJlcGxhY2UoL15cXHcvLCBjID0+IGMudG9VcHBlckNhc2UoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IG5vZGVbc3RyXSgwLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIGxheWVyLmZvbnROYW1lICE9PSAoZmlnbWEubWl4ZWQpKSA/IGxheWVyLmZvbnROYW1lLmZhbWlseSA6IGxheWVyLmdldFJhbmdlRm9udE5hbWUoMCwxKS5mYW1pbHlcclxuICAgICAgICAgICAgICAgIC8vIGlmIChrZXkgPT09ICdwYXJlbnQnKSB7IGNvbnNvbGUubG9nKGVsZW1lbnQpOyB9XHJcbiAgICAgICAgICAgICAgICBvYmpba2V5XSA9IGVsZW1lbnQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRVJST1InLCBlcnJvcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKG5vZGUudHlwZSA9PT0gJ1RFWFQnKSB7XHJcbiAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgICAgICBvYmouX2NhbGNMaW5lSGVpZ2h0ID0gbnVsbDsgLy8g0KHQvtC30LTQsNC10Lwg0YHQstC+0LUg0L/QvtC70LVcclxuICAgICAgICAgICAgaWYgKG5vZGUubGluZUhlaWdodC51bml0ID09PSAnUElYRUxTJykge1xyXG4gICAgICAgICAgICAgICAgLy9AdHMtaWdub3JlXHJcbiAgICAgICAgICAgICAgICBvYmouX2NhbGNMaW5lSGVpZ2h0ID0gbm9kZS5saW5lSGVpZ2h0LnZhbHVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKG5vZGUubGluZUhlaWdodC51bml0ID09PSAnUEVSQ0VOVCcpIHtcclxuICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgICAgICAgICAgb2JqLl9jYWxjTGluZUhlaWdodCA9IG5vZGUuZm9udFNpemUgKiAobm9kZS5saW5lSGVpZ2h0LnZhbHVlIC8gMTAwKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIEFVVE9cclxuICAgICAgICAgICAgICAgIC8vINCi0YDRjtC6INC00LvRjyDQv9C+0LvRg9GH0LXQvdC40Y8g0YLQvtGH0L3QvtCz0L4g0LfQvdCw0YfQtdC90LjRjyDQsdC10LcgYXN5bmMvYXdhaXQ6XHJcbiAgICAgICAgICAgICAgICAvLyDQldGB0LvQuCDRgtC10LrRgdGCINCyINC+0LTQvdGDINGB0YLRgNC+0LrRgyDQuCDRgdGC0L7QuNGCIEF1dG8gSGVpZ2h0IOKAlCDQstGL0YHQvtGC0LAg0YHQu9C+0Y8g0YDQsNCy0L3QsCBMaW5lIEhlaWdodC5cclxuICAgICAgICAgICAgICAgIGNvbnN0IGlzU2luZ2xlTGluZSA9IG5vZGUuY2hhcmFjdGVycy5pbmRleE9mKCdcXG4nKSA9PT0gLTE7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpc0F1dG9IZWlnaHQgPSBub2RlLnRleHRBdXRvUmVzaXplID09PSAnSEVJR0hUJyB8fCBub2RlLnRleHRBdXRvUmVzaXplID09PSAnV0lEVEhfQU5EX0hFSUdIVCc7XHJcbiAgICAgICAgICAgICAgICBpZiAoaXNTaW5nbGVMaW5lICYmIGlzQXV0b0hlaWdodCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICAgICAgICAgICAgICAgIG9iai5fY2FsY0xpbmVIZWlnaHQgPSBub2RlLmhlaWdodDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vINCV0YHQu9C4INGB0YLRgNC+0Log0LzQvdC+0LPQviDQuNC70Lgg0YTQuNC60YHQuNGA0L7QstCw0L3QvdGL0Lkg0YDQsNC30LzQtdGALCDQsdC10YDQtdC8INCx0LXQt9C+0L/QsNGB0L3Ri9C5INC00LXRhNC+0LvRgixcclxuICAgICAgICAgICAgICAgICAgICAvLyDRgtCw0Log0LrQsNC6INGB0LjQvdGF0YDQvtC90L3QviBcItC00L7RgdGC0LDRgtGMXCIg0LzQtdGC0YDQuNC60Lgg0YjRgNC40YTRgtCwINC00LvRjyBBdXRvINC90LXQu9GM0LfRjy5cclxuICAgICAgICAgICAgICAgICAgICAvLyAxLjIg4oCUINGB0YLQsNC90LTQsNGA0YIg0LTQu9GPINCy0LXQsdCwL9C00LjQt9Cw0LnQvdCwIChJbnRlciwgUm9ib3RvINC4INGCLtC0LilcclxuICAgICAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmVcclxuICAgICAgICAgICAgICAgICAgICBvYmouX2NhbGNMaW5lSGVpZ2h0ID0gbm9kZS5mb250U2l6ZSAqIDEuMjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBrZWVwIHRyYWNrIG9mIEF1dG8tbGF5b3V0IGZyYW1lcyBmb3IgYWxpZ25tZW50IG9mIGNoaWxkcmVuXHJcbiAgICAgICAgaWYgKG5vZGUudHlwZSA9PT0gJ0ZSQU1FJyAmJiBub2RlLmxheW91dE1vZGUgIT09ICdOT05FJykge1xyXG4gICAgICAgICAgICBvYmoudHlwZSA9ICdBVVRPTEFZT1VUJztcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG9iajtcclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIGNvbGxlY3RJbWFnZUhhc2hlcyhlbGVtZW50LCBpZCkge1xyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdpbWFnZUhhc2gnLCBpZCwgZWxlbWVudCk7XHJcbiAgICAgICAgZm9yIChjb25zdCBpIGluIGVsZW1lbnQpIHtcclxuICAgICAgICAgICAgY29uc3QgZmlsbCA9IGVsZW1lbnRbaV07XHJcbiAgICAgICAgICAgIGlmIChmaWxsLnR5cGUgPT0gJ0lNQUdFJykge1xyXG4gICAgICAgICAgICAgICAgaW1hZ2VIYXNoTGlzdC5wdXNoKHsgaGFzaDogZmlsbC5pbWFnZUhhc2gsIGlkIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbmZ1bmN0aW9uIHN0b3JlSW1hZ2VEYXRhKGltYWdlSGFzaExpc3QsIGxheWVycywgcmVmSW1nKSB7XHJcbiAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdsYXllcnMrKycsIGxheWVycyk7XHJcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ2ltYWdlSGFzaExpc3QrKycsIGltYWdlSGFzaExpc3QpO1xyXG4gICAgICAgIGZvciAoY29uc3QgaSBpbiBpbWFnZUhhc2hMaXN0KSB7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdpJywgaSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGhhc2ggPSBpbWFnZUhhc2hMaXN0W2ldLmhhc2g7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdoYXNoJywgaGFzaCk7XHJcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBpbWFnZUhhc2hMaXN0W2ldLmlkXHJcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgvW1xcXFw6XCIqPyU8PnxdL2csICctJykgLy8gcmVwbGFjZSBpbGxlZ2FsIGNoYXJhY3RlcnNcclxuICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXHMqKFxcL3xcXFxcKVxccyovZywgJy0nKTsgLy8gcmVtb3ZlIHNsYXNoZXNcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ25hbWUnLCBuYW1lKTtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGxldCBpbWFnZSA9IGZpZ21hLmdldEltYWdlQnlIYXNoKGhhc2gpO1xyXG4gICAgICAgICAgICAgICAgbGV0IGJ5dGVzID0geWllbGQgaW1hZ2UuZ2V0Qnl0ZXNBc3luYygpO1xyXG4gICAgICAgICAgICAgICAgaW1hZ2VCeXRlc0xpc3QucHVzaCh7IG5hbWUsIGJ5dGVzIH0pO1xyXG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ2J5dGVzJywgYnl0ZXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhdGNoIChlcnJvcikgeyB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChpbWFnZUJ5dGVzTGlzdC5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHsgdHlwZTogJ2ZldGNoSW1hZ2VzQW5kQUVVWCcsIGltYWdlczogaW1hZ2VCeXRlc0xpc3QsIGRhdGE6IGxheWVycywgcmVmSW1nIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgZmlnbWEudWkucG9zdE1lc3NhZ2UoeyB0eXBlOiAnZmV0Y2hBRVVYJywgZGF0YTogbGF5ZXJzIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59XHJcbmZ1bmN0aW9uIGZpbmRGcmFtZShub2RlKSB7XHJcbiAgICAvLyBjb25zb2xlLmxvZygnbm9kZTonLCBub2RlKTtcclxuICAgIC8vIGNvbnNvbGUubG9nKCdub2RlLnR5cGU6Jywgbm9kZS50eXBlKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgaWYgKChub2RlLnR5cGUgIT09ICdGUkFNRScgJiYgIShub2RlLnR5cGUgPT09ICdDT01QT05FTlQnICYmIG5vZGUucGFyZW50LnR5cGUgPT09ICdQQUdFJykpXHJcbiAgICAgICAgICAgIHx8IChub2RlLnR5cGUgPT09ICdGUkFNRScgJiYgbm9kZS5wYXJlbnQudHlwZSA9PT0gJ0ZSQU1FJykpIHtcclxuICAgICAgICAgICAgLy8gaWYgKG5vZGUudHlwZSAhPT0gJ0ZSQU1FJyAmJiBub2RlLnR5cGUgIT09ICdDT01QT05FTlQnKSB7ICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICByZXR1cm4gZmluZEZyYW1lKG5vZGUucGFyZW50KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGhhc0ZyYW1lRGF0YSA9IHRydWU7XHJcbiAgICAgICAgICAgIHJldHVybiBub2RlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHsgdHlwZTogJ2Zvb3Rlck1zZycsIGFjdGlvbjogJ0Vycm9yIGluIGZpbmRGcmFtZSgpIPCfmJYnLCBsYXllckNvdW50OiBudWxsIH0pO1xyXG4gICAgfVxyXG59XHJcbmZ1bmN0aW9uIGFkZE1hZ2ljU3RhcihzZWxlY3Rpb24sIGxheWVyQ291bnQpIHtcclxuICAgIGlmIChmaW5kRnJhbWUoc2VsZWN0aW9uWzBdKSA9PSBzZWxlY3Rpb25bMF0pIHsgLy8gc2VsZWN0aW9uIGlzIHRoZSB0b3AgbW9zdCBmcmFtZVxyXG4gICAgICAgIHNlbGVjdGlvbiA9IHNlbGVjdGlvblswXS5jaGlsZHJlbjsgLy8gc2VsZWN0IGFsbCB0aGUgY2hpbGRyZW5cclxuICAgIH1cclxuICAgIHNlbGVjdGlvbi5mb3JFYWNoKHNoYXBlID0+IHtcclxuICAgICAgICBpZiAoc2hhcGUubmFtZS5jaGFyQXQoMCkgIT09ICcqJykge1xyXG4gICAgICAgICAgICBzaGFwZS5uYW1lID0gYCogJHtzaGFwZS5uYW1lfWA7XHJcbiAgICAgICAgICAgIGxheWVyQ291bnQrKztcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuICAgIHJldHVybiBsYXllckNvdW50O1xyXG59XHJcbmZ1bmN0aW9uIGZsYXR0ZW5SZWN1cnNpdmUoc2VsZWN0aW9uLCBsYXllckNvdW50KSB7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHNlbGVjdGlvbi5mb3JFYWNoKHNoYXBlID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ3RyeSBmbGF0dGVuaW5nJywgc2hhcGUpO1xyXG4gICAgICAgICAgICBpZiAoc2hhcGUudHlwZSA9PSAnQk9PTEVBTl9PUEVSQVRJT04nKSB7XHJcbiAgICAgICAgICAgICAgICBmaWdtYS5mbGF0dGVuKFtzaGFwZV0pO1xyXG4gICAgICAgICAgICAgICAgbGF5ZXJDb3VudCsrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKHNoYXBlLmNvcm5lclJhZGl1cyA9PSBmaWdtYS5taXhlZCB8fCBzaGFwZS5jb3JuZXJSYWRpdXMgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBmbGF0dGVuIHJvdW5kZWQgY29ybmVyc1xyXG4gICAgICAgICAgICAgICAgZmlnbWEuZmxhdHRlbihbc2hhcGVdKTtcclxuICAgICAgICAgICAgICAgIGxheWVyQ291bnQrKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmIChzaGFwZS5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICAgICAgbGF5ZXJDb3VudCA9IGZsYXR0ZW5SZWN1cnNpdmUoc2hhcGUuY2hpbGRyZW4sIGxheWVyQ291bnQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbGV0IHQgPSBzaGFwZS5yZWxhdGl2ZVRyYW5zZm9ybTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzaGFwZS50eXBlJywgc2hhcGUudHlwZSk7XHJcbiAgICAgICAgICAgICAgICAvLy8gY2hlY2sgZm9yIHRyYW5zZm9ybXNcclxuICAgICAgICAgICAgICAgIGlmICh0WzBdWzBdLnRvRml4ZWQoNikgIT0gMSB8fFxyXG4gICAgICAgICAgICAgICAgICAgIHRbMF1bMV0udG9GaXhlZCg2KSAhPSAwIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgdFsxXVswXS50b0ZpeGVkKDYpICE9IDAgfHxcclxuICAgICAgICAgICAgICAgICAgICB0WzFdWzFdLnRvRml4ZWQoNikgIT0gMSB8fFxyXG4gICAgICAgICAgICAgICAgICAgIGZhbHNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlnbWEuZmxhdHRlbihbc2hhcGVdKTtcclxuICAgICAgICAgICAgICAgICAgICBsYXllckNvdW50Kys7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmIChzaGFwZS50eXBlID09ICdURVhUJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGZpZ21hLmZsYXR0ZW4oW3NoYXBlXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGF5ZXJDb3VudCsrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIGxheWVyQ291bnQ7XHJcbiAgICB9XHJcbiAgICBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XHJcbiAgICAgICAgcmV0dXJuIGxheWVyQ291bnQ7XHJcbiAgICB9XHJcbn1cclxuZnVuY3Rpb24gcmFzdGVyaXplU2VsZWN0aW9uKHNlbGVjdGlvbiwgbGF5ZXJDb3VudCkge1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBsZXQgbmV3U2VsZWN0aW9uID0gW107XHJcbiAgICAgICAgc2VsZWN0aW9uLmZvckVhY2goc2hhcGUgPT4ge1xyXG4gICAgICAgICAgICBpZiAoc2hhcGUudHlwZSA9PSAnR1JPVVAnKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgaW1nU2NhbGUgPSBNYXRoLm1pbig0MDAwIC8gTWF0aC5tYXgoc2hhcGUud2lkdGgsIHNoYXBlLmhlaWdodCksIDYpOyAvLyBsaW1pdCBpdCB0byA0MDAwcHhcclxuICAgICAgICAgICAgICAgIC8vIGFsZXJ0KGltZ1NjYWxlKSAgICAgICBcclxuICAgICAgICAgICAgICAgIGxldCBvcHRpb25zID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdDogXCJQTkdcIixcclxuICAgICAgICAgICAgICAgICAgICBjb25zdHJhaW50OiB7IHR5cGU6IFwiU0NBTEVcIiwgdmFsdWU6IGltZ1NjYWxlIH1cclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICBsZXQgc2hhcGVUcmFuc2Zvcm0gPSBzaGFwZS5yZWxhdGl2ZVRyYW5zZm9ybTsgLy8gc3RvcmUgdHJhbnNmb3JtXHJcbiAgICAgICAgICAgICAgICBsZXQgcmVtb3ZlVHJhbnNmb3JtID0gW1sxLCAwLCBzaGFwZS54XSwgWzAsIDEsIHNoYXBlLnldXTtcclxuICAgICAgICAgICAgICAgIHNoYXBlLnJlbGF0aXZlVHJhbnNmb3JtID0gcmVtb3ZlVHJhbnNmb3JtO1xyXG4gICAgICAgICAgICAgICAgc2hhcGUuZXhwb3J0QXN5bmMob3B0aW9ucylcclxuICAgICAgICAgICAgICAgICAgICAudGhlbihpbWcgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGZpZ21hLmNyZWF0ZUltYWdlKGltZykpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCByZWN0ID0gZmlnbWEuY3JlYXRlUmVjdGFuZ2xlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2hhcGUucGFyZW50LmFwcGVuZENoaWxkKHJlY3QpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlY3QueCA9IHNoYXBlLng7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVjdC55ID0gc2hhcGUueTtcclxuICAgICAgICAgICAgICAgICAgICByZWN0LnJlbGF0aXZlVHJhbnNmb3JtID0gc2hhcGVUcmFuc2Zvcm07XHJcbiAgICAgICAgICAgICAgICAgICAgcmVjdC5uYW1lID0gc2hhcGUubmFtZSArICdfcmFzdGVyaXplJztcclxuICAgICAgICAgICAgICAgICAgICByZWN0LnJlc2l6ZShzaGFwZS53aWR0aCwgc2hhcGUuaGVpZ2h0KTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZmlsbE9iaiA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkocmVjdC5maWxsc1swXSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbGxPYmouZmlsdGVycyA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udHJhc3Q6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9zdXJlOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBoaWdobGlnaHRzOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzYXR1cmF0aW9uOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzaGFkb3dzOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wZXJhdHVyZTogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGludDogMCxcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbGxPYmouaW1hZ2VIYXNoID0gZmlnbWEuY3JlYXRlSW1hZ2UoaW1nKS5oYXNoO1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbGxPYmouaW1hZ2VUcmFuc2Zvcm0gPSBbWzEsIDAsIDBdLCBbMCwgMSwgMF1dO1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbGxPYmouc2NhbGVNb2RlID0gXCJDUk9QXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlsbE9iai50eXBlID0gXCJJTUFHRVwiO1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbGxPYmouc2NhbGluZ0ZhY3RvciA9IDAuNSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGZpbGxPYmouY29sb3I7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVjdC5maWxscyA9IFtmaWxsT2JqXTtcclxuICAgICAgICAgICAgICAgICAgICBuZXdTZWxlY3Rpb24ucHVzaChyZWN0KTtcclxuICAgICAgICAgICAgICAgICAgICBzaGFwZS5yZWxhdGl2ZVRyYW5zZm9ybSA9IHNoYXBlVHJhbnNmb3JtO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBsYXllckNvdW50Kys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHsgZmlnbWEuY3VycmVudFBhZ2Uuc2VsZWN0aW9uID0gbmV3U2VsZWN0aW9uOyB9LCA1MCk7XHJcbiAgICAgICAgcmV0dXJuIGxheWVyQ291bnQ7XHJcbiAgICB9XHJcbiAgICBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XHJcbiAgICAgICAgcmV0dXJuIGxheWVyQ291bnQ7XHJcbiAgICB9XHJcbn1cclxuZnVuY3Rpb24gZ2VuZXJhdGVGcmFtZUltYWdlKCkge1xyXG4gICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBsZXQgZmlyc3RTZWxlY3RlZCA9IGZpZ21hLmN1cnJlbnRQYWdlLnNlbGVjdGlvblswXTtcclxuICAgICAgICAgICAgbGV0IHBhcmVudEZyYW1lID0gZmluZEZyYW1lKGZpZ21hLmN1cnJlbnRQYWdlLnNlbGVjdGlvblswXSk7XHJcbiAgICAgICAgICAgIGxldCBvcHRpb25zID0ge1xyXG4gICAgICAgICAgICAgICAgZm9ybWF0OiBcIlBOR1wiLFxyXG4gICAgICAgICAgICAgICAgY29uc3RyYWludDogeyB0eXBlOiBcIlNDQUxFXCIsIHZhbHVlOiA2IH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgcGFyZW50RnJhbWUuZXhwb3J0QXN5bmMob3B0aW9ucylcclxuICAgICAgICAgICAgICAgIC50aGVuKGltZyA9PiB7XHJcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnaHNhZGpmaGprYWhzZGYnLCBpbWcpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZpZ21hLmNyZWF0ZUltYWdlKGltZyk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufVxyXG4iXSwic291cmNlUm9vdCI6IiJ9