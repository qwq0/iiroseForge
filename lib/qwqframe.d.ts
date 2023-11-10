/**
 * 钩子绑定到值类
 */
declare class HookBindValue {
    /**
     * @param {import("./HookBindInfo").HookBindInfo} info
     * @param {object} targetObj
     * @param {string | symbol} targetKey
     */
    constructor(info: HookBindInfo, targetObj: object, targetKey: string | symbol);
    /**
     * 钩子信息
     * @type {import("./HookBindInfo").HookBindInfo}
     */
    info: HookBindInfo;
    /**
     * 目标对象
     * @type {WeakRef<object>}
     */
    targetRef: WeakRef<any>;
    /**
     * 目标对象的键
     * @type {string | symbol}
     */
    targetKey: string | symbol;
    /**
     * 触发此钩子
     * 销毁后仍可通过此方法手动触发
     */
    emit(): void;
    /**
     * 销毁此钩子
     * 销毁后钩子将不再自动触发
     */
    destroy(): void;
}

/**
 * 钩子绑定到回调类
 */
declare class HookBindCallback {
    /**
     * @param {import("./HookBindInfo").HookBindInfo} info
     * @param {function(any): void} callback
     */
    constructor(info: HookBindInfo, callback: (arg0: any) => void);
    /**
     * 钩子信息
     * @type {import("./HookBindInfo").HookBindInfo}
     */
    info: HookBindInfo;
    /**
     * 回调函数的弱引用
     * @type {WeakRef<function(any): void>}
     */
    cbRef: WeakRef<(arg0: any) => void>;
    /**
     * 回调函数
     * 当此钩子绑定自动释放时为null
     * @type {function(any): void}
     */
    callback: (arg0: any) => void;
    /**
     * 触发此钩子
     */
    emit(): void;
    /**
     * 销毁此钩子
     * 销毁后钩子将不再自动触发
     */
    destroy(): void;
    /**
     * 绑定销毁
     * 当目标对象释放时销毁
     * @param {object} targetObj
     * @returns {HookBindCallback} 返回自身
     */
    bindDestroy(targetObj: object): HookBindCallback;
}

/**
 * 钩子绑定信息
 */
declare class HookBindInfo {
    /**
     * @param {object} proxyObj
     * @param {object} srcObj
     * @param {Array<string | symbol>} keys
     * @param {Map<string | symbol, Set<HookBindValue | HookBindCallback>>} hookMap
     * @param {function(...any): any} ctFunc
     */
    constructor(proxyObj: object, srcObj: object, keys: Array<string | symbol>, hookMap: Map<string | symbol, Set<HookBindValue | HookBindCallback>>, ctFunc: (...args: any[]) => any);
    /**
     * 代理对象
     * @type {object}
     */
    proxyObj: object;
    /**
     * 源对象
     * @type {object}
     */
    srcObj: object;
    /**
     * 需要监听代理对象上的值
     * @type {Array<string | symbol>}
     */
    keys: Array<string | symbol>;
    /**
     * 修改指定值时需要触发的钩子
     * @type {Map<string | symbol, Set<HookBindValue | HookBindCallback>>}
     */
    hookMap: Map<string | symbol, Set<HookBindValue | HookBindCallback>>;
    /**
     * 值处理函数
     * 若存在此函数则需要调用
     * @type {function(...any): any}
     */
    ctFunc: (...args: any[]) => any;
    /**
     * 获取此钩子绑定的值
     */
    getValue(): any;
    /**
     * 添加钩子
     * @package
     * @param {HookBindValue | HookBindCallback} hookObj
     */
    addHook(hookObj: HookBindValue | HookBindCallback): void;
    /**
     * 移除钩子
     * @package
     * @param {HookBindValue | HookBindCallback} hookObj
     */
    removeHook(hookObj: HookBindValue | HookBindCallback): void;
    /**
     * 绑定到值
     * @template {Object} T
     * @param {T} targetObj
     * @param {(keyof T) | (string & {}) | symbol} targetKey
     * @returns {HookBindValue}
     */
    bindToValue<T extends unknown>(targetObj: T, targetKey: symbol | (string & {}) | keyof T): HookBindValue;
    /**
     * 绑定到回调函数
     * @param {function(any): void} callback
     * @returns {HookBindCallback}
     */
    bindToCallback(callback: (arg0: any) => void): HookBindCallback;
}

/**
 * 创建NStyle 省略new
 * @param {keyOfStyle} key
 * @param {string | HookBindInfo} value
 */
declare function createNStyle(key: keyOfStyle, value: string | HookBindInfo): NStyle<keyOfStyle>;
/**
 * 创建一组NStyle的flat NList
 * @param {{ [x in keyOfStyle]?: string | HookBindInfo }} obj
 */
