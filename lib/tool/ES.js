import Cesium from './cesium/Cesium';
import $ from 'jquery';
export const es = {
    addCircleRipple: addCircleRipple,   //环形扩散
    initFlowEffects: initFlowEffects,    //线段特效
    initFlowEffectsArrow: initFlowEffectsArrow,     //箭头特效
    addFlowLine: addFlowLine,     //流动折线
    addFlowArrow: addFlowArrow,     //流动箭头
    parabolaEquation: parabolaEquation, //抛线方程
    addParabolic: addParabolic,   //流动抛物线
    addFlowWall: addFlowWall,     //流动墙体
    echartsCombineCesium: echartsCombineCesium,   //cesium结合echarts
    addFlowLineEH: addFlowLineEH,    // echarts流入流出线
    addInfoTips: addInfoTips, // 添加信息框
    creatHtmlElement: creatHtmlElement,  // 创建htmlElement元素,球背后会隐藏
    addPointImg: addPointImg,    //添加point-img
    removeInfoTipsAll: removeInfoTipsAll,    //移除信息框和point-img
    addInfoTips2: addInfoTips2,   //添加信息框2
    creatHtmlElement2: creatHtmlElement2,  // 创建htmlElement元素,球背后会隐藏
    textToImg: textToImg    //文字转图片
};

let createRandomId = function () {  //随机生成id,创建echarts时使用
    return (Math.random() * 10000000).toString(16).substr(0, 4) + '-' + (new Date()).getTime() + '-' + Math.random().toString().substr(2, 5);
}

// 1.环形扩散
function addCircleRipple(viewer, data) {
    let r1 = data.minR, r2 = data.minR;

    function changeR1() { //这是callback，参数不能内传
        r1 = r1 + data.deviationR;
        if (r1 >= data.maxR) {
            r1 = data.minR;
        }
        return r1;
    }
    function changeR2() {
        r2 = r2 + data.deviationR;
        if (r2 >= data.maxR) {
            r2 = data.minR;
        }
        return r2;
    }
    viewer.entities.add({
        id: data.id,
        name: '',
        position: Cesium.Cartesian3.fromDegrees(data.lon, data.lat, data.height),
        ellipse: {
            semiMinorAxis: new Cesium.CallbackProperty(changeR1, false),
            semiMajorAxis: new Cesium.CallbackProperty(changeR1, false),
            height: data.height,
            material: new Cesium.ImageMaterialProperty({
                image: data.imageUrl,
                repeat: new Cesium.Cartesian2(1.0, 1.0),
                transparent: true,
                color: new Cesium.CallbackProperty(function () {
                    let alp = 1 - r1 / data.maxR;
                    return Cesium.Color.WHITE.withAlpha(alp)  //entity的颜色透明 并不影响材质，并且 entity也会透明哦
                }, false)
            })
        }
    });
    setTimeout(function () {
        viewer.entities.add({
            name: '',
            position: Cesium.Cartesian3.fromDegrees(data.lon, data.lat, data.height),
            ellipse: {
                semiMinorAxis: new Cesium.CallbackProperty(changeR2, false),
                semiMajorAxis: new Cesium.CallbackProperty(changeR2, false),
                height: data.height,
                material: new Cesium.ImageMaterialProperty({
                    image: data.imageUrl,
                    repeat: new Cesium.Cartesian2(1.0, 1.0),
                    transparent: true,
                    color: new Cesium.CallbackProperty(function () {
                        let alp = 1;
                        alp = 1 - r2 / data.maxR;
                        return Cesium.Color.WHITE.withAlpha(alp)
                    }, false)
                })
            }
        });
    }, data.eachInterval)
}

