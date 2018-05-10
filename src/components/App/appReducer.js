import geoServerXmlReducer from './reducers/geoServerXmlReducer'
import menuReducer from '../Menu/menuReducer'
import placesMock from './mocks/placesMock.json'
import tutelaMock from './mocks/tutela.json'
import BASE_MAPS_MOCK  from './mocks/baseMapsMock'
import ScaAPI from '../Api/ScaAPI.js'

const CRAAI = 'CRAAI'
const ESTADO_ID = '0'
const ENV_DEV = process.env.NODE_ENV === 'mock'
const LAYER_FILTER_REGEX = /\(.*\|.*\)/

const togglePlace = (place, id) => {
    if ((place.id === id) && id !== ESTADO_ID) {
        place.nodes.forEach((p) => {
            p.show = p.show ? !p.show : true
        })
        return place
    } else if (place.nodes.length > 0) {
        var placeFound = null

        for (var i = 0; placeFound === null && i < place.nodes.length; i++) {
            placeFound = togglePlace(place.nodes[i], id)
        }
        return placeFound
    }
    return null
}

const toggleTutela = (tutela, id) => {
    if ((tutela.id === id) && id !== ESTADO_ID) {
        tutela.nodes.forEach((p) => {
            p.show = p.show ? !p.show : true
        })
        return tutela
    } else if (tutela.nodes.length > 0) {
        var tutelaFound = null

        for (var i = 0; tutelaFound === null && i < tutela.nodes.length; i++) {
            tutelaFound = togglePlace(tutela.nodes[i], id)
        }
        return tutelaFound
    }
    return null
}

const searchPlaceById = (place, id) => {
    if (place.id === id) {
        return place
    } else if (place.nodes.length > 0) {
        var placeFound = null

        for (var i = 0; placeFound === null && i < place.nodes.length; i++) {
            placeFound = searchPlaceById(place.nodes[i], id)
        }
        return placeFound
    }
    return null
}

const hideRestrictedLayers = (layer, loggedStatus) => {
    // check if user is not logged
    if (!loggedStatus && layer.restricted) {
        return {
            ...layer,
            selected: false,
            match: false,
            showDescription: false,
            selectedLayerStyleId: 0,
        }
    } else {
        return layer
    }
}