declare function createNStyleList(obj: {
    [x: string & {}]: string | HookBindInfo | undefined;
    length?: string | HookBindInfo;
    filter?: string | HookBindInfo;
    fill?: string | HookBindInfo;
    animationName?: string | HookBindInfo;
    all?: string | HookBindInfo;
    offset?: string | HookBindInfo;
    height?: string | HookBindInfo;
    width?: string | HookBindInfo;
    left?: string | HookBindInfo;
    top?: string | HookBindInfo;
    item?: string | HookBindInfo;
    accentColor?: string | HookBindInfo;
    alignContent?: string | HookBindInfo;
    alignItems?: string | HookBindInfo;
    alignSelf?: string | HookBindInfo;
    alignmentBaseline?: string | HookBindInfo;
    animation?: string | HookBindInfo;
    animationDelay?: string | HookBindInfo;
    animationDirection?: string | HookBindInfo;
    animationDuration?: string | HookBindInfo;
    animationFillMode?: string | HookBindInfo;
    animationIterationCount?: string | HookBindInfo;
    animationPlayState?: string | HookBindInfo;
    animationTimingFunction?: string | HookBindInfo;
    appearance?: string | HookBindInfo;
    aspectRatio?: string | HookBindInfo;
    backdropFilter?: string | HookBindInfo;
    backfaceVisibility?: string | HookBindInfo;
    background?: string | HookBindInfo;
    backgroundAttachment?: string | HookBindInfo;
    backgroundBlendMode?: string | HookBindInfo;
    backgroundClip?: string | HookBindInfo;
    backgroundColor?: string | HookBindInfo;
    backgroundImage?: string | HookBindInfo;
    backgroundOrigin?: string | HookBindInfo;
    backgroundPosition?: string | HookBindInfo;
    backgroundPositionX?: string | HookBindInfo;
    backgroundPositionY?: string | HookBindInfo;
    backgroundRepeat?: string | HookBindInfo;
    backgroundSize?: string | HookBindInfo;
    baselineShift?: string | HookBindInfo;
    blockSize?: string | HookBindInfo;
    border?: string | HookBindInfo;
    borderBlock?: string | HookBindInfo;
    borderBlockColor?: string | HookBindInfo;
    borderBlockEnd?: string | HookBindInfo;
    borderBlockEndColor?: string | HookBindInfo;
    borderBlockEndStyle?: string | HookBindInfo;
    borderBlockEndWidth?: string | HookBindInfo;
    borderBlockStart?: string | HookBindInfo;
    borderBlockStartColor?: string | HookBindInfo;
    borderBlockStartStyle?: string | HookBindInfo;
    borderBlockStartWidth?: string | HookBindInfo;
    borderBlockStyle?: string | HookBindInfo;
    borderBlockWidth?: string | HookBindInfo;
    borderBottom?: string | HookBindInfo;
    borderBottomColor?: string | HookBindInfo;
    borderBottomLeftRadius?: string | HookBindInfo;
    borderBottomRightRadius?: string | HookBindInfo;
    borderBottomStyle?: string | HookBindInfo;
    borderBottomWidth?: string | HookBindInfo;
    borderCollapse?: string | HookBindInfo;
    borderColor?: string | HookBindInfo;
    borderEndEndRadius?: string | HookBindInfo;
    borderEndStartRadius?: string | HookBindInfo;
    borderImage?: string | HookBindInfo;
    borderImageOutset?: string | HookBindInfo;
    borderImageRepeat?: string | HookBindInfo;
    borderImageSlice?: string | HookBindInfo;
    borderImageSource?: string | HookBindInfo;
    borderImageWidth?: string | HookBindInfo;
    borderInline?: string | HookBindInfo;
    borderInlineColor?: string | HookBindInfo;
    borderInlineEnd?: string | HookBindInfo;
    borderInlineEndColor?: string | HookBindInfo;
    borderInlineEndStyle?: string | HookBindInfo;
    borderInlineEndWidth?: string | HookBindInfo;
    borderInlineStart?: string | HookBindInfo;
    borderInlineStartColor?: string | HookBindInfo;
    borderInlineStartStyle?: string | HookBindInfo;
    borderInlineStartWidth?: string | HookBindInfo;
    borderInlineStyle?: string | HookBindInfo;
    borderInlineWidth?: string | HookBindInfo;
    borderLeft?: string | HookBindInfo;
    borderLeftColor?: string | HookBindInfo;
    borderLeftStyle?: string | HookBindInfo;
    borderLeftWidth?: string | HookBindInfo;
    borderRadius?: string | HookBindInfo;
    borderRight?: string | HookBindInfo;
    borderRightColor?: string | HookBindInfo;
    borderRightStyle?: string | HookBindInfo;
    borderRightWidth?: string | HookBindInfo;
    borderSpacing?: string | HookBindInfo;
    borderStartEndRadius?: string | HookBindInfo;
    borderStartStartRadius?: string | HookBindInfo;
    borderStyle?: string | HookBindInfo;
    borderTop?: string | HookBindInfo;
    borderTopColor?: string | HookBindInfo;
    borderTopLeftRadius?: string | HookBindInfo;
    borderTopRightRadius?: string | HookBindInfo;
    borderTopStyle?: string | HookBindInfo;
    borderTopWidth?: string | HookBindInfo;
    borderWidth?: string | HookBindInfo;
    bottom?: string | HookBindInfo;
    boxShadow?: string | HookBindInfo;
    boxSizing?: string | HookBindInfo;
    breakAfter?: string | HookBindInfo;
    breakBefore?: string | HookBindInfo;
    breakInside?: string | HookBindInfo;
    captionSide?: string | HookBindInfo;
    caretColor?: string | HookBindInfo;
    clear?: string | HookBindInfo;
    clip?: string | HookBindInfo;
    clipPath?: string | HookBindInfo;
    clipRule?: string | HookBindInfo;
    color?: string | HookBindInfo;
    colorInterpolation?: string | HookBindInfo;
    colorInterpolationFilters?: string | HookBindInfo;
    colorScheme?: string | HookBindInfo;
    columnCount?: string | HookBindInfo;
    columnFill?: string | HookBindInfo;
    columnGap?: string | HookBindInfo;
    columnRule?: string | HookBindInfo;
    columnRuleColor?: string | HookBindInfo;
    columnRuleStyle?: string | HookBindInfo;
    columnRuleWidth?: string | HookBindInfo;
    columnSpan?: string | HookBindInfo;
    columnWidth?: string | HookBindInfo;
    columns?: string | HookBindInfo;
    contain?: string | HookBindInfo;
    container?: string | HookBindInfo;
    containerName?: string | HookBindInfo;
    containerType?: string | HookBindInfo;
    content?: string | HookBindInfo;
    counterIncrement?: string | HookBindInfo;
    counterReset?: string | HookBindInfo;
    counterSet?: string | HookBindInfo;
    cssFloat?: string | HookBindInfo;
    cssText?: string | HookBindInfo;
    cursor?: string | HookBindInfo;
    direction?: string | HookBindInfo;
    display?: string | HookBindInfo;
    dominantBaseline?: string | HookBindInfo;
    emptyCells?: string | HookBindInfo;
    fillOpacity?: string | HookBindInfo;
    fillRule?: string | HookBindInfo;
    flex?: string | HookBindInfo;
    flexBasis?: string | HookBindInfo;
    flexDirection?: string | HookBindInfo;
    flexFlow?: string | HookBindInfo;
    flexGrow?: string | HookBindInfo;
    flexShrink?: string | HookBindInfo;
    flexWrap?: string | HookBindInfo;
    float?: string | HookBindInfo;
    floodColor?: string | HookBindInfo;
    floodOpacity?: string | HookBindInfo;
    font?: string | HookBindInfo;
    fontFamily?: string | HookBindInfo;
    fontFeatureSettings?: string | HookBindInfo;
    fontKerning?: string | HookBindInfo;
    fontOpticalSizing?: string | HookBindInfo;
    fontPalette?: string | HookBindInfo;
    fontSize?: string | HookBindInfo;
    fontSizeAdjust?: string | HookBindInfo;
    fontStretch?: string | HookBindInfo;
    fontStyle?: string | HookBindInfo;
    fontSynthesis?: string | HookBindInfo;
    fontVariant?: string | HookBindInfo;
    fontVariantAlternates?: string | HookBindInfo;
    fontVariantCaps?: string | HookBindInfo;
    fontVariantEastAsian?: string | HookBindInfo;
    fontVariantLigatures?: string | HookBindInfo;
    fontVariantNumeric?: string | HookBindInfo;
    fontVariantPosition?: string | HookBindInfo;
    fontVariationSettings?: string | HookBindInfo;
    fontWeight?: string | HookBindInfo;
    gap?: string | HookBindInfo;
    grid?: string | HookBindInfo;
    gridArea?: string | HookBindInfo;
    gridAutoColumns?: string | HookBindInfo;
    gridAutoFlow?: string | HookBindInfo;
    gridAutoRows?: string | HookBindInfo;
    gridColumn?: string | HookBindInfo;
    gridColumnEnd?: string | HookBindInfo;
    gridColumnGap?: string | HookBindInfo;
    gridColumnStart?: string | HookBindInfo;
    gridGap?: string | HookBindInfo;
    gridRow?: string | HookBindInfo;
    gridRowEnd?: string | HookBindInfo;
    gridRowGap?: string | HookBindInfo;
    gridRowStart?: string | HookBindInfo;
    gridTemplate?: string | HookBindInfo;
    gridTemplateAreas?: string | HookBindInfo;
    gridTemplateColumns?: string | HookBindInfo;
    gridTemplateRows?: string | HookBindInfo;
    hyphenateCharacter?: string | HookBindInfo;
    hyphens?: string | HookBindInfo;
    imageOrientation?: string | HookBindInfo;
    imageRendering?: string | HookBindInfo;
    inlineSize?: string | HookBindInfo;
    inset?: string | HookBindInfo;
    insetBlock?: string | HookBindInfo;
    insetBlockEnd?: string | HookBindInfo;
    insetBlockStart?: string | HookBindInfo;
    insetInline?: string | HookBindInfo;
    insetInlineEnd?: string | HookBindInfo;
    insetInlineStart?: string | HookBindInfo;
    isolation?: string | HookBindInfo;
    justifyContent?: string | HookBindInfo;
    justifyItems?: string | HookBindInfo;
    justifySelf?: string | HookBindInfo;
    letterSpacing?: string | HookBindInfo;
    lightingColor?: string | HookBindInfo;
    lineBreak?: string | HookBindInfo;
    lineHeight?: string | HookBindInfo;
    listStyle?: string | HookBindInfo;
    listStyleImage?: string | HookBindInfo;
    listStylePosition?: string | HookBindInfo;
    listStyleType?: string | HookBindInfo;
    margin?: string | HookBindInfo;
    marginBlock?: string | HookBindInfo;
    marginBlockEnd?: string | HookBindInfo;
    marginBlockStart?: string | HookBindInfo;
    marginBottom?: string | HookBindInfo;
    marginInline?: string | HookBindInfo;
    marginInlineEnd?: string | HookBindInfo;
    marginInlineStart?: string | HookBindInfo;
    marginLeft?: string | HookBindInfo;
    marginRight?: string | HookBindInfo;
    marginTop?: string | HookBindInfo;
    marker?: string | HookBindInfo;
    markerEnd?: string | HookBindInfo;
    markerMid?: string | HookBindInfo;
    markerStart?: string | HookBindInfo;
    mask?: string | HookBindInfo;
    maskClip?: string | HookBindInfo;
    maskComposite?: string | HookBindInfo;
    maskImage?: string | HookBindInfo;
    maskMode?: string | HookBindInfo;
    maskOrigin?: string | HookBindInfo;
    maskPosition?: string | HookBindInfo;
    maskRepeat?: string | HookBindInfo;
    maskSize?: string | HookBindInfo;
    maskType?: string | HookBindInfo;
    maxBlockSize?: string | HookBindInfo;
    maxHeight?: string | HookBindInfo;
    maxInlineSize?: string | HookBindInfo;
    maxWidth?: string | HookBindInfo;
    minBlockSize?: string | HookBindInfo;
    minHeight?: string | HookBindInfo;
    minInlineSize?: string | HookBindInfo;
    minWidth?: string | HookBindInfo;
    mixBlendMode?: string | HookBindInfo;
    objectFit?: string | HookBindInfo;
    objectPosition?: string | HookBindInfo;
    offsetDistance?: string | HookBindInfo;
    offsetPath?: string | HookBindInfo;
    offsetRotate?: string | HookBindInfo;
    opacity?: string | HookBindInfo;
    order?: string | HookBindInfo;
    orphans?: string | HookBindInfo;
    outline?: string | HookBindInfo;
    outlineColor?: string | HookBindInfo;
    outlineOffset?: string | HookBindInfo;
    outlineStyle?: string | HookBindInfo;
    outlineWidth?: string | HookBindInfo;
    overflow?: string | HookBindInfo;
    overflowAnchor?: string | HookBindInfo;
    overflowClipMargin?: string | HookBindInfo;
    overflowWrap?: string | HookBindInfo;
    overflowX?: string | HookBindInfo;
    overflowY?: string | HookBindInfo;
    overscrollBehavior?: string | HookBindInfo;
    overscrollBehaviorBlock?: string | HookBindInfo;
    overscrollBehaviorInline?: string | HookBindInfo;
    overscrollBehaviorX?: string | HookBindInfo;
    overscrollBehaviorY?: string | HookBindInfo;
    padding?: string | HookBindInfo;
    paddingBlock?: string | HookBindInfo;
    paddingBlockEnd?: string | HookBindInfo;
    paddingBlockStart?: string | HookBindInfo;
    paddingBottom?: string | HookBindInfo;
    paddingInline?: string | HookBindInfo;
    paddingInlineEnd?: string | HookBindInfo;
    paddingInlineStart?: string | HookBindInfo;
    paddingLeft?: string | HookBindInfo;
    paddingRight?: string | HookBindInfo;
    paddingTop?: string | HookBindInfo;
    pageBreakAfter?: string | HookBindInfo;
    pageBreakBefore?: string | HookBindInfo;
    pageBreakInside?: string | HookBindInfo;
    paintOrder?: string | HookBindInfo;
    parentRule?: string | HookBindInfo;
    perspective?: string | HookBindInfo;
    perspectiveOrigin?: string | HookBindInfo;
    placeContent?: string | HookBindInfo;
    placeItems?: string | HookBindInfo;
    placeSelf?: string | HookBindInfo;
    pointerEvents?: string | HookBindInfo;
    position?: string | HookBindInfo;
    printColorAdjust?: string | HookBindInfo;
    quotes?: string | HookBindInfo;
    resize?: string | HookBindInfo;
    right?: string | HookBindInfo;
    rotate?: string | HookBindInfo;
    rowGap?: string | HookBindInfo;
    rubyPosition?: string | HookBindInfo;
    scale?: string | HookBindInfo;
    scrollBehavior?: string | HookBindInfo;
    scrollMargin?: string | HookBindInfo;
    scrollMarginBlock?: string | HookBindInfo;
    scrollMarginBlockEnd?: string | HookBindInfo;
    scrollMarginBlockStart?: string | HookBindInfo;
    scrollMarginBottom?: string | HookBindInfo;
    scrollMarginInline?: string | HookBindInfo;
    scrollMarginInlineEnd?: string | HookBindInfo;
    scrollMarginInlineStart?: string | HookBindInfo;
    scrollMarginLeft?: string | HookBindInfo;
    scrollMarginRight?: string | HookBindInfo;
    scrollMarginTop?: string | HookBindInfo;
    scrollPadding?: string | HookBindInfo;
    scrollPaddingBlock?: string | HookBindInfo;
    scrollPaddingBlockEnd?: string | HookBindInfo;
    scrollPaddingBlockStart?: string | HookBindInfo;
    scrollPaddingBottom?: string | HookBindInfo;
    scrollPaddingInline?: string | HookBindInfo;
    scrollPaddingInlineEnd?: string | HookBindInfo;
    scrollPaddingInlineStart?: string | HookBindInfo;
    scrollPaddingLeft?: string | HookBindInfo;
    scrollPaddingRight?: string | HookBindInfo;
    scrollPaddingTop?: string | HookBindInfo;
    scrollSnapAlign?: string | HookBindInfo;
    scrollSnapStop?: string | HookBindInfo;
    scrollSnapType?: string | HookBindInfo;
    scrollbarGutter?: string | HookBindInfo;
    shapeImageThreshold?: string | HookBindInfo;
    shapeMargin?: string | HookBindInfo;
    shapeOutside?: string | HookBindInfo;
    shapeRendering?: string | HookBindInfo;
    stopColor?: string | HookBindInfo;
    stopOpacity?: string | HookBindInfo;
    stroke?: string | HookBindInfo;
    strokeDasharray?: string | HookBindInfo;
    strokeDashoffset?: string | HookBindInfo;
    strokeLinecap?: string | HookBindInfo;
    strokeLinejoin?: string | HookBindInfo;
    strokeMiterlimit?: string | HookBindInfo;
    strokeOpacity?: string | HookBindInfo;
    strokeWidth?: string | HookBindInfo;
    tabSize?: string | HookBindInfo;
    tableLayout?: string | HookBindInfo;
    textAlign?: string | HookBindInfo;
    textAlignLast?: string | HookBindInfo;
    textAnchor?: string | HookBindInfo;
    textCombineUpright?: string | HookBindInfo;
    textDecoration?: string | HookBindInfo;
    textDecorationColor?: string | HookBindInfo;
    textDecorationLine?: string | HookBindInfo;
    textDecorationSkipInk?: string | HookBindInfo;
    textDecorationStyle?: string | HookBindInfo;
    textDecorationThickness?: string | HookBindInfo;
    textEmphasis?: string | HookBindInfo;
    textEmphasisColor?: string | HookBindInfo;
    textEmphasisPosition?: string | HookBindInfo;
    textEmphasisStyle?: string | HookBindInfo;
    textIndent?: string | HookBindInfo;
    textOrientation?: string | HookBindInfo;
    textOverflow?: string | HookBindInfo;
    textRendering?: string | HookBindInfo;
    textShadow?: string | HookBindInfo;
    textTransform?: string | HookBindInfo;
    textUnderlineOffset?: string | HookBindInfo;
    textUnderlinePosition?: string | HookBindInfo;
    touchAction?: string | HookBindInfo;
    transform?: string | HookBindInfo;
    transformBox?: string | HookBindInfo;
    transformOrigin?: string | HookBindInfo;
    transformStyle?: string | HookBindInfo;
    transition?: string | HookBindInfo;
    transitionDelay?: string | HookBindInfo;
    transitionDuration?: string | HookBindInfo;
    transitionProperty?: string | HookBindInfo;
    transitionTimingFunction?: string | HookBindInfo;
    translate?: string | HookBindInfo;
    unicodeBidi?: string | HookBindInfo;
    userSelect?: string | HookBindInfo;
    verticalAlign?: string | HookBindInfo;
    visibility?: string | HookBindInfo;
    webkitAlignContent?: string | HookBindInfo;
    webkitAlignItems?: string | HookBindInfo;
    webkitAlignSelf?: string | HookBindInfo;
    webkitAnimation?: string | HookBindInfo;
    webkitAnimationDelay?: string | HookBindInfo;
    webkitAnimationDirection?: string | HookBindInfo;
    webkitAnimationDuration?: string | HookBindInfo;
    webkitAnimationFillMode?: string | HookBindInfo;
    webkitAnimationIterationCount?: string | HookBindInfo;
    webkitAnimationName?: string | HookBindInfo;
    webkitAnimationPlayState?: string | HookBindInfo;
    webkitAnimationTimingFunction?: string | HookBindInfo;
    webkitAppearance?: string | HookBindInfo;
    webkitBackfaceVisibility?: string | HookBindInfo;
    webkitBackgroundClip?: string | HookBindInfo;
    webkitBackgroundOrigin?: string | HookBindInfo;
    webkitBackgroundSize?: string | HookBindInfo;
    webkitBorderBottomLeftRadius?: string | HookBindInfo;
    webkitBorderBottomRightRadius?: string | HookBindInfo;
    webkitBorderRadius?: string | HookBindInfo;
    webkitBorderTopLeftRadius?: string | HookBindInfo;
    webkitBorderTopRightRadius?: string | HookBindInfo;
    webkitBoxAlign?: string | HookBindInfo;
    webkitBoxFlex?: string | HookBindInfo;
    webkitBoxOrdinalGroup?: string | HookBindInfo;
    webkitBoxOrient?: string | HookBindInfo;
    webkitBoxPack?: string | HookBindInfo;
    webkitBoxShadow?: string | HookBindInfo;
    webkitBoxSizing?: string | HookBindInfo;
    webkitFilter?: string | HookBindInfo;
    webkitFlex?: string | HookBindInfo;
    webkitFlexBasis?: string | HookBindInfo;
    webkitFlexDirection?: string | HookBindInfo;
    webkitFlexFlow?: string | HookBindInfo;
    webkitFlexGrow?: string | HookBindInfo;
    webkitFlexShrink?: string | HookBindInfo;
    webkitFlexWrap?: string | HookBindInfo;
    webkitJustifyContent?: string | HookBindInfo;
    webkitLineClamp?: string | HookBindInfo;
    webkitMask?: string | HookBindInfo;
    webkitMaskBoxImage?: string | HookBindInfo;
    webkitMaskBoxImageOutset?: string | HookBindInfo;
    webkitMaskBoxImageRepeat?: string | HookBindInfo;
    webkitMaskBoxImageSlice?: string | HookBindInfo;
    webkitMaskBoxImageSource?: string | HookBindInfo;
    webkitMaskBoxImageWidth?: string | HookBindInfo;
    webkitMaskClip?: string | HookBindInfo;
    webkitMaskComposite?: string | HookBindInfo;
    webkitMaskImage?: string | HookBindInfo;
    webkitMaskOrigin?: string | HookBindInfo;
    webkitMaskPosition?: string | HookBindInfo;
    webkitMaskRepeat?: string | HookBindInfo;
    webkitMaskSize?: string | HookBindInfo;
    webkitOrder?: string | HookBindInfo;
    webkitPerspective?: string | HookBindInfo;
    webkitPerspectiveOrigin?: string | HookBindInfo;
    webkitTextFillColor?: string | HookBindInfo;
    webkitTextSizeAdjust?: string | HookBindInfo;
    webkitTextStroke?: string | HookBindInfo;
    webkitTextStrokeColor?: string | HookBindInfo;
    webkitTextStrokeWidth?: string | HookBindInfo;
    webkitTransform?: string | HookBindInfo;
    webkitTransformOrigin?: string | HookBindInfo;
    webkitTransformStyle?: string | HookBindInfo;
    webkitTransition?: string | HookBindInfo;
    webkitTransitionDelay?: string | HookBindInfo;
    webkitTransitionDuration?: string | HookBindInfo;
    webkitTransitionProperty?: string | HookBindInfo;
    webkitTransitionTimingFunction?: string | HookBindInfo;
    webkitUserSelect?: string | HookBindInfo;
    whiteSpace?: string | HookBindInfo;
    widows?: string | HookBindInfo;
    willChange?: string | HookBindInfo;
    wordBreak?: string | HookBindInfo;
    wordSpacing?: string | HookBindInfo;
    wordWrap?: string | HookBindInfo;
    writingMode?: string | HookBindInfo;
    zIndex?: string | HookBindInfo;
    getPropertyPriority?: string | HookBindInfo;
    getPropertyValue?: string | HookBindInfo;
    removeProperty?: string | HookBindInfo;
    setProperty?: string | HookBindInfo;
}): NList;
/**
 * @typedef {(keyof CSSStyleDeclaration & string) | (string & {})} keyOfStyle
 */
