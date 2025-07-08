/*
UserProfileScreen.js
Purppose: Show profile as a form of reputation
Features:
-profile pic
-name
-event details
-currently hosting events
*/

//React:
import React, { useEffect, useState } from "react";
import { 
    View, 
    Text, 
    StyleSheet, 
    ActivityIndicator, 
    Image, 
    ScrollView, 
    TouchableOpacity } from "react-native";
import { useRoute } from "@react-navigation/native";

//Firebase:
import { db } from "../firebaseConfig";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

//Extras:
import { Ionicons } from "@expo/vector-icons";

export default function UserProfileScreen({ navigation }) {
  //passwed in params to load profile
  const route = useRoute();
  const { uid } = route.params;

  const [userData, setUserData] = useState(null);
  const [attended, setAttended] = useState([]);
  const [hostedUpcoming, setHostedUpcoming] = useState([]);
  const [hostedPast, setHostedPast] = useState([]);
  const [loading, setLoading] = useState(true);

  //fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userRef = doc(db, "users", uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          setUserData(data);

          //events attended
          const attendedQuery = query(collection(db, "events"), where("registeredUsers", "array-contains", data.email));
          const attendedSnap = await getDocs(attendedQuery);
          setAttended(attendedSnap.docs.map(doc => doc.data()));

          //events hosted
          const hostedQuery = query(collection(db, "events"), where("hostEmail", "==", data.email));
          const hostedSnap = await getDocs(hostedQuery);

          const now = new Date();
          const upcoming = [];
          const past = [];

          hostedSnap.forEach((docSnap) => {
            const event = docSnap.data();
            const isFuture = event.eventSchedules?.some((schedule) => {
              try {
                const [endHour, endMinute] = schedule.endTime.match(/\d+/g).map(Number);
                const scheduleDate = new Date(schedule.date);
                scheduleDate.setHours(endHour);
                scheduleDate.setMinutes(endMinute);
                return scheduleDate > now;
              } catch {
                return false;
              }
            });
            if (isFuture) upcoming.push(event);
            else past.push(event);
          });

          setHostedUpcoming(upcoming);
          setHostedPast(past);
        }
      } catch (e) {
        console.error("Error loading user profile:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [uid]);

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 100 }} />;
  if (!userData) return <Text style={{ marginTop: 100, textAlign: "center" }}>User not found.</Text>;

  const avatarStyle = userData.avatarStyle || "adventurer";
  const avatarUrl = `https://api.dicebear.com/7.x/${avatarStyle}/png?seed=${uid}`;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      
        {/* Back Button Row */}
        <View style={styles.backRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        </View>
    
        {/* Profile Picture and Name */}
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        <Text style={styles.name}>{userData.name}</Text>

        <View style={styles.divider} />

        {/* Event details */}
        <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Events Attended</Text>
        <Text style={styles.infoValue}>{attended.length}</Text>
        </View>

        <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Currently Hosting</Text>
        <Text style={styles.infoValue}>{hostedUpcoming.length}</Text>
        </View>

        <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Hosted in the Past</Text>
        <Text style={styles.infoValue}>{hostedPast.length}</Text>
        </View>

        <View style={styles.divider} />

        {/* Events hosted */}
        <Text style={styles.label}>Current Events</Text>
        {hostedUpcoming.length === 0 ? (
        <Text style={{ color: "#555" }}>No current events hosted.</Text>
        ) : (
        hostedUpcoming.map((event, index) => (
            <TouchableOpacity
            key={index}
            style={styles.eventCard}
            onPress={() => navigation.navigate("EventScreen", { event })}
            >
            <Text style={{ fontWeight: "bold" }}>{event.name}</Text>
            <Text style={{ fontSize: 12, color: "#333" }}>{event?.description || "No description"}</Text>
            <Text style={{ fontSize: 12, color: "#555" }}>📍 {event?.location?.address || "No location"}</Text>
            </TouchableOpacity>
        ))
        )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 50,
    alignItems: "stretch",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: "center",
    marginBottom: 10,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: "#ccc",
    marginVertical: 15,
  },
  infoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  infoValue: {
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  eventCard: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 6,
    marginVertical: 5,
    borderColor: "#ddd",
    borderWidth: 1,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 20,
  },
});
