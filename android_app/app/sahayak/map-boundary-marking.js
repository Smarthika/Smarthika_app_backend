import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert,
  Dimensions,
  StyleSheet,
  Platform,
  ActivityIndicator,
  PanResponder
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { GoogleMaps } from 'expo-maps';
import * as Location from 'expo-location';
import CustomButton from '../../components/ui/CustomButton';

const { width, height } = Dimensions.get('window');

export default function MapBoundaryMarkingScreen() {
  const { landData: landDataParam, farmerId } = useLocalSearchParams();
  const [landData, setLandData] = useState(null);
  const [cameraPosition, setCameraPosition] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [mapType, setMapType] = useState('SATELLITE');
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState(null);
  const [boundaryPoints, setBoundaryPoints] = useState([]);
  const [isMarkingMode, setIsMarkingMode] = useState(false);
  const mapRef = useRef(null);
  const cameraMoveTimeoutRef = useRef(null);

  // Create PanResponder for touch handling as backup only
  const panResponder = PanResponder.create({
    // Only capture single taps, not pan gestures
    onStartShouldSetPanResponder: (evt, gestureState) => {
      return isMarkingMode && gestureState.numberActiveTouches === 1;
    },
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Don't capture move gestures to allow map panning and zooming
      return false;
    },
    onPanResponderGrant: (evt, gestureState) => {
      if (!isMarkingMode || gestureState.numberActiveTouches !== 1) return;
      
      // Only handle single tap, not pan gestures
      const { locationX, locationY } = evt.nativeEvent;
      
      // Simple timeout to distinguish tap from pan
      setTimeout(() => {
        if (gestureState.dx === 0 && gestureState.dy === 0) {
          // This was a tap, not a pan
          handleTouchToMapCoordinates(locationX, locationY);
        }
      }, 100);
    },
    onPanResponderMove: () => {
      // Don't handle move events to allow map gestures
      return false;
    },
  });

  const handleTouchToMapCoordinates = (screenX, screenY) => {
    if (!cameraPosition || !mapRef.current) return;
    
    // Convert screen coordinates to map coordinates
    const { coordinates, zoom } = cameraPosition;
    
    // Simple approximation for coordinate conversion
    const screenWidth = width;
    const screenHeight = height;
    const centerX = screenWidth / 2;
    const centerY = screenHeight / 2;
    
    // Calculate offset from center
    const offsetX = (screenX - centerX) / screenWidth;
    const offsetY = (centerY - screenY) / screenHeight; // Invert Y for lat/lng
    
    // Zoom-based scaling factor (improved formula)
    const scaleFactor = 0.005 / Math.pow(2, zoom - 12);
    
    const newCoordinates = {
      latitude: coordinates.latitude + (offsetY * scaleFactor),
      longitude: coordinates.longitude + (offsetX * scaleFactor)
    };
    
    console.log('Touch coordinates converted:', newCoordinates);
    handleAddBoundaryPoint(newCoordinates);
  };

  const handleAddBoundaryPoint = (coordinates) => {
    if (!isMarkingMode || !coordinates) {
      console.log('Cannot add point - marking mode:', isMarkingMode, 'coordinates:', coordinates);
      return;
    }
    
    console.log('Attempting to add boundary point:', coordinates);
    
    // Check if this point is too close to an existing point (prevent duplicates)
    const minDistance = 0.0001; // About 10 meters
    const isDuplicate = boundaryPoints.some(existingPoint => {
      const latDiff = Math.abs(existingPoint.latitude - coordinates.latitude);
      const lngDiff = Math.abs(existingPoint.longitude - coordinates.longitude);
      return latDiff < minDistance && lngDiff < minDistance;
    });
    
    if (isDuplicate) {
      console.log('Point too close to existing point, skipping');
      Alert.alert(
        'Duplicate Point',
        'This point is too close to an existing boundary point. Please select a different location.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setBoundaryPoints(prev => {
      const newPoints = [...prev, coordinates];
      console.log('Added boundary point. Total points:', newPoints.length);
      return newPoints;
    });
    
    // Show feedback to user
    Alert.alert(
      'Point Added',
      `Boundary point ${boundaryPoints.length + 1} added successfully!\nLat: ${coordinates.latitude.toFixed(6)}\nLng: ${coordinates.longitude.toFixed(6)}`,
      [{ text: 'OK' }]
    );
  };

  useEffect(() => {
    initializeMap();
  }, [landDataParam]);

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
    
    // Parse land data from params
    if (landDataParam) {
      try {
        const parsedData = JSON.parse(landDataParam);
        console.log('Parsed land data for boundary marking:', parsedData);
        setLandData(parsedData);
        
        // Set default camera position based on district or use Karnataka center
        let centerLat = 15.3173; // Default Karnataka coordinates
        let centerLng = 75.7139;
        
        // If there's existing geoJson, center on it
        if (parsedData.geoJson?.coordinates?.[0]?.length > 0) {
          const coords = parsedData.geoJson.coordinates[0];
          const validCoords = coords.filter(coord => 
            Array.isArray(coord) && 
            coord.length >= 2 && 
            !isNaN(coord[0]) && 
            !isNaN(coord[1])
          );
          
          if (validCoords.length > 0) {
            centerLat = validCoords.reduce((sum, coord) => sum + coord[1], 0) / validCoords.length;
            centerLng = validCoords.reduce((sum, coord) => sum + coord[0], 0) / validCoords.length;
            
            // Convert to boundary points for editing
            const points = validCoords.map(coord => ({
              latitude: coord[1],
              longitude: coord[0],
            }));
            setBoundaryPoints(points);
          }
        }
        
        const defaultCameraPosition = {
          coordinates: {
            latitude: centerLat,
            longitude: centerLng,
          },
          zoom: 16, // Start with a good zoom level for boundary marking
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

  const handleMapPress = (event) => {
    console.log('Map press event received:', event);
    console.log('Is marking mode active:', isMarkingMode);
    
    if (!isMarkingMode) {
      console.log('Not in marking mode, ignoring tap');
      return;
    }
    
    // Handle different possible event structures from expo-maps
    let coordinates = null;
    
    // Try multiple event structure patterns
    if (event?.coordinates?.latitude && event?.coordinates?.longitude) {
      coordinates = event.coordinates;
    } else if (event?.nativeEvent?.coordinates?.latitude && event?.nativeEvent?.coordinates?.longitude) {
      coordinates = event.nativeEvent.coordinates;
    } else if (event?.latitude && event?.longitude) {
      coordinates = { latitude: event.latitude, longitude: event.longitude };
    } else if (event?.nativeEvent?.latitude && event?.nativeEvent?.longitude) {
      coordinates = { latitude: event.nativeEvent.latitude, longitude: event.nativeEvent.longitude };
    }
    
    console.log('Extracted coordinates from tap:', coordinates);
    
    if (coordinates && typeof coordinates.latitude === 'number' && typeof coordinates.longitude === 'number') {
      // Validate coordinates are reasonable
      if (coordinates.latitude >= -90 && coordinates.latitude <= 90 && 
          coordinates.longitude >= -180 && coordinates.longitude <= 180) {
        console.log('Valid coordinates, adding boundary point');
        handleAddBoundaryPoint(coordinates);
      } else {
        console.log('Invalid coordinate values:', coordinates);
      }
    } else {
      console.log('No valid coordinates found in map press event');
    }
  };

  const getBoundaryMarkers = () => {
    const markers = boundaryPoints.map((point, index) => ({
      id: `boundary-${index}`,
      coordinates: point,
      title: `Point ${index + 1}`,
      showCallout: true,
    }));

    // Add user location if available
    if (locationPermission && userLocation) {
      markers.push({
        id: 'user-location',
        coordinates: userLocation,
        title: 'Your Location',
        showCallout: true,
      });
    }

    return markers;
  };

  const getBoundaryPolylines = () => {
    if (boundaryPoints.length < 2) return [];
    
    // Create lines connecting all boundary points
    const lines = [];
    for (let i = 0; i < boundaryPoints.length - 1; i++) {
      lines.push({
        id: `line-${i}`,
        coordinates: [boundaryPoints[i], boundaryPoints[i + 1]],
        color: 'rgba(34, 197, 94, 0.8)',
        width: 3,
      });
    }
    
    // Close the polygon if we have 3 or more points
    if (boundaryPoints.length >= 3) {
      lines.push({
        id: 'closing-line',
        coordinates: [boundaryPoints[boundaryPoints.length - 1], boundaryPoints[0]],
        color: 'rgba(34, 197, 94, 0.8)',
        width: 3,
      });
    }
    
    return lines;
  };

  const handleStartMarking = () => {
    console.log('Starting boundary marking mode');
    setIsMarkingMode(true);
    setBoundaryPoints([]);
    console.log('Marking mode set to true, boundary points cleared');
    Alert.alert(
      'Boundary Marking Mode',
      'You can now mark boundary points:\n\n• Tap directly on the map where you want to add points\n• Use pinch to zoom and pan to navigate\n• Position the crosshair and use "Add Center Point"\n• Use "Add Sample Boundary" for testing\n\nYou need at least 3 points to form a valid boundary.',
      [{ text: 'Start Marking' }]
    );
  };

  const handleStopMarking = () => {
    if (boundaryPoints.length < 3) {
      Alert.alert(
        'Insufficient Points',
        'You need at least 3 points to create a valid land boundary. Please add more points or cancel.',
        [
          { text: 'Continue Marking', style: 'cancel' },
          { text: 'Cancel', onPress: () => {
            setIsMarkingMode(false);
            setBoundaryPoints([]);
          }}
        ]
      );
      return;
    }
    
    setIsMarkingMode(false);
    Alert.alert(
      'Boundary Marked',
      `Successfully marked ${boundaryPoints.length} boundary points. You can now save these boundaries or continue editing.`,
      [{ text: 'OK' }]
    );
  };

  const handleUndoLastPoint = () => {
    if (boundaryPoints.length > 0) {
      setBoundaryPoints(prev => prev.slice(0, -1));
    }
  };

  const handleAddCurrentCenterPoint = async () => {
    if (!isMarkingMode) return;
    
    console.log('Attempting to add center point...');
    console.log('Current cameraPosition state:', cameraPosition);
    
    let currentCenterCoords = null;
    
    // Try to get current camera position from map ref first
    if (mapRef.current && mapRef.current.getCameraPosition) {
      try {
        const currentCamera = await mapRef.current.getCameraPosition();
        console.log('Camera position from map ref:', currentCamera);
        if (currentCamera && currentCamera.coordinates) {
          currentCenterCoords = currentCamera.coordinates;
        }
      } catch (error) {
        console.log('Could not get camera position from map ref:', error);
      }
    }
    
    // Fallback to state if map ref doesn't work
    if (!currentCenterCoords && cameraPosition && cameraPosition.coordinates) {
      currentCenterCoords = cameraPosition.coordinates;
      console.log('Using camera position from state:', currentCenterCoords);
    }
    
    if (currentCenterCoords) {
      console.log('Adding center point at coordinates:', currentCenterCoords);
      handleAddBoundaryPoint(currentCenterCoords);
    } else {
      console.log('No camera position available');
      Alert.alert(
        'Error',
        'Unable to get current map center. Please try moving the map slightly and try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleAddSampleBoundary = () => {
    if (!isMarkingMode) return;
    
    if (cameraPosition && cameraPosition.coordinates) {
      const center = cameraPosition.coordinates;
      const offset = 0.001; // Small offset for demo
      
      const samplePoints = [
        { latitude: center.latitude - offset, longitude: center.longitude - offset },
        { latitude: center.latitude - offset, longitude: center.longitude + offset },
        { latitude: center.latitude + offset, longitude: center.longitude + offset },
        { latitude: center.latitude + offset, longitude: center.longitude - offset },
      ];
      
      setBoundaryPoints(samplePoints);
      Alert.alert(
        'Sample Boundary Added',
        'A sample rectangular boundary has been added for testing!',
        [{ text: 'OK' }]
      );
    }
  };

  const handleRefreshPosition = async () => {
    console.log('Force refreshing camera position...');
    if (mapRef.current) {
      try {
        // Try to get current camera position directly from map
        const currentCamera = await mapRef.current.getCameraPosition();
        if (currentCamera && currentCamera.coordinates) {
          console.log('Refreshed camera position:', currentCamera);
          setCameraPosition(currentCamera);
          Alert.alert(
            'Position Refreshed',
            `Updated to: ${currentCamera.coordinates.latitude.toFixed(6)}, ${currentCamera.coordinates.longitude.toFixed(6)}`,
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.log('Error refreshing position:', error);
        Alert.alert('Error', 'Could not refresh position. Try moving the map slightly.');
      }
    }
  };

  const handleClearBoundaries = () => {
    Alert.alert(
      'Clear Boundaries',
      'Are you sure you want to clear all marked boundary points?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setBoundaryPoints([]);
            setIsMarkingMode(false);
          }
        }
      ]
    );
  };

  const handleSaveBoundaries = () => {
    if (boundaryPoints.length < 3) {
      Alert.alert('Error', 'Please mark at least 3 boundary points to create a valid land polygon.');
      return;
    }

    // Calculate approximate area based on polygon
    const calculatePolygonArea = (points) => {
      let area = 0;
      const n = points.length;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += points[i].longitude * points[j].latitude;
        area -= points[j].longitude * points[i].latitude;
      }
      return Math.abs(area) / 2;
    };

    const calculatedArea = calculatePolygonArea(boundaryPoints);
    const areaInSqMeters = calculatedArea * 111320 * 111320; // Rough conversion
    const areaInAcres = (areaInSqMeters / 4047).toFixed(2);

    // Convert boundary points to GeoJSON format
    const geoJsonCoordinates = boundaryPoints.map(point => [point.longitude, point.latitude]);
    // Close the polygon by adding the first point at the end
    geoJsonCoordinates.push([boundaryPoints[0].longitude, boundaryPoints[0].latitude]);

    const updatedLandData = {
      ...landData,
      calculatedArea: `${areaInAcres} acres`,
      geoJson: {
        type: 'Polygon',
        coordinates: [geoJsonCoordinates]
      }
    };

    Alert.alert(
      'Save Boundaries',
      `Survey No: ${landData?.surveyNo}\nMarked Points: ${boundaryPoints.length}\nCalculated Area: ~${areaInAcres} acres\n\nSave these boundaries?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save Boundaries',
          onPress: () => {
            console.log('Saving boundaries and returning to land registration');
            console.log('Updated land data being passed back:', updatedLandData);
            
            // Navigate back with the updated data
            router.navigate({
              pathname: '/sahayak/land-registration',
              params: {
                farmerId: farmerId,
                landData: JSON.stringify(updatedLandData),
                boundariesMarked: 'true'
              }
            });
          }
        }
      ]
    );
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
        const newCameraPosition = {
          coordinates: newLocation,
          zoom: Math.max(14, Math.min(18, 16)),
        };
        mapRef.current.setCameraPosition({
          ...newCameraPosition,
          duration: 1500,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to get your current location. Please try again.');
    }
  };

  const toggleMapType = () => {
    setMapType(prevType => prevType === 'SATELLITE' ? 'NORMAL' : 'SATELLITE');
  };

  const handleCameraMove = (event) => {
    // Clear previous timeout to debounce camera movement
    if (cameraMoveTimeoutRef.current) {
      clearTimeout(cameraMoveTimeoutRef.current);
    }
    
    // Reduced debounce delay for more responsive updates
    cameraMoveTimeoutRef.current = setTimeout(() => {
      if (event && event.coordinates && typeof event.zoom === 'number') {
        // Ensure zoom level is within bounds
        const zoom = Math.max(8, Math.min(22, event.zoom));
        const newCameraPosition = {
          coordinates: event.coordinates,
          zoom: zoom,
        };
        
        console.log('Camera moved to:', newCameraPosition);
        setCameraPosition(newCameraPosition);
      } else {
        console.log('Invalid camera move event:', event);
      }
    }, 50); // Reduced from 100ms to 50ms for more responsive updates
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
      <View className="flex-1 bg-blue-50 justify-center items-center">
        <FontAwesome name="exclamation-triangle" size={50} color="#ef4444" />
        <Text className="text-red-500 mt-4 text-lg font-semibold">Map Loading Error</Text>
        <Text className="text-gray-400 mt-2 text-center px-8">{mapError}</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-6 bg-blue-500 px-6 py-3 rounded-lg">
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!landData || !cameraPosition || isLoading) {
    return (
      <View className="flex-1 bg-blue-50 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-gray-500 mt-4 text-lg">Loading map...</Text>
        <Text className="text-gray-400 mt-2">Preparing boundary marking interface</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-blue-50">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="bg-blue-500 pt-12 pb-4 px-6 z-10">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="mr-4 p-2"
          >
            <FontAwesome name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-xl font-bold">Mark Land Boundaries</Text>
            <Text className="text-blue-100 text-sm">
              Survey No: {landData.surveyNo} • Farmer ID: {farmerId}
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
          onCameraIdle={handleCameraMove}
          onMapPress={handleMapPress}
          onMapLongPress={handleMapPress}
          onMapLoaded={() => {
            console.log('Boundary marking map loaded successfully');
            setIsLoading(false);
          }}
          onMapError={handleMapError}
          markers={getBoundaryMarkers()}
          polylines={getBoundaryPolylines()}
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
            // Ensure gestures work properly in marking mode
            scrollGesturesEnabledDuringRotateOrZoom: true,
          }}
          userLocation={locationPermission && userLocation ? {
            coordinates: userLocation,
            followUserLocation: false,
          } : undefined}
        />

        {/* Touch Overlay only when map press doesn't work - reduced interference */}
        {isMarkingMode && (
          <View
            style={[StyleSheet.absoluteFillObject, { backgroundColor: 'transparent' }]}
            pointerEvents={isMarkingMode ? "auto" : "none"}
            {...panResponder.panHandlers}
          />
        )}

        {/* Map Controls */}
        <View className="absolute top-4 right-4 space-y-2">
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

        {/* Marking Status */}
        {isMarkingMode && (
          <View className="absolute top-4 left-1/2 transform -translate-x-1/2">
            <View className="bg-green-500 rounded-lg px-4 py-2 shadow-lg">
              <Text className="text-white text-sm font-bold text-center">
                🎯 Marking Mode ({boundaryPoints.length} points)
              </Text>
              <Text className="text-white text-xs text-center mt-1">
                Tap map • Zoom & Pan freely
              </Text>
            </View>
          </View>
        )}

        {/* Center Crosshair for Manual Point Addition */}
        {isMarkingMode && (
          <View className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <View className="w-8 h-8 items-center justify-center">
              <View className="w-full h-0.5 bg-red-500 absolute" />
              <View className="h-full w-0.5 bg-red-500 absolute" />
              <View className="w-2 h-2 border-2 border-red-500 rounded-full bg-white" />
            </View>
          </View>
        )}

        {/* Current Coordinates Display */}
        {isMarkingMode && cameraPosition?.coordinates && (
          <View className="absolute bottom-32 right-4 bg-white rounded-lg p-2 shadow-lg border border-gray-200">
            <Text className="text-xs font-semibold text-gray-800">Crosshair Position:</Text>
            <Text className="text-xs text-gray-600">
              Lat: {cameraPosition.coordinates.latitude.toFixed(6)}
            </Text>
            <Text className="text-xs text-gray-600">
              Lng: {cameraPosition.coordinates.longitude.toFixed(6)}
            </Text>
          </View>
        )}

        {/* Points Counter */}
        <View className="absolute top-16 left-1/2 transform -translate-x-1/2">
          <View className="bg-white rounded-lg px-4 py-2 shadow-lg border border-gray-200">
            <Text className="text-blue-600 text-sm font-bold text-center">
              Points: {boundaryPoints.length}
            </Text>
          </View>
        </View>

        {/* Legend */}
        <View className="absolute bottom-40 left-4 bg-white rounded-lg p-3 shadow-lg border border-gray-200">
          <Text className="text-gray-800 font-semibold text-xs mb-2">Legend</Text>
          <View className="flex-row items-center mb-1">
            <View className="w-3 h-3 bg-green-600 rounded-full mr-2" />
            <Text className="text-gray-600 text-xs">Boundary Points</Text>
          </View>
          <View className="flex-row items-center mb-1">
            <View className="w-4 h-2 border-green-500 border-2 mr-2" />
            <Text className="text-gray-600 text-xs">Boundaries</Text>
          </View>
          {locationPermission && (
            <View className="flex-row items-center">
              <View className="w-4 h-4 bg-blue-500 rounded-full mr-2" />
              <Text className="text-gray-600 text-xs">Your Location</Text>
            </View>
          )}
        </View>
      </View>

      {/* Control Panel */}
      <View className="bg-white px-6 py-4 border-t border-gray-200">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-800">{landData.surveyNo}</Text>
            <Text className="text-sm text-gray-600">{landData.village}, {landData.tehsil}</Text>
          </View>
          <View className="items-end">
            <Text className="text-sm font-semibold text-gray-800">{landData.area}</Text>
            <Text className="text-xs text-gray-600">Area</Text>
          </View>
        </View>

        <View className="space-y-3">
          {!isMarkingMode ? (
            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 bg-green-500 rounded-lg py-3"
                onPress={handleStartMarking}
              >
                <View className="flex-row items-center justify-center">
                  <FontAwesome name="plus" size={16} color="white" />
                  <Text className="text-white font-semibold ml-2">Start Marking</Text>
                </View>
              </TouchableOpacity>
              
              {boundaryPoints.length > 0 && (
                <TouchableOpacity
                  className="flex-1 bg-red-500 rounded-lg py-3"
                  onPress={handleClearBoundaries}
                >
                  <View className="flex-row items-center justify-center">
                    <FontAwesome name="trash" size={16} color="white" />
                    <Text className="text-white font-semibold ml-2">Clear</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View className="space-y-2">
              <View className="flex-row space-x-3">
                <TouchableOpacity
                  className="flex-1 bg-orange-500 rounded-lg py-3"
                  onPress={handleStopMarking}
                >
                  <View className="flex-row items-center justify-center">
                    <FontAwesome name="stop" size={16} color="white" />
                    <Text className="text-white font-semibold ml-2">Finish Marking</Text>
                  </View>
                </TouchableOpacity>
                
                {boundaryPoints.length > 0 && (
                  <TouchableOpacity
                    className="bg-gray-500 rounded-lg py-3 px-4"
                    onPress={handleUndoLastPoint}
                  >
                    <View className="flex-row items-center justify-center">
                      <FontAwesome name="undo" size={16} color="white" />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Manual point addition button */}
              <TouchableOpacity
                className="bg-blue-500 rounded-lg py-3"
                onPress={handleAddCurrentCenterPoint}
              >
                <View className="flex-row items-center justify-center">
                  <FontAwesome name="crosshairs" size={16} color="white" />
                  <Text className="text-white font-semibold ml-2">Add Center Point</Text>
                </View>
              </TouchableOpacity>
              
              {/* Position refresh button */}
              <View className="flex-row space-x-2">
                <TouchableOpacity
                  className="flex-1 bg-orange-500 rounded-lg py-3"
                  onPress={handleRefreshPosition}
                >
                  <View className="flex-row items-center justify-center">
                    <FontAwesome name="refresh" size={16} color="white" />
                    <Text className="text-white font-semibold ml-2">Refresh Position</Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity
                  className="flex-1 bg-purple-500 rounded-lg py-3"
                  onPress={handleAddSampleBoundary}
                >
                  <View className="flex-row items-center justify-center">
                    <FontAwesome name="square" size={16} color="white" />
                    <Text className="text-white font-semibold ml-2">Sample</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {boundaryPoints.length >= 3 && !isMarkingMode && (
            <CustomButton
              title="Save Boundaries"
              onPress={handleSaveBoundaries}
              variant="primary"
              icon={<FontAwesome name="check" size={18} color="white" />}
            />
          )}
        </View>
        
        <TouchableOpacity onPress={() => router.back()} className="mt-3">
          <Text className="text-gray-500 text-center">Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