/**
 * 样式
 * @template {keyOfStyle} T
 */
declare class NStyle<T extends keyOfStyle> {
    /**
     * @param {T} key
     * @param {string | HookBindInfo} value
     */
    constructor(key: T, value: string | HookBindInfo);
    /**
     * @type {T}
     */
    key: T;
    /**
     * @type {string | HookBindInfo}
     */
    value: string | HookBindInfo;
    /**
     * 将此特征应用于元素
     * @param {import("../element/NElement").NElement} e
     */
    apply(e: NElement<any>): void;
}
type keyOfStyle = (keyof CSSStyleDeclaration & string) | (string & {});

/**
 * 根据HTMLElement对象获取NElement对象
 * @template {HTMLElement} ElementObjectType
 * @param {ElementObjectType} element
 * @returns {NElement<ElementObjectType>}
 */
declare function getNElement<ElementObjectType extends HTMLElement>(element: ElementObjectType): NElement<ElementObjectType>;
/**
 * dom元素的封装
 * @template {HTMLElement} ElementObjectType
 */
declare class NElement<ElementObjectType extends HTMLElement> {
    /**
     * 根据HTMLElement对象获取NElement对象
     * @template {HTMLElement} ElementObjectType
     * @param {ElementObjectType} element
     * @returns {NElement<ElementObjectType>}
     */
    static byElement<ElementObjectType_1 extends HTMLElement>(element: ElementObjectType_1): NElement<ElementObjectType_1>;
    /**
     * @private
     * @param {ElementObjectType} elementObj
     */
    private constructor();
    /**
     * 元素对象
     * @readonly
     * @type {ElementObjectType}
     */
    readonly element: ElementObjectType;
    /**
     * 样式名 到 钩子绑定 映射
     * @private
     * @type {Map<string, HookBindValue | HookBindCallback>}
     */
    private styleHooks;
    /**
     * 添加单个子节点
     * @param {NElement | Node | string | HookBindInfo} chi
     */
    addChild(chi: NElement<any> | Node | string | HookBindInfo): void;
    /**
     * 添加多个子节点
     * @param {Array<NElement | Node | string | HookBindInfo | Array<NElement | Node | string | HookBindInfo>>} chi
     */
    addChilds(...chi: Array<NElement<any> | Node | string | HookBindInfo | Array<NElement<any> | Node | string | HookBindInfo>>): void;
    /**
     * 插入单个子节点(在中间)
     * 如果此节点之前在树中则先移除后加入
     * @param {NElement} chi
     * @param {number | NElement} pos 添加到的位置 负数从后到前 超过范围添加到最后
     */
    insChild(chi: NElement<any>, pos: number | NElement<any>): void;
    /**
     * 查找子节点在当前节点中的位置
     * 从0开始
     * 不是子节点则返回-1
     * @param {NElement} chi
     * @returns {number}
     */
    childInd(chi: NElement<any>): number;
    /**
     * 移除此节点
     */
    remove(): void;
    /**
     * 移除此节点的子节点
     * @param {number} [begin] 开始删除的子节点下标 缺省则为从0开始
     * @param {number} [end] 结束删除的子节点下标 不包含end 缺省则为到结尾
     */
    removeChilds(begin?: number | undefined, end?: number | undefined): void;
    /**
     * 获取子节点列表
     * 返回的列表不会随dom树变化
     * @returns {Array<NElement>}
     */
    getChilds(): Array<NElement<any>>;
    /**
     * 获取第ind个子节点
     * @param {number} ind
     * @returns {NElement}
     */
    getChild(ind: number): NElement<any>;
    /**
     * 使用指定元素替换此元素
     * @param {Array<NElement>} elements
     */
    replaceWith(...elements: Array<NElement<any>>): void;
    /**
     * 修改样式
     * @param {import("../feature/NStyle").keyOfStyle} styleName
     * @param {string | number | HookBindInfo} value
     * @param {HookBindValue | HookBindCallback} [hookObj]
     */
    setStyle(styleName: keyOfStyle, value: string | number | HookBindInfo, hookObj?: HookBindValue | HookBindCallback | undefined): void;
    /**
     * 获取样式
     * @param {import("../feature/NStyle").keyOfStyle} styleName
     * @returns {string | number}
     */
    getStyle(styleName: keyOfStyle): string | number;
    /**
     * 修改多个样式
     * @param {{ [x in (import("../feature/NStyle").keyOfStyle)]?: string | number }} obj
     */
    setStyles(obj: {
        [x: string & {}]: string | number | undefined;
        length?: string | number;
        filter?: string | number;
        fill?: string | number;
        animationName?: string | number;
        all?: string | number;
        offset?: string | number;
        height?: string | number;
        width?: string | number;
        left?: string | number;
        top?: string | number;
        item?: string | number;
        accentColor?: string | number;
        alignContent?: string | number;
        alignItems?: string | number;
        alignSelf?: string | number;
        alignmentBaseline?: string | number;
        animation?: string | number;
        animationDelay?: string | number;
        animationDirection?: string | number;
        animationDuration?: string | number;
        animationFillMode?: string | number;
        animationIterationCount?: string | number;
        animationPlayState?: string | number;
        animationTimingFunction?: string | number;
        appearance?: string | number;
        aspectRatio?: string | number;
        backdropFilter?: string | number;
        backfaceVisibility?: string | number;
        background?: string | number;
        backgroundAttachment?: string | number;
        backgroundBlendMode?: string | number;
        backgroundClip?: string | number;
        backgroundColor?: string | number;
        backgroundImage?: string | number;
        backgroundOrigin?: string | number;
        backgroundPosition?: string | number;
        backgroundPositionX?: string | number;
        backgroundPositionY?: string | number;
        backgroundRepeat?: string | number;
        backgroundSize?: string | number;
        baselineShift?: string | number;
        blockSize?: string | number;
        border?: string | number;
        borderBlock?: string | number;
        borderBlockColor?: string | number;
        borderBlockEnd?: string | number;
        borderBlockEndColor?: string | number;
        borderBlockEndStyle?: string | number;
        borderBlockEndWidth?: string | number;
        borderBlockStart?: string | number;
        borderBlockStartColor?: string | number;
        borderBlockStartStyle?: string | number;
        borderBlockStartWidth?: string | number;
        borderBlockStyle?: string | number;
        borderBlockWidth?: string | number;
        borderBottom?: string | number;
        borderBottomColor?: string | number;
        borderBottomLeftRadius?: string | number;
        borderBottomRightRadius?: string | number;
        borderBottomStyle?: string | number;
        borderBottomWidth?: string | number;
        borderCollapse?: string | number;
        borderColor?: string | number;
        borderEndEndRadius?: string | number;
        borderEndStartRadius?: string | number;
        borderImage?: string | number;
        borderImageOutset?: string | number;
        borderImageRepeat?: string | number;
        borderImageSlice?: string | number;
        borderImageSource?: string | number;
        borderImageWidth?: string | number;
        borderInline?: string | number;
        borderInlineColor?: string | number;
        borderInlineEnd?: string | number;
        borderInlineEndColor?: string | number;
        borderInlineEndStyle?: string | number;
        borderInlineEndWidth?: string | number;
        borderInlineStart?: string | number;
        borderInlineStartColor?: string | number;
        borderInlineStartStyle?: string | number;
        borderInlineStartWidth?: string | number;
        borderInlineStyle?: string | number;
        borderInlineWidth?: string | number;
        borderLeft?: string | number;
        borderLeftColor?: string | number;
        borderLeftStyle?: string | number;
        borderLeftWidth?: string | number;
        borderRadius?: string | number;
        borderRight?: string | number;
        borderRightColor?: string | number;
        borderRightStyle?: string | number;
        borderRightWidth?: string | number;
        borderSpacing?: string | number;
        borderStartEndRadius?: string | number;
        borderStartStartRadius?: string | number;
        borderStyle?: string | number;
        borderTop?: string | number;
        borderTopColor?: string | number;
        borderTopLeftRadius?: string | number;
        borderTopRightRadius?: string | number;
        borderTopStyle?: string | number;
        borderTopWidth?: string | number;
        borderWidth?: string | number;
        bottom?: string | number;
        boxShadow?: string | number;
        boxSizing?: string | number;
        breakAfter?: string | number;
        breakBefore?: string | number;
        breakInside?: string | number;
        captionSide?: string | number;
        caretColor?: string | number;
        clear?: string | number;
        clip?: string | number;
        clipPath?: string | number;
        clipRule?: string | number;
        color?: string | number;
        colorInterpolation?: string | number;
        colorInterpolationFilters?: string | number;
        colorScheme?: string | number;
        columnCount?: string | number;
        columnFill?: string | number;
        columnGap?: string | number;
        columnRule?: string | number;
        columnRuleColor?: string | number;
        columnRuleStyle?: string | number;
        columnRuleWidth?: string | number;
        columnSpan?: string | number;
        columnWidth?: string | number;
        columns?: string | number;
        contain?: string | number;
        container?: string | number;
        containerName?: string | number;
        containerType?: string | number;
        content?: string | number;
        counterIncrement?: string | number;
        counterReset?: string | number;
        counterSet?: string | number;
        cssFloat?: string | number;
        cssText?: string | number;
        cursor?: string | number;
        direction?: string | number;
        display?: string | number;
        dominantBaseline?: string | number;
        emptyCells?: string | number;
        fillOpacity?: string | number;
        fillRule?: string | number;
        flex?: string | number;
        flexBasis?: string | number;
        flexDirection?: string | number;
        flexFlow?: string | number;
        flexGrow?: string | number;
        flexShrink?: string | number;
        flexWrap?: string | number;
        float?: string | number;
        floodColor?: string | number;
        floodOpacity?: string | number;
        font?: string | number;
        fontFamily?: string | number;
        fontFeatureSettings?: string | number;
        fontKerning?: string | number;
        fontOpticalSizing?: string | number;
        fontPalette?: string | number;
        fontSize?: string | number;
        fontSizeAdjust?: string | number;
        fontStretch?: string | number;
        fontStyle?: string | number;
        fontSynthesis?: string | number;
        fontVariant?: string | number;
        fontVariantAlternates?: string | number;
        fontVariantCaps?: string | number;
        fontVariantEastAsian?: string | number;
        fontVariantLigatures?: string | number;
        fontVariantNumeric?: string | number;
        fontVariantPosition?: string | number;
        fontVariationSettings?: string | number;
        fontWeight?: string | number;
        gap?: string | number;
        grid?: string | number;
        gridArea?: string | number;
        gridAutoColumns?: string | number;
        gridAutoFlow?: string | number;
        gridAutoRows?: string | number;
        gridColumn?: string | number;
        gridColumnEnd?: string | number;
        gridColumnGap?: string | number;
        gridColumnStart?: string | number;
        gridGap?: string | number;
        gridRow?: string | number;
        gridRowEnd?: string | number;
        gridRowGap?: string | number;
        gridRowStart?: string | number;
        gridTemplate?: string | number;
        gridTemplateAreas?: string | number;
        gridTemplateColumns?: string | number;
        gridTemplateRows?: string | number;
        hyphenateCharacter?: string | number;
        hyphens?: string | number;
        imageOrientation?: string | number;
        imageRendering?: string | number;
        inlineSize?: string | number;
        inset?: string | number;
        insetBlock?: string | number;
        insetBlockEnd?: string | number;
        insetBlockStart?: string | number;
        insetInline?: string | number;
        insetInlineEnd?: string | number;
        insetInlineStart?: string | number;
        isolation?: string | number;
        justifyContent?: string | number;
        justifyItems?: string | number;
        justifySelf?: string | number;
        letterSpacing?: string | number;
        lightingColor?: string | number;
        lineBreak?: string | number;
        lineHeight?: string | number;
        listStyle?: string | number;
        listStyleImage?: string | number;
        listStylePosition?: string | number;
        listStyleType?: string | number;
        margin?: string | number;
        marginBlock?: string | number;
        marginBlockEnd?: string | number;
        marginBlockStart?: string | number;
        marginBottom?: string | number;
        marginInline?: string | number;
        marginInlineEnd?: string | number;
        marginInlineStart?: string | number;
        marginLeft?: string | number;
        marginRight?: string | number;
        marginTop?: string | number;
        marker?: string | number;
        markerEnd?: string | number;
        markerMid?: string | number;
        markerStart?: string | number;
        mask?: string | number;
        maskClip?: string | number;
        maskComposite?: string | number;
        maskImage?: string | number;
        maskMode?: string | number;
        maskOrigin?: string | number;
        maskPosition?: string | number;
        maskRepeat?: string | number;
        maskSize?: string | number;
        maskType?: string | number;
        maxBlockSize?: string | number;
        maxHeight?: string | number;
        maxInlineSize?: string | number;
        maxWidth?: string | number;
        minBlockSize?: string | number;
        minHeight?: string | number;
        minInlineSize?: string | number;
        minWidth?: string | number;
        mixBlendMode?: string | number;
        objectFit?: string | number;
        objectPosition?: string | number;
        offsetDistance?: string | number;
        offsetPath?: string | number;
        offsetRotate?: string | number;
        opacity?: string | number;
        order?: string | number;
        orphans?: string | number;
        outline?: string | number;
        outlineColor?: string | number;
        outlineOffset?: string | number;
        outlineStyle?: string | number;
        outlineWidth?: string | number;
        overflow?: string | number;
        overflowAnchor?: string | number;
        overflowClipMargin?: string | number;
        overflowWrap?: string | number;
        overflowX?: string | number;
        overflowY?: string | number;
        overscrollBehavior?: string | number;
        overscrollBehaviorBlock?: string | number;
        overscrollBehaviorInline?: string | number;
        overscrollBehaviorX?: string | number;
        overscrollBehaviorY?: string | number;
        padding?: string | number;
        paddingBlock?: string | number;
        paddingBlockEnd?: string | number;
        paddingBlockStart?: string | number;
        paddingBottom?: string | number;
        paddingInline?: string | number;
        paddingInlineEnd?: string | number;
        paddingInlineStart?: string | number;
        paddingLeft?: string | number;
        paddingRight?: string | number;
        paddingTop?: string | number;
        pageBreakAfter?: string | number;
        pageBreakBefore?: string | number;
        pageBreakInside?: string | number;
        paintOrder?: string | number;
        parentRule?: string | number;
        perspective?: string | number;
        perspectiveOrigin?: string | number;
        placeContent?: string | number;
        placeItems?: string | number;
        placeSelf?: string | number;
        pointerEvents?: string | number;
        position?: string | number;
        printColorAdjust?: string | number;
        quotes?: string | number;
        resize?: string | number;
        right?: string | number;
        rotate?: string | number;
        rowGap?: string | number;
        rubyPosition?: string | number;
        scale?: string | number;
        scrollBehavior?: string | number;
        scrollMargin?: string | number;
        scrollMarginBlock?: string | number;
        scrollMarginBlockEnd?: string | number;
        scrollMarginBlockStart?: string | number;
        scrollMarginBottom?: string | number;
        scrollMarginInline?: string | number;
        scrollMarginInlineEnd?: string | number;
        scrollMarginInlineStart?: string | number;
        scrollMarginLeft?: string | number;
        scrollMarginRight?: string | number;
        scrollMarginTop?: string | number;
        scrollPadding?: string | number;
        scrollPaddingBlock?: string | number;
        scrollPaddingBlockEnd?: string | number;
        scrollPaddingBlockStart?: string | number;
        scrollPaddingBottom?: string | number;
        scrollPaddingInline?: string | number;
        scrollPaddingInlineEnd?: string | number;
        scrollPaddingInlineStart?: string | number;
        scrollPaddingLeft?: string | number;
        scrollPaddingRight?: string | number;
        scrollPaddingTop?: string | number;
        scrollSnapAlign?: string | number;
        scrollSnapStop?: string | number;
        scrollSnapType?: string | number;
        scrollbarGutter?: string | number;
        shapeImageThreshold?: string | number;
        shapeMargin?: string | number;
        shapeOutside?: string | number;
        shapeRendering?: string | number;
        stopColor?: string | number;
        stopOpacity?: string | number;
        stroke?: string | number;
        strokeDasharray?: string | number;
        strokeDashoffset?: string | number;
        strokeLinecap?: string | number;
        strokeLinejoin?: string | number;
        strokeMiterlimit?: string | number;
        strokeOpacity?: string | number;
        strokeWidth?: string | number;
        tabSize?: string | number;
        tableLayout?: string | number;
        textAlign?: string | number;
        textAlignLast?: string | number;
        textAnchor?: string | number;
        textCombineUpright?: string | number;
        textDecoration?: string | number;
        textDecorationColor?: string | number;
        textDecorationLine?: string | number;
        textDecorationSkipInk?: string | number;
        textDecorationStyle?: string | number;
        textDecorationThickness?: string | number;
        textEmphasis?: string | number;
        textEmphasisColor?: string | number;
        textEmphasisPosition?: string | number;
        textEmphasisStyle?: string | number;
        textIndent?: string | number;
        textOrientation?: string | number;
        textOverflow?: string | number;
        textRendering?: string | number;
        textShadow?: string | number;
        textTransform?: string | number;
        textUnderlineOffset?: string | number;
        textUnderlinePosition?: string | number;
        touchAction?: string | number;
        transform?: string | number;
        transformBox?: string | number;
        transformOrigin?: string | number;
        transformStyle?: string | number;
        transition?: string | number;
        transitionDelay?: string | number;
        transitionDuration?: string | number;
        transitionProperty?: string | number;
        transitionTimingFunction?: string | number;
        translate?: string | number;
        unicodeBidi?: string | number;
        userSelect?: string | number;
        verticalAlign?: string | number;
        visibility?: string | number;
        webkitAlignContent?: string | number;
        webkitAlignItems?: string | number;
        webkitAlignSelf?: string | number;
        webkitAnimation?: string | number;
        webkitAnimationDelay?: string | number;
        webkitAnimationDirection?: string | number;
        webkitAnimationDuration?: string | number;
        webkitAnimationFillMode?: string | number;
        webkitAnimationIterationCount?: string | number;
        webkitAnimationName?: string | number;
        webkitAnimationPlayState?: string | number;
        webkitAnimationTimingFunction?: string | number;
        webkitAppearance?: string | number;
        webkitBackfaceVisibility?: string | number;
        webkitBackgroundClip?: string | number;
        webkitBackgroundOrigin?: string | number;
        webkitBackgroundSize?: string | number;
        webkitBorderBottomLeftRadius?: string | number;
        webkitBorderBottomRightRadius?: string | number;
        webkitBorderRadius?: string | number;
        webkitBorderTopLeftRadius?: string | number;
        webkitBorderTopRightRadius?: string | number;
        webkitBoxAlign?: string | number;
        webkitBoxFlex?: string | number;
        webkitBoxOrdinalGroup?: string | number;
        webkitBoxOrient?: string | number;
        webkitBoxPack?: string | number;
        webkitBoxShadow?: string | number;
        webkitBoxSizing?: string | number;
        webkitFilter?: string | number;
        webkitFlex?: string | number;
        webkitFlexBasis?: string | number;
        webkitFlexDirection?: string | number;
        webkitFlexFlow?: string | number;
        webkitFlexGrow?: string | number;
        webkitFlexShrink?: string | number;
        webkitFlexWrap?: string | number;
        webkitJustifyContent?: string | number;
        webkitLineClamp?: string | number;
        webkitMask?: string | number;
        webkitMaskBoxImage?: string | number;
        webkitMaskBoxImageOutset?: string | number;
        webkitMaskBoxImageRepeat?: string | number;
        webkitMaskBoxImageSlice?: string | number;
        webkitMaskBoxImageSource?: string | number;
        webkitMaskBoxImageWidth?: string | number;
        webkitMaskClip?: string | number;
        webkitMaskComposite?: string | number;
        webkitMaskImage?: string | number;
        webkitMaskOrigin?: string | number;
        webkitMaskPosition?: string | number;
        webkitMaskRepeat?: string | number;
        webkitMaskSize?: string | number;
        webkitOrder?: string | number;
        webkitPerspective?: string | number;
        webkitPerspectiveOrigin?: string | number;
        webkitTextFillColor?: string | number;
        webkitTextSizeAdjust?: string | number;
        webkitTextStroke?: string | number;
        webkitTextStrokeColor?: string | number;
        webkitTextStrokeWidth?: string | number;
        webkitTransform?: string | number;
        webkitTransformOrigin?: string | number;
        webkitTransformStyle?: string | number;
        webkitTransition?: string | number;
        webkitTransitionDelay?: string | number;
        webkitTransitionDuration?: string | number;
        webkitTransitionProperty?: string | number;
        webkitTransitionTimingFunction?: string | number;
        webkitUserSelect?: string | number;
        whiteSpace?: string | number;
        widows?: string | number;
        willChange?: string | number;
        wordBreak?: string | number;
        wordSpacing?: string | number;
        wordWrap?: string | number;
        writingMode?: string | number;
        zIndex?: string | number;
        getPropertyPriority?: string | number;
        getPropertyValue?: string | number;
        removeProperty?: string | number;
        setProperty?: string | number;
    }): void;
    /**
     * 修改文本
     * @param {string} text
     */
    setText(text: string): void;
    /**
     * 添加文本
     * @param {string} text
     * @returns {Text}
     */
    addText(text: string): Text;
    /**
     * 设置多个HTMLElement属性
     * @param {Object<string, string>} obj
     */
    setAttrs(obj: {
        [x: string]: string;
    }): void;
    /**
     * 设置元素可见性
     * @param {"block" | "inline" | "flex" | "none" | "inline-block" | string} s
     */
    setDisplay(s: "block" | "inline" | "flex" | "none" | "inline-block" | string): void;
    /**
     * 添加事件监听器
     * @template {keyof HTMLElementEventMap} K
     * @param {K} eventName
     * @param {function(HTMLElementEventMap[K]): any} callBack
     * @param {boolean | AddEventListenerOptions} [options]
     */
    addEventListener<K extends keyof HTMLElementEventMap>(eventName: K, callBack: (arg0: HTMLElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions | undefined): void;
    /**
     * 移除事件监听器
     * @param {string} eventName
     * @param {function(Event) : void} callBack
     * @param {boolean | EventListenerOptions} [options]
     */
    removeEventListener(eventName: string, callBack: (arg0: Event) => void, options?: boolean | EventListenerOptions | undefined): void;
    /**
     * 执行动画
     * @param {Array<Keyframe> | PropertyIndexedKeyframes} keyframes
     * @param {number | KeyframeAnimationOptions} options
     * @returns {Animation}
     */
    animate(keyframes: Array<Keyframe> | PropertyIndexedKeyframes, options: number | KeyframeAnimationOptions): Animation;
    /**
     * 执行动画并提交
     * 在执行完成动画后将最后的效果提交到style
     * @param {Array<Keyframe> | PropertyIndexedKeyframes} keyframes
     * @param {number | KeyframeAnimationOptions} options
     * @returns {Promise<void>} 动画执行完后返回
     */
    animateCommit(keyframes: Array<Keyframe> | PropertyIndexedKeyframes, options: number | KeyframeAnimationOptions): Promise<void>;
    /**
     * 流水线
     * @param {function(NElement): void} asseFunc 流水线函数(无视返回值)
     * @returns {NElement} 返回本身
     */
    asse(asseFunc: (arg0: NElement<any>) => void): NElement<any>;
    /**
     * 获取标签名
     * 标签名使用小写字母
     * @returns {keyof HTMLElementTagNameMap}
     */
    getTagName(): keyof HTMLElementTagNameMap;
    /**
     * 应用NList到元素
     * @param {NList | ConstructorParameters<typeof NList>[0]} list
     * @returns {NElement} 返回被操作的NElement
     */
    applyNList(list: NList | ConstructorParameters<typeof NList>[0]): NElement<any>;
}

/**
 * 标签名
 * 标签名使用小写字母
 * 不包含此类的特征列表默认为div
 * 一层特征列表只能有唯一tagName (或等价的)
 * @template {keyof HTMLElementTagNameMap} T
 */
declare class NTagName<T extends keyof HTMLElementTagNameMap> {
    /**
     * @param {T} tagName
     */
    constructor(tagName: T);
    /**
     * @type {T}
     */
    tagName: T;
}

/**
 * @typedef {(keyof HTMLElement & string) | (string & {})} keyObjectOfHtmlElementAttr
 */
/**
 * 属性
 * @template {keyObjectOfHtmlElementAttr} T
 */
declare class NAttr<T extends keyObjectOfHtmlElementAttr> {
    /**
     * @param {T} key
     * @param {string | number | boolean | Function} value
     */
    constructor(key: T, value: string | number | boolean | Function);
    /**
     * @type {T}
     */
    key: T;
    /**
     * 若为函数则应用时调用
     * 若有返回值则赋值到属性
     * @type {string | number | boolean | Function}
     */
    value: string | number | boolean | Function;
    /**
     * 将此特征应用于元素
     * @param {import("../element/NElement").NElement} e
     */
    apply(e: NElement<any>): void;
}
type keyObjectOfHtmlElementAttr = (keyof HTMLElement & string) | (string & {});

/**
 * 事件
 * @template {keyof HTMLElementEventMap} T
 */
declare class NEvent<T extends keyof HTMLElementEventMap> {
    /**
     * @param {T} key
     * @param {(event: HTMLElementEventMap[T], currentElement: import("../element/NElement").NElement) => void} callback
     */
    constructor(key: T, callback: (event: HTMLElementEventMap[T], currentElement: NElement<any>) => void);
    /**
     * @type {T}
     */
    eventName: T;
    /**
     * @type {(event: HTMLElementEventMap[T], currentElement: import("../element/NElement").NElement) => void}
     */
    callback: (event: HTMLElementEventMap[T], currentElement: NElement<any>) => void;
    /**
     * 将此特征应用于元素
     * @param {import("../element/NElement").NElement} element
     */
    apply(element: NElement<any>): void;
}

/**
 * 流水线
 */
declare class NAsse {
    /**
     * @param {function(import("../element/NElement").NElement): void} callback
     */
    constructor(callback: (arg0: NElement<any>) => void);
    /**
     * @type {function(import("../element/NElement").NElement): void}
     */
    callback: (arg0: NElement<any>) => void;
    /**
     * 将此特征应用于元素
     * @param {import("../element/NElement").NElement} e
     */
    apply(e: NElement<any>): void;
}

/**
 * 特征列表
 * @typedef {Array<string | HookBindInfo | NTagName | NStyle | NAttr | NEvent | NAsse | NList | NList_list | NElement | ((e: NElement) => void)>} NList_list
 */
declare class NList {
    /**
     * 生成拉平列表
     * @param {NList_list} list
     */
    static flat(list: NList_list$1): NList;
    /**
     * 获取(生成)元素
     * @param {NList_list} list
     */
    static getElement(list: NList_list$1): NElement<any>;
    /**
     * @param {NList_list} list
     */
    constructor(list: NList_list$1);
    /**
     * @type {NList_list}
     */
    list: NList_list$1;
    /**
     * 拉平特征
     * (默认)标记为false将作为子元素节点
     * 标记为true将作为上层节点的特征列表
     * @type {boolean}
     */
    flatFlag: boolean;
    /**
     * 为元素应用特征列表
     * @param {NElement<HTMLElement>} element
     */
    apply(element: NElement<HTMLElement>): void;
    /**
     * 获取列表的标签名
     * @returns {string}
     */
    getTagName(): string;
    /**
     * 获取(生成)元素
     * @returns {NElement}
     */
    getElement(): NElement<any>;
}
/**
 * 特征列表
 */
type NList_list$1 = (string | HookBindInfo | NAsse | NElement<any> | NList | NList_list$1 | NTagName<any> | NStyle<any> | NAttr<any> | NEvent<any> | ((e: NElement<any>) => void))[];

declare namespace cssG {
    function diFull(value: string): string;
    function rgb(r: string | number, g: string | number, b: string | number, a?: string | number | undefined): string;
}

/**
 * 绑定元素属性到对象作为getter/setter
 * @template {Object} T
 * @param {string} attrName
 * @param {T} obj
 * @param {(keyof T) | (string & {})} key
 * @param {boolean} [noInitialize] 不将对象中原来的值赋给元素属性
 * @returns {(element: NElement) => void} 流水线函数
 */
declare function bindAttribute<T extends unknown>(attrName: string, obj: T, key: (string & {}) | keyof T, noInitialize?: boolean | undefined): (element: NElement<any>) => void;

/**
 * 展开元素
 * 将内容js对象转换为封装的HTML树
 * 请不要转换不受信任的json
 * @param {EDObj} obj EleData格式的对象
 * @returns {NElement}
*/
declare function expandElement(obj: EDObj): NElement<any>;
/**
 * 遍历展开元素
 */
type EDObj = {
    [x: string]: any;
    id?: string;
    left?: string;
    top?: string;
    right?: string;
    bottom?: string;
    width?: string;
    height?: string;
    position?: "static" | "absolute" | "relative" | "fixed" | string;
    display?: "block" | "inline" | "none" | "inline-block" | string;
    overflow?: "visible" | "hidden" | "scroll" | "auto" | string;
    tagName?: string;
    classList?: Array<string>;
    text?: string;
    style?: {
        [x: number]: string | number | undefined;
        length?: string | number;
        filter?: string | number;
        fill?: string | number;
        animationName?: string | number;
        all?: string | number;
        offset?: string | number;
        height?: string | number;
        width?: string | number;
        left?: string | number;
        top?: string | number;
        item?: string | number;
        accentColor?: string | number;
        alignContent?: string | number;
        alignItems?: string | number;
        alignSelf?: string | number;
        alignmentBaseline?: string | number;
        animation?: string | number;
        animationDelay?: string | number;
        animationDirection?: string | number;
        animationDuration?: string | number;
        animationFillMode?: string | number;
        animationIterationCount?: string | number;
        animationPlayState?: string | number;
        animationTimingFunction?: string | number;
        appearance?: string | number;
        aspectRatio?: string | number;
        backdropFilter?: string | number;
        backfaceVisibility?: string | number;
        background?: string | number;
        backgroundAttachment?: string | number;
        backgroundBlendMode?: string | number;
        backgroundClip?: string | number;
        backgroundColor?: string | number;
        backgroundImage?: string | number;
        backgroundOrigin?: string | number;
        backgroundPosition?: string | number;
        backgroundPositionX?: string | number;
        backgroundPositionY?: string | number;
        backgroundRepeat?: string | number;
        backgroundSize?: string | number;
        baselineShift?: string | number;
        blockSize?: string | number;
        border?: string | number;
        borderBlock?: string | number;
        borderBlockColor?: string | number;
        borderBlockEnd?: string | number;
        borderBlockEndColor?: string | number;
        borderBlockEndStyle?: string | number;
        borderBlockEndWidth?: string | number;
        borderBlockStart?: string | number;
        borderBlockStartColor?: string | number;
        borderBlockStartStyle?: string | number;
        borderBlockStartWidth?: string | number;
        borderBlockStyle?: string | number;
        borderBlockWidth?: string | number;
        borderBottom?: string | number;
        borderBottomColor?: string | number;
        borderBottomLeftRadius?: string | number;
        borderBottomRightRadius?: string | number;
        borderBottomStyle?: string | number;
        borderBottomWidth?: string | number;
        borderCollapse?: string | number;
        borderColor?: string | number;
        borderEndEndRadius?: string | number;
        borderEndStartRadius?: string | number;
        borderImage?: string | number;
        borderImageOutset?: string | number;
        borderImageRepeat?: string | number;
        borderImageSlice?: string | number;
        borderImageSource?: string | number;
        borderImageWidth?: string | number;
        borderInline?: string | number;
        borderInlineColor?: string | number;
        borderInlineEnd?: string | number;
        borderInlineEndColor?: string | number;
        borderInlineEndStyle?: string | number;
        borderInlineEndWidth?: string | number;
        borderInlineStart?: string | number;
        borderInlineStartColor?: string | number;
        borderInlineStartStyle?: string | number;
        borderInlineStartWidth?: string | number;
        borderInlineStyle?: string | number;
        borderInlineWidth?: string | number;
        borderLeft?: string | number;
        borderLeftColor?: string | number;
        borderLeftStyle?: string | number;
        borderLeftWidth?: string | number;
        borderRadius?: string | number;
        borderRight?: string | number;
        borderRightColor?: string | number;
        borderRightStyle?: string | number;
        borderRightWidth?: string | number;
        borderSpacing?: string | number;
        borderStartEndRadius?: string | number;
        borderStartStartRadius?: string | number;
        borderStyle?: string | number;
        borderTop?: string | number;
        borderTopColor?: string | number;
        borderTopLeftRadius?: string | number;
        borderTopRightRadius?: string | number;
        borderTopStyle?: string | number;
        borderTopWidth?: string | number;
        borderWidth?: string | number;
        bottom?: string | number;
        boxShadow?: string | number;
        boxSizing?: string | number;
        breakAfter?: string | number;
        breakBefore?: string | number;
        breakInside?: string | number;
        captionSide?: string | number;
        caretColor?: string | number;
        clear?: string | number;
        clip?: string | number;
        clipPath?: string | number;
        clipRule?: string | number;
        color?: string | number;
        colorInterpolation?: string | number;
        colorInterpolationFilters?: string | number;
        colorScheme?: string | number;
        columnCount?: string | number;
        columnFill?: string | number;
        columnGap?: string | number;
        columnRule?: string | number;
        columnRuleColor?: string | number;
        columnRuleStyle?: string | number;
        columnRuleWidth?: string | number;
        columnSpan?: string | number;
        columnWidth?: string | number;
        columns?: string | number;
        contain?: string | number;
        container?: string | number;
        containerName?: string | number;
        containerType?: string | number;
        content?: string | number;
        counterIncrement?: string | number;
        counterReset?: string | number;
        counterSet?: string | number;
        cssFloat?: string | number;
        cssText?: string | number;
        cursor?: string | number;
        direction?: string | number;
        display?: string | number;
        dominantBaseline?: string | number;
        emptyCells?: string | number;
        fillOpacity?: string | number;
        fillRule?: string | number;
        flex?: string | number;
        flexBasis?: string | number;
        flexDirection?: string | number;
        flexFlow?: string | number;
        flexGrow?: string | number;
        flexShrink?: string | number;
        flexWrap?: string | number;
        float?: string | number;
        floodColor?: string | number;
        floodOpacity?: string | number;
        font?: string | number;
        fontFamily?: string | number;
        fontFeatureSettings?: string | number;
        fontKerning?: string | number;
        fontOpticalSizing?: string | number;
        fontPalette?: string | number;
        fontSize?: string | number;
        fontSizeAdjust?: string | number;
        fontStretch?: string | number;
        fontStyle?: string | number;
        fontSynthesis?: string | number;
        fontVariant?: string | number;
        fontVariantAlternates?: string | number;
        fontVariantCaps?: string | number;
        fontVariantEastAsian?: string | number;
        fontVariantLigatures?: string | number;
        fontVariantNumeric?: string | number;
        fontVariantPosition?: string | number;
        fontVariationSettings?: string | number;
        fontWeight?: string | number;
        gap?: string | number;
        grid?: string | number;
        gridArea?: string | number;
        gridAutoColumns?: string | number;
        gridAutoFlow?: string | number;
        gridAutoRows?: string | number;
        gridColumn?: string | number;
        gridColumnEnd?: string | number;
        gridColumnGap?: string | number;
        gridColumnStart?: string | number;
        gridGap?: string | number;
        gridRow?: string | number;
        gridRowEnd?: string | number;
        gridRowGap?: string | number;
        gridRowStart?: string | number;
        gridTemplate?: string | number;
        gridTemplateAreas?: string | number;
        gridTemplateColumns?: string | number;
        gridTemplateRows?: string | number;
        hyphenateCharacter?: string | number;
        hyphens?: string | number;
        imageOrientation?: string | number;
        imageRendering?: string | number;
        inlineSize?: string | number;
        inset?: string | number;
        insetBlock?: string | number;
        insetBlockEnd?: string | number;
        insetBlockStart?: string | number;
        insetInline?: string | number;
        insetInlineEnd?: string | number;
        insetInlineStart?: string | number;
        isolation?: string | number;
        justifyContent?: string | number;
        justifyItems?: string | number;
        justifySelf?: string | number;
        letterSpacing?: string | number;
        lightingColor?: string | number;
        lineBreak?: string | number;
        lineHeight?: string | number;
        listStyle?: string | number;
        listStyleImage?: string | number;
        listStylePosition?: string | number;
        listStyleType?: string | number;
        margin?: string | number;
        marginBlock?: string | number;
        marginBlockEnd?: string | number;
        marginBlockStart?: string | number;
        marginBottom?: string | number;
        marginInline?: string | number;
        marginInlineEnd?: string | number;
        marginInlineStart?: string | number;
        marginLeft?: string | number;
        marginRight?: string | number;
        marginTop?: string | number;
        marker?: string | number;
        markerEnd?: string | number;
        markerMid?: string | number;
        markerStart?: string | number;
        mask?: string | number;
        maskClip?: string | number;
        maskComposite?: string | number;
        maskImage?: string | number;
        maskMode?: string | number;
        maskOrigin?: string | number;
        maskPosition?: string | number;
        maskRepeat?: string | number;
        maskSize?: string | number;
        maskType?: string | number;
        maxBlockSize?: string | number;
        maxHeight?: string | number;
        maxInlineSize?: string | number;
        maxWidth?: string | number;
        minBlockSize?: string | number;
        minHeight?: string | number;
        minInlineSize?: string | number;
        minWidth?: string | number;
        mixBlendMode?: string | number;
        objectFit?: string | number;
        objectPosition?: string | number;
        offsetDistance?: string | number;
        offsetPath?: string | number;
        offsetRotate?: string | number;
        opacity?: string | number;
        order?: string | number;
        orphans?: string | number;
        outline?: string | number;
        outlineColor?: string | number;
        outlineOffset?: string | number;
        outlineStyle?: string | number;
        outlineWidth?: string | number;
        overflow?: string | number;
        overflowAnchor?: string | number;
        overflowClipMargin?: string | number;
        overflowWrap?: string | number;
        overflowX?: string | number;
        overflowY?: string | number;
        overscrollBehavior?: string | number;
        overscrollBehaviorBlock?: string | number;
        overscrollBehaviorInline?: string | number;
        overscrollBehaviorX?: string | number;
        overscrollBehaviorY?: string | number;
        padding?: string | number;
        paddingBlock?: string | number;
        paddingBlockEnd?: string | number;
        paddingBlockStart?: string | number;
        paddingBottom?: string | number;
        paddingInline?: string | number;
        paddingInlineEnd?: string | number;
        paddingInlineStart?: string | number;
        paddingLeft?: string | number;
        paddingRight?: string | number;
        paddingTop?: string | number;
        pageBreakAfter?: string | number;
        pageBreakBefore?: string | number;
        pageBreakInside?: string | number;
        paintOrder?: string | number;
        parentRule?: string | number;
        perspective?: string | number;
        perspectiveOrigin?: string | number;
        placeContent?: string | number;
        placeItems?: string | number;
        placeSelf?: string | number;
        pointerEvents?: string | number;
        position?: string | number;
        printColorAdjust?: string | number;
        quotes?: string | number;
        resize?: string | number;
        right?: string | number;
        rotate?: string | number;
        rowGap?: string | number;
        rubyPosition?: string | number;
        scale?: string | number;
        scrollBehavior?: string | number;
        scrollMargin?: string | number;
        scrollMarginBlock?: string | number;
        scrollMarginBlockEnd?: string | number;
        scrollMarginBlockStart?: string | number;
        scrollMarginBottom?: string | number;
        scrollMarginInline?: string | number;
        scrollMarginInlineEnd?: string | number;
        scrollMarginInlineStart?: string | number;
        scrollMarginLeft?: string | number;
        scrollMarginRight?: string | number;
        scrollMarginTop?: string | number;
        scrollPadding?: string | number;
        scrollPaddingBlock?: string | number;
        scrollPaddingBlockEnd?: string | number;
        scrollPaddingBlockStart?: string | number;
        scrollPaddingBottom?: string | number;
        scrollPaddingInline?: string | number;
        scrollPaddingInlineEnd?: string | number;
        scrollPaddingInlineStart?: string | number;
        scrollPaddingLeft?: string | number;
        scrollPaddingRight?: string | number;
        scrollPaddingTop?: string | number;
        scrollSnapAlign?: string | number;
        scrollSnapStop?: string | number;
        scrollSnapType?: string | number;
        scrollbarGutter?: string | number;
        shapeImageThreshold?: string | number;
        shapeMargin?: string | number;
        shapeOutside?: string | number;
        shapeRendering?: string | number;
        stopColor?: string | number;
        stopOpacity?: string | number;
        stroke?: string | number;
        strokeDasharray?: string | number;
        strokeDashoffset?: string | number;
        strokeLinecap?: string | number;
        strokeLinejoin?: string | number;
        strokeMiterlimit?: string | number;
        strokeOpacity?: string | number;
        strokeWidth?: string | number;
        tabSize?: string | number;
        tableLayout?: string | number;
        textAlign?: string | number;
        textAlignLast?: string | number;
        textAnchor?: string | number;
        textCombineUpright?: string | number;
        textDecoration?: string | number;
        textDecorationColor?: string | number;
        textDecorationLine?: string | number;
        textDecorationSkipInk?: string | number;
        textDecorationStyle?: string | number;
        textDecorationThickness?: string | number;
        textEmphasis?: string | number;
        textEmphasisColor?: string | number;
        textEmphasisPosition?: string | number;
        textEmphasisStyle?: string | number;
        textIndent?: string | number;
        textOrientation?: string | number;
        textOverflow?: string | number;
        textRendering?: string | number;
        textShadow?: string | number;
        textTransform?: string | number;
        textUnderlineOffset?: string | number;
        textUnderlinePosition?: string | number;
        touchAction?: string | number;
        transform?: string | number;
        transformBox?: string | number;
        transformOrigin?: string | number;
        transformStyle?: string | number;
        transition?: string | number;
        transitionDelay?: string | number;
        transitionDuration?: string | number;
        transitionProperty?: string | number;
        transitionTimingFunction?: string | number;
        translate?: string | number;
        unicodeBidi?: string | number;
        userSelect?: string | number;
        verticalAlign?: string | number;
        visibility?: string | number;
        webkitAlignContent?: string | number;
        webkitAlignItems?: string | number;
        webkitAlignSelf?: string | number;
        webkitAnimation?: string | number;
        webkitAnimationDelay?: string | number;
        webkitAnimationDirection?: string | number;
        webkitAnimationDuration?: string | number;
        webkitAnimationFillMode?: string | number;
        webkitAnimationIterationCount?: string | number;
        webkitAnimationName?: string | number;
        webkitAnimationPlayState?: string | number;
        webkitAnimationTimingFunction?: string | number;
        webkitAppearance?: string | number;
        webkitBackfaceVisibility?: string | number;
        webkitBackgroundClip?: string | number;
        webkitBackgroundOrigin?: string | number;
        webkitBackgroundSize?: string | number;
        webkitBorderBottomLeftRadius?: string | number;
        webkitBorderBottomRightRadius?: string | number;
        webkitBorderRadius?: string | number;
        webkitBorderTopLeftRadius?: string | number;
        webkitBorderTopRightRadius?: string | number;
        webkitBoxAlign?: string | number;
        webkitBoxFlex?: string | number;
        webkitBoxOrdinalGroup?: string | number;
        webkitBoxOrient?: string | number;
        webkitBoxPack?: string | number;
        webkitBoxShadow?: string | number;
        webkitBoxSizing?: string | number;
        webkitFilter?: string | number;
        webkitFlex?: string | number;
        webkitFlexBasis?: string | number;
        webkitFlexDirection?: string | number;
        webkitFlexFlow?: string | number;
        webkitFlexGrow?: string | number;
        webkitFlexShrink?: string | number;
        webkitFlexWrap?: string | number;
        webkitJustifyContent?: string | number;
        webkitLineClamp?: string | number;
        webkitMask?: string | number;
        webkitMaskBoxImage?: string | number;
        webkitMaskBoxImageOutset?: string | number;
        webkitMaskBoxImageRepeat?: string | number;
        webkitMaskBoxImageSlice?: string | number;
        webkitMaskBoxImageSource?: string | number;
        webkitMaskBoxImageWidth?: string | number;
        webkitMaskClip?: string | number;
        webkitMaskComposite?: string | number;
        webkitMaskImage?: string | number;
        webkitMaskOrigin?: string | number;
        webkitMaskPosition?: string | number;
        webkitMaskRepeat?: string | number;
        webkitMaskSize?: string | number;
        webkitOrder?: string | number;
        webkitPerspective?: string | number;
        webkitPerspectiveOrigin?: string | number;
        webkitTextFillColor?: string | number;
        webkitTextSizeAdjust?: string | number;
        webkitTextStroke?: string | number;
        webkitTextStrokeColor?: string | number;
        webkitTextStrokeWidth?: string | number;
        webkitTransform?: string | number;
        webkitTransformOrigin?: string | number;
        webkitTransformStyle?: string | number;
        webkitTransition?: string | number;
        webkitTransitionDelay?: string | number;
        webkitTransitionDuration?: string | number;
        webkitTransitionProperty?: string | number;
        webkitTransitionTimingFunction?: string | number;
        webkitUserSelect?: string | number;
        whiteSpace?: string | number;
        widows?: string | number;
        willChange?: string | number;
        wordBreak?: string | number;
        wordSpacing?: string | number;
        wordWrap?: string | number;
        writingMode?: string | number;
        zIndex?: string | number;
        getPropertyPriority?: string | number;
        getPropertyValue?: string | number;
        removeProperty?: string | number;
        setProperty?: string | number;
    } | {
        [x: string]: string | number;
    };
    attr?: {
        [x: string]: string;
    };
    event?: {
        input?: (arg0: Event) => void;
        progress?: (arg0: Event) => void;
        error?: (arg0: Event) => void;
        pause?: (arg0: Event) => void;
        play?: (arg0: Event) => void;
        waiting?: (arg0: Event) => void;
        abort?: (arg0: Event) => void;
        cancel?: (arg0: Event) => void;
        ended?: (arg0: Event) => void;
        resize?: (arg0: Event) => void;
        copy?: (arg0: Event) => void;
        toggle?: (arg0: Event) => void;
        select?: (arg0: Event) => void;
        fullscreenchange?: (arg0: Event) => void;
        fullscreenerror?: (arg0: Event) => void;
        cut?: (arg0: Event) => void;
        paste?: (arg0: Event) => void;
        animationcancel?: (arg0: Event) => void;
        animationend?: (arg0: Event) => void;
        animationiteration?: (arg0: Event) => void;
        animationstart?: (arg0: Event) => void;
        auxclick?: (arg0: Event) => void;
        beforeinput?: (arg0: Event) => void;
        blur?: (arg0: Event) => void;
        canplay?: (arg0: Event) => void;
        canplaythrough?: (arg0: Event) => void;
        change?: (arg0: Event) => void;
        click?: (arg0: Event) => void;
        close?: (arg0: Event) => void;
        compositionend?: (arg0: Event) => void;
        compositionstart?: (arg0: Event) => void;
        compositionupdate?: (arg0: Event) => void;
        contextmenu?: (arg0: Event) => void;
        cuechange?: (arg0: Event) => void;
        dblclick?: (arg0: Event) => void;
        drag?: (arg0: Event) => void;
        dragend?: (arg0: Event) => void;
        dragenter?: (arg0: Event) => void;
        dragleave?: (arg0: Event) => void;
        dragover?: (arg0: Event) => void;
        dragstart?: (arg0: Event) => void;
        drop?: (arg0: Event) => void;
        durationchange?: (arg0: Event) => void;
        emptied?: (arg0: Event) => void;
        focus?: (arg0: Event) => void;
        focusin?: (arg0: Event) => void;
        focusout?: (arg0: Event) => void;
        formdata?: (arg0: Event) => void;
        gotpointercapture?: (arg0: Event) => void;
        invalid?: (arg0: Event) => void;
        keydown?: (arg0: Event) => void;
        keypress?: (arg0: Event) => void;
        keyup?: (arg0: Event) => void;
        load?: (arg0: Event) => void;
        loadeddata?: (arg0: Event) => void;
        loadedmetadata?: (arg0: Event) => void;
        loadstart?: (arg0: Event) => void;
        lostpointercapture?: (arg0: Event) => void;
        mousedown?: (arg0: Event) => void;
        mouseenter?: (arg0: Event) => void;
        mouseleave?: (arg0: Event) => void;
        mousemove?: (arg0: Event) => void;
        mouseout?: (arg0: Event) => void;
        mouseover?: (arg0: Event) => void;
        mouseup?: (arg0: Event) => void;
        playing?: (arg0: Event) => void;
        pointercancel?: (arg0: Event) => void;
        pointerdown?: (arg0: Event) => void;
        pointerenter?: (arg0: Event) => void;
        pointerleave?: (arg0: Event) => void;
        pointermove?: (arg0: Event) => void;
        pointerout?: (arg0: Event) => void;
        pointerover?: (arg0: Event) => void;
        pointerup?: (arg0: Event) => void;
        ratechange?: (arg0: Event) => void;
        reset?: (arg0: Event) => void;
        scroll?: (arg0: Event) => void;
        securitypolicyviolation?: (arg0: Event) => void;
        seeked?: (arg0: Event) => void;
        seeking?: (arg0: Event) => void;
        selectionchange?: (arg0: Event) => void;
        selectstart?: (arg0: Event) => void;
        slotchange?: (arg0: Event) => void;
        stalled?: (arg0: Event) => void;
        submit?: (arg0: Event) => void;
        suspend?: (arg0: Event) => void;
        timeupdate?: (arg0: Event) => void;
        touchcancel?: (arg0: Event) => void;
        touchend?: (arg0: Event) => void;
        touchmove?: (arg0: Event) => void;
        touchstart?: (arg0: Event) => void;
        transitioncancel?: (arg0: Event) => void;
        transitionend?: (arg0: Event) => void;
        transitionrun?: (arg0: Event) => void;
        transitionstart?: (arg0: Event) => void;
        volumechange?: (arg0: Event) => void;
        webkitanimationend?: (arg0: Event) => void;
        webkitanimationiteration?: (arg0: Event) => void;
        webkitanimationstart?: (arg0: Event) => void;
        webkittransitionend?: (arg0: Event) => void;
        wheel?: (arg0: Event) => void;
    } | {
        [x: string]: (arg0: Event) => void;
    };
    child?: Array<EDObj | NElement<any>>;
    assembly?: Array<(arg0: NElement<any>) => void | NElement<any>>;
};

/**
 * 指针数据
 * 当发生鼠标或触摸事件时传递
 * 包含指针坐标和按下状态等数据
 */
declare class PointerData {
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} vx
     * @param {number} vy
     * @param {number} sx
     * @param {number} sy
     * @param {boolean} hold
     * @param {boolean} pressing
     */
    constructor(x: number, y: number, vx: number, vy: number, sx: number, sy: number, hold: boolean, pressing: boolean);
    /**
     * 当前指针位置x
     * @type {number}
    */
    x: number;
    /**
     * 当前指针位置y
     * @type {number}
    */
    y: number;
    /**
     * 指针位置和上次位置的变化x
     * @type {number}
    */
    vx: number;
    /**
     * 指针位置和上次位置的变化y
     * @type {number}
    */
    vy: number;
    /**
     * 此指针的起始位置x
     * @type {number}
    */
    sx: number;
    /**
     * 此指针的起始位置y
     * @type {number}
    */
    sy: number;
    /**
     * 当前此指针是否处于按下状态
     * @type {boolean}
    */
    hold: boolean;
    /**
     * 当前指针是否正在按下(按下事件)
     * @type {boolean}
    */
    pressing: boolean;
}