// 2.流动特效
// 2.1线段
function initFlowEffects(data) {
    function PolylineTrailLinkMaterialProperty(color, duration) {
        this._definitionChanged = new Cesium.Event();
        this._color = undefined;
        this._colorSubscription = undefined;
        this.color = color;
        this.duration = duration;
        this._time = (new Date()).getTime();
    }
    Cesium.defineProperties(PolylineTrailLinkMaterialProperty.prototype, {
        isConstant: {
            get: function () {
                return false;
            }
        },
        definitionChanged: {
            get: function () {
                return this._definitionChanged;
            }
        },
        color: Cesium.createPropertyDescriptor('color')
    });
    PolylineTrailLinkMaterialProperty.prototype.getType = function (time) {
        return 'PolylineTrailLink';
    }
    PolylineTrailLinkMaterialProperty.prototype.getValue = function (time, result) {
        if (!Cesium.defined(result)) {
            result = {};
        }
        result.color = Cesium.Property.getValueOrClonedDefault(this._color, time, Cesium.Color.WHITE, result.color);
        result.image = Cesium.Material.PolylineTrailLinkImage;
        result.time = (((new Date()).getTime() - this._time) % this.duration) / this.duration;
        return result;
    }
    PolylineTrailLinkMaterialProperty.prototype.equals = function (other) {
        return this === other ||
          (other instanceof PolylineTrailLinkMaterialProperty &&
              Property.equals(this._color, other._color))
    };
    Cesium.PolylineTrailLinkMaterialProperty = PolylineTrailLinkMaterialProperty;
    Cesium.Material.PolylineTrailLinkType = 'PolylineTrailLink';
    Cesium.Material.PolylineTrailLinkImage = data.flowImage;//图片
    Cesium.Material.PolylineTrailLinkSource = 'czm_material czm_getMaterial(czm_materialInput materialInput)\n\
                                                 {\n\
                                                      czm_material material = czm_getDefaultMaterial(materialInput);\n\
                                                      vec2 st = materialInput.st;\n\
                                                      vec4 colorImage = texture2D(image, vec2(fract(st.s - time), st.t));\n\
                                                      material.alpha = colorImage.a * color.a;\n\
                                                      material.diffuse = (colorImage.rgb+color.rgb)/2.0;\n\
                                                      return material;\n\
                                                  }';
    // material.alpha:透明度;material.diffuse：颜色;
    Cesium.Material._materialCache.addMaterial(Cesium.Material.PolylineTrailLinkType, {
        fabric: {
            type: Cesium.Material.PolylineTrailLinkType,
            uniforms: {
                color: new Cesium.Color(0.0, 0.0, 0.0, 0.5),
                image: Cesium.Material.PolylineTrailLinkImage,
                time: 0
            },
            source: Cesium.Material.PolylineTrailLinkSource
        },
        translucent: function (material) {
            return true;
        }
    });
}
// 2.2箭头
function initFlowEffectsArrow(data) {
    function PolylineTrailArrowMaterialProperty(color, duration) {
        this._definitionChanged = new Cesium.Event();
        this._color = undefined;
        this._colorSubscription = undefined;
        this.color = color;
        this.duration = duration;
        this._time = (new Date()).getTime();
    }
    Cesium.defineProperties(PolylineTrailArrowMaterialProperty.prototype, {
        isConstant: {
            get: function () {
                return false;
            }
        },
        definitionChanged: {
            get: function () {
                return this._definitionChanged;
            }
        },
        color: Cesium.createPropertyDescriptor('color')
    });
    PolylineTrailArrowMaterialProperty.prototype.getType = function (time) {
        return 'PolylineTrailLink';
    }
    PolylineTrailArrowMaterialProperty.prototype.getValue = function (time, result) {
        if (!Cesium.defined(result)) {
            result = {};
        }
        result.color = Cesium.Property.getValueOrClonedDefault(this._color, time, Cesium.Color.WHITE, result.color);
        result.image = Cesium.Material.PolylineTrailArrowImage;
        result.time = (((new Date()).getTime() - this._time) % this.duration) / this.duration;
        return result;
    }
    PolylineTrailArrowMaterialProperty.prototype.equals = function (other) {
        return this === other ||
          (other instanceof PolylineTrailArrowMaterialProperty &&
              Property.equals(this._color, other._color))
    };
    Cesium.PolylineTrailArrowMaterialProperty = PolylineTrailArrowMaterialProperty;
    Cesium.Material.PolylineTrailArrowType = 'PolylineTrailArrow';
    Cesium.Material.PolylineTrailArrowImage = './Assets/img/flowLine/line4.png';
    Cesium.Material.PolylineTrailArrowSource = 'czm_material czm_getMaterial(czm_materialInput materialInput)\n\
                                                 {\n\
                                                      czm_material material = czm_getDefaultMaterial(materialInput);\n\
                                                      vec2 st = materialInput.st;\n\
                                                      vec4 colorImage = texture2D(image, vec2(fract(st.s - time), st.t));\n\
                                                      material.alpha = colorImage.a * color.a;\n\
                                                      material.diffuse = (colorImage.rgb+color.rgb)/2.0;\n\
                                                      return material;\n\
                                                  }';
    // material.alpha:透明度;material.diffuse：颜色;
    Cesium.Material._materialCache.addMaterial(Cesium.Material.PolylineTrailArrowType, {
        fabric: {
            type: Cesium.Material.PolylineTrailArrowType,
            uniforms: {
                color: new Cesium.Color(0.0, 0.0, 0.0, 0.5),
                image: Cesium.Material.PolylineTrailArrowImage,
                time: 0
            },
            source: Cesium.Material.PolylineTrailArrowSource
        },
        translucent: function (material) {
            return true;
        }
    });
}
// 3.1流动折线
function addFlowLine(viewer, data) {
    if (data.flowing == true) {
        initFlowEffects(data);
        let m1 = data.options.polyline.material[0];
        let m2 = data.options.polyline.material[1];
        data.options.polyline.material = new Cesium.PolylineTrailLinkMaterialProperty(m1, m2);
    }
    viewer.entities.add(data.options);
}
// 3.2流动箭头
function addFlowArrow(viewer, data) {
    if (data.flowing == true) {
        initFlowEffectsArrow(data);
        let m1 = data.options.polyline.material[0];
        let m2 = data.options.polyline.material[1];
        data.options.polyline.material = new Cesium.PolylineTrailArrowMaterialProperty(m1, m2);
    }
    viewer.entities.add(data.options);
}

