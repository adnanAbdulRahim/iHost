/*
iHost:

-Purpose: improve local community engagement because plastering paper on poles and walls is outdated,
events such as:
-tutors
-garage sales
-help with mowing lawn/snow
-help with lost pets/children within radius
-religious gathering events
-bake sales
-new shop opening events

-HostEventScreen: Users have the option to create their own event like garage sale, tutoring, bake sale, lemonade stand etc,
also have option to upload pictures of their venue and what they are selling in case of garage sale.

-HomeScreen: Displayed local events categorically based on user's preference.

-EventScreen: this screen displays event details clicked from the HomeScreen, shows hosted by whom, the host's review
given by their previous consumers, to identify if they are common hosters or not, some information about the event, wether the event
is free or charged, and maybe some pictures.

-AccountScreen: should have user info, allow users to choose preferences maybe they want to see certain events like garage sale,
but are not interested in maybe church related events, radius of how far they want to be interested in events.
 Also maybe some reviews they have left on some events, light or dark sceen preference.
*/

//React;
import React, { useEffect, useState, createContext } from "react";
import {
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

//Extas:
import { Ionicons } from "@expo/vector-icons";

//Lazy loading screen for optimiation, without lazy loading i was facing issues where it would take forever to load
//the home screen.
const LoginScreen = React.lazy(() => import("./src/screens/LoginScreen"));
const HomeScreen = React.lazy(() => import("./src/screens/HomeScreen"));
const HostScreen = React.lazy(() => import("./src/screens/HostScreen"));
const AccountScreen = React.lazy(() => import("./src/screens/AccountScreen"));
const EventScreen = React.lazy(() => import("./src/screens/EventScreen"));
const UserProfileScreen = React.lazy(() => import("./src/screens/UserProfileScreen.js"));

export const AuthContext = createContext();


const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

//Inner Tab navigator.
function AppTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: "black",
        tabBarInactiveTintColor: "gray",
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Host") {
            iconName = focused ? "add-circle" : "add-circle-outline";
          } else if (route.name === "Account") {
            iconName = focused ? "person" : "person-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Host" component={HostScreen} />
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}


//Outer Stack navigator.
export default function App() {
  //Setting user for easy login in future (async-storage)
  const [user, setUser] = useState(null);
  //Loading
  const [loading, setLoading] = useState(true);

  //Check async-storage for logged in information
  useEffect(() => {
    const checkUser = async () => {
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <NavigationContainer>
            <Stack.Navigator
              screenOptions={{ headerShown: false }}
              initialRouteName={user ? "AppTabs" : "Login"}
            >
              {!user ? (
                <Stack.Screen name="Login" component={LoginScreen} />
              ) : (
                <Stack.Screen name="AppTabs" component={AppTabs} />
              )}
              <Stack.Screen name="EventScreen" component={EventScreen} />
              <Stack.Screen name="UserProfileScreen" component={UserProfileScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </AuthContext.Provider>
  );
}