const appReducer = (state = {}, action) => {
    switch (action.type) {
        case 'POPULATE_APP':
            // parse layers from GeoServer
            let originalLayers = geoServerXmlReducer(action.xmlData.xmlData)
            let places = placesMock
            let tutela = tutelaMock

            let layers = originalLayers
            let loginStatus = false

            let storedLoginStatus = localStorage.getItem('loginStatus')
            if (storedLoginStatus) {
                try {
                    storedLoginStatus = JSON.parse(storedLoginStatus)
                    loginStatus = storedLoginStatus

                } catch (e) {
                    console.error('stored loginStatus data is corrupt', e)
                }
            }

            layers = layers.map(l => {
                return hideRestrictedLayers(
                    {
                        ...l,
                        selected: false,
                        match: true,
                        showDescription: false,
                        selectedLayerStyleId: 0,
                    },
                    loginStatus
                )
            })

            let menuItems = menuReducer(layers)
            menuItems = menuItems.map(m => {
                return hideRestrictedLayers(
                    {
                        ...m,
                        selected: false,
                        match: true,
                    },
                    loginStatus
                )
            })

            let tooltip = {
                text: '',
                show: false,
                sidebarLeftWidth: 0,
                top: 0,
            }

            let showMenu = false
            let showSidebarRight = false
            // parse the querystring/hash, if present
            let coordinates = __INITIAL_MAP_COORDINATES__
            let currentMap
            let placeToCenter

            if (action.hash) {
                // drop the initial #
                let hashString = action.hash.replace('#', '')

                // split by each parameter
                let paramsObj = hashString.split('&').reduce((params, param) => {
                    let [key, value] = param.split('=')
                    params[key] = value ? decodeURIComponent(value.replace(/\+/g, ' ')) : ''
                    // split layers
                    if (key === 'layers') {
                        params[key] = value.split(',')
                    }
                    return params
                }, {})

                // if we have valid lat, lng & zoom params
                if (paramsObj.lat && paramsObj.lng && paramsObj.zoom) {
                    coordinates = {
                        lat: parseFloat(paramsObj.lat) || 0,
                        lng: parseFloat(paramsObj.lng) || 0,
                        zoom: parseInt(paramsObj.zoom) || 0,
                    }
                }

                // if we have valid basemap param
                if (paramsObj.basemap) {
                    currentMap = {
                        name: paramsObj.basemap,
                    }
                }

                // if we have valid layers param
                if (paramsObj.layers) {
                    // open sidebars
                    showMenu = true
                    showSidebarRight = true

                    // for every active layer
                    paramsObj.layers.forEach((activeLayer, index) => {
                        // split layer and style
                        let activeLayerParams = activeLayer.split(':')
                        let activeLayerName = activeLayerParams[0]
                        let activeStyleName = activeLayerParams[1].replace(LAYER_FILTER_REGEX, '')
                        let activeLayerFilter = activeLayerParams[1].match(LAYER_FILTER_REGEX)

                        // find this active layer on layers array
                        layers = layers.map(l => {
                            let selected = l.selected
                            let order = null
                            let showInformation = undefined
                            let selectedLayerStyleId = l.selectedLayerStyleId

                            // and activate it
                            if (l.id === activeLayerName) {
                                selected = true
                                showInformation = true
                                order = index

                                // select chosen style
                                let selectedStyle = l.styles.filter(s => s.name === 'plataforma:' + activeStyleName)
                                selectedLayerStyleId = selectedStyle[0].id

                                // select filter for later loading
                                if (activeLayerFilter !== null && activeLayerFilter.length) {
                                    let activeLayerFilterParams = activeLayerFilter[0]
                                        .replace('(', '')
                                        .replace(')', '')
                                        .split('|')
                                    l.filterKey = activeLayerFilterParams[0]
                                    l.filterValue = activeLayerFilterParams[1]
                                }
                            }
                            return {
                                ...l,
                                selected,
                                order,
                                showInformation,
                                selectedLayerStyleId,
                            }
                        })
                    })
                }

                // if we have valid placeToCenter param
                if (paramsObj.orgao) {
                    let orgaoToCenter
                    tutela.map(estado => {
                        estado.nodes.map(tut => {
                            tut.nodes.map(orgao => {
                                if (orgao.id === paramsObj.orgao) {
                                    orgaoToCenter = orgao
                                }
                            })
                        })
                    })
                    if (orgaoToCenter) {
                        placeToCenter = orgaoToCenter
                    }
                }
                if (paramsObj.craai) {
                    let regionToCenter
                    places.map(estado => {
                        estado.nodes.map(craai => {
                            if (craai.cd_craai == paramsObj.craai) {
                                // found craai
                                if (paramsObj.municipio) {
                                    // there is municipio, keep looking
                                    craai.nodes.map(municipio => {
                                        if (municipio.cd_municipio == paramsObj.municipio) {
                                            // found municipio
                                            if (paramsObj.bairro) {
                                                // there is bairro, keep looking
                                                municipio.nodes.map(bairro => {
                                                    if (bairro.cd_bairro == paramsObj.bairro) {
                                                        // found bairro
                                                        regionToCenter = bairro
                                                    }
                                                })
                                            } else {
                                                // there is no bairro, focus on municipio
                                                regionToCenter = municipio
                                            }
                                        }
                                    })
                                } else {
                                    // there is no municipio, focus on craai
                                    regionToCenter = craai
                                }
                            }
                        })
                    })

                    if (regionToCenter) {
                        placeToCenter = regionToCenter
                    }
                }
            }

            const DEFAULT_MAP = {
                name: 'osm-mapbox-light',
            }

            let baseMaps = BASE_MAPS_MOCK

            let storedBaseMap = localStorage.getItem('lastBaseMap')
            if (storedBaseMap) {
                try {
                    storedBaseMap = JSON.parse(storedBaseMap)
                } catch (e) {
                    console.error('stored lastBaseMap data is corrupt', e)
                }
            }

            let mapProperties = {
                initialCoordinates: coordinates,
                currentMap: storedBaseMap || currentMap || DEFAULT_MAP,
                placeToCenter,
                opacity: .5,
            }
            var newsTimestamp = window.localStorage.getItem('newsTimestamp')
            var lastValidTimestamp = '1505847454072'

            // Object to be returned

            var _return = {
                currentLevel: 0,
                layers,
                menuItems,
                showMenu,
                showSidebarRight,
                tooltip,
                searchString: '',
                mapProperties,
                scrollTop: 0,
                places,
                tutela,
                baseMaps,
                showPolygonDraw: true,
                showLoader: false,
                showTooltipMenu: true,
                loginStatus,
                loginError: null,
                globalFilterType: 'places',
            }

            // Check if content from localstorage is equal to last timestamp
            if (newsTimestamp === lastValidTimestamp) {
                // Don't show news modal
                return {
                    ..._return,
                    newsModal: false,
                }
            }

            return {
                ..._return,
                newsModal: true,
                showModal: true,
            }

        case 'TOGGLE_LAYER':
            var newLayers = []
            var showSidebarRight = false
            newLayers = state.layers.map(l => layer(l, action, state.layers))
            for (var i = 0; i < newLayers.length; i++) {
                var l = newLayers[i]
                if (l.selected) {
                    showSidebarRight = true
                }
            }
            return {
                ...state,
                layers: newLayers,
                showSidebarRight,
            }
        case 'TOGGLE_LAYER_INFORMATION':
        case 'SLIDE_LEFT_STYLES':
        case 'SLIDE_RIGHT_STYLES':
            var newLayers = []
            newLayers = state.layers.map(l => layer(l, action, state.layers))
            return {
                ...state,
                layers: newLayers,
            }
        case 'SLIDE_LAYER_UP':
            var newLayers = state.layers

            var myPosition
            var arrayBiggerThanMe = []
            var immediatelyBiggerThanMe
            var auxOrder

            // find this item
            for (var i=0, l=newLayers.length; i<l; i++) {
                if (newLayers[i].id === action.id) {
                    myPosition = i
                }
            }
            // find items with order higher than this item
            for (var j=0; j<l; j++) {
                if (newLayers[j].order !== undefined && newLayers[j].order > newLayers[myPosition].order) {
                    arrayBiggerThanMe.push(j)
                }
            }
            // if there are items with order higher than this item
            if (arrayBiggerThanMe.length > 0) {
                // sort them
                arrayBiggerThanMe.sort(function(a, b) {
                    return newLayers[a].order - newLayers[b].order
                })
                // selects the first higher one
                immediatelyBiggerThanMe = arrayBiggerThanMe[0]
                // swap them
                auxOrder = newLayers[myPosition].order
                newLayers[myPosition].order = newLayers[immediatelyBiggerThanMe].order
                newLayers[immediatelyBiggerThanMe].order = auxOrder
            }

            return {
                ...state,
                layers: newLayers,
            }
        case 'SLIDE_LAYER_DOWN':
            var newLayers = state.layers;

            var myPosition
            var arraySmallerThanMe = []
            var immediatelySmallerThanMe
            var auxOrder

            // find this item
            for (var i=0, l=newLayers.length; i<l; i++) {
                if (newLayers[i].id === action.id) {
                    myPosition = i
                }
            }
            // find items with order smaller than this item
            for (var j=0; j<l; j++) {
                if (newLayers[j].order !== undefined && newLayers[j].order < newLayers[myPosition].order) {
                    arraySmallerThanMe.push(j)
                }
            }
            // if there are items with order smaller than this item
            if (arraySmallerThanMe.length > 0) {
                // sort them
                arraySmallerThanMe.sort(function(a, b) {
                    return newLayers[b].order - newLayers[a].order
                })
                // selects the first smaller one
                immediatelySmallerThanMe = arraySmallerThanMe[0]
                // swap them
                auxOrder = newLayers[myPosition].order
                newLayers[myPosition].order = newLayers[immediatelySmallerThanMe].order
                newLayers[immediatelySmallerThanMe].order = auxOrder
            }

            return {
                ...state,
                layers: newLayers,
            }
        case 'DROP_LAYER':
            var draggedPosition = action.draggedPosition
            var targetPosition = action.targetPosition
            var newLayers = state.layers
            for (var i = 0; i < newLayers.length; i++) {
                if (typeof newLayers[i].order === 'number' && newLayers[i].order === draggedPosition) {
                    // found dragged layer
                    if (targetPosition > draggedPosition) {
                        // UP
                        // Move others down
                        for (var k = 0; k < newLayers.length; k++) {
                            if (typeof newLayers[k].order === 'number' && (newLayers[k].order <= targetPosition && newLayers[k].order > draggedPosition)) {
                                // found layers that need to be changed
                                newLayers[k].order--
                            }
                        }
                    } else {
                        // DOWN
                        // Move others up
                        for (var k = 0; k < newLayers.length; k++) {
                            if (typeof newLayers[k].order === 'number' && (newLayers[k].order >= targetPosition && newLayers[k].order < draggedPosition)) {
                                // found layers that need to be changed
                                newLayers[k].order++
                            }
                        }
                    }
                    newLayers[i].order = targetPosition
                    break
                }
            }
            return {
                ...state,
                layers: newLayers,
            }
        case 'SELECT_LAYER_STYLE':
            var newLayers = []
            newLayers = state.layers.map(l => {
                if (l.id !== action.id) {
                    return l
                }
                return {
                    ...l,
                    selectedLayerStyleId: action.styleId,
                };
            })
            return {
                ...state,
                layers: newLayers,
            }
        case 'TOGGLE_MENU':
            let currentLevel = state.currentLevel
            var newLayers = []

            // make a copy of the state
            var newMenuItems = [...state.menuItems]

            // if i'm closing
            if (action.selected === true) {
                // find myself
                newMenuItems.forEach(menuItem => {
                    if (menuItem.id === action.id) {
                        // if i have children
                        if (menuItem.submenus.length > 0) {
                            // close my children
                            menuItem.submenus.forEach(submenu => {
                                // find this submenu in menus array
                                newMenuItems.forEach(thisMenuItem => {
                                    if (thisMenuItem.idMenu === submenu) {
                                        // close it
                                        thisMenuItem.selected = false
                                    }
                                })
                            })
                        } else {
                            // i don't have children, close myself
                            newMenuItems = newMenuItems.map(m => menuItem(m, action, state.currentLevel, state.loginStatus))
                        }
                    }
                })
            } else {
                // if i'm opening, do it right away
                newMenuItems = newMenuItems.map(m => menuItem(m, action, state.currentLevel, state.loginStatus))
            }
            if (action.selected) {
                currentLevel--
            } else {
                currentLevel++
            }
            return {
                ...state,
                currentLevel,
                menuItems: newMenuItems,
            };
        case 'UNTOGGLE_MENUS':
            var newMenuItems = state.menuItems.map(m => menuItem(m, action, null, state.loginStatus))
            return {
                ...state,
                currentLevel: 0,
                menuItems: newMenuItems,
            }
        case 'CLOSE_TOOLBARS':
            return {
                ...state,
                toolbarActive: null,
            }
        case 'SEARCH_LAYER':
            var newLayers = state.layers.map(l => searchLayer(l, action, state.loginStatus))
            var filteredLayers = newLayers.filter(layer => layer.match)
            var newMenuItems = []
            var searchString = action.text
            if (action.text === '') {
                // when emptying search, return all items
                newMenuItems = state.menuItems.map(m => {
                    return hideRestrictedLayers(
                        {
                            ...m,
                            match: true,
                            searchString,
                        },
                        state.loginStatus
                    )
                })
            } else {
                newMenuItems = state.menuItems.map(m => searchMenuItem(m, filteredLayers, state.menuItems, state.loginStatus))
            }
            return {
                ...state,
                layers: newLayers,
                menuItems: newMenuItems,
                searchString,
            }
        case 'CLEAN_SEARCH':
            return {
                ...state,
                searchString: '',
            }
        case 'SHOW_DESCRIPTION':
            var layerResult = state.layers.find(l => layer(l, action))
            var newTooltip
            if (layerResult) {
                newTooltip = {
                    text: layerResult.description,
                    show: true,
                    sidebarLeftWidth: action.sidebarLeftWidth,
                    // parentHeight: action.parentHeight,
                    // top: action.top,
                    mouseY: action.mouseY,
                }
            } else {
                newTooltip = {
                    text: '',
                    show: false,
                }
            }
            return {
                ...state,
                tooltip: newTooltip,
            }
        case 'HIDE_DESCRIPTION':
            return {
                ...state,
                tooltip: {
                    text: '',
                    show: false,
                }
            }
        case 'UPDATE_SCROLL_TOP':
            return {
                ...state,
                scrollTop: action.scrollTop
            }
        case 'SHOW_MENU_LAYER':
            return {
                ...state,
                showMenu: true,
                showTooltipMenu: false,
            }
        case 'HIDE_MENU_LAYER':
            return {
                ...state,
                showMenu: false,
            }
        case 'SHOW_SIDEBAR_RIGHT':
            return {
                ...state,
                showSidebarRight: true,
            }
        case 'HIDE_SIDEBAR_RIGHT':
            return {
                ...state,
                showSidebarRight: false,
            }
        case 'REMOVE_ALL_LAYERS':
            var newLayers = []
            newLayers = state.layers.map(l => {
                return {
                    ...l,
                    selected: false,
                    order: null,
                }
            })

            return {
                ...state,
                layers: newLayers,
                polygonData: null,
                showSidebarRight: false,
            }
        case 'POPULATE_STATE_WITH_LAYER_DATA':
            let returnedLayers = action.data
            var newLayers = state.layers

            newLayers = state.layers.map(l => {
                let features = null
                for (var i = 0; i < returnedLayers.length; i++) {
                    var returnedLayer = returnedLayers[i];
                    var returnedItems = returnedLayer.features
                    if (returnedItems && returnedItems.length > 0) {
                        let featureId = returnedItems[0].id.split('.')[0]
                        if (l.name === featureId) {
                            features = returnedItems
                        }
                    }

                }

                return {
                    ...l,
                    features,
                }
            })

            return {
                ...state,
                layers: newLayers,
            }

        case 'UPDATE_LAST_CLICK_DATA':
            return {
                ...state,
                lastClickData: action.data,
            }

        case 'LAST_MAP_POSITION':
            var mapProperties = {
                ...state.mapProperties,
                currentCoordinates: action.data,
            }

            return {
                ...state,
                mapProperties
            }

        case 'SHOW_STREET_VIEW':
            return {
                ...state,
                streetViewCoordinates: action.data,
            }

        case 'HIDE_STREET_VIEW':
            return {
                ...state,
                streetViewCoordinates: null,
                toolbarActive: null,
            }

        case 'GET_MODAL_DATA':
            var returnedItems = action.data.features
            var newLayers = state.layers

            var PAGE_SIZE = 5
            var pages = []

            // At least one element returned from the server
            if (returnedItems && returnedItems.length > 0) {

                // Removing string content after dot
                let featureId = returnedItems[0].id.split('.')[0]

                // split items into pages
                let returnedItemsCopy = JSON.parse(JSON.stringify(returnedItems))
                let returnedItemsCount = returnedItemsCopy.length

                while (returnedItemsCopy.length) {
                    pages.push(returnedItemsCopy.splice(0,PAGE_SIZE))
                }

                newLayers = state.layers.map(l => {
                    // extends modal object, if it exists
                    var modal = {}
                    if (l.modal) {
                        modal = {...l.modal}
                    }

                    if (l.name === featureId) {
                        modal.pages = pages
                        modal.currentPage = 0
                        modal.totalItemsCount = returnedItemsCount
                    }
                    return {
                        ...l,
                        modal,
                    }
                })
            }

            return {
                ...state,
                layers: newLayers,
            }

        case 'OPEN_MODAL':
            var showModal = true
            var currentModalLayer = action.layer
            var newLayers = state.layers
            var showExportFile = false

            newLayers = state.layers.map(l => {
                // extends modal object, if it exists
                var modal = {}
                if (l.modal) {
                    modal = {...l.modal}
                }

                // set to false
                modal.activeLayer = false

                // found my searched item
                if (l.id === currentModalLayer.id) {
                    // set to true
                    modal.activeLayer = true
                }

                return {
                    ...l,
                    modal,
                }
            })

            return {
                ...state,
                showModal,
                currentModalLayer,
                layers: newLayers,
            }

        case 'CLOSE_MODAL':
            var showModal = false
            var newsModal = false
            var showAbout = false
            var showLogin = false
            var toolbarActive = null
            var hideUpdates = document.getElementById('newsTimestamp')
            // set a timestamp from a hidden input from news modal on news modal
            if (hideUpdates) {
                window.localStorage.setItem('newsTimestamp', hideUpdates.dataset.value)
            }

            return {
                ...state,
                showModal,
                newsModal,
                showAbout,
                showLogin,
                toolbarActive,
            }

        case 'OPEN_LAYER_FILTER_MODAL':
            var showModal = true
            var showLayerFilterModal = true

            return {
                ...state,
                showModal,
                showLayerFilterModal,
                modalLayerFilterName: action.layer.name,
            }

        case 'LAYER_FILTER_LOADING':
            var newLayers = state.layers.map(l => {
                if (l.name === action.layer) {
                    return {
                        ...l,
                        filteredData: null,
                        filterKey: action.parameterKey,
                        filterValue: action.parameterValue,
                        isLoadingFilter: true,
                    }
                }
                return {...l}
            })
            return {
                ...state,
                layers: newLayers,
                isLoadingFilter: true,
            }

        case 'LAYER_FILTER_LOADED':
            var layerName = null
            if (action.data.features) {
                layerName = action.data.features[0].id.replace(/\..*/g, '')
            }
            var newLayers = state.layers.map(l => {
                if (l.name === layerName) {
                    return {
                        ...l,
                        filteredData: action.data.features,
                        isLoadingFilter: false,
                    }
                }
                return {...l}
            })
            return {
                ...state,
                layers: newLayers,
                isLoadingFilter: false,
            }

        case 'CLEAR_LAYER_FILTER':
        var newLayers = state.layers.map(l => {
            if (l.name === action.layer.name) {
                return {
                    ...l,
                    filteredData: null,
                    filterKey: null,
                    filterValue: null,
                }
            }
            return {...l}
        })
        return {
            ...state,
            layers: newLayers,
            isLoadingFilter: false,
        }

        case 'CHANGE_ACTIVE_TAB':
            var clickedModalLayer = action.layer
            var newLayers = state.layers

            newLayers = state.layers.map(l => {
                // extends modal object, if it exists
                var modal = {}
                if (l.modal) {
                    modal = {...l.modal}
                }

                // set to false
                modal.activeLayer = false

                // found my searched item
                if (l.id === clickedModalLayer.id) {
                    // set to true
                    modal.activeLayer = true
                }

                return {
                    ...l,
                    modal,
                }
            })

            return {
                ...state,
                layers: newLayers,
            }

        case 'CHANGE_GLOBAL_FILTER_TYPE':
            return {
                ...state,
                globalFilterType: action.filterName,
            }

        case 'PAGINATE':
            var newLayers = state.layers

            newLayers = state.layers.map(l => {
                // extends modal object, if it exists
                var modal = {}
                if (l.modal) {
                    modal = {...l.modal}
                }

                // found my searched item
                if (l.id === action.layer.id) {
                    modal.currentPage = action.page
                }

                return {
                    ...l,
                    modal,
                }
            })

            return {
                ...state,
                layers: newLayers,
            }

        case 'CHANGE_ACTIVE_TOOLBAR':
            var toolbarActive = action.item
            if (toolbarActive === state.toolbarActive) {
                toolbarActive = undefined
            }

            // when the draw controls or polygon search opens or closes
            // the state should change
            // need to refactor because of repeated code
            var showDrawControls = state.showDrawControls === undefined ? false : state.showDrawControls
            var showSearchPolygon = state.showSearchPolygon === undefined ? false : state.showSearchPolygon
            var showHelp = state.showHelp === undefined ? false : state.showHelp
            var showAbout = state.showAbout === undefined ? false : state.showAbout
            var showModal = state.showModal === undefined ? false : state.showModal
            var showLogin = state.showLogin === undefined ? false : state.showLogin
            var loginStatus = state.loginStatus === undefined ? false : state.loginStatus
            let loginError = state.loginError === undefined ? false : state.loginError

            if (action.item === 'draw') {
                if (!state.showDrawControls) {
                    showSearchPolygon = false
                }
                showDrawControls = !state.showDrawControls
            } else if (state.toolbarActive === 'draw') {
                showDrawControls = false
            }

            if (action.item === 'polygonRequest') {
                if (!state.showSearchPolygon) {
                    showDrawControls = false
                }
                showSearchPolygon = !state.showSearchPolygon
            } else if (state.toolbarActive === 'draw') {
                showSearchPolygon = false
            }

            if (action.item === 'help') {
                if (!state.showHelp) {
                    showHelp = false
                }
                showHelp = !state.showHelp
            } else if (state.toolbarActive === 'help') {
                showHelp = false
            }

            if (action.item === 'about') {
                if (!state.showAbout) {
                    showAbout = false
                }
                showAbout = !state.showAbout
                if (showAbout) {
                    showModal = true
                } else {
                    showModal = false
                }
            } else if (state.toolbarActive === 'about') {
                showAbout = false
            }

            if (action.item === 'login') {
                if (!state.showLogin) {
                    showLogin = false
                }
                showLogin = !state.showLogin
                if (showLogin) {
                    showModal = true
                } else {
                    showModal = false
                }
            } else if (state.toolbarActive === 'login') {
                showLogin = false
            }

            if (action.item === 'logout') {
                loginError = false
                loginStatus = false
                toolbarActive = null
                ScaAPI.logOutUser();
                localStorage.setItem('loginStatus', JSON.stringify(loginStatus))

            }

            return {
                ...state,
                toolbarActive,
                showDrawControls,
                showSearchPolygon,
                showHelp,
                showAbout,
                showModal,
                showLogin,
                loginError,
                loginStatus,
            }

        case 'TOGGLE_PLACE':
            var clickedPlace = action.item
            var currentPlace = state.mapProperties.placeToCenter
            var placeFound = null
            var id = clickedPlace.id
            var places = state.places.slice()
            var root = {
                id: 'root',
                nodes: places
            }

            placeFound = togglePlace(root, id);

            return {
                ...state,
                places,
            }

        case 'TOGGLE_TUTELA':
            var clickedPlace = action.item
            var currentPlace = state.mapProperties.placeToCenter
            var tutelaFound = null
            var id = clickedPlace.id
            var tutela = state.tutela.slice()
            var root = {
                id: 'root',
                nodes: tutela
            }

            tutelaFound = toggleTutela(root, id);

            return {
                ...state,
                tutela,
            }

        case 'ADD_PLACE_LAYER':
            var places = state.places.slice()
            var root = {
                id: 'root',
                nodes: places
            }
            var placeToCenter = searchPlaceById(root, action.item.id)
            var bounds = placeToCenter.geom.split(',')
            if ((state.bounds === bounds) || (state.toolbarActive !== 'search')) {
                placeToCenter = undefined
            }
            var mapProperties = {
                ...state.mapProperties,
                placeToCenter,
                googleSearchCoord: null,
            }
            return {
                ...state,
                mapProperties,
            }

        case 'ADD_TUTELA_LAYER':
            var tutela = state.tutela.slice()
            var root = {
                id: 'root',
                nodes: tutela
            }
            var placeToCenter = searchPlaceById(root, action.item.id)
            var bounds = placeToCenter.geom.split(',')
            if ((state.bounds === bounds) || (state.toolbarActive !== 'search')) {
                placeToCenter = undefined
            }
            var mapProperties = {
                ...state.mapProperties,
                placeToCenter,
                googleSearchCoord: null,
            }
            return {
                ...state,
                mapProperties,
            }

        case 'CLEAR_PLACE_TUTELA_LAYER':
            var places = state.places.slice()
            var tutela = state.tutela.slice()
            places[0].nodes.map(craai => {
                craai.nodes.map(municipio => {
                    delete municipio['show']
                })
                delete craai['show']
            })
            delete places[0]['search']
            tutela[0].nodes.map(tut => {
                tut.nodes.map(orgao => {
                    delete orgao['show']
                })
                delete tut['show']
            })
            delete tutela[0]['search']

            var mapProperties = {
                ...state.mapProperties,
                placeToCenter: null,
            }
            return {
                ...state,
                mapProperties,
                tutela,
                places
            }

        case 'CHANGE_OPACITY':
            var opacity = parseInt(action.item) / 10
            var mapProperties = {
                ...state.mapProperties,
                opacity,
            }
            return {
                ...state,
                mapProperties,
            }
        case 'CHANGE_CONTOUR':
            var contour = action.item
            var mapProperties = {
                ...state.mapProperties,
                contour,
            }
            return {
                ...state,
                mapProperties,
            }
        case 'SEARCH_PLACES':
            var globalFilterSearchPlaces = action.item
            var text = action.item.toLowerCase()
            var places = state.places.slice()

            for (let estado of places) {
                estado.show = false
                for (let craai of estado.nodes) {
                    craai.show = false
                    for (let municipio of craai.nodes) {
                        municipio.show = false
                        for (let bairro of municipio.nodes) {
                            bairro.show = false
                            if (text.length > 0 && bairro.title.toLowerCase().includes(text)) {
                                bairro.show = true
                                municipio.show = true
                                craai.show = true
                                estado.show = true
                            }
                        }
                        if (text.length > 0 && municipio.title.toLowerCase().includes(text)) {
                            municipio.show = true
                            craai.show = true
                            estado.show = true
                        }
                    }
                    if (craai.title.toLowerCase().includes(text)) {
                        craai.show = true
                        estado.show = true
                    }
                }
            }

            places[0].search = action.item
            return {
                ...state,
                places,
                globalFilterSearchPlaces,
            }

        case 'SEARCH_TUTELA':
            var globalFilterSearchTutela = action.item
            var text = action.item.toLowerCase()
            var tutela = state.tutela.slice()

            for (let estado of tutela) {
                estado.show = false
                for (let tut of estado.nodes) {
                    tut.show = false
                    for (let orgao of tut.nodes) {
                        orgao.show = false
                        if (text.length > 0 && orgao.title.toLowerCase().includes(text)) {
                            orgao.show = true
                            tut.show = true
                            estado.show = true
                        }
                    }
                    if (tut.title.toLowerCase().includes(text)) {
                        tut.show = true
                        estado.show = true
                    }
                }
            }

            tutela[0].search = action.item
            return {
                ...state,
                tutela,
                globalFilterSearchTutela,
            }

        case 'CHANGE_ACTIVE_BASE_MAP':
            var baseMap = action.baseMap
            var currentMap = state.mapProperties.currentMap
            var mapProperties = state.mapProperties
            currentMap = baseMap
            mapProperties = {
                ...mapProperties,
                currentMap
            }

            localStorage.setItem('lastBaseMap', JSON.stringify(currentMap))

            return {
                ...state,
                mapProperties,
            }

        case 'UPDATE_BASEMAP_LOADING_STATUS':
            var mapProperties = state.mapProperties
            var currentMap = mapProperties.currentMap
            currentMap = {
                ...currentMap,
                loadDone: true,
            }
            mapProperties = {
                ...mapProperties,
                currentMap
            }
            return {
                ...state,
                mapProperties,
            }
        case 'POPULATE_STATE_WITH_POLYGON_DATA':
            layers = action.data

            layers = layers.filter(l => {
                if (l.length > 0) {
                    return l
                }
            })

            let layerItems = layers.map((l) => {
                let object = {}
                if (l.length > 0) {
                    object = {
                        'category': l[0].category,
                        'items': l,
                    }
                    return object
                }
            })
            layerItems = layerItems.map(layerItem => {
                if (layerItem.category === 'População') {
                    layerItem.populacao_total = layerItem.items.reduce((acc, setor) =>{
                        return acc + setor.properties.População_Censo_2010
                    }, 0)
                    layerItem.domicilios_total = layerItem.items.reduce((acc, setor) =>{
                        return acc + setor.properties.Domicílios_Censo_2010
                    }, 0)

                    layerItem.piramide_total = {}
                    for (var i = 0; i < layerItem.items.length; i++) {
                        var item = layerItem.items[i];
                        var itemKeyPropertiesArray = Object.keys(item.properties)
                        for (var j = 0; j < itemKeyPropertiesArray.length; j++) {
                            var thisKey = itemKeyPropertiesArray[j]
                            var prefix = thisKey.substring(0,2)
                            if (prefix === 'h_' || prefix === 'm_') {
                                layerItem.piramide_total[thisKey] = (layerItem.piramide_total[thisKey] || 0) + item.properties[thisKey]
                            }

                        }

                    }
                }
                return layerItem
            })


            let polygonData = layerItems
            return {
                ...state,
                polygonData,
                showSidebarRight: true,
                showPolygonDraw: false,
                showLoader: false,
            }

        case 'REMOVE_POLYGON_DATA':
            let selectedLayers = state.layers.filter(l => l.selected)
            if (selectedLayers.length > 0) {
                showSidebarRight = true
            } else {
                showSidebarRight = false
            }
            return {
                ...state,
                polygonData: null,
                showSidebarRight,
                showPolygonDraw: true,
            }
        case 'START_POLYGON_DATA_REQUEST':
            return {
                ...state,
                showLoader: true,
            }
        case 'ADD_GOOGLE_PLACES_LAT_LONG':
            var mapProperties = state.mapProperties
            var latLong = action.latLong
            mapProperties = {
                ...mapProperties,
                googleSearchCoord: latLong,
                placeToCenter: null,
            }
            return {
                ...state,
                mapProperties,
            }

        case 'HIDE_HELP':
            return {
                ...state,
                showHelp: false,
                toolbarActive: null,
            }

        case 'LOGIN_USER':
            loginStatus = state.loginStatus
            loginError = false
            let showLogin = state.showLogin
            let showModal = state.showModal
            let toolbarActive = state.toolbarActive

            if (action.data.status === 200) {
                loginStatus = true
                loginError = null
                showModal = false
                showLogin = false
                toolbarActive = null
            } else {
                loginError = true
            }

            localStorage.setItem('loginStatus', JSON.stringify(loginStatus))

            return {
                ...state,
                loginStatus,
                loginError,
                showLogin,
                showModal,
                toolbarActive,
            }

        case 'ICON_MOUSE_OVER':
            var newLayers = state.layers
            newLayers.map(l => {
                if (l.id === action.id) {
                    l.highlight = true
                }
            })
            return {
                ...state,
                layers: newLayers,
            }

        case 'ICON_MOUSE_OUT':
            var newLayers = state.layers
            newLayers.map(l => {
                if (l.id === action.id) {
                    l.highlight = false
                }
            })
            return {
                ...state,
                layers: newLayers,
            }

        case 'SINALID_DATA':

            var newLayers = state.layers
            var sinalidData = action.data.data
            var dpNum = parseInt(sinalidData.delegacia.substr(0,3), 10)

            newLayers.map(l => {
                if (l.id === 'plataforma_inst_sinalid') {
                    l.features.map(f => {
                        if (f.properties.DP === dpNum) {
                            f.properties.sinalid = sinalidData.ld
                        }
                    })
                }
            })

        case 'ACTIVATE_DOWNLOAD_LOADER':

            return {
                ...state,
                downloadLoader: true,
            }
        
        case 'DEACTIVATE_DOWNLOAD_LOADER':

            return {
                ...state,
                downloadLoader: false,
            }

        case 'LOADING_PARAMS':
            var newLayers = state.layers.map(l => {
                if (l.id === action.id) {
                    return {
                        ...l,
                        isLoadingParams: true,
                    }
                }
                return {...l}
            })
            return {
                ...state,
                layers: newLayers,
            }

        case 'LOAD_PARAMS':
            var newLayers = state.layers.map(l => {
                if (l.id === action.id) {
                    return {
                        ...l,
                        isLoadingParams: false,
                        params: action.params,
                    }
                }
                return {...l}
            })
            return {
                ...state,
                layers: newLayers,
            }

        default:
            return state
    }
}

