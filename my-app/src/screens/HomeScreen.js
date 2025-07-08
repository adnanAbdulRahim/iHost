/*
HomeScreen.js
Purpose: Display nearby events to the user based on their current location
Features:
- Pulls user location
- Filters events by radius
- Displays categorized events (Featured, Paid, Free, Marketplace, Gigs, Services)
*/

//React:
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from "react-native";

//Firebase:
import { collection, onSnapshot, doc } from "firebase/firestore";
import { db } from "../firebaseConfig";

//Extas:
import { AuthContext } from "../../App";
import * as Location from "expo-location";

export default function HomeScreen({ navigation }) {
  //user context MUST!
  const { user } = React.useContext(AuthContext);
  
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [eventRadius, setEventRadius] = useState(null);

  //Helper function to calculate distance between user and event location using the Haversine formula
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  //Helper function to fetches user's preferred event radius from Firestore
  useEffect(() => {
    if (!user?.uid) return;

    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const radius = docSnap.data().eventRadius;
        setEventRadius(radius);
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  //Get user's current location to show nearyby events within user's eventRadius.
  useEffect(() => {
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.log("Permission to access location was denied");
          setLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location.coords);
      } catch (error) {
        console.error("Error getting user location:", error);
      }
    };

    getLocation();
  }, []);

  //Filters events by eventRadius and event dates.
  //Note not deleting expired events because we need to get information to display on account tab.
  //like hosted events and hosting events as well as attended events.
  useEffect(() => {
    if (!userLocation || eventRadius === null) return;

    const eventsRef = collection(db, "events");
    const unsubscribe = onSnapshot(eventsRef, (snapshot) => {
      const now = new Date();

      const nearbyEvents = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((event) => {
          if (!event.location) return false;
          const isOpenEnded = event.isOpenEnded === true;
          if (!isOpenEnded && (!event.eventSchedules || !event.eventSchedules.length)) return false;
          

          const hasFutureSchedule = event.eventSchedules.some((schedule) => {
            try {
              const date = new Date(schedule.date);
              const [timeStr, period] = schedule.endTime.split(/\s/);
              const [hoursStr, minutesStr] = timeStr.split(":");
              let hours = parseInt(hoursStr);
              const minutes = parseInt(minutesStr);

              if (period?.toLowerCase().includes("p") && hours < 12) hours += 12;
              if (period?.toLowerCase().includes("a") && hours === 12) hours = 0;

              date.setHours(hours, minutes, 0, 0);
              return date > now;
            } catch (e) {
              console.error("Invalid schedule format:", schedule, e);
              return false;
            }
          });

          if (!isOpenEnded && !hasFutureSchedule) return false;

          const distance = getDistance(
            userLocation.latitude,
            userLocation.longitude,
            event.location.latitude,
            event.location.longitude
          );

          return distance <= eventRadius;
        });

      setEvents(nearbyEvents);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userLocation, eventRadius]);

  //Categorize events
  const featuredEvents = events.filter((e) => e.likesCount >= 10);
  const freeEvents = events.filter((e) => e.category === "free");
  const serviceEvents = events.filter((e) => e.category === "services");
  const marketplaceEvents = events.filter((e) => e.category === "marketplace");
  const gigEvents = events.filter((e) => e.category === "gigs");
  const paidEvents = events.filter((e) => e.category === "paid");
  

  //Render each event card.
  const renderEventItem = ({ item }) => {
    const distance = getDistance(
      userLocation.latitude,
      userLocation.longitude,
      item.location.latitude,
      item.location.longitude
    );
  
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: item.cardColor || "#fffdfa" }]}
        onPress={() => navigation.navigate("EventScreen", {
          event: item,
          distance,
        })}
      >
        <View style={styles.pinDot} />
  
        <Text style={styles.eventName}>{item.name}</Text>
        <Image source={{ uri: item.imageUrl }} style={styles.eventImage} />
        <View style={styles.eventInfo}>
          <View style={styles.priceDistanceRow}>
            <Text style={styles.eventPrice}>{item.price > 0 ? `$${item.price}` : "Free"}</Text>
            <Text style={styles.eventDistance}>{distance.toFixed(1)} km</Text>
          </View>
          <Text style={styles.eventDescription} numberOfLines={2}>{item.description}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  //Render card space.
  const renderSection = (title, data) => {
    if (!data.length) return null;

    return (
      <View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionArrow}>→</Text>
        </View>
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderEventItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        />
      </View>
    );
  };

  return (
  <SafeAreaView style={styles.container}>
    
    {/* Title */}
    <Text style={styles.header}>Nearby Events</Text>

    {/* Cards */}
    {loading ? (
      <ActivityIndicator size="large" color="blue" style={styles.loader} />
    ) : (
      <ScrollView>
        {renderSection("Featured Events", featuredEvents)}
        {renderSection("Free Events", freeEvents)}
        {renderSection("Service Events", serviceEvents)}
        {renderSection("Marketplace Events", marketplaceEvents)}
        {renderSection("Gigs & Odd Jobs", gigEvents)}
        {renderSection("Paid Events", paidEvents)}

    </ScrollView>
    )}

  </SafeAreaView>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingVertical: 10,
  },
  header: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    paddingTop: 30,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingRight: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 10,
    padding: 10,
  },
  sectionArrow: {
    fontSize: 25,
    color: "#000",
  },
  horizontalList: {
    paddingHorizontal: 10,
    paddingBottom: 3,
  },
  card: {
    width: 170,
    backgroundColor: "#fffdfa",
    padding: 14,
    marginHorizontal: 5,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    position: "relative",
    alignItems: "center", 
  },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#e10000",
    position: "absolute",
    top: 8,
    marginLeft: -6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  eventName: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 8,
    color: "#333",
  },
  eventImage: {
    width: "100%",
    height: 100,
  },
  eventInfo: {
    marginTop: 5,
    width: "100%",
  },
  eventPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "green",
  },
  eventDescription: {
    fontSize: 12,
    left: 0,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  priceDistanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  eventDistance: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
  },
});
