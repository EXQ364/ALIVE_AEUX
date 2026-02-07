/*jshint esversion: 6, asi: true*/
import { extractLinearGradientParamsFromTransform, extractRadialOrDiamondGradientParams } from "@figma-plugin/helpers";
import * as triclops from './triclops.js'

var versionNumber = 0.81;
var frameData, layers, hasArtboard, layerCount, layerData, boolOffset, rasterizeList, frameSize;
export function convert(data) {
    hasArtboard = false;
    layerCount = 0;
    boolOffset = null;
    rasterizeList = [];
    
    var layerData = filterTypes(data);
    
    // Safety check if layerData is empty
    if (layerData && layerData.length > 0) {
        layerData[0].layerCount = layerCount;
        layerData[0].rasterizeList = rasterizeList;
    }
    
    return layerData;
}


function filterTypes(figmaData, opt_parentFrame, boolType) {
    let aeuxData = [];
    // var parentFrame = opt_parentFrame || {};
    var parentFrame = opt_parentFrame || null;
    

    if (!hasArtboard) {
        aeuxData.push(storeArtboard(figmaData));
        frameData = figmaData;
    }

    layers = figmaData.children || [];

    layers.forEach(layer => {
        if (!opt_parentFrame) { boolOffset = null }
        if (layer.visible === false) { return; }         // skip layer if hidden

        // detect * in layer names
        if (layer.name && layer.name.charAt(0) == '*') {        // skip frames with *
            let rasterizedLayer = getImageFill(layer, parentFrame)
            rasterizedLayer.name = layer.name.replace(/^\*\s/, '').replace(/^\*/, '').replace(/:/g, '-').replace(/\s*(\/|\\)\s*/g, '-') // remove astrix
            aeuxData.push(rasterizedLayer)
            rasterizeList.push(layer.id)
            return
        }

        if (layer.type == "GROUP") {            
            let prevMask = (aeuxData.length > 0) ? aeuxData[aeuxData.length - 1].isMask : false    // check if the previous layer is a mask
            aeuxData.push(getGroup(layer, parentFrame, prevMask));
        }
        // if (layer.fillGeometry && layer.fillGeometry.length > 1) { layer.type = "BOOLEAN_OPERATION" }         // overwrite the layer type

        if (layer.type == "BOOLEAN_OPERATION") {
            let boolLayer = getBoolean(layer, parentFrame, boolType);
            if (boolLayer) aeuxData.push(boolLayer);
        }

        if (["RECTANGLE", "ELLIPSE", "VECTOR", "LINE", "STAR", "POLYGON"].includes(layer.type)) {
            aeuxData.push(getShape(layer, parentFrame, boolType));
            layerCount++;
        }

        if (["INSTANCE", "COMPONENT", "FRAME", "AUTOLAYOUT"].includes(layer.type)) {
            if (layer.rasterize) {     
                let rasterizedLayer = getImageFill(layer, parentFrame);
                rasterizedLayer.name = layer.name.replace(/^\*\s/, '').replace(/^\*/, '');
                aeuxData.push(rasterizedLayer);
                rasterizeList.push(layer.id);
                return;
            }
            if (layer.type == "FRAME" && parentFrame) { layer.type = "AUTOLAYOUT" }
            aeuxData.push(getComponent(layer, parentFrame));
            layerCount++;
        }

        if (layer.type == "TEXT") {
            aeuxData.push(getText(layer, parentFrame));
            layerCount++;
        }
    });
  return aeuxData;
}

//// get layer data: SHAPE
function getShape(layer, parentFrame, boolType) {
    var layerType = getShapeType(layer);
    var frame = getFrame(layer, parentFrame);

    if (boolType) {
        frame.x = parentFrame.width/2 + (frame.x - layer.width) - (parentFrame.width - layer.width)/2; 
        frame.y = parentFrame.height/2 + (frame.y - layer.height) - (parentFrame.height - layer.height)/2;
    }

    // 1. Analyze Geometry
    var path = getPath(layer, frame);

    // 2. Handle Complex Paths (Multipath / Compound)
    if (path == 'multiPath') {
    // Create a compound shape container
    var compound = getBoolean(layer, parentFrame, null, true);
    
    // CRITICAL FIX: ...
    compound.fill = null;
    compound.stroke = null;
    
    return compound;
}

    var layerData = {
        type: layerType,
        name: layer.name,
        id: layer.id,
        frame: frame,
        fill: getFills(layer, parentFrame),
        stroke: getStrokes(layer),
        isVisible: (layer.visible !== false),
        path: path,
        roundness: Math.round(layer.cornerRadius) || 0,
        opacity: layer.opacity*100 || 100,
        rotation: getRotation(layer),
        flip: (boolType) ? [100, 100] : getFlipMultiplier(layer),
        blendMode: getLayerBlending(layer.blendMode),
        booleanOperation: boolType || getBoolType(layer),
        isMask: layer.isMask,
        shouldBreakMaskChain: layer.isMask,
        pointCount: layer.pointCount || null,     
        isStar: (layer.type == 'STAR'),
        outerRad: Math.max(frame.width, frame.height) / 2,
        innerRad: layer.innerRadius || null,
        polyScale: getPolyscale(layer),
    };

    // Image fills handling...
    if (layerData.fill != null && layerData.fill.length > 0 && layerData.fill[0].type == 'Image') {
        layerData = layerData.fill[0]; // Assuming image fill replaces shape
        layerData.rotation = 0;
    }

    getEffects(layer, layerData);
    return layerData;
}