/**
 * 鼠标(拖拽)事件处理
 * @param {NElement} element 绑定到元素
 * @param {function(PointerData):void} callBack 回调
 * @param {number} [button] 绑定的按键
 */
declare function mouseBind(element: NElement<any>, callBack: (arg0: PointerData) => void, button?: number | undefined): void;

/**
 * 触摸(拖拽) 事件处理
 * @param {NElement} element
 * @param {function(PointerData):void} callBack
 */
declare function touchBind(element: NElement<any>, callBack: (arg0: PointerData) => void): void;

/**
 * 包装为仅能执行一次的函数
 * @template P
 * @template R
 * @template {function(...P) : R} T
 * @param {T} func
 * @returns {T}
 */
declare function runOnce<P, R, T extends (...arg0: P[]) => R>(func: T): T;

/**
 * 异步延迟
 * 将创建一个Promise并在指定延迟时间后解决
 * @param {number} time 单位:毫秒
 * @returns {Promise<void>}
 */
declare function delayPromise(time: number): Promise<void>;

/**
 * 事件处理器
 * 可以定多个事件响应函数
 * @template {*} T
 */
declare class EventHandler<T extends unknown> {
    /**
     * 回调列表
     * @type {Array<function(T): void>}
     */
    cbList: Array<(arg0: T) => void>;
    /**
     * 单次回调列表
     * @type {Array<function(T): void>}
     */
    onceCbList: Array<(arg0: T) => void>;
    /**
     * 添加响应函数
     * @param {function(T): void} cb
     */
    add(cb: (arg0: T) => void): void;
    /**
     * 添加单次响应函数
     * 触发一次事件后将不再响应
     * @param {function(T): void} cb
     */
    addOnce(cb: (arg0: T) => void): void;
    /**
     * 返回一个Primise
     * 下次响应时此primise将解决
     * @returns {Promise<T>}
     */
    oncePromise(): Promise<T>;
    /**
     * 移除响应函数
     * @param {function(T): void} cb
     */
    remove(cb: (arg0: T) => void): void;
    /**
     * 移除所有响应函数
     */
    removeAll(): void;
    /**
     * 触发事件
     * @param {T} e
     */
    trigger(e: T): void;
    /**
     * 存在监听器
     * @returns {boolean}
     */
    existListener(): boolean;
    #private;
}