// 4. //抛物线方程
function parabolaEquation(options, resultOut) {
    //方程 y=-(4h/L^2)*x^2+h h:顶点高度 L：横纵间距较大者
    let h = options.height && options.height > 5000 ? options.height : 5000;
    let L = Math.abs(options.pt1.lon - options.pt2.lon) > Math.abs(options.pt1.lat - options.pt2.lat) ? Math.abs(options.pt1.lon - options.pt2.lon) : Math.abs(options.pt1.lat - options.pt2.lat);
    let num = options.num && options.num > 50 ? options.num : 50;
    let result = [];
    let dlt = L / num;
    if (Math.abs(options.pt1.lon - options.pt2.lon) > Math.abs(options.pt1.lat - options.pt2.lat)) {//以lon为基准
        let delLat = (options.pt2.lat - options.pt1.lat) / num;
        if (options.pt1.lon - options.pt2.lon > 0) {
            dlt = -dlt;
        }
        for (let i = 0; i < num; i++) {
            let tempH = h - Math.pow((-0.5 * L + Math.abs(dlt) * i), 2) * 4 * h / Math.pow(L, 2);
            let lon = options.pt1.lon + dlt * i;
            let lat = options.pt1.lat + delLat * i;
            result.push([lon, lat, tempH]);
        }
    } else {//以lat为基准
        let delLon = (options.pt2.lon - options.pt1.lon) / num;
        if (options.pt1.lat - options.pt2.lat > 0) {
            dlt = -dlt;
        }
        for (let i = 0; i < num; i++) {
            let tempH = h - Math.pow((-0.5 * L + Math.abs(dlt) * i), 2) * 4 * h / Math.pow(L, 2);
            let lon = options.pt1.lon + delLon * i;
            let lat = options.pt1.lat + dlt * i;
            result.push([lon, lat, tempH]);
        }
    }
    if (resultOut != undefined) {
        resultOut = result;
    }
    return result;
}

