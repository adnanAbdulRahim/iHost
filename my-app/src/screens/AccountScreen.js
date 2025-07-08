/*
AccountScreen.js
Purpose: Display account details, currently hosting, and hosted events and logout.
Features:
-Big name displayed along with pfp(later)
-Events hosted
-Events attended
-Radius(is used to decide which events to show based on distance)
-Show attended, currently hosting and hosted events.
-Allow user to log out, clearing the AsyncStorage for 'this' user.
-pfp API = https://www.dicebear.com/how-to-use/http-api/
*/

//React:
import React, { useEffect, useState, useContext } from "react";
import { 
  SafeAreaView, 
  View, 
  Text, 
  StyleSheet, 
  Button, 
  Alert, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Image,
  Modal,
  FlatList } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

//Firebase:
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

//Extras:
import { AuthContext } from "../../App";
import RNPickerSelect from "react-native-picker-select";
import { Ionicons } from "@expo/vector-icons";

export default function AccountScreen({ navigation }) {
  //user context MUST!
  const { user, setUser } = useContext(AuthContext);

  //profile pic
  const defaultStyle = user?.avatarStyle || "adventurer";
  const avatarUrl = `https://api.dicebear.com/7.x/${defaultStyle}/png?seed=${user?.uid || "default"}`;
  const avatarStyles = [
    "adventurer", "big-ears", "micah", "personas", "lorelei", "miniavs", "thumbs", "shapes"
  ];
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);

  //Allow user name change
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || "");

  const [hostedEvents, setHostedEvents] = useState({ upcoming: [], past: [] });
  const [attendedEvents, setAttendedEvents] = useState([]);
  const [eventRadius, setEventRadius] = useState(10);

  //Get user info
  useEffect(() => {
    const getUserInfo = async () => {
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      }
    };
    getUserInfo();
  }, []);

  //Getting live user radius because if not it is always stuck on default value set during sign-up which is 10.
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setEventRadius(data.eventRadius);
        AsyncStorage.setItem("user", JSON.stringify(data));
      }
    });
    return () => unsubscribe();
  }, [user]);

  //Update radius on firestore for dispalying events on home screen.
  const updateRadius = async (value) => {
    setEventRadius(value);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { eventRadius: value });
      const updatedUser = { ...user, eventRadius: value };
      setUser(updatedUser);
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      Alert.alert("Radius Updated", `Your radius has been set to ${value} km`);
    } catch (error) {
      console.error("Error updating event radius:", error);
      Alert.alert("Error", "Failed to update radius. Try again.");
    }
  };

  //keep track of events attended by user
  useEffect(() => {
    if (!user?.email) return;
    const eventsQuery = query(collection(db, "events"), where("registeredUsers", "array-contains", user.email));
    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      setAttendedEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  //track events hosted by user
  useEffect(() => {
    if (!user?.email) return;
    const eventsQuery = query(collection(db, "events"), where("hostEmail", "==", user.email));
    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      const now = new Date();
      const upcoming = [];
      const past = [];
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const isFuture = data.eventSchedules?.some((schedule) => {
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
        if (isFuture) upcoming.push({ id: docSnap.id, ...data });
        else past.push({ id: docSnap.id, ...data });
      });
      setHostedEvents({ upcoming, past });
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("user");
      setUser(null);
      Alert.alert("Logged Out", "You have been logged out.");
    } catch (error) {
      console.error("Logout failed:", error);
      Alert.alert("Error", "Logout failed. Try again.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">

        {/* Profile */}
        <Modal visible={avatarModalVisible} animationType="slide">
        <View style={{ flex: 1, padding: 20 }}>
          <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 10 }}>Choose an Avatar Style</Text>
          <FlatList
            data={avatarStyles}
            keyExtractor={(item) => item}
            numColumns={2}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const userRef = doc(db, "users", user.uid);
                    await updateDoc(userRef, { avatarStyle: item });
                    const updatedUser = { ...user, avatarStyle: item };
                    setUser(updatedUser);
                    await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
                    setAvatarModalVisible(false);
                  } catch (e) {
                    console.error("Error updating avatar:", e);
                    Alert.alert("Error", "Could not change avatar.");
                  }
                }}
                style={{ alignItems: "center", margin: 10 }}
              >
                <Image
                  source={{ uri: `https://api.dicebear.com/7.x/${item}/png?seed=${user?.uid}` }}
                  style={{ width: 70, height: 70, borderRadius: 35 }}
                />
                <Text style={{ fontSize: 15, marginTop: 5 }}>{item}</Text>
              </TouchableOpacity>
            )}
          />
          <Button title="Cancel" color='black' onPress={() => setAvatarModalVisible(false)} />
        </View>
      </Modal>
        <View style={styles.profileContainer}>
        <View style={styles.profileIconWrapper}>
        <TouchableOpacity onPress={() => setAvatarModalVisible(true)}>
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        </TouchableOpacity>
        </View>

        {editingName ? (
          <View style={styles.editRow}>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              style={styles.nameInput}
              placeholder="Enter new name"
            />
            <TouchableOpacity
              onPress={async () => {
                if (!newName.trim()) return;
                try {
                  const userRef = doc(db, "users", user.uid);
                  await updateDoc(userRef, { name: newName });
                  const updatedUser = { ...user, name: newName };
                  setUser(updatedUser);
                  await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
                  setEditingName(false);
                  Alert.alert("Success", "Name updated!");
                } catch (e) {
                  console.error("Error updating name:", e);
                  Alert.alert("Error", "Could not update name.");
                }
              }}
            >
              <Text style={styles.saveBtn}>Save</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.editRow}>
            <Text style={styles.name}>{user?.name || "User Name"}</Text>
            <TouchableOpacity onPress={() => setEditingName(true)} style={styles.iconButton}>
              <Ionicons name="pencil-outline" size={20} color="black" />
            </TouchableOpacity>
          </View>
        )}
      </View>
          
        <View style={styles.divider} />

        {/* Event Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Events Attended</Text>
          <Text style={styles.infoValue}>{attendedEvents.length}</Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Currently Hosting</Text>
          <Text style={styles.infoValue}>{hostedEvents.upcoming?.length || 0}</Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Hosted in the Past</Text>
          <Text style={styles.infoValue}>{hostedEvents.past?.length || 0}</Text>
        </View>

        <View style={styles.divider} />

        {/* Radius Selector */}
        <Text style={styles.label}>Preferred Event Radius:</Text>
        <RNPickerSelect
          onValueChange={updateRadius}
          value={eventRadius}
          items={[
            { label: "1 km", value: 1 },
            { label: "5 km", value: 5 },
            { label: "10 km", value: 10 },
            { label: "15 km", value: 15 },
            { label: "20 km", value: 20 },
            { label: "30 km", value: 30 },
          ]}
          style={pickerSelectStyles}
        />

        <View style={styles.divider} />
        
        {/* Current events being hosted. */}
        <Text style={styles.label}>Current Events You're Hosting</Text>
        {hostedEvents.upcoming?.length === 0 ? (
          <Text style={{ color: "#555" }}>No current hosted events.</Text>
        ) : (
          hostedEvents.upcoming.map((event) => (
            <TouchableOpacity
              key={event.id}
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

      {/* Logout */}
      <View style={styles.logoutContainer}>
        <Button title="Log Out" onPress={handleLogout} color="red" />
      </View>
    </SafeAreaView> 

    
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 20,
    paddingBottom: 100,
    flexGrow: 1,
  },
  profileContainer: {
    marginBottom: 20,
    paddingHorizontal: 20,
    alignItems: "stretch",
  },
  profileIconWrapper: {
    alignItems: "center",
    marginTop: 30,
    marginBottom: 10,
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
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
  logoutContainer: {
    alignItems: "center",
    padding: 10,
  },
  saveBtn: {
    color: "green",
    fontSize: 14,
    fontWeight: "bold",
  },
  nameInput: {
    borderBottomWidth: 1,
    borderColor: "#aaa",
    fontSize: 20,
    paddingVertical: 2,
    width: 180,
  },
  iconButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
});

const pickerSelectStyles = {
  inputIOS: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  inputAndroid: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
};