//// get layer data: TEXT
function getText(layer, parentFrame) {
    var frame = {};
    var flip = getFlipMultiplier(layer)

    var tempFrame = getFrame(layer, parentFrame);
    var lineHeight = getLineHeight(layer);
    console.log(tempFrame)
    console.log(lineHeight)
    frame = {
        width: layer.width,
        height: layer.height,
        x: tempFrame.x,
        y: tempFrame.y + lineHeight - layer.fontSize,
    };
    
	var layerData =  {
        type: 'Text',
        kind: 'Area',
        name: layer.name.replace(/[\u2028]/g, ' '),
        stringValue: getTextProps(layer),
        id: layer.id,
        frame: frame,
        isVisible: (layer.visible !== false),
        opacity: layer.opacity*100 || 100,
        textColor: getTextFill(layer),
        fill: null,
        stroke: getStrokes(layer),
        blendMode: getLayerBlending(layer.blendMode),
        // fontName: layer.style.fontPostScriptName,
        fontName: triclops.getPostscript(layer.fontName),
        // fontName: layer.fontName.family.replaceAll(' ', '') + '-' + layer.fontName.style.replaceAll(' ', ''),
        fontSize: layer.fontSize,
        // trackingAdjusted: layer.style.letterSpacing / layer.style.fontSize * 1000,
        trackingAdjusted: getTracking(layer),
        // tracking: layer.letterSpacing.value,        // xxx could be percent
        justification: getJustification(layer),
        lineHeight: lineHeight,
        flip: flip,
        rotation: getRotation(layer),
        isMask: layer.isMask,
    };
    
    // console.log('layerData', layerData);

    getEffects(layer, layerData);

    return layerData;

    function getTextFill (layer) {
        var fills = getFills(layer, null)
        // console.log(fills);
        
        if (fills.length > 0) {
            var fillColor = fills[0].color
            if (fills[0].gradient != undefined) {
                fillColor = fills[0].gradient.points[0].color
            }
            return fillColor
        } else {
            return [0,0,0,0]
        }
    }
    function getTextProps(layer) {        
        var text = layer.characters.replace(/[\u2028]/g, '\n');        
        // var transformVal = 0;
        // var transformVal = layer.sketchObject.styleAttributes()["MSAttributedStringTextTransformAttribute"];

        if (layer.textCase == 'UPPER') { text = text.toUpperCase(); }
        if (layer.textCase == 'LOWER') { text = text.toLowerCase(); }
        if (layer.textCase == 'TITLE') { text = toTitleCase(text); }

        return text;

        function toTitleCase(str) {
            return str.replace(
                /\w\S*/g,
                function(txt) {
                    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                }
            );
        }
    }

    function getJustification(layer) {
        var justify = layer.textAlignHorizontal;

        if (justify == 'RIGHT') { return 1 }
        if (justify == 'CENTER') { return 2 }
        if (justify == 'JUSTIFIED') { return 3 }

        return 0;
    }

    function getLineHeight(layer) {
        // Мы уже посчитали всё в nodeToObj, просто возвращаем значение
        if (layer._calcLineHeight !== undefined && layer._calcLineHeight !== null) {
            return layer._calcLineHeight;
        }
        
        // Фолбэк на случай, если данные не пришли
        if (layer.lineHeight && layer.lineHeight.unit === 'PIXELS') return layer.lineHeight.value;
        return layer.fontSize * 1.2;
    }
    
    function getTracking(layer) {
        if (layer.letterSpacing.unit == 'PIXELS') {
            return layer.letterSpacing.value / layer.fontSize * 1000;
        } else if (layer.letterSpacing.unit == 'PERCENT') {
            return layer.letterSpacing.value * 10;
        } else {
            return 0;
        }
    }
}
//// get layer data: GROUP
function getGroup(layer, parentFrame, isMasked) {
    // var flip = getFlipMultiplier(layer);
    var frame = getFrame(layer);
    var calcFrame = getFrame(layer, parentFrame);
    // var stackOffset = (parentFrame == null) ? frame : parentFrame;
    // console.log('parentFrame', layer.name, parentFrame)
    // console.log('group frame', layer.name, stackOffset);
    
	var layerData =  {
        type: isMasked ? 'Component' : 'Group',
		name: '\u25BD ' + layer.name,
		id: layer.id,
		frame: calcFrame,
        isVisible: (layer.visible !== false),
		opacity: Math.round(layer.opacity * 100) || 100,
		// rotation: getRotation(layer) * (flip[1]/100),
		rotation: getRotation(layer),
		blendMode: getLayerBlending(layer.blendMode),
        flip: getFlipMultiplier(layer),
        // hasClippingMask: false,
        shouldBreakMaskChain: false,
        // layers: [],
        layers: filterTypes(layer, frame),
    };
    console.log('group', layerData);
    // if (layer.type == 'AUTOLAYOUT') {
    //     layerData.layers = filterTypes(layer)
    //     // console.log('background', getShape(layer));
        
    //     layerData.layers.unshift(getShape(layer, frame))  // add the background of the frame
    //     layerData.layers[0].type = 'AutoLayoutBG'
    // } else {
    //     layerData.layers = filterTypes(layer, frame)
    // }
  getEffects(layer, layerData);

if (layerData.layers[0] && layerData.layers[0].isMask) { layerData.type = 'Component' }
//   console.log(layerData)
  return layerData;
}
//// get layer data: SYMBOL
function getComponent(layer, parentFrame) {
    var frame = getFrame(layer);
    var calcFrame = getFrame(layer, parentFrame);
    console.log('DO IT INSTANCE', layer);
    // console.log('loooking for background', layer.masterComponent)

	var layerData =  {
        type: 'Component',
        name: layer.name,
        masterId: layer.componentId,
        id: layer.id,
        frame: calcFrame,
        isVisible: (layer.visible !== false),
        opacity: layer.opacity*100 || 100,
        blendMode: getLayerBlending(layer.blendMode),
        symbolFrame: layer.masterComponent,
        bgColor: [1,1,1,1],
        rotation: getRotation(layer),
        flip: getFlipMultiplier(layer),
        isMask: layer.isMask,
        roundness: Math.round(layer.cornerRadius) || 0,
    };
    console.log('layer.name', layer);
    
    // check if an autoLayout
    // if (layer.layoutMode !== 'NONE' || layer.type == 'AUTOLAYOUT') {
        
        layerData.layers = filterTypes(layer);

    // ГЕНЕРАЦИЯ ФОНА
    // Мы создаем шейп из САМОГО родителя (layer)
    let bgLayer = getShape(layer, frame); 
    
    bgLayer.type = 'AutoLayoutBG';
    
    // --- ИСПРАВЛЕНИЕ ТУТ ---
    // Так как этот слой будет лежать ВНУТРИ родителя в AE,
    // он должен иметь нулевые трансформации относительно родителя.
    
    bgLayer.rotation = 0;          // Сбрасываем поворот
    bgLayer.flip = [100, 100];     // Сбрасываем флип (масштаб)
    
    // Если родитель был повернут, getShape мог рассчитать смещенный frame.x/y.
    // Для фона, который равен размеру родителя, координаты должны быть [0,0] или центр.
    // Обычно getShape возвращает координаты центра. 
    // Для фона внутри группы AE координаты должны быть (width/2, height/2).
    
    bgLayer.frame.x = layerData.frame.width / 2;
    bgLayer.frame.y = layerData.frame.height / 2;

    // Добавляем исправленный фон в начало списка
    layerData.layers.unshift(bgLayer);
    // } else {
        // layerData.layers = filterTypes(layer, {x: frame.width/2, y: frame.height/2, width: frame.width, height: frame.height})
        // layerData.layers = filterTypes(layer, frame)
    // }

    getEffects(layer, layerData);

    // getOverrides(layer, layerData);
    return layerData;


    /// get text and nested symbol overrides
    function getOverrides(layer, symbolObj) {
        // reset vars
        var overrideList = [];
        var overrides = layer.overrides;

        // loop through each override on the layer
        for (var i = 0; i < overrides.length; i++) {
            var override = overrides[i];
            if (!override.isDefault) {              // has an override
                symbolObj.id = 'override';
                symbolObj.masterId = 'override';

                // DEPRECIATED forced symbol detach
                // if (override.property == 'image') {     // needs to be detatched from master
                //     var detatchedGroup = layer.detach();
                //     overrideList = [];                  // reset the list
                //     i = 0;                              // reset the count
                // }

                // loop through all layers in the symbol
                for (var j = 0; j < symbolObj.layers.length; j++) {
                    var currentLayer = symbolObj.layers[j];
                    //// it is a GROUP ////    recurse deeper
                    if (currentLayer.type == 'Group') {
                        getOverrides(layer, currentLayer);
                        continue;
                    }
                    //// it is a SYMBOL ////
                    if (override.symbolOverride) {
                        if (currentLayer.id == override.path) {      // do ids match?
                            var overrideSymbol = document.getComponentMasterWithID(override.value);
                            currentLayer.name = overrideSymbol.name;
                            currentLayer.masterId = overrideSymbol.id;
                            currentLayer.layers = filterTypes( overrideSymbol );
                        }
                    }
                    //// it is TEXT ////
                    if (currentLayer.id == override.path) {      // do ids match?
                        currentLayer[ override.property ] = override.value;  // replace the text/image value
                    }
                }
            }
        }
    }
    function getMasterFrame(id) {
        var frameObj = {};
        vm.figmaTree.forEach(frame => {
            if (frame.id == id) {
                frameObj = {
                    width: frame.size.x,
                    height: frame.size.y,
                    x: frame.relativeTransform[0][2],
                    y: frame.relativeTransform[1][2],
                };
            }
        });
        return frameObj;
    }
}
//// get layer data: BOOLEAN_OPERATION
function getBoolean(layer, parentFrame, boolType, isMultipath) {
    var frame = getFrame(layer, parentFrame);
    var adjFrame = {x: frame.x, y: frame.y, width: frame.width, height: frame.height};

    if (boolType != null) {
        adjFrame.x = frame.width/2;
        adjFrame.y = frame.height/2;
    }
    
    var operation = boolType || getBoolType(layer);

    // Pre-calculate styles to pass down to children if needed
    var computedFills = getFills(layer, parentFrame);
    var computedStrokes = getStrokes(layer);

    var layerData = {
        type: 'CompoundShape',
        name: layer.name,
        id: layer.id,
        frame: frame,
        fill: computedFills,
        stroke: computedStrokes,
        isVisible: (layer.visible !== false),
        opacity: Math.round(layer.opacity*100) || 100,
        rotation: getRotation(layer),
        blendMode: getLayerBlending(layer.blendMode),
        flip: [100,100],
        booleanOperation: operation,
        isMask: layer.isMask,
    };
    
    if (isMultipath) {
        // Here we build the children layers from the parsed paths
        // and assign them the correct fill/stroke derived above
        layerData.layers = getCompoundPaths(layer, computedFills, computedStrokes);
    } else {        
        layerData.layers = filterTypes(layer, adjFrame, null);
        
        // Realign sub layers for standard boolean groups
        if (layerData.layers) {
            layerData.layers.forEach(subLayer => {
                boolOffset = (!boolOffset) ? { x: layerData.layers[0].frame.x, y: layerData.layers[0].frame.y } : boolOffset;
                if (!subLayer.layers) {
                    subLayer.frame.x -= subLayer.frame.width/2;
                    subLayer.frame.y -= subLayer.frame.height/2;
                } else {
                    subLayer.frame.x -= boolOffset.x;
                    subLayer.frame.y -= boolOffset.y;
                }
                subLayer.booleanOperation = operation;
            });
        }
    }
    getEffects(layer, layerData);
    return layerData;
}
function getCompoundPaths(layer, computedFills, computedStrokes) {
    var layerList = [];

    if (layer._aeuxParsedPaths) {
        var parsed = layer._aeuxParsedPaths;
        
        for (var i = 0; i < parsed.length; i++) {
            var pObj = parsed[i];
            
            // ЛОГИКА ЦВЕТОВ:
            var pathFill = null;
            var pathStroke = null;

            if (pObj.isOutline) {
                // ХАК: Если это Outline из strokeGeometry, 
                // мы берем цвет ОБВОДКИ слоя, но применяем его как ЗАЛИВКУ пути.
                if (computedStrokes && computedStrokes.length > 0) {
                    // Превращаем данные обводки в данные заливки
                    pathFill = computedStrokes.map(s => ({
                        type: s.type,
                        enabled: s.enabled,
                        color: s.color,
                        opacity: s.opacity,
                        blendMode: s.blendMode
                    }));
                }
                // Обводку выключаем, так как мы уже нарисовали её форму заливкой
                pathStroke = null; 
            } else {
                // Стандартная логика
                pathFill = (pObj.renderFill) ? computedFills : null;
                pathStroke = (pObj.renderStroke) ? computedStrokes : null;
            }

            var pathLayer = {
                type: 'Path',
                name: 'Path ' + (i + 1),
                id: null,
                frame: { width: 100, height: 100, x: 0, y: 0 },
                path: pObj,
                flip: [100, 100],
                rotation: 0,
                booleanOperation: -1, // Отключаем булевы, пусть рисуются просто слоями
                opacity: 100,
                blendMode: getLayerBlending(layer.blendMode),
                isVisible: true,
                
                // Применяем вычисленные стили
                fill: pathFill,
                stroke: pathStroke
            };

            layerList.push(pathLayer);
        }
    } 
    return layerList;
}