/**
 * 左右方向分割
 * @param {string} leftSize
 * @param {NElement | import("./expandElement").EDObj} a
 * @param {NElement | import("./expandElement").EDObj} b
 * @returns {NElement}
 */
declare function divideLayout_LR(leftSize: string, a: NElement<any> | EDObj, b: NElement<any> | EDObj): NElement<any>;
/**
 * 上下方向分割
 * @param {string} upSize
 * @param {NElement | import("./expandElement").EDObj} a
 * @param {NElement | import("./expandElement").EDObj} b
 * @returns {NElement}
 */
declare function divideLayout_UD(upSize: string, a: NElement<any> | EDObj, b: NElement<any> | EDObj): NElement<any>;
/**
 * 右左方向分割
 * @param {string} rightSize
 * @param {NElement | import("./expandElement").EDObj} a
 * @param {NElement | import("./expandElement").EDObj} b
 * @returns {NElement}
 */
declare function divideLayout_RL(rightSize: string, a: NElement<any> | EDObj, b: NElement<any> | EDObj): NElement<any>;
/**
 * 下上方向分割
 * @param {string} downSize
 * @param {NElement | import("./expandElement").EDObj} a
 * @param {NElement | import("./expandElement").EDObj} b
 * @returns {NElement}
 */
declare function divideLayout_DU(downSize: string, a: NElement<any> | EDObj, b: NElement<any> | EDObj): NElement<any>;