// 5.流动抛物线
function addParabolic(viewer, data) {
    let material = null;
    let center = data.center;//起始点
    let cities = data.points;//可以为多组哦！
    if (data.flowing == true) {
        if (material != null) { } else {
            initFlowParabolicEffects(data);
            let str1 = data.options.polyline.material[0];
            let str2 = data.options.polyline.material[1];
            data.options.polyline.material = new Cesium.PolylineTrailParabolicMaterialProperty(str1, str2);
        }
    }
    for (let j = 0; j < cities.length; j++) {
        let points = parabolaEquation({ pt1: center, pt2: cities[j], height: data.height, num: 100 });
        let pointArr = [];
        for (let i = 0; i < points.length; i++) {
            pointArr.push(points[i][0], points[i][1], points[i][2]);
        }
        data.options.polyline.positions = Cesium.Cartesian3.fromDegreesArrayHeights(pointArr);
        viewer.entities.add(data.options);
    }

    function initFlowParabolicEffects(data) {
        function PolylineTrailParabolicMaterialProperty(color, duration) {
            this._definitionChanged = new Cesium.Event();
            this._color = undefined;
            this._colorSubscription = undefined;
            this.color = color;
            this.duration = duration;
            this._time = (new Date()).getTime();
        }
        Cesium.defineProperties(PolylineTrailParabolicMaterialProperty.prototype, {
            isConstant: {
                get: function () {
                    return false;
                }
            },
            definitionChanged: {
                get: function () {
                    return this._definitionChanged;
                }
            },
            color: Cesium.createPropertyDescriptor('color')
        });
        PolylineTrailParabolicMaterialProperty.prototype.getType = function (time) {
            return 'PolylineTrailLink';
        }
        PolylineTrailParabolicMaterialProperty.prototype.getValue = function (time, result) {
            if (!Cesium.defined(result)) {
                result = {};
            }
            result.color = Cesium.Property.getValueOrClonedDefault(this._color, time, Cesium.Color.WHITE, result.color);
            result.image = Cesium.Material.PolylineTrailParabolicImage;
            result.time = (((new Date()).getTime() - this._time) % this.duration) / this.duration;
            return result;
        }
        PolylineTrailParabolicMaterialProperty.prototype.equals = function (other) {
            return this === other ||
              (other instanceof PolylineTrailParabolicMaterialProperty &&
                  Property.equals(this._color, other._color))
        };
        Cesium.PolylineTrailParabolicMaterialProperty = PolylineTrailParabolicMaterialProperty;
        Cesium.Material.PolylineTrailParabolicType = 'PolylineTrailLink';
        if (data.flowImage) {
            Cesium.Material.PolylineTrailParabolicImage = data.flowImage;//图片
        } else {
            Cesium.Material.PolylineTrailParabolicImage = './Assets/img/flowLine/line2.png';//图片
        }
        Cesium.Material.PolylineTrailParabolicSource = 'czm_material czm_getMaterial(czm_materialInput materialInput)\n\
                                                     {\n\
                                                          czm_material material = czm_getDefaultMaterial(materialInput);\n\
                                                          vec2 st = materialInput.st;\n\
                                                          vec4 colorImage = texture2D(image, vec2(fract(st.s - time), st.t));\n\
                                                          material.alpha = colorImage.a * color.a;\n\
                                                          material.diffuse = (colorImage.rgb+color.rgb)/2.0;\n\
                                                          return material;\n\
                                                      }';
        // material.alpha:透明度;material.diffuse：颜色;
        Cesium.Material._materialCache.addMaterial(Cesium.Material.PolylineTrailParabolicType, {
            fabric: {
                type: Cesium.Material.PolylineTrailParabolicType,
                uniforms: {
                    color: new Cesium.Color(0.0, 0.0, 0.0, 0.5),
                    image: Cesium.Material.PolylineTrailParabolicImage,
                    time: 0
                },
                source: Cesium.Material.PolylineTrailParabolicSource
            },
            translucent: function (material) {
                return true;
            }
        });
    }
}

// 6.流动墙体
function addFlowWall(viewer, data) {
    if (data.flowing == true) {
        initFlowEffects(data);
        let m1 = data.options.wall.material[0];
        let m2 = data.options.wall.material[1];
        data.options.wall.material = new Cesium.PolylineTrailLinkMaterialProperty(m1, m2);
    }
    viewer.entities.add(data.options);
}

