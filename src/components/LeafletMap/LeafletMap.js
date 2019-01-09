import React from 'react'
import Leaflet from 'leaflet'
import { EditControl } from 'react-leaflet-draw'
import Proj4 from 'proj4'
import { Map, WMSTileLayer, TileLayer, Marker, Popup, ZoomControl, ScaleControl, FeatureGroup, LayersControl, ImageOverlay } from 'react-leaflet'
import { GoogleLayer } from 'react-leaflet-google'
import StreetView from '../StreetView/StreetView.js'

const { BaseLayer, Overlay } = LayersControl
const MAPBOX_API_TOKEN = 'pk.eyJ1IjoiYXJsaW5kbyIsImEiOiJjaWljZDgwemYwMGFydWJrc2FlNW05ZjczIn0.rOROEuNNxKWUIcj6Uh4Xzg'
const GOOGLE_API_TOKEN = 'AIzaSyCDZWSYLIwlKjJA1Vj02PrYIjeqFnANrxw'
const BASEMAP_URL = {
    OPENSTREETMAP: 'http://{s}.tile.osm.org/{z}/{x}/{y}.png',
    MAPBOX_LIGHT:  `https://api.mapbox.com/styles/v1/arlindo/cj6mameic8ues2spffqvh7hx1/tiles/256/{z}/{x}/{y}?access_token=${MAPBOX_API_TOKEN}`,
    MAPBOX_DARK:   `https://api.mapbox.com/styles/v1/arlindo/cjgwq7nbf000e2rtcai1j8rmh/tiles/256/{z}/{x}/{y}?access_token=${MAPBOX_API_TOKEN}`,
}
const MIN_ZOOM = 7
const MAX_BOUNDS = [[-25,-50], [-18,-38]]

Leaflet.Icon.Default.imagePath = '//cdnjs.cloudflare.com/ajax/libs/leaflet/1.0.0/images/'

