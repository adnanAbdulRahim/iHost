/*
HostScreen.js
Purpose: Allow users to create events.
Features:
-Input name
-Input description
-Input location
-Schedule different dates and times.
-Input occupancy(Max number of people)
-Input price
-Input pictures
-Event is submitted along with host's uid for registering to own event prevention.
-Likes
*/

//React:
import React, { useState, useContext, useRef, useEffect} from "react";
import {
  View, Text, TextInput, Button, Alert, StyleSheet,
  SafeAreaView, Image, ActivityIndicator, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform,
} from "react-native";

//Firebase:
import { collection, addDoc } from "firebase/firestore";
import { db, storage } from "../firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

//Extas:
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import "react-native-get-random-values";
import { AuthContext } from "../../App";
import DateTimePicker from "@react-native-community/datetimepicker";
import RNPickerSelect from "react-native-picker-select";
import * as ImagePicker from "expo-image-picker";
import uuid from "react-native-uuid";

export default function HostScreen() {
  //user context MUST!
  const { user } = useContext(AuthContext);
  const [eventName, setEventName] = useState("");
  const [location, setLocation] = useState(null);
  const locationRef = useRef(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scheduleStep, setScheduleStep] = useState("date");
  const [tempSchedule, setTempSchedule] = useState({});
  const [eventSchedules, setEventSchedules] = useState([]);

  const [description, setDescription] = useState("");
  const [occupancy, setOccupancy] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cardColor, setCardColor] = useState("#fffdfa"); 
  //For events without date.
  const [isOpenEnded, setIsOpenEnded] = useState(false);

  //Dnamically changing categories based on price. for free and paid options.
  const categoryOptions = [
    { label: "Services", value: "services" },
    { label: "Gigs & Odd Jobs", value: "gigs" },
    { label: "Marketplace", value: "marketplace" },
  ];
  const numericPrice = parseFloat(price);
  if (isNaN(numericPrice) || numericPrice === 0) {
    categoryOptions.push({ label: "Free", value: "free" });
  } else if (numericPrice > 0) {
    categoryOptions.push({ label: "Paid", value: "paid" });
  }

  //Card color options:
  const cardColors = [
    { label: "White", value: "#fffdfa" },
    { label: "Pastel Blue", value: "#dceeff" },
    { label: "Soft Green", value: "#e0f7e9" },
    { label: "Light Yellow", value: "#fff9d6" },
    { label: "Black", value: "#4B4B4B" },
    { label: "Muted Pink", value: "#fce4ec" },
  ];

  //To reset categories if user changes mind.
  useEffect(() => {
    if ((parseFloat(price) || price === "") && category === "paid") {
      setCategory(null);
    }
    if (parseFloat(price) > 0 && category === "free") {
      setCategory(null);
    }
  }, [price]);

  //Allows selecting image from gallery.
  const pickImages = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      selectionLimit: 3,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      const selected = result.assets.map((asset) => asset.uri);
      setImages(selected);
    }
  };

  //Uploads image to storage in firebase for later use.
  const uploadImages = async () => {
    const uploadedUrls = [];
    for (const uri of images) {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `event_images/${uuid.v4()}`;
      const imageRef = ref(storage, filename);
      await uploadBytes(imageRef, blob);
      const downloadURL = await getDownloadURL(imageRef);
      uploadedUrls.push(downloadURL);
    }
    return uploadedUrls;
  };

  //Remove selected image.
  const removeImage = (uriToRemove) => {
    setImages((prevImages) => prevImages.filter((uri) => uri !== uriToRemove));
  };

  //Starts the schdule picking flow, has issue so had to use timeout for consitent flow. 
  const handleAddSchedule = () => {
    setScheduleStep("date");
    setShowDatePicker(true);
  };

  //Allows users to set multiple schedules.
  const handleScheduleChange = (event, selectedValue) => {
    if (event.type === "dismissed") {
      setShowDatePicker(false);      
      setScheduleStep("date");       
      setTempSchedule({});           
      return;
      }

    if (scheduleStep === "date") {
      setTempSchedule({ date: selectedValue.toISOString().split("T")[0] })
      setScheduleStep("start");
      setShowDatePicker(false);
      setTimeout(() => {
        setShowDatePicker(true);
      }, 500);
    } else if (scheduleStep === "start") {
      setTempSchedule((prev) => ({
        ...prev,
        startTime: selectedValue.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }));
      setScheduleStep("end");
      setShowDatePicker(false);
      setTimeout(() => {
        setShowDatePicker(true);
      }, 500);
    } else if (scheduleStep === "end") {
      const completeSchedule = {
        ...tempSchedule,
        endTime: selectedValue.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setEventSchedules((prev) => [...prev, completeSchedule]);
      setTempSchedule({});
      setScheduleStep("date");
      setShowDatePicker(false);
    }
  };

  //Remvoes Schudled date.
  const removeSchedule = (index) => {
    const updated = [...eventSchedules];
    updated.splice(index, 1);
    setEventSchedules(updated);
  };

  //Creates event in firestore.
  const handleCreateEvent = async () => {
    if (!eventName || !location || price === " " || occupancy === " " || !category || !images) {
      Alert.alert("Missing Fields", "Please fill all fields and add at least one schedule.");
      return;
    }

    setLoading(true);
    try {
      const imageUrls = await uploadImages();
      await addDoc(collection(db, "events"), {
        hostName: user.name,
        hostUid: user.uid,
        name: eventName,
        location,
        eventSchedules,
        description,
        occupancy: parseInt(occupancy),
        price: parseFloat(price),
        category,
        hostEmail: user.email,
        createdAt: new Date(),
        registeredUsers: [],
        imageUrls,
        imageUrl: imageUrls[0],
        likedBy: [],
        likesCount: 0,
        cardColor,
        isOpenEnded,
      });

      Alert.alert("Event Created", "Your event has been successfully added!");
      setEventName("");
      setLocation(null);
      setDescription("");
      setOccupancy("");
      setPrice("");
      setCategory("");
      setImages([]);
      setEventSchedules([]);

      if (locationRef.current) locationRef.current.clear();
    } catch (error) {
      console.error("Error adding event:", error);
      Alert.alert("Error", "Could not create event. Please try again.");
    }
    setLoading(false);
  };

  //Clears form fields.
  const clearForm = () => {
    setEventName("");
    setLocation(null);
    setDescription("");
    setOccupancy("");
    setPrice("");
    setCategory("");
    setImages([]);
    setEventSchedules([]);
    setTempSchedule({});
    if (locationRef.current) locationRef.current.clear();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">

          {/* Title */}
          <Text style={styles.header}>Create an Event</Text>

          {/* Name, Desc, Occupancy, Price */}
          <TextInput style={styles.input} placeholder="Event Name" value={eventName} onChangeText={setEventName} />
          <TextInput style={styles.input} placeholder="Short Description" value={description} onChangeText={setDescription} />
          <TextInput style={styles.input} placeholder="Max People" keyboardType="numeric" value={occupancy} onChangeText={setOccupancy} />
          <TextInput style={styles.input} placeholder="Price in $ (0 if free)" keyboardType="numeric" value={price} onChangeText={setPrice} />

          {/* Category Selection */}
          <Text style={styles.label}>Category:</Text>
          <RNPickerSelect
            onValueChange={setCategory}
            items={categoryOptions}
            style={pickerSelectStyles}
            placeholder={{ label: "Choose a category...", value: null }}
          />

          {/* Color picker */}
          <Text style={styles.label}>Poster Color:</Text>
          <RNPickerSelect
            onValueChange={setCardColor}
            items={cardColors}
            value={cardColor}
            style={pickerSelectStyles}
            placeholder={{ label: "Choose a background color...", value: "#fffdfa" }}
          />

          {/* Location Selection */}
          <GooglePlacesAutocomplete
            ref={locationRef}
            placeholder="Search Location"
            fetchDetails={true}
            onPress={(data, details = null) => {
              if (details) {
                setLocation({
                  latitude: details.geometry.location.lat,
                  longitude: details.geometry.location.lng,
                  address: details.formatted_address,
                });
              }
            }}
            query={{ key: "AIzaSyAbf16X5i9st-VE7Rwz2VBbeRAKZ5NoRXs", language: "en" }}
            styles={{ textInput: styles.input }}
          />

          {/* Schedule Selection */}
          <Button title="Add Event Schedule" onPress={handleAddSchedule} color="black" />

          {eventSchedules.map((item, index) => (
            <View key={index} style={styles.scheduleCard}>
              <Text>{`${item.date}, ${item.startTime} - ${item.endTime}`}</Text>
              <TouchableOpacity onPress={() => removeSchedule(index)}>
                <Text style={{ color: "red" }}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}

          {showDatePicker && (
            <DateTimePicker
              value={new Date()}
              mode={scheduleStep === "date" ? "date" : "time"}
              display="default"
              onChange={handleScheduleChange}
            />
          )}

          {/* OpenEnded (events without dates) */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 10, }}>
            <Text style={{ marginRight: 10 }}>No specific date (open-ended)</Text>
            <TouchableOpacity
              onPress={() => setIsOpenEnded(prev => !prev)}
              style={{
                width: 24,
                height: 24,
                borderWidth: 1,
                borderColor: '#000',
                borderRadius: 20,
                backgroundColor: isOpenEnded ? 'green' : 'white',
              }}
            />
          </View>

          {/* Image Selection */}
          <Button title="Upload Event Images" onPress={pickImages} color="black" />
          <View style={{ flexDirection: "row", marginTop: 10, flexWrap: "wrap" }}>
            {images.map((uri, index) => (
              <TouchableOpacity key={index} onPress={() => removeImage(uri)}>
                <Image source={{ uri }} style={styles.imagePreview} />
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Create event */}
          {loading ? (
            <ActivityIndicator size="large" color="black" style={{ marginTop: 20 }} />
          ) : (
            <View style={{ marginBottom: 10 }}>
              <Button title="Create Event" onPress={handleCreateEvent} color="black" />
            </View>
          )}

          {/* Clear form */}
          <Button title="Clear Event" onPress={clearForm} color="gray"/>
        </ScrollView>
        
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    paddingTop: 30,
  },
  input: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginTop: 5,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  scheduleCard: {
    marginTop: 5,
    backgroundColor: "#eee",
    padding: 10,
    borderRadius: 5,
  },
  imagePreview: {
    width: 60,
    height: 60,
    borderRadius: 4,
    marginRight: 5,
    marginBottom: 5,
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
