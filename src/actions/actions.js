// on App.js
export const populateApp = (xmlData, hash) => {
    return {
        type: 'POPULATE_APP',
        xmlData,
        hash,
    }
}

export const checkUserLoggedIn = (data) => {
    return {
        type: 'CHECK_LOGGED_IN_USER',
        data,
    }
}

// on HeaderContainer.js
export const showMenuLayer = () => {
    return {
        type: 'SHOW_MENU_LAYER',
    }
}

export const showSidebarRight = () => {
    return {
        type: 'SHOW_SIDEBAR_RIGHT',
    }
}

// on HelpContainer.js
export const hideHelp = () => {
    return {
        type: 'HIDE_HELP',
    }
}

// on LayerStylesCarousel.js
export const slideLeftStyles = item => {
    return {
        type: 'SLIDE_LEFT_STYLES',
        id: item.id,
    }
}

export const slideRightStyles = item => {
    return {
        type: 'SLIDE_RIGHT_STYLES',
        id: item.id,
    }
}

export const selectLayerStyle = (item, styleId) => {
    return {
        type: 'SELECT_LAYER_STYLE',
        id: item.id,
        styleId,
    }
}

//on LeafletMapContainer.js
export const populateStateWithLayerData = data => {
    return {
        type: 'POPULATE_STATE_WITH_LAYER_DATA',
        data,
    }
}

export const updateLastClickData = data => {
    return {
        type: 'UPDATE_LAST_CLICK_DATA',
        data,
    }
}

export const updateBasemapLoadingStatus = () => {
    return {
        type: 'UPDATE_BASEMAP_LOADING_STATUS',
    }
}

export const lastMapPosition = data => {
    return {
        type: 'LAST_MAP_POSITION',
        data,
    }
}

export const populateStateWithPolygonData = data => {
    return {
        type: 'POPULATE_STATE_WITH_POLYGON_DATA',
        data,
    }
}

export const showStreetView = data => {
    return {
        type: 'SHOW_STREET_VIEW',
        data,
    }
}

export const hideStreetView = () => {
    return {
        type: 'HIDE_STREET_VIEW',
    }
}

export const removePolygonData = () => {
    return {
        type: 'REMOVE_POLYGON_DATA'
    }
}

export const startPolygonDataRequest = () => {
    return {
        type: 'START_POLYGON_DATA_REQUEST'
    }
}

// on MenuContainer.js
export const toggleLayer = item => {
    return {
        type: 'TOGGLE_LAYER',
        id: item.id,
    }
}

export const toggleMenu = item => {
    return {
        type: 'TOGGLE_MENU',
        id: item.id,
        selected: item.selected,
    }
}

export const untoggleAll = () => {
    return {
        type: 'UNTOGGLE_MENUS',
    }
}

export const showDescription = (layer, sidebarLeftWidth, mouseY) => {
    return {
        type: 'SHOW_DESCRIPTION',
        id: layer.id,
        sidebarLeftWidth,
        mouseY,
    }
}

export const hideDescription = layer => {
    return {
        type: 'HIDE_DESCRIPTION',
        id: layer.id,
    }
}

export const updateScrollTop = scrollTop => {
    return {
        type: 'UPDATE_SCROLL_TOP',
        scrollTop,
    }
}

// on SidebarLeftContainer.js
export const closeToolbars = () => {
    return {
        type: 'CLOSE_TOOLBARS',
    }
}

export const searchLayer = text => {
    return {
        type: 'SEARCH_LAYER',
        text,
    }
}

export const cleanSearch = () => {
    return {
        type: 'CLEAN_SEARCH',
    }
}

export const hideMenuLayer = () => {
    return {
        type: 'HIDE_MENU_LAYER',
    }
}

// on SidebarRightContainer.js
export const hideSidebarRight = () => {
    return {
        type: 'HIDE_SIDEBAR_RIGHT',
    }
}

export const toggleLayerInformation = item => {
    return {
        type: 'TOGGLE_LAYER_INFORMATION',
        id: item.id,
    }
}

export const slideLayerUp = item => {
    return {
        type: 'SLIDE_LAYER_UP',
        id: item.id,
    }
}

export const slideLayerDown = item => {
    return {
        type: 'SLIDE_LAYER_DOWN',
        id: item.id,
    }
}

export const dropLayer = (dragged, target) => {
    return {
        type: 'DROP_LAYER',
        draggedPosition: dragged.order,
        targetPosition: target.order,
    }
}

export const removeAllLayers = () => {
    return {
        type: 'REMOVE_ALL_LAYERS',
    }
}

export const clearLayerFilter = layer => {
    return {
        type: 'CLEAR_LAYER_FILTER',
        layer,
    }
}

export const openLayerFilterModal = layer => {
    return {
        type: 'OPEN_LAYER_FILTER_MODAL',
        layer,
    }
}

export const openModal = layer => {
    return {
        type: 'OPEN_MODAL',
        layer,
    }
}

export const onIconMouseOver = layer => {
    return {
        type: 'ICON_MOUSE_OVER',
        id: layer.id,
    }
}

export const onIconMouseOut = layer => {
    return {
        type: 'ICON_MOUSE_OUT',
        id: layer.id,
    }
}

export const onLoadingParams = layer => {
    return {
        type: 'LOADING_PARAMS',
        id: layer.id,
    }
}

export const onLoadParams = (layer, params) => {
    return {
        type: 'LOAD_PARAMS',
        id: layer.id,
        params,
    }
}

// on ModalContainer.js
export const closeModal = () => {
    return {
        type: 'CLOSE_MODAL',
    }
}

export const getModalData = data => {
    return {
        type: 'GET_MODAL_DATA',
        data,
    }
}

export const changeActiveTab = layer => {
    return {
        type: 'CHANGE_ACTIVE_TAB',
        layer,
    }
}

export const loginUser = data => {
    return {
        type: 'LOGIN_USER',
        data,
    }
}

export const layerFilterLoading = (layer, parameterKey, parameterValue) => {
    return {
        type: 'LAYER_FILTER_LOADING',
        layer,
        parameterKey,
        parameterValue,
    }
}

export const layerFilterLoaded = data => {
    return {
        type: 'LAYER_FILTER_LOADED',
        data,
    }
}

// On Pagination
export const paginate = (layer, page) => {
    return {
        type: 'PAGINATE',
        layer,
        page,
    }
}

// plugins
export const sinalidData = data => {
    return {
        type: 'SINALID_DATA',
        data,
    }
}
