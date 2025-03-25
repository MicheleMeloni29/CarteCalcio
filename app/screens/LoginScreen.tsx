import React, { useState } from "react";
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ImageBackground
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from '@expo/vector-icons';

// URL del backend Django su ngrok
const BASE_URL =
    "https://34ed-2a01-e11-9002-1af0-89fe-ad2-8cc6-73b1.ngrok-free.app";

const LoginScreen = () => {
    const navigation = useNavigation<any>();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(true);


    const handleLogin = async () => {
        try {
            const response = await fetch(`${BASE_URL}/api/users/token/`, {
                method: "POST",
                headers: { "Content-Type": "application/json", },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                console.log("Login success:", data);
                // Memorizza il token per l'autenticazione futura
                Alert.alert("Login Success", "Welcome back!");
                navigation.navigate("Homen"); // Naviga alla home dopo il login
            } else {
                console.error("Login failed:", data);
                Alert.alert("Login Failed", data.detail || "Invalid credentials");
            }
        } catch (error) {
            console.error("Login error:", error);
            Alert.alert("Error", "An error occurred. Please try again.");
        }
        setLoading(false);
    };

    const togglePasswordVisibility = () => {
        setIsPasswordVisible(!isPasswordVisible);
    };

    return (
        <ImageBackground source={require('../../assets/images/loginBackground.webp')} style={styles.background} imageStyle={{ opacity: 0.7 }}>
            <View style={styles.overlay}>
                <Text style={styles.welcomeText}>Welcome to</Text>
                <Text style={styles.appName}>Serie A Excange</Text>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Username"
                        placeholderTextColor="#B0B0B0"
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                    />
                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={styles.inputPassword}
                            placeholder="Password"
                            placeholderTextColor="#B0B0B0"
                            secureTextEntry={isPasswordVisible}
                            value={password}
                            onChangeText={setPassword}
                        />
                        <TouchableOpacity onPress={togglePasswordVisibility}>
                            <Ionicons
                                name={isPasswordVisible ? "eye-off" : "eye"}
                                size={24}
                                color="#6EC1E4"
                            />
                        </TouchableOpacity>
                    </View>
                    {loading ? (
                        <ActivityIndicator size="large" color="#007AFF" />
                    ) : (
                        <>
                            <TouchableOpacity style={styles.button} onPress={handleLogin}>
                                <Text style={styles.buttonText}>Login</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, styles.registerButton]} onPress={() => navigation.navigate('Register')}>
                                <Text style={styles.buttonText}>Register</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        </ImageBackground>
    );
};

export default LoginScreen;

const styles = StyleSheet.create({
    background: {
        flex: 1,
        justifyContent: 'center',
    },
    overlay: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Overlay scuro per migliorare leggibilità
        alignItems: 'center',
    },
    welcomeText: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '300',
        textAlign: 'center',
    },
    appName: {
        color: '#6EC1E4',
        fontSize: 36,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    inputContainer: {
        width: '100%',
        marginTop: 20,
    },
    input: {
        height: 45,
        borderColor: '#6EC1E4',
        borderWidth: 1,
        marginBottom: 12,
        paddingLeft: 12,
        borderRadius: 10,
        backgroundColor: '#fff',
        color: '#333',
        fontSize: 16,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderColor: '#6EC1E4',
        borderWidth: 1,
        borderRadius: 10,
        marginBottom: 12,
        paddingLeft: 12,
        paddingRight: 12,
        backgroundColor: '#fff',
    },
    inputPassword: {
        flex: 1,
        height: 45,
        fontSize: 16,
        color: '#333',
    },
    button: {
        backgroundColor: "#007AFF",
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: 'center',
        marginVertical: 5,
        width: '100%',
    },
    buttonText: {
        color: "#FFF",
        fontSize: 18,
        fontWeight: "bold",
    },
    registerButton: {
        backgroundColor: '#6EC1E4',
    },
});