/**
 * 解析标签
 * 默认为div标签
 * @param {TemplateStringsArray} strings
 * @param {Array<parsingElementKeysType>} keys
 * @returns {NElement}
 */
declare function tag(strings: TemplateStringsArray, ...keys: Array<parsingElementKeysType>): NElement<any>;
/**
 * 解析指定标签名的标签
 * @param {string} name
 * @returns {function(TemplateStringsArray, ...parsingElementKeysType): NElement}
 */
declare function tagName(name: string): (arg0: TemplateStringsArray, ...args: parsingElementKeysType[]) => NElement<any>;
/**
 * 解析标签
 */
type parsingElementKeysType = NElement<any> | NStyle<any> | NEvent<any>;

/**
 * 创建对象的代理
 * @template {object} T
 * @param {T} srcObj
 * @returns {T}
 */
declare function createHookObj<T extends unknown>(srcObj: T): T;
/**
 * 获取代理对象中指定值的绑定信息
 * @template {Object} T
 * @param {T} proxyObj
 * @param {[(keyof T) | (string & {}) | symbol] | [((keyof T) | (string & {}) | symbol), ...Array<(keyof T) | (string & {}) | symbol>, function(...any): any]} keys
 * @returns {HookBindInfo}
 */
declare function bindValue<T extends unknown>(proxyObj: T, ...keys: [symbol | (string & {}) | keyof T] | [symbol | (string & {}) | keyof T, ...(symbol | (string & {}) | keyof T)[], (...arg0: any[]) => any]): HookBindInfo;

