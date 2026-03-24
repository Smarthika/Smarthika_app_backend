import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert,
  Dimensions,
  StyleSheet,
  Platform,
  ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { GoogleMaps } from 'expo-maps';
import * as Location from 'expo-location';
import CustomButton from '../../components/ui/CustomButton';

const { width, height } = Dimensions.get('window');

export default function MapViewScreen() {
  const { landData } = useLocalSearchParams();
  const [landDetails, setLandDetails] = useState(null);
  const [cameraPosition, setCameraPosition] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [mapType, setMapType] = useState('SATELLITE');
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState(null);
  const mapRef = useRef(null);
  const cameraMoveTimeoutRef = useRef(null);

  useEffect(() => {
    initializeMap();
  }, [landData]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (cameraMoveTimeoutRef.current) {
        clearTimeout(cameraMoveTimeoutRef.current);
      }
    };
  }, []);

  const initializeMap = async () => {
    setIsLoading(true);
    setMapError(null);
    
    // Parse land data
    if (landData) {
      try {
        const parsedData = JSON.parse(landData);
        console.log('Parsed land data:', parsedData);
        setLandDetails(parsedData);
        
        // Calculate the center of the land polygon
        let centerLat = 15.3173; // Default Karnataka coordinates
        let centerLng = 75.7139;
        
        if (parsedData.geoJson?.coordinates?.[0]?.length > 0) {
          const coords = parsedData.geoJson.coordinates[0];
          // Validate coordinates
          const validCoords = coords.filter(coord => 
            Array.isArray(coord) && 
            coord.length >= 2 && 
            !isNaN(coord[0]) && 
            !isNaN(coord[1])
          );
          
          if (validCoords.length > 0) {
            centerLat = validCoords.reduce((sum, coord) => sum + coord[1], 0) / validCoords.length;
            centerLng = validCoords.reduce((sum, coord) => sum + coord[0], 0) / validCoords.length;
          }
        }
        
        const defaultCameraPosition = {
          coordinates: {
            latitude: centerLat,
            longitude: centerLng,
          },
          zoom: Math.max(12, Math.min(17, 17)), // Ensure zoom is within reasonable bounds
        };
        
        setCameraPosition(defaultCameraPosition);
        
      } catch (error) {
        console.error('Error parsing land data:', error);
        setMapError('Invalid land data provided');
        Alert.alert('Error', 'Invalid land data provided');
        setTimeout(() => router.back(), 2000);
        return;
      }
    }

    // Request location permission
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission(true);
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeout: 10000,
          maximumAge: 1000,
        });
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } else {
        console.log('Location permission denied');
      }
    } catch (error) {
      console.log('Location permission error:', error);
    }
    
    setIsLoading(false);
  };

  const getLandPolygonCoordinates = () => {
    if (!landDetails?.geoJson?.coordinates?.[0]?.length) {
      // Return default polygon coordinates for demo if no GeoJSON data
      const centerLat = cameraPosition?.coordinates?.latitude || 15.3173;
      const centerLng = cameraPosition?.coordinates?.longitude || 75.7139;
      const offset = 0.001;
      
      return [
        { latitude: centerLat - offset, longitude: centerLng - offset },
        { latitude: centerLat - offset, longitude: centerLng + offset },
        { latitude: centerLat + offset, longitude: centerLng + offset },
        { latitude: centerLat + offset, longitude: centerLng - offset },
      ];
    }

    // Convert GeoJSON coordinates to react-native-maps format
    const geoJsonCoords = landDetails.geoJson.coordinates[0];
    
    // Filter and validate coordinates
    const validCoords = geoJsonCoords.filter(coord => 
      Array.isArray(coord) && 
      coord.length >= 2 && 
      !isNaN(coord[0]) && 
      !isNaN(coord[1])
    );
    
    // Remove last coordinate if it's a duplicate of the first (GeoJSON polygon closure)
    let processedCoords = validCoords;
    if (validCoords.length > 1) {
      const first = validCoords[0];
      const last = validCoords[validCoords.length - 1];
      if (first[0] === last[0] && first[1] === last[1]) {
        processedCoords = validCoords.slice(0, -1);
      }
    }
    
    return processedCoords.map(coord => ({
      latitude: coord[1],
      longitude: coord[0],
    }));
  };

  const getLandMarkers = () => {
    const polygonCoords = getLandPolygonCoordinates();
    const landCenter = getLandCenter();
    
    const markers = [
      // Land center marker
      {
        id: 'land-center',
        coordinates: landCenter,
        title: `Survey No: ${landDetails?.surveyNo}`,
        snippet: `${landDetails?.village}, ${landDetails?.tehsil}, ${landDetails?.district}`,
        showCallout: true,
      }
    ];

    // Add corner markers
    polygonCoords.forEach((coord, index) => {
      markers.push({
        id: `corner-${index}`,
        coordinates: coord,
        showCallout: false,
      });
    });

    return markers;
  };

  const getLandPolylines = () => {
    const polygonCoords = getLandPolygonCoordinates();
    if (polygonCoords.length < 3) return [];
    
    // Create a closed polygon by adding the first coordinate at the end
    const closedCoords = [...polygonCoords, polygonCoords[0]];
    
    return [
      {
        id: 'land-boundary',
        coordinates: closedCoords,
        color: 'rgba(16, 185, 129, 0.8)',
        width: 3,
      }
    ];
  };

  const getLandCenter = () => {
    const polygonCoords = getLandPolygonCoordinates();
    if (polygonCoords.length === 0) {
      return { latitude: 15.3173, longitude: 75.7139 };
    }
    const centerLat = polygonCoords.reduce((sum, coord) => sum + coord.latitude, 0) / polygonCoords.length;
    const centerLng = polygonCoords.reduce((sum, coord) => sum + coord.longitude, 0) / polygonCoords.length;
    return { latitude: centerLat, longitude: centerLng };
  };

  const handleConfirmLand = () => {
    Alert.alert(
      'Confirm Land Ownership',
      `Are you sure this land parcel (Survey No: ${landDetails?.surveyNo}) belongs to you?\n\nBy confirming, you declare that you have the legal rights to claim this land.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Ownership',
          style: 'default',
          onPress: () => {
            Alert.alert(
              'Land Confirmed!',
              'This land parcel has been added to your claim. You can now proceed with your application.',
              [
                {
                  text: 'Cancel',
                  onPress: () => router.navigate('/(tabs)/home')
                },
                {
                  text: 'Continue',
                  onPress: () => router.navigate({
                    pathname: '/land/land-claiming',
                    params: {
                      addedLand: JSON.stringify(landDetails)
                    }
                  })
                }
              ]
            );
          }
        }
      ]
    );
  };

  const handleCenterOnLand = () => {
    if (landDetails && mapRef.current) {
      const landCenter = getLandCenter();
      const newCameraPosition = {
        coordinates: landCenter,
        zoom: Math.max(16, Math.min(20, 18)), // Constrain zoom for center action
      };
      
      // Clear any pending camera move timeouts to prevent conflicts
      if (cameraMoveTimeoutRef.current) {
        clearTimeout(cameraMoveTimeoutRef.current);
      }
      
      mapRef.current.setCameraPosition({
        ...newCameraPosition,
        duration: 1500, // Slower animation to reduce vibration
      });
    }
  };

  const handleLocateMe = async () => {
    if (!locationPermission) {
      Alert.alert(
        'Permission Required', 
        'Location permission is required to show your current location.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Grant Permission',
            onPress: async () => {
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status === 'granted') {
                setLocationPermission(true);
                handleLocateMe();
              }
            }
          }
        ]
      );
      return;
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
        maximumAge: 1000,
      });
      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setUserLocation(newLocation);
      
      if (mapRef.current) {
        // Clear any pending camera move timeouts to prevent conflicts
        if (cameraMoveTimeoutRef.current) {
          clearTimeout(cameraMoveTimeoutRef.current);
        }
        
        const newCameraPosition = {
          coordinates: newLocation,
          zoom: Math.max(14, Math.min(18, 16)), // Constrain zoom for location
        };
        mapRef.current.setCameraPosition({
          ...newCameraPosition,
          duration: 1500, // Slower animation to reduce vibration
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to get your current location. Please try again.');
    }
  };

  const toggleMapType = () => {
    setMapType(prevType => prevType === 'SATELLITE' ? 'NORMAL' : 'SATELLITE');
  };

  const fitToLandBounds = () => {
    if (landDetails && mapRef.current) {
      const landCenter = getLandCenter();
      
      // Clear any pending camera move timeouts to prevent conflicts
      if (cameraMoveTimeoutRef.current) {
        clearTimeout(cameraMoveTimeoutRef.current);
      }
      
      const newCameraPosition = {
        coordinates: landCenter,
        zoom: Math.max(14, Math.min(19, 17)), // Constrain zoom for fit bounds
      };
      mapRef.current.setCameraPosition({
        ...newCameraPosition,
        duration: 1500, // Slower animation to reduce vibration
      });
    }
  };

  const handleCameraMove = (event) => {
    // Clear previous timeout to debounce camera movement
    if (cameraMoveTimeoutRef.current) {
      clearTimeout(cameraMoveTimeoutRef.current);
    }
    
    // Debounce camera position updates to reduce vibration
    cameraMoveTimeoutRef.current = setTimeout(() => {
      if (event && event.coordinates && typeof event.zoom === 'number') {
        // Ensure zoom level is within bounds
        const zoom = Math.max(8, Math.min(22, event.zoom));
        setCameraPosition({
          coordinates: event.coordinates,
          zoom: zoom,
        });
      }
    }, 100); // 100ms debounce delay
  };

  const handleMapError = (error) => {
    console.error('Map error:', error);
    setMapError('Failed to load map');
    setIsLoading(false);
    Alert.alert(
      'Map Error', 
      'Unable to load the map. Please check your internet connection and try again.',
      [
        { text: 'Retry', onPress: () => { setMapError(null); initializeMap(); } },
        { text: 'Go Back', onPress: () => router.back() }
      ]
    );
  };

  if (mapError) {
    return (
      <View className="flex-1 bg-green-50 justify-center items-center">
        <FontAwesome name="exclamation-triangle" size={50} color="#ef4444" />
        <Text className="text-red-500 mt-4 text-lg font-semibold">Map Loading Error</Text>
        <Text className="text-gray-400 mt-2 text-center px-8">{mapError}</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-6 bg-green-500 px-6 py-3 rounded-lg">
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!landDetails || !cameraPosition || isLoading) {
    return (
      <View className="flex-1 bg-green-50 justify-center items-center">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="text-gray-500 mt-4 text-lg">Loading map data...</Text>
        <Text className="text-gray-400 mt-2">Please wait while we prepare your land boundaries</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-green-50">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="bg-green-500 pt-12 pb-4 px-6 z-10">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="mr-4 p-2"
          >
            <FontAwesome name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-xl font-bold">Land Boundaries</Text>
            <Text className="text-green-100 text-sm">
              Survey No: {landDetails.surveyNo} • {landDetails.area}
            </Text>
          </View>
        </View>
      </View>

      {/* Map Container */}
      <View className="flex-1 relative">
        <GoogleMaps.View
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          cameraPosition={cameraPosition}
          onCameraMove={handleCameraMove}
          onMapLoaded={() => {
            console.log('Map loaded successfully');
            setIsLoading(false);
            setTimeout(fitToLandBounds, 1500); // Increased delay for better stability
          }}
          onMapError={handleMapError}
          markers={getLandMarkers()}
          polylines={getLandPolylines()}
          properties={{
            mapType: mapType,
            isMyLocationEnabled: locationPermission,
            isTrafficEnabled: false,
            isBuildingEnabled: false,
            isIndoorEnabled: false,
          }}
          uiSettings={{
            compassEnabled: true,
            scaleBarEnabled: true,
            myLocationButtonEnabled: false,
            mapToolbarEnabled: false,
            rotationGesturesEnabled: true,
            scrollGesturesEnabled: true,
            tiltGesturesEnabled: true,
            zoomGesturesEnabled: true,
            zoomControlsEnabled: false,
            minZoomLevel: 8,
            maxZoomLevel: 22,
            consumeMapKeyEvents: false,
          }}
          userLocation={locationPermission && userLocation ? {
            coordinates: userLocation,
            followUserLocation: false,
          } : undefined}
        />

        {/* Map Controls */}
        <View className="absolute top-4 right-4 space-y-2">
          <TouchableOpacity 
            onPress={handleCenterOnLand}
            className="bg-white rounded-full p-3 shadow-lg border border-gray-200 mb-2"
          >
            <FontAwesome name="crosshairs" size={20} color="#374151" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={fitToLandBounds}
            className="bg-white rounded-full p-3 shadow-lg border border-gray-200 mb-2"
          >
            <FontAwesome name="expand" size={18} color="#374151" />
          </TouchableOpacity>
          
          {locationPermission && (
            <TouchableOpacity 
              onPress={handleLocateMe}
              className="bg-white rounded-full p-3 shadow-lg border border-gray-200"
            >
              <FontAwesome name="location-arrow" size={18} color="#374151" />
            </TouchableOpacity>
          )}
        </View>

        {/* Map Type Toggle */}
        <View className="absolute top-4 left-4">
          <TouchableOpacity 
            onPress={toggleMapType}
            className="bg-white rounded-lg px-3 py-2 shadow-lg border border-gray-200"
          >
            <Text className="text-gray-700 text-xs font-semibold capitalize">
              {mapType === 'SATELLITE' ? 'Satellite' : 'Standard'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Area Information - Fixed positioning */}
        <View style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: [{ translateX: -40 }]
        }}>
          <View className="bg-white rounded-lg px-4 py-2 shadow-lg border border-gray-200">
            <Text className="text-green-600 text-sm font-bold text-center">
              {landDetails.area}
            </Text>
          </View>
        </View>

        {/* Legend */}
        <View className="absolute bottom-24 left-4 bg-white rounded-lg p-3 shadow-lg border border-gray-200">
          <Text className="text-gray-800 font-semibold text-xs mb-2">Legend</Text>
          <View className="flex-row items-center mb-1">
            <View className="w-4 h-4 bg-green-500 rounded mr-2" style={{ opacity: 0.25 }} />
            <Text className="text-gray-600 text-xs">Land Parcel</Text>
          </View>
          <View className="flex-row items-center mb-1">
            <View className="w-4 h-2 border-green-500 border-2 mr-2" />
            <Text className="text-gray-600 text-xs">Boundaries</Text>
          </View>
          <View className="flex-row items-center mb-1">
            <View className="w-3 h-3 bg-green-600 rounded-full mr-2" />
            <Text className="text-gray-600 text-xs">Corner Points</Text>
          </View>
          {locationPermission && (
            <View className="flex-row items-center">
              <View className="w-4 h-4 bg-blue-500 rounded-full mr-2" />
              <Text className="text-gray-600 text-xs">Your Location</Text>
            </View>
          )}
        </View>
      </View>

      {/* Land Details Card */}
      <View className="bg-white px-6 py-4 border-t border-gray-200">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-800">{landDetails.surveyNo}</Text>
            <Text className="text-sm text-gray-600">{landDetails.village}, {landDetails.tehsil}, {landDetails.district}</Text>
          </View>
          <View className="items-end">
            <Text className="text-sm font-semibold text-gray-800">{landDetails.area}</Text>
            <Text className="text-xs text-gray-600">{landDetails.landType}</Text>
          </View>
        </View>
        
        <View className="flex-row items-center mb-4">
          <FontAwesome name="user" size={14} color="#6b7280" />
          <Text className="text-sm text-gray-600 ml-2">Owner: {landDetails.ownerName}</Text>
        </View>

        <CustomButton
          title="Confirm This is My Land"
          onPress={handleConfirmLand}
          variant="primary"
          icon={<FontAwesome name="check" size={18} color="white" />}
        />
        
        <TouchableOpacity onPress={() => router.back()} className="mt-3 mb-3">
          <Text className="text-gray-500 text-center">Go Back to Search</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}