const LeafletMap = ({
    mapProperties,
    showMenu,
    showSidebarRight,
    layers,
    showDrawControls,
    orderByLayerOrder,
    places,
    toolbarActive,
    streetViewCoordinates,
    showSearchPolygon,
    showPolygonDraw,
    handleMapClick,
    handleMapMove,
    onUpdateBasemapLoadingStatus,
    onDraw,
    onStreetViewHide,
    onPolygonDelete,
}) => {

    const isCluster = (layer) => {
        return layer.id.indexOf('cluster') >= 0
    }

    let clientHeight = document.body.clientHeight
    let clientWidth = document.body.clientWidth

    let point = Leaflet.point(clientWidth, clientHeight)

    const availableBasemaps = ['gmaps-roads', 'gmaps-terrain', 'gmaps-satellite', 'osm', 'osm-mapbox-light', 'osm-mapbox-dark']

    // if basemap has changed, i should update it *once*
    if (mapProperties && mapProperties.currentMap && !mapProperties.currentMap.loadDone) {
        // get (hidden) layers control box
        let basemapFormElements = document.querySelectorAll('.leaflet-control-layers-selector')
        let basemapIndex
        for (var i=0, l=availableBasemaps.length; i<l; i++) {
            // get the index of the basemap i want to change to
            if (mapProperties.currentMap.name === availableBasemaps[i] ) {
                basemapIndex = i
            }
        }

        // trigger desired basemap select form
        basemapFormElements[basemapIndex].click()

        // trigger background layer (last checkbox) twice to switch if off and on again to put it on the top
        basemapFormElements[basemapFormElements.length-1].click()
        basemapFormElements[basemapFormElements.length-1].click()

        // dispatch action to say it is done
        onUpdateBasemapLoadingStatus()
    }

    // projections
    const firstProjection = 'GOOGLE'
    const secondProjection = 'WGS84'

    // initial position and zoom
    const position          = mapProperties && mapProperties.initialCoordinates ? [mapProperties.initialCoordinates.lat, mapProperties.initialCoordinates.lng] : [0,0]
    const zoom              = mapProperties && mapProperties.initialCoordinates && mapProperties.initialCoordinates.zoom ? mapProperties.initialCoordinates.zoom : 10
    var   placeToCenter     = mapProperties && mapProperties.placeToCenter ? mapProperties.placeToCenter : undefined
    var   googleSearchCoord = mapProperties && mapProperties.googleSearchCoord ? mapProperties.googleSearchCoord : undefined
    var   bounds
    var   opacity           = mapProperties && mapProperties.opacity !== undefined ? mapProperties.opacity : .5
    var   contour           = mapProperties && mapProperties.contour !== undefined ? mapProperties.contour : 'borda'
    var   color             = 'preto'
    let imageBounds         = mapProperties && mapProperties.currentCoordinates !== undefined ? mapProperties.currentCoordinates.bounds : null

    const regionStyle       = `plataforma:busca_regiao_${contour}_${color}`

    if (placeToCenter) {
        bounds = placeToCenter.geom.split(',')

        var west = parseInt(bounds[0])
        var east = parseInt(bounds[2])
        var south = parseInt(bounds[3])
        var north = parseInt(bounds[1])

        var prj1 = Proj4(firstProjection, secondProjection, [east, south])
        var prj2 = Proj4(firstProjection, secondProjection, [west, north])
        bounds = [[prj1[1], prj2[0]], [prj2[1], prj1[0]]]
    } else if (googleSearchCoord) {
        bounds = googleSearchCoord
    }

    var CQL_FILTER

    // This function gets the code to fill CQL filter
    const getCode = place => {
        var cd
        var operator = ' = '
        if (contour === 'opaco') {
            operator = ' <> '
        }
        switch (place.tipo) {
            case 'CRAAI':
                cd = 'cod_craai' + operator + place.cd_craai
                break
            case 'MUNICIPIO':
                cd = 'cod_mun' + operator + place.cd_municipio
                break
            case 'BAIRRO':
                cd = 'cod_bairro' + operator + place.cd_bairro
                break
            case 'CI':
                cd = 'cod_ci' + operator + place.cd_ci
                break
            case 'PIP':
                cd = 'cod_pip' + operator + place.cd_pip
                break
            case 'ORGAO':
                operator = ' = '
                cd = 'cd_orgao' + operator + place.cd_orgao
                break
            default:
                cd = undefined
        }
        return cd
    }

    if (placeToCenter) {
        CQL_FILTER = `tipo='${placeToCenter.tipo}' and ${getCode(placeToCenter)}`
        if (placeToCenter.tipo === 'ORGAO'){
            CQL_FILTER = `tipo='NEGATIVO' and ${getCode(placeToCenter)}`
        }
    }

    const getLayerCQLFilterParameter = () => {
        let param = 'cod_'
        if (placeToCenter.tipo === 'ORGAO') {
            param = 'cd_'
        }
        if (placeToCenter.tipo === 'MUNICIPIO') {
            return param += 'mun'
        }

        if (placeToCenter.tipo === 'ORGAO') {
            param = 'cd_'
        }

        return param += placeToCenter.tipo.toLowerCase()
    }

    const getLayerCQLFilterValue = () => {
        if (placeToCenter.tipo === 'ORGAO') {
            return placeToCenter.id
        }
        return `${placeToCenter['cd_'+placeToCenter.tipo.toLowerCase()]}`
    }

    const getLayerCQLFilter = ({layer, plateToCenter}) => {
        let CQLFilter = ''

        if (layer.filteredData && layer.filterKey && layer.filterValue) {
            CQLFilter = `strToLowerCase(${layer.filterKey}) LIKE '%${layer.filterValue}%'`
        }

        if (placeToCenter && placeToCenter.tipo !== 'ESTADO') {
            let geom = `'tipo=''${placeToCenter.tipo}'' and ${getLayerCQLFilterParameter()}=''${getLayerCQLFilterValue()}''`
            if (CQLFilter) {
                CQLFilter += ' AND '
            }
            CQLFilter += `INTERSECTS(geom, querySingle('plataforma:busca_regiao', 'geom', ${geom}'))`
        }

        if (CQLFilter === '') {
            return '1=1'
        }

        return CQLFilter
    }

    // Geoserver config
    const ENDPOINT = __API__
    const IMAGE_FORMAT = 'image/png'

    // map class, to reposition arrow and map credit on the bottom
    let leafletMapClassName = 'module-leafletMap'
    if (showMenu) {
        leafletMapClassName += ' sidebar-left-opened'
    }
    if (showSidebarRight) {
        leafletMapClassName += ' sidebar-right-opened'
    }

    let drawPolygonOptions
    if (showPolygonDraw) {
        drawPolygonOptions = {
            rectangle: false,
            polyline: false,
            circle: false,
            marker: false,
            circlemarker: false,
        }
    } else {
        drawPolygonOptions = {
            rectangle: false,
            polyline: false,
            circle: false,
            marker: false,
            circlemarker: false,
            polygon: false,
        }
    }
    const myHandleMapClick = (e) => {
        handleMapClick(e, layers, toolbarActive)
    }

    const myHandleMapMove = (e) => {
        handleMapMove(e)
    }

    const handleOnDraw = (e, layer) => {
        var coordinates = layer.getLatLngs()
        onDraw(e, coordinates, layers)
    }

    const handleOnDelete = (e, layer) => {
        if (layer) {
            onPolygonDelete()
        }
    }

    const returnMapInnerComponents = () => {
        return (
            <div>
                <LayersControl position='bottomleft'>
                    <BaseLayer checked={false} name='Google Maps - Ruas'>
                        <GoogleLayer googlekey={GOOGLE_API_TOKEN} maptype='ROADMAP' attribution='Google Maps - Ruas' />
                    </BaseLayer>
                    <BaseLayer checked={false} name='Google Maps - Terreno'>
                        <GoogleLayer googlekey={GOOGLE_API_TOKEN} maptype='TERRAIN' attribution='Google Maps - Terreno' />
                    </BaseLayer>
                    <BaseLayer checked={false} name='Google Maps - Satélite'>
                        <GoogleLayer googlekey={GOOGLE_API_TOKEN} maptype='SATELLITE' attribution='Google Maps - Satélite' />
                    </BaseLayer>
                    <BaseLayer checked={false} name='OpenStreetMap'>
                        <TileLayer url={BASEMAP_URL.OPENSTREETMAP} attribution='OpenStreetMap' />
                    </BaseLayer>
                    <BaseLayer checked={true} name='OpenStreetMap com tema Mapbox Light'>
                        <TileLayer url={BASEMAP_URL.MAPBOX_LIGHT} attribution='OpenStreetMap com tema Mapbox Light' />
                    </BaseLayer>
                    <BaseLayer checked={false} name='OpenStreetMap com tema Mapbox Dark'>
                        <TileLayer url={BASEMAP_URL.MAPBOX_DARK} attribution='OpenStreetMap com tema Mapbox Dark' />
                    </BaseLayer>
                    <Overlay checked={true} name='fundo'>
                        {/*state highlight layer*/}
                        <WMSTileLayer
                            url={ENDPOINT}
                            layers={'plataforma:retangulo'}
                            styles={'plataforma:retangulo_'+color}
                            format={IMAGE_FORMAT}
                            transparent={true}
                            opacity={opacity}
                            isBaseLayer={false}
                            visibility={true}
                            tiled={true}
                            buffer={0}
                        />
                    </Overlay>
                    {/*active layers*/}
                    {orderByLayerOrder(layers).map((layer, index) => {

                        let layerOpacity = 1
                        layers.map(l => {
                            if (l.id !== layer.id && l.highlight) {
                                layerOpacity = .3
                            }
                        })

                        if (isCluster(layer)) {
                            let imageURL = `${ENDPOINT}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image%2Fpng&TRANSPARENT=true&STYLES&LAYERS=${layer.layerName}&SRS=EPSG%3A4326&WIDTH=${clientWidth}&HEIGHT=${clientHeight}`
                            if (imageBounds) {
                                imageURL += `&BBOX=${imageBounds._southWest.lng}%2C${imageBounds._southWest.lat}%2C${imageBounds._northEast.lng}%2C${imageBounds._northEast.lat}`
                            } else {
                                // temp values if map hasn't updated yet on initialization
                                imageBounds = [[-46.9,-23.5],[-38.1,-21.0]]
                                imageURL += `&BBOX=-46.9%2C-23.5%2C-38.1%2C-21.0`
                            }
                            return (
                                <Overlay checked={true} name={layer.layerName} key={index}>
                                    <ImageOverlay
                                        bounds={imageBounds}
                                        url={imageURL}
                                        transparent={true}
                                        opacity={layerOpacity}
                                    />
                                </Overlay>
                            )
                        } else {
                            return (
                                <Overlay checked={true} name={layer.layerName} key={index}>
                                    <WMSTileLayer
                                        url={ENDPOINT}
                                        layers={layer.layerName}
                                        styles={layer.styles[layer.selectedLayerStyleId].name}
                                        format={IMAGE_FORMAT}
                                        transparent={true}
                                        CQL_FILTER = {getLayerCQLFilter({layer, placeToCenter})}
                                        opacity={layerOpacity}
                                    />
                                </Overlay>
                            )
                        }
                    })}
                    {/*region highlight layer*/}
                    {
                        placeToCenter
                        ?
                        <Overlay checked={true} name="region_highlight">
                            <WMSTileLayer
                                url={ENDPOINT}
                                layers={placeToCenter.cd_orgao ? 'plataforma:busca_regiao_com_negativo' : 'plataforma:busca_regiao'}
                                styles={regionStyle}
                                format={IMAGE_FORMAT}
                                transparent={true}
                                exibeLegenda={false}
                                opacity={opacity}
                                isBaseLayer={false}
                                visibility={true}
                                tiled={true}
                                buffer={0}
                                CQL_FILTER = {CQL_FILTER ? CQL_FILTER : '1=1'}
                            />
                        </Overlay>
                        :
                        null
                    }
                </LayersControl>

                {/*Other controls*/}
                <ScaleControl position="bottomleft"/>
                <ZoomControl position="bottomright"/>
                <FeatureGroup>
                    {showDrawControls === true ?
                        <EditControl
                            position='topright'
                            draw={{
                                circlemarker: false,
                            }}
                        />
                        :
                        null
                    }
                </FeatureGroup>

                <FeatureGroup>
                    {showSearchPolygon === true ?
                        <EditControl
                            position='topright'
                            onCreated={
                                (e) => {
                                    var layer = e.layer
                                    e.layer.setStyle({
                                        color: '#bada55'
                                    })
                                    handleOnDraw(e, layer)
                                }
                            }
                            onEdited={
                                (e) => {
                                    var layers = e.layers.getLayers()
                                    var layer = layers[layers.length-1]
                                    handleOnDraw(e, layer)
                                }
                            }
                            onDeleted={
                                (e) => {
                                    var layers = e.layers.getLayers()
                                    var layer = layers[layers.length-1]
                                    handleOnDelete(e, layer)
                                }
                            }
                            draw={drawPolygonOptions}
                        />
                        :
                        null
                    }
                </FeatureGroup>
            </div>
        )
    }

    // translate Leaflet Draw to portuguese
    if (L) {
        L.drawLocal.draw.toolbar.actions.text         = 'Cancelar'
        L.drawLocal.draw.toolbar.actions.title        = 'Cancelar desenho'
        L.drawLocal.draw.toolbar.finish.text          = 'Terminar'
        L.drawLocal.draw.toolbar.finish.title         = 'Terminar desenho'
        L.drawLocal.draw.toolbar.undo.text            = 'Desfazer'
        L.drawLocal.draw.toolbar.undo.title           = 'Apagar último ponto desenhado'
        L.drawLocal.draw.toolbar.buttons.polyline     = 'Inserir uma linha'
        L.drawLocal.draw.toolbar.buttons.polygon      = 'Inserir um polígono'
        L.drawLocal.draw.toolbar.buttons.rectangle    = 'Inserir um retângulo'
        L.drawLocal.draw.toolbar.buttons.circle       = 'Inserir um círculo'
        L.drawLocal.draw.toolbar.buttons.marker       = 'Inserir um marcador'
        L.drawLocal.draw.toolbar.buttons.circlemarker = 'Inserir um marcador circular'

        L.drawLocal.draw.handlers.circle.tooltip.start    = 'Clique e arraste para desenhar um círculo.'
        L.drawLocal.draw.handlers.circle.radius           = 'Raio'
        L.drawLocal.draw.handlers.marker.tooltip.start    = 'Clique no mapa para criar um marcador.'
        L.drawLocal.draw.handlers.polygon.tooltip.start   = 'Clique para começar a desenhar um polígono.'
        L.drawLocal.draw.handlers.polygon.tooltip.cont    = 'Clique para continuar a desenhar um polígono.'
        L.drawLocal.draw.handlers.polygon.tooltip.end     = 'Clique no primeiro ponto para terminar o polígono.'
        L.drawLocal.draw.handlers.polyline.error          = '<strong>Erro:</strong> linhas das pontas não podem se cruzar!'
        L.drawLocal.draw.handlers.polyline.tooltip.start  = 'Clique para começar a desenhar uma linha.'
        L.drawLocal.draw.handlers.polyline.tooltip.cont   = 'Clique para continuar a desenhar uma linha.'
        L.drawLocal.draw.handlers.polyline.tooltip.end    = 'Clique no último ponto para terminar a linha.'
        L.drawLocal.draw.handlers.rectangle.tooltip.start = 'Clique e arraste para desenhar um retângulo.'
        L.drawLocal.draw.handlers.simpleshape.tooltip.end = 'Solte o mouse para terminar o desenho.'

        L.drawLocal.edit.toolbar.actions.save.text      = 'Confirmar'
        L.drawLocal.edit.toolbar.actions.save.title     = 'Confirmar alterações'
        L.drawLocal.edit.toolbar.actions.cancel.text    = 'Cancelar'
        L.drawLocal.edit.toolbar.actions.cancel.title   = 'Cancelar edição, descartar alterações'
        L.drawLocal.edit.toolbar.actions.clearAll.title = 'Limpar'
        L.drawLocal.edit.toolbar.actions.clearAll.text  = 'Limpar todos os desenhos'
        L.drawLocal.edit.toolbar.buttons.edit           = 'Editar desenhos'
        L.drawLocal.edit.toolbar.actions.editDisabled   = 'Nenhum desenho para editar'
        L.drawLocal.edit.toolbar.actions.remove         = 'Apagar desenhos'
        L.drawLocal.edit.toolbar.actions.removeDisabled = 'Nenhum desenho para apagar'

        L.drawLocal.edit.handlers.edit.tooltip.text     = 'Arraste os quadradinhos para editar o desenho.'
        L.drawLocal.edit.handlers.edit.tooltip.subtext  = 'Clique em Cancelar para desfazer as mudanças.'
        L.drawLocal.edit.handlers.remove.tooltip.text   = 'Clique em um desenho para remover.'

        if (L.drawLocal.format) {
            L.drawLocal.format.numeric.delimiters.thousands = '.'
            L.drawLocal.format.numeric.delimiters.decimal   = ','
        }
    }

    const returnMapWithCenter = () => {
        return (
            <Map
                center={position}
                zoom={zoom}
                zoomControl={false}
                minZoom={MIN_ZOOM}
                maxBounds={MAX_BOUNDS}
                onClick={myHandleMapClick}
                onMoveend={myHandleMapMove}
            >
                {returnMapInnerComponents()}
            </Map>
        )
    }

    const returnMapWithBounds = () => {
        return (
            <Map
                bounds={bounds}
                zoomControl={false}
                minZoom={MIN_ZOOM}
                maxBounds={MAX_BOUNDS}
                onClick={myHandleMapClick}
                onMoveend={myHandleMapMove}
            >
                {returnMapInnerComponents()}
            </Map>
        )
    }
    return (
        <div className={leafletMapClassName}>
            {
                streetViewCoordinates ?
                    <StreetView
                        googleApiToken={GOOGLE_API_TOKEN}
                        streetViewCoordinates={streetViewCoordinates}
                        onStreetViewHide={onStreetViewHide}
                    />
                : ''
            }
            {
                bounds
                ? returnMapWithBounds()
                : returnMapWithCenter()
            }
        </div>
    )
}

export default LeafletMap