/**
 * 数组钩子绑定类
 */
declare class ArrayHookBind {
    /**
     * @param {typeof ArrayHookBind.prototype.callback} callback
     */
    constructor(callback: typeof ArrayHookBind.prototype.callback);
    /**
     * 回调函数的弱引用
     * @type {WeakRef<typeof ArrayHookBind.prototype.callback>}
     */
    cbRef: WeakRef<{
        /** @type {(index: number, value: any) => void} */
        set: (index: number, value: any) => void;
        /** @type {(index: number, value: any) => void} */
        add: (index: number, value: any) => void;
        /** @type {(index: number) => void} */
        del: (index: number) => void;
    }>;
    /**
     * 回调函数
     * 当此钩子绑定自动释放时为null
     */
    callback: {
        /** @type {(index: number, value: any) => void} */
        set: (index: number, value: any) => void;
        /** @type {(index: number, value: any) => void} */
        add: (index: number, value: any) => void;
        /** @type {(index: number) => void} */
        del: (index: number) => void;
    };
    /**
     * 触发此钩子 (设置)
     * @param {number} index
     * @param {any} value
     */
    emitSet(index: number, value: any): void;
    /**
     * 触发此钩子 (增加)
     * @param {number} index
     * @param {any} value
     */
    emitAdd(index: number, value: any): void;
    /**
     * 触发此钩子 (删除)
     * @param {number} index
     */
    emitDel(index: number): void;
    /**
     * 销毁此钩子
     * 销毁后钩子将不再自动触发
     */
    destroy(): void;
    /**
     * 绑定销毁
     * 当目标对象释放时销毁
     * @param {object} targetObj
     * @returns {ArrayHookBind} 返回自身
     */
    bindDestroy(targetObj: object): ArrayHookBind;
}