let echartsCombineCesium_id = '';   //echarts id
// 7.cesium结合echarts
function echartsCombineCesium(viewer, option) {
    //坐标转换及事件监听
    (function (e) {
        let t = {};
        function n(r) {
            if (t[r]) return t[r].exports;
            let i = t[r] = {
                i: r,
                l: !1,
                exports: {}
            };
            return e[r].call(i.exports, i, i.exports, n),
            i.l = !0,
            i.exports
        }
        n.m = e,
        n.c = t,
        n.d = function (e, t, r) {
            n.o(e, t) || Object.defineProperty(e, t, {
                enumerable: !0,
                get: r
            })
        },
        n.r = function (e) {
            'undefined' != typeof Symbol && Symbol.toStringTag && Object.defineProperty(e, Symbol.toStringTag, {
                value: 'Module'
            }),
            Object.defineProperty(e, '__esModule', {
                value: !0
            })
        },
        n.t = function (e, t) {
            if (1 & t && (e = n(e)), 8 & t) return e;
            if (4 & t && 'object' == typeof e && e && e.__esModule) return e;
            let r = Object.create(null);
            if (n.r(r), Object.defineProperty(r, 'default', {
                enumerable: !0,
                value: e
            }), 2 & t && 'string' != typeof e) for (let i in e) n.d(r, i,
                function (t) {
                    return e[t]
                }.bind(null, i));
            return r
        },
        n.n = function (e) {
            let t = e && e.__esModule ?
                function () {
                    return e.
                        default
                } :
                function () {
                    return e
                };
            return n.d(t, 'a', t),
            t
        },
        n.o = function (e, t) {
            return Object.prototype.hasOwnProperty.call(e, t)
        },
        n.p = '',
        n(n.s = 0)
    })([function (e, t, n) { e.exports = n(1) }, function (e, t, n) {
        echarts ? n(2).load() : console.error('missing echarts lib')
    }, function (e, t, n) {
        'use strict';
        function r(e, t) {
            for (let n = 0; n < t.length; n++) {
                let r = t[n];
                r.enumerable = r.enumerable || !1,
                r.configurable = !0,
                'value' in r && (r.writable = !0),
                Object.defineProperty(e, r.key, r)
            }
        }
        n.r(t);
        let i = function () {
            function e(t, n) {
                !
                function (e, t) {
                    if (!(e instanceof t)) throw new TypeError('Cannot call a class as a function')
                }(this, e),
                this._viewer = t,
                this.dimensions = ['lng', 'lat'],
                this._mapOffset = [0, 0],
                this._api = n
            }
            let t, n, i;
            return t = e,
            i = [{
                key: 'create',
                value: function (t, n) {
                    let r;
                    t.eachComponent('GLMap',
                        function (t) {
                            (r = new e(echarts.cesiumViewer, n)).setMapOffset(t.__mapOffset || [0, 0]),
                            t.coordinateSystem = r
                        }),
                    t.eachSeries(function (e) {
                        'GLMap' === e.get('coordinateSystem') && (e.coordinateSystem = r)
                    })
                }
            },
            {
                key: 'dimensions',
                get: function () {
                    return ['lng', 'lat']
                }
            }],
            (n = [{
                key: 'setMapOffset',
                value: function (e) {
                    return this._mapOffset = e,
                    this
                }
            },
            {
                key: 'getViewer',
                value: function () {
                    return this._viewer
                }
            },
            {
                key: 'dataToPoint',
                value: function (e) {
                    let t = this._viewer.scene,
                        n = [0, 0],
                        r = Cesium.Cartesian3.fromDegrees(e[0], e[1]);
                    if (!r) return n;
                    if (t.mode === Cesium.SceneMode.SCENE3D && Cesium.Cartesian3.angleBetween(t.camera.position, r) > Cesium.Math.toRadians(80)) return !1;
                    let i = t.cartesianToCanvasCoordinates(r);
                    return i ? [i.x - this._mapOffset[0], i.y - this._mapOffset[1]] : n
                }
            },
            {
                key: 'pointToData',
                value: function (e) {
                    let t = this._mapOffset,
                        n = viewer.scene.globe.ellipsoid,
                        r = new Cesium.cartesian3(e[1] + t, e[2] + t[2], 0),
                        i = n.cartesianToCartographic(r);
                    return [i.lng, i.lat]
                }
            },
            {
                key: 'getViewRect',
                value: function () {
                    let e = this._api;
                    return new echarts.graphic.BoundingRect(0, 0, e.getWidth(), e.getHeight())
                }
            },
            {
                key: 'getRoamTransform',
                value: function () {
                    return echarts.matrix.create()
                }
            }]) && r(t.prototype, n),
            i && r(t, i),
            e
        }();
        echarts.extendComponentModel({
            type: 'GLMap',
            getViewer: function () {
                return echarts.cesiumViewer
            },
            defaultOption: {
                roam: !1
            }
        });
        echarts.extendComponentView({
            type: 'GLMap',
            init: function (e, t) {
                this.api = t,
                echarts.cesiumViewer.scene.postRender.addEventListener(this.moveHandler, this)
            },
            moveHandler: function (e, t) {
                this.api.dispatchAction({
                    type: 'GLMapRoam'
                })
            },
            render: function (e, t, n) { },
            dispose: function (e) {
                echarts.cesiumViewer.scene.postRender.removeEventListener(this.moveHandler, this)
            }
        });
        function a() {
            echarts.registerCoordinateSystem('GLMap', i),
            echarts.registerAction({
                type: 'GLMapRoam',
                event: 'GLMapRoam',
                update: 'updateLayout'
            },
            function (e, t) { })
        }
        n.d(t, 'load',
            function () {
                return a
            })
    }]);

    //开始
    echarts.cesiumViewer = viewer;

    function CE(t, e) {
        this._mapContainer = t;
        this._overlay = this._createChartOverlay();
        this._overlay.setOption(e);
    }

    CE.prototype._createChartOverlay = function () {
        let t = this._mapContainer.scene;
        t.canvas.setAttribute('tabIndex', 0);
        let e = document.createElement('div');
        e.style.position = 'absolute';
        e.style.top = '0px';
        e.style.left = '0px';
        e.style.width = t.canvas.width + 'px';
        e.style.height = t.canvas.height + 'px';
        e.style.pointerEvents = 'none';
        echartsCombineCesium_id = 'id-' + createRandomId();
        e.setAttribute('id', echartsCombineCesium_id);
        e.setAttribute('class', 'echartsMap');
        this._mapContainer.container.appendChild(e);

        this._echartsContainer = e;
        return echarts.init(e)
    };
    CE.prototype.dispose = function () {
        this._echartsContainer && (this._mapContainer.container.removeChild(this._echartsContainer), (this._echartsContainer = null)), this._overlay && (this._overlay.dispose(), (this._overlay = null))
    };
    CE.prototype.updateOverlay = function (t) {
        this._overlay && this._overlay.setOption(t)
    };
    CE.prototype.getMap = function () {
        return this._mapContainer
    };
    CE.prototype.getOverlay = function () {
        return this._overlay
    };
    CE.prototype.show = function () {
        document.getElementById(this._id).style.visibility = 'visible'
    };
    CE.prototype.hide = function () {
        console.log(this);
        document.getElementById(this._echartsContainer.id).style.visibility = 'hidden'
    };
    new CE(viewer, option);

    this.remove = function () {
        let _i = document.getElementById(echartsCombineCesium_id);
        _i.remove(_i.selectIndex);
    }
}