function getEffects(layer, layerData) {
    // console.log(layer);
    
    layerData.shadow = [];
    layerData.innerShadow = [];
    layerData.blur = [];

    if (layer.effects.length > 0) {
        for (var i = 0; i < layer.effects.length; i++) {
            var effect = layer.effects[i];

            if (effect.type == 'DROP_SHADOW') {
                if (effect.visible) {
                    layerData.shadow.push({
        				color: colorObjToArray(effect),
        				position: [effect.offset.x, effect.offset.y],
        				blur: effect.radius,
        				spread: 0
        			});
                }
                continue;
            }
            if (effect.type == 'INNER_SHADOW') {
                if (effect.visible) {
                    layerData.innerShadow.push({
        				color: colorObjToArray(effect),
        				position: [effect.offset.x, effect.offset.y],
        				blur: effect.radius,
        				spread: 0
        			});
                }
            }
            if (effect.type == 'LAYER_BLUR') {
                if (effect.visible) {
                    layerData.blur.push({
                        radius: effect.radius * 4,
                        type: 0,
        			});
                }
            }
            if (effect.type == 'BACKGROUND_BLUR') {
                // adjustment layer
                layerData.bgBlur = effect.radius * 2
                console.log('BG BLUR');
            }
        }
    }

    if (layerData.shadow.length == 0)       { layerData.shadow = null };
    if (layerData.innerShadow.length == 0)  { layerData.innerShadow = null };
    if (layerData.blur.length == 0)         { layerData.blur = null };
}
function getBoolType (layer) {
    var boolType = layer.booleanOperation;
    // console.log(layer.name, layer.booleanOperation)

    switch (boolType) {
        case 'ADD':
            return 0;
        case 'SUBTRACT':
            return 1;
        case 'INTERSECT':
            return 2;
        case 'EXCLUDE':
            return 3;

        default:
            return -1;
    }
}
function getFrame(layer, parentFrame, constrainFrame) {
    var width = layer.width || 0;
    var height = layer.height || 0;
    var m = layer.relativeTransform; // [[a, b, tx], [c, d, ty]]

    // --- ЛОГИКА ДЛЯ ИЗОБРАЖЕНИЙ (constrainFrame = true) ---
    // Если это картинка, она будет растеризована/экспортирована как прямоугольник.
    // Нам нужно найти Bounding Box повернутого слоя, а затем обрезать его краями артборда.
    if (constrainFrame && typeof frameSize !== 'undefined') {
        
        // 1. Вычисляем координаты 4-х углов повернутого изображения в пространстве родителя
        // Формула: x' = tx + a*x + b*y, y' = ty + c*x + d*y
        function getCorner(x, y) {
            return {
                x: m[0][2] + m[0][0] * x + m[0][1] * y,
                y: m[1][2] + m[1][0] * x + m[1][1] * y
            };
        }

        var p1 = getCorner(0, 0);          // Top-Left
        var p2 = getCorner(width, 0);      // Top-Right
        var p3 = getCorner(0, height);     // Bottom-Left
        var p4 = getCorner(width, height); // Bottom-Right

        // 2. Находим границы Bounding Box (min/max X и Y)
        var minX = Math.min(p1.x, p2.x, p3.x, p4.x);
        var maxX = Math.max(p1.x, p2.x, p3.x, p4.x);
        var minY = Math.min(p1.y, p2.y, p3.y, p4.y);
        var maxY = Math.max(p1.y, p2.y, p3.y, p4.y);

        // 3. Если есть родительская группа, корректируем координаты (делаем локальными для группы, но абсолютными для артборда логически)
        // В данном контексте parentFrame используется для смещения относительно артборда.
        // Если parentFrame передан, значит координаты слоя локальны для него.
        if (parentFrame) {
            // Если мы внутри группы, мы НЕ должны обрезать картинку границами артборда,
            // так как локальные координаты не совпадают с глобальными.
            // Мы просто возвращаем Bounding Box, пересчитанный от ЦЕНТРА родителя.
            
            var localWidth = maxX - minX;
            var localHeight = maxY - minY;
            
            // Центр картинки в системе координат "Top-Left" родителя
            var centerX = minX + (localWidth / 2);
            var centerY = minY + (localHeight / 2);

            return {
                width: localWidth,
                height: localHeight,
                // Смещаем центр: от (0,0) родителя к (width/2, height/2) родителя
                x: centerX - (parentFrame.width / 2),
                y: centerY - (parentFrame.height / 2)
            };
        }

        // 4. Кропаем (обрезаем) полученный Bounding Box границами Артборда (frameSize)
        // Картинка не может вылезать за пределы [0, 0] и [frameWidth, frameHeight]
        
        // Левый край: не меньше 0, но и не больше ширины артборда (на случай если картинка полностью справа)
        var finalLeft = Math.max(0, Math.min(minX, frameSize[0])); 
        var finalTop = Math.max(0, Math.min(minY, frameSize[1]));
        
        // Правый край: не больше ширины артборда, но не меньше 0
        var finalRight = Math.min(frameSize[0], Math.max(maxX, 0));
        var finalBottom = Math.min(frameSize[1], Math.max(maxY, 0));

        // 5. Итоговые размеры и центр
        var finalWidth = finalRight - finalLeft;
        var finalHeight = finalBottom - finalTop;

        return {
            width: finalWidth,
            height: finalHeight,
            x: finalLeft + finalWidth / 2,
            y: finalTop + finalHeight / 2
        };
    }

    // --- ЛОГИКА ДЛЯ ОБЫЧНЫХ СЛОЕВ (Vector, Group, Text) ---
    // Здесь мы считаем математический центр фигуры для AE.
    
    // 1. Считаем центр слоя в системе координат родителя (от левого верхнего угла)
    // m[0][2] и m[1][2] — это уже локальные координаты относительно родителя (спасибо Figma API)
    var x = m[0][2] + (m[0][0] * width / 2) + (m[0][1] * height / 2);
    var y = m[1][2] + (m[1][0] * width / 2) + (m[1][1] * height / 2);

    if (parentFrame) {
        // 2. Переводим в систему координат After Effects.
        // AE считает (0,0) в центре родителя. Figma — в левом верхнем углу.
        // Нам нужно просто сдвинуть наши координаты на половину ширины/высоты родителя.
        x -= parentFrame.width / 2;
        y -= parentFrame.height / 2;
    }

    return {
        width: width,
        height: height,
        x: x,
        y: y,
    };
}
function frameOffset(boundingBox) {
    return {
        width: boundingBox.width,
        height: boundingBox.height,
        x: boundingBox.x - frameOffset.x,
        y: boundingBox.y - frameOffset.y,
    };
}
//// get artboard data
function storeArtboard(data) {
    var bgColor = colorObjToArray(data.backgrounds);
    if (!bgColor || bgColor[3] < 0.0000001) { bgColor = [1,1,1,1] }

    frameSize = [data.width, data.height]

    var artboardObj = {
        type: "Artboard",
        aeuxVersion: versionNumber,
        hostApp: "Figma",
        name: data.name.replace(/^\*\s/, '').replace(/^\*/, ''),
        bgColor: bgColor,
        size: frameSize,
        // images: [],
    };

    frameOffset.x = data.absoluteTransform[0][2];
    frameOffset.y = data.absoluteTransform[1][2];

  /// tells filterTypes() this doesn't need to run again
    hasArtboard = true;

    return artboardObj;
}