const layer = (layer, action, layers) => {
    switch (action.type) {
        case 'TOGGLE_LAYER':
            // close other layers' information panel
            if (layer.id !== action.id) {
                return {
                    ...layer,
                    showInformation: false,
                }
            }

            let order
            let features = layer.features || null
            let modal = layer.modal || null

            if (layer.selected) {
                // disabling layer
                // just remove order attribute
                order = null
                features = null
                modal = null
            } else {
                // enabling layer
                // find the biggest and return +1
                order = 0
                layers.map(l => {
                    if (typeof l.order === 'number') {
                        if (l.order > order) {
                            order = l.order
                        }
                    }
                })
                order++
            }

            return {
                ...layer,
                selected: !layer.selected,
                showInformation: true,
                order,
                features,
                modal,
            }
        case 'TOGGLE_LAYER_INFORMATION':
            if (layer.id !== action.id) {
                return layer
            }
            if (typeof layer.showInformation === 'undefined') {
                layer.showInformation = false // will be inverted on return
            }
            return {
                ...layer,
                showInformation: !layer.showInformation,
            }
        case 'TOGGLE_MENU':
            if (layer.id !== action.id) {
                return layer
            }
            return {
                ...layer,
                selected: !layer.match,
            }
        case 'SHOW_DESCRIPTION':
            if (layer.id === action.id) {
                return layer
            }
            return undefined;
        case 'HIDE_DESCRIPTION':
            if (layer.id !== action.id) {
                return layer
            }
            return {
                ...layer,
                showDescription: false,
            }
        case 'SLIDE_LEFT_STYLES':
            if (layer.id !== action.id) {
                return layer
            }
            var stylesPositionCounter = layer.stylesPositionCounter
            if (stylesPositionCounter !== 0) {
                stylesPositionCounter--
            }
            return {
                ...layer,
                stylesPositionCounter,
            }
        case 'SLIDE_RIGHT_STYLES':
            const STYLES_IN_A_ROW = 5
            if (layer.id !== action.id) {
                return layer
            }
            var stylesPositionCounter = layer.stylesPositionCounter || 0
            if (stylesPositionCounter < layer.styles.length - STYLES_IN_A_ROW) {
                stylesPositionCounter++
            }
            return {
                ...layer,
                stylesPositionCounter,
            }

    }
}