// 8.echarts流入流出线
function addFlowLineEH(p, t) {

    let convertData = function (d) {

        let changeData = function (_d) {
            let res = [];
            for (let i = 0; i < _d.length; i++) {
                let dataItem = _d[i];
                let fromCoord = geoCoordMap[dataItem[0].name];
                let toCoord = geoCoordMap[dataItem[1].name];
                if (fromCoord && toCoord) {
                    res.push({
                        fromName: dataItem[0].name,
                        toName: dataItem[1].name,
                        coords: [fromCoord, toCoord],
                        value: dataItem[1].value
                    });
                }
            }
            return res;
        }
        if (t === 'in') { //流入
            let data = d[0];
            return changeData(data);
        } else if (t === 'out') {    //流出
            let data = d[1];
            return changeData(data);
        }
    };

    let setLable = function (arr) {
        let data = '';
        if (t === 'in') { //流入
            data = arr[0].map(function (e) {
                return {
                    name: e[0].name,
                    value: geoCoordMap[e[0].name].concat([e[1].value])
                };
            });
            return data;
        } else if (t === 'out') {    //流出
            data = arr[1].map(function (e) {
                return {
                    name: e[1].name,
                    value: geoCoordMap[e[1].name].concat([e[1].value])
                };
            })
            return data;
        }
    };

    let series = [];
    p.forEach(function (item, i) {
        series.push(
            {   //第一层航线 点
                type: 'lines',
                coordinateSystem: 'GLMap',
                zlevel: 1,
                effect: {
                    show: true,
                    period: 6,
                    trailLength: 0.7,
                    color: 'red',
                    symbolSize: 5
                },
                lineStyle: {
                    normal: {
                        color: '#a6c84c',
                        width: 0,
                        curveness: 0.2
                    }
                },
                data: convertData(item)
            },
            {   //第二层航线 箭头+线
                type: 'lines',
                coordinateSystem: 'GLMap',
                zlevel: 2,
                symbol: ['none', 'arrow'],
                symbolSize: 10,
                effect: {
                    show: true,
                    period: 6,
                    trailLength: 0,
                    symbol: 'arrow',
                    // color: 'blue',
                    symbolSize: 6
                },
                lineStyle: {
                    normal: {
                        color: '#00FFFF',
                        width: 1,
                        opacity: 0.6,
                        curveness: 0.2
                    }
                },
                data: convertData(item)
            },
            {   //点文字
                type: 'effectScatter',
                coordinateSystem: 'GLMap',
                zlevel: 2,
                rippleEffect: {
                    brushType: 'stroke'
                },
                label: {
                    normal: {
                        show: true,
                        position: 'right',
                        formatter: '{b}'
                    }
                },
                symbolSize: function (val) {
                    return val[2] / 10;
                },
                itemStyle: {
                    normal: {
                        color: '#a6c84c'
                    },
                    emphasis: {
                        areaColor: '#00FF00'
                    }
                },
                data: setLable(item)
            });
    });

    let option = {
        animation: !1,
        GLMap: {},
        series: series
    };

    return option;
}

