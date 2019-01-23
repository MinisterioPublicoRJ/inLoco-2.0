import React from 'react'
import LeafletMap from './LeafletMap'
import { connect } from 'react-redux'
import GeoAPI from '../Api/GeoAPI.js'
import SinalidAPI from '../Api/SinalidAPI.js'
import {
    populateStateWithLayerData,
    updateLastClickData,
    updateBasemapLoadingStatus,
    lastMapPosition,
    populateStateWithPolygonData,
    showStreetView,
    hideStreetView,
    removePolygonData,
    startPolygonDataRequest,
    sinalidData,
} from '../../actions/actions.js'

const MAX_ITEMS_TO_LOAD = 3

const selectedLayers = (layers) => {
    if (!Array.isArray(layers)) {
        return []
    }
    return layers.filter(layer => layer.selected)
}

const mapStateToProps = (state, ownProps) => {
    return {
        mapProperties: state.mapProperties,
        showMenu: state.showMenu,
        showSidebarRight: state.showSidebarRight,
        layers: selectedLayers(state.layers),
        showDrawControls: state.showDrawControls,
        showSearchPolygon: state.showSearchPolygon,
        showPolygonDraw: state.showPolygonDraw,
        orderByLayerOrder: ownProps.orderByLayerOrder,
        places: state.places,
        toolbarActive: state.toolbarActive,
        streetViewCoordinates: state.streetViewCoordinates,
    }
}

const mapDispatchToProps = (dispatch) => {
    const onUpdateWithSelectedLayerData = (layerData) => {
        dispatch(populateStateWithLayerData(layerData))

        // Sinalid
        if (layerData[0]) {
            layerData[0].features.map(feature => {
                if (feature.properties.DP) {
                    SinalidAPI.listMissingPeople(onUpdateSinalidData, feature.properties.id)
                }
            })
        }
    }
    const onUpdateSinalidData = (data) => {
        dispatch(sinalidData(data))
    }
    const onDrawUpdateWithPolygonData = (data) => {
        dispatch(populateStateWithPolygonData(data))
    }
    return {
        /**
         * Create URL to get layers data and populate data table
         * @param e - Event bubbled on map click
         * @param layers - Active Layers array
         */
        handleMapClick: (e, layers, toolbarActive) => {
            // update last click data
            const map = e.target
            const clickData = {
                BBOX: map.getBounds().toBBoxString(),
                WIDTH: map.getSize().x,
                HEIGHT: map.getSize().y,
                X: ~~map.layerPointToContainerPoint(e.layerPoint).x,
                Y: ~~map.layerPointToContainerPoint(e.layerPoint).y
            }
            dispatch(updateLastClickData(clickData))

            // fetch layer data for clicked point if needed
            let urls = layers.map(l => {
                return GeoAPI.createUrl({
                    layer: l,
                    clickData,
                    featureCount: MAX_ITEMS_TO_LOAD,
                })
            })
            GeoAPI.getLayersData(onUpdateWithSelectedLayerData, urls)

            // show street view data if needed
            if (toolbarActive === 'streetView') {
                dispatch(showStreetView(e.latlng))
            }
        },
        onUpdateBasemapLoadingStatus: () => {
            dispatch(updateBasemapLoadingStatus())
        },
        handleMapMove: e => {
            const map = e.target
            const mapBounds = map.getBounds()
            const mapCenter = map.getCenter()
            const mapZoom = map.getZoom()
            const mapData = {
                bounds: mapBounds,
                lat: mapCenter.lat,
                lng: mapCenter.lng,
                zoom: mapZoom,
            }
            dispatch(lastMapPosition(mapData))
        },
        onDraw: (e, coordinates, activeLayers) => {
            const map = e.target
            dispatch(startPolygonDataRequest())
            GeoAPI.getPolygonData(onDrawUpdateWithPolygonData, coordinates, activeLayers)
        },
        onStreetViewHide: () => {
            dispatch(hideStreetView())
        },
        onPolygonDelete: () => {
            dispatch(removePolygonData())
        },
    }
}

const LeafletMapContainer = connect(
    mapStateToProps,
    mapDispatchToProps
)(LeafletMap)

export default LeafletMapContainer