//// get layer data: FILL
function getFills(layer, parentFrame) {
    // console.log('getFills');

    var fillData = [];
    var fills = layer.fills;
    var size = [layer.width, layer.height];

    // loop through all fills
    for (var i = 0; i < fills.length; i++) {
        var fill = fills[i];

        // add fill to fillProps only if fill is enabled
        if (fill.visible !== false) {
            var fillObj = {}
            var fillType = getFillType(fill.type);   /// find type and if a gradient get the grad type
            // fill is a gradient
            if (fillType[0] > 0) {
                var gradType = fillType[1];
                
                let points = {}
                if (gradType == 2) {
                    let radialPoints = extractRadialOrDiamondGradientParams(layer.width, layer.height, fill.gradientTransform)
                    let rad = radialPoints.radius[0]
                    points.start = radialPoints.center
                    points.end = [points.start[0] + rad, points.start[1]]
                } else {
                    points = extractLinearGradientParamsFromTransform(layer.width, layer.height, fill.gradientTransform)
                }                    
                
                fillObj = {
                    type: 'gradient',
                    // startPoint: [points.start[0], points.start[1] ],
                    // endPoint: [points.end[0], points.end[1] ],
                    startPoint: [points.start[0] - layer.width / 2, points.start[1] - layer.height / 2 ],
                    endPoint: [points.end[0] - layer.width / 2, points.end[1] - layer.height / 2 ],
                    gradType:  gradType,
                    gradient: getGradient(fill.gradientStops),
                    opacity: 100,
                    blendMode: getShapeBlending( fill.blendMode ),
                }
                
            // fill is an image or texture
            } else if (fill.type == 'IMAGE' && !layer.isMask) {
                fillData = getImageFill(layer, parentFrame);
                break;
            // fill is a solid
            } else {                    
                var color = colorObjToArray(fill);                    
                
                fillObj = {
                    type: 'fill',
                    enabled: fill.visible !== false,
                    color: color,
                    opacity: color[3] * 100,
                    // opacity: (color) ? 100 : Math.round(color[3] * 100),
                    blendMode: getShapeBlending( fill.blendMode ),
                }
            }

            // add obj string to array
            fillData.push(fillObj);
        }
    }
    return fillData;
}
//// get layer data: IMAGE
function getImageFill(layer, parentFrame) {
    // 1. Вызываем getFrame с флагом true (constrainFrame).
    // Функция getFrame (которую мы исправили ранее) САМА обрежет размеры 
    // и пересчитает координаты центра (x, y), если картинка выходит за края.
    let frame = getFrame(layer, parentFrame, true);

    // 2. Дополнительная страховка (Sanity Check)
    // На случай погрешностей float-чисел (например 400.000001 > 400),
    // просто подрезаем размер, НО НЕ ТРОГАЕМ позицию (x/y).
    if (frame.width > frameSize[0]) frame.width = frameSize[0];
    if (frame.height > frameSize[1]) frame.height = frameSize[1];
    
    // ВАЖНО: Мы удалили блоки, которые сбрасывали frame.x и frame.y в центр.
    // Теперь позиция будет такой, какую рассчитала матрица.

	let layerData =  {
        type: 'Image',
        name: layer.name.toString().replace(/[\\:"*?%<>|]/g, '-'),
        id: layer.id.replace(/:/g, '-'),
        frame: frame,
        isVisible: (layer.visible !== false),
        opacity: 100, 
        blendMode: getLayerBlending(layer.blendMode),
        isMask: layer.isMask,
        
        // 3. Rotation
        // Если мы используем constrainFrame (обрезаем картинку по границам артборда),
        // то результат всегда становится прямоугольником, выровненным по осям (Axis Aligned).
        // Поэтому вращение должно быть 0. Если оставить реальный угол слоя, 
        // AE повернет уже обрезанный прямоугольник, и будет дырка.
        rotation: 0, 
    };

    getEffects(layer, layerData);

    return layerData;
}
//// get layer data: STROKE
function getStrokes(layer) {
    var computedStrokeWidth = layer.strokeWeight;
    
    // Проверяем, поддерживает ли слой индивидуальные веса обводок
    if ('strokeTopWeight' in layer) {
        computedStrokeWidth = Math.max(
            layer.strokeTopWeight || 0,
            layer.strokeBottomWeight || 0,
            layer.strokeLeftWeight || 0,
            layer.strokeRightWeight || 0
        );
    }
    // Если по какой-то причине max вернул 0 (например, странный баг), 
    // но общий вес есть, подстрахуемся (опционально, но полезно)
    if (computedStrokeWidth === 0 && layer.strokeWeight > 0) {
        computedStrokeWidth = layer.strokeWeight;
    }

	var strokeData = [];
    var strokes = layer.strokes;
    // var size = [layer.width, layer.height]; // кажется, не используется в этом сниппете, но оставим если нужно

    // loop through all strokes
    for (var i = 0; i < strokes.length; i++) {
        var stroke = strokes[i];
        if (stroke.visible !== false) {
            var strokeObj = {}
            var fillType = getFillType(stroke.type);   /// find type and if a gradient get the grad type
            
            // stroke is a gradient
            if (fillType[0] > 0) {
                var gradType = fillType[1];

                let points = {}
                if (gradType == 2) {
                    let radialPoints = extractRadialOrDiamondGradientParams(layer.width, layer.height, stroke.gradientTransform)
                    let rad = radialPoints.radius[0]
                    points.start = radialPoints.center
                    points.end = [points.start[0] + rad, points.start[1]]
                } else {
                    points = extractLinearGradientParamsFromTransform(layer.width, layer.height, stroke.gradientTransform)
                }  

                strokeObj = {
                    type: 'gradient',
                    startPoint: [points.start[0] - layer.width / 2, points.start[1] - layer.height / 2],
                    endPoint: [points.end[0] - layer.width / 2, points.end[1] - layer.height / 2],
                    gradType:  gradType,
                    gradient: getGradient(stroke.gradientStops),
                    opacity: 100,
                    width: computedStrokeWidth, // ИСПОЛЬЗУЕМ ВЫЧИСЛЕННУЮ ШИРИНУ
                    cap: getCap(layer),
                    join: getJoin(layer),
                    strokeDashes: layer.dashPattern,
                    blendMode: getShapeBlending( stroke.blendMode ),
                }
            // stroke is a solid
            } else {                    
                var color = colorObjToArray(stroke);
                strokeObj = {
                    type: 'fill',
                    enabled: stroke.visible !== false,
                    color: color,
                    opacity: color[3] * 100,
                    width: computedStrokeWidth, // ИСПОЛЬЗУЕМ ВЫЧИСЛЕННУЮ ШИРИНУ
                    cap: getCap(layer),
                    join: getJoin(layer),
                    strokeDashes: layer.dashPattern,
                    blendMode: getShapeBlending( stroke.blendMode ),
                }
            }

            // add obj string to array
            strokeData.push(strokeObj);
        }
    }
    return strokeData;

    function getCap(layer) {
        if (layer.strokeCap == 'ROUND') {
            return 1;
        }
        if (layer.strokeCap == 'SQUARE') {
            return 2;
        }
        return 0;
    }
    function getJoin(layer) {
        if (layer.strokeJoin == 'ROUND') {
            return 1;
        }
        if (layer.strokeJoin == 'BEVEL') {
            return 2;
        }
        return 0;
    }
}
//// get layer data: GRADIENT
function getGradient(grad) {
    var gradObj = {
        length: grad.length,
        points: []
    };

    for (var i = 0; i < gradObj.length; i++) {
        var colorArr = colorObjToArray(grad[i]);
        gradObj.points.push({
            color: colorArr,
            midPoint: 0.5,
            opacity: colorArr[3],
            rampPoint: grad[i].position,
        });
    }
    // console.log('gradObj', gradObj);
    
    return gradObj;
}

//// get layer data: SHAPE TYPE
function getShapeType(layer) {
    const allEqual = arr => arr.every(v => v === arr[0])

    if ( layer.type == 'RECTANGLE' && 
        allEqual([layer.topLeftRadius, layer.topRightRadius, layer.bottomLeftRadius, layer.bottomRightRadius]) ) { return 'Rect' }
    if ( layer.type == 'ELLIPSE' ) { return 'Ellipse' }
    // if ( layer.type == 'STAR' || layer.type == 'POLYGON') { return 'Star' }
    return 'Path';
}
//// get layer data: SHAPE TYPE
function getFillType(type) {
    var typeList = [];

    if (type.search(/gradient/i) > -1) {
        typeList.push(1);       // it's a gradient
        if (type == 'GRADIENT_LINEAR') {
            typeList.push(1);   // it's a linear gradient
        } else if (type == 'GRADIENT_RADIAL') {
            typeList.push(2);   // it's a radial gradient
        } else {
            typeList.push(1);   // it's a linear or anything else
        }
    } else {
        typeList.push(0);       // it's a solid
    }

    return typeList;
}
//// checks for non-uniform scaling of parametric polygons and stars
function getPolyscale(layer) {
  var polyScale = [100, 100];
  var w = layer.width;
  var h = layer.height;
  if (w < h) { polyScale[0] = w/h * 100; }
  if (h < w) { polyScale[1] = h/w * 100; }

  return polyScale;
}

//// convert color obj to array
function colorObjToArray(colorObj) {
    // console.log('colorObj', colorObj);
    try {
        var c = (colorObj.length > 0) ? colorObj[0] : colorObj;
        // console.log('c.color.a', c.color.a);
        
        var alpha = 1;
        if (c.opacity !== undefined) { alpha = c.opacity }
        else if (c.color.a !== undefined) { alpha = c.color.a }

        if (c.color.r === undefined) { return null }
        
        return [c.color.r, c.color.g, c.color.b, alpha];
    } catch (error) {
        return [1, 1, 1, 1]
    }
    
}

//// return enumerated layer blending mode
function getLayerBlending(mode) {
    var aeBlendMode;

    switch (mode) {
        case 'DARKEN':
            aeBlendMode = 'BlendingMode.DARKEN';
            break;
        case 'MULTIPLY':
            aeBlendMode = 'BlendingMode.MULTIPLY';
            break;
        case 'LINEAR_BURN':
            aeBlendMode = 'BlendingMode.LINEAR_BURN';
            break;
        case 'COLOR_BURN':
            aeBlendMode = 'BlendingMode.COLOR_BURN';
            break;
        case 'LIGHTEN':
            aeBlendMode = 'BlendingMode.LIGHTEN';
            break;
        case 'SCREEN':
            aeBlendMode = 'BlendingMode.SCREEN';
            break;
        case 'LINEAR_DODGE':
            aeBlendMode = 'BlendingMode.LINEAR_DODGE';
            break;
        case 'COLOR_DODGE':
            aeBlendMode = 'BlendingMode.COLOR_DODGE';
            break;
        case 'OVERLAY':
            aeBlendMode = 'BlendingMode.OVERLAY';
            break;
        case 'SOFT_LIGHT':
            aeBlendMode = 'BlendingMode.SOFT_LIGHT';
            break;
        case 'HARD_LIGHT':
            aeBlendMode = 'BlendingMode.HARD_LIGHT';
            break;
        case 'DIFFERENCE':
            aeBlendMode = 'BlendingMode.DIFFERENCE';
            break;
        case 'EXCLUSION':
            aeBlendMode = 'BlendingMode.EXCLUSION';
            break;
        case 'HUE':
            aeBlendMode = 'BlendingMode.HUE';
            break;
        case 'SATURATION':
            aeBlendMode = 'BlendingMode.SATURATION';
            break;
        case 'COLOR':
            aeBlendMode = 'BlendingMode.COLOR';
            break;
        case 'LUMINOSITY':
            aeBlendMode = 'BlendingMode.LUMINOSITY';
            break;
        default: aeBlendMode = 'BlendingMode.NORMAL';
    }
    return aeBlendMode;
}

//// return integer layer blending mode
function getShapeBlending(mode) {
    var aeBlendMode;

    switch (mode) {
        case 'DARKEN':
            aeBlendMode = 3;
            break;
        case 'MULTIPLY':
            aeBlendMode = 4;
            break;
        case 'COLOR_BURN':
            aeBlendMode = 5;
            break;
        case 'LINEAR_BURN':
            aeBlendMode = 6;
            break;
        case 'LIGHTEN':
            aeBlendMode = 9;
            break;
        case 'SCREEN':
            aeBlendMode = 10;
            break;
        case 'COLOR_DODGE':
            aeBlendMode = 11;
            break;
        case 'LINEAR_DODGE':
            aeBlendMode = 12;
            break;
        case 'OVERLAY':
            aeBlendMode = 15;
            break;
        case 'SOFT_LIGHT':
            aeBlendMode = 16;
            break;
        case 'HARD_LIGHT':
            aeBlendMode = 17;
            break;
        case 'DIFFERENCE':
            aeBlendMode = 23;
            break;
        case 'EXCLUSION':
            aeBlendMode = 24;
            break;
        case 'HUE':
            aeBlendMode = 26;
            break;
        case 'SATURATION':
            aeBlendMode = 27;
            break;
        case 'COLOR':
            aeBlendMode = 28;
            break;
        case 'LUMINOSITY':
            aeBlendMode = 29;
            break;
        default: aeBlendMode = 1;
    }

    return aeBlendMode;
}

//// get shape data: PATH
function getPath(layer, bounding) {
    var combinedData = [];
    
    // Вспомогательный массив для хранения границ (bbox) путей заливки
    var fillFingerprints = [];

    // Есть ли у слоя видимая обводка?
    var hasActiveStroke = false;
    if (layer.strokes && layer.strokes.length > 0) {
        hasActiveStroke = layer.strokes.some(s => s.visible !== false);
    }
    if (layer.strokeWeight === 0 && !layer.strokeTopWeight) { hasActiveStroke = false; }

    // --- 1. FILL GEOMETRY (Приоритет: Скелет) ---
    if (layer.fillGeometry && layer.fillGeometry.length > 0) {
        var fillPaths = layer.fillGeometry;
        for (var i = 0; i < fillPaths.length; i++) {
            var d = fillPaths[i].data;
            if (!d) continue;

            // Парсим сразу для получения BBox
            var parsedTemp = parseSvg(d, false);
            var bbox = getPathBBox(parsedTemp);
            
            fillFingerprints.push({
                bbox: bbox,
                data: d
            });

            combinedData.push({ 
                data: d, 
                key: 'fill-' + i, 
                isFill: true, 
                // Включаем обводку на скелете, если у слоя она есть
                isStroke: hasActiveStroke 
            });
        }
    }

    // --- 2. STROKE GEOMETRY (Приоритет: Детали, которых нет в заливке) ---
    // Используем это для элементов типа дуги Магнита, у которых нет заливки
    if (layer.strokeGeometry && layer.strokeGeometry.length > 0) {
        var strokePaths = layer.strokeGeometry;
        for (var i = 0; i < strokePaths.length; i++) {
            var d = strokePaths[i].data;
            if (!d) continue;

            var parsedTemp = parseSvg(d, false);
            var bbox = getPathBBox(parsedTemp);

            // Проверяем, является ли этот путь очертанием уже существующей заливки.
            // BBox очертания (Outline) обычно чуть больше BBox скелета на величину strokeWeight.
            // Мы используем "мягкое" сравнение.
            var isDuplicate = false;
            
            for (var j = 0; j < fillFingerprints.length; j++) {
                var fBox = fillFingerprints[j].bbox;
                
                // Проверяем перекрытие и схожесть центров
                var centerDistX = Math.abs((bbox.x + bbox.w/2) - (fBox.x + fBox.w/2));
                var centerDistY = Math.abs((bbox.y + bbox.h/2) - (fBox.y + fBox.h/2));
                
                // Если центры совпадают (с погрешностью) И размеры сопоставимы
                // (учитываем, что outline всегда >= skeleton)
                if (centerDistX < 2 && centerDistY < 2) {
                    isDuplicate = true;
                    break;
                }
            }

            if (!isDuplicate) {
                // ЭТО УНИКАЛЬНЫЙ ЭЛЕМЕНТ (например, Дуга Магнита)
                // Так как это strokeGeometry, это уже "очерченная" форма (Outline).
                // В AE мы должны ЗАЛИТЬ её цветом обводки, а обводку ВЫКЛЮЧИТЬ.
                combinedData.push({ 
                    data: d, 
                    key: 'stroke-unique-' + i,
                    // ВАЖНО: Это хак. Мы говорим AE "залей это", хотя в Figma это было обводкой.
                    // Но геометрически это замкнутый контур обводки.
                    isFill: true, // Заливаем (цветом, который возьмем из stroke слоя)
                    isStroke: false, // Не обводим (иначе будет обводка вокруг обводки)
                    isOutline: true // Флаг для дальнейшей обработки (цвета)
                });
            }
        }
    }

    // --- 3. VECTOR PATHS (Резерв для простых линий) ---
    if (combinedData.length === 0 && layer.vectorPaths && layer.vectorPaths.length > 0) {
        var vPaths = Array.isArray(layer.vectorPaths) ? layer.vectorPaths : [layer.vectorPaths];
        for (var i = 0; i < vPaths.length; i++) {
            var d = vPaths[i].data || vPaths[i];
            var isClosed = (d.indexOf('Z') > -1 || d.indexOf('z') > -1);
            combinedData.push({
                data: d,
                key: 'vector-' + i,
                isFill: isClosed,
                isStroke: true
            });
        }
    }

    // --- ПАРСИНГ И РЕНДЕР (Без изменений) ---
    var parsedPaths = [];
    var globalMinX = Infinity;
    var globalMinY = Infinity;

    for (var i = 0; i < combinedData.length; i++) {
        var svgResult = parseSvg(combinedData[i].data, false);
        
        for (var p = 0; p < svgResult.length; p++) {
            for (var pt of svgResult[p].points) {
                if (pt[0] < globalMinX) globalMinX = pt[0];
                if (pt[1] < globalMinY) globalMinY = pt[1];
            }
            svgResult[p].renderFill = combinedData[i].isFill;
            svgResult[p].renderStroke = combinedData[i].isStroke;
            
            // Если это Outline (из strokeGeometry), нам нужно будет
            // в функции getStrokes/getFills подменить цвет. 
            // Но пока просто передаем геометрию.
            if (combinedData[i].isOutline) {
                svgResult[p].isOutline = true; 
            }

            parsedPaths.push(svgResult[p]);
        }
    }

    if (globalMinX !== Infinity && globalMinY !== Infinity) {
        parsedPaths.forEach(p => {
            for (var j = 0; j < p.points.length; j++) {
                p.points[j][0] -= globalMinX;
                p.points[j][1] -= globalMinY;
            }
        });
    }

    if (parsedPaths.length > 1) {
        layer._aeuxParsedPaths = parsedPaths;
        return 'multiPath';
    }

    return parsedPaths[0] || { points: [], inTangents: [], outTangents: [], closed: false };
}

// === ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ГРАНИЦ ===
function getPathBBox(paths) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    if (!paths) return {x:0, y:0, w:0, h:0};
    
    paths.forEach(p => {
        p.points.forEach(pt => {
            if (pt[0] < minX) minX = pt[0];
            if (pt[1] < minY) minY = pt[1];
            if (pt[0] > maxX) maxX = pt[0];
            if (pt[1] > maxY) maxY = pt[1];
        });
    });
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (добавить внутрь aeux.js или вне getPath) ===

function getPathBounds(paths) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    if (!paths || paths.length === 0) return [0,0,0,0];
    
    // Проходимся по всем точкам всех суб-путей
    paths.forEach(p => {
        p.points.forEach(pt => {
            if (pt[0] < minX) minX = pt[0];
            if (pt[1] < minY) minY = pt[1];
            if (pt[0] > maxX) maxX = pt[0];
            if (pt[1] > maxY) maxY = pt[1];
        });
    });
    
    // Возвращаем [x, y, width, height] с небольшим округлением, чтобы игнорировать микро-сдвиги
    return [
        Math.round(minX * 10) / 10,
        Math.round(minY * 10) / 10,
        Math.round((maxX - minX) * 10) / 10,
        Math.round((maxY - minY) * 10) / 10
    ];
}

function findMatchingBoundIndex(targetBounds, fingerprints) {
    var targetStr = targetBounds.join('|');
    
    // 1. Точное совпадение
    var idx = fingerprints.indexOf(targetStr);
    if (idx !== -1) return idx;

    // 2. Нечеткое совпадение (если stroke inside/outside слегка меняет размер)
    // Допускаем погрешность в пару пикселей
    var tx = targetBounds[0], ty = targetBounds[1], tw = targetBounds[2], th = targetBounds[3];
    
    for (var i = 0; i < fingerprints.length; i++) {
        var fp = fingerprints[i].split('|').map(Number);
        if (Math.abs(fp[0] - tx) < 2 && 
            Math.abs(fp[1] - ty) < 2 && 
            Math.abs(fp[2] - tw) < 2 && 
            Math.abs(fp[3] - th) < 2) {
            return i;
        }
    }
    return -1;
}
function parseSvg(str, transformed) {
    var paths = [];
    var currentPath = null;
    
    // Robust Tokenizer: captures single letters OR numbers (float, scientific)
    var tokens = str.match(/([a-zA-Z])|([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/g);
    if (!tokens) return [{ points: [], inTangents: [], outTangents: [], closed: false }];

    var i = 0;
    var minX = Infinity, minY = Infinity;
    var currentPoint = [0, 0];
    var lastControlPoint = null;

    while (i < tokens.length) {
        var token = tokens[i];
        
        // Is it a command?
        if (/^[a-zA-Z]$/.test(token)) {
            var cmd = token;
            var isRelative = (cmd === cmd.toLowerCase());
            var cmdUpper = cmd.toUpperCase();
            i++;

            // M - MoveTo (Start new path)
            if (cmdUpper === 'M') {
                if (currentPath && currentPath.points.length > 0) {
                    paths.push(currentPath);
                }
                currentPath = { points: [], inTangents: [], outTangents: [], closed: false };
                
                if (i + 1 < tokens.length) {
                    var x = parseFloat(tokens[i]), y = parseFloat(tokens[i+1]); i += 2;
                    if (isRelative) { x += currentPoint[0]; y += currentPoint[1]; }
                    
                    minX = Math.min(minX, x); minY = Math.min(minY, y);
                    currentPath.points.push([x, y]);
                    currentPath.inTangents.push([0, 0]); currentPath.outTangents.push([0, 0]);
                    currentPoint = [x, y]; lastControlPoint = null;
                }
            }
            // L - LineTo
            else if (cmdUpper === 'L') {
                if (i + 1 < tokens.length) {
                    var x = parseFloat(tokens[i]), y = parseFloat(tokens[i+1]); i += 2;
                    if (isRelative) { x += currentPoint[0]; y += currentPoint[1]; }
                    minX = Math.min(minX, x); minY = Math.min(minY, y);
                    currentPath.points.push([x, y]);
                    currentPath.inTangents.push([0, 0]); currentPath.outTangents.push([0, 0]);
                    currentPoint = [x, y]; lastControlPoint = null;
                }
            }
            // C - Cubic Bezier
            else if (cmdUpper === 'C') {
                if (i + 5 < tokens.length) {
                    var cp1x = parseFloat(tokens[i]), cp1y = parseFloat(tokens[i+1]);
                    var cp2x = parseFloat(tokens[i+2]), cp2y = parseFloat(tokens[i+3]);
                    var endX = parseFloat(tokens[i+4]), endY = parseFloat(tokens[i+5]);
                    i += 6;
                    
                    if (isRelative) {
                        cp1x += currentPoint[0]; cp1y += currentPoint[1];
                        cp2x += currentPoint[0]; cp2y += currentPoint[1];
                        endX += currentPoint[0]; endY += currentPoint[1];
                    }
                    minX = Math.min(minX, endX); minY = Math.min(minY, endY);
                    
                    // AE Tangents are relative to vertex
                    var lastIdx = currentPath.points.length - 1;
                    if (lastIdx >= 0) {
                        var prev = currentPath.points[lastIdx];
                        currentPath.outTangents[lastIdx] = [cp1x - prev[0], cp1y - prev[1]];
                    }
                    currentPath.points.push([endX, endY]);
                    currentPath.inTangents.push([cp2x - endX, cp2y - endY]);
                    currentPath.outTangents.push([0, 0]);
                    currentPoint = [endX, endY]; lastControlPoint = [cp2x, cp2y];
                }
            }
            // Z - Close
            else if (cmdUpper === 'Z') {
                currentPath.closed = true;
                // Merge first and last if they are same
                if (currentPath.points.length > 1) {
                    var first = currentPath.points[0];
                    var last = currentPath.points[currentPath.points.length - 1];
                    if (Math.abs(last[0]-first[0]) < 0.001 && Math.abs(last[1]-first[1]) < 0.001) {
                        currentPath.inTangents[0] = currentPath.inTangents.pop();
                        currentPath.points.pop(); currentPath.outTangents.pop();
                    }
                }
                currentPoint = currentPath.points[0]; lastControlPoint = null;
            }
            // Simple support for H and V just in case
            else if (cmdUpper === 'H') {
                var x = parseFloat(tokens[i]); i++;
                if (isRelative) x += currentPoint[0];
                var y = currentPoint[1];
                minX = Math.min(minX, x);
                currentPath.points.push([x, y]);
                currentPath.inTangents.push([0,0]); currentPath.outTangents.push([0,0]);
                currentPoint = [x, y];
            }
            else if (cmdUpper === 'V') {
                var y = parseFloat(tokens[i]); i++;
                if (isRelative) y += currentPoint[1];
                var x = currentPoint[0];
                minY = Math.min(minY, y);
                currentPath.points.push([x, y]);
                currentPath.inTangents.push([0,0]); currentPath.outTangents.push([0,0]);
                currentPoint = [x, y];
            }
        } else { i++; } // Skip unknown
    }

    if (currentPath && currentPath.points.length > 0) paths.push(currentPath);

    // Apply global offset to zero-out the path in its own frame
    if (transformed && minX !== Infinity) {
        paths.forEach(p => {
            for (var j = 0; j < p.points.length; j++) {
                p.points[j][0] -= minX;
                p.points[j][1] -= minY;
            }
        });
    }

    return paths.length > 0 ? paths : [{ points: [], inTangents: [], outTangents: [], closed: false }];
}

//// 1. Функция расчета Масштаба и Флипа
function getFlipMultiplier(layer) {
    var m = layer.relativeTransform;
    
    // Вектор оси X (первый столбец матрицы)
    var a = m[0][0];
    var c = m[1][0];

    // Вектор оси Y (второй столбец матрицы)
    var b = m[0][1];
    var d = m[1][1];

    // 1. Считаем реальную длину вектора X (Scale X)
    var sx = Math.sqrt(a * a + c * c);
    
    // 2. Считаем Детерминант (площадь + ориентация)
    var det = a * d - b * c;

    // 3. Считаем Scale Y
    // Вся информация о "зеркальности" (флипе) математически живет в знаке детерминанта.
    // Мы передаем этот знак в Scale Y.
    // Если sx = 0 (вырожденная матрица), ставим 0.
    var sy = (sx === 0) ? 0 : det / sx;

    // After Effects поймет:
    // [100, 100] -> обычный слой
    // [100, -100] -> слой отзеркален (неважно, горизонтально или вертикально, угол Rotation довернет остальное)
    return [
        Math.round(sx * 10000) / 100, 
        Math.round(sy * 10000) / 100
    ];
}

//// 2. Функция расчета Угла
function getRotation(layer) {
    var m = layer.relativeTransform;
    
    // Нам нужно знать только, куда смотрит ось X слоя.
    // m[1][0] - это Sin (смещение по Y)
    // m[0][0] - это Cos (смещение по X)
    
    // Math.atan2(y, x) возвращает угол в радианах от -PI до PI.
    // Благодаря тому, что у Figma и AE ось Y смотрит вниз,
    // положительный результат здесь == поворот по часовой стрелке.
    var angle = Math.atan2(m[1][0], m[0][0]);
    
    // Переводим радианы в градусы
    var degree = angle * (180 / Math.PI);
    
    // НИКАКИХ "МИНУСОВ" НЕ НУЖНО.
    // Если вектор X смотрит вниз (m[1][0] > 0), угол будет положительным (например, 45).
    // AE повернет слой по часовой на 45. Все совпадает.
    return degree; 
}