// 9.添加信息框
let eleArr = [];
function addInfoTips(viewer, data, callback) {
    let lon = data.lon, lat = data.lat, height = data.height;
    let ele_id = {};    //记录添加的div的element和entity的id
    let id = createRandomId() + '-div'
    let tooltips_div = window.document.createElement('div');
    tooltips_div.id = id;
    tooltips_div.className = 'infotips-layer-main';
    tooltips_div.innerHTML =
      '<div class=\'infotips-layer-main-line\'>' +
      '</div>' +
      '<div class=\'infotips-layer-main-content\'>' +
      '</div>';
    window.document.body.appendChild(tooltips_div);
    let element = $('#' + id + '');
    ele_id.ele = element;   //记录element
    // 回调函数，返回div
    callback(element);
    // 是否添加实体
    if (data.isEntity) {
        let point = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(lon, lat, height),
            point: {
                pixelSize: 6,
                color: Cesium.Color.RED.withAlpha(0.8)//设置透明
            }
        });
        ele_id.id = point.id;   //记录id
    }
    eleArr.push(ele_id);
    addLayer();//添加div弹窗
    function addLayer() {
        //添加div
        let divPosition = Cesium.Cartesian3.fromDegrees(lon, lat, height);

        element.css({ opacity: 1 });
        element.find('.infotips-layer-main-line').animate({
            width: 50
        }, 300, function () {
            element.find('.infotips-layer-main-content').fadeIn(500)
        });
        es.creatHtmlElement(viewer, element, divPosition, [10, -(parseInt(element.css('height')))], true); //当为true的时候，表示当element在地球背面会自动隐藏。默认为false，置为false，不会隐藏。但至少减轻判断计算压力
    }
}

// 10. 创建htmlElement元素,球背后会隐藏
function creatHtmlElement(viewer, element, position, arr, flog) {
    let scratch = new Cesium.Cartesian2();
    let scene = viewer.scene, camera = viewer.camera;
    scene.preRender.addEventListener(function () {
        let canvasPosition = scene.cartesianToCanvasCoordinates(position, scratch);
        if (Cesium.defined(canvasPosition)) {

            element.css({
                left: canvasPosition.x + arr[0] - 6,
                top: canvasPosition.y + arr[1]
            });

            if (flog && flog == true) {
                let e = position, i = camera.position, n = scene.globe.ellipsoid.cartesianToCartographic(i).height;
                if (!(n += 1 * scene.globe.ellipsoid.maximumRadius, Cesium.Cartesian3.distance(i, e) > n)) {
                    element.show();
                } else {
                    element.hide();
                }
            }
        }
    });
}

// 11. 添加point-img
function addPointImg(viewer, data) {
    let lon = data.lon, lat = data.lat, height = data.height;
    let img = {};
    let pointImg = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, height),
        billboard: {
            image: './Assets/img/mark/mark1.png'
        }
    });
    img.img = pointImg.id;
    eleArr.push(img);
}

// 12. 移除信息框和point-img
function removeInfoTipsAll(viewer) {
    if (eleArr.length > 0) {
        for (let i = 0; i < eleArr.length; i++) {
            if (eleArr[i].id !== undefined) {
                viewer.entities.removeById(eleArr[i].id);
            }
            if (eleArr[i].ele !== undefined) {
                eleArr[i].ele.remove();
            }
            if (eleArr[i].img !== undefined) {
                viewer.entities.removeById(eleArr[i].img);
            }
        }
        eleArr = [];
    }
}

