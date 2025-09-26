import React, { useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import tw from 'twrnc';

interface OpenStreetMapViewProps {
  latitude: number;
  longitude: number;
  onLocationSelect?: (location: { latitude: number; longitude: number }) => void;
  style?: any;
}

const OpenStreetMapView: React.FC<OpenStreetMapViewProps> = ({
  latitude,
  longitude,
  onLocationSelect,
  style
}) => {
  const webViewRef = useRef<WebView>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OpenStreetMap</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
              integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
              crossorigin=""/>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
                integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
                crossorigin=""></script>
        <style>
            body { 
                margin: 0; 
                padding: 0; 
                font-family: Arial, sans-serif;
            }
            #map { 
                width: 100%; 
                height: 100vh; 
            }
            .loading-overlay {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 1000;
                background: white;
                padding: 10px 20px;
                border-radius: 5px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                font-size: 16px;
                color: #333;
            }
        </style>
    </head>
    <body>
        <div id="loading" class="loading-overlay">Chargement de la carte...</div>
        <div id="map"></div>
        
        <script>
            let map;
            let marker;
            let isReady = false;
            
            function initMap() {
                try {
                    // Initialize the map
                    map = L.map('map').setView([${latitude}, ${longitude}], 13);
                    
                    // Add OpenStreetMap tiles
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                        maxZoom: 19
                    }).addTo(map);
                    
                    // Add initial marker
                    marker = L.marker([${latitude}, ${longitude}]).addTo(map);
                    
                    // Handle map click events
                    map.on('click', function(e) {
                        const lat = e.latlng.lat;
                        const lng = e.latlng.lng;
                        
                        // Update marker position
                        if (marker) {
                            marker.setLatLng([lat, lng]);
                        } else {
                            marker = L.marker([lat, lng]).addTo(map);
                        }
                        
                        // Send coordinates to React Native
                        if (window.ReactNativeWebView) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'locationSelected',
                                latitude: lat,
                                longitude: lng
                            }));
                        }
                    });
                    
                    // Map is ready
                    map.whenReady(function() {
                        isReady = true;
                        document.getElementById('loading').style.display = 'none';
                        
                        if (window.ReactNativeWebView) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'mapReady'
                            }));
                        }
                    });
                    
                } catch (error) {
                    console.error('Error initializing map:', error);
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'error',
                            message: error.message
                        }));
                    }
                }
            }
            
            // Function to update marker position from React Native
            function updateMarker(lat, lng) {
                if (map && marker && isReady) {
                    marker.setLatLng([lat, lng]);
                    map.setView([lat, lng]);
                }
            }
            
            // Initialize map when page loads
            document.addEventListener('DOMContentLoaded', function() {
                initMap();
            });
            
            // Listen for messages from React Native
            window.addEventListener('message', function(event) {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'updateLocation') {
                        updateMarker(data.latitude, data.longitude);
                    }
                } catch (error) {
                    console.error('Error processing message:', error);
                }
            });
        </script>
    </body>
    </html>
  `;

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'mapReady':
          setIsMapReady(true);
          break;
        case 'locationSelected':
          if (onLocationSelect) {
            onLocationSelect({
              latitude: data.latitude,
              longitude: data.longitude
            });
          }
          break;
        case 'error':
          Alert.alert('Erreur de carte', data.message);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error handling WebView message:', error);
    }
  };

  // Update map location when props change
  React.useEffect(() => {
    if (isMapReady && webViewRef.current) {
      const message = JSON.stringify({
        type: 'updateLocation',
        latitude,
        longitude
      });
      webViewRef.current.postMessage(message);
    }
  }, [latitude, longitude, isMapReady]);

  return (
    <View style={[tw`w-full h-64 rounded-lg overflow-hidden bg-gray-100`, style]}>
      {!isMapReady && (
        <View style={tw`absolute inset-0 bg-gray-100 justify-center items-center z-10`}>
          <Text style={tw`text-gray-600 text-base`}>Chargement de la carte...</Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={tw`flex-1`}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        mixedContentMode="compatibility"
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
          Alert.alert('Erreur', 'Impossible de charger la carte');
        }}
        onLoadEnd={() => {
          console.log('WebView loaded');
        }}
      />
    </View>
  );
};

export default OpenStreetMapView;