/**
 * 创建数组的代理
 * @template {Array} T
 * @param {T} srcArray
 * @returns {T}
 */
declare function createHookArray<T extends any[]>(srcArray: T): T;
/**
 * 绑定数组的代理
 * 回调函数中不应当进行可能触发钩子的操作
 * @template {Array} T
 * @param {T} proxyArray
 * @param {{
 *  set?: (index: number, value: any) => void;
 *  add: (index: number, value: any) => void;
 *  del: (index: number) => void;
 * }} callbacks
 * @param {{ noSet?: boolean, addExisting?: boolean }} [option]
 * @returns {ArrayHookBind}
 */
declare function bindArrayHook<T extends any[]>(proxyArray: T, callbacks: {
    set?: (index: number, value: any) => void;
    add: (index: number, value: any) => void;
    del: (index: number) => void;
}, option?: {
    noSet?: boolean;
    addExisting?: boolean;
} | undefined): ArrayHookBind;

type NList_list = NList_list$1;

export { EventHandler, NAsse, NAttr, NElement, NEvent, NList, NList_list, NStyle, NTagName, bindArrayHook, bindAttribute, bindValue, createHookArray, createHookObj, createNStyle, createNStyleList, cssG, delayPromise, divideLayout_DU, divideLayout_LR, divideLayout_RL, divideLayout_UD, expandElement, getNElement, mouseBind, runOnce, tag, tagName, touchBind };