const menuItem = (menuItem, action, currentLevel, loginStatus) => {
    switch (action.type) {
        case 'TOGGLE_MENU':
            if (menuItem.id !== action.id) {
                return menuItem
            }
            return {
                ...menuItem,
                selected: !menuItem.selected,
            }
        case 'UNTOGGLE_MENUS':
            return hideRestrictedLayers(
                {
                    ...menuItem,
                    match: true,
                    selected: false,
                },
                loginStatus
            )

        default:
            return menuItem
    }
}

/**
 * @param {Array} layers - an array of layers
 * @param {Number} key - layer key to be found
 *
 * This function finds a layer by key
 *
 * @return {Object} layer object that was found
 */
const getLayerByKey = (layers, key) => {
    var returnLayer = undefined
    layers.forEach(function(layer) {
        if (layer.key === key) {
            returnLayer = layer
        }
    })
    return returnLayer
}

/**
 * @param {Array} menuItems - an array of menu items
 * @param {Number} id - submenu item id
 *
 * This function finds a menuItem by id
 *
 * @return {Object} menuItem object that was found
 */
const getMenuItemById = (menuItems, id) => {
    var returnMenuItem = undefined
    menuItems.forEach(function(menuItem) {
        if (menuItem.idMenu === id) {
            returnMenuItem = menuItem
        }
    })
    return returnMenuItem
}

