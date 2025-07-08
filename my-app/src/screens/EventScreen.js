/*
EventScreen.js
Purppose: Show event details along with host information(later) 
Features:
-Should display selected event's information.
-If user is interested they can pay (if charged) if not paid can sign up for it.
-Show location between event and user
-Show pictures (later)
-Allow users to register
-Allow hosts to delete
*/

//React:
import React, { useEffect, useState, useRef, useContext } from "react";
import { 
  View, 
  Button, 
  StyleSheet, 
  Text, 
  SafeAreaView, 
  ActivityIndicator, 
  Alert, 
  ScrollView,
  Image,
  TouchableWithoutFeedback,
  Keyboard,
  TouchableOpacity } from "react-native";
import { useRoute } from "@react-navigation/native";

import { doc, updateDoc, getDoc, arrayUnion, deleteDoc, arrayRemove } from "firebase/firestore";
import { db } from "../firebaseConfig";

//Extas:
import { AuthContext } from "../../App";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps"; 
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";


export default function EventScreen({ navigation }) {
  //user context MUST!!
  const { user } = useContext(AuthContext);

  //Passed params:
  const route = useRoute();
  const { event, distance } = route.params || {};
  
  const [hostName, setHostName] = useState("Unknown Host");
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);
  const isHost = event?.hostEmail === user?.email;
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(event?.likedBy?.length || 0);

  //Get device location.
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permission to access location was denied");
        setLoading(false);
        return;
      }
      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation.coords);
      setLoading(false);
    })();
  }, []);

  //To zoom and fit both marker and user on map.
  useEffect(() => {
    if (location && event?.location && mapRef.current) {
      setTimeout(() => {
        mapRef.current.fitToCoordinates(
          [
            { latitude: location.latitude, longitude: location.longitude },
            { latitude: event.location.latitude, longitude: event.location.longitude }
          ],
          { edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, animated: true }
        );
      }, 500);
    }
  }, [location, event]);

  //Load current event registeration info.
  useEffect(() => {
    if (!event?.id) return;
    const fetchEvent = async () => {
      const eventRef = doc(db, "events", event.id);
      const snap = await getDoc(eventRef);
      if (snap.exists()) {
        setRegisteredUsers(snap.data().registeredUsers || []);
      }
    };
    fetchEvent();
  }, [event]);

  //Fetch host name dynamically for displaying.
  useEffect(() => {
    const fetchHostName = async () => {
      if (!event?.hostUid) return;
      try {
        const hostRef = doc(db, "users", event.hostUid);
        const hostSnap = await getDoc(hostRef);
        if (hostSnap.exists()) {
          const data = hostSnap.data();
          if (data?.name) setHostName(data.name);
        }
      } catch (e) {
        console.error("Error fetching host name:", e);
      }
    };
    fetchHostName();
  }, [event?.hostUid]);

  //Check liked status
  useEffect(() => {
    const fetchLikes = async () => {
      if (!event?.id || !user?.uid) return;
      const eventRef = doc(db, "events", event.id);
      const snap = await getDoc(eventRef);
      if (snap.exists()) {
        const data = snap.data();
        setLikesCount(data.likedBy?.length || 0);
        setLiked(data.likedBy?.includes(user.uid));
      }
    };
    fetchLikes();
  }, [event?.id, user?.uid]);

  //Liking function
  const toggleLike = async () => {
    if (!user?.uid || !event?.id) return;

    const eventRef = doc(db, "events", event.id);
    const updatedLikes = liked
      ? arrayRemove(user.uid)
      : arrayUnion(user.uid);

    try {
      await updateDoc(eventRef, {
        likedBy: updatedLikes,
      });

      setLiked(!liked);
      setLikesCount((prev) => prev + (liked ? -1 : 1));
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  };

  //Check if user is already regsitered to show button to register or not.
  const isUserRegisteredForDate = (date) => {
    return registeredUsers.some(u => u.email === user.email && u.date === date);
  };

  //Register user for specific date 
  const registerForDate = async (selectedDate) => {
    if (!user?.email || isHost) return;

    const alreadyRegistered = isUserRegisteredForDate(selectedDate);
    if (alreadyRegistered) {
      Alert.alert("Already Registered", "You're already registered for this date.");
      return;
    }

    const countForDate = registeredUsers.filter(u => u.date === selectedDate).length;
    const max = event.occupancy;
    if (max > 0 && countForDate >= max) {
      Alert.alert("Full", "This date is already fully booked.");
      return;
    }

    try {
      const eventRef = doc(db, "events", event.id);
      await updateDoc(eventRef, {
        registeredUsers: arrayUnion({ email: user.email, date: selectedDate })
      });
      const updatedUsers = [...registeredUsers, { email: user.email, date: selectedDate }];
      setRegisteredUsers(updatedUsers);
      Alert.alert("Success", "You’ve registered for the event!");

      const hostRef = doc(db, "users", event.hostUid);
      const hostSnap = await getDoc(hostRef);
      const hostData = hostSnap.data();

    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not register. Try again later.");
    }
  };

  //Host permission to delete event.
  const handleDeleteEvent = async () => {
    Alert.alert(
      "Delete Event",
      "Are you sure you want to delete this event? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "events", event.id));
              Alert.alert("Deleted", "Event has been successfully deleted.");
              navigation.goBack();
            } catch (error) {
              console.error("Error deleting event:", error);
              Alert.alert("Error", "Failed to delete event. Try again.");
            }
          },
        },
      ]
    );
  };

  return (
  <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {/* Title & Backbutton */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color="black" />
            </TouchableOpacity>
            <Text style={styles.headerText} numberOfLines={1} ellipsizeMode="tail">
              {event?.name || "Event Name"}
            </Text>
          </View>

          {/* Map */}
          {loading ? (
            <ActivityIndicator size="large" color="blue" style={styles.loader} />
          ) : (
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: location?.latitude || 0,
                longitude: location?.longitude || 0,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              showsUserLocation={true}
              showsMyLocationButton={true}
            >
              {event?.location && (
                <Marker
                  coordinate={{
                    latitude: event.location.latitude,
                    longitude: event.location.longitude,
                  }}
                  title={event.name}
                  description={event.description}
                />
              )}
            </MapView>
          )}

          {/* Description & Price */}
          <View style={styles.descriptionContainer}>
            <View style={styles.descriptionHeaderRow}>
              <Text style={styles.descriptionTitle}>About This Event</Text>
              <Text style={styles.priceText}>${event?.price || 0}</Text>
            </View>

            {(hostName || distance !== undefined) && (
             <View style={styles.subInfoRow}>
             {/* Host and distance info */}
             <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingRight: 40 }}>
               {hostName && (
                 <TouchableOpacity onPress={() => navigation.navigate("UserProfileScreen", { uid: event.hostUid })}>
                   <Text style={[styles.subInfoText, { textDecorationLine: "underline", color: "#007AFF" }]}>
                     Host: {hostName}
                   </Text>
                 </TouchableOpacity>
               )}
               {distance !== undefined && (
                 <Text style={styles.subInfoText}>• {distance.toFixed(1)} km away</Text>
               )}
             </View>
           
             {/* Heart Icon */}
             <TouchableOpacity
               onPress={toggleLike}
               style={{
                 position: "absolute",
                 right: 0,
               }}
             >
               <Ionicons
                 name={liked ? "heart" : "heart-outline"}
                 size={24}
                 color={liked ? "red" : "gray"}
               />
             </TouchableOpacity>
           </View>
            )}

            <Text style={styles.description}>{event?.description || "No description available."}</Text>

            {/* Images */}
            {event?.imageUrls?.length > 0 && (
              <View style={styles.imageContainer}>
                {event.imageUrls.map((uri, index) => (
                  <TouchableOpacity key={index} activeOpacity={1}>
                    <Image
                      source={{ uri }}
                      style={styles.eventImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          
          {/* Schedule */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>Schedule</Text>
            {event?.eventSchedules?.length === 1 ? (
              <View style={styles.scheduleCard}>
                <Text>Date: {event.eventSchedules[0].date}</Text>
                <Text>Time: {event.eventSchedules[0].startTime} - {event.eventSchedules[0].endTime}</Text>
                <Text>Spots left: {event.occupancy - registeredUsers.filter((u) => u.date === event.eventSchedules[0].date).length}</Text>
                {!isHost && !isUserRegisteredForDate(event.eventSchedules[0].date) && (
                  <Button title="Register" onPress={() => registerForDate(event.eventSchedules[0].date)} color="black" />
                )}
                {isUserRegisteredForDate(event.eventSchedules[0].date) && (
                  <Button title="Registered ✅" disabled={true} color="gray" />
                )}
              </View>
            ) : (
              event.eventSchedules.map((schedule, idx) => {
                const spotsLeft = event.occupancy - registeredUsers.filter((u) => u.date === schedule.date).length;
                return (
                  <View key={idx} style={styles.scheduleCard}>
                    <Text>Date: {schedule.date}</Text>
                    <Text>Time: {schedule.startTime} - {schedule.endTime}</Text>
                    <Text>Spots left: {spotsLeft}</Text>
                    {!isHost && !isUserRegisteredForDate(schedule.date) && (
                      <Button title="Register for this date" onPress={() => registerForDate(schedule.date)} color="black" />
                    )}
                    {isUserRegisteredForDate(schedule.date) && (
                      <Button title="Registered ✅" disabled={true} color="gray" />
                    )}
                  </View>
                );
              })
            )}
          </View>
          
          {/* Delete button for host ONLY */}
          {isHost && (
            <View style={styles.hostContainer}>
              <Text style={styles.hostText}>You are the host of this event.</Text>
              <Button title="Delete Event" onPress={handleDeleteEvent} color="grey" />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    paddingTop: 30,
  },
  map: {
    width: "100%",
    height: 250,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  descriptionContainer: {
    marginTop: 15,
    paddingHorizontal: 20,
  },
  descriptionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  priceText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "green",
  },
  description: {
    fontSize: 16,
    textAlign: "justify",
    marginBottom: 10,
  },
  imageContainer: {
    gap: 15,
    marginTop: 10,
  },
  eventImage: {
    width: "100%",
    height: 220,
    borderRadius: 8,
  },
  scheduleCard: {
    marginBottom: 10,
    backgroundColor: "#eee",
    padding: 10,
    borderRadius: 5,
  },
  hostContainer: {
    marginTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  hostText: {
    textAlign: "center",
    fontStyle: "italic",
    color: "gray",
    marginBottom: 10,
  },
  subInfoRow: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  subInfoText: {
    fontSize: 14,
    color: "#444",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 30,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  backButton: {
    paddingRight: 50,
    paddingVertical: 5,
  },
  headerText: {
    fontSize: 28,
    fontWeight: "bold",
    flexShrink: 1,
  },
});