// 13. 添加信息框2
function addInfoTips2(viewer, data, callback) {
    let lon = data.lon, lat = data.lat, height = data.height;
    if ($('#id-infotips2')[0] !== undefined) {
        $('#id-infotips2').remove();
    }
    let tooltips_div = window.document.createElement('div');
    tooltips_div.id = 'id-infotips2';
    tooltips_div.className = 'infotips-layer-main2';
    tooltips_div.innerHTML =

      '<div class=\'infotips-layer-main-content2\'></div>' +
      '<div class=\'infotips-layer-main-bottom2\'>' +
      '经度:' + lon.toFixed(2) + '&nbsp&nbsp&nbsp&nbsp' +
      '纬度:' + lat.toFixed(2) + '&nbsp&nbsp&nbsp&nbsp' +
      '高度:' + height.toFixed(2) + '&nbsp&nbsp&nbsp&nbsp' +
      '</div>';
    window.document.body.appendChild(tooltips_div);

    let element = $('#id-infotips2');
    // 回调函数，返回div
    callback(element);

    addLayer();//添加div弹窗
    function addLayer() {
        //添加div
        let divPosition = Cesium.Cartesian3.fromDegrees(lon, lat, height);

        element.css({ opacity: 1 });
        element.find('.infotips-layer-main-line2').animate({
            width: 50
        }, 300, function () {
            element.find('.infotips-layer-main-content2').fadeIn(500)
        });
        es.creatHtmlElement2(viewer, element, divPosition, [10, -(parseInt(element.css('height')))], true); //当为true的时候，表示当element在地球背面会自动隐藏。默认为false，置为false，不会隐藏。但至少减轻判断计算压力
    }
}

// 14. 创建htmlElement2元素,球背后会隐藏
function creatHtmlElement2(viewer, element, position, arr, flog) {
    let scratch = new Cesium.Cartesian2();
    let scene = viewer.scene, camera = viewer.camera;
    scene.preRender.addEventListener(function () {
        let canvasPosition = scene.cartesianToCanvasCoordinates(position, scratch);
        if (Cesium.defined(canvasPosition)) {

            element.css({
                left: canvasPosition.x + arr[0] - 150,
                top: canvasPosition.y + arr[1] - 30
            });

            if (flog && flog == true) {
                let e = position, i = camera.position, n = scene.globe.ellipsoid.cartesianToCartographic(i).height;
                if (!(n += 1 * scene.globe.ellipsoid.maximumRadius, Cesium.Cartesian3.distance(i, e) > n)) {
                    element.show();
                } else {
                    element.hide();
                }
            }
        }
    });
}

// 15.文字转图片
function textToImg(text, fontsize, fontcolor) {
    let canvas = document.createElement('canvas');
    //小于32字加1  小于60字加2  小于80字加4    小于100字加6
    $buHeight = 0;
    if (fontsize <= 32) { $buHeight = 1; }
    else if (fontsize > 32 && fontsize <= 60) { $buHeight = 2; }
    else if (fontsize > 60 && fontsize <= 80) { $buHeight = 4; }
    else if (fontsize > 80 && fontsize <= 100) { $buHeight = 6; }
    else if (fontsize > 100) { $buHeight = 10; }
    //对于g j 等有时会有遮挡，这里增加一些高度
    canvas.height = fontsize + $buHeight;
    let context = canvas.getContext('2d');
    // 擦除(0,0)位置大小为200x200的矩形，擦除的意思是把该区域变为透明
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = fontcolor;
    context.font = fontsize + 'px Arial';
    //top（顶部对齐） hanging（悬挂） middle（中间对齐） bottom（底部对齐） alphabetic是默认值
    context.textBaseline = 'middle';
    context.fillText(text, 0, fontsize / 2)

    //如果在这里直接设置宽度和高度会造成内容丢失 , 暂时未找到原因 , 可以用以下方案临时解决
    //canvas.width = context.measureText(text).width;


    //方案一：可以先复制内容  然后设置宽度 最后再黏贴
    //方案二：创建新的canvas,把旧的canvas内容黏贴过去
    //方案三： 上边设置完宽度后，再设置一遍文字

    //方案一： 这个经过测试有问题，字体变大后，显示不全,原因是canvas默认的宽度不够，
    //如果一开始就给canvas一个很大的宽度的话，这个是可以的。
    //let imgData = context.getImageData(0,0,canvas.width,canvas.height);  //这里先复制原来的canvas里的内容
    //canvas.width = context.measureText(text).width;  //然后设置宽和高
    //context.putImageData(imgData,0,0); //最后黏贴复制的内容

    //方案三：改变大小后，重新设置一次文字
    canvas.width = context.measureText(text).width;
    context.fillStyle = fontcolor;
    context.font = fontsize + 'px Arial';
    context.textBaseline = 'middle';
    context.fillText(text, 0, fontsize / 2)

    let dataUrl = canvas.toDataURL('image/png');//注意这里背景透明的话，需要使用png
    return dataUrl;
}