/**
 * @param {Object} menuItem
 * @param {Array} layers
 *
 * This function returns a menuItem unchanged if
 * it is does not match the user search string. It
 * returns a menu item with match property changed to
 * true if it matches the user search string
 *
 * @return {Object} menuItem object that was found
 */
const searchMenuItem = (menuItem, layers, menuItems, loginStatus) => {
    var layerMatch = false
    menuItem.layers.forEach(function(menuItemLayer) {
        if (getLayerByKey(layers, menuItemLayer) !== undefined) {
            layerMatch = true
        }
    })

    if (menuItem.submenus.length > 0) {
        menuItem.submenus.forEach(function(menuItemSubmenu) {
            var submenuItem = getMenuItemById(menuItems, menuItemSubmenu)
            if (submenuItem !== undefined) {
                submenuItem.layers.forEach(function(submenuItemLayer) {
                    if (getLayerByKey(layers, submenuItemLayer) !== undefined) {
                        layerMatch = true
                    }
                })
            }
        })
    }

    if (layerMatch) {
        return hideRestrictedLayers(
            {
                ...menuItem,
                match: true,
                selected: true,
            },
            loginStatus
        )
    } else {
        return {
            ...menuItem,
            match: false,
        }
    }
}

const searchLayer = (layer, action, loginStatus) => {
    if (action.text === '') {
        return hideRestrictedLayers(
            {
                ...layer,
                match: true,
            },
            loginStatus
        )
    }

    if (layer.title.toLowerCase().includes(action.text.toLowerCase())) {
        return hideRestrictedLayers(
            {
                ...layer,
                match: true,
            },
            loginStatus
        )
    } else if (layer.description.toLowerCase().includes(action.text.toLowerCase())) {
        return hideRestrictedLayers(
            {
                ...layer,
                match: true,
            },
            loginStatus
        )
    } else {
        return {
            ...layer,
            match: false,
        }
    }
}

export default appReducer
