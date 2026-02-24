"use client";

import Map, { Marker, Popup, Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1Ijoia2lzaGFuc2luZ2gxMDEyMyIsImEiOiJjbWx3d2x1OGQwb2g2M2RwcXd0djh1bzdlIn0.XueJxn6rUS0BjWYZ9At0Tw";

export { Map, Marker, Popup, Source, Layer, MAPBOX_TOKEN };
