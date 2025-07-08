/*
LoginScreen.js
Purpose: Allow users to sign-up or log-in.
Features:
-Main logo
-Option to sign up
-Option to sign in
-After signing in/up should direct to home page.
*/

//React:
import React, { useState, useContext } from "react";
import {
  View,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  Button,
  Alert,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator } from "react-native";

//Firebase:
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";

//Extras:
import { AuthContext } from "../../App";

export default function LoginScreen() {
  //Set the authenticated user globally to allow easy logout MUST!
  const { setUser } = useContext(AuthContext);

  //Toggle between sign-up and sign-in
  const [isSignUp, setIsSignUp] = useState(false);

  //Input fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  //Loading
  const [loading, setLoading] = useState(false);

  //User registration
  const handleSignUp = async () => {
    if (!name || !email || !password) {
      Alert.alert("Missing Fields", "Please fill all fields.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const eventRadius = 10;

      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        name,
        email,
        eventRadius,
        avatarStyle: "adventurer",
      });

      const userData = { uid: user.uid, name, email, eventRadius, avatarStyle: "adventurer" };

      // Save user info locally
      await AsyncStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error("Signup failed:", error);
      if (error.code === "auth/email-already-in-use") {
        Alert.alert("Email Already Exists");
      } else if (error.code === "auth/invalid-email") {
        Alert.alert("Invalid Email", "Please enter a valid email address.");
      } else {
        Alert.alert("Signup Error", error.message);
      }
    }
    setLoading(false);
  };

  //User login
  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        await AsyncStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
      } else {
        Alert.alert("Error", "User data not found.");
      }
    } catch (error) {
      console.error("Login failed:", error);
      Alert.alert("Login Error", error.message);
    }
    setLoading(false);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>

        {/* Title */}
        <Text style={styles.title}>iHost</Text>
        <Text style={styles.header}>{isSignUp ? "Create Account" : "Sign In"}</Text>

        {/* Name, Email, Password */}
        {isSignUp && (
          <TextInput
            style={styles.input}
            placeholder="Name"
            value={name}
            onChangeText={setName}
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {/* Button to handle sign-up or sign-in */}
        <View style={styles.buttonContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="black" style={{ marginTop: 10 }} />
          ) : (
            <Button
              title={isSignUp ? "Sign Up" : "Sign In"}
              onPress={isSignUp ? handleSignUp : handleSignIn}
              color="black"
              disabled={loading}
            />
          )}

          <TouchableOpacity onPress={() => !loading && setIsSignUp(!isSignUp)}>
            <Text style={styles.toggleText}>
              {isSignUp
                ? "Already have an account? Sign In"
                : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        </View>
        
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 50,
    textAlign: "center",
    paddingTop: 100,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    paddingTop: 30,
  },
  input: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  buttonContainer: {
    marginTop: 60,
  },
  toggleText: {
    textAlign: "center",
    color: "blue",
    marginTop: 10,
    textDecorationLine: "underline",
  },
});